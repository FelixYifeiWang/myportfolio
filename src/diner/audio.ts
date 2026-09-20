/** Original, lightweight lounge arrangements. No audio downloads or autoplay. */
const tracks = [
    { name: 'Last light', bpm: 72, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 50, 53, 57]], melody: [76, 74, 71, 67, 69, 72, 71, 67], brightness: .24 },
    { name: 'Rain on glass', bpm: 60, chords: [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 59], [45, 52, 55, 59]], melody: [77, 76, 72, 69, 74, 72, 69, 65], brightness: .10 },
    { name: 'One more cup', bpm: 88, chords: [[53, 57, 60, 64], [50, 53, 57, 60], [55, 59, 62, 65], [48, 55, 58, 62]], melody: [81, 79, 76, 72, 74, 77, 79, 76], brightness: .36 },
];

export class DinerAudio {
    private context: AudioContext | null = null;
    private volume: GainNode | null = null;
    private noise: AudioBufferSourceNode | null = null;
    private trackBus: GainNode | null = null;
    private voices = new Set<OscillatorNode>();
    private timer: ReturnType<typeof setInterval> | null = null;
    private muteTimer: ReturnType<typeof setTimeout> | null = null;
    private cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
    private purrSource: AudioBufferSourceNode | null = null;
    private purrBuffer: AudioBuffer | null = null;
    private purrGain: GainNode | null = null;
    private request = 0;
    private purrRequest = 0;
    private purrWanted = false;
    private index = 0;
    private started = false;
    private hidden = false;
    private bar = 0;
    private createContext: () => AudioContext;
    playing = false;

    constructor(createContext: () => AudioContext = () => new AudioContext()) {
        this.createContext = createContext;
    }
    get trackName() { return tracks[this.index].name; }

    private ensureContext() {
        if (this.context) return this.context;
        const ctx = this.context = this.createContext();
        this.volume = ctx.createGain();
        this.volume.gain.value = 0;
        this.volume.connect(ctx.destination);
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .052;
        this.noise = ctx.createBufferSource();
        this.noise.buffer = buffer;
        this.noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 750;
        this.noise.connect(filter);
        filter.connect(this.volume);
        this.noise.start();
        return ctx;
    }
    private note(midi: number, time: number, duration: number, level: number, brightness: number) {
        const ctx = this.context!, bus = this.trackBus!;
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(level, time + .018);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        envelope.connect(bus);
        let remaining = 3;
        [1, 2, 3].forEach(harmonic => {
            const oscillator = ctx.createOscillator(), gain = ctx.createGain();
            oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12) * harmonic;
            gain.gain.value = harmonic === 1 ? 1 : brightness / harmonic;
            oscillator.connect(gain);
            gain.connect(envelope);
            this.voices.add(oscillator);
            oscillator.onended = () => {
                this.voices.delete(oscillator);
                oscillator.disconnect();
                gain.disconnect();
                if (--remaining === 0) envelope.disconnect();
            };
            oscillator.start(time);
            oscillator.stop(time + duration + .02);
        });
    }
    private playBar() {
        const ctx = this.context;
        if (!ctx || !this.playing || ctx.state !== 'running') return;
        const track = tracks[this.index], beat = 60 / track.bpm;
        const chord = track.chords[this.bar % 4], now = ctx.currentTime + .025;
        chord.forEach((note, i) => this.note(note, now + i * .025, beat * 3.8, .045, track.brightness));
        this.note(chord[0] - 12, now, beat * 1.8, .09, .08);
        this.note(chord[0] - 5, now + beat * 2, beat * 1.5, .055, .08);
        for (let i = 0; i < 2; i++) {
            this.note(track.melody[(this.bar * 2 + i) % 8], now + beat * (i * 2 + .75), beat * 1.5, .035, track.brightness);
        }
        this.bar++;
    }
    private stopMusic() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        const bus = this.trackBus;
        if (!bus || !this.context) return;
        bus.gain.setTargetAtTime(0, this.context.currentTime, .035);
        for (const voice of this.voices) voice.stop(this.context.currentTime + .15);
        this.voices.clear();
        const cleanup = setTimeout(() => { bus.disconnect(); this.cleanupTimers.delete(cleanup); }, 200);
        this.cleanupTimers.add(cleanup);
        this.trackBus = null;
    }
    private cancelSuspend() {
        if (this.muteTimer) clearTimeout(this.muteTimer);
        this.muteTimer = null;
    }
    private suspendWhenIdle() {
        this.cancelSuspend();
        if (this.context && !this.playing && !this.purrSource) {
            this.muteTimer = setTimeout(() => {
                this.muteTimer = null;
                if (!this.playing && !this.purrSource) void this.context?.suspend();
            }, 1000);
        }
    }
    private async setPlaying(playing: boolean) {
        const ctx = this.ensureContext(), request = ++this.request;
        this.cancelSuspend();
        this.playing = playing;
        this.stopMusic();
        if (playing) {
            this.started = true;
            try { if (!this.hidden) await ctx.resume(); }
            catch (error) { if (request === this.request) this.playing = false; throw error; }
            if (request !== this.request || this.context !== ctx) return this.playing;
            this.trackBus = ctx.createGain();
            this.trackBus.connect(this.volume!);
            this.bar = 0;
            this.playBar();
            this.timer = setInterval(() => this.playBar(), 240000 / tracks[this.index].bpm);
        }
        this.volume?.gain.setTargetAtTime(this.playing ? .42 : 0, ctx.currentTime, .18);
        this.suspendWhenIdle();
        return this.playing;
    }
    toggle() { return this.setPlaying(!this.playing); }
    nextTrack() {
        if (this.started) this.index = (this.index + 1) % tracks.length;
        return this.setPlaying(true);
    }

    /** Low, quiet throat texture loops while the cat remains the selected focus. */
    async purr() {
        this.purrWanted = true;
        if (this.purrSource) return;
        const ctx = this.ensureContext(), request = ++this.purrRequest;
        this.cancelSuspend();
        if (!this.hidden) await ctx.resume();
        if (request !== this.purrRequest || this.context !== ctx || this.hidden || !this.purrWanted) return;
        if (!this.purrBuffer) {
            const duration = 4.8;
            this.purrBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
            const data = this.purrBuffer.getChannelData(0);
            let noise = 0;
            for (let i = 0; i < data.length; i++) {
                const t = i / ctx.sampleRate;
                noise = noise * .96 + (Math.random() * 2 - 1) * .04;
                const breath = .35 + .65 * Math.sin(Math.PI * t / 2.4) ** 2;
                const pulse = (.5 + .5 * Math.sin(2 * Math.PI * 25 * t + .4 * Math.sin(2 * Math.PI * t / duration))) ** 2;
                const body = Math.sin(2 * Math.PI * 70 * t);
                data[i] = (noise * .6 + body * .10) * (.3 + pulse * .7) * breath;
            }
            // Crossfade the loop seam; playback resumes after the overlapped opening.
            const overlap = Math.floor(ctx.sampleRate * .04);
            for (let i = 0; i < overlap; i++) {
                const weight = i / overlap;
                const end = data.length - overlap + i;
                data[end] = data[end] * (1 - weight) + data[i] * weight;
            }
        }
        this.cancelSuspend();
        const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        source.buffer = this.purrBuffer;
        source.loop = true;
        source.loopStart = .04;
        source.loopEnd = 4.8;
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        filter.Q.value = .5;
        this.purrGain = gain;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setTargetAtTime(.22, ctx.currentTime, .2);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        this.purrSource = source;
        source.onended = () => {
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
            if (this.purrSource === source) { this.purrSource = null; this.purrGain = null; this.suspendWhenIdle(); }
        };
        source.start();
    }
    stopPurr() {
        this.purrWanted = false;
        this.purrRequest++;
        if (this.context && this.purrSource) {
            this.purrGain?.gain.setTargetAtTime(0, this.context.currentTime, .08);
            this.purrSource.stop(this.context.currentTime + .4);
        }
        this.purrSource = null;
        this.purrGain = null;
        this.suspendWhenIdle();
    }
    setHidden(hidden: boolean) {
        this.hidden = hidden;
        if (hidden) void this.context?.suspend();
        else if (this.playing || this.purrWanted) {
            void this.context?.resume();
            if (this.purrWanted && !this.purrSource) void this.purr();
        }
    }
    dispose() {
        this.request++;
        this.purrRequest++;
        this.purrWanted = false;
        this.cancelSuspend();
        this.stopMusic();
        for (const timer of this.cleanupTimers) clearTimeout(timer);
        this.cleanupTimers.clear();
        this.purrSource?.stop();
        this.purrSource = null;
        this.purrBuffer = null;
        this.purrGain = null;
        this.noise?.stop();
        void this.context?.close();
        this.noise = null;
        this.volume = null;
        this.context = null;
        this.playing = false;
    }
}
