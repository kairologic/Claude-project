/**
 * POST /api/workflows/nppes-form
 *
 * Generates a pre-filled NPPES update form (PDF) for an approved correction.
 * Called by ApproveCorrection component after practice manager approves changes.
 *
 * Request body:
 *   workflowId: string
 *   practiceName: string
 *   providerName: string
 *   npi: string
 *   corrections: Array<{ field, currentValue, correctedValue, source }>
 *
 * Returns: PDF file as application/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

interface CorrectionInput {
  field: string;
  currentValue: string;
  correctedValue: string;
  source: string;
}

interface NPPESFormRequest {
  workflowId: string;
  practiceName: string;
  providerName: string;
  npi: string;
  corrections: CorrectionInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body: NPPESFormRequest = await request.json();

    // Validate required fields
    if (!body.workflowId || !body.npi || !body.corrections?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, npi, corrections' },
        { status: 400 },
      );
    }

    // Write form data as JSON for the Python script to read
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `nppes-form-${body.workflowId}.json`);
    const outputPath = path.join(tmpDir, `nppes-form-${body.workflowId}.pdf`);

    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        workflow_id: body.workflowId,
        practice_name: body.practiceName,
        provider_name: body.providerName,
        npi: body.npi,
        corrections: body.corrections.map((c) => ({
          field: c.field,
          current_value: c.currentValue,
          corrected_value: c.correctedValue,
          source: c.source,
        })),
      }),
    );

    // Run the Python PDF generator
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-nppes-form.py');
    const { stderr } = await execAsync(`python3 "${scriptPath}" "${inputPath}" "${outputPath}"`, {
      timeout: 30000,
    });

    if (stderr && !stderr.includes('Warning')) {
      console.error('NPPES form generation stderr:', stderr);
    }

    // Read the generated PDF
    if (!fs.existsSync(outputPath)) {
      return NextResponse.json(
        { error: 'PDF generation failed — output file not found' },
        { status: 500 },
      );
    }

    const pdfBuffer = fs.readFileSync(outputPath);

    // Cleanup temp files
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch {
      // Non-critical cleanup failure
    }

    // Return PDF
    const filename = `NPPES_Update_${body.npi}_${body.workflowId}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('NPPES form generation error:', error);
    return NextResponse.json({ error: 'Failed to generate NPPES form' }, { status: 500 });
  }
}
