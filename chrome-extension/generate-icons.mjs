/**
 * chrome-extension/generate-icons.mjs
 *
 * Generates PNG icons for the Chrome extension from an inline SVG.
 * Uses Node.js canvas (or sharp if available). Falls back to writing SVGs
 * that Chrome can't use directly, so we use a minimal PNG encoder.
 *
 * Usage: node chrome-extension/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = resolve(__dirname, 'images');
mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Minimal PNG encoder (no dependencies) ──────────────────────────────────
// Generates a valid PNG from raw RGBA pixel data.

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let val = n;
    for (let k = 0; k < 8; k++) val = val & 1 ? 0xedb88320 ^ (val >>> 1) : val >>> 1;
    table[n] = val;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf) {
  let a = 1,
    b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function deflateRaw(data) {
  // Store blocks (no compression) — simple but valid
  const blocks = [];
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(65535, data.length - offset);
    const last = offset + size >= data.length ? 1 : 0;
    const header = Buffer.alloc(5);
    header[0] = last;
    header[1] = size & 0xff;
    header[2] = (size >> 8) & 0xff;
    header[3] = ~size & 0xff;
    header[4] = (~size >> 8) & 0xff;
    blocks.push(header);
    blocks.push(data.subarray(offset, offset + size));
    offset += size;
  }
  return Buffer.concat(blocks);
}

function createZlibStream(data) {
  const deflated = deflateRaw(data);
  const cmf = 0x78;
  const flg = 0x01;
  const adler = adler32(data);
  const header = Buffer.from([cmf, flg]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(adler);
  return Buffer.concat([header, deflated, checksum]);
}

function createPNG(width, height, rgba) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBytes, data]);
    const crcVal = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal);
    return Buffer.concat([length, combined, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — add filter byte (0 = None) before each row
  const rowSize = width * 4;
  const filtered = Buffer.alloc(height * (1 + rowSize));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + rowSize)] = 0; // filter: None
    rgba.copy(filtered, y * (1 + rowSize) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = createZlibStream(filtered);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

// ─── Icon rendering ─────────────────────────────────────────────────────────

/**
 * Renders the KairoLogic "K" logo icon at a given size.
 * Navy background (#0F1E2E) with gold "K" (#D4A017).
 */
function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);

  // Colors
  const navy = { r: 15, g: 30, b: 46 };
  const gold = { r: 212, g: 160, b: 23 };

  // Draw navy background with rounded corners
  const radius = Math.max(2, Math.round(size * 0.18));

  function setPixel(x, y, color, alpha = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    rgba[idx] = color.r;
    rgba[idx + 1] = color.g;
    rgba[idx + 2] = color.b;
    rgba[idx + 3] = alpha;
  }

  function isInRoundedRect(x, y) {
    // Check corners
    if (x < radius && y < radius) {
      return (x - radius) ** 2 + (y - radius) ** 2 <= radius ** 2;
    }
    if (x >= size - radius && y < radius) {
      return (x - (size - radius - 1)) ** 2 + (y - radius) ** 2 <= radius ** 2;
    }
    if (x < radius && y >= size - radius) {
      return (x - radius) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
    }
    if (x >= size - radius && y >= size - radius) {
      return (x - (size - radius - 1)) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
    }
    return true;
  }

  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isInRoundedRect(x, y)) {
        setPixel(x, y, navy);
      } else {
        setPixel(x, y, { r: 0, g: 0, b: 0 }, 0); // transparent
      }
    }
  }

  // Draw "K" letter
  // Scale relative to icon size
  const padding = Math.round(size * 0.22);
  const strokeW = Math.max(1, Math.round(size * 0.14));
  const centerY = Math.round(size / 2);

  // Vertical bar of K
  for (let y = padding; y < size - padding; y++) {
    for (let dx = 0; dx < strokeW; dx++) {
      setPixel(padding + dx, y, gold);
    }
  }

  // Upper diagonal of K (from middle-left going to top-right)
  for (let i = 0; i < size - 2 * padding; i++) {
    const t = i / (size - 2 * padding);
    const px = padding + strokeW + Math.round(t * (size - 2 * padding - strokeW));
    const py = centerY - Math.round(t * (centerY - padding));
    for (let dx = 0; dx < strokeW; dx++) {
      for (let dy = 0; dy < strokeW; dy++) {
        setPixel(px + dx, py + dy, gold);
      }
    }
  }

  // Lower diagonal of K (from middle-left going to bottom-right)
  for (let i = 0; i < size - 2 * padding; i++) {
    const t = i / (size - 2 * padding);
    const px = padding + strokeW + Math.round(t * (size - 2 * padding - strokeW));
    const py = centerY + Math.round(t * (size - padding - centerY));
    for (let dx = 0; dx < strokeW; dx++) {
      for (let dy = 0; dy < strokeW; dy++) {
        setPixel(px + dx, py + dy, gold);
      }
    }
  }

  return createPNG(size, size, rgba);
}

// ─── Generate icons ─────────────────────────────────────────────────────────

const sizes = [16, 48, 128];

for (const size of sizes) {
  const png = renderIcon(size);
  const path = resolve(IMAGES_DIR, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`✅ Generated icon-${size}.png (${png.length} bytes)`);
}

console.log('\nDone! Icons saved to chrome-extension/images/');
