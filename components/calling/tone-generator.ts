'use client';

export class ToneGenerator {
  private ctx: AudioContext | null = null;
  private oscillator1: OscillatorNode | null = null;
  private oscillator2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Dialing tone: US style (440Hz + 480Hz, 2s on, 4s off)
  startDialing() {
    if (typeof window === 'undefined') return;
    this.stop();
    this.initContext();

    const playTone = () => {
      if (!this.ctx) return;
      
      // Stop existing oscillators first
      this.stopOscillators();

      this.oscillator1 = this.ctx.createOscillator();
      this.oscillator2 = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.oscillator1.type = 'sine';
      this.oscillator1.frequency.value = 350; // US dial tone low
      
      this.oscillator2.type = 'sine';
      this.oscillator2.frequency.value = 440; // US dial tone high

      this.gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
      // Fade out after 2s
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

      this.oscillator1.connect(this.gainNode);
      this.oscillator2.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.oscillator1.start();
      this.oscillator2.start();

      // Automatically clean up oscillators after 2 seconds
      setTimeout(() => this.stopOscillators(), 2000);
    };

    playTone();
    // Repeat every 6 seconds (2s tone, 4s silence)
    this.intervalId = setInterval(playTone, 6000);
  }

  // Ringing tone: Callee style (400Hz + 450Hz, 1s on, 2s off)
  startRinging() {
    if (typeof window === 'undefined') return;
    this.stop();
    this.initContext();

    const playTone = () => {
      if (!this.ctx) return;

      this.stopOscillators();

      this.oscillator1 = this.ctx.createOscillator();
      this.oscillator2 = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.oscillator1.type = 'sine';
      this.oscillator1.frequency.value = 400;
      
      this.oscillator2.type = 'sine';
      this.oscillator2.frequency.value = 450;

      this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      this.oscillator1.connect(this.gainNode);
      this.oscillator2.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.oscillator1.start();
      this.oscillator2.start();

      setTimeout(() => this.stopOscillators(), 1500);
    };

    playTone();
    // Repeat every 3 seconds (1.5s tone, 1.5s silence)
    this.intervalId = setInterval(playTone, 3000);
  }

  private stopOscillators() {
    if (this.oscillator1) {
      try {
        this.oscillator1.stop();
      } catch (e) {}
      this.oscillator1.disconnect();
      this.oscillator1 = null;
    }
    if (this.oscillator2) {
      try {
        this.oscillator2.stop();
      } catch (e) {}
      this.oscillator2.disconnect();
      this.oscillator2 = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopOscillators();
    if (this.ctx) {
      // Just suspend context instead of fully closing to reuse it easily
      if (this.ctx.state !== 'closed') {
        this.ctx.suspend();
      }
    }
  }
}
