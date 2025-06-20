import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Three.js 3D Chess Animations Background
let scene, camera, renderer, controls;
let pieces = [];
let clock = new THREE.Clock();
let loadedModels = [];

async function initThreeBG() {
  const bgDiv = document.getElementById('three-bg');

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15172a);

  // Camera setup
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(0, 15, 30);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  bgDiv.appendChild(renderer.domElement);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = false; // Disable auto-rotation

  // Lighting
  setupLighting();

  // Load chess pieces
  await loadChessPieces();

  // Initial render
  renderScene();

  // Scroll listener for piece animation
  window.addEventListener('scroll', onScroll);
  window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
  // Ambient light
  const ambient = new THREE.AmbientLight(0x48e3fb, 0.4);
  scene.add(ambient);

  // Main directional light
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 20, 15);
  scene.add(mainLight);

  // Accent lights
  const blueLight = new THREE.PointLight(0x48e3fb, 1, 50);
  blueLight.position.set(-10, 15, 10);
  scene.add(blueLight);

  const purpleLight = new THREE.PointLight(0x643efe, 1, 50);
  purpleLight.position.set(10, 15, -10);
  scene.add(purpleLight);
}

async function loadChessPieces() {
  const loader = new GLTFLoader();
  const pieceTypes = ['Queen', 'bishop', 'knight', 'rook'];
  const loadPromises = [];

  // Load each piece type
  for (const type of pieceTypes) {
    const promise = new Promise((resolve, reject) => {
      loader.load(
        `Web Chess/${type}.glb`,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1
              });
            }
          });
          loadedModels.push({ type, model: gltf.scene.clone() });
          resolve();
        },
        undefined,
        reject
      );
    });
    loadPromises.push(promise);
  }

  // Wait for all pieces to load
  await Promise.all(loadPromises);
  
  // Create chess piece instances
  createChessPieceInstances();
}

function createChessPieceInstances() {
  // Arrange pieces in a more dynamic, multi-orbit pattern
  const baseRadius = 18;
  const yBase = 0;
  const count = loadedModels.length;
  for (let i = 0; i < count; i++) {
    const modelData = loadedModels[i];
    // Vary radius and height for each piece
    const orbitRadius = baseRadius + Math.sin(i) * 3 + Math.random() * 2;
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    const instance = modelData.model.clone();
    // Make the pieces smaller
    instance.scale.set(1.1, 1.1, 1.1);
    instance.position.set(x, yBase, z);
    instance.rotation.y = angle + Math.PI / 2;
    instance.userData = {
      originalY: yBase + Math.sin(i) * 1.5,
      floatOffset: Math.random() * Math.PI * 2,
      rotateSpeed: 0.12 + Math.random() * 0.18, // much slower
      floatHeight: 0.7 + Math.random() * 0.5, // more subtle
      orbitRadius: orbitRadius,
      orbitAngle: angle,
      orbitSpeed: 0.03 + Math.random() * 0.04, // much slower
      rotXSpeed: 0.03 + Math.random() * 0.07, // slower
      rotZSpeed: 0.03 + Math.random() * 0.07 // slower
    };
    scene.add(instance);
    pieces.push(instance);
  }
}

function onScroll() {
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  // Calculate scroll progress (0 to 1)
  const scrollProgress = scrollY / (docHeight - windowHeight);
  // Animate pieces based on scroll
  const time = scrollProgress * 8; // Map scroll to a virtual time
  pieces.forEach((piece, index) => {
    // Orbit animation (slower, smoother)
    const baseAngle = (index / pieces.length) * Math.PI * 2;
    piece.userData.orbitAngle = baseAngle + scrollProgress * Math.PI * 2 * piece.userData.orbitSpeed * 20;
    piece.position.x = Math.cos(piece.userData.orbitAngle) * piece.userData.orbitRadius;
    piece.position.z = Math.sin(piece.userData.orbitAngle) * piece.userData.orbitRadius;
    // Floating animation (subtle)
    piece.position.y = piece.userData.originalY + Math.sin(time * (0.7 + index * 0.13) + piece.userData.floatOffset) * piece.userData.floatHeight;
    // Multi-axis rotation (slower)
    piece.rotation.y = baseAngle + (scrollProgress * Math.PI * 2 * piece.userData.rotateSpeed * 4);
    piece.rotation.x = Math.sin(time * piece.userData.rotXSpeed + index) * 0.18;
    piece.rotation.z = Math.cos(time * piece.userData.rotZSpeed + index) * 0.12;
  });
  controls.update();
  renderScene();
}

function renderScene() {
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderScene();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', initThreeBG);