import { records } from './records.ts';

/** Original opening record; supplied recordings stream only when selected. */
const lounge = { bpm: 72, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 50, 53, 57]], melody: [76, 74, 71, 67, 69, 72, 71, 67], brightness: .24 };

export class DinerAudio {
    private context: AudioContext | null = null;
    private volume: GainNode | null = null;
    private rainVolume: GainNode | null = null;
    private recordingVolume: GainNode | null = null;
    private media: HTMLAudioElement | null = null;
    private mediaNode: MediaElementAudioSourceNode | null = null;
    private mediaPath: string | null = null;
    private createMedia: () => HTMLAudioElement;
    onChange: (() => void) | null = null;
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

    constructor(createContext: () => AudioContext = () => new AudioContext(), createMedia: () => HTMLAudioElement = () => new Audio()) {
        this.createContext = createContext;
        this.createMedia = createMedia;
    }
    get trackName(): string { return records[this.index]?.name ?? 'Sound off'; }

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
        this.rainVolume = ctx.createGain();
        this.rainVolume.gain.value = 0;
        filter.connect(this.rainVolume);
        this.rainVolume.connect(ctx.destination);
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
        const track = lounge, beat = 60 / track.bpm;
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
    private updateMix() {
        if (!this.context || !this.volume) return;
        this.volume.gain.setTargetAtTime(this.playing ? (this.purrWanted ? .28 : .42) : 0, this.context.currentTime, .3);
        // Rain is independent of music ducking, so cat focus does not bury the ambience.
        this.rainVolume?.gain.setTargetAtTime(this.playing ? .42 : 0, this.context.currentTime, .3);
    }
    private ensureMedia(ctx: AudioContext) {
        if (!this.media) {
            this.media = this.createMedia();
            this.media.preload = 'none';
            this.media.loop = true;
            this.mediaNode = ctx.createMediaElementSource(this.media);
            this.recordingVolume = ctx.createGain();
            // Files measure -20.04 to -20.09 LUFS; the original arrangement is ~-33.4.
            this.recordingVolume.gain.value = .215;
            this.mediaNode.connect(this.recordingVolume);
            this.recordingVolume.connect(this.volume!);
        }
        return this.media;
    }
    private async setPlaying(playing: boolean) {
        const ctx = this.ensureContext(), request = ++this.request;
        this.cancelSuspend();
        this.playing = playing;
        this.stopMusic();
        this.media?.pause();
        if (playing) {
            this.started = true;
            try {
                if (!this.hidden) await ctx.resume();
                if (request !== this.request || this.context !== ctx) return this.playing;
                const src = records[this.index]?.src;
                if (src) {
                    const media = this.ensureMedia(ctx);
                    if (this.mediaPath !== src) {
                        media.src = src;
                        media.load();
                        this.mediaPath = src;
                    }
                    if (!this.hidden) await media.play();
                }
                else {
                    // Release the previous recording's network buffer on the original track.
                    this.unloadMedia();
                    this.trackBus = ctx.createGain();
                    this.trackBus.connect(this.volume!);
                    this.bar = 0;
                    this.playBar();
                    this.timer = setInterval(() => this.playBar(), 240000 / lounge.bpm);
                }
            }
            catch (error) {
                if (request !== this.request || this.context !== ctx) return this.playing;
                // Hiding the tab can abort a still-loading play request; preserve its intent.
                if (this.hidden && error instanceof DOMException && error.name === 'AbortError') {
                    this.updateMix();
                    return this.playing;
                }
                this.playing = false;
                this.media?.pause();
                this.updateMix();
                this.suspendWhenIdle();
                throw error;
            }
        }
        if (request !== this.request || this.context !== ctx) return this.playing;
        if (this.index === records.length) this.unloadMedia();
        this.updateMix();
        this.suspendWhenIdle();
        return this.playing;
    }
    private unloadMedia() {
        if (!this.media || !this.mediaPath) return;
        this.media.pause();
        this.media.removeAttribute('src');
        this.media.load();
        this.mediaPath = null;
    }
    toggle() {
        if (!this.playing && this.index === records.length) this.index = 0;
        return this.setPlaying(!this.playing);
    }
    nextTrack() {
        if (this.started) this.index = (this.index + 1) % (records.length + 1);
        return this.setPlaying(this.index < records.length);
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
                const body = .5 * Math.sin(2 * Math.PI * 70 * t) + Math.sin(2 * Math.PI * 140 * t) + .3 * Math.sin(2 * Math.PI * 210 * t);
                data[i] = (noise * .4 + body * .12) * (.3 + pulse * .7) * breath;
            }
            // Normalize before adding pauses so each purr keeps its listening level.
            const rms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
            const level = .07 / Math.max(rms, .001);
            for (let i = 0; i < data.length; i++) {
                const breathTime = (i / ctx.sampleRate) % 2.4;
                const fadeIn = Math.min(1, breathTime / .55);
                const fadeOut = Math.max(0, Math.min(1, (1.8 - breathTime) / .85));
                // Longer rounded fades ease into 600ms of quiet between sleeping breaths.
                const envelope = Math.sin(fadeIn * Math.PI / 2) ** 2 * Math.sin(fadeOut * Math.PI / 2) ** 2;
                data[i] *= level * envelope;
            }
        }
        this.cancelSuspend();
        this.updateMix();
        const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        source.buffer = this.purrBuffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = 4.8;
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        filter.Q.value = .5;
        this.purrGain = gain;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setTargetAtTime(.27, ctx.currentTime, .25);
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
        this.updateMix();
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
        if (hidden) { this.media?.pause(); void this.context?.suspend(); }
        else if (this.playing || this.purrWanted) {
            void this.context?.resume();
            if (this.playing && records[this.index]?.src) {
                const request = this.request;
                void this.media?.play().catch(() => {
                    if (this.hidden || request !== this.request) return;
                    this.playing = false;
                    this.updateMix();
                    this.suspendWhenIdle();
                    this.onChange?.();
                });
            }
            if (this.purrWanted && !this.purrSource) void this.purr();
        }
    }
    dispose() {
        this.request++;
        this.purrRequest++;
        this.purrWanted = false;
        this.cancelSuspend();
        this.stopMusic();
        this.unloadMedia();
        this.mediaNode?.disconnect();
        this.recordingVolume?.disconnect();
        this.recordingVolume = null;
        this.media?.remove();
        this.media = null;
        this.mediaNode = null;
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
        this.rainVolume = null;
        this.context = null;
        this.playing = false;
    }
}
