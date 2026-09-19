import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildDiner, type ObjectName } from './models';
export interface DinerScene {
    focus: (name: ObjectName | 'room' | 'seat') => void;
    petCat: () => void;
    setPlaying: (playing: boolean) => void;
    setPaused: (paused: boolean) => void;
    dispose: () => void;
}
export async function createDiner(canvas: HTMLCanvasElement, select: (name: ObjectName) => void): Promise<DinerScene> {
    await Promise.all([document.fonts.load('48px "Instrument Serif"'), document.fonts.load('16px "DM Mono"')]);
    RectAreaLightUniformsLib.init();
    const compact = () => window.innerWidth < 700;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact() ? 1.3 : 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The room is static; reuse its shadow maps while the small props animate.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b211e');
    scene.fog = new THREE.Fog('#1b211e', 23, 49);
    const camera = new THREE.PerspectiveCamera(compact() ? 49 : 40, 1, .1, 80);
    const roomPosition = new THREE.Vector3(compact() ? 12.8 : 10, compact() ? 10.5 : 7.6, compact() ? 16.8 : 12.3);
    const roomTarget = new THREE.Vector3(-.1, 1.85, -.2);
    camera.position.copy(roomPosition);
    camera.lookAt(roomTarget);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(roomTarget);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = compact() ? 27 : 22;
    controls.minPolarAngle = .5;
    controls.maxPolarAngle = 1.43;
    controls.minAzimuthAngle = -.22;
    controls.maxAzimuthAngle = 1.4;
    controls.rotateSpeed = .42;
    controls.zoomSpeed = .65;
    controls.enableZoom = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environment = pmrem.fromScene(roomEnvironment, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .16;
    roomEnvironment.dispose();
    pmrem.dispose();
    const world = buildDiner();
    scene.add(world.group);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#1b211e', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.32;
    ground.receiveShadow = true;
    scene.add(ground);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .22, .4, 1.1);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const down = new THREE.Vector2();
    const hotspotButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-hotspot]')];
    let transition: {
        start: number;
        from: THREE.Vector3;
        to: THREE.Vector3;
        fromTarget: THREE.Vector3;
        target: THREE.Vector3;
    } | null = null;
    let playing = false, paused = false, petUntil = 0, frame = 0, last = performance.now(), elapsed = 0, disposed = false;
    const views: Record<ObjectName | 'seat', {
        position: THREE.Vector3;
        target: THREE.Vector3;
    }> = {
        seat: { position: new THREE.Vector3(.4, 2.85, 5.1), target: new THREE.Vector3(-.15, 2.6, -2.7) },
        menu: { position: new THREE.Vector3(1.8, 4.5, 4.7), target: new THREE.Vector3(.05, 1.6, 0) },
        notebook: { position: new THREE.Vector3(-.2, 4.3, 4.8), target: new THREE.Vector3(-1.5, 1.65, 0) },
        cat: { position: new THREE.Vector3(-1.6, 3.0, 3.5), target: new THREE.Vector3(-3.05, 2.05, 0) },
        record: { position: new THREE.Vector3(4.7, 3.5, 3.4), target: new THREE.Vector3(2.7, 1.9, -.25) },
        about: { position: new THREE.Vector3(2.2, 3.5, 4), target: new THREE.Vector3(-.6, 2.4, -2.9) },
    };
    function focus(name: ObjectName | 'room' | 'seat') {
        document.querySelector('.diner-shell')?.classList.toggle('is-exploring', name !== 'room');
        const to = name === 'room' ? roomPosition : views[name].position;
        const target = name === 'room' ? roomTarget : views[name].target;
        controls.enabled = false;
        if (reduced.matches) {
            camera.position.copy(to);
            controls.target.copy(target);
            controls.update();
            transition = null;
            controls.enabled = !paused;
            return;
        }
        transition = { start: performance.now(), from: camera.position.clone(), to: to.clone(), fromTarget: controls.target.clone(), target: target.clone() };
    }
    let wasCompact = compact();
    function resize() {
        const { width, height } = canvas.getBoundingClientRect();
        if (!width || !height)
            return;
        if (compact() !== wasCompact) {
            wasCompact = compact();
            roomPosition.set(wasCompact ? 12.8 : 10, wasCompact ? 10.5 : 7.6, wasCompact ? 16.8 : 12.3);
            camera.fov = wasCompact ? 49 : 40;
            controls.maxDistance = wasCompact ? 40 : 22;
            if (!paused)
                focus('room');
        }
        const aspect = width / height;
        if (compact()) {
            const scale = Math.max(1, .68 / aspect);
            roomPosition.set(12.8, 10.5, 16.8).multiplyScalar(scale);
            controls.maxDistance = Math.max(40, roomPosition.length() * 1.15);
            if (!document.querySelector('.is-exploring') && !paused) {
                camera.position.copy(roomPosition);
                controls.target.copy(roomTarget);
                transition = null;
                controls.enabled = !paused;
            }
        }
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    function hit(event: PointerEvent) {
        const rect = canvas.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const found = raycaster.intersectObjects(world.interactives, true)[0];
        return found?.object.userData.action as ObjectName | undefined;
    }
    function pointerDown(event: PointerEvent) { down.set(event.clientX, event.clientY); }
    function pointerUp(event: PointerEvent) { if (down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) < 6 && !paused) {
        const action = hit(event);
        if (action)
            select(action);
    } }
    function pointerMove(event: PointerEvent) { canvas.style.cursor = !paused && hit(event) ? 'pointer' : 'grab'; }
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointermove', pointerMove);
    function onLost(event: Event) { event.preventDefault(); document.dispatchEvent(new CustomEvent('diner-context-lost')); }
    canvas.addEventListener('webglcontextlost', onLost);
    function update(now: number) {
        if (disposed)
            return;
        frame = requestAnimationFrame(update);
        if (document.hidden) {
            last = now;
            return;
        }
        if (paused && !transition) { last = now; return; }
        if (now - last < 1000 / 30) return;
        const delta = Math.min((now - last) / 1000, .05);
        last = now;
        elapsed += delta;
        if (transition) {
            const progress = Math.min((now - transition.start) / 1350, 1);
            const t = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
            camera.position.lerpVectors(transition.from, transition.to, t);
            controls.target.lerpVectors(transition.fromTarget, transition.target, t);
            if (progress === 1) {
                transition = null;
                controls.enabled = !paused;
            }
        }
        controls.update();
        if (!reduced.matches) {
            world.cat.scale.y = 1 + Math.sin(elapsed * 1.5) * .014;
            const headLift = now < petUntil ? .07 : 0;
            world.catHead.rotation.x = THREE.MathUtils.lerp(world.catHead.rotation.x, headLift, .045);
            if (playing)
                world.vinyl.rotation.y -= delta * .9;
            world.steam.forEach((sprite, i) => { const phase = (elapsed * .16 + i / 9) % 1; sprite.position.set(1.25 + Math.sin(phase * 7 + i) * .036, 2.12 + phase * .65, .22 + Math.cos(phase * 6) * .025); sprite.material.opacity = Math.sin(phase * Math.PI) * .07; sprite.scale.set(.1 + phase * .14, .17 + phase * .12, 1); });
            for (let i = 0; i < 100; i++) {
                const index = i * 6;
                const y = world.rainPositions[index + 1] - delta * (.24 + (i % 4) * .09);
                const next = y < 1.79 ? 4.43 : y;
                world.rainPositions[index + 1] = next;
                world.rainPositions[index + 4] = next - .09;
            }
            world.rain.geometry.attributes.position.needsUpdate = true;
        }
        for (const button of hotspotButtons) {
            const name = button.dataset.hotspot as ObjectName;
            const vector = world.targets[name].clone().project(camera);
            button.style.left = `${(vector.x * .5 + .5) * 100}%`;
            button.style.top = `${(-vector.y * .5 + .5) * 100}%`;
            button.hidden = paused || vector.z > 1 || Math.abs(vector.x) > .95 || Math.abs(vector.y) > .85;
        }
        composer.render();
    }
    renderer.compile(scene, camera);
    update(performance.now());
    // Begin with a gentle arrival; reduced-motion users get a stable room immediately.
    if (!reduced.matches) {
        camera.position.multiplyScalar(1.065);
        focus('room');
    }
    return {
        focus,
        petCat() { petUntil = performance.now() + 2400; focus('cat'); },
        setPlaying(value) { playing = value; },
        setPaused(value) {
            paused = value;
            controls.enabled = !value && !transition;
            if (value) hotspotButtons.forEach(button => { button.hidden = true; });
        },
        dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); composer.dispose(); environment.dispose(); renderer.dispose(); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('webglcontextlost', onLost); world.group.traverse(object => { if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(m => m.dispose());
        } }); }
    };
}
