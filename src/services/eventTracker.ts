import { ListeningEvent, ListeningEventType, Track } from '../types/music';
import { supabaseService } from './supabase';
import { apiService } from './api';
import { getProviderTrackId } from '../utils/trackHelper';

class EventTracker {
  private currentUserId: string = 'guest';
  private currentVideoId: string = '';
  private reportedQuartiles: Set<string> = new Set();

  setUserId(userId: string) {
    this.currentUserId = userId;
  }

  trackPlaybackStart(track: Track) {
    this.currentVideoId = track.videoId;
    this.reportedQuartiles.clear();

    const event: ListeningEvent = {
      userId: this.currentUserId,
      eventType: 'play_started',
      videoId: track.videoId,
      providerTrackId: getProviderTrackId(track),
      title: track.title,
      artist: track.artist,
      artistId: track.artistId,
      albumId: track.albumId,
      durationSeconds: track.duration,
      timestamp: new Date().toISOString(),
    };

    this.dispatch(event);
  }

  trackPlaybackProgress(currentTime: number, duration: number, track: Track) {
    if (!duration || duration <= 0 || !track || track.videoId !== this.currentVideoId) return;

    const percent = (currentTime / duration) * 100;

    if (percent >= 25 && !this.reportedQuartiles.has('25')) {
      this.reportedQuartiles.add('25');
      this.dispatch({
        userId: this.currentUserId,
        eventType: 'play_25_percent',
        videoId: track.videoId,
        providerTrackId: getProviderTrackId(track),
        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),
        timestamp: new Date().toISOString(),
      });
    }

    if (percent >= 50 && !this.reportedQuartiles.has('50')) {
      this.reportedQuartiles.add('50');
      this.dispatch({
        userId: this.currentUserId,
        eventType: 'play_50_percent',
        videoId: track.videoId,
        providerTrackId: getProviderTrackId(track),
        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),
        timestamp: new Date().toISOString(),
      });
    }

    if (percent >= 75 && !this.reportedQuartiles.has('75')) {
      this.reportedQuartiles.add('75');
      this.dispatch({
        userId: this.currentUserId,
        eventType: 'play_75_percent',
        videoId: track.videoId,
        providerTrackId: getProviderTrackId(track),
        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),
        timestamp: new Date().toISOString(),
      });
    }

    if (percent >= 98 && !this.reportedQuartiles.has('100')) {
      this.reportedQuartiles.add('100');
      this.dispatch({
        userId: this.currentUserId,
        eventType: 'play_completed',
        videoId: track.videoId,
        providerTrackId: getProviderTrackId(track),
        progressSeconds: Math.floor(duration),
        durationSeconds: Math.floor(duration),
        timestamp: new Date().toISOString(),
      });
    }
  }

  trackSkip(track: Track, currentTime: number, duration: number) {
    // Only count as skip if track was not almost completed
    if (duration > 0 && currentTime < duration * 0.8) {
      this.dispatch({
        userId: this.currentUserId,
        eventType: 'skipped',
        videoId: track.videoId,
        providerTrackId: getProviderTrackId(track),
        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),
        timestamp: new Date().toISOString(),
      });
    }
  }

  trackReplay(track: Track) {
    this.dispatch({
      userId: this.currentUserId,
      eventType: 'replayed',
      videoId: track.videoId,
      providerTrackId: getProviderTrackId(track),
      timestamp: new Date().toISOString(),
    });
  }

  trackLike(track: Track, isLiked: boolean) {
    this.dispatch({
      userId: this.currentUserId,
      eventType: isLiked ? 'liked' : 'unliked',
      videoId: track.videoId,
      providerTrackId: getProviderTrackId(track),
      title: track.title,
      artist: track.artist,
      timestamp: new Date().toISOString(),
    });
  }

  trackOpenArtist(artistId: string, artistName: string) {
    this.dispatch({
      userId: this.currentUserId,
      eventType: 'opened_artist',
      videoId: '',
      providerTrackId: '',
      artistId: artistId,
      artist: artistName,
      timestamp: new Date().toISOString(),
    });
  }

  trackOpenAlbum(albumId: string, albumTitle: string) {
    this.dispatch({
      userId: this.currentUserId,
      eventType: 'opened_album',
      videoId: '',
      providerTrackId: '',
      albumId: albumId,
      title: albumTitle,
      timestamp: new Date().toISOString(),
    });
  }

  trackAddToQueue(track: Track) {
    this.dispatch({
      userId: this.currentUserId,
      eventType: 'added_to_queue',
      videoId: track.videoId,
      providerTrackId: getProviderTrackId(track),
      timestamp: new Date().toISOString(),
    });
  }

  private dispatch(event: ListeningEvent) {
    // Record to Supabase
    supabaseService.recordEvent(event).catch(() => {});
    // Dispatch to Backend API
    apiService.sendListeningEvent(event).catch(() => {});
  }
}

export const eventTracker = new EventTracker();
