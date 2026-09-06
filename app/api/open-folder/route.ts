import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getDownloadsDir } from '@/lib/ytdlp';

export async function POST() {
  try {
    const dir = await getDownloadsDir();
    spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' });
    return NextResponse.json({ success: true, dir });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
