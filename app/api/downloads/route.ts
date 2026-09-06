import { NextResponse } from 'next/server';
import { listDownloadedFiles, getDownloadsDir } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const files = listDownloadedFiles();
    const dir = getDownloadsDir();
    return NextResponse.json({
      success: true,
      data: {
        dir,
        files
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
