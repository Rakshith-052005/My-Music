import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { createServer as createViteServer } from 'vite';
import { analyzeTrackBlueprint } from './server/geminiBlueprint';

const app = express();
const PORT = 3000;
const RENDER_BACKEND = process.env.RENDER_API_URL || 'https://mymusic-api-siuh.onrender.com';

// Dynamic CORS Origin Allowlist Configuration
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/mymusic-nine-nu\.vercel\.app$/,
  /^https:\/\/mymusic-[a-z0-9-]+-devadigarakshith30-1433s-projects\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.run\.app$/,
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Allow non-browser requests (e.g. curl, server-to-server)
  const cleanOrigin = origin.trim().toLowerCase();
  
  if (
    cleanOrigin.endsWith('.vercel.app') ||
    cleanOrigin.includes('localhost') ||
    cleanOrigin.includes('127.0.0.1') ||
    cleanOrigin.endsWith('.run.app')
  ) {
    return true;
  }
  
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(cleanOrigin));
}

// Custom CORS middleware for dynamic origin headers and OPTIONS preflight handling
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
);

app.use(express.json());

// Cross-device Account Data Persistence Store
const USER_STORE_PATH = path.join(process.cwd(), 'data_user_store.json');
let userStore: Record<string, any> = {};

try {
  if (fs.existsSync(USER_STORE_PATH)) {
    const raw = fs.readFileSync(USER_STORE_PATH, 'utf-8');
    userStore = JSON.parse(raw);
  }
} catch (e) {
  userStore = {};
}

function saveUserStoreToDisk() {
  try {
    fs.writeFileSync(USER_STORE_PATH, JSON.stringify(userStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save user store to disk:', err);
  }
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

// Helper for proxying GET requests to Render backend with timeout
function fetchRenderJson(endpoint: string, timeoutMs: number = 9000): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${RENDER_BACKEND}${endpoint}`;
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'MyMusic-Web/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Failed to parse response from Render: ${data.slice(0, 100)}`));
          }
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Render request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => reject(err));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MyMusic API is running',
    timestamp: new Date().toISOString(),
  });
});

// User Account GET Sync endpoint
app.get('/api/user/get', (req, res) => {
  const email = normalizeEmail(req.query.email as string);
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email parameter required' });
  }

  const userData = userStore[email] || null;
  res.json({ success: true, data: userData });
});

// User Account POST Sync endpoint
app.post('/api/user/sync', (req, res) => {
  const { email, profile, likes, history, favoriteArtists, playlists } = req.body || {};
  const cleanEmail = normalizeEmail(email || profile?.email);

  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Valid email required for sync' });
  }

  const existing = userStore[cleanEmail] || {
    profile: null,
    likes: [],
    history: [],
    favoriteArtists: [],
    playlists: [],
  };

  const updated = {
    profile: profile ? { ...existing.profile, ...profile } : existing.profile,
    likes: Array.isArray(likes) ? likes : existing.likes,
    history: Array.isArray(history) ? history : existing.history,
    favoriteArtists: Array.isArray(favoriteArtists) ? favoriteArtists : existing.favoriteArtists,
    playlists: Array.isArray(playlists) ? playlists : existing.playlists,
    lastUpdated: new Date().toISOString(),
  };

  userStore[cleanEmail] = updated;
  saveUserStoreToDisk();

  res.json({ success: true, data: updated });
});

// User Account Authentication endpoint
app.post('/api/user/auth', (req, res) => {
  const { email, password, name, avatarUrl } = req.body || {};
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  let record = userStore[cleanEmail];
  if (!record) {
    const defaultName = name || cleanEmail.split('@')[0];
    record = {
      profile: {
        id: 'usr_' + Math.random().toString(36).substring(2, 10),
        email: cleanEmail,
        name: defaultName,
        avatarUrl: avatarUrl || '',
        createdAt: new Date().toISOString(),
        isGuest: false,
      },
      likes: [],
      history: [],
      favoriteArtists: [],
      playlists: [],
      lastUpdated: new Date().toISOString(),
    };
    userStore[cleanEmail] = record;
    saveUserStoreToDisk();
  } else if (name || avatarUrl) {
    record.profile = {
      ...record.profile,
      name: name || record.profile?.name,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : record.profile?.avatarUrl,
    };
    saveUserStoreToDisk();
  }

  res.json({ success: true, data: record });
});

// Home feed with resilient YouTube Music browse fallback
app.get('/api/music/home', async (req, res) => {
  try {
    // 1. Try Render backend first with short timeout
    try {
      const data = await fetchRenderJson('/api/music/home', 4000);
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        return res.json(data);
      }
    } catch {
      // Fallback to direct YouTube Music home browse
    }

    // 2. Direct YouTube Music browse fallback
    const directShelves = await fetchYtMusicBrowseHome();
    if (directShelves && directShelves.length > 0) {
      return res.json({ success: true, data: directShelves });
    }

    res.json({ success: true, data: [] });
  } catch (err: any) {
    console.error('Error fetching home feed:', err.message);
    res.json({ success: true, data: [] });
  }
});

// Helper to parse YouTube Music subtitle runs into clean artist and album names
function parseYtMusicRuns(runs: any[], fallbackArtist: string = 'Artist'): { artist: string; album?: string; artistId?: string } {
  if (!Array.isArray(runs) || runs.length === 0) {
    return { artist: fallbackArtist };
  }

  // Filter out bullets and trivial separators
  const meaningful = runs.filter((r) => {
    const text = (r?.text || '').trim();
    return text && text !== '•' && text !== '|' && text !== '-' && text !== '·';
  });

  if (meaningful.length === 0) {
    return { artist: fallbackArtist };
  }

  const TYPE_MARKERS = new Set([
    'song',
    'songs',
    'video',
    'videos',
    'music video',
    'official video',
    'official audio',
    'single',
    'ep',
    'album',
    'podcast',
    'episode',
    'audio',
  ]);

  let artistIdx = 0;
  if (meaningful[0] && TYPE_MARKERS.has(meaningful[0].text.toLowerCase().trim())) {
    artistIdx = 1;
  }

  const artistRun = meaningful[artistIdx];
  let artist = artistRun?.text?.trim() || fallbackArtist;
  let artistId: string | undefined = undefined;
  const browseId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId;
  if (browseId && browseId.startsWith('UC')) {
    artistId = browseId;
  }

  let album: string | undefined = undefined;

  const nextIdx = artistIdx + 1;
  if (meaningful[nextIdx]) {
    const candidate = meaningful[nextIdx].text?.trim() || '';
    // Filter out duration (3:45), view counts (10M views), years (2023)
    if (
      candidate &&
      !/^\d+:\d+$/.test(candidate) &&
      !/\b(views|plays|subscribers|watching|listen)\b/i.test(candidate) &&
      !/^\d{4}$/.test(candidate) &&
      !TYPE_MARKERS.has(candidate.toLowerCase())
    ) {
      album = candidate;
    }
  }

  return { artist, album, artistId };
}

// Preset artist channel IDs for instant zero-latency profile resolution
const PRESET_ARTIST_CHANNELS: Record<string, string> = {
  'the weeknd': 'UClYV6hHlupm_S_ObS1W-DYw',
  'drake': 'UCU6cE7pdJPc6DU2jSrKEsdQ',
  'taylor swift': 'UCPC0L1d253x-KuMNwa05TpA',
  'shakira': 'UC1A-9pS73Gsp8qRByoR_2bA',
  'pitbull': 'UCp_6yS2k_-5r_R1_X2kS0_w',
  '50 cent': 'UCa1c-Zz9-3k3s5X9',
  '50cent': 'UCa1c-Zz9-3k3s5X9',
  'snoop dogg': 'UCG4G0Zf_W1_nS1W4A-s9',
  'dr. dre': 'UCZ-X1_J5a-X7N5rK5g2LzK0_w',
  'dr dre': 'UCZ-X1_J5a-X7N5rK5g2LzK0_w',
  'don toliver': 'UCSzWQmDsKG37iKN2vw1G-2Q',
  'travis scott': 'UCf_gP4AMRSgAfyzbkeS9k4g',
  'billie eilish': 'UCERrDZ8oN0U_n9MphMKERcg',
  'kendrick lamar': 'UCprAFmT0C6O4X0ToEXpeFTQ',
  'post malone': 'UCyD3XWRK9ko-izf2nBSFitw',
  'dua lipa': 'UCzVb0SIXp9q9PeKCcFjsBtA',
  'coldplay': 'UCIaFw5VBEK8qaW6nRpx_qnw',
  'bruno mars': 'UCZn4r7heNOPY-C43YIywnVA',
  'ariana grande': 'UC0076UMUgEng8HORUw_MYHA',
  'eminem': 'UCedvOgsKFzcK3hA5taf3KoQ',
  'kanye west': 'UCRY5dYsbIN5TylSbd7gVnZg',
  'adele': 'UCRw0x9_EfawqmgDI2IgQLLg',
  'justin bieber': 'UCGvj8kfUV5Q6lzECIrGY19g',
  'ed sheeran': 'UClmXPfaYhXOYsNn_QUyheWQ',
  'rihanna': 'UCvWtix2TtWGe9kffqnwdaMw',
  'olivia rodrigo': 'UCE5XNpliPM-SmyFEp61tL_g',
  'bad bunny': 'UCiY3z8HAGD6BlSNKVn2kSvQ',
};

// Fetch artist profile directly from YouTube Music InnerTube browse API
async function fetchYtMusicArtist(browseId: string): Promise<any | null> {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        browseId,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const header = data.header?.musicImmersiveHeaderRenderer || data.header?.musicVisualHeaderRenderer || data.header?.musicHeaderRenderer;
    const name = header?.title?.runs?.[0]?.text || 'Artist';
    const description = header?.description?.runs?.map((r: any) => r.text).join('') || '';
    const thumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const artworkUrl = thumbs[thumbs.length - 1]?.url || '';
    const subscribers = header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text || '';

    const songs: any[] = [];
    const videos: any[] = [];
    const albums: any[] = [];
    const singles: any[] = [];

    const sections = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const sec of sections) {
      const shelf = sec.musicShelfRenderer;
      const carousel = sec.musicCarouselShelfRenderer;

      if (shelf) {
        for (const item of shelf.contents || []) {
          const r = item.musicResponsiveListItemRenderer;
          if (!r) continue;
          const trackTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          const runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const { artist: trackArtist, album: trackAlbum } = parseYtMusicRuns(runs, name);
          const duration = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
          const playNav = r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
          const videoId = playNav?.watchEndpoint?.videoId;
          const thumbList = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const art = thumbList[thumbList.length - 1]?.url || artworkUrl;

          if (trackTitle && videoId) {
            songs.push({
              videoId,
              title: trackTitle,
              artist: trackArtist,
              album: trackAlbum,
              duration: duration || '3:30',
              artworkUrl: art,
              provider: 'youtube_music',
              isPlayable: true,
            });
          }
        }
      }

      if (carousel) {
        const cTitle = (carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || '').toLowerCase();
        const isAlbum = cTitle.includes('album');
        const isSingle = cTitle.includes('single') || cTitle.includes('ep');
        const isVideo = cTitle.includes('video') || cTitle.includes('performance');

        for (const item of carousel.contents || []) {
          const r = item.musicTwoRowItemRenderer;
          if (!r) continue;
          const itemTitle = r.title?.runs?.[0]?.text;
          const browseNav = r.navigationEndpoint?.browseEndpoint?.browseId;
          const playNav = r.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
          const videoId = playNav?.watchEndpoint?.videoId || r.navigationEndpoint?.watchEndpoint?.videoId;
          const thumbList = r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const art = thumbList[thumbList.length - 1]?.url || '';
          const subtitleRuns = r.subtitle?.runs || [];
          const yearMatch = subtitleRuns.map((s: any) => s.text).join(' ').match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? yearMatch[1] : '';

          if (isAlbum && browseNav) {
            albums.push({
              id: browseNav,
              albumId: browseNav,
              title: itemTitle || 'Album',
              artist: name,
              artistId: browseId,
              year,
              artworkUrl: art,
              provider: 'youtube_music',
            });
          } else if (isSingle && browseNav) {
            singles.push({
              id: browseNav,
              albumId: browseNav,
              title: itemTitle || 'Single',
              artist: name,
              artistId: browseId,
              year,
              artworkUrl: art,
              trackCount: 1,
              provider: 'youtube_music',
            });
          } else if (isVideo && (videoId || browseNav)) {
            videos.push({
              videoId: videoId || '',
              title: itemTitle || 'Video',
              artist: name,
              artworkUrl: art,
              provider: 'youtube_music',
            });
          }
        }
      }
    }

    if (songs.length > 0 || albums.length > 0) {
      return {
        id: browseId,
        artistId: browseId,
        name,
        description,
        artworkUrl,
        subscribers,
        songs,
        videos,
        albums,
        singles,
        provider: 'youtube_music',
      };
    }
  } catch (err: any) {
    console.warn(`Direct YouTube Music artist browse failed for ${browseId}:`, err.message);
  }
  return null;
}

// Direct YouTube Music Browse Home
async function fetchYtMusicBrowseHome(): Promise<any[]> {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' } },
        browseId: 'FEmusic_home',
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const tabs = data.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const shelves: any[] = [];
    for (const sec of sections) {
      const carousel = sec.musicCarouselShelfRenderer;
      if (!carousel) continue;

      const title =
        carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ||
        carousel.header?.musicCarouselShelfBasicHeaderRenderer?.strapline?.runs?.[0]?.text ||
        'Featured';
      const subtitle = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.strapline?.runs?.[0]?.text || '';

      const contents: any[] = [];
      for (const item of carousel.contents || []) {
        const r = item.musicTwoRowItemRenderer || item.musicResponsiveListItemRenderer;
        if (!r) continue;

        const itemTitle =
          r.title?.runs?.[0]?.text ||
          r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const playNav =
          r.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
          r.navigationEndpoint;
        const videoId = playNav?.watchEndpoint?.videoId;
        const browseNav = r.navigationEndpoint?.browseEndpoint?.browseId;
        const thumbs =
          r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          [];
        const artworkUrl = thumbs[thumbs.length - 1]?.url || '';

        const subtitleRuns =
          r.subtitle?.runs ||
          r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ||
          [];
        const { artist, album } = parseYtMusicRuns(subtitleRuns, 'Various Artists');

        if (videoId && itemTitle) {
          contents.push({
            videoId,
            title: itemTitle,
            artist: artist || 'Various Artists',
            album,
            artworkUrl,
            provider: 'youtube_music',
            isPlayable: true,
          });
        } else if (browseNav?.startsWith('UC') && itemTitle) {
          contents.push({
            type: 'artist',
            artistId: browseNav,
            name: itemTitle,
            artworkUrl,
            provider: 'youtube_music',
          });
        } else if (browseNav && itemTitle) {
          contents.push({
            type: browseNav.startsWith('VL') || browseNav.startsWith('PL') || browseNav.startsWith('RD') ? 'playlist' : 'album',
            id: browseNav,
            albumId: browseNav,
            playlistId: browseNav,
            title: itemTitle,
            artist,
            artworkUrl,
            provider: 'youtube_music',
          });
        }
      }

      if (contents.length > 0) {
        shelves.push({
          title,
          subtitle,
          type: 'shelf',
          contents,
        });
      }
    }

    return shelves;
  } catch (err: any) {
    console.warn('Direct YT Music home fetch failed:', err.message);
    return [];
  }
}

// InnerTube search filter params mapping
const SEARCH_PARAMS_MAP: Record<string, string> = {
  songs: 'Eg-KAQwIABAAGAEgASgB',
  videos: 'Eg-KAQwIAhABGAEgASgB',
  albums: 'Eg-KAQwIAxABGAEgASgB',
  artists: 'Eg-KAQwIBBABGAEgASgB',
  playlists: 'Eg-KAQwIBhABGAEgASgB',
};

// Direct YouTube Music Search
async function fetchYtMusicSearch(query: string, type: string = 'all'): Promise<any[]> {
  try {
    const filterParam = type && type !== 'all' ? SEARCH_PARAMS_MAP[type] : undefined;

    const res = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' } },
        query,
        ...(filterParam ? { params: filterParam } : {}),
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
    const sectionList = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const results: any[] = [];
    const seenIds = new Set<string>();

    for (const sec of sectionList) {
      const card = sec.musicCardShelfRenderer;
      const shelf = sec.musicShelfRenderer;
      const itemSec = sec.itemSectionRenderer;

      const items = [
        ...(card ? [card] : []),
        ...(shelf?.contents || []),
        ...(itemSec?.contents || []),
      ];

      for (const item of items) {
        if (item.musicCardShelfRenderer) {
          const c = item.musicCardShelfRenderer;
          const cardTitle = c.title?.runs?.[0]?.text;
          const browseId = c.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
          const videoId = c.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
          const thumbList = c.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const art = thumbList[thumbList.length - 1]?.url || '';

          if (browseId?.startsWith('UC') && !seenIds.has(browseId)) {
            seenIds.add(browseId);
            results.push({
              type: 'artist',
              artistId: browseId,
              name: cardTitle,
              artworkUrl: art,
              provider: 'youtube_music',
            });
          } else if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            results.push({
              videoId,
              title: cardTitle || 'Song',
              artist: c.subtitle?.runs?.[0]?.text || 'Artist',
              duration: '3:30',
              artworkUrl: art,
              provider: 'youtube_music',
              isPlayable: true,
            });
          }
          continue;
        }

        const r = item.musicResponsiveListItemRenderer || item.musicTwoRowItemRenderer;
        if (!r) continue;

        const trackTitle =
          r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ||
          r.title?.runs?.[0]?.text;
        const runs =
          r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ||
          r.subtitle?.runs ||
          [];
        const { artist, album, artistId: extractedArtistId } = parseYtMusicRuns(runs, 'Artist');
        const duration = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
        const playNav =
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
          r.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint ||
          r.navigationEndpoint;
        const videoId = playNav?.watchEndpoint?.videoId;
        const thumbList =
          r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          [];
        const art = thumbList[thumbList.length - 1]?.url || '';

        const nav = r.navigationEndpoint?.browseEndpoint?.browseId;
        const pageType = r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextConfig?.pageType;
        const isExplicitArtistItem = pageType === 'MUSIC_PAGE_TYPE_ARTIST' || (!videoId && nav?.startsWith('UC'));

        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          results.push({
            videoId,
            title: trackTitle,
            artist,
            artistId: extractedArtistId,
            album,
            duration: duration || '3:30',
            artworkUrl: art,
            provider: 'youtube_music',
            isPlayable: true,
          });
        } else if (isExplicitArtistItem && nav?.startsWith('UC') && !seenIds.has(nav)) {
          seenIds.add(nav);
          results.push({
            type: 'artist',
            artistId: nav,
            name: trackTitle || artist,
            artworkUrl: art,
            provider: 'youtube_music',
          });
        } else if ((nav?.startsWith('MPREb') || nav?.startsWith('OLAK5h') || nav?.startsWith('VLPL') || nav?.startsWith('PL')) && !seenIds.has(nav)) {
          seenIds.add(nav);
          results.push({
            type: nav.startsWith('PL') || nav.startsWith('VL') ? 'playlist' : 'album',
            id: nav,
            albumId: nav,
            playlistId: nav,
            title: trackTitle,
            artist,
            artworkUrl: art,
            provider: 'youtube_music',
          });
        }
      }
    }

    return results;
  } catch (err: any) {
    console.warn('Direct search parse error:', err.message);
    return [];
  }
}

// Direct YouTube Music Radio / Up Next Fetcher
async function fetchYtMusicRadio(videoId: string): Promise<any[]> {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' } },
        videoId,
        isAudioOnly: true,
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const contents =
      data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents ||
      [];

    const tracks: any[] = [];
    const seenIds = new Set<string>();

    for (const item of contents) {
      const r = item.playlistPanelVideoRenderer;
      if (!r || !r.videoId) continue;
      if (seenIds.has(r.videoId)) continue;
      seenIds.add(r.videoId);

      const title = r.title?.runs?.[0]?.text || 'Track';
      const artistRuns = r.longBylineText?.runs || r.shortBylineText?.runs || [];
      const artist = artistRuns.map((a: any) => a.text).join('') || 'Artist';
      const duration = r.lengthText?.runs?.[0]?.text || '3:30';
      const thumbs = r.thumbnail?.thumbnails || [];
      const artworkUrl = thumbs[thumbs.length - 1]?.url || '';

      const lowerTitle = title.toLowerCase();
      const lowerArtist = artist.toLowerCase();

      // Skip compilations, playlist videos, and top 10 lists from radio queue
      const isCompilation = [
        'top 10', 'top 20', 'top 50', 'best songs', 'best of', 'hits mix', 'playlist',
        'compilation', 'full album', 'full mixtape', '1 hour', '2 hour', '3 hour',
        'hype mix', 'rnb mix', 'hip hop mix', 'hiphop mix', 'rap mix'
      ].some(k => lowerTitle.includes(k)) || [
        'rising charts', 'revive music', 'top songs daily', 'best hiphop music', 'uptwn chris'
      ].some(c => lowerArtist.includes(c));

      if (isCompilation) continue;

      tracks.push({
        videoId: r.videoId,
        title,
        artist,
        duration,
        artworkUrl,
        provider: 'youtube_music',
        isPlayable: true,
      });
    }
    return tracks;
  } catch (err: any) {
    console.warn(`Direct YouTube Music radio failed for ${videoId}:`, err.message);
    return [];
  }
}

// Radio / Up Next endpoint
app.get('/api/music/radio', async (req, res) => {
  try {
    const videoId = (req.query.videoId as string || '').trim();
    if (!videoId) {
      return res.json({ success: true, data: [] });
    }
    const tracks = await fetchYtMusicRadio(videoId);
    res.json({ success: true, data: tracks });
  } catch (err: any) {
    console.error('Error fetching radio from YT Music:', err.message);
    res.json({ success: true, data: [] });
  }
});

// Search endpoint (instant Direct YouTube Music with Render fallback)
app.get('/api/music/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    const type = (req.query.type as string || 'all').trim();
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // 1. Direct YT Music search first (sub-200ms, most up-to-date and reliable)
    let directResults: any[] = [];
    try {
      directResults = await fetchYtMusicSearch(q, type);
    } catch (e: any) {
      console.warn('Direct YT Music search error:', e.message);
    }

    if (directResults && directResults.length > 0) {
      return res.json({ success: true, data: directResults });
    }

    // 2. Render backend fallback
    try {
      const data = await fetchRenderJson(`/api/music/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`, 3500);
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return res.json(data);
      }
    } catch {
      // Fallback
    }

    res.json({ success: true, data: directResults || [] });
  } catch (err: any) {
    console.error('Error searching:', err.message);
    res.json({ success: true, data: [] });
  }
});

// Artists (support both /artists/:id and /artist/:id)
const handleArtist = async (req: express.Request, res: express.Response) => {
  try {
    const rawId = req.params.id;
    const nameQuery = (req.query.name as string || '').trim();
    let targetBrowseId = decodeURIComponent(rawId).trim();

    // Check preset map first if nameQuery or targetBrowseId matches a known artist name
    if (nameQuery && PRESET_ARTIST_CHANNELS[nameQuery.toLowerCase()]) {
      targetBrowseId = PRESET_ARTIST_CHANNELS[nameQuery.toLowerCase()];
    } else if (PRESET_ARTIST_CHANNELS[targetBrowseId.toLowerCase()]) {
      targetBrowseId = PRESET_ARTIST_CHANNELS[targetBrowseId.toLowerCase()];
    }

    // 1. If it's a channel browse ID (starts with UC) or known ID, fetch directly
    if (targetBrowseId.startsWith('UC')) {
      const directArtist = await fetchYtMusicArtist(targetBrowseId);
      if (directArtist) {
        const directName = (directArtist.name || '').toLowerCase();
        const queryName = nameQuery.toLowerCase();
        const isNameMismatch =
          queryName &&
          queryName !== 'artist' &&
          !directName.includes(queryName) &&
          !queryName.includes(directName);

        if (!isNameMismatch) {
          return res.json({ success: true, data: directArtist });
        }
      }
    }

    // If channel mismatch or not starting with UC, resolve via search query
    const searchQuery = nameQuery || targetBrowseId;

    // 2. Try Render backend
    try {
      const renderData = await fetchRenderJson(`/api/music/artists/${encodeURIComponent(searchQuery)}`, 6000);
      if (renderData?.data && renderData.data.name && ((renderData.data.songs && renderData.data.songs.length > 0) || (renderData.data.albums && renderData.data.albums.length > 0))) {
        return res.json(renderData);
      }
    } catch {
      // Fallback to search resolution
    }

    // 3. Resolve artist channel ID via search
    const searchItems = await fetchYtMusicSearch(searchQuery, 'all');
    const queryLower = searchQuery.toLowerCase().trim();
    const channelMatch = searchItems.find((item: any) => {
      if (item.type !== 'artist' || !item.artistId?.startsWith('UC')) return false;
      const itemName = (item.name || '').toLowerCase();
      return itemName.includes(queryLower) || queryLower.includes(itemName);
    });

    if (channelMatch?.artistId) {
      const directArtist = await fetchYtMusicArtist(channelMatch.artistId);
      if (directArtist) {
        const directName = (directArtist.name || '').toLowerCase();
        if (directName.includes(queryLower) || queryLower.includes(directName)) {
          return res.json({ success: true, data: directArtist });
        }
      }
    }

    // 4. Return synthesized profile from search tracks if all else fails
    const songs = searchItems.filter((item: any) => {
      if (!item.videoId) return false;
      const a = (item.artist || '').toLowerCase();
      const t = (item.title || '').toLowerCase();
      return a.includes(queryLower) || t.includes(queryLower) || queryLower.includes(a);
    });
    const albums = searchItems.filter((item: any) => item.type === 'album');
    const artistName = channelMatch?.name || searchQuery || rawId;

    res.json({
      success: true,
      data: {
        id: targetBrowseId,
        artistId: targetBrowseId,
        name: artistName,
        artworkUrl: channelMatch?.artworkUrl || songs[0]?.artworkUrl || '',
        songs: songs.slice(0, 20),
        albums: albums.slice(0, 10),
        singles: [],
        videos: [],
        provider: 'youtube_music',
      },
    });
  } catch (err: any) {
    console.error('Error in handleArtist:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
app.get('/api/music/artists/:id', handleArtist);
app.get('/api/music/artist/:id', handleArtist);

// Fetch album details and tracks directly from YouTube Music internal browse API
async function fetchYtMusicAlbum(
  browseId: string,
  titleHint: string = '',
  artistHint: string = ''
): Promise<any | null> {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        browseId,
      }),
    });

    if (res.ok) {
      const data: any = await res.json();
      const twoCol = data.contents?.twoColumnBrowseResultsRenderer;
      const tab0 = twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
      const header = tab0?.[0]?.musicResponsiveHeaderRenderer;
      const secList = twoCol?.secondaryContents?.sectionListRenderer?.contents;
      const shelf = secList?.[0]?.musicShelfRenderer;

      const title =
        header?.title?.runs?.[0]?.text ||
        data.microformat?.microformatDataRenderer?.title ||
        titleHint ||
        'Album';
      const artist =
        header?.straplineTextOne?.runs?.map((r: any) => r.text).join('') ||
        artistHint ||
        '';
      const subtitle = header?.subtitle?.runs?.map((r: any) => r.text).join('') || '';
      const yearMatch = subtitle.match(/\b(19\d\d|20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : '';
      const thumbs =
        header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails;
      const artworkUrl = thumbs?.[thumbs.length - 1]?.url || '';

      const tracks: any[] = [];
      for (const item of shelf?.contents || []) {
        const r = item.musicResponsiveListItemRenderer;
        if (!r) continue;
        const trackTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const trackArtist =
          r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((x: any) => x.text).join('') ||
          artist;
        const duration = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
        const playNav =
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
        const videoId = playNav?.watchEndpoint?.videoId;

        if (trackTitle && videoId) {
          tracks.push({
            videoId,
            title: trackTitle,
            artist: trackArtist,
            album: title,
            duration: duration || '3:30',
            artworkUrl: artworkUrl,
            provider: 'youtube_music',
            isPlayable: true,
          });
        }
      }

      if (tracks.length > 0) {
        return {
          provider: 'youtube_music',
          albumId: browseId,
          title,
          artist,
          year,
          artworkUrl,
          trackCount: tracks.length,
          tracks,
        };
      }
    }
  } catch (err: any) {
    console.warn(`Direct YouTube Music browse failed for ${browseId}:`, err.message);
  }
  return null;
}

// Albums (support both /albums/:id and /album/:id)
const handleAlbum = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const titleHint = ((req.query.title as string) || '').trim();
    const artistHint = ((req.query.artist as string) || '').trim();

    // 1. Direct YouTube Music browse resolution for any album/playlist ID
    let albumData = await fetchYtMusicAlbum(id, titleHint, artistHint);

    // 2. If browse ID without VL prefix was a playlist, retry with VL
    if ((!albumData || !albumData.tracks || albumData.tracks.length === 0) && id.startsWith('OLAK5uy')) {
      albumData = await fetchYtMusicAlbum(`VL${id}`, titleHint, artistHint);
    }

    // 3. Fallback: try Render backend
    if (!albumData || !albumData.tracks || albumData.tracks.length === 0) {
      try {
        const renderRes = await fetchRenderJson(`/api/music/albums/${id}`);
        if (renderRes?.data && renderRes.data.tracks && renderRes.data.tracks.length > 0) {
          albumData = renderRes.data;
        }
      } catch (renderErr: any) {
        console.warn('Render album fetch error:', renderErr.message);
      }
    }

    // 4. Fallback: search for album songs by title + artist
    const resolvedTitle = albumData?.title || titleHint;
    const resolvedArtist = albumData?.artist || artistHint;
    if ((!albumData || !albumData.tracks || albumData.tracks.length === 0) && (resolvedTitle || id)) {
      try {
        const searchQ = `${resolvedTitle || id} ${resolvedArtist}`.trim();
        const searchRes = await fetchRenderJson(`/api/music/search?q=${encodeURIComponent(searchQ)}&type=songs`);
        const searchTracks = searchRes?.data || [];
        if (Array.isArray(searchTracks) && searchTracks.length > 0) {
          albumData = {
            provider: 'youtube_music',
            albumId: id,
            title: resolvedTitle || id,
            artist: resolvedArtist || searchTracks[0]?.artist || 'Artist',
            year: albumData?.year || '',
            artworkUrl: albumData?.artworkUrl || searchTracks[0]?.artworkUrl || '',
            trackCount: searchTracks.length,
            tracks: searchTracks.slice(0, 20),
          };
        }
      } catch (searchErr: any) {
        console.warn('Album songs search fallback error:', searchErr.message);
      }
    }

    if (albumData) {
      return res.json({ success: true, data: albumData });
    }

    res.json({
      success: true,
      data: {
        provider: 'youtube_music',
        albumId: id,
        title: titleHint || 'Album',
        artist: artistHint || 'Artist',
        year: '',
        artworkUrl: '',
        trackCount: 0,
        tracks: [],
      },
    });
  } catch (err: any) {
    console.error('Error fetching album:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
app.get('/api/music/albums/:id', handleAlbum);
app.get('/api/music/album/:id', handleAlbum);

// Playlists (support both /playlists/:id and /playlist/:id)
const handlePlaylist = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    // 1. Direct YouTube Music browse resolution for playlist (with VL prefix if needed)
    const browseId = id.startsWith('VL') || id.startsWith('MPREb') ? id : `VL${id}`;
    let playlistData = await fetchYtMusicAlbum(browseId);
    if (playlistData && playlistData.tracks && playlistData.tracks.length > 0) {
      return res.json({ success: true, data: playlistData });
    }

    // 2. Try Render backend fallback
    try {
      const data = await fetchRenderJson(`/api/music/playlists/${id}`, 4000);
      if (data?.data) {
        return res.json(data);
      }
    } catch (err: any) {
      console.warn('Playlist fetch Render fallback error:', err.message);
    }

    res.json({
      success: true,
      data: playlistData || {
        provider: 'youtube_music',
        playlistId: id,
        title: 'Playlist',
        tracks: [],
      },
    });
  } catch (err: any) {
    console.error('Error fetching playlist:', err.message);
    res.json({ success: true, data: { provider: 'youtube_music', playlistId: req.params.id, title: 'Playlist', tracks: [] } });
  }
};
app.get('/api/music/playlists/:id', handlePlaylist);
app.get('/api/music/playlist/:id', handlePlaylist);

// Podcasts endpoint (searches podcast episodes/series from YouTube Music)
app.get('/api/music/podcasts', async (req, res) => {
  try {
    const directPodcasts = await fetchYtMusicSearch('popular podcasts shows', 'playlists');
    if (directPodcasts && directPodcasts.length > 0) {
      return res.json({ success: true, data: directPodcasts });
    }
    const searchData = await fetchRenderJson('/api/music/search?q=popular+podcasts+shows&type=playlists', 3500);
    if (searchData?.data) {
      return res.json({ success: true, data: searchData.data });
    }
  } catch (err: any) {
    console.warn('Podcast search fallback:', err.message);
  }
  res.json({ success: true, data: [] });
});

// Genres
app.get('/api/music/genres', async (req, res) => {
  try {
    const data = await fetchRenderJson('/api/music/genres', 3000);
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return res.json(data);
    }
  } catch {
    // Return fallback genres
  }

  res.json({
    success: true,
    data: [
      { title: 'Chill', color: '#1A1A1D', artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&q=80' },
      { title: 'Pop', color: '#B8265C', artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
      { title: 'Hip-Hop', color: '#F25F22', artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80' },
      { title: 'R&B', color: '#88304E', artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80' },
      { title: 'Workout', color: '#005082', artworkUrl: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=500&q=80' },
      { title: 'Focus & Study', color: '#2B580C', artworkUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80' },
      { title: 'Rock', color: '#7E0CF5', artworkUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80' },
      { title: 'Dance & EDM', color: '#00A8CC', artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80' },
    ],
  });
});

// Smart Queue / Queue recommendations endpoint
app.get('/api/music/queue', async (req, res) => {
  try {
    const videoId = (req.query.videoId as string || '').trim();
    if (videoId) {
      const radioTracks = await fetchYtMusicRadio(videoId);
      if (radioTracks && radioTracks.length > 0) {
        return res.json({ success: true, data: radioTracks.slice(0, 15) });
      }
    }

    const query = (req.query.q as string) || 'top music hits';
    const directTracks = await fetchYtMusicSearch(query, 'songs');
    if (directTracks && directTracks.length > 0) {
      return res.json({ success: true, data: directTracks.slice(0, 15) });
    }

    const searchData = await fetchRenderJson(`/api/music/search?q=${encodeURIComponent(query)}&type=songs`, 3500);
    res.json({
      success: true,
      data: (searchData?.data || []).slice(0, 15),
    });
  } catch (err: any) {
    res.json({ success: true, data: [] });
  }
});

// Cache for YouTube Music lyrics
const lyricsCache = new Map<string, any>();

// Helper to fetch lyrics from YouTube Music's InnerTube next and browse endpoints
async function fetchYtMusicLyrics(rawVideoId: string, titleHint = '', artistHint = ''): Promise<any> {
  let videoId = (rawVideoId || '').replace(/^youtube_music:/, '').trim();

  // If videoId is empty or clearly a non-id string, search YouTube Music to find the matching official song videoId
  if ((!videoId || videoId.length < 5) && titleHint) {
    try {
      const searchRes = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Origin: 'https://music.youtube.com',
          Referer: 'https://music.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          query: `${titleHint} ${artistHint}`.trim(),
          params: 'EgWKAQIIAWoKEAkQChAFEAMQCQ%3D%3D',
        }),
      });

      if (searchRes.ok) {
        const sData = (await searchRes.json()) as any;
        const sections = sData.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const sec of sections) {
          const shelf = sec.musicShelfRenderer;
          if (shelf?.contents) {
            for (const item of shelf.contents) {
              const vid = item.musicResponsiveListItemRenderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
              if (vid) {
                videoId = vid;
                break;
              }
            }
          }
          if (videoId) break;
        }
      }
    } catch (searchErr: any) {
      console.warn('Lyrics fallback search error:', searchErr.message);
    }
  }

  if (!videoId) {
    return { success: true, hasLyrics: false, message: 'No valid videoId provided', lyrics: [] };
  }

  const cacheKey = videoId.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    // Step 1: Call YouTube Music /next endpoint with the videoId to retrieve the lyrics browse ID
    const nextRes = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId,
      }),
    });

    if (!nextRes.ok) {
      throw new Error(`InnerTube next endpoint returned status ${nextRes.status}`);
    }

    const nextData = (await nextRes.json()) as any;
    const tabs = nextData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
    const lyricsTab = tabs?.find((t: any) =>
      t.tabRenderer?.endpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_TRACK_LYRICS' ||
      t.tabRenderer?.title === 'Lyrics'
    );
    let browseId = lyricsTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;

    // If lyrics tab is missing on this specific videoId (e.g., custom music video), search official song once
    if (!browseId && titleHint) {
      try {
        const sRes = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Origin: 'https://music.youtube.com',
            Referer: 'https://music.youtube.com',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'US',
              },
            },
            query: `${titleHint} ${artistHint}`.trim(),
            params: 'EgWKAQIIAWoKEAkQChAFEAMQCQ%3D%3D',
          }),
        });
        if (sRes.ok) {
          const sData = (await sRes.json()) as any;
          const sections = sData.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
          let altVid = null;
          for (const sec of sections) {
            const shelf = sec.musicShelfRenderer;
            if (shelf?.contents) {
              for (const item of shelf.contents) {
                const v = item.musicResponsiveListItemRenderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
                if (v && v !== videoId) {
                  altVid = v;
                  break;
                }
              }
            }
            if (altVid) break;
          }
          if (altVid) {
            const altNextRes = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Origin: 'https://music.youtube.com',
                Referer: 'https://music.youtube.com',
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: 'WEB_REMIX',
                    clientVersion: '1.20240101.01.00',
                    hl: 'en',
                    gl: 'US',
                  },
                },
                videoId: altVid,
              }),
            });
            if (altNextRes.ok) {
              const altData = (await altNextRes.json()) as any;
              const altTabs = altData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
              const altTab = altTabs?.find((t: any) =>
                t.tabRenderer?.endpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_TRACK_LYRICS' ||
                t.tabRenderer?.title === 'Lyrics'
              );
              browseId = altTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
            }
          }
        }
      } catch {
        // Continue with browseId check
      }
    }

    if (!browseId) {
      const emptyResult = {
        success: true,
        hasLyrics: false,
        hasTimestamps: false,
        message: 'Lyrics not available for this song',
        lyrics: [],
      };
      lyricsCache.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // Step 2: Retrieve lyrics and synced timestamps using the browse ID
    // 2a: Request with ANDROID_MUSIC client to retrieve timedLyricsData with synced timestamps
    try {
      const mobileRes = await fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.apps.youtube.music/7.21.50 (Linux; U; Android 14; en_US)',
          Origin: 'https://music.youtube.com',
          Referer: 'https://music.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID_MUSIC',
              clientVersion: '7.21.50',
              hl: 'en',
              gl: 'US',
            },
          },
          browseId,
        }),
      });

      if (mobileRes.ok) {
        const mData = (await mobileRes.json()) as any;
        const timedData = mData.contents?.elementRenderer?.newElement?.type?.componentType?.model?.timedLyricsModel?.lyricsData;

        if (timedData && Array.isArray(timedData.timedLyricsData) && timedData.timedLyricsData.length > 0) {
          const lines = timedData.timedLyricsData
            .map((item: any) => {
              const startMs = Number(item.cueRange?.startTimeMilliseconds ?? 0);
              const endMs = Number(item.cueRange?.endTimeMilliseconds ?? 0);
              return {
                time: Math.round((startMs / 1000) * 10) / 10,
                endTime: Math.round((endMs / 1000) * 10) / 10,
                text: (item.lyricLine || '').trim(),
              };
            })
            .filter((line: any) => line.text && line.text.length > 0);

          if (lines.length > 0) {
            const timedResult = {
              success: true,
              hasLyrics: true,
              hasTimestamps: true,
              source: timedData.sourceMessage || 'YouTube Music',
              browseId,
              lyrics: lines,
            };
            lyricsCache.set(cacheKey, timedResult);
            return timedResult;
          }
        }
      }
    } catch (mobileErr: any) {
      console.warn('Timed lyrics browse error:', mobileErr.message);
    }

    // 2b: Fallback to WEB_REMIX browse for static lyrics from musicDescriptionShelfRenderer
    try {
      const webBrowseRes = await fetch('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Origin: 'https://music.youtube.com',
          Referer: 'https://music.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
          browseId,
        }),
      });

      if (webBrowseRes.ok) {
        const webData = (await webBrowseRes.json()) as any;
        const msg = webData.contents?.messageRenderer?.text?.runs?.[0]?.text;
        if (msg && msg.toLowerCase().includes('not available')) {
          const unavailableResult = {
            success: true,
            hasLyrics: false,
            hasTimestamps: false,
            message: 'Lyrics not available for this song',
            lyrics: [],
          };
          lyricsCache.set(cacheKey, unavailableResult);
          return unavailableResult;
        }

        const shelf = webData.contents?.sectionListRenderer?.contents?.[0]?.musicDescriptionShelfRenderer;
        const lyricsText = shelf?.description?.runs?.[0]?.text || '';
        const footer = shelf?.footer?.runs?.map((r: any) => r.text).join('') || 'YouTube Music';

        if (lyricsText && lyricsText.trim()) {
          const rawLines = lyricsText.split('\n').map((l: string) => l.trim()).filter(Boolean);
          if (rawLines.length > 0) {
            const staticLines = rawLines.map((line: string, idx: number) => ({
              time: idx * 4,
              text: line,
            }));
            const staticResult = {
              success: true,
              hasLyrics: true,
              hasTimestamps: false,
              source: footer,
              browseId,
              lyrics: staticLines,
            };
            lyricsCache.set(cacheKey, staticResult);
            return staticResult;
          }
        }
      }
    } catch (webErr: any) {
      console.warn('Web lyrics browse error:', webErr.message);
    }

    const notFoundResult = {
      success: true,
      hasLyrics: false,
      hasTimestamps: false,
      message: 'Lyrics not available for this song',
      lyrics: [],
    };
    lyricsCache.set(cacheKey, notFoundResult);
    return notFoundResult;
  } catch (err: any) {
    console.error('Error in fetchYtMusicLyrics:', err.message);
    return {
      success: false,
      hasLyrics: false,
      message: err.message,
      lyrics: [],
    };
  }
}

// Lyrics handler
const handleLyrics = async (req: express.Request, res: express.Response) => {
  try {
    const videoId = (req.params.videoId || (req.query.videoId as string) || '').trim();
    const title = ((req.query.title as string) || '').trim();
    const artist = ((req.query.artist as string) || '').trim();

    const lyricsData = await fetchYtMusicLyrics(videoId, title, artist);
    res.json(lyricsData);
  } catch (err: any) {
    console.error('Error handling lyrics endpoint:', err.message);
    res.status(500).json({ success: false, hasLyrics: false, message: err.message, lyrics: [] });
  }
};

app.get('/api/music/lyrics', handleLyrics);
app.get('/api/music/lyrics/:videoId', handleLyrics);

// Events logging endpoint
app.post('/api/music/events', (req, res) => {
  // Ingest listening event (persisted via Supabase on client)
  res.json({ success: true });
});

// AI Audio Blueprint & Cultural Taxonomy Analysis
app.post('/api/music/blueprint', async (req, res) => {
  try {
    const { title, artist, genre = 'Pop', year = '' } = req.body || {};
    if (!title || !artist) {
      return res.status(400).json({ success: false, message: 'Title and artist are required' });
    }
    const blueprint = await analyzeTrackBlueprint(title, artist, genre, year);
    res.json({
      success: true,
      data: blueprint,
    });
  } catch (err: any) {
    console.error('Error in /api/music/blueprint:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/music/blueprint', async (req, res) => {
  try {
    const title = (req.query.title as string || '').trim();
    const artist = (req.query.artist as string || '').trim();
    const genre = (req.query.genre as string || 'Pop').trim();
    const year = (req.query.year as string || '').trim();

    if (!title || !artist) {
      return res.status(400).json({ success: false, message: 'Title and artist query parameters required' });
    }
    const blueprint = await analyzeTrackBlueprint(title, artist, genre, year);
    res.json({
      success: true,
      data: blueprint,
    });
  } catch (err: any) {
    console.error('Error in GET /api/music/blueprint:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyMusic Server running on http://localhost:${PORT}`);
  });
}

startServer();
