import type { GameEventBus } from "../events/GameEventBus";

type SfxName = "jump" | "land" | "coin" | "hit" | "power";

export class GameAudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private musicSource?: AudioBufferSourceNode;
  private muted = false;
  private paused = true;
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
    if (!this.context) this.initialize();
    if (this.context?.state === "suspended") await this.context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.82, this.context.currentTime, 0.025);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.context || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(paused ? 0.045 : 0.2, this.context.currentTime, 0.12);
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.unsubscribe.length = 0;
    this.musicSource?.stop();
    void this.context?.close();
    this.context = undefined;
  }

  private initialize(): void {
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    this.context = new AudioContextCtor();
    this.master = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.82;
    this.musicGain.gain.value = this.paused ? 0.045 : 0.2;
    this.sfxGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.context.destination);

    const samples = buildMusicSamples(this.context.sampleRate);
    const buffer = this.context.createBuffer(1, samples.length, this.context.sampleRate);
    buffer.getChannelData(0).set(samples);
    this.musicSource = this.context.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
  }

  private play(name: SfxName): void {
    if (!this.context || !this.sfxGain || this.muted) return;
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
    envelope.gain.setValueAtTime(name === "hit" ? 0.7 : 0.42, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

export function buildMusicSamples(
  sampleRate: number,
  durationSeconds = 8
): Float32Array {
  const safeRate = Math.max(8000, Math.floor(sampleRate));
  const length = safeRate * durationSeconds;
  const output = new Float32Array(length);
  const beatSeconds = 0.5;
  const bassNotes = [110, 110, 146.83, 98, 110, 164.81, 146.83, 98];

  for (let index = 0; index < length; index += 1) {
    const time = index / safeRate;
    const beatIndex = Math.floor(time / beatSeconds);
    const beatPhase = time % beatSeconds;
    const kick = Math.sin(2 * Math.PI * (54 + 50 * Math.exp(-beatPhase * 22)) * time)
      * Math.exp(-beatPhase * 18);
    const bassFrequency = bassNotes[beatIndex % bassNotes.length];
    const bass = Math.sin(2 * Math.PI * bassFrequency * time) * 0.22;
    const offbeat = (time + beatSeconds / 2) % beatSeconds;
    const hatNoise = ((((index * 16807) % 2147483647) / 1073741823.5) - 1)
      * Math.exp(-offbeat * 55) * 0.05;
    const pad = Math.sin(2 * Math.PI * bassFrequency * 2 * time) * 0.055;
    output[index] = Math.tanh(kick * 0.52 + bass + hatNoise + pad) * 0.72;
  }

  return output;
}
