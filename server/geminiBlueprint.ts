import { GoogleGenAI } from '@google/genai';

export interface SongAudioBlueprint {
  energy: number;
  danceability: number;
  acousticness: number;
  valence: number;
  mood_tags: string[];
  micro_genres: string[];
}

const blueprintCache = new Map<string, SongAudioBlueprint>();

export const AUDIO_BLUEPRINT_SYSTEM_PROMPT = `You are an expert music recommendation algorithm and data engineer. Your task is to analyze the provided track details and output a structured JSON object representing its audio blueprint and cultural taxonomy. 

Analyze the track across these specific dimensions, scoring numeric fields strictly between 0.0 (lowest) and 1.0 (highest):

1. energy: Intensity, activity, and loudness.
2. danceability: Rhythm stability, tempo strength, and beat regularity.
3. acousticness: Probability that the track uses non-electronic instruments.
4. valence: Musical positiveness / emotional warmth (0.0 = sad/dark, 1.0 = joyful/bright).
5. mood_tags: Array of 3-5 emotional adjectives describing the track.
6. micro_genres: Array of 2-3 highly specific genre classifications.

Strict Output Rule: Return ONLY valid, minified JSON matching the exact schema. Do not include markdown formatting, backticks (\`\`\`), or conversational text.`;

export async function analyzeTrackBlueprint(
  title: string,
  artist: string,
  genre: string = 'Pop',
  year: string = ''
): Promise<SongAudioBlueprint> {
  const cacheKey = `${artist} - ${title}`.toLowerCase().trim();
  if (blueprintCache.has(cacheKey)) {
    return blueprintCache.get(cacheKey)!;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return a mathematically sensible fallback estimation based on common genre characteristics
    const fallback = generateFallbackBlueprint(genre);
    blueprintCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const userContent = `Artist: ${artist}
Track Title: ${title}
Primary Genre: ${genre}
Year: ${year || '2024'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userContent,
      config: {
        systemInstruction: AUDIO_BLUEPRINT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);

    const validated: SongAudioBlueprint = {
      energy: typeof parsed.energy === 'number' ? Math.max(0, Math.min(1, parsed.energy)) : 0.6,
      danceability: typeof parsed.danceability === 'number' ? Math.max(0, Math.min(1, parsed.danceability)) : 0.65,
      acousticness: typeof parsed.acousticness === 'number' ? Math.max(0, Math.min(1, parsed.acousticness)) : 0.25,
      valence: typeof parsed.valence === 'number' ? Math.max(0, Math.min(1, parsed.valence)) : 0.55,
      mood_tags: Array.isArray(parsed.mood_tags) && parsed.mood_tags.length > 0 ? parsed.mood_tags.slice(0, 5) : ['melodic', 'immersive', 'rhythmic'],
      micro_genres: Array.isArray(parsed.micro_genres) && parsed.micro_genres.length > 0 ? parsed.micro_genres.slice(0, 4) : [genre.toLowerCase(), 'contemporary'],
    };

    blueprintCache.set(cacheKey, validated);
    return validated;
  } catch (err: any) {
    console.warn(`[Gemini Blueprint Error] for "${title}" by "${artist}":`, err?.message);
    const fallback = generateFallbackBlueprint(genre);
    blueprintCache.set(cacheKey, fallback);
    return fallback;
  }
}

function generateFallbackBlueprint(genre: string): SongAudioBlueprint {
  const g = (genre || '').toLowerCase();
  if (g.includes('hip-hop') || g.includes('rap') || g.includes('trap')) {
    return {
      energy: 0.78,
      danceability: 0.82,
      acousticness: 0.12,
      valence: 0.62,
      mood_tags: ['energetic', 'confident', 'heavy-hitting', 'urban'],
      micro_genres: ['hip-hop', 'trap', 'urban-contemporary'],
    };
  }
  if (g.includes('r&b') || g.includes('soul')) {
    return {
      energy: 0.52,
      danceability: 0.68,
      acousticness: 0.35,
      valence: 0.58,
      mood_tags: ['sensual', 'smooth', 'soulful', 'intimate'],
      micro_genres: ['contemporary-r&b', 'neo-soul', 'alt-r&b'],
    };
  }
  if (g.includes('rock') || g.includes('metal')) {
    return {
      energy: 0.88,
      danceability: 0.48,
      acousticness: 0.08,
      valence: 0.45,
      mood_tags: ['intense', 'rebellious', 'raw', 'cathartic'],
      micro_genres: ['modern-rock', 'alt-rock', 'indie-rock'],
    };
  }
  if (g.includes('electronic') || g.includes('dance') || g.includes('edm')) {
    return {
      energy: 0.91,
      danceability: 0.89,
      acousticness: 0.05,
      valence: 0.72,
      mood_tags: ['euphoric', 'pulsating', 'driving', 'club'],
      micro_genres: ['dance-pop', 'house', 'electronic'],
    };
  }
  return {
    energy: 0.62,
    danceability: 0.70,
    acousticness: 0.25,
    valence: 0.65,
    mood_tags: ['catchy', 'melodic', 'vibrant', 'feel-good'],
    micro_genres: ['pop', 'contemporary-pop', 'indie-pop'],
  };
}
