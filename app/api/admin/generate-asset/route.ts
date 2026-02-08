import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Asset definitions — maps asset IDs to their generator scripts and output filenames
const ASSET_GENERATORS: Record<string, { script: string; outputFile: string; type: 'pdf' | 'xlsx' }> = {
  'sb1188-policy-pack': {
    script: 'generate_policy_pdf.py',
    outputFile: 'SB1188_Data_Sovereignty_Policy_Pack.pdf',
    type: 'pdf',
  },
  'implementation-guide': {
    script: 'generate_impl_guide.py',
    outputFile: 'Safe_Harbor_Implementation_Guide.pdf',
    type: 'pdf',
  },
  'ai-disclosure-kit': {
    script: 'generate_ai_kit.py',
    outputFile: 'AI_Disclosure_Kit.pdf',
    type: 'pdf',
  },
  'staff-training-guide': {
    script: 'generate_staff_guide.py',
    outputFile: 'Staff_Training_Guide.pdf',
    type: 'pdf',
  },
  'compliance-roadmap': {
    script: 'generate_roadmap.py',
    outputFile: 'Compliance_Roadmap.pdf',
    type: 'pdf',
  },
  'evidence-ledger': {
    script: 'generate_evidence_ledger.py',
    outputFile: 'Evidence_Ledger.xlsx',
    type: 'xlsx',
  },
};

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assetId } = body;

    if (!assetId || !ASSET_GENERATORS[assetId]) {
      return NextResponse.json(
        { error: `Unknown asset: ${assetId}. Valid: ${Object.keys(ASSET_GENERATORS).join(', ')}` },
        { status: 400 }
      );
    }

    const config = ASSET_GENERATORS[assetId];
    const scriptsDir = path.join(process.cwd(), 'scripts', 'safe-harbor');
    const scriptPath = path.join(scriptsDir, config.script);
    const outputDir = path.join(process.cwd(), 'public', 'assets', 'safe-harbor');
    const outputPath = path.join(outputDir, config.outputFile);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Generator script not found: ${config.script}. Place it in /scripts/safe-harbor/` },
        { status: 500 }
      );
    }

    // Modify the script's output path dynamically via env var
    const env = {
      ...process.env,
      ASSET_OUTPUT_PATH: outputPath,
    };

    // Run the Python generator
    const { stdout, stderr } = await execAsync(
      `python3 "${scriptPath}" --output "${outputPath}"`,
      { cwd: scriptsDir, env, timeout: 30000 }
    );

    // Check if file was created
    if (!fs.existsSync(outputPath)) {
      console.error('[Generate Asset] Script ran but no file created:', stderr);
      return NextResponse.json(
        { error: 'Generator ran but did not produce output file', stderr },
        { status: 500 }
      );
    }

    const stats = fs.statSync(outputPath);
    const publicUrl = `/assets/safe-harbor/${config.outputFile}`;

    return NextResponse.json({
      success: true,
      assetId,
      file: config.outputFile,
      url: publicUrl,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      generatedAt: new Date().toISOString(),
      stdout: stdout.trim(),
    });
  } catch (err: any) {
    console.error('[Generate Asset] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error', stderr: err.stderr || '' },
      { status: 500 }
    );
  }
}

// GET: List all available assets and their status
export async function GET() {
  const outputDir = path.join(process.cwd(), 'public', 'assets', 'safe-harbor');

  const assets = Object.entries(ASSET_GENERATORS).map(([id, config]) => {
    const filePath = path.join(outputDir, config.outputFile);
    const exists = fs.existsSync(filePath);
    let stats = null;
    if (exists) {
      const s = fs.statSync(filePath);
      stats = { size: s.size, sizeKB: Math.round(s.size / 1024), modified: s.mtime.toISOString() };
    }
    return {
      id,
      file: config.outputFile,
      type: config.type,
      url: exists ? `/assets/safe-harbor/${config.outputFile}` : null,
      exists,
      stats,
    };
  });

  return NextResponse.json({ assets });
}

