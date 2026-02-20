
class AudioService {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.5;

    constructor() {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('levelmak_settings');
            if (stored) {
                try {
                    this.enabled = JSON.parse(stored).soundEnabled ?? true;
                } catch (e) { }
            }

            // Initialize AudioContext on first user interaction to comply with autoplay policies
            window.addEventListener('click', () => this.initContext(), { once: true });
            window.addEventListener('keydown', () => this.initContext(), { once: true });
            window.addEventListener('touchstart', () => this.initContext(), { once: true });
        }
    }

    private initContext() {
        if (!this.audioContext && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    playNotification() {
        if (!this.enabled) return;
        this.playTone(800, 'sine', 0.1, 0.5);
        setTimeout(() => this.playTone(1200, 'sine', 0.05, 0.5), 100);
    }

    playSuccess() {
        if (!this.enabled) return;
        // Major triad arpeggio (C Major: C, E, G)
        this.playTone(523.25, 'triangle', 0.1, 0.3); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.3), 100); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.2, 0.3), 200); // G5
    }

    playError() {
        if (!this.enabled) return;
        this.playTone(150, 'sawtooth', 0.3, 0.5);
    }

    playMessage() {
        if (!this.enabled) return;
        this.playTone(400, 'sine', 0.05, 0.2);
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number) {
        this.initContext();
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gain.gain.setValueAtTime(vol * this.volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
}

export const audioService = new AudioService();
