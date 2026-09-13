import { TastePreferences, Track } from '../types/music';

const STORAGE_TASTE_KEY = 'mymusic_user_taste_preferences';
const STORAGE_ARTIST_ARTWORKS_KEY = 'mymusic_artist_artworks';

export interface PresetArtist {
  name: string;
  genre: string;
  artworkUrl: string;
  artistId?: string;
}

export interface PresetGenre {
  name: string;
  searchQuery: string;
  color: string;
  gradient: string;
}

export const PRESET_GENRES: PresetGenre[] = [
  { name: 'Pop', searchQuery: 'today top pop hits', color: '#FA233B', gradient: 'from-rose-500 to-red-600' },
  { name: 'Hip-Hop', searchQuery: 'top hip hop rap hits', color: '#F25F22', gradient: 'from-amber-600 to-orange-700' },
  { name: 'R&B', searchQuery: 'today r&b soul essentials', color: '#B8265C', gradient: 'from-pink-600 to-rose-700' },
  { name: 'Rock', searchQuery: 'modern rock classics hits', color: '#7E0CF5', gradient: 'from-purple-700 to-indigo-900' },
  { name: 'Dance & EDM', searchQuery: 'top edm dance club hits', color: '#00A8CC', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Indie & Alt', searchQuery: 'indie alternative essentials', color: '#2B580C', gradient: 'from-emerald-600 to-teal-800' },
  { name: 'Chill & Lofi', searchQuery: 'chill lofi beats relax', color: '#4A5568', gradient: 'from-zinc-700 to-slate-900' },
  { name: 'Country', searchQuery: 'hot country hits today', color: '#D97706', gradient: 'from-yellow-600 to-amber-800' },
  { name: 'K-Pop', searchQuery: 'top k-pop hits essentials', color: '#EC4899', gradient: 'from-pink-500 to-rose-600' },
  { name: 'Latin', searchQuery: 'top latin reggaeton hits', color: '#EF4444', gradient: 'from-red-500 to-amber-600' },
];

export const PRESET_ARTISTS: PresetArtist[] = [
  {
    name: 'The Weeknd',
    genre: 'R&B / Pop',
    artistId: 'UClYV6hHlupm_S_ObS1W-DYw',
    artworkUrl: 'https://lh3.googleusercontent.com/U-SAmNOu4TynE818gLCfKsuHZ0U5YNEtO9mrjSI9WCCKERs98LzrCal5kajBBTQNwdcisoB2Bn-pHp4=w544-h544-l90-rj',
  },
  {
    name: 'Travis Scott',
    genre: 'Hip-Hop',
    artistId: 'UCf_gP4AMRSgAfyzbkeS9k4g',
    artworkUrl: 'https://yt3.googleusercontent.com/r9k_FpAswxhQnl_cudiaT2ocWFccR6SzEFXgZ9a12iR5eDPSILlIL2EQewyQ-yYSt1JFyH1pqnoBXxs=w544-h544-l90-rj',
  },
  {
    name: 'Drake',
    genre: 'Hip-Hop',
    artistId: 'UCU6cE7pdJPc6DU2jSrKEsdQ',
    artworkUrl: 'https://yt3.googleusercontent.com/MxNjcRJ-uK4Xvx7u90IhEFLQM8x9LIGTA9VCKHq5U4Wn2jOgiWaMtg-qz329SIzqnCyhdCCB3MpdAGs=w544-h544-l90-rj',
  },
  {
    name: 'Taylor Swift',
    genre: 'Pop',
    artistId: 'UCPC0L1d253x-KuMNwa05TpA',
    artworkUrl: 'https://yt3.googleusercontent.com/RCpTA6EXJQyjVFDosWOKa2SMmqkua_lA9mHPDWWciLwgqpZLz-k8rXWRF_367trrQ7up9BUwCbk6kRk=w544-h544-l90-rj',
  },
  {
    name: 'Billie Eilish',
    genre: 'Alt-Pop',
    artistId: 'UCERrDZ8oN0U_n9MphMKERcg',
    artworkUrl: 'https://lh3.googleusercontent.com/tQC4rOL6xz6FhmFr0ggQExxyGbYSOsyveXVSnPBh2WjEyIzQ9pMHablLJ-0GlMBrLBlBrbWQGmzrV6KN=w544-h544-l90-rj',
  },
  {
    name: 'Kendrick Lamar',
    genre: 'Hip-Hop',
    artistId: 'UCprAFmT0C6O4X0ToEXpeFTQ',
    artworkUrl: 'https://yt3.googleusercontent.com/uB8Magh99SvDyT_mcDYeNYxlVZ_F9WN-cJtAFMHw_Q-_N_8y5-uZiay8-EZSKKloNoWxymBzVehSF4PN=w544-h544-l90-rj',
  },
  {
    name: 'Post Malone',
    genre: 'Hip-Hop / Pop',
    artistId: 'UCyD3XWRK9ko-izf2nBSFitw',
    artworkUrl: 'https://lh3.googleusercontent.com/48LfK4z6o-CCEWgHQnQfg0ltcT9tbZSN0qjSh0FSJsJI5GF48j2-pH219ciG1ML-PI80ZGD4Vz6sjg=w544-h544-l90-rj',
  },
  {
    name: 'Dua Lipa',
    genre: 'Dance / Pop',
    artistId: 'UCzVb0SIXp9q9PeKCcFjsBtA',
    artworkUrl: 'https://lh3.googleusercontent.com/aFx8s1fTuelgxONGbezmTG0EKR8r82uB5H-Q6ZJtssyCWLJWF8GfZNr4tHo84sXdFCPBKrA4R6zXOss=w544-h544-l90-rj',
  },
  {
    name: 'Coldplay',
    genre: 'Rock / Pop',
    artistId: 'UCIaFw5VBEK8qaW6nRpx_qnw',
    artworkUrl: 'https://lh3.googleusercontent.com/IOKuXtp8PCQ_Fc-vaRKm3sKIXBxFV51gZheLTH5br-YGnWHFQf_Jywcuk7wbprYRoEbQyS_XZY6-nMJX=w544-h544-l90-rj',
  },
  {
    name: 'Bruno Mars',
    genre: 'Pop / R&B',
    artistId: 'UCZn4r7heNOPY-C43YIywnVA',
    artworkUrl: 'https://lh3.googleusercontent.com/hnefGBrazRhn4Z92bdSZBUENl40ONjRiVDsmZKZh-WZ2iCKE-2c7KKR7SNcZfzLHoRyB3E6as8L87YA=w544-h544-l90-rj',
  },
  {
    name: 'Ariana Grande',
    genre: 'Pop / R&B',
    artistId: 'UC0076UMUgEng8HORUw_MYHA',
    artworkUrl: 'https://yt3.googleusercontent.com/DU6Kpr5TYKcW6QHvMnsJau5_8QSuix8LCLtf5UEaziZZdXw8SxvcxJ9YWmVIQuzhg2R-MVHYgjdGCQ=w544-h544-l90-rj',
  },
  {
    name: 'Eminem',
    genre: 'Hip-Hop',
    artistId: 'UCedvOgsKFzcK3hA5taf3KoQ',
    artworkUrl: 'https://lh3.googleusercontent.com/JFI6JZrS-Lco4UdpqDfHY5Wgwy51VXWxmNdI7bCBU5CDlIpN6WWyisZ7MGlpjbrxEGYMFpsqoR_UwcE=w544-h544-l90-rj',
  },
  {
    name: 'Kanye West',
    genre: 'Hip-Hop',
    artistId: 'UCRY5dYsbIN5TylSbd7gVnZg',
    artworkUrl: 'https://lh3.googleusercontent.com/IFlc3sf6sHV3TAZ_5vhyHQiKb9D4AdSlDkiTSgsRiicnzLASXwVr1n22EEg6Vtd2XBlyJslm8xlYiA=w544-h544-l90-rj',
  },
  {
    name: 'Adele',
    genre: 'Pop / Soul',
    artistId: 'UCRw0x9_EfawqmgDI2IgQLLg',
    artworkUrl: 'https://yt3.googleusercontent.com/uW_tkmfAQ88AINvZLR-yjUeVlzZZdyifmXZaHHcaQVDpur61duSbBjQJYTJQuansxbuEA06WhU4SlG-Z=w544-h544-l90-rj',
  },
  {
    name: 'Justin Bieber',
    genre: 'Pop',
    artistId: 'UCGvj8kfUV5Q6lzECIrGY19g',
    artworkUrl: 'https://yt3.googleusercontent.com/Be4u9Ce9rGZfFZ8ML_EQrYpMGXv8vqVUVVHS2yZaMeThrIAqx2LytIGVZxin7-blzTdUFZdtZyCDmq6D=w544-h544-l90-rj',
  },
  {
    name: 'Ed Sheeran',
    genre: 'Pop / Singer-Songwriter',
    artistId: 'UClmXPfaYhXOYsNn_QUyheWQ',
    artworkUrl: 'https://yt3.googleusercontent.com/TMbA3LImAL96nFkm5cI1x6LiEMvMbRg4IRxEeABd9qpXsfmwKhZHRD1MucnjG5QIsVEp0Vpn7h7M51FH3Q=w544-h544-l90-rj',
  },
  {
    name: 'Rihanna',
    genre: 'R&B / Pop',
    artistId: 'UCvWtix2TtWGe9kffqnwdaMw',
    artworkUrl: 'https://yt3.googleusercontent.com/CjmoWDBH4kQKmmdQwZcKF_cv4jdlhsE24OJnKMuTSw5rOFQ9mEwnqRuLb_PZgrXIVmSulZOFvuymGdw6=w544-h544-l90-rj',
  },
  {
    name: 'Olivia Rodrigo',
    genre: 'Pop / Rock',
    artistId: 'UCE5XNpliPM-SmyFEp61tL_g',
    artworkUrl: 'https://yt3.googleusercontent.com/-GF5jStF-HFmg6bWDY0j9vB--4F0GXBwoGgn5Pe0u3TlltUqFISBip0Y4mYbzYPjaFX97TmZVBw03o1h=w544-h544-l90-rj',
  },
  {
    name: 'Beyoncé',
    genre: 'R&B / Pop',
    artistId: 'UCe_vXdMrHHseZ_esYUskSBw',
    artworkUrl: 'https://yt3.googleusercontent.com/ZkeLV0pS4A8YML6r12R7PALbIFJDu7IEjCxbBLzFm61vTeWHgkpLyfTYV3NQ9rrkz2g7eZfD7IEQj6M=w544-h544-l90-rj',
  },
  {
    name: 'SZA',
    genre: 'R&B',
    artistId: 'UC6Qh3e9s9fWf0Z4yWfW_aBA',
    artworkUrl: 'https://yt3.googleusercontent.com/8YB2NaZiMvNlvdIEXdGSMfP-aTOHXAbdXy1hvZ_SVfXkTsKFy6YQlmnIk-aiDZ1ew7tNMhe3cPUow1g=w544-h544-l90-rj',
  },
  {
    name: 'Bad Bunny',
    genre: 'Latin / Reggaeton',
    artistId: 'UCiY3z8HAGD6BlSNKVn2kSvQ',
    artworkUrl: 'https://yt3.googleusercontent.com/ploU_4iWpDoJlX3FOlwwd_yQcex0I8A0_665lePXAEBbNp1zn5g42eNwg5Q7lvYc2mG2--UNIYcIhww=w544-h544-l90-rj',
  },
  {
    name: 'Don Toliver',
    genre: 'Hip-Hop / R&B',
    artistId: 'UCSzWQmDsKG37iKN2vw1G-2Q',
    artworkUrl: 'https://lh3.googleusercontent.com/iPLK-SftNUxhdxy5-_g6_o_-r6faLLlCP4UebYWQwF-r2SSsTB2iM59h7EPJTLPP8rmsCYsfD2zIb4Y=w544-h544-l90-rj',
  },
  {
    name: 'Future',
    genre: 'Hip-Hop',
    artistId: 'UCuFkV8kJ1q8T_PsmkO_Lgjw',
    artworkUrl: 'https://lh3.googleusercontent.com/x-Z35q6HsBB98J85-4oNqPnOen4pZBaNCpHawzf_ejs-pkgh6Eh3D2Fu7S1T4gEj0yWZ0c6DOAHCpA=w544-h544-l90-rj',
  },
  {
    name: 'Metro Boomin',
    genre: 'Hip-Hop / Producer',
    artistId: 'UCLt4P1n1s54t9-3665-K18w',
    artworkUrl: 'https://lh3.googleusercontent.com/hnefGBrazRhn4Z92bdSZBUENl40ONjRiVDsmZKZh-WZ2iCKE-2c7KKR7SNcZfzLHoRyB3E6as8L87YA=w544-h544-l90-rj',
  },
  {
    name: 'Playboi Carti',
    genre: 'Hip-Hop',
    artistId: 'UCmQOCz3vF-8N3HjJg5WcRtg',
    artworkUrl: 'https://lh3.googleusercontent.com/4zP2F4tN8f2M0_c8tM7qN_RrqbS1Z2-q6v8dJ-Q9k1=w544-h544-l90-rj',
  },
  {
    name: '21 Savage',
    genre: 'Hip-Hop',
    artistId: 'UCRpqQ3m2oK0hTjM6_eZ_8lg',
    artworkUrl: 'https://lh3.googleusercontent.com/jM3Q7pYk2K2X3N_q_4c-h4y6T1c8M9=w544-h544-l90-rj',
  },
];

const DEFAULT_PREFERENCES: TastePreferences = {
  favoriteArtists: [],
  favoriteGenres: ['Pop', 'Hip-Hop', 'R&B'],
  autoplayEnabled: true,
  audioQuality: 'Hi-Res Lossless',
};

class TasteService {
  private preferences: TastePreferences = DEFAULT_PREFERENCES;
  private customArtworks: Record<string, string> = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadPreferences();
    this.loadArtworks();
  }

  private loadArtworks() {
    try {
      const stored = localStorage.getItem(STORAGE_ARTIST_ARTWORKS_KEY);
      if (stored) {
        const raw = JSON.parse(stored);
        // Sanitize: Purge any accidental track/album covers (video thumbnails) from artist cache
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === 'string' && !v.includes('i.ytimg.com/vi/') && !v.includes('maxresdefault') && !v.includes('hqdefault')) {
            cleaned[k] = v;
          }
        }
        this.customArtworks = cleaned;
      }
    } catch {
      this.customArtworks = {};
    }
  }

  public setArtistArtwork(artistName: string, artworkUrl: string) {
    if (!artistName || !artworkUrl) return;
    // Reject video thumbnails as artist profile photos
    if (artworkUrl.includes('i.ytimg.com/vi/') || artworkUrl.includes('maxresdefault') || artworkUrl.includes('hqdefault')) {
      return;
    }
    this.customArtworks[artistName.trim().toLowerCase()] = artworkUrl;
    try {
      localStorage.setItem(STORAGE_ARTIST_ARTWORKS_KEY, JSON.stringify(this.customArtworks));
    } catch (err) {
      console.warn('Failed to save artist artwork:', err);
    }
  }

  public getArtistArtwork(artistName: string): string | undefined {
    if (!artistName) return undefined;
    const clean = artistName.trim().toLowerCase();
    if (this.customArtworks[clean]) return this.customArtworks[clean];
    const preset = PRESET_ARTISTS.find((p) => p.name.toLowerCase() === clean);
    return preset?.artworkUrl;
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_TASTE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Strip legacy default seeded artists so library shows 0 followed artists unless explicitly added
        const oldDefaults = ['The Weeknd', 'Drake', 'Taylor Swift', 'Don Toliver'];
        let loadedFavs: string[] = Array.isArray(parsed.favoriteArtists) ? parsed.favoriteArtists : [];
        if (
          loadedFavs.length === oldDefaults.length &&
          loadedFavs.every((a) => oldDefaults.includes(a.trim()))
        ) {
          loadedFavs = [];
        }

        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          favoriteArtists: loadedFavs,
          favoriteGenres: parsed.favoriteGenres?.length ? parsed.favoriteGenres : DEFAULT_PREFERENCES.favoriteGenres,
        };
      } else {
        this.preferences = DEFAULT_PREFERENCES;
        this.savePreferences();
      }
    } catch {
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem(STORAGE_TASTE_KEY, JSON.stringify(this.preferences));
      this.notify();
    } catch (err) {
      console.warn('Failed to save taste preferences:', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('TasteService listener error:', err);
      }
    });
  }

  public getPreferences(): TastePreferences {
    return { ...this.preferences };
  }

  public setFavoriteArtists(artists: string[]): void {
    this.preferences.favoriteArtists = Array.isArray(artists) ? artists : [];
    this.savePreferences();
  }

  public isFavoriteArtist(artistName: string): boolean {
    if (!artistName) return false;
    const clean = artistName.trim().toLowerCase();
    return this.preferences.favoriteArtists.some(
      (a) => a.trim().toLowerCase() === clean || clean.includes(a.trim().toLowerCase())
    );
  }

  public toggleFavoriteArtist(artistName: string, artworkUrl?: string): boolean {
    if (!artistName) return false;
    const clean = artistName.trim();
    if (artworkUrl) {
      this.setArtistArtwork(clean, artworkUrl);
    }
    const exists = this.isFavoriteArtist(clean);
    if (exists) {
      this.preferences.favoriteArtists = this.preferences.favoriteArtists.filter(
        (a) => a.trim().toLowerCase() !== clean.toLowerCase()
      );
    } else {
      this.preferences.favoriteArtists = [clean, ...this.preferences.favoriteArtists];
    }
    this.savePreferences();
    return !exists;
  }

  public toggleFavoriteGenre(genreName: string): boolean {
    if (!genreName) return false;
    const clean = genreName.trim();
    const exists = this.preferences.favoriteGenres.includes(clean);
    if (exists) {
      // Keep at least 1 genre
      if (this.preferences.favoriteGenres.length > 1) {
        this.preferences.favoriteGenres = this.preferences.favoriteGenres.filter((g) => g !== clean);
      }
    } else {
      this.preferences.favoriteGenres = [...this.preferences.favoriteGenres, clean];
    }
    this.savePreferences();
    return !exists;
  }

  public setAutoplay(enabled: boolean) {
    this.preferences.autoplayEnabled = enabled;
    this.savePreferences();
  }

  public setAudioQuality(quality: 'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos') {
    this.preferences.audioQuality = quality;
    this.savePreferences();
  }

  /**
   * Automatically learn from user likes and plays:
   * When a user likes a track or replays an artist, register that artist in taste!
   */
  public registerUserAction(track: Track, action: 'like' | 'play') {
    if (!track.artist) return;
    const artist = track.artist.split(',')[0].split('&')[0].split('feat.')[0].trim();
    if (!artist || artist.length < 2) return;

    if (action === 'like') {
      if (!this.isFavoriteArtist(artist)) {
        this.toggleFavoriteArtist(artist, track.artworkUrl);
      }
    }
  }
}

export const tasteService = new TasteService();
