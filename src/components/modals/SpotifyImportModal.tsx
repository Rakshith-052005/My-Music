import React, { useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
  Disc,
  Check,
  Heart,
  Upload,
  FileCheck,
  Download,
  ListMusic,
  Clock,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import {
  inspectSpotifyExportFile,
  SpotifyDetectionResult,
  NormalizedSpotifyTrack,
  NormalizedSpotifyPlaylist,
  NormalizedSpotifyHistoryItem,
  NormalizedSpotifySearchItem,
  matchSpotifySongWithCandidate,
} from '../../services/spotifyExportParser';
import { apiService } from '../../services/api';
import { playlistService } from '../../services/playlistService';
import { supabaseService } from '../../services/supabase';
import { Track, Playlist } from '../../types/music';

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WorkflowStep = 'idle' | 'detected' | 'migrating' | 'complete' | 'review_unmatched';

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({ isOpen, onClose }) => {
  const { likes, toggleLike } = useLibrary();

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Detection Result
  const [detection, setDetection] = useState<SpotifyDetectionResult | null>(null);

  // User Category Selections
  const [selectedCategories, setSelectedCategories] = useState<{
    savedSongs: boolean;
    playlists: boolean;
    listeningHistory: boolean;
    searchHistory: boolean;
  }>({
    savedSongs: true,
    playlists: true,
    listeningHistory: false,
    searchHistory: false,
  });

  // Progress states
  const [categoryProgress, setCategoryProgress] = useState<{
    likedSongs: { current: number; total: number; status: 'idle' | 'running' | 'done' | 'skipped' };
    playlists: { current: number; total: number; status: 'idle' | 'running' | 'done' | 'skipped' };
    listeningHistory: { current: number; total: number; status: 'idle' | 'running' | 'done' | 'skipped' };
    searchHistory: { current: number; total: number; status: 'idle' | 'running' | 'done' | 'skipped' };
  }>({
    likedSongs: { current: 0, total: 0, status: 'idle' },
    playlists: { current: 0, total: 0, status: 'idle' },
    listeningHistory: { current: 0, total: 0, status: 'idle' },
    searchHistory: { current: 0, total: 0, status: 'idle' },
  });

  // Final Stats
  const [stats, setStats] = useState<{
    likedSongs: { total: number; matched: number; alreadyExisted: number; unmatchedTracks: NormalizedSpotifyTrack[] };
    playlists: { total: number; imported: number; created: number; alreadyExisted: number };
    listeningHistory: { total: number; imported: number };
    searchHistory: { total: number; imported: number };
  }>({
    likedSongs: { total: 0, matched: 0, alreadyExisted: 0, unmatchedTracks: [] },
    playlists: { total: 0, imported: 0, created: 0, alreadyExisted: 0 },
    listeningHistory: { total: 0, imported: 0 },
    searchHistory: { total: 0, imported: 0 },
  });

  // Unmatched track manual search state
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, Track[]>>({});
  const [isSearchingTrack, setIsSearchingTrack] = useState<Record<string, boolean>>({});
  const [matchedTrackKeys, setMatchedTrackKeys] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSpotifyData = () => {
    window.open('https://www.spotify.com/account/privacy/', '_blank', 'noopener,noreferrer');
  };

  const handleResetModal = () => {
    setSelectedFile(null);
    setWorkflowStep('idle');
    setErrorMsg('');
    setIsParsing(false);
    setDetection(null);
    setSelectedCategories({
      savedSongs: true,
      playlists: true,
      listeningHistory: false,
      searchHistory: false,
    });
    setCategoryProgress({
      likedSongs: { current: 0, total: 0, status: 'idle' },
      playlists: { current: 0, total: 0, status: 'idle' },
      listeningHistory: { current: 0, total: 0, status: 'idle' },
      searchHistory: { current: 0, total: 0, status: 'idle' },
    });
    setStats({
      likedSongs: { total: 0, matched: 0, alreadyExisted: 0, unmatchedTracks: [] },
      playlists: { total: 0, imported: 0, created: 0, alreadyExisted: 0 },
      listeningHistory: { total: 0, imported: 0 },
      searchHistory: { total: 0, imported: 0 },
    });
    setSearchQueries({});
    setSearchResults({});
    setIsSearchingTrack({});
    setMatchedTrackKeys(new Set());
  };

  const handleClose = () => {
    handleResetModal();
    onClose();
  };

  const processFileUpload = async (file: File) => {
    try {
      setErrorMsg('');
      setIsParsing(true);
      setSelectedFile(file);

      const res = await inspectSpotifyExportFile(file);
      setDetection(res);

      // Pre-select detected categories
      setSelectedCategories({
        savedSongs: res.detectedCategories.savedSongs,
        playlists: res.detectedCategories.playlists,
        listeningHistory: false, // Default unselected for history unless chosen
        searchHistory: false,
      });

      setWorkflowStep('detected');
    } catch (err: any) {
      console.error('Spotify export inspection error:', err);
      setErrorMsg(
        err.message ||
          'Failed to read Spotify export file. Please ensure you uploaded your official Spotify personal data download.'
      );
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip') || file.name.endsWith('.json')) {
        processFileUpload(file);
      } else {
        setErrorMsg('Please upload a valid Spotify export ZIP or JSON file.');
      }
    }
  };

  const startMigration = async () => {
    if (!detection) return;

    setWorkflowStep('migrating');
    setErrorMsg('');

    const existingLikesMap = new Set<string>();
    likes.forEach((t) => {
      if (t.videoId) existingLikesMap.add(t.videoId);
      const normKey = `${t.title.toLowerCase().trim()}::${t.artist.toLowerCase().trim()}`;
      existingLikesMap.add(normKey);
    });

    const finalLikedStats = { total: 0, matched: 0, alreadyExisted: 0, unmatchedTracks: [] as NormalizedSpotifyTrack[] };
    const finalPlaylistStats = { total: 0, imported: 0, created: 0, alreadyExisted: 0 };
    const finalHistoryStats = { total: 0, imported: 0 };
    const finalSearchStats = { total: 0, imported: 0 };

    // -------------------------------------------------------------
    // CATEGORY 1: LIKED / SAVED SONGS
    // -------------------------------------------------------------
    if (selectedCategories.savedSongs && detection.savedSongs.length > 0) {
      const tracks = detection.savedSongs;
      finalLikedStats.total = tracks.length;

      setCategoryProgress((prev) => ({
        ...prev,
        likedSongs: { current: 0, total: tracks.length, status: 'running' },
      }));

      for (let i = 0; i < tracks.length; i++) {
        const sTrack = tracks[i];
        setCategoryProgress((prev) => ({
          ...prev,
          likedSongs: { ...prev.likedSongs, current: i + 1 },
        }));

        const normKey = `${sTrack.title.toLowerCase().trim()}::${sTrack.artist.toLowerCase().trim()}`;

        if (existingLikesMap.has(normKey)) {
          finalLikedStats.alreadyExisted++;
          continue;
        }

        try {
          const query = `${sTrack.title} ${sTrack.artist}`;
          const searchRes = await apiService.search(query, 'songs');
          const candidateSongs = searchRes.songs || [];

          const matchedSong = candidateSongs.find((c) => matchSpotifySongWithCandidate(sTrack, c));

          if (matchedSong) {
            if (existingLikesMap.has(matchedSong.videoId)) {
              finalLikedStats.alreadyExisted++;
            } else {
              await toggleLike(matchedSong);
              existingLikesMap.add(matchedSong.videoId);
              existingLikesMap.add(normKey);
              finalLikedStats.matched++;
            }
          } else {
            finalLikedStats.unmatchedTracks.push(sTrack);
          }
        } catch {
          finalLikedStats.unmatchedTracks.push(sTrack);
        }

        if (i % 12 === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
      }

      setCategoryProgress((prev) => ({
        ...prev,
        likedSongs: { ...prev.likedSongs, status: 'done' },
      }));
    } else {
      setCategoryProgress((prev) => ({
        ...prev,
        likedSongs: { current: 0, total: 0, status: 'skipped' },
      }));
    }

    // -------------------------------------------------------------
    // CATEGORY 2: PLAYLISTS
    // -------------------------------------------------------------
    if (selectedCategories.playlists && detection.playlists.length > 0) {
      const rawPlaylists = detection.playlists;
      finalPlaylistStats.total = rawPlaylists.length;

      setCategoryProgress((prev) => ({
        ...prev,
        playlists: { current: 0, total: rawPlaylists.length, status: 'running' },
      }));

      const existingUserPlaylists = playlistService.getPlaylists();
      const existingNames = new Set(existingUserPlaylists.map((p) => p.title.toLowerCase().trim()));

      for (let i = 0; i < rawPlaylists.length; i++) {
        const spotifyPl = rawPlaylists[i];
        setCategoryProgress((prev) => ({
          ...prev,
          playlists: { ...prev.playlists, current: i + 1 },
        }));

        const cleanPlName = spotifyPl.name.trim();

        // Match tracks inside this playlist against music catalog
        const matchedPlaylistTracks: Track[] = [];

        for (const sTrack of spotifyPl.tracks) {
          try {
            const query = `${sTrack.title} ${sTrack.artist}`;
            const searchRes = await apiService.search(query, 'songs');
            const candidateSongs = searchRes.songs || [];
            const matchedSong = candidateSongs.find((c) => matchSpotifySongWithCandidate(sTrack, c));

            if (matchedSong) {
              matchedPlaylistTracks.push(matchedSong);
            }
          } catch {
            // continue
          }
        }

        if (matchedPlaylistTracks.length > 0) {
          const newPl: Playlist = {
            id: `pl_spotify_${Date.now()}_${i}`,
            playlistId: `pl_spotify_${Date.now()}_${i}`,
            title: cleanPlName,
            description: spotifyPl.description || `Imported from Spotify (${matchedPlaylistTracks.length} tracks)`,
            author: 'Spotify Import',
            artworkUrl: matchedPlaylistTracks[0]?.artworkUrl || '',
            tracks: matchedPlaylistTracks,
            trackCount: matchedPlaylistTracks.length,
            provider: 'youtube_music',
          };

          const saveRes = playlistService.savePlaylist(newPl);
          finalPlaylistStats.imported++;
          if (saveRes.isNew) {
            finalPlaylistStats.created++;
          } else {
            finalPlaylistStats.alreadyExisted++;
          }
        }
      }

      setCategoryProgress((prev) => ({
        ...prev,
        playlists: { ...prev.playlists, status: 'done' },
      }));
    } else {
      setCategoryProgress((prev) => ({
        ...prev,
        playlists: { current: 0, total: 0, status: 'skipped' },
      }));
    }

    // -------------------------------------------------------------
    // CATEGORY 3: LISTENING HISTORY
    // -------------------------------------------------------------
    if (selectedCategories.listeningHistory && detection.listeningHistory.length > 0) {
      const historyRecords = detection.listeningHistory;
      finalHistoryStats.total = historyRecords.length;

      setCategoryProgress((prev) => ({
        ...prev,
        listeningHistory: { current: 0, total: historyRecords.length, status: 'running' },
      }));

      // Convert history records into MyMusic track history entries
      try {
        const storedHistoryStr = localStorage.getItem('mymusic_listening_history') || '[]';
        const existingHist: Track[] = JSON.parse(storedHistoryStr);
        const seenKeys = new Set(existingHist.map((t) => `${t.title.toLowerCase()}::${t.artist.toLowerCase()}`));

        let addedCount = 0;
        for (let i = 0; i < historyRecords.length; i++) {
          const hItem = historyRecords[i];
          setCategoryProgress((prev) => ({
            ...prev,
            listeningHistory: { ...prev.listeningHistory, current: i + 1 },
          }));

          const key = `${hItem.title.toLowerCase()}::${hItem.artist.toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            existingHist.push({
              id: `hist_sp_${i}`,
              videoId: `hist_sp_${i}`,
              providerTrackId: `spotify:${hItem.spotifyTrackId || i}`,
              title: hItem.title,
              artist: hItem.artist,
              artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&h=120&fit=crop',
              duration: hItem.msPlayed ? Math.round(hItem.msPlayed / 1000) : 180,
              provider: 'youtube_music',
            });
            addedCount++;
          }
        }

        localStorage.setItem('mymusic_listening_history', JSON.stringify(existingHist.slice(0, 100)));
        finalHistoryStats.imported = addedCount;
      } catch (err) {
        console.warn('Failed to save listening history:', err);
      }

      setCategoryProgress((prev) => ({
        ...prev,
        listeningHistory: { ...prev.listeningHistory, status: 'done' },
      }));
    } else {
      setCategoryProgress((prev) => ({
        ...prev,
        listeningHistory: { current: 0, total: 0, status: 'skipped' },
      }));
    }

    // -------------------------------------------------------------
    // CATEGORY 4: SEARCH HISTORY
    // -------------------------------------------------------------
    if (selectedCategories.searchHistory && detection.searchHistory.length > 0) {
      const searchItems = detection.searchHistory;
      finalSearchStats.total = searchItems.length;

      setCategoryProgress((prev) => ({
        ...prev,
        searchHistory: { current: 0, total: searchItems.length, status: 'running' },
      }));

      try {
        const storedStr = localStorage.getItem('mymusic_search_history') || '[]';
        const existingQueries: string[] = JSON.parse(storedStr);
        const querySet = new Set(existingQueries.map((q) => q.toLowerCase().trim()));

        let added = 0;
        for (const s of searchItems) {
          const qNorm = s.query.toLowerCase().trim();
          if (qNorm && !querySet.has(qNorm)) {
            querySet.add(qNorm);
            existingQueries.push(s.query);
            added++;
          }
        }

        localStorage.setItem('mymusic_search_history', JSON.stringify(existingQueries.slice(0, 50)));
        finalSearchStats.imported = added;
      } catch (err) {
        console.warn('Failed to save search history:', err);
      }

      setCategoryProgress((prev) => ({
        ...prev,
        searchHistory: { ...prev.searchHistory, status: 'done' },
      }));
    } else {
      setCategoryProgress((prev) => ({
        ...prev,
        searchHistory: { current: 0, total: 0, status: 'skipped' },
      }));
    }

    setStats({
      likedSongs: finalLikedStats,
      playlists: finalPlaylistStats,
      listeningHistory: finalHistoryStats,
      searchHistory: finalSearchStats,
    });

    setWorkflowStep('complete');
  };

  const handleManualSearch = async (trackKey: string, customQuery?: string) => {
    const q = customQuery || searchQueries[trackKey];
    if (!q || !q.trim()) return;

    setIsSearchingTrack((prev) => ({ ...prev, [trackKey]: true }));
    try {
      const res = await apiService.search(q, 'songs');
      setSearchResults((prev) => ({ ...prev, [trackKey]: res.songs || [] }));
    } catch {
      setSearchResults((prev) => ({ ...prev, [trackKey]: [] }));
    } finally {
      setIsSearchingTrack((prev) => ({ ...prev, [trackKey]: false }));
    }
  };

  const handleLikeCandidate = async (trackKey: string, candidate: Track) => {
    await toggleLike(candidate);
    setMatchedTrackKeys((prev) => new Set(prev).add(trackKey));
    setStats((prev) => ({
      ...prev,
      likedSongs: {
        ...prev.likedSongs,
        matched: prev.likedSongs.matched + 1,
        unmatchedTracks: prev.likedSongs.unmatchedTracks.filter(
          (t) => `${t.title}::${t.artist}` !== trackKey
        ),
      },
    }));
  };

  return (
    <div
      id="spotify-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-900 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1DB954] text-black shadow-sm shrink-0">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.899 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.841c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.421-.18-.6.42-1.02 1.02-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                Spotify Data Migration
              </h3>
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Transfer your music collection from Spotify account data
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 p-4 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* STEP 1: IDLE / FILE SELECTION */}
          {workflowStep === 'idle' && (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Private & Secure • 100% Client-Side Processing</span>
              </div>

              {/* Step 1: Download Spotify Data */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FA233B]">
                    Step 1
                  </span>
                  <span className="text-[11px] text-zinc-400">Official Spotify Export</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Download your Spotify account data
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Get your data package from Spotify Privacy settings. No Premium or login required.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSpotifyData}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Spotify Data</span>
                  <ExternalLink className="h-3 w-3 opacity-60 ml-1" />
                </button>
              </div>

              {/* Step 2: Upload Spotify Export */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FA233B]">
                    Step 2
                  </span>
                  <span className="text-[11px] text-zinc-400">ZIP or JSON</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Upload your Spotify archive
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Upload your downloaded ZIP archive or standalone Spotify JSON file.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".zip,.json,application/zip,application/json"
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-[#FA233B] dark:border-zinc-700 dark:hover:border-[#FA233B] cursor-pointer bg-white/50 dark:bg-zinc-900/50"
                >
                  <Upload className="h-7 w-7 text-zinc-400 mb-2" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {isParsing ? 'Inspecting Spotify Export...' : 'Choose ZIP or JSON file'}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1">
                    Supports YourLibrary, Playlists, Streaming History & Search History
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: DETECTED CATEGORIES & SELECTION */}
          {workflowStep === 'detected' && detection && (
            <div className="space-y-6">
              {/* Detection Banner */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Spotify Data Detected ✓</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1">
                  File: <strong className="text-zinc-900 dark:text-white">{detection.sourceFileName}</strong>
                </p>
              </div>

              {/* Detected Items Summary Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {detection.detectedCategories.savedSongs && (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-[#FA233B] fill-current" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Saved Songs</span>
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {detection.savedSongs.length.toLocaleString()}
                    </span>
                  </div>
                )}

                {detection.detectedCategories.playlists && (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <ListMusic className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Playlists</span>
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {detection.playlists.length.toLocaleString()}
                    </span>
                  </div>
                )}

                {detection.detectedCategories.listeningHistory && (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Listening History</span>
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {detection.listeningHistory.length.toLocaleString()}
                    </span>
                  </div>
                )}

                {detection.detectedCategories.searchHistory && (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Search Records</span>
                    </div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {detection.searchHistory.length.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Category Selection Checkboxes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Choose what to migrate
                </h4>

                <div className="space-y-2">
                  {detection.detectedCategories.savedSongs && (
                    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3.5 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCategories.savedSongs}
                          onChange={(e) =>
                            setSelectedCategories((prev) => ({ ...prev, savedSongs: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-[#FA233B] focus:ring-[#FA233B]"
                        />
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                            ❤️ Liked Songs
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {detection.savedSongs.length.toLocaleString()} tracks to match and like
                          </span>
                        </div>
                      </div>
                    </label>
                  )}

                  {detection.detectedCategories.playlists && (
                    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3.5 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCategories.playlists}
                          onChange={(e) =>
                            setSelectedCategories((prev) => ({ ...prev, playlists: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-[#FA233B] focus:ring-[#FA233B]"
                        />
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                            🎵 Playlists
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {detection.playlists.length.toLocaleString()} playlists with original track order
                          </span>
                        </div>
                      </div>
                    </label>
                  )}

                  {detection.detectedCategories.listeningHistory && (
                    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3.5 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCategories.listeningHistory}
                          onChange={(e) =>
                            setSelectedCategories((prev) => ({ ...prev, listeningHistory: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-[#FA233B] focus:ring-[#FA233B]"
                        />
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                            📊 Listening History
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {detection.listeningHistory.length.toLocaleString()} streaming records
                          </span>
                        </div>
                      </div>
                    </label>
                  )}

                  {detection.detectedCategories.searchHistory && (
                    <div className="space-y-1">
                      <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3.5 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.searchHistory}
                            onChange={(e) =>
                              setSelectedCategories((prev) => ({ ...prev, searchHistory: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-zinc-300 text-[#FA233B] focus:ring-[#FA233B]"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                              🔎 Search History
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {detection.searchHistory.length.toLocaleString()} search queries
                            </span>
                          </div>
                        </div>
                      </label>

                      {selectedCategories.searchHistory && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <span>Note: Search history contains query terms from your Spotify account.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={startMigration}
                disabled={
                  !selectedCategories.savedSongs &&
                  !selectedCategories.playlists &&
                  !selectedCategories.listeningHistory &&
                  !selectedCategories.searchHistory
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FA233B] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#d91d32] transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Start Migration</span>
              </button>
            </div>
          )}

          {/* STEP 4: MIGRATING IN PROGRESS */}
          {workflowStep === 'migrating' && (
            <div className="space-y-6 py-4 text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FA233B]/10 text-[#FA233B]">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Importing Spotify Data...
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Matching titles and creating playlist collections locally
                </p>
              </div>

              {/* Progress Rows per category */}
              <div className="space-y-3 text-left">
                {selectedCategories.savedSongs && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-900 dark:text-white">
                      <span>❤️ Liked Songs</span>
                      <span>
                        {categoryProgress.likedSongs.current} / {categoryProgress.likedSongs.total}
                        {categoryProgress.likedSongs.status === 'done' && ' ✓'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full bg-[#FA233B] transition-all duration-300"
                        style={{
                          width: `${
                            categoryProgress.likedSongs.total > 0
                              ? Math.round(
                                  (categoryProgress.likedSongs.current / categoryProgress.likedSongs.total) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedCategories.playlists && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-900 dark:text-white">
                      <span>🎵 Playlists</span>
                      <span>
                        {categoryProgress.playlists.current} / {categoryProgress.playlists.total}
                        {categoryProgress.playlists.status === 'done' && ' ✓'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${
                            categoryProgress.playlists.total > 0
                              ? Math.round(
                                  (categoryProgress.playlists.current / categoryProgress.playlists.total) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedCategories.listeningHistory && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-zinc-900 dark:text-white">
                      <span>📊 Listening History</span>
                      <span>
                        {categoryProgress.listeningHistory.current} / {categoryProgress.listeningHistory.total}
                        {categoryProgress.listeningHistory.status === 'done' && ' ✓'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{
                          width: `${
                            categoryProgress.listeningHistory.total > 0
                              ? Math.round(
                                  (categoryProgress.listeningHistory.current / categoryProgress.listeningHistory.total) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: FINAL SUMMARY */}
          {workflowStep === 'complete' && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                  <CheckCircle2 className="h-9 w-9" />
                </div>

                <h4 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  Spotify Migration Complete ✓
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Your selected Spotify categories have been migrated to MyMusic.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-3">
                {selectedCategories.savedSongs && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2 dark:border-zinc-700/60">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-[#FA233B] fill-current" />
                        Liked Songs
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white">
                        {stats.likedSongs.total.toLocaleString()} total
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div>
                        <span className="block text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {stats.likedSongs.matched.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400">Matched</span>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-zinc-700 dark:text-zinc-300">
                          {stats.likedSongs.alreadyExisted.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400">Existed</span>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-amber-600 dark:text-amber-400">
                          {stats.likedSongs.unmatchedTracks.length.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400">Unmatched</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCategories.playlists && (
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2 dark:border-zinc-700/60">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <ListMusic className="h-3.5 w-3.5 text-emerald-500" />
                        Playlists
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white">
                        {stats.playlists.imported.toLocaleString()} imported
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div>
                        <span className="block text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {stats.playlists.created.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400">Created</span>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-zinc-700 dark:text-zinc-300">
                          {stats.playlists.alreadyExisted.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400">Updated/Existed</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCategories.listeningHistory && (
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500" />
                      Listening History
                    </span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {stats.listeningHistory.imported.toLocaleString()} records added
                    </span>
                  </div>
                )}

                {selectedCategories.searchHistory && (
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-amber-500" />
                      Search History
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {stats.searchHistory.imported.toLocaleString()} queries added
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {stats.likedSongs.unmatchedTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWorkflowStep('review_unmatched')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-black hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                    <span>Review Unmatched Songs ({stats.likedSongs.unmatchedTracks.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW UNMATCHED SONGS */}
          {workflowStep === 'review_unmatched' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Unmatched Spotify Songs ({stats.likedSongs.unmatchedTracks.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Search and match songs manually to add them to your library.
                  </p>
                </div>

                <button
                  onClick={() => setWorkflowStep('complete')}
                  className="text-xs font-bold text-[#FA233B] hover:underline"
                >
                  Back to Summary
                </button>
              </div>

              {stats.likedSongs.unmatchedTracks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All unmatched songs have been added to your library!
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                  {stats.likedSongs.unmatchedTracks.map((uTrack) => {
                    const trackKey = `${uTrack.title}::${uTrack.artist}`;
                    const isMatched = matchedTrackKeys.has(trackKey);
                    const q = searchQueries[trackKey] ?? `${uTrack.title} ${uTrack.artist}`;
                    const results = searchResults[trackKey];
                    const isSearching = isSearchingTrack[trackKey];

                    return (
                      <div
                        key={trackKey}
                        className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400">
                              <Disc className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                                {uTrack.title}
                              </h5>
                              <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                {uTrack.artist} {uTrack.album ? `• ${uTrack.album}` : ''}
                              </p>
                            </div>
                          </div>

                          {isMatched && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                              <Check className="h-3 w-3" />
                              Added
                            </span>
                          )}
                        </div>

                        {!isMatched && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={q}
                                onChange={(e) =>
                                  setSearchQueries((prev) => ({
                                    ...prev,
                                    [trackKey]: e.target.value,
                                  }))
                                }
                                placeholder="Search title or artist..."
                                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 focus:border-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleManualSearch(trackKey, q)}
                                disabled={isSearching}
                                className="rounded-xl bg-[#FA233B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d91d32] transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isSearching ? 'Searching...' : 'Search'}
                              </button>
                            </div>

                            {results && results.length > 0 && (
                              <div className="divide-y divide-zinc-200/60 rounded-xl border border-zinc-200/80 bg-white p-1.5 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 space-y-1">
                                {results.slice(0, 3).map((resTrack) => (
                                  <div
                                    key={resTrack.videoId}
                                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <img
                                        src={resTrack.artworkUrl}
                                        alt={resTrack.title}
                                        className="h-8 w-8 rounded-lg object-cover"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] font-bold text-zinc-900 dark:text-white">
                                          {resTrack.title}
                                        </p>
                                        <p className="truncate text-[10px] text-zinc-400">
                                          {resTrack.artist}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleLikeCandidate(trackKey, resTrack)}
                                      className="flex items-center gap-1 rounded-full bg-[#FA233B] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#d91d32] cursor-pointer"
                                    >
                                      <Heart className="h-3 w-3 fill-current" />
                                      <span>Add</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
