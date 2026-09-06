"use server"
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

export interface BinaryStatus {
  ytdlp: {
    available: boolean;
    path: string | null;
    version: string | null;
  };
  ffmpeg: {
    available: boolean;
    path: string | null;
    version: string | null;
  };
}

export interface VideoFormatOption {
  formatId: string;
  resolution: string;
  height: number;
  fps?: number;
  ext: string;
  filesizeApprox?: string;
  note?: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  channel: string;
  channelUrl?: string;
  views: number;
  likes: number;
  uploadDate: string;
  description: string;
  url: string;
  isLive: boolean;
  availableResolutions: string[];
}

export interface DownloadFile {
  name: string;
  size: number;
  sizeFormatted: string;
  ext: string;
  createdAt: string;
  isVideo: boolean;
  isAudio: boolean;
}

export async function findFfmpeg(): Promise<string | null> {
  const rootDir = process.cwd();
  const candidates = [
    path.join(rootDir, 'ffmpeg.exe'),
    path.join(rootDir, '.venv', 'Scripts', 'ffmpeg.exe'),
    path.join(
      process.env.LOCALAPPDATA || '',
      'Microsoft',
      'WinGet',
      'Packages',
      'yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'ffmpeg-N-125875-g5d4d3bdc61-win64-gpl',
      'bin',
      'ffmpeg.exe'
    )
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return path.dirname(c);
    }
  }

  // Check if ffmpeg is in PATH
  try {
    const out = execSync('where ffmpeg.exe', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const firstLine = out.trim().split('\n')[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return path.dirname(firstLine);
    }
  } catch {
    // not in PATH
  }

  return null;
}

export async function findYtDlp(): Promise<string> {
  const rootDir = process.cwd();
  const candidates = [
    path.join(rootDir, 'yt-dlp.exe'),
    path.join(rootDir, 'video', '.venv', 'Scripts', 'yt-dlp.exe'),
    path.join(rootDir, '.venv', 'Scripts', 'yt-dlp.exe')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return 'yt-dlp';
}

export async function getDownloadsDir(): Promise<string> {
  const dir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function getBinaryStatus(): Promise<BinaryStatus> {
  const ytdlpPath = await findYtDlp();
  let ytdlpAvailable = false;
  let ytdlpVersion: string | null = null;

  try {
    const ver = execSync(`"${ytdlpPath}" --version`, { encoding: 'utf8' }).trim();
    ytdlpAvailable = true;
    ytdlpVersion = ver;
  } catch {
    ytdlpAvailable = false;
  }

  const ffmpegDir = await findFfmpeg();
  let ffmpegAvailable = false;
  let ffmpegVersion: string | null = null;

  if (ffmpegDir) {
    const ffmpegExe = path.join(ffmpegDir, 'ffmpeg.exe');
    if (fs.existsSync(ffmpegExe)) {
      try {
        const out = execSync(`"${ffmpegExe}" -version`, { encoding: 'utf8' });
        const firstLine = out.split('\n')[0].trim();
        ffmpegAvailable = true;
        ffmpegVersion = firstLine;
      } catch {
        ffmpegAvailable = false;
      }
    }
  }

  return {
    ytdlp: {
      available: ytdlpAvailable,
      path: ytdlpPath,
      version: ytdlpVersion
    },
    ffmpeg: {
      available: ffmpegAvailable,
      path: ffmpegDir,
      version: ffmpegVersion
    }
  };
}

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const ytdlpCmd = await findYtDlp();
  const args = ['--dump-json', '--no-warnings', '--playlist-items', '1', url];

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpCmd, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || 'yt-dlp failed to fetch video info'));
      }
      try {
        const json = JSON.parse(stdout);

        // Find available heights
        const resolutionsSet = new Set<string>();
        if (Array.isArray(json.formats)) {
          for (const f of json.formats) {
            if (f.height) {
              if (f.height >= 2160) resolutionsSet.add('4K (2160p)');
              else if (f.height >= 1440) resolutionsSet.add('2K (1440p)');
              else if (f.height >= 1080) resolutionsSet.add('1080p Full HD');
              else if (f.height >= 720) resolutionsSet.add('720p HD');
              else if (f.height >= 480) resolutionsSet.add('480p');
              else if (f.height >= 360) resolutionsSet.add('360p');
            }
          }
        }

        const availableResolutions = Array.from(resolutionsSet);
        if (availableResolutions.length === 0) {
          availableResolutions.push('Best Quality (Auto)', '1080p', '720p', '480p');
        }

        resolve({
          id: json.id || '',
          title: json.title || '',
          thumbnail: json.thumbnail || (json.thumbnails && json.thumbnails[json.thumbnails.length - 1]?.url) || '',
          duration: json.duration || 0,
          durationString: json.duration_string || `${Math.floor((json.duration || 0) / 60)}:${String((json.duration || 0) % 60).padStart(2, '0')}`,
          channel: json.uploader || json.channel || 'Unknown Channel',
          channelUrl: json.channel_url || '',
          views: json.view_count || 0,
          likes: json.like_count || 0,
          uploadDate: json.upload_date ? `${json.upload_date.slice(0, 4)}-${json.upload_date.slice(4, 6)}-${json.upload_date.slice(6, 8)}` : '',
          description: (json.description || '').slice(0, 400),
          url: json.webpage_url || url,
          isLive: Boolean(json.is_live),
          availableResolutions
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error('Failed to parse video metadata: ' + msg));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function listDownloadedFiles(): Promise<DownloadFile[]> {
  const downloadsDir = await getDownloadsDir();
  try {
    const files = fs.readdirSync(downloadsDir);
    return files
      .filter((file) => !file.endsWith('.part') && !file.endsWith('.ytdl'))
      .map((name) => {
        const fullPath = path.join(downloadsDir, name);
        const stat = fs.statSync(fullPath);
        const ext = path.extname(name).toLowerCase().replace('.', '');
        const isVideo = ['mp4', 'mkv', 'webm', 'mov'].includes(ext);
        const isAudio = ['mp3', 'm4a', 'aac', 'opus', 'wav', 'flac'].includes(ext);

        return {
          name,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          ext,
          createdAt: stat.mtime.toISOString(),
          isVideo,
          isAudio
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}
