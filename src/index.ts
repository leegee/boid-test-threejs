import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Boid from './Boid';

export const NUM_BOIDS = 350;
const BOX_HEIGHT = 50;

let animating = true;

const canvas: HTMLCanvasElement =
    document.getElementById("glcanvas") as HTMLCanvasElement ||
    document.body.appendChild(document.createElement("canvas"));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

// Compute box dimensions based on screen aspect ratio
const aspect = window.innerWidth / window.innerHeight;
const boxHalfHeight = BOX_HEIGHT / 2;
const boxHalfWidth = boxHalfHeight * aspect;
const boxHalfDepth = boxHalfHeight * 1.2;

const min = new THREE.Vector3(-boxHalfWidth, -boxHalfHeight, -boxHalfDepth);
const max = new THREE.Vector3(boxHalfWidth, boxHalfHeight, boxHalfDepth);

Boid.BOUNDS_MIN.set(min.x, min.y, min.z);
Boid.BOUNDS_MAX.set(max.x, max.y, max.z);

// Add a transparent box mesh
const size = new THREE.Vector3().subVectors(max, min);
const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.05,
    side: THREE.BackSide, // Show from inside
});
const boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
boundingBox.position.copy(center);
scene.add(boundingBox);

// Add box edges (no diagonals)
const edges = new THREE.EdgesGeometry(boxGeometry);
const edgeLines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
);
edgeLines.position.copy(center);
scene.add(edgeLines);

// Camera & controls
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 70;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 200;

// Lights (fixed version)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Hoop obstacle
const hoopGeometry = new THREE.TorusGeometry(15, 6, 26, 120);
hoopGeometry.computeVertexNormals();

const hoopMaterial = new THREE.MeshStandardMaterial({
    metalness: 1.0,
    roughness: 0.4,
    color: 0x557700,
    side: THREE.DoubleSide
});

// const hoopMaterial = new THREE.MeshPhongMaterial({
//     color: 0x557700,
//     shininess: 100,
//     specular: 0x999999,
//     side: THREE.DoubleSide
// });

const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
backLight.position.set(-10, -10, -10);
scene.add(backLight);

const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
hoop.rotation.x = Math.PI / 1.2;
hoop.rotation.y = Math.PI / 1.2;
hoop.rotation.z = Math.PI / 2;
scene.add(hoop);

const targetGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
targetMarker.visible = false;
scene.add(targetMarker);

// Boids
const boids: Boid[] = [];
for (let i = 0; i < NUM_BOIDS; i++) {
    const boid = new Boid();
    scene.add(boid.mesh);
    boids.push(boid);
}

window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === " ") {
        animating = !animating;
        if (animating) animate();
    }
});

let mouse3D: THREE.Vector3 | null = null;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

window.addEventListener("mousemove", (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Get point in the box's plane along the ray
    const point = raycaster.ray.origin.clone().add(
        raycaster.ray.direction.clone().multiplyScalar(50) // arbitrary depth
    );

    // Check if point is inside bounding box
    if (
        point.x >= min.x && point.x <= max.x &&
        point.y >= min.y && point.y <= max.y &&
        point.z >= min.z && point.z <= max.z
    ) {
        mouse3D = point;
    } else {
        mouse3D = null;
    }

    if (mouse3D) {
        targetMarker.position.copy(mouse3D);
        targetMarker.visible = true;
    } else {
        targetMarker.visible = false;
    }
});

animate();

function animate() {
    if (!animating) return;
    requestAnimationFrame(animate);

    for (const boid of boids) {
        boid.flock(boids);
        if (mouse3D) {
            const steer = boid.seek(mouse3D);
            boid.avoidObstacles([hoop.position]);
            boid.applyForce(steer);
        }
        boid.update();
    }

    controls.update();
    renderer.render(scene, camera);
}
