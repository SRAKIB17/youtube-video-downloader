import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoInfo } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'YouTube URL is required.' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format. Please provide a valid HTTP/HTTPS link.' },
        { status: 400 }
      );
    }

    const info = await fetchVideoInfo(trimmedUrl);
    return NextResponse.json({ success: true, data: info });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg || 'Failed to extract video information' },
      { status: 500 }
    );
  }
}
