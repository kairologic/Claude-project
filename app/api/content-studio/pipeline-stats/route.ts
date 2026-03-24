import { NextResponse } from 'next/server';
import { getOverviewStats } from '@/lib/content-studio/pipeline-queries';

export async function GET() {
  try {
    const stats = await getOverviewStats();
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
