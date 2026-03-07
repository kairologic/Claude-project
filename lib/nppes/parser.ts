// lib/nppes/parser.ts
// ═══ Streaming CSV Parser for NPPES V.2 Files ═══
// Handles both full replacement (~8GB) and weekly diff (~50-100MB) files.
// Memory-efficient: streams line-by-line, never loads full file into memory.

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { parseNppesRow, type NppesRecord } from './v2-columns';

/**
 * Parse a CSV field that may be quoted (handles commas inside quotes).
 * NPPES uses standard RFC 4180 CSV: fields with commas are double-quoted,
 * internal quotes are escaped as "".
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Look ahead: is this an escaped quote ("") or end of field?
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  fields.push(current); // last field
  return fields;
}

export interface ParseOptions {
  /** If provided, only process records matching these NPIs */
  filterNpis?: Set<string>;
  /** If provided, only process records matching these states */
  filterStates?: Set<string>;
  /** If provided, only process these entity types ('1' = individual, '2' = org) */
  filterEntityTypes?: Set<string>;
  /** Max records to process (for testing). 0 = unlimited */
  limit?: number;
  /** Callback for progress reporting */
  onProgress?: (processed: number, matched: number) => void;
  /** Progress report interval (number of lines) */
  progressInterval?: number;
}

export interface ParseResult {
  records: NppesRecord[];
  totalLines: number;
  matchedRecords: number;
  skippedRecords: number;
  errors: number;
  durationMs: number;
}

/**
 * Stream-parse an NPPES V.2 CSV file.
 * Supports .csv and .csv.gz (gzipped) files.
 *
 * @param filePath - Path to the CSV file
 * @param options - Filtering and progress options
 */
export async function parseNppesFile(
  filePath: string,
  options: ParseOptions = {},
): Promise<ParseResult> {
  const startTime = Date.now();
  const {
    filterNpis,
    filterStates,
    filterEntityTypes,
    limit = 0,
    onProgress,
    progressInterval = 50000,
  } = options;

  const records: NppesRecord[] = [];
  let totalLines = 0;
  let matchedRecords = 0;
  let skippedRecords = 0;
  let errors = 0;
  let isHeader = true;

  // Set up stream (handle gzipped files)
  let inputStream: NodeJS.ReadableStream = createReadStream(filePath);
  if (filePath.endsWith('.gz')) {
    inputStream = inputStream.pipe(createGunzip());
  }

  const rl = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Skip header row
    if (isHeader) {
      isHeader = false;
      continue;
    }

    totalLines++;

    // Check limit
    if (limit > 0 && matchedRecords >= limit) break;

    try {
      const fields = parseCSVLine(line);
      const record = parseNppesRow(fields);

      if (!record) {
        skippedRecords++;
        continue;
      }

      // Apply filters
      if (filterNpis && !filterNpis.has(record.npi)) {
        skippedRecords++;
        continue;
      }
      if (filterStates && record.state && !filterStates.has(record.state)) {
        skippedRecords++;
        continue;
      }
      if (filterEntityTypes && !filterEntityTypes.has(record.entity_type_code)) {
        skippedRecords++;
        continue;
      }

      records.push(record);
      matchedRecords++;
    } catch (err) {
      errors++;
      if (errors <= 10) {
        console.error(`[Parser] Error on line ${totalLines}:`, err);
      }
    }

    // Progress reporting
    if (onProgress && totalLines % progressInterval === 0) {
      onProgress(totalLines, matchedRecords);
    }
  }

  return {
    records,
    totalLines,
    matchedRecords,
    skippedRecords,
    errors,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Stream-parse with batched callback — for processing large files without
 * accumulating all records in memory.
 *
 * @param filePath - Path to the CSV file
 * @param batchSize - Number of records per batch
 * @param onBatch - Callback receiving each batch of records
 * @param options - Filtering options
 */
export async function parseNppesFileStreaming(
  filePath: string,
  batchSize: number,
  onBatch: (batch: NppesRecord[], batchNumber: number) => Promise<void>,
  options: ParseOptions = {},
): Promise<Omit<ParseResult, 'records'>> {
  const startTime = Date.now();
  const {
    filterNpis,
    filterStates,
    filterEntityTypes,
    limit = 0,
    onProgress,
    progressInterval = 50000,
  } = options;

  let batch: NppesRecord[] = [];
  let batchNumber = 0;
  let totalLines = 0;
  let matchedRecords = 0;
  let skippedRecords = 0;
  let errors = 0;
  let isHeader = true;

  let inputStream: NodeJS.ReadableStream = createReadStream(filePath);
  if (filePath.endsWith('.gz')) {
    inputStream = inputStream.pipe(createGunzip());
  }

  const rl = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    totalLines++;
    if (limit > 0 && matchedRecords >= limit) break;

    try {
      const fields = parseCSVLine(line);
      const record = parseNppesRow(fields);

      if (!record) {
        skippedRecords++;
        continue;
      }

      if (filterNpis && !filterNpis.has(record.npi)) {
        skippedRecords++;
        continue;
      }
      if (filterStates && record.state && !filterStates.has(record.state)) {
        skippedRecords++;
        continue;
      }
      if (filterEntityTypes && !filterEntityTypes.has(record.entity_type_code)) {
        skippedRecords++;
        continue;
      }

      batch.push(record);
      matchedRecords++;

      if (batch.length >= batchSize) {
        batchNumber++;
        await onBatch(batch, batchNumber);
        batch = [];
      }
    } catch (err) {
      errors++;
    }

    if (onProgress && totalLines % progressInterval === 0) {
      onProgress(totalLines, matchedRecords);
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    batchNumber++;
    await onBatch(batch, batchNumber);
  }

  return {
    totalLines,
    matchedRecords,
    skippedRecords,
    errors,
    durationMs: Date.now() - startTime,
  };
}
