import { NextResponse } from 'next/server';
import { getBinaryStatus, getDownloadsDir } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const status = await getBinaryStatus();
    const downloadsDir = await getDownloadsDir();
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        downloadsDir
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
