class SoundManager {
  ctx: AudioContext | null = null;

  bossInterval: any = null;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shoot() {
    this.playTone(400, 'square', 0.1, 0.03);
  }

  bossTheme() {
    if (this.bossInterval) return;
    this.init();
    
    let step = 0;
    // Driving minor sequence
    const notes = [40, 40, 48, 47, 40, 40, 43, 41]; 
    
    this.bossInterval = setInterval(() => {
        const freq = 440 * Math.pow(2, (notes[step % notes.length] - 69) / 12);
        
        // Lead aggressive pulse
        this.playTone(freq, 'sawtooth', 0.1, 0.04);
        
        // Sub-bass layer
        if (step % 2 === 0) {
            this.playTone(freq / 2, 'square', 0.15, 0.05);
        }

        // Industrial percussion
        if (step % 4 === 0) {
            this.playTone(60, 'sine', 0.1, 0.12); // Kick
        }
        if (step % 4 === 2) {
            this.playTone(300, 'square', 0.05, 0.02); // Snare snap
        }

        step++;
    }, 120); // Faster, more driving tempo
  }

  stopBossTheme() {
    if (this.bossInterval) {
        clearInterval(this.bossInterval);
        this.bossInterval = null;
    }
  }

  parry() {
    this.playTone(880, 'sine', 0.1, 0.05);
    this.playTone(1760, 'sine', 0.05, 0.05);
  }

  explosion() {
    this.playTone(100, 'sawtooth', 0.3, 0.1);
  }

  powerup() {
    this.playTone(880, 'sine', 0.2, 0.1);
  }

  hit() {
    this.playTone(220, 'triangle', 0.1, 0.1);
  }
}

export const sounds = new SoundManager();
