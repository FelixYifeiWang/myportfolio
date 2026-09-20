import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { batchStaticMeshes } from './optimize';
import { SeatedLook } from './seated-look';
import { loadDinerCat } from './cat';
import { loadDinerProps } from './assets';
import { buildDiner, type ObjectName } from './models';
import { seats, isSeat } from './seats';
import { ViewHistory, type View } from './view-history';
import { placeDoorwayVisitor } from './doorway';
import { DoorEncounter } from './door-encounter';
import { VisitorLibrary, visitors } from './visitor-assets';
export interface DinerScene {
    focus: (name: View, remember?: boolean) => number;
    restoreView: () => void;
    petCat: () => void;
    openDoor: () => void;
    setPlaying: (playing: boolean) => void;
    setPaused: (paused: boolean) => void;
    dispose: () => void;
}
export async function createDiner(canvas: HTMLCanvasElement, select: (name: ObjectName) => void, focusChanged: (cat: boolean) => void = () => {}): Promise<DinerScene> {
    await Promise.all([
        document.fonts.load('48px "Instrument Serif"'),
        document.fonts.load('italic 48px "Instrument Serif"'),
        document.fonts.load('16px "DM Mono"'),
    ]);
    RectAreaLightUniformsLib.init();
    const shell = canvas.closest<HTMLElement>('.diner-shell')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = () => canvas.clientWidth < 700;
    const resetButton = document.querySelector<HTMLButtonElement>('#reset-view')!;
    const controlsHelp = document.querySelector<HTMLElement>('#controls-help')!;
    const orbitHelp = window.matchMedia('(pointer: coarse)').matches
        ? 'Drag to look around. Pinch to move closer. Choose a stool to sit.'
        : 'Drag to look around. Scroll to move closer. Choose a stool to sit.';
    // Native MSAA keeps small objects crisp without a full-screen postprocessing chain.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, alpha: false, powerPreference: 'default' });
    renderer.info.autoReset = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b211e');
    scene.fog = new THREE.Fog('#1b211e', 23, 49);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 80);
    const roomPosition = new THREE.Vector3(10, 7.6, 12.3);
    const roomTarget = new THREE.Vector3(-.1, 1.85, -.2);
    camera.position.copy(roomPosition);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(roomTarget);
    controls.enableDamping = !reduced.matches;
    controls.dampingFactor = .08;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 22;
    controls.minPolarAngle = .5;
    controls.maxPolarAngle = 1.43;
    // Keep leftward rotation inside the room, hiding the exterior window backdrop.
    controls.minAzimuthAngle = .07;
    controls.maxAzimuthAngle = 1.4;
    controls.rotateSpeed = .42;
    controls.zoomSpeed = .65;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environment = pmrem.fromScene(roomEnvironment, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .24;
    roomEnvironment.dispose();
    pmrem.dispose();
    const [catModel, props] = await Promise.all([loadDinerCat(), loadDinerProps()]);
    const world = buildDiner(catModel, props);
    const batches = batchStaticMeshes(world.group, [...world.interactives, world.ceiling.group, world.sideWall.group, world.entrance.hinge, world.doorstep]);
    scene.add(world.group);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#1b211e', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.32;
    ground.receiveShadow = true;
    scene.add(ground);
    const hotspots = [...document.querySelectorAll<HTMLButtonElement>('[data-hotspot]')].map(button => ({
        button, point: world.targets[button.dataset.hotspot as ObjectName], x: NaN, y: NaN,
    }));
    const projected = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const down = new THREE.Vector2();
    const pointerIds = new Set<number>();
    let multiplePointers = false;
    let seatedPointer: number | null = null;
    let seatedDragged = false;
    const lastSeatedPointer = new THREE.Vector2();
    let transition: {
        start: number;
        duration: number;
        interruptible: boolean;
        from: THREE.Vector3;
        to: THREE.Vector3;
        fromTarget: THREE.Vector3;
        target: THREE.Vector3;
    } | null = null;
    let playing = false, paused = false, disposed = false, interacting = false;
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = true, rendering = false, measured = false, ready = false;
    let renderCount = 0;
    let last = performance.now(), elapsed = 0, lastMovement = 0, lastHover = 0;
    let qualityScale = 1, slowFrames = 0, sampledFrames = 0;
    const createdAt = performance.now();
    const visitorLibrary = new VisitorLibrary();
    let visibleVisitor: THREE.Group | null = null;
    const doorButton = document.querySelector<HTMLButtonElement>('[data-hotspot="door"]')!;
    const previewVisitor = import.meta.env.DEV ? new URL(window.location.href).searchParams.get('visitor') : null;
    const roster = visitors.some(visitor => visitor.id === previewVisitor) ? [previewVisitor!] : visitors.map(visitor => visitor.id);
    const encounter = new DoorEncounter(roster, {
        async load(id) {
            const visitor = await visitorLibrary.load(id);
            if (disposed) throw new Error('Diner is disposed.');
            await renderer.compileAsync(visitor, camera, scene);
            return visitor;
        },
        show(visitor) {
            visibleVisitor = visitor;
            shell.dataset.visitor = visitor.name;
            placeDoorwayVisitor(visitor);
            world.doorstep.add(visitor);
            world.doorstep.visible = true;
            renderer.shadowMap.needsUpdate = true;
        },
        hide() {
            visibleVisitor?.removeFromParent();
            visibleVisitor = null;
            delete shell.dataset.visitor;
            world.doorstep.visible = false;
            renderer.shadowMap.needsUpdate = true;
        },
        angle(amount) { world.entrance.setOpen(amount); renderer.shadowMap.needsUpdate = true; },
        changed() {
            doorButton.setAttribute('aria-busy', String(encounter.phase === 'loading'));
            // A visible state also makes browser checks independent of scene internals.
            shell.dataset.encounter = encounter.phase;
            wake();
        },
        error(error) {
            console.warn('Doorway visitor could not be loaded.', error);
            document.querySelector('#scene-toast')!.textContent = 'Nobody at the door just now. Try again in a moment.';
        },
    });
    let currentView: View = 'room';
    let manualView = false;
    const history = new ViewHistory();
    let width = 1, height = 1;
    const views = {
        ...seats,
        menu: { position: new THREE.Vector3(1.8, 4.5, 4.7), target: new THREE.Vector3(.05, 1.6, 0) },
        notebook: { position: new THREE.Vector3(-.2, 4.3, 4.8), target: new THREE.Vector3(-1.5, 1.65, 0) },
        cat: { position: new THREE.Vector3(-1.6, 3, 3.5), target: new THREE.Vector3(-3.32, 2.19, .08) },
        record: { position: new THREE.Vector3(4.7, 3.5, 3.4), target: new THREE.Vector3(2.7, 1.9, -.25) },
        about: { position: new THREE.Vector3(2.2, 3.5, 4), target: new THREE.Vector3(-.6, 2.4, -2.9) },
    };
    let seatedLook = new SeatedLook(seats['seat-3'].position, seats['seat-3'].target);
    function syncControls() {
        controls.enabled = !paused && !isSeat(currentView) && (!transition || transition.interruptible);
        shell.classList.toggle('is-seated', isSeat(currentView));
        resetButton.hidden = currentView === 'room' && !manualView && !history.focus;
        const returningToSeat = history.returnView && isSeat(history.returnView);
        resetButton.title = returningToSeat ? 'Back to your seat' : history.focus ? 'Back to previous view' : 'Room view';
        resetButton.setAttribute('aria-label', returningToSeat ? 'Return to your previous seated view' : history.focus ? 'Return to the previous view' : 'Return to the wide view of the diner');
        controlsHelp.textContent = isSeat(currentView) ? history.focus ? 'Escape returns to your previous view.' : 'Drag or use arrow keys to look around. Escape returns to the room.' : orbitHelp;
    }
    function finishCameraMove() {
        transition = null;
        if (isSeat(currentView)) {
            seatedLook.reset(controls.target);
            seatedLook.apply(camera);
        }
        else camera.lookAt(controls.target);
        syncControls();
    }
    function wake() {
        dirty = true;
        if (!ready || disposed || document.hidden || rendering || frame)
            return;
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
        frame = requestAnimationFrame(update);
    }
    function focus(name: View, remember = false) {
        clearHover();
        stopSeatedDrag();
        encounter.close();
        if (remember || name === 'cat') {
            history.enter(name === 'cat' ? 'cat' : 'panel', {
                position: transition?.to ?? camera.position, target: transition?.target ?? controls.target,
                view: currentView, manual: manualView, exploring: shell.classList.contains('is-exploring'),
            });
        }
        else history.clear();
        focusChanged(history.focus === 'cat');
        const duration = reduced.matches ? 0 : 1100;
        if (isSeat(currentView) && name !== 'room' && !isSeat(name)) {
            // Stay seated: the object changes our gaze, not our eye position or room shell.
            moveCamera(seats[currentView].position, seatedLook.targetFor(world.targets[name]), { duration });
            return duration;
        }
        currentView = name;
        if (isSeat(name)) seatedLook = new SeatedLook(seats[name].position, seats[name].target);
        manualView = false;
        shell.classList.toggle('is-exploring', name !== 'room');
        const target = name === 'room' ? roomTarget : views[name].target;
        const to = viewPosition(name);
        moveCamera(to, target, { duration });
        return duration;
    }
    function viewPosition(name: View) {
        if (name === 'room') return roomPosition;
        const view = views[name];
        if (name !== 'cat') return view.position;
        // Fit a sphere enclosing the cat, including its cushion and whiskers,
        // into the narrower field of view. Portrait screens need more distance.
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const limitingAngle = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
        const offset = view.position.clone().sub(view.target);
        return offset.setLength(Math.max(offset.length(), 1.02 / Math.sin(limitingAngle))).add(view.target);
    }
    function moveCamera(to: THREE.Vector3, target: THREE.Vector3, { duration = 1100, interruptible = false } = {}) {
        controls.enabled = false;
        if (reduced.matches) {
            camera.position.copy(to);
            controls.target.copy(target);
            finishCameraMove();
        }
        else {
            transition = { start: performance.now(), duration, interruptible, from: camera.position.clone(), to: to.clone(), fromTarget: controls.target.clone(), target: target.clone() };
        }
        syncControls();
        wake();
    }
    function stopIntro() {
        if (!transition?.interruptible) return;
        transition = null;
        syncControls();
        wake();
    }
    function setResolution() {
        const pixelBudget = Math.sqrt(2000000 / (width * height));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact() ? 1.3 : 1.65, pixelBudget) * qualityScale);
        renderer.setSize(width, height, false);
    }
    function resize() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return;
        width = rect.width;
        height = rect.height;
        const small = compact(), aspect = width / height;
        roomPosition.set(small ? 12.8 : 10, small ? 10.5 : 7.6, small ? 16.8 : 12.3);
        if (small)
            roomPosition.multiplyScalar(Math.max(1, .68 / aspect));
        // Let the counter details fill the view; portrait screens retain more room at the edges.
        roomPosition.sub(roomTarget).multiplyScalar(small ? .88 : .72).add(roomTarget);
        // Keep the room clear when a narrow viewport needs a more distant camera.
        const fog = scene.fog as THREE.Fog;
        fog.near = Math.max(23, roomPosition.length() + 8);
        fog.far = fog.near + 26;
        camera.aspect = aspect;
        camera.fov = small ? 49 : 40;
        camera.updateProjectionMatrix();
        controls.maxDistance = Math.max(22, roomPosition.length() * 1.15);
        if (currentView === 'room' && !manualView) {
            camera.position.copy(roomPosition);
            controls.target.copy(roomTarget);
            transition = null;
            syncControls();
        }
        else if (currentView === 'cat' && !manualView) {
            camera.position.copy(viewPosition('cat'));
            controls.target.copy(views.cat.target);
            transition = null;
            syncControls();
        }
        setResolution();
        wake();
    }
    function updateHotspots() {
        camera.updateMatrixWorld();
        for (const hotspot of hotspots) {
            projected.copy(hotspot.point).project(camera);
            const hidden = paused || (hotspot.button.dataset.hotspot === 'door' && encounter.phase !== 'closed') || (isSeat(hotspot.button.dataset.hotspot!) && (currentView !== 'room' || !!transition && !transition.interruptible)) || projected.z > 1 || Math.abs(projected.x) > .95 || Math.abs(projected.y) > .85;
            hotspot.button.hidden = hidden;
            if (hidden)
                continue;
            const x = Math.round((projected.x * .5 + .5) * width), y = Math.round((-.5 * projected.y + .5) * height);
            // Avoid rewriting DOM styles when the camera is stationary.
            if (x !== hotspot.x || y !== hotspot.y) {
                hotspot.button.style.left = `${x}px`;
                hotspot.button.style.top = `${y}px`;
                hotspot.button.dataset.labelSide = x < 100 ? 'right' : x > width - 100 ? 'left' : 'center';
                hotspot.x = x;
                hotspot.y = y;
            }
        }
    }
    function hit(event: PointerEvent) {
        const rect = canvas.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const objects = currentView === 'room' ? world.interactives : world.interactives.filter(object => !isSeat(object.userData.action));
        return raycaster.intersectObjects(objects, true)[0]?.object.userData.action as ObjectName | undefined;
    }
    function stopSeatedDrag() {
        if (seatedPointer === null) return;
        const id = seatedPointer;
        seatedPointer = null;
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        endInteraction();
    }
    function pointerDown(event: PointerEvent) {
        pointerIds.add(event.pointerId);
        if (pointerIds.size === 1) {
            down.set(event.clientX, event.clientY);
            multiplePointers = false;
        }
        else
            multiplePointers = true;
        if (isSeat(currentView) && !paused && !transition && pointerIds.size === 1 && event.button === 0) {
            seatedPointer = event.pointerId;
            seatedDragged = false;
            lastSeatedPointer.set(event.clientX, event.clientY);
            canvas.setPointerCapture(event.pointerId);
            canvas.focus({ preventScroll: true });
            startInteraction();
        }
    }
    function pointerUp(event: PointerEvent) {
        pointerIds.delete(event.pointerId);
        const wasSeatedDrag = seatedPointer === event.pointerId && seatedDragged;
        if (seatedPointer === event.pointerId) stopSeatedDrag();
        if (!multiplePointers && !wasSeatedDrag && !paused && !transition && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6) {
            const action = hit(event);
            if (action)
                select(action);
        }
    }
    function pointerCancel(event: PointerEvent) {
        pointerIds.delete(event.pointerId);
        multiplePointers = true;
        if (seatedPointer === event.pointerId) stopSeatedDrag();
    }
    function clearHover() {
        canvas.style.cursor = 'grab';
        hotspots.forEach(({ button }) => button.classList.remove('object-hovered'));
    }
    function pointerMove(event: PointerEvent) {
        if (seatedPointer === event.pointerId) {
            if (!multiplePointers && !paused && !transition) {
                if (Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 6) seatedDragged = true;
                if (seatedDragged) seatedLook.drag(event.clientX - lastSeatedPointer.x, event.clientY - lastSeatedPointer.y, height);
                lastSeatedPointer.set(event.clientX, event.clientY);
                wake();
            }
            return;
        }
        if (interacting || paused || transition || performance.now() - lastHover < 50)
            return;
        lastHover = performance.now();
        const action = hit(event);
        canvas.style.cursor = action ? 'pointer' : 'grab';
        hotspots.forEach(({ button }) => button.classList.toggle('object-hovered', button.dataset.hotspot === action));
    }
    function seatedKeyDown(event: KeyboardEvent) {
        if (!isSeat(currentView) || paused || transition || event.altKey || event.ctrlKey || event.metaKey) return;
        const amount = height / 32;
        const directions: Record<string, [number, number]> = {
            ArrowLeft: [amount, 0], ArrowRight: [-amount, 0],
            ArrowUp: [0, amount], ArrowDown: [0, -amount],
        };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        manualView = true;
        seatedLook.drag(...direction, height);
        wake();
    }
    function startInteraction() {
        manualView = true;
        interacting = true;
        lastMovement = performance.now();
        shell.classList.add('is-exploring', 'hint-dismissed');
        clearHover();
        syncControls();
        wake();
    }
    function endInteraction() { interacting = false; lastMovement = performance.now(); wake(); }
    controls.addEventListener('start', startInteraction);
    controls.addEventListener('end', endInteraction);
    controls.addEventListener('change', wake);
    shell.addEventListener('pointerdown', stopIntro, true);
    shell.addEventListener('wheel', stopIntro, { capture: true, passive: true });
    shell.addEventListener('keydown', stopIntro, true);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerleave', clearHover);
    canvas.addEventListener('lostpointercapture', pointerCancel);
    canvas.addEventListener('keydown', seatedKeyDown);
    function stopScheduledFrame() {
        cancelAnimationFrame(frame);
        frame = 0;
        if (timer)
            clearTimeout(timer);
        timer = undefined;
    }
    function visibilityChanged() {
        if (document.hidden) {
            stopSeatedDrag();
            if (isSeat(currentView) && !transition) seatedLook.reset(controls.target);
            stopIntro();
            stopScheduledFrame();
        }
        else {
            last = performance.now();
            wake();
        }
    }
    function motionChanged() {
        controls.enableDamping = !reduced.matches;
        if (reduced.matches && transition) {
            camera.position.copy(transition.to);
            controls.target.copy(transition.target);
            finishCameraMove();
        }
        wake();
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', motionChanged);
    function onLost(event: Event) { event.preventDefault(); document.dispatchEvent(new CustomEvent('diner-context-lost')); }
    canvas.addEventListener('webglcontextlost', onLost);
    function update(now: number) {
        frame = 0;
        if (disposed || document.hidden)
            return;
        if (paused && !transition && !dirty && encounter.phase === 'closed')
            return;
        rendering = true;
        const frameTime = now - last;
        const delta = Math.min(frameTime / 1000, .06);
        last = now;
        elapsed += delta;
        const wasSwinging = encounter.phase === 'opening' || encounter.phase === 'closing';
        encounter.update(Math.min(frameTime / 1000, .3), reduced.matches);
        let moving = wasSwinging || encounter.phase === 'opening' || encounter.phase === 'closing' || !!transition || interacting || now - lastMovement < 250;
        let cameraChanged = !!transition;
        if (transition) {
            const progress = Math.min((now - transition.start) / transition.duration, 1);
            const t = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
            camera.position.lerpVectors(transition.from, transition.to, t);
            controls.target.lerpVectors(transition.fromTarget, transition.target, t);
            camera.lookAt(controls.target);
            if (progress === 1) finishCameraMove();
        }
        else if (isSeat(currentView)) {
            cameraChanged = !paused && seatedLook.update(delta, reduced.matches);
            seatedLook.apply(camera);
            controls.target.copy(seatedLook.target);
        }
        else cameraChanged = controls.update();
        // Reveal the roof only after the arriving camera is below it and inside the room.
        const underCeiling = isSeat(currentView) && camera.position.y < 4.9 && camera.position.z < 3.9 && Math.abs(camera.position.x) < 4.9;
        moving = world.ceiling.update(delta, underCeiling, reduced.matches) || moving;
        moving = world.sideWall.update(delta, underCeiling, reduced.matches) || moving;
        if (!paused && !reduced.matches) {
            world.cat.scale.y = 1 + Math.sin(elapsed * 1.4) * .009;
            if (playing)
                world.vinyl.rotation.y -= delta * .9;
            world.steam.forEach((sprite, i) => {
                const phase = (elapsed * .16 + i / world.steam.length) % 1;
                sprite.position.set(1.25 + Math.sin(phase * 7 + i) * .036, 2.12 + phase * .65, .22 + Math.cos(phase * 6) * .025);
                sprite.material.opacity = Math.sin(phase * Math.PI) * .07;
                sprite.scale.set(.1 + phase * .14, .17 + phase * .12, 1);
            });
            world.rain.update(delta);
        }
        if (cameraChanged || dirty || moving)
            updateHotspots();
        renderer.info.reset();
        renderer.render(scene, camera);
        if (import.meta.env.DEV)
            canvas.dataset.renderCount = String(++renderCount);
        if (import.meta.env.DEV && !measured && !moving && now - createdAt > 3500) {
            measured = true;
            console.info('Diner render optimized', JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, batches }));
        }
        // Sustained slow frames while moving lower resolution, not model detail.
        if (moving && now - createdAt > 4000) {
            sampledFrames++;
            if (frameTime > 29)
                slowFrames++;
            if (sampledFrames >= 50) {
                if (slowFrames > 30 && qualityScale > .7) {
                    qualityScale = Math.max(.7, qualityScale - .15);
                    setResolution();
                }
                sampledFrames = 0;
                slowFrames = 0;
            }
        }
        dirty = false;
        rendering = false;
        if (paused && !transition && encounter.phase === 'closed')
            return;
        if (moving || cameraChanged)
            frame = requestAnimationFrame(update);
        else if (!reduced.matches || encounter.phase === 'holding')
            timer = setTimeout(() => { timer = undefined; frame = requestAnimationFrame(update); }, Math.max(0, 1000 / (reduced.matches ? 4 : 24) - (performance.now() - now)));
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    // Compile asynchronously where supported, avoiding a synchronous first-frame stall.
    world.doorstep.visible = true;
    world.ceiling.group.visible = true;
    world.sideWall.group.visible = true;
    await renderer.compileAsync(scene, camera);
    world.doorstep.visible = false;
    world.ceiling.group.visible = false;
    world.sideWall.group.visible = false;
    ready = true;
    if (!reduced.matches) {
        camera.position.copy(roomPosition).sub(roomTarget).multiplyScalar(1.04 / (compact() ? .88 : .72)).add(roomTarget);
        moveCamera(roomPosition, roomTarget, { duration: 3000, interruptible: true });
    }
    else
        wake();
    return {
        focus,
        restoreView() {
            // Escape dismisses an encounter without moving the viewer from their seat.
            if (encounter.phase !== 'closed') { encounter.close(); return; }
            stopSeatedDrag();
            const savedView = history.back();
            // A top-level room visit exits completely in one step, including any
            // manual-orbit flag set by clicking the cat mesh on the canvas.
            if (!savedView || (savedView.view === 'room' && !history.focus)) {
                focus('room');
                return;
            }
            focusChanged(history.focus === 'cat');
            currentView = savedView.view;
            if (isSeat(currentView)) seatedLook = new SeatedLook(seats[currentView].position, seats[currentView].target);
            manualView = savedView.manual;
            shell.classList.toggle('is-exploring', savedView.exploring);
            moveCamera(savedView.position, savedView.target);
        },
        openDoor() {
            if (encounter.phase !== 'closed') return;
            void encounter.open();
        },
        petCat() { if (history.focus !== 'cat') focus('cat'); },
        setPlaying(value) { playing = value; wake(); },
        setPaused(value) {
            paused = value;
            if (value) { stopIntro(); stopSeatedDrag(); }
            syncControls();
            updateHotspots();
            wake();
        },
        dispose() {
            disposed = true;
            encounter.dispose();
            visitorLibrary.dispose();
            stopSeatedDrag();
            stopScheduledFrame();
            observer.disconnect();
            controls.dispose();
            document.removeEventListener('visibilitychange', visibilityChanged);
            reduced.removeEventListener('change', motionChanged);
            shell.removeEventListener('pointerdown', stopIntro, true);
            shell.removeEventListener('wheel', stopIntro, true);
            shell.removeEventListener('keydown', stopIntro, true);
            canvas.removeEventListener('pointerdown', pointerDown);
            canvas.removeEventListener('pointerup', pointerUp);
            canvas.removeEventListener('pointercancel', pointerCancel);
            canvas.removeEventListener('pointermove', pointerMove);
            canvas.removeEventListener('pointerleave', clearHover);
            canvas.removeEventListener('lostpointercapture', pointerCancel);
            canvas.removeEventListener('keydown', seatedKeyDown);
            canvas.removeEventListener('webglcontextlost', onLost);
            const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
            scene.traverse(object => {
                if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
                    geometries.add(object.geometry);
                    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
                }
            });
            materials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof THREE.Texture)
                textures.add(value); }); material.dispose(); });
            geometries.forEach(geometry => geometry.dispose());
            textures.forEach(texture => texture.dispose());
            environment.dispose();
            renderer.dispose();
        },
    };
}
