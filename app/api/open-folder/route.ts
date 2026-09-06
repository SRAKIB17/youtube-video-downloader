import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getDownloadsDir } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    if (process.platform !== 'win32') {
      return NextResponse.json({
        success: false,
        error: 'Opening local file explorer is only supported when running on Windows desktop.'
      }, { status: 400 });
    }

    const dir = await getDownloadsDir();
    spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' });
    return NextResponse.json({ success: true, dir });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
