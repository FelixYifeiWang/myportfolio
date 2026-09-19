/** An original, quiet lounge loop. Audio starts only from an explicit visitor gesture. */
export class DinerAudio {
    private context: AudioContext | null = null;
    private volume: GainNode | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private noise: AudioBufferSourceNode | null = null;
    private bar = 0;
    private muteTimer: ReturnType<typeof setTimeout> | null = null;
    playing = false;
    private playChord() {
        if (!this.context || !this.volume || this.context.state !== 'running')
            return;
        const ctx = this.context;
        const chords = [[130.81, 164.81, 196, 246.94], [110, 130.81, 164.81, 196], [146.83, 174.61, 220, 261.63], [98, 146.83, 174.61, 220]];
        const chord = chords[this.bar++ % chords.length];
        chord.forEach((frequency, index) => {
            const time = ctx.currentTime + index * .035;
            const envelope = ctx.createGain();
            envelope.connect(this.volume!);
            envelope.gain.setValueAtTime(0, time);
            envelope.gain.linearRampToValueAtTime(.075, time + .025);
            envelope.gain.exponentialRampToValueAtTime(.001, time + 3.8);
            for (const harmonic of [1, 2, 3]) {
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency * harmonic;
                gain.gain.value = 1 / (harmonic * harmonic);
                oscillator.connect(gain);
                gain.connect(envelope);
                oscillator.start(time);
                oscillator.stop(time + 4);
                oscillator.onended = () => {
                    oscillator.disconnect();
                    gain.disconnect();
                    if (harmonic === 3)
                        envelope.disconnect();
                };
            }
        });
    }
    async toggle() {
        if (!this.context) {
            this.context = new AudioContext();
            this.volume = this.context.createGain();
            this.volume.gain.value = 0;
            this.volume.connect(this.context.destination);
            const length = this.context.sampleRate * 3;
            const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++)
                data[i] = (Math.random() * 2 - 1) * .08;
            this.noise = this.context.createBufferSource();
            this.noise.buffer = buffer;
            this.noise.loop = true;
            const filter = this.context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 750;
            this.noise.connect(filter);
            filter.connect(this.volume);
            this.noise.start();
        }
        if (this.muteTimer) {
            clearTimeout(this.muteTimer);
            this.muteTimer = null;
        }
        await this.context.resume();
        this.playing = !this.playing;
        this.volume!.gain.setTargetAtTime(this.playing ? .42 : 0, this.context.currentTime, .25);
        if (this.playing) {
            this.playChord();
            this.timer = setInterval(() => this.playChord(), 4000);
        }
        else if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (!this.playing)
            this.muteTimer = setTimeout(() => { void this.context?.suspend(); }, 1000);
        return this.playing;
    }
    setHidden(hidden: boolean) {
        if (hidden)
            void this.context?.suspend();
        else if (this.playing)
            void this.context?.resume();
    }
    dispose() {
        if (this.muteTimer)
            clearTimeout(this.muteTimer);
        this.muteTimer = null;
        if (this.timer)
            clearInterval(this.timer);
        this.noise?.stop();
        void this.context?.close();
        this.timer = null;
        this.noise = null;
        this.volume = null;
        this.context = null;
        this.playing = false;
    }
}
