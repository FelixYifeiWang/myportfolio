import * as THREE from 'three';

/** A seated head turn: only the viewing direction moves, never the eye position. */
export class SeatedLook {
    readonly target = new THREE.Vector3();
    private readonly eye: THREE.Vector3;
    private readonly centerYaw: number;
    private readonly distance: number;
    private yaw = 0;
    private pitch = 0;
    private desiredYaw = 0;
    private desiredPitch = 0;

    constructor(eye: THREE.Vector3, target: THREE.Vector3) {
        this.eye = eye.clone();
        const direction = target.clone().sub(eye);
        this.centerYaw = Math.atan2(direction.x, -direction.z);
        this.distance = direction.length();
        this.reset(target);
    }

    reset(target: THREE.Vector3) {
        const direction = target.clone().sub(this.eye);
        this.yaw = this.desiredYaw = Math.atan2(direction.x, -direction.z);
        this.pitch = this.desiredPitch = Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
        this.writeTarget();
    }

    /** Keep gaze distance consistent so item focus is a head turn from this seat. */
    targetFor(point: THREE.Vector3) {
        return point.clone().sub(this.eye).setLength(this.distance).add(this.eye);
    }

    drag(dx: number, dy: number, viewportHeight: number) {
        const sensitivity = 1.4 / Math.max(1, viewportHeight);
        this.desiredYaw = THREE.MathUtils.clamp(this.desiredYaw - dx * sensitivity, this.centerYaw - 1.15, this.centerYaw + 1.15);
        this.desiredPitch = THREE.MathUtils.clamp(this.desiredPitch + dy * sensitivity, -.8, .35);
    }

    update(delta: number, immediate = false) {
        if (this.yaw === this.desiredYaw && this.pitch === this.desiredPitch) return false;
        const amount = immediate ? 1 : 1 - Math.exp(-14 * delta);
        this.yaw = THREE.MathUtils.lerp(this.yaw, this.desiredYaw, amount);
        this.pitch = THREE.MathUtils.lerp(this.pitch, this.desiredPitch, amount);
        if (Math.abs(this.yaw - this.desiredYaw) < 1e-5) this.yaw = this.desiredYaw;
        if (Math.abs(this.pitch - this.desiredPitch) < 1e-5) this.pitch = this.desiredPitch;
        this.writeTarget();
        return true;
    }

    apply(camera: THREE.Camera) {
        camera.position.copy(this.eye);
        camera.lookAt(this.target);
    }

    private writeTarget() {
        const horizontal = Math.cos(this.pitch);
        this.target.set(Math.sin(this.yaw) * horizontal, Math.sin(this.pitch), -Math.cos(this.yaw) * horizontal)
            .multiplyScalar(this.distance).add(this.eye);
    }
}
