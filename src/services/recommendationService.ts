import { Track } from '../types/music';
import { apiService } from './api';
import { tasteService, PRESET_ARTISTS, PRESET_GENRES } from './tasteService';

// Helper to filter out compilation videos, playlist mix videos, and long non-song videos
export function isCompilationOrMixTrack(track: { title?: string; artist?: string; duration?: string | number }): boolean {
  if (!track) return true;
  const title = (track.title || '').toLowerCase();
  const artist = (track.artist || '').toLowerCase();

  // Filter out compilation/playlist keywords in track titles
  const compilationKeywords = [
    'top 10', 'top 20', 'top 50', 'top 100', 'top 5', 'top 15', 'top 25',
    'best songs', 'best of', 'hits mix', 'playlist', 'compilation', 'greatest hits',
    'full album', 'full mixtape', 'full tape', 'album mix', 'song compilation',
    'hype mix', 'rnb mix', 'hip hop mix', 'hiphop mix', 'rap mix', 'drill mix',
    '1 hour', '2 hour', '3 hour', '30 min', '45 min', 'non stop', 'loop 1 hour',
    'discography mix', 'megamix', 'mashup mix', 'nightcore mix', 'tiktok mix'
  ];

  if (compilationKeywords.some((keyword) => title.includes(keyword))) {
    return true;
  }

  // Filter out compilation producer channels that act as artists
  const compilationChannels = [
    'rising charts', 'revive music', 'top songs daily', 'best hiphop music',
    'uptwn chris', 'music central', 'hit nation', 'vibe central', 'charts central',
    'rap central', 'top charts', 'music box'
  ];

  if (compilationChannels.some((channel) => artist.includes(channel))) {
    return true;
  }

  // Filter out tracks longer than 10 minutes (600 seconds)
  if (typeof track.duration === 'string') {
    const parts = track.duration.split(':').map((num) => parseInt(num, 10));
    if (parts.length >= 3) return true; // HH:MM:SS is a long video/album/mix!
    if (parts.length === 2 && !isNaN(parts[0]) && parts[0] >= 10) return true; // 10:00+ minutes is a mix!
  } else if (typeof track.duration === 'number' && track.duration > 600) {
    return true;
  }

  return false;
}

// Artist to Genre & Similar Artists Mapping for high-accuracy algorithmic radio
const ARTIST_GENRE_MAP: Record<string, { genre: string; relatedArtists: string[] }> = {
  'playboi carti': { genre: 'Hip-Hop / Trap', relatedArtists: ['Travis Scott', 'Future', 'Lil Uzi Vert', 'Ken Carson', 'Destroy Lonely', 'Ye', 'Metro Boomin', 'Don Toliver', '21 Savage'] },
  'ken carson': { genre: 'Hip-Hop / Trap', relatedArtists: ['Playboi Carti', 'Destroy Lonely', 'Lil Uzi Vert', 'Yeat', 'Travis Scott'] },
  'yeat': { genre: 'Hip-Hop / Trap', relatedArtists: ['Playboi Carti', 'Lil Uzi Vert', 'Ken Carson', 'Drake', 'Future'] },
  'the weeknd': { genre: 'R&B / Pop', relatedArtists: ['Drake', 'Post Malone', 'Dua Lipa', 'Bruno Mars', 'SZA', 'Frank Ocean'] },
  'travis scott': { genre: 'Hip-Hop', relatedArtists: ['Drake', 'Don Toliver', 'Future', 'Kendrick Lamar', 'Metro Boomin', 'Playboi Carti', 'Ye'] },
  'drake': { genre: 'Hip-Hop / Rap', relatedArtists: ['Travis Scott', 'Future', '21 Savage', 'The Weeknd', 'Kendrick Lamar', 'J. Cole', 'Playboi Carti'] },
  '50 cent': { genre: 'Hip-Hop', relatedArtists: ['Eminem', 'Dr. Dre', 'Snoop Dogg', 'The Game', 'Tupac', 'Jay-Z'] },
  'eminem': { genre: 'Hip-Hop', relatedArtists: ['50 Cent', 'Dr. Dre', 'Snoop Dogg', 'Tupac', 'J. Cole', 'NF', 'Kendrick Lamar'] },
  'snoop dogg': { genre: 'Hip-Hop', relatedArtists: ['Dr. Dre', '50 Cent', 'Eminem', 'Tupac', 'Nate Dogg', 'Ice Cube'] },
  'dr. dre': { genre: 'Hip-Hop', relatedArtists: ['Snoop Dogg', 'Eminem', '50 Cent', 'Tupac', '2Pac', 'Kendrick Lamar'] },
  'dr dre': { genre: 'Hip-Hop', relatedArtists: ['Snoop Dogg', 'Eminem', '50 Cent', 'Tupac', '2Pac', 'Kendrick Lamar'] },
  'future': { genre: 'Hip-Hop / Trap', relatedArtists: ['Metro Boomin', 'Drake', 'Travis Scott', '21 Savage', 'Lil Uzi Vert', 'Playboi Carti'] },
  'metro boomin': { genre: 'Hip-Hop / Trap', relatedArtists: ['Future', '21 Savage', 'Travis Scott', 'The Weeknd', 'Drake', 'Don Toliver'] },
  'lil uzi vert': { genre: 'Hip-Hop / Trap', relatedArtists: ['Playboi Carti', 'Juice WRLD', 'Trippie Redd', 'Future', 'Travis Scott'] },
  '21 savage': { genre: 'Hip-Hop', relatedArtists: ['Drake', 'Metro Boomin', 'Future', 'Travis Scott', 'Lil Baby', 'J. Cole'] },
  'taylor swift': { genre: 'Pop', relatedArtists: ['Olivia Rodrigo', 'Billie Eilish', 'Sabrina Carpenter', 'Ariana Grande', 'Dua Lipa', 'Lana Del Rey'] },
  'billie eilish': { genre: 'Alt-Pop', relatedArtists: ['Lorde', 'Olivia Rodrigo', 'Finneas', 'Lana Del Rey', 'Taylor Swift', 'Girl in Red'] },
  'kendrick lamar': { genre: 'Hip-Hop', relatedArtists: ['J. Cole', 'Drake', 'Baby Keem', 'ScHoolboy Q', 'Kanye West', 'Tyler, The Creator', 'Eminem'] },
  'j. cole': { genre: 'Hip-Hop', relatedArtists: ['Kendrick Lamar', 'Drake', '21 Savage', 'Kanye West', 'Nas'] },
  'post malone': { genre: 'Pop / Hip-Hop', relatedArtists: ['The Weeknd', 'Swae Lee', 'Morgan Wallen', 'Juice WRLD', 'Khalid', 'Drake'] },
  'dua lipa': { genre: 'Dance / Pop', relatedArtists: ['Calvin Harris', 'The Weeknd', 'Ariana Grande', 'Doja Cat', 'Bebe Rexha', 'Ava Max'] },
  'sabrina carpenter': { genre: 'Pop', relatedArtists: ['Chappell Roan', 'Olivia Rodrigo', 'Taylor Swift', 'Ariana Grande', 'Dua Lipa'] },
  'chappell roan': { genre: 'Pop', relatedArtists: ['Sabrina Carpenter', 'Olivia Rodrigo', 'Charli xcx', 'Lorde', 'Billie Eilish'] },
  'charli xcx': { genre: 'Dance / Pop', relatedArtists: ['Chappell Roan', 'Lorde', 'Dua Lipa', 'Troye Sivan', 'Billie Eilish'] },
  'shakira': { genre: 'Latin / Pop', relatedArtists: ['Pitbull', 'Jennifer Lopez', 'Maluma', 'Enrique Iglesias', 'Bad Bunny', 'Karol G'] },
  'pitbull': { genre: 'Latin / Dance Pop', relatedArtists: ['Shakira', 'Flo Rida', 'Enrique Iglesias', 'Jennifer Lopez', 'Usher', 'Calvin Harris'] },
  'coldplay': { genre: 'Rock / Pop', relatedArtists: ['Imagine Dragons', 'OneRepublic', 'The Killers', 'U2', 'Maroon 5', 'Keane'] },
  'bruno mars': { genre: 'Pop / Funk / R&B', relatedArtists: ['Anderson .Paak', 'Silk Sonic', 'The Weeknd', 'Michael Jackson', 'Justin Timberlake'] },
  'ariana grande': { genre: 'Pop / R&B', relatedArtists: ['Doja Cat', 'The Weeknd', 'SZA', 'Dua Lipa', 'Camila Cabello', 'Normani'] },
  'kanye west': { genre: 'Hip-Hop', relatedArtists: ['Kid Cudi', 'Travis Scott', 'Pusha T', 'Jay-Z', 'Frank Ocean', 'Kendrick Lamar', 'Playboi Carti'] },
  'ye': { genre: 'Hip-Hop', relatedArtists: ['Kid Cudi', 'Travis Scott', 'Pusha T', 'Jay-Z', 'Frank Ocean', 'Kendrick Lamar', 'Playboi Carti'] },
  'adele': { genre: 'Pop / Soul', relatedArtists: ['Sam Smith', 'Lewis Capaldi', 'Sia', 'Alicia Keys', 'Amy Winehouse'] },
  'justin bieber': { genre: 'Pop / R&B', relatedArtists: ['Shawn Mendes', 'Charlie Puth', 'The Kid LAROI', 'Zayn', 'Dan + Shay'] },
  'ed sheeran': { genre: 'Pop / Acoustic', relatedArtists: ['Shawn Mendes', 'James Arthur', 'Lewis Capaldi', 'George Ezra', 'Calum Scott'] },
  'rihanna': { genre: 'R&B / Pop', relatedArtists: ['Beyoncé', 'SZA', 'Nicki Minaj', 'The Weeknd', 'Drake'] },
  'olivia rodrigo': { genre: 'Pop / Alt-Rock', relatedArtists: ['Taylor Swift', 'Conan Gray', 'Billie Eilish', 'Sabrina Carpenter', 'Gracie Abrams'] },
  'bad bunny': { genre: 'Latin / Reggaeton', relatedArtists: ['J Balvin', 'Rauw Alejandro', 'Daddy Yankee', 'Feid', 'Ozuna', 'Anuel AA'] },
  'don toliver': { genre: 'Hip-Hop / R&B', relatedArtists: ['Travis Scott', 'Gunna', 'Future', 'Lil Uzi Vert', 'Offset', 'Playboi Carti'] },
  'sza': { genre: 'R&B / Soul', relatedArtists: ['Summer Walker', 'Jhené Aiko', 'Kehlani', 'Frank Ocean', 'The Weeknd', 'Brent Faiyaz'] },
  'arijit singh': { genre: 'Bollywood / Indian Pop', relatedArtists: ['Shreya Ghoshal', 'Pritam', 'Atif Aslam', 'Sachin-Jigar', 'Armaan Malik'] },
  'bts': { genre: 'K-Pop', relatedArtists: ['BLACKPINK', 'Stray Kids', 'TXT', 'SEVENTEEN', 'NewJeans', 'TWICE'] },
};

export const recommendationService = {
  /**
   * Detect genre and style from track metadata, artist, or title
   */
  detectGenre(track: Track): { genre: string; relatedArtists: string[] } {
    const artistLower = (track.artist || '').toLowerCase().trim();
    const titleLower = (track.title || '').toLowerCase().trim();

    // 1. Direct artist match in dictionary
    for (const [artKey, info] of Object.entries(ARTIST_GENRE_MAP)) {
      if (artistLower.includes(artKey) || artKey.includes(artistLower)) {
        return info;
      }
    }

    // 2. Preset artists lookup
    const presetArt = PRESET_ARTISTS.find(
      (p) => artistLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(artistLower)
    );
    if (presetArt) {
      return { genre: presetArt.genre, relatedArtists: [] };
    }

    // 3. Keyword heuristic for genre
    const combined = `${titleLower} ${artistLower}`;
    if (combined.includes('rock') || combined.includes('metal') || combined.includes('band')) {
      return { genre: 'Rock', relatedArtists: ['Coldplay', 'Imagine Dragons', 'Queen', 'Linkin Park'] };
    }
    if (combined.includes('hip hop') || combined.includes('rap') || combined.includes('trap') || combined.includes('carti') || combined.includes('feat.')) {
      return { genre: 'Hip-Hop', relatedArtists: ['Playboi Carti', 'Travis Scott', 'Drake', 'Future', 'Lil Uzi Vert', 'Metro Boomin'] };
    }
    if (combined.includes('r&b') || combined.includes('soul') || combined.includes('slow')) {
      return { genre: 'R&B', relatedArtists: ['The Weeknd', 'SZA', 'Bruno Mars', 'Frank Ocean'] };
    }
    if (combined.includes('remix') || combined.includes('club') || combined.includes('dance') || combined.includes('dj') || combined.includes('edm')) {
      return { genre: 'Dance & EDM', relatedArtists: ['Calvin Harris', 'David Guetta', 'The Chainsmokers', 'Tiësto'] };
    }
    if (combined.includes('lofi') || combined.includes('chill') || combined.includes('relax') || combined.includes('study')) {
      return { genre: 'Chill & Lofi', relatedArtists: ['ChilledCow', 'Lofi Fruits Music', 'Kudos'] };
    }
    if (combined.includes('country') || combined.includes('acoustic')) {
      return { genre: 'Country', relatedArtists: ['Morgan Wallen', 'Luke Combs', 'Zach Bryan'] };
    }
    if (combined.includes('k-pop') || combined.includes('kpop')) {
      return { genre: 'K-Pop', relatedArtists: ['BTS', 'BLACKPINK', 'NewJeans', 'Stray Kids'] };
    }

    // Default to mainstream Pop / Top Hits
    return { genre: 'Pop', relatedArtists: ['The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Bruno Mars', 'Post Malone'] };
  },

  /**
   * Builds an intelligent, curated Spotify-style queue based on Genre, Popularity, and Artist Neighborhood Cluster.
   * Strictly filters out compilation videos, playlist videos, and "Top 10" lists!
   */
  async buildGenreAndPopularityQueue(seedTrack: Track, maxTracks: number = 20): Promise<Track[]> {
    const queue: Track[] = [seedTrack];
    const seenIds = new Set<string>();
    seenIds.add(seedTrack.videoId);

    // Track normalized titles to avoid duplicate covers / alternate versions of same song
    const cleanTitle = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const seenTitles = new Set<string>();
    seenTitles.add(cleanTitle(seedTrack.title));

    const { genre, relatedArtists } = this.detectGenre(seedTrack);
    const primaryArtist = seedTrack.artist?.split(',')[0]?.split('&')[0]?.split('feat.')[0]?.trim() || '';

    try {
      // Step 1: Fetch popular official individual songs by the same primary artist
      if (primaryArtist && primaryArtist.toLowerCase() !== 'artist') {
        const artistResults = await apiService.search(`${primaryArtist} official audio`, 'songs').catch(() => ({ songs: [] }));
        let addedCount = 0;
        for (const t of artistResults.songs) {
          if (isCompilationOrMixTrack(t)) continue;
          const titleKey = cleanTitle(t.title);
          if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
            seenIds.add(t.videoId);
            seenTitles.add(titleKey);
            queue.push(t);
            addedCount++;
            if (addedCount >= 3) break;
          }
        }
      }

      // Step 2: Fetch popular individual tracks from Spotify-style Related Artist Cluster
      if (relatedArtists && relatedArtists.length > 0) {
        for (const relArtist of relatedArtists) {
          if (queue.length >= maxTracks) break;
          const relResults = await apiService.search(`${relArtist} official audio`, 'songs').catch(() => ({ songs: [] }));
          let addedForRel = 0;
          for (const t of relResults.songs) {
            if (isCompilationOrMixTrack(t)) continue;
            const titleKey = cleanTitle(t.title);
            if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
              seenIds.add(t.videoId);
              seenTitles.add(titleKey);
              queue.push(t);
              addedForRel++;
              if (addedForRel >= 2) break;
            }
          }
        }
      }

      // Step 3: Fetch YouTube Music algorithmic Radio queue and filter out compilations
      if (seedTrack.videoId) {
        const radioTracks = await apiService.getRadioTracks(seedTrack.videoId).catch(() => []);
        for (const t of radioTracks) {
          if (queue.length >= maxTracks) break;
          if (isCompilationOrMixTrack(t)) continue;
          const titleKey = cleanTitle(t.title);
          if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
            seenIds.add(t.videoId);
            seenTitles.add(titleKey);
            queue.push(t);
          }
        }
      }

      // Step 4: If queue needs more tracks, blend in top popular hits from matching genre
      if (queue.length < maxTracks) {
        const cleanGenreName = genre.split('/')[0].trim();
        const genreResults = await apiService.search(`${cleanGenreName} top popular hits`, 'songs').catch(() => ({ songs: [] }));
        for (const t of genreResults.songs) {
          if (queue.length >= maxTracks) break;
          if (isCompilationOrMixTrack(t)) continue;
          const titleKey = cleanTitle(t.title);
          if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
            seenIds.add(t.videoId);
            seenTitles.add(titleKey);
            queue.push(t);
          }
        }
      }

      return queue;
    } catch (err) {
      console.warn('Error building genre & popularity queue:', err);
      return queue;
    }
  },

  /**
   * Get personalized recommendations to extend queue based on genre, popularity, and user taste
   */
  async getSmartQueueTracks(
    currentTrack: Track,
    currentQueue: Track[],
    recentHistory: Track[]
  ): Promise<Track[]> {
    const preferences = tasteService.getPreferences();
    const historyVideoIds = [
      ...currentQueue.map((t) => t.videoId),
      ...recentHistory.map((t) => t.videoId),
      currentTrack.videoId,
    ];
    const seenIds = new Set(historyVideoIds);
    const cleanTitle = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const seenTitles = new Set(currentQueue.map((t) => cleanTitle(t.title)));

    const results: Track[] = [];
    const { genre, relatedArtists } = this.detectGenre(currentTrack);

    try {
      // 1. Related artists from genre neighborhood cluster
      for (const relArt of relatedArtists) {
        if (results.length >= 6) break;
        const relTracks = await apiService.search(`${relArt} official audio`, 'songs').catch(() => ({ songs: [] }));
        for (const t of relTracks.songs) {
          if (isCompilationOrMixTrack(t)) continue;
          const titleKey = cleanTitle(t.title);
          if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
            seenIds.add(t.videoId);
            seenTitles.add(titleKey);
            results.push(t);
            break;
          }
        }
      }

      // 2. Official algorithmic radio for current song (filtered for non-compilation)
      if (results.length < 8 && currentTrack.videoId) {
        const radioTracks = await apiService.getRadioTracks(currentTrack.videoId).catch(() => []);
        for (const t of radioTracks) {
          if (isCompilationOrMixTrack(t)) continue;
          const titleKey = cleanTitle(t.title);
          if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
            seenIds.add(t.videoId);
            seenTitles.add(titleKey);
            results.push(t);
            if (results.length >= 8) break;
          }
        }
      }

      // 3. User's favorite artists in matching genre style
      for (const favArtist of preferences.favoriteArtists) {
        if (results.length >= 10) break;
        if (favArtist.toLowerCase() !== currentTrack.artist?.toLowerCase()) {
          const favTracks = await apiService.search(`${favArtist} official audio`, 'songs').catch(() => ({ songs: [] }));
          for (const t of favTracks.songs) {
            if (isCompilationOrMixTrack(t)) continue;
            const titleKey = cleanTitle(t.title);
            if (!seenIds.has(t.videoId) && !seenTitles.has(titleKey)) {
              seenIds.add(t.videoId);
              seenTitles.add(titleKey);
              results.push(t);
              break;
            }
          }
        }
      }

      return results;
    } catch (err) {
      console.error('Error extending smart queue:', err);
      return [];
    }
  },
};


