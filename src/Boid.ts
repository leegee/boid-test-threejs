import * as THREE from 'three';

export default class Boid {
    // Configurable static bounds (default ±25)
    static BOUNDS_MIN = new THREE.Vector3(-25, -25, -25);
    static BOUNDS_MAX = new THREE.Vector3(25, 25, 25);

    private static readonly MAX_SPEED = 0.5;
    private static readonly MAX_FORCE = 0.13;
    private static readonly NEIGHBOR_DIST = 5;
    private static readonly DESIRED_SEPARATION = 4;

    private static readonly geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    private static readonly material = new THREE.MeshStandardMaterial({ color: 0x3399ff });

    position: THREE.Vector3;
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    mesh: THREE.Mesh;

    constructor() {
        this.position = new THREE.Vector3(
            THREE.MathUtils.lerp(Boid.BOUNDS_MIN.x, Boid.BOUNDS_MAX.x, Math.random()),
            THREE.MathUtils.lerp(Boid.BOUNDS_MIN.y, Boid.BOUNDS_MAX.y, Math.random()),
            THREE.MathUtils.lerp(Boid.BOUNDS_MIN.z, Boid.BOUNDS_MAX.z, Math.random())
        );

        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(Boid.MAX_SPEED);

        this.acceleration = new THREE.Vector3();
        this.mesh = new THREE.Mesh(Boid.geometry, Boid.material);
    }

    applyForce(force: THREE.Vector3): void {
        this.acceleration.add(force);
    }

    separation(boids: Boid[]): THREE.Vector3 {
        const steer = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < Boid.DESIRED_SEPARATION) {
                const diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.normalize().divideScalar(d);
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) steer.divideScalar(count);
        if (steer.length() > 0) {
            steer.setLength(Boid.MAX_SPEED);
            steer.sub(this.velocity);
            steer.clampLength(0, Boid.MAX_FORCE);
        }

        return steer;
    }

    alignment(boids: Boid[]): THREE.Vector3 {
        const sum = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < Boid.NEIGHBOR_DIST) {
                sum.add(other.velocity);
                count++;
            }
        }

        if (count === 0) return new THREE.Vector3();

        sum.divideScalar(count).setLength(Boid.MAX_SPEED);
        const steer = sum.sub(this.velocity);
        steer.clampLength(0, Boid.MAX_FORCE);

        return steer;
    }

    cohesion(boids: Boid[]): THREE.Vector3 {
        const sum = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            if (other !== this && d < Boid.NEIGHBOR_DIST) {
                sum.add(other.position);
                count++;
            }
        }

        if (count === 0) return new THREE.Vector3();

        sum.divideScalar(count);
        return this.seek(sum);
    }

    seek(target: THREE.Vector3): THREE.Vector3 {
        const desired = new THREE.Vector3().subVectors(target, this.position).setLength(Boid.MAX_SPEED);
        const steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, Boid.MAX_FORCE);
        return steer;
    }

    flock(boids: Boid[]): void {
        const separation = this.separation(boids).multiplyScalar(1.5);
        const alignment = this.alignment(boids).multiplyScalar(1.0);
        const cohesion = this.cohesion(boids).multiplyScalar(1.0);

        this.applyForce(separation);
        this.applyForce(alignment);
        this.applyForce(cohesion);
    }

    updateWithWrap(): void {
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, Boid.MAX_SPEED);
        this.position.add(this.velocity);
        this.acceleration.set(0, 0, 0);

        // Wrap around bounds using static limits
        for (const axis of ['x', 'y', 'z'] as const) {
            if (this.position[axis] > Boid.BOUNDS_MAX[axis]) this.position[axis] = Boid.BOUNDS_MIN[axis];
            if (this.position[axis] < Boid.BOUNDS_MIN[axis]) this.position[axis] = Boid.BOUNDS_MAX[axis];
        }

        this.mesh.position.copy(this.position);

        const up = new THREE.Vector3(0, 1, 0);
        const direction = this.velocity.clone().normalize();
        this.mesh.quaternion.setFromUnitVectors(up, direction);
    }

    update(): void {
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, Boid.MAX_SPEED);
        this.position.add(this.velocity);
        this.acceleration.set(0, 0, 0);

        // Bounce off bounds using static limits
        for (const axis of ['x', 'y', 'z'] as const) {
            if (this.position[axis] > Boid.BOUNDS_MAX[axis]) {
                this.position[axis] = Boid.BOUNDS_MAX[axis];
                this.velocity[axis] *= -1;
            }
            if (this.position[axis] < Boid.BOUNDS_MIN[axis]) {
                this.position[axis] = Boid.BOUNDS_MIN[axis];
                this.velocity[axis] *= -1;
            }
        }

        this.mesh.position.copy(this.position);

        const up = new THREE.Vector3(0, 1, 0);
        const direction = this.velocity.clone().normalize();
        this.mesh.quaternion.setFromUnitVectors(up, direction);
    }
}
