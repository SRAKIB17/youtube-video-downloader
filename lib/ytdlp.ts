import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync } from 'child_process';
import AdmZip from 'adm-zip';

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
  // 1. Windows local paths
  if (process.platform === 'win32') {
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
      if (fs.existsSync(/*turbopackIgnore: true*/ c)) {
        return c;
      }
    }

    try {
      const out = execSync('where ffmpeg.exe', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const firstLine = out.trim().split('\n')[0].trim();
      if (firstLine && fs.existsSync(/*turbopackIgnore: true*/ firstLine)) {
        return firstLine;
      }
    } catch {}
  } else {
    // 2. Linux/macOS PATH or /tmp/bin
    const tmpFfmpeg = path.join(os.tmpdir(), 'bin', 'ffmpeg');
    if (fs.existsSync(/*turbopackIgnore: true*/ tmpFfmpeg)) {
      try {
        fs.chmodSync(tmpFfmpeg, 0o755);
      } catch {}
      return tmpFfmpeg;
    }

    const linuxPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
    for (const p of linuxPaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        return p;
      }
    }

    try {
      const out = execSync('which ffmpeg', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (out && fs.existsSync(/*turbopackIgnore: true*/ out)) {
        return out;
      }
    } catch {}

    // Auto-fetch static Linux ffmpeg from ffbinaries
    try {
      const binDir = path.dirname(tmpFfmpeg);
      if (!fs.existsSync(/*turbopackIgnore: true*/ binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }

      const response = await fetch('https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-linux-64.zip', {
        redirect: 'follow'
      });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const zip = new AdmZip(buffer);
        zip.extractAllTo(binDir, true);
        if (fs.existsSync(/*turbopackIgnore: true*/ tmpFfmpeg)) {
          fs.chmodSync(tmpFfmpeg, 0o755);
          return tmpFfmpeg;
        }
      }
    } catch (fetchErr) {
      console.error('Failed to download static ffmpeg:', fetchErr);
    }
  }

  return null;
}

export async function findYtDlp(): Promise<string> {
  // Windows local candidates
  if (process.platform === 'win32') {
    const rootDir = process.cwd();
    const candidates = [
      path.join(rootDir, 'yt-dlp.exe'),
      path.join(rootDir, 'video', '.venv', 'Scripts', 'yt-dlp.exe'),
      path.join(rootDir, '.venv', 'Scripts', 'yt-dlp.exe')
    ];

    for (const c of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ c)) {
        return c;
      }
    }

    try {
      const out = execSync('where yt-dlp.exe', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const firstLine = out.trim().split('\n')[0].trim();
      if (firstLine && fs.existsSync(/*turbopackIgnore: true*/ firstLine)) {
        return firstLine;
      }
    } catch {}

    return 'yt-dlp';
  }

  // Linux / Serverless / Vercel
  const tmpBin = path.join(os.tmpdir(), 'bin', 'yt-dlp');
  if (fs.existsSync(/*turbopackIgnore: true*/ tmpBin)) {
    try {
      const stat = fs.statSync(tmpBin);
      // Ensure it's the full standalone binary (>10MB), not the small python script
      if (stat.size > 10 * 1024 * 1024) {
        fs.chmodSync(tmpBin, 0o755);
        return tmpBin;
      }
      fs.unlinkSync(tmpBin);
    } catch {}
  }

  // Check if yt-dlp is in PATH on Linux
  try {
    const out = execSync('which yt-dlp', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (out && fs.existsSync(/*turbopackIgnore: true*/ out)) {
      return out;
    }
  } catch {}

  // Auto-download standalone Linux yt-dlp binary (yt-dlp_linux includes Python runtime)
  try {
    const binDir = path.dirname(tmpBin);
    if (!fs.existsSync(/*turbopackIgnore: true*/ binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const response = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', {
      redirect: 'follow'
    });
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(tmpBin, buffer);
      try {
        fs.chmodSync(tmpBin, 0o755);
      } catch {}
      return tmpBin;
    }
  } catch (err) {
    console.error('Failed to auto-fetch Linux yt-dlp binary:', err);
  }

  return 'yt-dlp';
}

export function getYtDlpExtraArgs(customCookies?: string): string[] {
  const extraArgs: string[] = [
    '--no-check-certificates',
    '--geo-bypass',
    '--extractor-args',
    'youtube:player_client=ios,android,mweb'
  ];

  const cookieData = (customCookies || process.env.YTDLP_COOKIES || '').trim();
  if (cookieData) {
    const cookiesPath = path.join(os.tmpdir(), 'cookies.txt');
    try {
      fs.writeFileSync(cookiesPath, cookieData, 'utf8');
      extraArgs.push('--cookies', cookiesPath);
    } catch {}
  } else if (process.env.YTDLP_COOKIES_FILE && fs.existsSync(process.env.YTDLP_COOKIES_FILE)) {
    extraArgs.push('--cookies', process.env.YTDLP_COOKIES_FILE);
  }

  // Proxy support to bypass datacenter IP restrictions
  if (process.env.YTDLP_PROXY) {
    extraArgs.push('--proxy', process.env.YTDLP_PROXY);
  }

  return extraArgs;
}

export async function getDownloadsDir(): Promise<string> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.platform === 'linux');
  const dir = isServerless ? path.join(os.tmpdir(), 'downloads') : path.join(process.cwd(), 'downloads');
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

  const ffmpegPath = await findFfmpeg();
  let ffmpegAvailable = false;
  let ffmpegVersion: string | null = null;

  if (ffmpegPath && fs.existsSync(/*turbopackIgnore: true*/ ffmpegPath)) {
    try {
      const out = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' });
      const firstLine = out.split('\n')[0].trim();
      ffmpegAvailable = true;
      ffmpegVersion = firstLine;
    } catch {
      ffmpegAvailable = false;
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
      path: ffmpegPath,
      version: ffmpegVersion
    }
  };
}

export async function fetchVideoInfo(url: string, cookies?: string): Promise<VideoInfo> {
  const ytdlpCmd = await findYtDlp();
  const extra = getYtDlpExtraArgs(cookies);
  const args = ['--dump-json', '--no-warnings', '--playlist-items', '1', ...extra, url];

  return new Promise((resolve, reject) => {
    const proc = spawn(/*turbopackIgnore: true*/ ytdlpCmd, args);
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
