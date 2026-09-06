'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Film,
  Music,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  Trash2,
  Play,
  RefreshCw,
  Clock,
  Eye,
  ThumbsUp,
  Cpu,
  Check,
  Clipboard,
  X,
  HardDrive,
  Sliders,
  Sparkles,
  ExternalLink,
  Search,
  CheckSquare,
  Square,
  FileVideo,
  FileAudio,
  ShieldCheck,
  Zap
} from 'lucide-react';

function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface VideoInfo {
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

interface DownloadFile {
  name: string;
  size: number;
  sizeFormatted: string;
  ext: string;
  createdAt: string;
  isVideo: boolean;
  isAudio: boolean;
}

interface BinaryStatus {
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
  downloadsDir?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'downloader' | 'library' | 'system'>('downloader');

  // Input & Info state
  const [url, setUrl] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cookies state for bypassing YouTube bot checks
  const [userCookies, setUserCookies] = useState<string>('');
  const [showCookieModal, setShowCookieModal] = useState<boolean>(false);
  const [cookieInput, setCookieInput] = useState<string>('');

  // Configuration state
  const [downloadMode, setDownloadMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState<'best' | '2160p' | '1080p' | '720p' | '480p'>('best');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'm4a' | 'wav' | 'flac'>('mp3');
  const [customFilename, setCustomFilename] = useState('');
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [embedChapters, setEmbedChapters] = useState(true);
  const [embedSubtitles, setEmbedSubtitles] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressSpeed, setProgressSpeed] = useState<string>('');
  const [progressEta, setProgressEta] = useState<string>('');
  const [progressTotalSize, setProgressTotalSize] = useState<string>('');
  const [progressStatusText, setProgressStatusText] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<
    'idle' | 'downloading' | 'merging' | 'converting' | 'completed' | 'failed'
  >('idle');
  const [downloadLogs, setDownloadLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [completedFileName, setCompletedFileName] = useState<string | null>(null);

  // Library state
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [systemStatus, setSystemStatus] = useState<BinaryStatus | null>(null);
  const [activeMediaPreview, setActiveMediaPreview] = useState<DownloadFile | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system');
      const json = await res.json();
      if (json.success) {
        setSystemStatus(json.data);
      }
    } catch {
      // ignore
    }
  };

  // Fetch downloaded files list
  const fetchDownloadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/downloads');
      const json = await res.json();
      if (json.success && json.data) {
        setDownloadFiles(json.data.files || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    fetchDownloadedFiles();
    try {
      const saved = localStorage.getItem('ytdlp_user_cookies');
      if (saved) {
        setUserCookies(saved);
        setCookieInput(saved);
      }
    } catch {}
  }, []);

  const handleSaveCookies = () => {
    try {
      const clean = cookieInput.trim();
      localStorage.setItem('ytdlp_user_cookies', clean);
      setUserCookies(clean);
      setShowCookieModal(false);
      setErrorMessage(null);
    } catch {}
  };

  const handleClearCookies = () => {
    try {
      localStorage.removeItem('ytdlp_user_cookies');
      setUserCookies('');
      setCookieInput('');
      setShowCookieModal(false);
    } catch {}
  };

  // Auto scroll terminal logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [downloadLogs, showLogs]);

  // Handle Fetch Video Info
  const handleFetchInfo = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || url).trim();
    if (!urlToFetch) {
      setErrorMessage('Please enter a valid YouTube video or audio URL.');
      return;
    }

    setErrorMessage(null);
    setLoadingInfo(true);
    setVideoInfo(null);
    setCompletedFileName(null);
    setDownloadStatus('idle');

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch, cookies: userCookies })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch video information');
      }

      setVideoInfo(json.data);
      setCustomFilename(json.data.title.replace(/[\\/:*?"<>|]/g, ' '));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoadingInfo(false);
    }
  };

  // Quick load test.js sample URL
  const handleLoadTestSample = () => {
    const testUrl = 'https://www.youtube.com/watch?v=mWXfYAnuEi0';
    setUrl(testUrl);
    handleFetchInfo(testUrl);
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        handleFetchInfo(text.trim());
      }
    } catch {
      // clipboard access might be blocked
    }
  };

  // Open Downloads Folder in Windows Explorer
  const handleOpenFolder = async () => {
    try {
      await fetch('/api/open-folder', { method: 'POST' });
    } catch {
      alert('Could not open downloads directory');
    }
  };

  // Trigger Download via Server-Sent Events
  const handleStartDownload = async () => {
    const targetUrl = (videoInfo?.url || url).trim();
    if (!targetUrl) {
      setErrorMessage('Please provide a valid YouTube URL first.');
      return;
    }

    setIsDownloading(true);
    setDownloadStatus('downloading');
    setProgressPercent(0);
    setProgressSpeed('');
    setProgressEta('');
    setProgressTotalSize('');
    setProgressStatusText('Initializing yt-dlp & FFmpeg pipeline...');
    setDownloadLogs([]);
    setCompletedFileName(null);
    setShowLogs(true);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          mode: downloadMode,
          quality: quality,
          audioFormat: audioFormat,
          customFilename: customFilename.trim() || undefined,
          embedThumbnail,
          embedChapters,
          embedSubtitles,
          cookies: userCookies
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const trimmed = block.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());

              if (data.type === 'log') {
                setDownloadLogs((prev) => [...prev.slice(-400), data.message]);
              } else if (data.type === 'progress') {
                if (typeof data.percent === 'number') {
                  setProgressPercent(Math.min(100, Math.max(0, data.percent)));
                }
                if (data.speed) setProgressSpeed(data.speed);
                if (data.eta) setProgressEta(data.eta);
                if (data.totalSize) setProgressTotalSize(data.totalSize);
                if (data.statusText) setProgressStatusText(data.statusText);

                if (data.status === 'merging') {
                  setDownloadStatus('merging');
                } else if (data.status === 'converting') {
                  setDownloadStatus('converting');
                }
              } else if (data.type === 'complete') {
                setDownloadStatus('completed');
                setProgressPercent(100);
                setProgressStatusText(data.statusText || 'Download Finished!');
                setCompletedFileName(data.fileName || null);
                fetchDownloadedFiles();
              } else if (data.type === 'error') {
                setDownloadStatus('failed');
                setProgressStatusText(data.statusText || data.error || 'Download failed');
                setErrorMessage(data.error || 'An error occurred during download');
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDownloadStatus('failed');
      setProgressStatusText('Download failed');
      setErrorMessage(msg);
    } finally {
      setIsDownloading(false);
      fetchDownloadedFiles();
    }
  };

  // Delete file from library
  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const res = await fetch(`/api/file?filename=${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (activeMediaPreview?.name === fileName) {
          setActiveMediaPreview(null);
        }
        fetchDownloadedFiles();
      }
    } catch {
      alert('Failed to delete file');
    }
  };

  // Filtered files in Library
  const filteredFiles = downloadFiles.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(librarySearch.toLowerCase());
    if (!matchesSearch) return false;
    if (libraryFilter === 'video') return f.isVideo;
    if (libraryFilter === 'audio') return f.isAudio;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-red-600 selection:text-white bg-[#07080c] text-zinc-100">
      {/* Premium Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#090b12]/80 border-b border-white/[0.08] px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform duration-300">
                <YoutubeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#090b12] animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#090b12]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  YouTube Studio Downloader
                </h1>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600/20 to-rose-600/20 text-red-400 border border-red-500/30">
                  PRO STUDIO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Ultra-high bitrate downloader & multiplexer with yt-dlp & FFmpeg
              </p>
            </div>
          </div>

          {/* Engine Status Indicators & Quick Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                  systemStatus?.ytdlp.available
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="font-semibold">yt-dlp</span>
                <span className="text-[10px] opacity-75">
                  {systemStatus?.ytdlp.version ? `v${systemStatus.ytdlp.version}` : 'Active'}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                  systemStatus?.ffmpeg.available
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span className="font-semibold">FFmpeg</span>
                <span className="text-[10px] opacity-75">Ready</span>
              </div>
            </div>

            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10 transition-all hover:border-white/20 active:scale-95"
              title="Open output folder on PC"
            >
              <FolderOpen className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Storage Folder</span>
              {downloadFiles.length > 0 && (
                <span className="ml-1 text-[10px] bg-red-600/30 text-red-300 px-1.5 py-0.2 rounded-full">
                  {downloadFiles.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-white/[0.08] shadow-inner">
            <button
              onClick={() => setActiveTab('downloader')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'downloader'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Studio Downloader</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('library');
                fetchDownloadedFiles();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Media Library ({downloadFiles.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('system');
                fetchSystemStatus();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'system'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Diagnostics</span>
            </button>
            <button
              onClick={() => setShowCookieModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                userCookies
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Configure YouTube Cookies for Cloud Serverless bypass"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{userCookies ? 'Cookies Active ✓' : 'Bypass Bot Check'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Lossless A/V Multiplexing Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex-1">
        {/* ======================================================== */}
        {/* TAB 1: DOWNLOADER */}
        {/* ======================================================== */}
        {activeTab === 'downloader' && (
          <div className="space-y-6">
            {/* URL Input Box */}
            <div className="glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden border border-white/[0.08]">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-red-600/15 via-rose-600/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
                <label className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <YoutubeIcon className="w-4 h-4 text-red-500" />
                  Target YouTube URL:
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handlePasteClipboard}
                    className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all border border-white/5 font-medium"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
                    Paste URL
                  </button>
                  <button
                    onClick={handleLoadTestSample}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all border border-red-500/20 font-medium"
                    title="Load test.js sample video"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load test.js demo
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                    placeholder="Paste link e.g. https://www.youtube.com/watch?v=... or YouTube Shorts link"
                    className="w-full px-5 py-4 rounded-2xl bg-black/60 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-white placeholder-zinc-500 outline-none text-sm transition-all"
                  />
                  {url && (
                    <button
                      onClick={() => setUrl('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleFetchInfo()}
                  disabled={loadingInfo || !url.trim()}
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/25 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-98 shrink-0"
                >
                  {loadingInfo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Inspecting Media...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Analyze Video</span>
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1">
                      <span className="font-bold">Error Encountered: </span>
                      {errorMessage}
                    </div>
                    <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {errorMessage.toLowerCase().includes('bot') && (
                    <div className="pt-2 border-t border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-zinc-300">
                        YouTube blocked this cloud server IP. Paste your cookies to bypass instantly:
                      </span>
                      <button
                        onClick={() => setShowCookieModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md shadow-red-600/30"
                      >
                        Add YouTube Cookies
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Info Preview & Options */}
            {videoInfo && (
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-7 border border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                  {/* Thumbnail Preview Card */}
                  <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/15 group aspect-video bg-black/80 shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-3 right-3 bg-black/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-400" />
                      {videoInfo.durationString}
                    </div>
                    {videoInfo.isLive && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse">
                        LIVE
                      </div>
                    )}
                  </div>

                  {/* Video Metadata */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-red-400 font-semibold uppercase tracking-wider mb-1.5">
                        <span>Ready to download</span>
                        <span>•</span>
                        <span className="text-zinc-400">{videoInfo.channel}</span>
                      </div>
                      <h2 className="text-lg sm:text-2xl font-black text-white line-clamp-2 leading-snug">
                        {videoInfo.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-zinc-400">
                        {videoInfo.views > 0 && (
                          <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                            <Eye className="w-3.5 h-3.5 text-zinc-300" />
                            <strong className="text-zinc-200">{videoInfo.views.toLocaleString()}</strong> views
                          </span>
                        )}
                        {videoInfo.likes > 0 && (
                          <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                            <ThumbsUp className="w-3.5 h-3.5 text-zinc-300" />
                            <strong className="text-zinc-200">{videoInfo.likes.toLocaleString()}</strong> likes
                          </span>
                        )}
                        {videoInfo.uploadDate && (
                          <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-zinc-300" />
                            {videoInfo.uploadDate}
                          </span>
                        )}
                        <a
                          href={videoInfo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open in YouTube
                        </a>
                      </div>
                    </div>

                    {videoInfo.description && (
                      <p className="text-xs text-zinc-400 line-clamp-3 bg-black/40 p-3.5 rounded-xl border border-white/5 font-mono leading-relaxed">
                        {videoInfo.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Configurations Section */}
                <div className="border-t border-white/10 pt-7 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-red-400" />
                      Studio Download Settings
                    </h3>
                    <span className="text-xs text-zinc-500 font-mono">FFmpeg engine: active</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Mode: Video vs Audio */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 block">
                        Media Stream
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDownloadMode('video')}
                          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                            downloadMode === 'video'
                              ? 'bg-gradient-to-r from-red-600/25 to-rose-600/25 border-red-500 text-white shadow-lg shadow-red-600/20'
                              : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                          }`}
                        >
                          <Film className="w-4 h-4 text-red-400" />
                          <span>Video + Audio (MP4)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownloadMode('audio')}
                          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                            downloadMode === 'audio'
                              ? 'bg-gradient-to-r from-red-600/25 to-rose-600/25 border-red-500 text-white shadow-lg shadow-red-600/20'
                              : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                          }`}
                        >
                          <Music className="w-4 h-4 text-red-400" />
                          <span>Audio Only</span>
                        </button>
                      </div>
                    </div>

                    {/* Quality / Resolution Matrix */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 block">
                        {downloadMode === 'video' ? 'Select Resolution' : 'Select Audio Format'}
                      </label>
                      {downloadMode === 'video' ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { key: 'best', label: 'Best / Auto' },
                            { key: '2160p', label: '4K Ultra' },
                            { key: '1080p', label: '1080p FHD' },
                            { key: '720p', label: '720p HD' },
                            { key: '480p', label: '480p SD' }
                          ].map((q) => (
                            <button
                              key={q.key}
                              type="button"
                              onClick={() => setQuality(q.key as typeof quality)}
                              className={`py-3 px-1.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                                quality === q.key
                                  ? 'bg-white/15 border-red-500 text-white shadow-md shadow-red-500/20'
                                  : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                              }`}
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { key: 'mp3', label: 'MP3 (320k)', note: 'Universal' },
                            { key: 'm4a', label: 'M4A (AAC)', note: 'Apple' },
                            { key: 'flac', label: 'FLAC', note: 'Hi-Fi' },
                            { key: 'wav', label: 'WAV', note: 'Lossless' }
                          ].map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setAudioFormat(f.key as typeof audioFormat)}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                audioFormat === f.key
                                  ? 'bg-white/15 border-red-500 text-white font-bold shadow-md shadow-red-500/20'
                                  : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                              }`}
                            >
                              <div className="text-xs font-bold uppercase">{f.key}</div>
                              <div className="text-[10px] text-zinc-500">{f.note}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Processing Features (Checkboxes) */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                    <span className="text-xs font-bold text-zinc-300 block mb-3 uppercase tracking-wider text-[10px] text-zinc-400">
                      Studio Post-Processing (FFmpeg Automated)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setEmbedThumbnail(!embedThumbnail)}
                        className={`flex items-center gap-2 text-xs p-2 rounded-xl transition-all text-left ${
                          embedThumbnail ? 'text-zinc-100 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {embedThumbnail ? (
                          <CheckSquare className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span>Embed Cover Thumbnail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmbedChapters(!embedChapters)}
                        className={`flex items-center gap-2 text-xs p-2 rounded-xl transition-all text-left ${
                          embedChapters ? 'text-zinc-100 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {embedChapters ? (
                          <CheckSquare className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span>Embed Chapters & Markers</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmbedSubtitles(!embedSubtitles)}
                        className={`flex items-center gap-2 text-xs p-2 rounded-xl transition-all text-left ${
                          embedSubtitles ? 'text-zinc-100 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {embedSubtitles ? (
                          <CheckSquare className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span>Embed English/Bengali Subtitles</span>
                      </button>
                    </div>
                  </div>

                  {/* Output Filename Customization */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                      Target File Name (Optional):
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="Leave default for video title"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 outline-none focus:border-red-500 transition-colors font-mono"
                    />
                  </div>

                  {/* Start Download Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleStartDownload}
                      disabled={isDownloading}
                      className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-base flex items-center justify-center gap-3 shadow-2xl shadow-red-600/35 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 active:scale-98"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing Download with yt-dlp & FFmpeg...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>
                            Start Download ({downloadMode === 'video' ? `MP4 • ${quality}` : `Audio • ${audioFormat.toUpperCase()}`})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Real-Time Download HUD Card */}
            {(isDownloading || downloadStatus !== 'idle') && (
              <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border border-red-500/40 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {downloadStatus === 'downloading' && (
                      <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                    {downloadStatus === 'merging' && (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                        <Film className="w-5 h-5 animate-pulse" />
                      </div>
                    )}
                    {downloadStatus === 'converting' && (
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                        <Music className="w-5 h-5 animate-pulse" />
                      </div>
                    )}
                    {downloadStatus === 'completed' && (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    {downloadStatus === 'failed' && (
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-white capitalize">
                          {downloadStatus === 'merging'
                            ? 'FFmpeg Multiplexing'
                            : downloadStatus === 'converting'
                            ? 'Audio Encoding'
                            : downloadStatus === 'completed'
                            ? 'Download Completed'
                            : 'Downloading Streams'}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
                          {downloadStatus}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{progressStatusText || 'Processing...'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-black/60 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/10 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 shadow-sm shadow-red-500/50"
                    style={{ width: `${Math.max(3, progressPercent)}%` }}
                  />
                </div>

                {/* Real-time stats grid */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Download Speed
                    </span>
                    <span className="font-extrabold text-zinc-200 text-sm font-mono">
                      {progressSpeed || (isDownloading ? 'Fetching...' : '0 B/s')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Estimated Time (ETA)
                    </span>
                    <span className="font-extrabold text-zinc-200 text-sm font-mono">
                      {progressEta || (isDownloading ? 'Calculating...' : '--:--')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                      Target File Size
                    </span>
                    <span className="font-extrabold text-zinc-200 text-sm font-mono">
                      {progressTotalSize || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Completed Action Banner */}
                {downloadStatus === 'completed' && completedFileName && (
                  <div className="mt-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-300">File Ready in Media Library</p>
                        <p className="text-xs text-zinc-300 font-mono truncate max-w-md">
                          {completedFileName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <a
                        href={`/api/file?filename=${encodeURIComponent(completedFileName)}`}
                        download={completedFileName}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        Download to PC
                      </a>
                      <button
                        onClick={handleOpenFolder}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all border border-white/10 active:scale-95"
                      >
                        <FolderOpen className="w-4 h-4 text-red-400" />
                        Show in Folder
                      </button>
                    </div>
                  </div>
                )}

                {/* Console Log Toggle */}
                <div className="border-t border-white/10 pt-4">
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <Terminal className="w-4 h-4 text-red-400" />
                    <span>{showLogs ? 'Collapse Engine Logs' : 'Expand Live yt-dlp & FFmpeg Logs'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                      {downloadLogs.length} events
                    </span>
                  </button>

                  {showLogs && (
                    <div className="mt-3 p-4 rounded-2xl bg-black/90 border border-white/10 font-mono text-[11px] text-zinc-300 max-h-60 overflow-y-auto space-y-1 shadow-inner">
                      {downloadLogs.length === 0 ? (
                        <div className="text-zinc-500 italic">Waiting for command stream...</div>
                      ) : (
                        downloadLogs.map((log, idx) => {
                          const isDownload = log.includes('[download]');
                          const isMerge = log.includes('[Merger]') || log.includes('[ffmpeg]');
                          const isExtract = log.includes('[ExtractAudio]');
                          return (
                            <div
                              key={idx}
                              className={`leading-relaxed ${
                                isDownload
                                  ? 'text-cyan-300/90'
                                  : isMerge
                                  ? 'text-amber-300/90 font-semibold'
                                  : isExtract
                                  ? 'text-indigo-300/90 font-semibold'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {log}
                            </div>
                          );
                        })
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: LIBRARY / DOWNLOADED MEDIA */}
        {/* ======================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-red-500" />
                  Media Library
                </h2>
                <p className="text-xs text-zinc-400">
                  Files saved in <code className="text-zinc-300">./downloads</code> folder
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchDownloadedFiles}
                  disabled={loadingFiles}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-all border border-white/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleOpenFolder}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                  <FolderOpen className="w-4 h-4" />
                  Open in Explorer
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search downloaded files..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/5">
                <button
                  onClick={() => setLibraryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    libraryFilter === 'all' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({downloadFiles.length})
                </button>
                <button
                  onClick={() => setLibraryFilter('video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    libraryFilter === 'video' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Videos ({downloadFiles.filter((f) => f.isVideo).length})
                </button>
                <button
                  onClick={() => setLibraryFilter('audio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    libraryFilter === 'audio' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Audios ({downloadFiles.filter((f) => f.isAudio).length})
                </button>
              </div>
            </div>

            {loadingFiles ? (
              <div className="py-24 text-center glass-panel rounded-3xl">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-400">Loading downloads...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-white/10 space-y-3">
                <Film className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-zinc-200">No media found in library</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {librarySearch
                    ? 'No files matched your search query.'
                    : 'Download any YouTube video or audio in the Downloader tab.'}
                </p>
                <button
                  onClick={() => setActiveTab('downloader')}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                >
                  Go to Downloader
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.name}
                    className="glass-panel rounded-2xl p-4.5 border border-white/10 hover:border-red-500/30 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start gap-3.5 overflow-hidden">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          file.isVideo
                            ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                            : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {file.isVideo ? <FileVideo className="w-5 h-5" /> : <FileAudio className="w-5 h-5" />}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                          <span className="uppercase font-black text-zinc-200 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                            {file.ext}
                          </span>
                          <span>{file.sizeFormatted}</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <button
                        onClick={() => setActiveMediaPreview(file)}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Preview
                      </button>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/file?filename=${encodeURIComponent(file.name)}`}
                          download={file.name}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          title="Save to PC"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.name)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SYSTEM & BINARIES DIAGNOSTICS */}
        {/* ======================================================== */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl space-y-7 border border-white/[0.08]">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-red-500" />
                  Engine Executables & System Architecture
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Verifies local yt-dlp.exe and ffmpeg.exe execution environment configured as in test.js
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* yt-dlp Status Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">yt-dlp Engine</h4>
                        <span className="text-[10px] text-zinc-400 font-mono">Stream Extractor</span>
                      </div>
                    </div>
                    {systemStatus?.ytdlp.available ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Operational
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        Missing
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-2 pt-3 border-t border-white/5 font-mono text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Executable Path:</span>
                      <span className="text-zinc-200 break-all">
                        {systemStatus?.ytdlp.path || 'Not detected'}
                      </span>
                    </div>
                    {systemStatus?.ytdlp.version && (
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Version:</span>
                        <span className="text-emerald-400 font-bold">{systemStatus.ytdlp.version}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ffmpeg Status Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                        <Film className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">FFmpeg Multiplexer</h4>
                        <span className="text-[10px] text-zinc-400 font-mono">A/V Merger & Audio Transcoder</span>
                      </div>
                    </div>
                    {systemStatus?.ffmpeg.available ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Operational
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        Missing
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-2 pt-3 border-t border-white/5 font-mono text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Binary Folder:</span>
                      <span className="text-zinc-200 break-all">
                        {systemStatus?.ffmpeg.path || 'Not detected'}
                      </span>
                    </div>
                    {systemStatus?.ffmpeg.version && (
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Build Version:</span>
                        <span className="text-emerald-400 font-bold">{systemStatus.ffmpeg.version}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Storage Destination Card */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Target Output Directory:
                  </span>
                  <p className="text-xs font-mono text-zinc-200 break-all">
                    {systemStatus?.downloadsDir || './downloads'}
                  </p>
                </div>
                <button
                  onClick={handleOpenFolder}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all border border-white/10 shrink-0"
                >
                  <FolderOpen className="w-4 h-4 text-red-400" />
                  Open in Explorer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Media Preview Modal */}
      {activeMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeMediaPreview.isVideo ? (
                  <Film className="w-5 h-5 text-red-400" />
                ) : (
                  <Music className="w-5 h-5 text-indigo-400" />
                )}
                <h3 className="text-sm font-bold text-white truncate max-w-lg">
                  {activeMediaPreview.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveMediaPreview(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center aspect-video max-h-[65vh] shadow-inner">
              {activeMediaPreview.isVideo ? (
                <video
                  src={`/api/file?filename=${encodeURIComponent(activeMediaPreview.name)}`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-5 py-16">
                  <div className="w-20 h-20 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center animate-pulse">
                    <Music className="w-10 h-10" />
                  </div>
                  <audio
                    src={`/api/file?filename=${encodeURIComponent(activeMediaPreview.name)}`}
                    controls
                    autoPlay
                    className="w-96"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-white/10">
              <span className="font-mono">Size: {activeMediaPreview.sizeFormatted}</span>
              <a
                href={`/api/file?filename=${encodeURIComponent(activeMediaPreview.name)}`}
                download={activeMediaPreview.name}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/25 active:scale-95"
              >
                <Download className="w-4 h-4" />
                Save File to Device
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cookies Modal for YouTube Bot Bypass */}
      {showCookieModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-400 border border-red-600/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">Bypass YouTube Bot Check</h3>
                  <p className="text-xs text-zinc-400">Configure Cookies for Cloud / Vercel Serverless</p>
                </div>
              </div>
              <button
                onClick={() => setShowCookieModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p className="leading-relaxed">
                Cloud providers (Vercel, AWS, Render) are automatically flagged by YouTube with &quot;Sign in to confirm you&apos;re not a bot&quot;.
                Providing your browser cookies authenticates your requests as a real human.
              </p>

              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2">
                <p className="font-semibold text-zinc-200">How to get your cookies in 1 minute:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>
                    Install the free Chrome/Edge extension:{' '}
                    <a
                      href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-400 underline font-medium hover:text-red-300 inline-flex items-center gap-1"
                    >
                      Get cookies.txt LOCALLY <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Go to <a href="https://youtube.com" target="_blank" rel="noreferrer" className="text-red-400 underline">youtube.com</a> while signed in.</li>
                  <li>Click the extension icon in your browser toolbar, then click <strong>Export</strong>.</li>
                  <li>Paste the copied text below:</li>
                </ol>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Cookies (Netscape format / cookies.txt):
                </label>
                <textarea
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="# Netscape HTTP Cookie File&#10;.youtube.com  TRUE  /  TRUE  ...  SID  ..."
                  rows={6}
                  className="w-full font-mono text-xs bg-zinc-950/90 border border-white/15 rounded-2xl p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              {userCookies ? (
                <button
                  onClick={handleClearCookies}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 transition"
                >
                  Clear Stored Cookies
                </button>
              ) : <div />}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowCookieModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCookies}
                  disabled={!cookieInput.trim()}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-red-600/30"
                >
                  Save & Apply Cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio Footer */}
      <footer className="border-t border-white/[0.08] py-6 px-4 text-center text-xs text-zinc-500">
        <p>
          YouTube Downloader Pro • High Performance Studio • yt-dlp & FFmpeg 64-bit Engine • Merges best video and audio without quality degradation
        </p>
      </footer>
    </div>
  );
}
