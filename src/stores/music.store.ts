import { createStore, computed, signal, Signal, batch } from '@canvapps';

/**
 * Timed Lyric line structure.
 */
export interface LyricLine {
  time: number; // in seconds
  text: string;
}

/**
 * Music Track model.
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  cover: string;
  themeColor: string; // dominant hex
  accentColor: string;
  gradient: [string, string];
  genre: string;
  year: number;
  bpm: number;
  lyrics: LyricLine[];
  melodyNotes: number[]; // Frequencies for procedural synth
  bassNotes: number[];
  chordPads: number[][];
}

/**
 * Music Player global reactive state.
 */
export interface MusicPlayerState {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  likedTrackIds: string[];
  activeTab: 'player' | 'queue' | 'lyrics' | 'fx';
  searchQuery: string;
  activeGenre: string;
  audioEffectPreset: 'normal' | 'bass_boost' | 'lofi' | 'synth_reverb';
}

/**
 * Curated Catalog of tracks with vibrant Spotify aesthetics and procedural sound synthesis.
 */
export const defaultTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Odyssey',
    artist: 'Cyberwave Orchestra',
    album: 'Retrograde Dreams',
    duration: 214,
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    themeColor: '#1db954', // Spotify Green
    accentColor: '#1ed760',
    gradient: ['#0d381e', '#09150f'],
    genre: 'Synthwave',
    year: 2026,
    bpm: 120,
    melodyNotes: [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440],
    bassNotes: [110, 110, 130.81, 146.83, 110, 98, 110, 130.81],
    chordPads: [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [220, 261.63, 329.63],
    ],
    lyrics: [
      { time: 0, text: '♪ (Intro: Glowing Analog Synthesizers)' },
      { time: 8, text: 'Cruising through the neon rain' },
      { time: 18, text: 'Reflections dancing on the window pane' },
      { time: 28, text: 'Electric pulses guide the speed of light' },
      { time: 38, text: 'We are the shadows of the cyber night' },
      { time: 48, text: 'Hold the frequency, never let it fade' },
      { time: 58, text: 'Inside the synthetic world we made' },
      { time: 72, text: '♪ (Liquid Bassline Drop)' },
      { time: 90, text: 'Digital horizons stretching far away' },
      { time: 108, text: 'Chasing the signals of yesterday' },
      { time: 130, text: 'Neon Odyssey... we ride alone' },
      { time: 155, text: 'Turning circuits into home' },
      { time: 180, text: '♪ (Outro: Sub-bass resonance fading)' },
    ],
  },
  {
    id: 'track-2',
    title: 'Liquid Horizons',
    artist: 'Aura Flow',
    album: 'Deep Submersion',
    duration: 198,
    cover: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
    themeColor: '#06b6d4', // Cyan
    accentColor: '#38bdf8',
    gradient: ['#083344', '#04151f'],
    genre: 'Ambient Chill',
    year: 2025,
    bpm: 96,
    melodyNotes: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392],
    bassNotes: [130.81, 130.81, 164.81, 174.61, 130.81, 116.54, 130.81, 164.81],
    chordPads: [
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
    ],
    lyrics: [
      { time: 0, text: '♪ (Subtle Ocean Waves & Shimmering Reverb)' },
      { time: 10, text: 'Floating weightless in the blue' },
      { time: 22, text: 'Every wave returning back to you' },
      { time: 35, text: 'Liquid horizons where the sun goes down' },
      { time: 48, text: 'Silence deeper than the noisy town' },
      { time: 64, text: 'Breathe in the calm, let time rewind' },
      { time: 80, text: 'Leave all the turbulent thoughts behind' },
      { time: 102, text: '♪ (Ambient Pad Swell)' },
      { time: 125, text: 'Drifting softly into endless space' },
      { time: 150, text: 'Found my peace in this quiet place' },
      { time: 175, text: '♪ (Gentle fadeout)' },
    ],
  },
  {
    id: 'track-3',
    title: 'Velvet Midnight',
    artist: 'Luna Nocturne',
    album: 'Café de Tokyo',
    duration: 176,
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    themeColor: '#ec4899', // Pink
    accentColor: '#f472b6',
    gradient: ['#3b0724', '#15030e'],
    genre: 'Lo-Fi Jazz',
    year: 2026,
    bpm: 84,
    melodyNotes: [392, 440, 493.88, 587.33, 523.25, 440, 392, 329.63],
    bassNotes: [98, 98, 123.47, 130.81, 98, 87.31, 98, 123.47],
    chordPads: [
      [196, 246.94, 293.66, 349.23],
      [174.61, 220, 261.63, 311.13],
      [164.81, 207.65, 246.94, 293.66],
      [196, 246.94, 293.66, 349.23],
    ],
    lyrics: [
      { time: 0, text: '♪ (Vinyl Crackle & Mellow Rhodes Chords)' },
      { time: 9, text: 'Midnight coffee on a rainy street' },
      { time: 20, text: 'Ticking clocks and steady Lo-Fi beat' },
      { time: 32, text: 'Velvet warmth beneath the amber light' },
      { time: 45, text: 'Writing melodies through the quiet night' },
      { time: 60, text: 'Lost in sketches and old paper pages' },
      { time: 76, text: 'Time stands still through all the stages' },
      { time: 95, text: '♪ (Warm Saxophone Solo)' },
      { time: 120, text: 'Close your eyes and let the rhythm stay' },
      { time: 145, text: 'Until the early light of day' },
      { time: 165, text: '♪ (Vinyl fade)' },
    ],
  },
  {
    id: 'track-4',
    title: 'Solar Flare Groove',
    artist: 'Cosmic Drift',
    album: 'Heliosphere',
    duration: 230,
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    themeColor: '#f59e0b', // Amber / Gold
    accentColor: '#fbbf24',
    gradient: ['#3b1f04', '#150901'],
    genre: 'Funk House',
    year: 2026,
    bpm: 124,
    melodyNotes: [587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 440],
    bassNotes: [146.83, 146.83, 174.61, 196, 146.83, 130.81, 146.83, 174.61],
    chordPads: [
      [293.66, 369.99, 440],
      [261.63, 329.63, 392],
      [220, 277.18, 329.63],
      [293.66, 369.99, 440],
    ],
    lyrics: [
      { time: 0, text: '♪ (Funky Slap Bass & Hi-Hat Intro)' },
      { time: 12, text: 'Feel the gravity starting to break' },
      { time: 24, text: 'Every step is a jump that we make' },
      { time: 36, text: 'Solar flare burning high and bright' },
      { time: 48, text: 'Funk energy powering through the night' },
      { time: 62, text: 'Get up, move up, catch the solar ray!' },
      { time: 78, text: 'Nothing standing in our way' },
      { time: 96, text: '♪ (Brass Section Blast)' },
      { time: 120, text: 'Stardust glowing in your eyes' },
      { time: 144, text: 'Dancing under extraterrestrial skies' },
      { time: 172, text: 'Higher, faster, feeling bold' },
      { time: 200, text: 'Everything we touch turns gold' },
      { time: 220, text: '♪ (Outro Groove)' },
    ],
  },
  {
    id: 'track-5',
    title: 'Starlight Requiem',
    artist: 'Astral Echoes',
    album: 'Singularity',
    duration: 205,
    cover: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    themeColor: '#8b5cf6', // Violet
    accentColor: '#a78bfa',
    gradient: ['#28114f', '#0c051a'],
    genre: 'Future Bass',
    year: 2026,
    bpm: 130,
    melodyNotes: [659.25, 783.99, 880, 987.77, 880, 783.99, 659.25, 523.25],
    bassNotes: [164.81, 164.81, 196, 220, 164.81, 146.83, 164.81, 196],
    chordPads: [
      [329.63, 392, 493.88],
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [329.63, 392, 493.88],
    ],
    lyrics: [
      { time: 0, text: '♪ (Chamber Strings & Arpeggio)' },
      { time: 14, text: 'When the constellations fall asleep' },
      { time: 28, text: 'Secrets that the universe will keep' },
      { time: 42, text: 'Echoes across the dark expanse' },
      { time: 56, text: 'Giving stars a second chance' },
      { time: 74, text: '♪ (Future Bass Supersaw Drop)' },
      { time: 98, text: 'Hold on tight to this harmonic sound' },
      { time: 122, text: 'Where no gravity is found' },
      { time: 150, text: 'Starlight Requiem shining through' },
      { time: 180, text: 'Lighting up the path for you' },
      { time: 198, text: '♪ (Crystalline Arp fade)' },
    ],
  },
];

/**
 * Genres list for filter pills.
 */
export const musicGenres = ['All', 'Synthwave', 'Ambient Chill', 'Lo-Fi Jazz', 'Funk House', 'Future Bass'];

/**
 * Web Audio Procedural Synth & Live Frequency Engine.
 * Plays high-fidelity synthesis without external audio files/CORS dependency.
 */
class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private timerId: any = null;
  private stepIndex = 0;
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.filterNode = this.ctx.createBiquadFilter();
      this.analyserNode = this.ctx.createAnalyser();

      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 16000;

      this.masterGain.gain.value = 0.6;

      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch {
      // Audio context may require user gesture
    }
  }

  public setVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public setPreset(preset: 'normal' | 'bass_boost' | 'lofi' | 'synth_reverb'): void {
    if (!this.filterNode || !this.ctx) return;

    if (preset === 'bass_boost') {
      this.filterNode.type = 'lowshelf';
      this.filterNode.frequency.setTargetAtTime(200, this.ctx.currentTime, 0.05);
      this.filterNode.gain.setTargetAtTime(8, this.ctx.currentTime, 0.05);
    } else if (preset === 'lofi') {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setTargetAtTime(2800, this.ctx.currentTime, 0.05);
    } else {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setTargetAtTime(18000, this.ctx.currentTime, 0.05);
    }
  }

  public startPlayback(track: Track, onTick: (secDelta: number) => void): void {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopPlayback();

    const bpm = track.bpm || 110;
    const intervalMs = (60 / bpm) * 250; // sixteenth/eighth notes

    this.timerId = setInterval(() => {
      this.triggerStep(track);
      onTick(intervalMs / 1000);
    }, intervalMs);
  }

  public stopPlayback(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private triggerStep(track: Track): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = track.melodyNotes;
    const bass = track.bassNotes;
    const pads = track.chordPads;

    // 1. Lead melody note
    const melFreq = notes[this.stepIndex % notes.length];
    if (melFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = track.genre === 'Synthwave' ? 'sawtooth' : track.genre === 'Lo-Fi Jazz' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(melFreq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    }

    // 2. Bassline pulse
    if (this.stepIndex % 2 === 0) {
      const bassFreq = bass[(this.stepIndex / 2) % bass.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.24, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.55);
    }

    // 3. Ambient Chord Pad on measure starts
    if (this.stepIndex % 8 === 0) {
      const padChord = pads[(this.stepIndex / 8) % pads.length];
      padChord.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const padOsc = this.ctx.createOscillator();
        const padGain = this.ctx.createGain();

        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(freq, now);

        padGain.gain.setValueAtTime(0.08, now);
        padGain.gain.linearRampToValueAtTime(0.12, now + 0.4);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        padOsc.connect(padGain);
        padGain.connect(this.masterGain);

        padOsc.start(now);
        padOsc.stop(now + 1.9);
      });
    }

    // 4. Subtle percussive click/hi-hat
    if (this.stepIndex % 2 === 1) {
      const noiseOsc = this.ctx.createOscillator();
      const noiseGain = this.ctx.createGain();
      noiseOsc.type = 'square';
      noiseOsc.frequency.setValueAtTime(6000 + Math.random() * 2000, now);
      noiseGain.gain.setValueAtTime(0.025, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      noiseOsc.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseOsc.start(now);
      noiseOsc.stop(now + 0.05);
    }

    this.stepIndex = (this.stepIndex + 1) % 64;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(16).fill(0);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }
}

export const audioEngine = new WebAudioEngine();

/**
 * Initial reactive state snapshot.
 */
const initialMusicState: MusicPlayerState = {
  tracks: defaultTracks,
  currentTrackIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: defaultTracks[0].duration,
  volume: 0.85,
  isMuted: false,
  shuffle: false,
  repeatMode: 'all',
  likedTrackIds: ['track-1', 'track-3'],
  activeTab: 'player',
  searchQuery: '',
  activeGenre: 'All',
  audioEffectPreset: 'normal',
};

/**
 * Global In-Memory Reactive Music Store.
 */
export const musicStore = createStore<MusicPlayerState>(initialMusicState, {
  name: 'canvapps_music_player',
  persist: false,
});

/**
 * Current active track signal.
 */
export const currentTrack = computed(() => {
  const state = musicStore.state;
  return state.tracks[state.currentTrackIndex] || state.tracks[0];
});

/**
 * Filtered playlist queue based on search & genre.
 */
export const filteredTracks = computed(() => {
  const state = musicStore.state;
  const q = state.searchQuery.trim().toLowerCase();
  const genre = state.activeGenre;

  return state.tracks.filter((t) => {
    const matchGenre = genre === 'All' || t.genre === genre;
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q);
    return matchGenre && matchSearch;
  });
});

/**
 * Active lyric line based on current track and playback second.
 */
export const activeLyricIndex = computed(() => {
  const track = currentTrack.value;
  const time = musicStore.state.currentTime;
  if (!track || !track.lyrics.length) return 0;

  for (let i = track.lyrics.length - 1; i >= 0; i--) {
    if (time >= track.lyrics[i].time) {
      return i;
    }
  }
  return 0;
});

/**
 * Formats seconds into mm:ss string.
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Reactive Real-Time 16-band Audio Frequency Spectrum Signal (60 FPS)
 */
export const audioFrequencies = signal<number[]>([
  10, 18, 28, 42, 54, 46, 34, 22, 28, 44, 58, 48, 36, 24, 16, 10,
]);

let visualizerRaf: any = null;

function runVisualizerLoop() {
  if (typeof window === 'undefined') return;

  if (musicStore.state.isPlaying) {
    const rawData = audioEngine.getFrequencyData();
    const barsCount = 16;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const newBars: number[] = [];

    for (let i = 0; i < barsCount; i++) {
      const byteVal = rawData[i] || 0;
      // Dynamic frequency wave bounce with harmonic energy
      const beat = Math.sin(now * 0.009 + i * 0.42) * 15 + Math.sin(now * 0.016 + i * 0.75) * 9;
      const energy = (byteVal / 255) * 38;
      const height = Math.round(Math.max(6, Math.min(68, energy + beat + 24)));
      newBars.push(height);
    }

    audioFrequencies.value = newBars;
    visualizerRaf = requestAnimationFrame(runVisualizerLoop);
  } else {
    // Smooth decay when paused
    const current = audioFrequencies.value;
    let hasMotion = false;
    const decayed = current.map((v) => {
      const nextVal = Math.max(6, v * 0.86);
      if (nextVal > 6.2) hasMotion = true;
      return Math.round(nextVal);
    });
    audioFrequencies.value = decayed;
    if (hasMotion) {
      visualizerRaf = requestAnimationFrame(runVisualizerLoop);
    }
  }
}

export function startVisualizer(): void {
  if (typeof window !== 'undefined') {
    cancelAnimationFrame(visualizerRaf);
    visualizerRaf = requestAnimationFrame(runVisualizerLoop);
  }
}

// ---------------------------------------------------------------------------
// Store Actions
// ---------------------------------------------------------------------------

/**
 * Starts playback or toggles play/pause.
 */
export function togglePlay(): void {
  const isPlaying = musicStore.state.isPlaying;
  if (isPlaying) {
    pauseTrack();
  } else {
    resumeTrack();
  }
}

export function resumeTrack(): void {
  musicStore.update((prev) => ({ ...prev, isPlaying: true }));
  startVisualizer();
  const track = currentTrack.value;
  audioEngine.startPlayback(track, (deltaSec) => {
    musicStore.update((prev) => {
      const nextTime = prev.currentTime + deltaSec;
      if (nextTime >= prev.duration) {
        if (prev.repeatMode === 'one') {
          return { ...prev, currentTime: 0 };
        } else {
          // Play next track
          setTimeout(() => nextTrack(), 0);
          return { ...prev, currentTime: prev.duration };
        }
      }
      return { ...prev, currentTime: nextTime };
    });
  });
}

export function pauseTrack(): void {
  musicStore.update((prev) => ({ ...prev, isPlaying: false }));
  audioEngine.stopPlayback();
  startVisualizer();
}

/**
 * Plays a specific track by its index.
 */
export function playTrack(index: number): void {
  const tracks = musicStore.state.tracks;
  const clampedIndex = Math.max(0, Math.min(tracks.length - 1, index));
  const track = tracks[clampedIndex];

  musicStore.update((prev) => ({
    ...prev,
    currentTrackIndex: clampedIndex,
    currentTime: 0,
    duration: track.duration,
    isPlaying: true,
  }));

  startVisualizer();

  audioEngine.startPlayback(track, (deltaSec) => {
    musicStore.update((prev) => {
      const nextTime = prev.currentTime + deltaSec;
      if (nextTime >= prev.duration) {
        if (prev.repeatMode === 'one') {
          return { ...prev, currentTime: 0 };
        } else {
          setTimeout(() => nextTrack(), 0);
          return { ...prev, currentTime: prev.duration };
        }
      }
      return { ...prev, currentTime: nextTime };
    });
  });
}

/**
 * Skips to the next track.
 */
export function nextTrack(): void {
  const state = musicStore.state;
  let nextIdx = state.currentTrackIndex + 1;

  if (state.shuffle) {
    nextIdx = Math.floor(Math.random() * state.tracks.length);
  } else if (nextIdx >= state.tracks.length) {
    if (state.repeatMode === 'off') {
      pauseTrack();
      return;
    }
    nextIdx = 0;
  }

  playTrack(nextIdx);
}

/**
 * Skips to previous track (or restarts if past 3 seconds).
 */
export function prevTrack(): void {
  const state = musicStore.state;
  if (state.currentTime > 3) {
    seekTrack(0);
    return;
  }

  let prevIdx = state.currentTrackIndex - 1;
  if (prevIdx < 0) {
    prevIdx = state.tracks.length - 1;
  }
  playTrack(prevIdx);
}

/**
 * Seeks to a specific timestamp in seconds.
 */
export function seekTrack(timeInSeconds: number): void {
  const dur = musicStore.state.duration;
  const clamped = Math.max(0, Math.min(dur, timeInSeconds));
  musicStore.update((prev) => ({ ...prev, currentTime: clamped }));
}

/**
 * Adjusts playback volume (0..1).
 */
export function setVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  musicStore.update((prev) => ({ ...prev, volume: clamped, isMuted: clamped === 0 }));
  audioEngine.setVolume(clamped);
}

/**
 * Toggles audio mute.
 */
export function toggleMute(): void {
  const isMuted = !musicStore.state.isMuted;
  musicStore.update((prev) => ({ ...prev, isMuted }));
  audioEngine.setVolume(isMuted ? 0 : musicStore.state.volume);
}

/**
 * Toggles shuffle mode.
 */
export function toggleShuffle(): void {
  musicStore.update((prev) => ({ ...prev, shuffle: !prev.shuffle }));
}

/**
 * Cycles repeat mode: off -> all -> one -> off.
 */
export function toggleRepeat(): void {
  const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
  const curr = musicStore.state.repeatMode;
  const next = modes[(modes.indexOf(curr) + 1) % modes.length];
  musicStore.update((prev) => ({ ...prev, repeatMode: next }));
}

/**
 * Toggles like status on a track.
 */
export function toggleLikeTrack(trackId: string): void {
  musicStore.update((prev) => {
    const isLiked = prev.likedTrackIds.includes(trackId);
    const likedTrackIds = isLiked
      ? prev.likedTrackIds.filter((id) => id !== trackId)
      : [...prev.likedTrackIds, trackId];
    return { ...prev, likedTrackIds };
  });
}

/**
 * Sets active tab view (player, queue, lyrics, fx).
 */
export function setActiveTab(tab: 'player' | 'queue' | 'lyrics' | 'fx'): void {
  musicStore.update((prev) => ({ ...prev, activeTab: tab }));
}

/**
 * Sets genre filter.
 */
export function setActiveGenre(genre: string): void {
  musicStore.update((prev) => ({ ...prev, activeGenre: genre }));
}

/**
 * Sets audio effect preset.
 */
export function setAudioPreset(preset: 'normal' | 'bass_boost' | 'lofi' | 'synth_reverb'): void {
  musicStore.update((prev) => ({ ...prev, audioEffectPreset: preset }));
  audioEngine.setPreset(preset);
}
