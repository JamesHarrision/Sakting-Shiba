import type { GameEventBus } from "../events/GameEventBus";

type SfxName = "jump" | "land" | "coin" | "hit" | "power";
export const MUSIC_LOOP_SECONDS = 20;

/**
 * Real audio files (drop in src/assets/audio/). Vite's import.meta.glob only
 * contains files that exist, so a missing sound silently keeps the procedural
 * fallback with zero console noise.
 */
const AUDIO_URLS = import.meta.glob("/src/assets/audio/**/*.ogg", {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

const MUSIC_URL = AUDIO_URLS["/src/assets/audio/music.ogg"];
const SFX_URLS: Readonly<Partial<Record<SfxName, string>>> = Object.freeze({
  jump: AUDIO_URLS["/src/assets/audio/sfx/jump.ogg"],
  coin: AUDIO_URLS["/src/assets/audio/sfx/coin.ogg"],
  hit: AUDIO_URLS["/src/assets/audio/sfx/hurt.ogg"],
  power: AUDIO_URLS["/src/assets/audio/sfx/power.ogg"]
  // land: no file provided -> procedural blip
});

export class GameAudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private musicSource?: AudioBufferSourceNode;
  private readonly sfxBuffers = new Map<SfxName, AudioBuffer>();
  private muted = false;
  private paused = true;
  /** 0..1 settings-slider values; scaled by the base gain below. */
  private musicVolume = 1;
  private sfxVolume = 1;
  private static readonly MUSIC_BASE_GAIN = 0.16;
  private static readonly SFX_BASE_GAIN = 0.3;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(eventBus: GameEventBus) {
    this.unsubscribe.push(
      eventBus.on("PLAYER_JUMPED", () => this.play("jump")),
      eventBus.on("PLAYER_LANDED", () => this.play("land")),
      eventBus.on("COIN_COLLECTED", () => this.play("coin")),
      eventBus.on("PLAYER_HIT", () => this.play("hit")),
      eventBus.on("POWERUP_ACTIVATED", () => this.play("power"))
    );
  }

  get isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    if (!this.context) await this.initialize();
    if (this.context?.state === "suspended") await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.78, this.context.currentTime, 0.025);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.context || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(
      paused ? 0 : this.musicVolume * GameAudioManager.MUSIC_BASE_GAIN,
      this.context.currentTime,
      0.12
    );
  }

  /** 0..1 background-music volume (kept independent of mute). */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    if (!this.context || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(
      this.paused ? 0 : this.musicVolume * GameAudioManager.MUSIC_BASE_GAIN,
      this.context.currentTime,
      0.06
    );
  }

  /** 0..1 SFX volume (kept independent of mute). */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
    if (!this.context || !this.sfxGain) return;
    this.sfxGain.gain.setTargetAtTime(
      this.sfxVolume * GameAudioManager.SFX_BASE_GAIN,
      this.context.currentTime,
      0.06
    );
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.unsubscribe.length = 0;
    this.musicSource?.stop();
    void this.context?.close();
    this.context = undefined;
  }

  private async initialize(): Promise<void> {
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    this.context = new AudioContextCtor();
    this.master = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.78;
    this.musicGain.gain.value =
      this.paused ? 0 : this.musicVolume * GameAudioManager.MUSIC_BASE_GAIN;
    this.sfxGain.gain.value = this.sfxVolume * GameAudioManager.SFX_BASE_GAIN;
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.context.destination);

    // Prefer the real music loop; fall back to the procedural loop when absent.
    const musicBuffer = await loadAudioBuffer(this.context, MUSIC_URL);
    if (musicBuffer) {
      this.startBufferLoop(musicBuffer);
    } else {
      this.startProceduralMusic();
    }

    // Warm up real SFX buffers; absent files keep the procedural fallback.
    for (const [name, url] of Object.entries(SFX_URLS) as Array<[SfxName, string | undefined]>) {
      if (!url) continue;
      const buffer = await loadAudioBuffer(this.context, url);
      if (buffer) this.sfxBuffers.set(name, buffer);
    }
  }

  private startBufferLoop(buffer: AudioBuffer): void {
    if (!this.context || !this.musicGain) return;
    this.musicSource?.stop();
    this.musicSource = this.context.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
  }

  private startProceduralMusic(): void {
    if (!this.context || !this.musicGain) return;
    const musicSampleRate = Math.min(this.context.sampleRate, 22050);
    const samples = buildMusicSamples(musicSampleRate);
    const buffer = this.context.createBuffer(1, samples.length, musicSampleRate);
    buffer.getChannelData(0).set(samples);
    this.musicSource = this.context.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
  }

  private play(name: SfxName): void {
    if (!this.context || !this.sfxGain || this.muted) return;

    const buffer = this.sfxBuffers.get(name);
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.sfxGain);
      source.start();
      return;
    }

    this.playProcedural(name);
  }

  private playProcedural(name: SfxName): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const settings: Record<SfxName, [number, number, OscillatorType, number]> = {
      jump: [420, 760, "sine", 0.16],
      land: [150, 78, "triangle", 0.12],
      coin: [880, 1320, "sine", 0.12],
      hit: [120, 42, "sawtooth", 0.28],
      power: [330, 990, "square", 0.32]
    };
    const [from, to, type, duration] = settings[name];
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    envelope.gain.setValueAtTime(name === "hit" ? 0.5 : 0.38, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

async function loadAudioBuffer(
  context: AudioContext,
  url: string | undefined
): Promise<AudioBuffer | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

export function buildMusicSamples(
  sampleRate: number,
  durationSeconds = MUSIC_LOOP_SECONDS
): Float32Array {
  const safeRate = Math.max(8000, Math.floor(sampleRate));
  const length = safeRate * durationSeconds;
  const output = new Float32Array(length);
  const beatSeconds = 60 / 96;
  const barSeconds = beatSeconds * 4;
  const roots = [98, 110, 82.41, 73.42, 98, 123.47, 82.41, 73.42];
  const chordThirds = [1.1892, 1.1892, 1.2, 1.2, 1.1892, 1.2, 1.2, 1.2];
  let smoothedMix = 0;
  let smoothedNoise = 0;

  for (let index = 0; index < length; index += 1) {
    const time = index / safeRate;
    const beatIndex = Math.floor(time / beatSeconds);
    const beatTime = time - beatIndex * beatSeconds;
    const beatProgress = beatTime / beatSeconds;
    const barIndex = Math.floor(time / barSeconds);
    const barTime = time - barIndex * barSeconds;
    const barProgress = barTime / barSeconds;
    const rootIndex = barIndex % roots.length;
    const root = roots[rootIndex];
    const attack = 1 - Math.exp(-beatTime * 55);

    const kickEnabled = beatIndex % 4 === 0 || beatIndex % 4 === 2;
    const kick = kickEnabled
      ? Math.sin(2 * Math.PI * 52 * beatTime) *
        attack *
        Math.exp(-beatTime * 12)
      : 0;

    const bassEnvelope = attack * Math.exp(-beatProgress * 2.4);
    const bass =
      Math.sin(2 * Math.PI * root * beatTime) * bassEnvelope;

    const whiteNoise = deterministicNoise(index);
    smoothedNoise += (whiteNoise - smoothedNoise) * 0.08;
    const highNoise = whiteNoise - smoothedNoise;
    const snare = beatIndex % 4 === 1 || beatIndex % 4 === 3
      ? highNoise * attack * Math.exp(-beatTime * 16)
      : 0;

    const halfBeatTime = time % (beatSeconds / 2);
    const hatAttack = 1 - Math.exp(-halfBeatTime * 180);
    const hat =
      highNoise * hatAttack * Math.exp(-halfBeatTime * 52);

    const padEnvelope = Math.sin(Math.PI * barProgress) ** 2;
    const third = chordThirds[rootIndex];
    const pad =
      (Math.sin(2 * Math.PI * root * 2 * barTime) +
        0.65 * Math.sin(2 * Math.PI * root * 2 * third * barTime) +
        0.5 * Math.sin(2 * Math.PI * root * 3 * barTime)) *
      padEnvelope;

    const pluckEnabled = beatIndex % 8 === 6;
    const pluck = pluckEnabled
      ? Math.sin(2 * Math.PI * root * 4 * beatTime) *
        attack *
        Math.exp(-beatTime * 7)
      : 0;

    const mix =
      kick * 0.2 +
      bass * 0.15 +
      snare * 0.07 +
      hat * 0.022 +
      pad * 0.045 +
      pluck * 0.025;
    smoothedMix += (mix - smoothedMix) * 0.2;
    output[index] = Math.tanh((mix * 0.7 + smoothedMix * 0.3) * 1.35) * 0.72;
  }

  return output;
}

function deterministicNoise(index: number): number {
  let value = Math.imul(index + 1, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}
