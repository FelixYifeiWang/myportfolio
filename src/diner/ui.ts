import type { DinerScene } from './scene';
import type { ObjectName } from './models';
import { DinerAudio } from './audio';
export function initDiner() {
    const shell = document.querySelector<HTMLElement>('.diner-shell')!;
    const canvas = document.querySelector<HTMLCanvasElement>('#diner-canvas')!;
    const dialog = document.querySelector<HTMLDialogElement>('#diner-dialog')!;
    const scroll = document.querySelector<HTMLElement>('#dialog-scroll')!;
    const back = document.querySelector<HTMLButtonElement>('#panel-back')!;
    const close = document.querySelector<HTMLButtonElement>('#panel-close')!;
    const sound = document.querySelector<HTMLButtonElement>('#sound-toggle')!;
    const record = document.querySelector<HTMLButtonElement>('[data-action=record]')!;
    const viewOptions = document.querySelector<HTMLDetailsElement>('#view-options')!;
    const viewOptionsToggle = document.querySelector<HTMLElement>('#view-options-toggle')!;
    const toast = document.querySelector<HTMLElement>('#scene-toast')!;
    const location = document.querySelector<HTMLElement>('#dialog-location')!;
    const audio = new DinerAudio();
    let scene: DinerScene | undefined;
    let currentPanel = 'menu';
    let toastTimer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    let hintTimer: ReturnType<typeof setTimeout>;
    let lastFocus: HTMLElement | null = null;
    let returnKeyboardFocus = false;
    const titles: Record<string, string> = { menu: 'The midnight menu', notebook: 'Little ideas, long detours', about: 'Meet Felix' };
    function announce(message: string) {
        clearTimeout(toastTimer);
        toast.textContent = message;
        toast.classList.add('is-visible');
        toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); toast.textContent = ''; }, 4500);
    }
    function showPanel(panel: string) {
        const target = document.querySelector<HTMLElement>(`[data-panel="${panel}"]`);
        if (!target)
            return;
        currentPanel = panel;
        document.querySelectorAll<HTMLElement>('[data-panel]').forEach(item => { item.hidden = item !== target; });
        const project = panel.startsWith('project-');
        dialog.classList.toggle('is-story', project);
        dialog.classList.toggle('is-notebook', panel === 'notebook');
        back.hidden = !project;
        location.textContent = project ? 'HOUSE SPECIAL / THE STORY' : panel === 'notebook' ? 'A FEW THINGS ON THE SIDE' : panel === 'about' ? 'MEET YOUR HOST' : 'AT THE COUNTER';
        dialog.removeAttribute('aria-labelledby');
        dialog.setAttribute('aria-label', titles[panel] || target.querySelector('h2')?.textContent || 'Project story');
        scroll.scrollTop = 0;
        if (!dialog.open)
            dialog.showModal();
        shell.classList.add('panel-open');
        scene?.setPaused(true);
        close.focus({ preventScroll: true });
    }
    function openPanel(panel: string) {
        viewOptions.open = false;
        shell.classList.add('hint-dismissed');
        clearTimeout(openTimer);
        if (!dialog.open) {
            lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            returnKeyboardFocus = lastFocus?.matches(':focus-visible') ?? false;
        }
        if (dialog.open) {
            showPanel(panel);
            return;
        }
        const destination = (panel.startsWith('project-') ? 'menu' : panel) as ObjectName;
        const duration = scene?.focus(destination, true) ?? 0;
        // Give the visitor a brief sense of picking the object up before showing its content.
        openTimer = setTimeout(() => showPanel(panel), duration);
    }
    function closePanel() {
        clearTimeout(openTimer);
        dialog.close();
        shell.classList.remove('panel-open');
        scene?.setPaused(false);
        scene?.restoreView();
        (returnKeyboardFocus ? lastFocus : canvas)?.focus({ preventScroll: true });
    }
    function syncSound() {
        const playing = audio.playing;
        sound.setAttribute('aria-pressed', String(playing));
        record.querySelector('.hotspot-label')!.textContent = playing ? 'Next record' : 'Listen';
        record.setAttribute('aria-label', playing ? `Play the next record. Now playing: ${audio.trackName}` : 'Play a record');
        sound.setAttribute('aria-label', playing ? `Pause music. Now playing: ${audio.trackName}` : 'Play lounge music and rain ambience');
        sound.title = playing ? `Pause · ${audio.trackName}` : 'Play music';
        scene?.setPlaying(playing);
    }
    async function playMusic(next = false) {
        try {
            if (next) await audio.nextTrack();
            else await audio.toggle();
            syncSound();
            announce(audio.playing ? `Now playing · ${audio.trackName}` : 'Music paused');
        }
        catch {
            syncSound();
            announce('Audio is unavailable here. You can still enjoy the room.');
        }
    }
    function action(name: ObjectName) {
        const hotspot = document.querySelector<HTMLElement>(`[data-hotspot="${name}"]`);
        if (hotspot) hotspot.dataset.explored = 'true';
        if (name.startsWith('seat-')) {
            if (!scene) return;
            clearTimeout(openTimer);
            viewOptions.open = false;
            shell.classList.add('hint-dismissed');
            scene.focus(name);
            canvas.focus({ preventScroll: true });
            announce('Drag or use arrow keys to look around.');
            return;
        }
        if (name === 'record') {
            void playMusic(true);
            return;
        }
        if (name === 'cat') {
            clearTimeout(openTimer);
            scene?.petCat();
            announce('The manager is taking a well-earned break.');
            return;
        }
        openPanel(name);
    }
    document.querySelectorAll<HTMLElement>('[data-action]').forEach(button => button.addEventListener('click', () => action(button.dataset.action as ObjectName)));
    document.querySelectorAll<HTMLAnchorElement>('[data-open]').forEach(link => link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
        event.preventDefault();
        openPanel(link.dataset.open!);
    }));
    document.querySelectorAll<HTMLAnchorElement>('[data-project]').forEach(link => link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
        event.preventDefault();
        openPanel(`project-${link.dataset.project}`);
    }));
    sound.addEventListener('click', () => void playMusic());
    close.addEventListener('click', closePanel);
    back.addEventListener('click', () => showPanel('menu'));
    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        if (currentPanel.startsWith('project-'))
            showPanel('menu');
        else
            closePanel();
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) {
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
                closePanel();
        }
    });
    document.querySelector('#reset-view')!.addEventListener('click', () => { viewOptions.open = false; clearTimeout(openTimer); scene?.restoreView(); canvas.focus({ preventScroll: true }); });
    document.addEventListener('pointerdown', event => {
        if (event.target instanceof Node && !viewOptions.contains(event.target)) viewOptions.open = false;
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && viewOptions.open) {
            event.preventDefault();
            viewOptions.open = false;
            viewOptionsToggle.focus({ preventScroll: true });
            return;
        }
        if (event.key === 'Escape' && !dialog.open) {
            clearTimeout(openTimer);
            scene?.restoreView();
            canvas.focus({ preventScroll: true });
        }
    });
    function fromHash() {
        const hashes: Record<string, string> = { '#work': 'menu', '#on-the-side': 'notebook', '#about': 'about' };
        if (hashes[window.location.hash])
            openPanel(hashes[window.location.hash]);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    function fallback() {
        shell.classList.add('scene-unavailable');
        shell.classList.remove('scene-ready');
        const loading = document.querySelector<HTMLElement>('#scene-loading')!;
        loading.removeAttribute('aria-hidden');
        loading.textContent = 'The room couldn’t load. Explore the work above.';
    }
    document.addEventListener('diner-context-lost', () => { scene?.dispose(); scene = undefined; fallback(); });
    import('./scene').then(module => module.createDiner(canvas, action, cat => {
        if (cat) void audio.purr().catch(() => announce('The manager is asleep. Audio is unavailable here.'));
        else audio.stopPurr();
    })).then(result => {
        scene = result;
        scene.setPlaying(audio.playing);
        shell.classList.add('scene-ready');
        hintTimer = setTimeout(() => shell.classList.add('hint-dismissed'), 8000);
        document.querySelector('#scene-loading')!.setAttribute('aria-hidden', 'true');
        if (dialog.open)
            scene.setPaused(true);
    }).catch(error => { console.error('Unable to create the diner:', error); fallback(); });
    document.addEventListener('visibilitychange', () => audio.setHidden(document.hidden));
    window.addEventListener('pagehide', event => {
        // Preserve the room if the browser keeps this page for Back navigation.
        if (!event.persisted)
            scene?.dispose();
        audio.dispose();
        syncSound();
        clearTimeout(openTimer);
        clearTimeout(toastTimer);
        clearTimeout(hintTimer);
    });
}
