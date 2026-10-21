// Web Audio API synthesizer for sample BGM loops, beat ticks, and sound effects
class SoundEngine {
  private ctx: AudioContext | null = null;
  private lastBeatIndex: number = -1;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public resetBeatTracker() {
    this.lastBeatIndex = -1;
  }

  // Triggered during playback when crossing beat markers on synthetic audio clips
  public triggerTimelinePulse(
    playhead: number,
    volume: number,
    speed: number,
    preservePitch: boolean,
    preset: 'lofi-pulse' | 'cinematic-sub' | 'riser-hit' | 'ambient-pad' = 'lofi-pulse'
  ) {
    // 120 BPM = 1 beat every 0.5s
    const beatInterval = 0.5 / Math.max(0.25, speed);
    const currentBeatIndex = Math.floor(playhead / beatInterval);

    if (currentBeatIndex !== this.lastBeatIndex && currentBeatIndex >= 0) {
      this.lastBeatIndex = currentBeatIndex;
      const ctx = this.getContext();
      if (!ctx || volume <= 0.01) return;

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();

      const pitchFactor = preservePitch ? 1 : speed;
      const isDownbeat = currentBeatIndex % 4 === 0;

      if (preset === 'lofi-pulse') {
        const chordNotes = [110, 130.81, 146.83, 164.81]; // A2, C3, D3, E3
        const baseFreq = isDownbeat ? 65.41 : chordNotes[currentBeatIndex % chordNotes.length];
        osc.type = isDownbeat ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * pitchFactor, now);
        if (isDownbeat) {
          osc.frequency.exponentialRampToValueAtTime(38 * pitchFactor, now + 0.18);
        }
        const peakGain = (volume / 100) * (isDownbeat ? 0.16 : 0.08);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (preset === 'cinematic-sub') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime((isDownbeat ? 55 : 82.41) * pitchFactor, now);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, now);

        const peakGain = (volume / 100) * 0.14;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220 * pitchFactor, now);
        gain.gain.setValueAtTime((volume / 100) * 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    }
  }

  // One-shot studio sound effects preview & insertion feedback
  public playOneShotSfx(type: 'whoosh' | 'sub-drop' | 'shutter' | 'glitch') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'whoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.32);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'sub-drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.55);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    } else if (type === 'shutter') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(640, now + 0.04);
      osc.frequency.setValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }
}

export const soundEngine = new SoundEngine();
