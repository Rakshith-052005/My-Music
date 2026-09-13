import { Track } from '../types/music';
import { apiService } from './api';
import { cleanTrackTitle } from '../utils/trackHelper';

export interface SpotifyTrackMeta {
  id: string;
  title: string;
  artist: string;
  artistsList: string[];
  album: string;
  artworkUrl: string;
  durationMs: number;
  spotifyUrl?: string;
  releaseDate?: string;
}

export interface SpotifyImportStats {
  total: number;
  processed: number;
  matched: number;
  alreadyExisted: number;
  unmatchedTracks: SpotifyTrackMeta[];
}

export function getSpotifyClientId(): string {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '2bebd06c23ea41a3814f2a33613a6d88';
}

export function getSpotifyRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('ai.studio')) {
    return 'https://mymusic-in.ai.studio/callback';
  }
  return typeof window !== 'undefined' ? `${window.location.origin}/callback` : 'https://mymusic-in.ai.studio/callback';
}

function generateCodeVerifier(length = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values).map((x) => possible[x % possible.length]).join('');
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateState(length = 16): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values).map((x) => possible[x % possible.length]).join('');
}

export async function initiateSpotifyConnect(): Promise<void> {
  const clientId = getSpotifyClientId();
  const redirectUri = getSpotifyRedirectUri();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  sessionStorage.setItem('spotify_pkce_verifier', codeVerifier);
  sessionStorage.setItem('spotify_auth_state', state);

  const scope = 'user-library-read';
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  window.location.href = authUrl.toString();
}

export async function handleSpotifyCallback(code: string, state: string): Promise<string> {
  const storedState = sessionStorage.getItem('spotify_auth_state');
  const codeVerifier = sessionStorage.getItem('spotify_pkce_verifier');

  if (state && storedState && state !== storedState) {
    throw new Error('State validation failed. CSRF check mismatched.');
  }

  if (!codeVerifier) {
    throw new Error('Code verifier missing. Please try connecting to Spotify again.');
  }

  const clientId = getSpotifyClientId();
  const redirectUri = getSpotifyRedirectUri();

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', clientId);
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('code_verifier', codeVerifier);

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || 'Failed to exchange authorization code with Spotify');
  }

  const data = await res.json();
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  const tokenData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };

  sessionStorage.setItem('spotify_token_data', JSON.stringify(tokenData));
  sessionStorage.removeItem('spotify_pkce_verifier');
  sessionStorage.removeItem('spotify_auth_state');

  return data.access_token;
}

export async function getSpotifyAccessToken(): Promise<string | null> {
  const raw = sessionStorage.getItem('spotify_token_data');
  if (!raw) return null;
  try {
    const tokenData = JSON.parse(raw);
    if (tokenData.expiresAt && Date.now() < tokenData.expiresAt - 60000) {
      return tokenData.accessToken;
    }
    if (tokenData.refreshToken) {
      const clientId = getSpotifyClientId();
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      params.append('refresh_token', tokenData.refreshToken);

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (res.ok) {
        const refreshed = await res.json();
        const newExpiresAt = Date.now() + (refreshed.expires_in || 3600) * 1000;
        const updated = {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || tokenData.refreshToken,
          expiresAt: newExpiresAt,
        };
        sessionStorage.setItem('spotify_token_data', JSON.stringify(updated));
        return refreshed.access_token;
      }
    }
  } catch {
    // Token parse failed
  }
  return null;
}

export function isSpotifyConnected(): boolean {
  const raw = sessionStorage.getItem('spotify_token_data');
  if (!raw) return false;
  try {
    const tokenData = JSON.parse(raw);
    return Boolean(tokenData.accessToken || tokenData.refreshToken);
  } catch {
    return false;
  }
}

export function disconnectSpotify(): void {
  sessionStorage.removeItem('spotify_token_data');
  sessionStorage.removeItem('spotify_pkce_verifier');
  sessionStorage.removeItem('spotify_auth_state');
}

export async function fetchAllSpotifyLikedTracks(
  onProgress?: (fetchedCount: number, totalCount: number) => void
): Promise<SpotifyTrackMeta[]> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    throw new Error('Spotify session expired or not connected. Please connect Spotify again.');
  }

  const allTracks: SpotifyTrackMeta[] = [];
  let offset = 0;
  const limit = 50;
  let total = 0;

  while (true) {
    const url = `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      continue;
    }

    if (!res.ok) {
      if (res.status === 401) {
        disconnectSpotify();
        throw new Error('Spotify token expired. Please connect Spotify again.');
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Spotify API Error (${res.status})`);
    }

    const data = await res.json();
    total = data.total || 0;
    const items = data.items || [];

    for (const item of items) {
      if (!item.track) continue;
      const track = item.track;
      const primaryArtwork = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '';
      const artistsList = (track.artists || []).map((a: any) => a.name);
      allTracks.push({
        id: track.id,
        title: track.name || 'Unknown Track',
        artist: artistsList.join(', ') || 'Unknown Artist',
        artistsList: artistsList,
        album: track.album?.name || '',
        artworkUrl: primaryArtwork,
        durationMs: track.duration_ms || 0,
        spotifyUrl: track.external_urls?.spotify || '',
        releaseDate: track.album?.release_date || '',
      });
    }

    if (onProgress) {
      onProgress(allTracks.length, total);
    }

    if (!data.next || allTracks.length >= total || items.length === 0) {
      break;
    }

    offset += limit;
  }

  return allTracks;
}

export function isSongMatch(spotifyTrack: SpotifyTrackMeta, candidateTrack: Track): boolean {
  const cleanSpotifyTitle = cleanTrackTitle(spotifyTrack.title).toLowerCase().trim();
  const cleanCandidateTitle = cleanTrackTitle(candidateTrack.title).toLowerCase().trim();

  const titleMatches =
    cleanSpotifyTitle === cleanCandidateTitle ||
    cleanSpotifyTitle.includes(cleanCandidateTitle) ||
    cleanCandidateTitle.includes(cleanSpotifyTitle);

  if (!titleMatches) return false;

  const spotifyArtistPrimary = (spotifyTrack.artistsList[0] || spotifyTrack.artist).toLowerCase().trim();
  const candidateArtist = candidateTrack.artist.toLowerCase().trim();

  const artistMatches =
    candidateArtist.includes(spotifyArtistPrimary) ||
    spotifyArtistPrimary.includes(candidateArtist) ||
    spotifyTrack.artistsList.some((a) => candidateArtist.includes(a.toLowerCase()));

  return artistMatches;
}
