import { Track, Album, Artist, HomeShelf } from '../types/music';
import { apiService } from './api';
import { tasteService, PRESET_GENRES, PRESET_ARTISTS } from './tasteService';
import { OFFICIAL_GLOBAL_HITS, ARTIST_OFFICIAL_SONGS } from '../data/officialTracks';

// In-memory cache for personalized shelf results to provide instant snappy navigation
const shelfCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const personalizedEngine = {
  /**
   * Generates a completely personalized Apple Music "Listen Now" feed
   * based on the user's liked songs, favorite artists, and chosen genres.
   * Eliminates random music.
   */
  async getPersonalizedHome(likes: Track[], history: Track[]): Promise<HomeShelf[]> {
    const preferences = tasteService.getPreferences();
    
    // Extract unique artist names from user's likes, listening history, and preferences
    const artistFrequency = new Map<string, number>();
    
    // Give high weight to liked songs
    for (const track of likes) {
      if (track.artist) {
        const cleanName = track.artist.split(/[,&feat\.]/i)[0].trim();
        if (cleanName) {
          artistFrequency.set(cleanName, (artistFrequency.get(cleanName) || 0) + 3);
        }
      }
    }

    // Give weight to recently played history
    for (const track of history) {
      if (track.artist) {
        const cleanName = track.artist.split(/[,&feat\.]/i)[0].trim();
        if (cleanName) {
          artistFrequency.set(cleanName, (artistFrequency.get(cleanName) || 0) + 2);
        }
      }
    }

    // Add explicit preferences if any
    for (const artist of preferences.favoriteArtists) {
      if (artist) {
        artistFrequency.set(artist, (artistFrequency.get(artist) || 0) + 4);
      }
    }

    // Sort user's artists by taste weight
    const userTasteArtists = Array.from(artistFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const favoriteArtists = userTasteArtists;
    const favoriteGenres = preferences.favoriteGenres.length > 0
      ? preferences.favoriteGenres
      : ['Pop', 'Hip-Hop', 'R&B'];

    const shelves: HomeShelf[] = [];

    // 1. "TOP PICKS FOR YOU" (Curated official tracks matching user taste)
    try {
      const blendedQuickPicks: Track[] = [];
      const seenIds = new Set<string>();

      // 1a. If user has liked songs, weave their official liked tracks into top picks
      for (const track of likes) {
        if (!seenIds.has(track.videoId)) {
          seenIds.add(track.videoId);
          blendedQuickPicks.push(track);
          if (blendedQuickPicks.length >= 4) break;
        }
      }

      // 1b. Fetch authentic official releases for the user's top taste artists
      if (userTasteArtists.length > 0) {
        const searchPromises = userTasteArtists.slice(0, 4).map((artistName) => {
          const localOfficial = ARTIST_OFFICIAL_SONGS[artistName.toLowerCase()];
          if (localOfficial && localOfficial.length > 0) {
            return Promise.resolve({ songs: localOfficial });
          }
          return apiService.search(`${artistName} official audio`, 'songs').catch(() => ({ songs: [] }));
        });

        const searchResults = await Promise.all(searchPromises);
        for (const res of searchResults) {
          for (const track of res.songs) {
            if (!seenIds.has(track.videoId)) {
              seenIds.add(track.videoId);
              blendedQuickPicks.push(track);
            }
          }
        }
      } else {
        // New user with no history yet: search top trending music releases
        const trendingResults = await apiService.search('top songs official audio', 'songs').catch(() => ({ songs: [] }));
        for (const track of trendingResults.songs) {
          if (!seenIds.has(track.videoId)) {
            seenIds.add(track.videoId);
            blendedQuickPicks.push(track);
            if (blendedQuickPicks.length >= 8) break;
          }
        }
      }

      const picksToDisplay = blendedQuickPicks.slice(0, 8);
      if (picksToDisplay.length > 0) {
        const subtitle = userTasteArtists.length > 0
          ? `Curated official songs based on ${userTasteArtists.slice(0, 2).join(', ')}`
          : 'Curated official songs tailored to your taste';

        shelves.push({
          title: 'Top Picks For You',
          subtitle,
          type: 'quick_picks',
          contents: picksToDisplay,
        });
      }
    } catch (err) {
      console.warn('Personalized quick picks error:', err);
      if (likes.length > 0) {
        shelves.push({
          title: 'Top Picks For You',
          subtitle: 'Your favorite official songs',
          type: 'quick_picks',
          contents: likes.slice(0, 8),
        });
      }
    }

    // 2. "DISCOVER WEEKLY" (Spotify Collaborative Filtering & Audio Feature Discovery)
    try {
      const discoveryTracks: Track[] = [];
      const seenIds = new Set<string>(likes.map((t) => t.videoId));

      const seedQuery = userTasteArtists[0]
        ? `${userTasteArtists[0]} similar artists hit songs`
        : `${favoriteGenres[0] || 'Pop'} discovery hits`;

      const discoveryResults = await apiService.search(seedQuery, 'songs');
      for (const track of discoveryResults.songs) {
        if (!seenIds.has(track.videoId)) {
          seenIds.add(track.videoId);
          discoveryTracks.push(track);
          if (discoveryTracks.length >= 10) break;
        }
      }

      if (discoveryTracks.length > 0) {
        shelves.push({
          title: 'Discover Weekly',
          subtitle: 'Your weekly mix of fresh recommendations based on your taste profile',
          type: 'shelf',
          contents: discoveryTracks,
        });
      }
    } catch (err) {
      console.warn('Discover Weekly generation error:', err);
    }

    // 3. "DAILY MIX 1" (Genre & Artist Affinity Cluster)
    try {
      const topGenre = favoriteGenres[0] || 'Hip-Hop';
      const dailyMixTracks: Track[] = [];
      const seenIds = new Set<string>();

      // Weave 3 liked songs if available
      for (const track of likes) {
        if (!seenIds.has(track.videoId)) {
          seenIds.add(track.videoId);
          dailyMixTracks.push(track);
          if (dailyMixTracks.length >= 3) break;
        }
      }

      const mixResults = await apiService.search(`${topGenre} top audio hits`, 'songs');
      for (const track of mixResults.songs) {
        if (!seenIds.has(track.videoId)) {
          seenIds.add(track.videoId);
          dailyMixTracks.push(track);
          if (dailyMixTracks.length >= 10) break;
        }
      }

      if (dailyMixTracks.length > 0) {
        shelves.push({
          title: `Daily Mix • ${topGenre}`,
          subtitle: `A personalized blend of your favorite ${topGenre} tracks and new recommendations`,
          type: 'shelf',
          contents: dailyMixTracks,
        });
      }
    } catch (err) {
      console.warn('Daily Mix error:', err);
    }

    // 4. "YOUR FAVORITE SONGS" (if user has likes)
    if (likes.length > 0) {
      shelves.push({
        title: 'Favorite Songs',
        subtitle: `${likes.length} tracks you love`,
        type: 'songs',
        contents: likes.slice(0, 12),
      });
    }

    // 3. "BECAUSE YOU LIKE [TOP ARTIST]"
    try {
      const featuredArtist = favoriteArtists[0];
      if (featuredArtist) {
        const artistResults = await apiService.search(`${featuredArtist}`, 'all');
        const contents = [
          ...artistResults.songs.slice(0, 5),
          ...artistResults.albums.slice(0, 4),
        ];
        if (contents.length > 0) {
          shelves.push({
            title: `Because You Like ${featuredArtist}`,
            subtitle: `Popular songs and releases from ${featuredArtist}`,
            type: 'shelf',
            contents,
          });
        }
      }
    } catch (err) {
      console.warn('Artist shelf error:', err);
    }

    // 4. "HEAVY ROTATION" (based on listening history)
    if (history.length > 0) {
      shelves.push({
        title: 'Heavy Rotation',
        subtitle: 'Albums and tracks you keep on repeat',
        type: 'shelf',
        contents: history.slice(0, 8),
      });
    }

    // 5. "ESSENTIALS IN [USER'S FAVORITE GENRE]"
    try {
      const primaryGenre = favoriteGenres[0] || 'Pop';
      const genreConfig = PRESET_GENRES.find((g) => g.name === primaryGenre);
      const query = genreConfig?.searchQuery || `${primaryGenre} top hits`;
      const genreResults = await apiService.search(query, 'songs');

      if (genreResults.songs.length > 0) {
        shelves.push({
          title: `${primaryGenre} Essentials`,
          subtitle: `The biggest songs in ${primaryGenre} right now`,
          type: 'shelf',
          contents: genreResults.songs.slice(0, 10),
        });
      }
    } catch (err) {
      console.warn('Genre shelf error:', err);
    }

    // 6. "YOUR FAVORITE ARTISTS & RECOMMENDATIONS"
    try {
      const artistCards: Artist[] = [];
      const artistsToFetch = favoriteArtists.slice(0, 6);

      const artistSearches = await Promise.all(
        artistsToFetch.map((name) => apiService.search(name, 'artists'))
      );

      artistSearches.forEach((res, idx) => {
        const artistName = artistsToFetch[idx];
        const preset = tasteService.getPreferences ? undefined : undefined;
        const matchingPreset = PRESET_ARTISTS.find(
          (p) => p.name.toLowerCase() === artistName.toLowerCase()
        );

        if (res.artists && res.artists.length > 0) {
          const found = res.artists[0];
          artistCards.push({
            ...found,
            artistId: found.artistId || matchingPreset?.artistId || artistName,
          });
        } else {
          artistCards.push({
            id: matchingPreset?.artistId || `artist-${idx}`,
            artistId: matchingPreset?.artistId || artistName,
            name: artistName,
            artworkUrl:
              matchingPreset?.artworkUrl ||
              tasteService.getArtistArtwork(artistName) ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
            provider: 'youtube_music',
          });
        }
      });

      if (artistCards.length > 0) {
        shelves.push({
          title: 'Favorite Artists',
          subtitle: 'Keep up with new music and albums',
          type: 'artists',
          contents: artistCards,
        });
      }
    } catch (err) {
      console.warn('Artists shelf error:', err);
    }

    // 7. "RECENTLY PLAYED" (if available and different from heavy rotation)
    if (history.length > 4) {
      shelves.push({
        title: 'Recently Played',
        subtitle: 'Pick up where you left off',
        type: 'shelf',
        contents: history.slice(0, 8),
      });
    }

    return shelves;
  },

  /**
   * Generates a personalized endless radio queue based on user taste
   */
  async getPersonalStationTracks(likes: Track[]): Promise<Track[]> {
    const preferences = tasteService.getPreferences();
    const artists = preferences.favoriteArtists;
    const tracks: Track[] = [];
    const seenIds = new Set<string>();

    // Add up to 3 liked tracks first
    if (likes.length > 0) {
      const sampleLikes = [...likes].sort(() => Math.random() - 0.5).slice(0, 3);
      sampleLikes.forEach((t) => {
        seenIds.add(t.videoId);
        tracks.push(t);
      });
    }

    // Fetch tracks from user's favorite artists
    try {
      const artistQueries = artists.slice(0, 3);
      const searches = await Promise.all(
        artistQueries.map((a) => apiService.search(`${a} best songs hits`, 'songs'))
      );

      searches.forEach((res) => {
        for (const track of res.songs) {
          if (!seenIds.has(track.videoId)) {
            seenIds.add(track.videoId);
            tracks.push(track);
            if (tracks.length >= 15) break;
          }
        }
      });
    } catch (err) {
      console.warn('Station generation error:', err);
    }

    return tracks;
  },

  /**
   * Smart autoplay: picks the next track strictly according to user taste & current context
   */
  async getSmartAutoplayTrack(
    currentTrack: Track,
    existingQueue: Track[],
    likes: Track[]
  ): Promise<Track | null> {
    const preferences = tasteService.getPreferences();
    const seenIds = new Set(existingQueue.map((t) => t.videoId));
    seenIds.add(currentTrack.videoId);

    // 1. Try finding songs from the same artist first
    if (currentTrack.artist) {
      const artistSearch = await apiService.search(`${currentTrack.artist} top hits`, 'songs');
      for (const track of artistSearch.songs) {
        if (!seenIds.has(track.videoId)) {
          return track;
        }
      }
    }

    // 2. Try songs from user's favorite artists
    for (const favArtist of preferences.favoriteArtists) {
      if (favArtist.toLowerCase() !== currentTrack.artist?.toLowerCase()) {
        const favSearch = await apiService.search(`${favArtist} hit songs`, 'songs');
        for (const track of favSearch.songs) {
          if (!seenIds.has(track.videoId)) {
            return track;
          }
        }
      }
    }

    // 3. Try user's favorite genre
    const primaryGenre = preferences.favoriteGenres[0] || 'Pop';
    const genreSearch = await apiService.search(`${primaryGenre} hits`, 'songs');
    for (const track of genreSearch.songs) {
      if (!seenIds.has(track.videoId)) {
        return track;
      }
    }

    return null;
  },
};
