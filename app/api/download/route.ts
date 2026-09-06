import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { findFfmpeg, findYtDlp, getDownloadsDir, getYtDlpExtraArgs } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    url,
    quality = 'best',
    mode = 'video',
    audioFormat = 'mp3',
    customFilename,
    embedThumbnail = true,
    embedSubtitles = false,
    embedChapters = true
  } = body;

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const downloadsDir = await getDownloadsDir();
  const ytdlpCmd = await findYtDlp();
  const ffmpegDir = await findFfmpeg();
  const extraArgs = getYtDlpExtraArgs();

  // Determine output file template
  let outputTemplate: string;
  if (customFilename && typeof customFilename === 'string' && customFilename.trim()) {
    const safeName = customFilename.trim().replace(/[\\/:*?"<>|]/g, '_');
    outputTemplate = path.join(downloadsDir, `${safeName}.%(ext)s`);
  } else {
    outputTemplate = path.join(downloadsDir, '%(title)s.%(ext)s');
  }

  // Base flags aligned with test.js
  const args: string[] = [
    '--no-warnings',
    '--newline',
    '--js-runtimes', 'node',
    ...extraArgs,
    '-o', outputTemplate
  ];

  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir);
  }

  if (mode === 'audio') {
    const validAudioFormats = ['mp3', 'm4a', 'wav', 'flac'];
    const chosenFormat = validAudioFormats.includes(audioFormat) ? audioFormat : 'mp3';
    args.push('-x', '--audio-format', chosenFormat, '--audio-quality', '0');

    if (embedThumbnail && chosenFormat !== 'wav') {
      args.push('--embed-thumbnail');
    }
  } else {
    // High-definition video with smart format selector fallback
    if (quality === '2160p') {
      args.push(
        '-f',
        'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]/best'
      );
    } else if (quality === '1440p') {
      args.push(
        '-f',
        'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best[height<=1440]/best'
      );
    } else if (quality === '1080p') {
      args.push(
        '-f',
        'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
      );
    } else if (quality === '720p') {
      args.push(
        '-f',
        'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best'
      );
    } else if (quality === '480p') {
      args.push(
        '-f',
        'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best'
      );
    } else if (quality === '360p') {
      args.push(
        '-f',
        'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]/best'
      );
    } else {
      // test.js best default
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    args.push('--merge-output-format', 'mp4');

    if (embedThumbnail) {
      args.push('--embed-thumbnail');
    }
    if (embedSubtitles) {
      args.push('--write-subs', '--sub-langs', 'en.*,bn.*,all', '--embed-subs');
    }
  }

  if (embedChapters) {
    args.push('--embed-chapters');
  }

  args.push(url.trim());

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream might be closed by client
        }
      };

      send({
        type: 'start',
        message: 'Starting yt-dlp process with FFmpeg post-processing...',
        cmd: ytdlpCmd,
        ffmpegLocation: ffmpegDir
      });

      let downloadedFileName = '';
      const proc = spawn(ytdlpCmd, args);

      const processLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line) return;

        // Emit log event
        send({ type: 'log', message: line });

        // Capture destination filename
        const destMatch = line.match(/\[(?:download|Merger|ExtractAudio|ffmpeg)\] Destination:\s*(.+)$/i);
        if (destMatch && destMatch[1]) {
          downloadedFileName = path.basename(destMatch[1].trim());
        }

        const mergeMatch = line.match(/Merging formats into "(.+)"/i);
        if (mergeMatch && mergeMatch[1]) {
          downloadedFileName = path.basename(mergeMatch[1].trim());
        }

        const audioDest = line.match(/\[ExtractAudio\] Destination:\s*(.+)$/i);
        if (audioDest && audioDest[1]) {
          downloadedFileName = path.basename(audioDest[1].trim());
        }

        // Check if merger or ffmpeg is running
        if (line.includes('[Merger]') || line.includes('Merging formats') || line.includes('[ffmpeg]')) {
          send({
            type: 'progress',
            status: 'merging',
            statusText: 'FFmpeg multiplexing video & audio streams...',
            percent: 94
          });
          return;
        }

        if (line.includes('[ExtractAudio]')) {
          send({
            type: 'progress',
            status: 'converting',
            statusText: 'FFmpeg extracting and transcoding audio...',
            percent: 92
          });
          return;
        }

        if (line.includes('[ThumbnailsConvertor]') || line.includes('[EmbedThumbnail]')) {
          send({
            type: 'progress',
            status: 'merging',
            statusText: 'Embedding cover thumbnail into file...',
            percent: 97
          });
          return;
        }

        // Progress line regex: [download]  45.2% of ~ 24.50MiB at 4.21MiB/s ETA 00:08
        const progressMatch = line.match(
          /\[download\]\s+([\d.]+)%\s+of\s+([~]?\s*[\d.]+\s*\w+)(?:\s+at\s+([\w./]+))?(?:\s+ETA\s+([\d:]+))?/i
        );

        if (progressMatch) {
          const percent = parseFloat(progressMatch[1]);
          const totalSize = progressMatch[2] ? progressMatch[2].replace('~', '').trim() : '';
          const speed = progressMatch[3] || '';
          const eta = progressMatch[4] || '';

          send({
            type: 'progress',
            status: percent >= 100 ? 'finishing' : 'downloading',
            statusText: percent >= 100 ? 'Preparing stream for FFmpeg...' : `Downloading (${percent}%)`,
            percent,
            totalSize,
            speed,
            eta
          });
        }
      };

      let stdoutBuffer = '';
      proc.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || '';
        for (const line of lines) {
          processLine(line);
        }
      });

      let stderrBuffer = '';
      proc.stderr.on('data', (chunk) => {
        stderrBuffer += chunk.toString();
        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() || '';
        for (const line of lines) {
          processLine(line);
        }
      });

      proc.on('close', (code) => {
        if (stdoutBuffer) processLine(stdoutBuffer);
        if (stderrBuffer) processLine(stderrBuffer);

        if (code === 0) {
          if (!downloadedFileName) {
            try {
              const files = fs.readdirSync(downloadsDir);
              const sorted = files
                .filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'))
                .map((f) => ({
                  name: f,
                  mtime: fs.statSync(path.join(downloadsDir, f)).mtimeMs
                }))
                .sort((a, b) => b.mtime - a.mtime);
              if (sorted.length > 0) {
                downloadedFileName = sorted[0].name;
              }
            } catch {
              // ignore
            }
          }

          send({
            type: 'complete',
            status: 'completed',
            statusText: 'Finished! High quality file ready in library.',
            percent: 100,
            fileName: downloadedFileName
          });
        } else {
          send({
            type: 'error',
            status: 'failed',
            statusText: `Process terminated with error code ${code}`,
            error: `Process failed with exit code ${code}`
          });
        }
        controller.close();
      });

      proc.on('error', (err) => {
        send({
          type: 'error',
          status: 'failed',
          statusText: `Process error: ${err.message}`,
          error: err.message
        });
        controller.close();
      });

      req.signal.addEventListener('abort', () => {
        try {
          proc.kill();
        } catch {
          // ignore
        }
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
