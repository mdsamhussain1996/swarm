/**
 * Swarm — Synthesized Web Audio System
 * All sound effects and dynamic music generated procedurally via Web Audio API.
 * No external audio files or downloads.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.gemStreak = 0;
    this.gemStreakTimer = 0;
    this.enabled = true;
    this.isMuted = false;

    this.initOnInteraction();
  }

  initOnInteraction() {
    const unlock = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.sfxGain = this.ctx.createGain();
          this.musicGain = this.ctx.createGain();

          this.sfxGain.connect(this.masterGain);
          this.musicGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);

          this.masterGain.gain.value = 0.5;
          this.sfxGain.gain.value = 0.7;
          this.musicGain.gain.value = 0.4;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('keydown', unlock);
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
  }

  update(dt) {
    if (this.gemStreakTimer > 0) {
      this.gemStreakTimer -= dt;
      if (this.gemStreakTimer <= 0) {
        this.gemStreak = 0;
      }
    }
  }

  playSfx(type) {
    if (!this.ctx || this.isMuted || !this.enabled) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;

      if (type === 'spark_shoot') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(640, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
      } else if (type === 'hit') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.06);
      } else if (type === 'gem') {
        this.gemStreak++;
        this.gemStreakTimer = 0.8; // reset combo window

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        // Rising musical streak scale
        const noteIndex = Math.min(this.gemStreak, 24);
        const freq = 480 * Math.pow(1.059463, noteIndex); // semitone step
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t + 0.09);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.09);
      } else if (type === 'level_up') {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = t + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      } else if (type === 'hurt') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.15);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (type === 'die') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.7);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.7);
      }
    } catch {
      // Audio errors safely ignored
    }
  }
}
