class AudioService {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private soundSettings = {
        quiz: true,
        timeMachine: true,
        notifications: true
    };
    private volume: number = 0.5;

    // Background Music states
    private bgmOscillators: OscillatorNode[] = [];
    private bgmInterval: any = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('levelmak_settings');
            if (stored) {
                try {
                    const settings = JSON.parse(stored);
                    this.enabled = settings.soundEnabled ?? true;
                    this.soundSettings = settings.soundSettings || {
                        quiz: true,
                        timeMachine: true,
                        notifications: true
                    };
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

    setSoundSettings(settings: any) {
        this.soundSettings = { ...this.soundSettings, ...settings };
    }

    playClick() {
        if (!this.enabled || !this.soundSettings.quiz) return;
        // Petit son "clic" subtil
        this.playTone(800, 'sine', 0.05, 0.1);
    }

    playNotification() {
        if (!this.enabled || !this.soundSettings.notifications) return;
        this.playTone(800, 'sine', 0.1, 0.5);
        setTimeout(() => this.playTone(1200, 'sine', 0.05, 0.5), 100);
    }

    playBattleInvite() {
        if (!this.enabled || !this.soundSettings.notifications) return;
        // Son de cloche majestueux : "Tiling! Tlong!"
        this.playTone(880, 'sine', 0.5, 0.4); // A5
        setTimeout(() => this.playTone(1318.51, 'sine', 1.2, 0.4), 150); // E6 avec longue résonance
    }

    playTimeTravel() {
        if (!this.enabled || !this.soundSettings.timeMachine) return;
        const ctx = this.audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioContext = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 2);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2);
    }

    playSuccess(category: 'quiz' | 'timeMachine' | 'notifications' = 'quiz') {
        if (!this.enabled || (category && !this.soundSettings[category])) return;
        this.playTone(523.25, 'triangle', 0.1, 0.3); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.3), 100); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.3, 0.3), 200); // G5
    }

    playError(category: 'quiz' | 'timeMachine' | 'notifications' = 'quiz') {
        if (!this.enabled || (category && !this.soundSettings[category])) return;
        this.playTone(200, 'sawtooth', 0.2, 0.3);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.3, 0.3), 150);
    }

    playMessage(category: 'quiz' | 'timeMachine' | 'notifications' = 'notifications') {
        if (!this.enabled || (category && !this.soundSettings[category])) return;
        this.playTone(400, 'sine', 0.05, 0.2);
    }

    startBackgroundPiano() {
        if (!this.enabled || !this.soundSettings.quiz) return;
        this.stopBackgroundPiano(); // Clear previous if any
        this.initContext();
        if (!this.audioContext) return;

        // Gamme pentatonique pour une ambiance douce et relaxante
        const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        
        const playRandomNote = () => {
            if (!this.audioContext) return;
            const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine'; // Son de piano/cloche
            osc.frequency.value = freq;
            
            // Enveloppe douce : attaque lente, résonance longue
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.04 * this.volume, this.audioContext.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start();
            osc.stop(this.audioContext.currentTime + 3);
            this.bgmOscillators.push(osc);
            
            // Nettoyage
            setTimeout(() => {
                const idx = this.bgmOscillators.indexOf(osc);
                if (idx > -1) this.bgmOscillators.splice(idx, 1);
            }, 3000);
        };

        playRandomNote();
        setTimeout(playRandomNote, 500);

        this.bgmInterval = setInterval(() => {
            playRandomNote();
        }, 1500 + Math.random() * 1000);
    }

    stopBackgroundPiano() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
        this.bgmOscillators = [];
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
