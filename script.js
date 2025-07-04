// Import THREE.js from a reliable CDN
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.165.0/three.module.min.js';
// Add GLTFLoader import
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.min.js';

window.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollToPlugin);

    // NEW: Reference skeleton loader and canvas, hide canvas until model ready
    const canvasSkeleton = document.getElementById('canvasSkeleton');
    const canvasEl = document.getElementById('bgCanvas');

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Responsive canvas and camera
    function handleResize() {
        // Update camera aspect and projection
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // Update renderer size and pixel ratio
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    window.addEventListener('resize', handleResize);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 200);
    pointLight.position.set(5, 10, 10);
    scene.add(pointLight);

    // Additional subtle hemisphere light for more realistic ambient gradient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    // --- The "Knight" Object (now replaced with random chess piece model) ---
    const loader = new GLTFLoader();

    let knight; // Will hold the loaded mesh

    // --- Define the 3D path ---
    const pathPoints = [
        new THREE.Vector3(0, 8, 0),
        new THREE.Vector3(4, 4, 2),
        new THREE.Vector3(-3, 0, -3),
        new THREE.Vector3(5, -4, 1),
        new THREE.Vector3(0, -8, -5)
    ];
    const curve = new THREE.CatmullRomCurve3(pathPoints);

    // --- Visuals for path and checkpoints ---
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.5 });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);

    const checkpointMaterial = new THREE.MeshBasicMaterial({ color: 0xa5b4fc, wireframe: false });
    const checkpointGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 50);

    pathPoints.forEach(pos => {
        const checkpointMesh = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
        checkpointMesh.position.copy(pos);
        scene.add(checkpointMesh);
    });

    // --- Camera State & Smoothing ---
    const cameraTargetPosition = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3();
    const smoothedFrameCenter = new THREE.Vector3();
    let smoothedCameraDistance = 12;

    // --- Threshold-based Navigation Logic ---
    const htmlCheckpoints = gsap.utils.toArray('.checkpoint');
    const numSegments = pathPoints.length - 1;

    let currentSectionIndex = 0;
    let isAnimating = false;
    let scrollAccumulator = 0;
    const scrollThreshold = 100;

    let touchStartY = 0;
    let touchDeltaY = 0;
    const touchThreshold = 75;

    function updateScene(progress) {
        if (!knight) return; // Wait for model to load
        knight.position.copy(curve.getPointAt(progress));

        const segmentProgress = progress * numSegments;
        const precedingIndex = Math.max(0, Math.floor(segmentProgress));
        const nextIndex = Math.min(numSegments, precedingIndex + 1);

        const precedingCp = pathPoints[precedingIndex];
        const nextCp = pathPoints[nextIndex];

        const frameBox = new THREE.Box3().setFromPoints([precedingCp, knight.position, nextCp]);
        const rawCenter = new THREE.Vector3();
        const size = new THREE.Vector3();
        frameBox.getCenter(rawCenter);
        frameBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let rawCameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        rawCameraDistance = Math.max(rawCameraDistance * 1.5, 10);

        const smoothingFactor = 0.08;
        smoothedFrameCenter.lerp(rawCenter, smoothingFactor);
        smoothedCameraDistance = THREE.MathUtils.lerp(smoothedCameraDistance, rawCameraDistance, smoothingFactor);

        cameraTargetPosition.set(smoothedFrameCenter.x, smoothedFrameCenter.y, smoothedFrameCenter.z + smoothedCameraDistance);
        cameraLookAt.copy(smoothedFrameCenter);
    }

    function goToSection(index) {
        if (isAnimating || index < 0 || index > numSegments) return;
        isAnimating = true;

        // Close mobile details box if open
        if (window.innerWidth <= 1023) {
            const currentDetailsBox = document.querySelector('.details-box.show');
            if (currentDetailsBox) {
                currentDetailsBox.classList.remove('show');
            }
        }

        htmlCheckpoints.forEach((cp, i) => {
            cp.classList.toggle('active', i === index);
        });

        gsap.to({ progress: currentSectionIndex / numSegments }, {
            progress: index / numSegments,
            duration: 1.2,
            ease: 'power3.inOut',
            onUpdate: function () {
                updateScene(this.targets()[0].progress);
            },
            onComplete: () => {
                isAnimating = false;
                scrollAccumulator = 0;
                
                // Update mobile details box after animation
                if (window.innerWidth <= 1023) {
                    setTimeout(() => {
                        const event = new CustomEvent('checkpointChanged', { detail: { index } });
                        document.dispatchEvent(event);
                    }, 100);
                }
            }
        });

        currentSectionIndex = index;
    }

    // --- Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);
        const lerpFactor = 0.05;
        camera.position.lerp(cameraTargetPosition, lerpFactor);

        const targetQuaternion = new THREE.Quaternion();
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(camera.position, cameraLookAt, camera.up);
        targetQuaternion.setFromRotationMatrix(tempMatrix);
        camera.quaternion.slerp(targetQuaternion, lerpFactor);

        renderer.render(scene, camera);
    }
    // animate(); // Now called after model loads

    // --- Event Listeners for Mouse Wheel and Touch ---
    let wheelHandler, touchStartHandler, touchMoveHandler, touchEndHandler, preventPullToRefreshHandler;

    function enableMainScrollEvents() {
        window.addEventListener('wheel', wheelHandler, { passive: false });
        window.addEventListener('touchstart', touchStartHandler, { passive: true });
        window.addEventListener('touchmove', touchMoveHandler, { passive: true });
        window.addEventListener('touchend', touchEndHandler, { passive: true });
        window.addEventListener('touchmove', preventPullToRefreshHandler, { passive: false });
    }

    function disableMainScrollEvents() {
        window.removeEventListener('wheel', wheelHandler, { passive: false });
        window.removeEventListener('touchstart', touchStartHandler, { passive: true });
        window.removeEventListener('touchmove', touchMoveHandler, { passive: true });
        window.removeEventListener('touchend', touchEndHandler, { passive: true });
        window.removeEventListener('touchmove', preventPullToRefreshHandler, { passive: false });
    }

    // --- Threshold-based Navigation Logic ---

    wheelHandler = function(event) {
        event.preventDefault();
        if (isAnimating) return;

        scrollAccumulator += event.deltaY;

        if (scrollAccumulator > scrollThreshold) {
            goToSection(currentSectionIndex + 1);
        } else if (scrollAccumulator < -scrollThreshold) {
            goToSection(currentSectionIndex - 1);
        }
    };

    touchStartHandler = function(event) {
        if (isAnimating) return;
        touchStartY = event.touches[0].clientY;
        touchDeltaY = 0;
    };

    touchMoveHandler = function(event) {
        if (isAnimating) return;
        touchDeltaY = event.touches[0].clientY - touchStartY;
    };

    touchEndHandler = function() {
        if (isAnimating) return;

        if (touchDeltaY < -touchThreshold) {
            goToSection(currentSectionIndex + 1);
        }
        else if (touchDeltaY > touchThreshold) {
            goToSection(currentSectionIndex - 1);
        }

        touchDeltaY = 0;
    };

    preventPullToRefreshHandler = function(e) {
        if (window.scrollY === 0 && e.touches[0].clientY > touchStartY) {
            e.preventDefault();
        }
    };

    enableMainScrollEvents();

    // --- Lazy Loading for 3D Model ---
    function loadChessPiece() {
        // Avoid duplicate loads
        if (knight) return;
        const pieceTypes = ['queen', 'bishop', 'knight', 'rook', 'pawn', 'king'];
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];

        loader.load(
            `Web Chess/${randomType}.glb`,
            (gltf) => {
                knight = gltf.scene;
                knight.scale.set(1.5, 1.5, 1.5);
                knight.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material.metalness = 0.6;
                        child.material.roughness = 0.4;
                        child.material.color.set(0x818cf8);
                        child.material.emissive.set(0x312e81);
                        child.material.emissiveIntensity = 0.2;
                    }
                });
                scene.add(knight);

                // Place at initial position and set up camera
                knight.position.copy(curve.getPoint(0));
                camera.position.set(0, pathPoints[0].y, 12);
                cameraLookAt.copy(knight.position);
                cameraTargetPosition.copy(camera.position);
                camera.lookAt(cameraLookAt);
                smoothedFrameCenter.copy(knight.position);

                // Smooth transition from skeleton to canvas
                if (canvasSkeleton) {
                    canvasSkeleton.classList.add('fade-out');
                    setTimeout(() => {
                        canvasSkeleton.style.display = 'none';
                        canvasEl.classList.remove('hidden');
                        // Add a small delay before showing canvas for smoother transition
                        setTimeout(() => {
                            canvasEl.classList.add('loaded');
                        }, 100);
                    }, 500);
                } else {
                    canvasEl.classList.remove('hidden');
                    canvasEl.classList.add('loaded');
                }

                handleResize();
                animate();
                htmlCheckpoints[0].classList.add('active');
                updateScene(0);
            }
        );
    }

    // Use IntersectionObserver to trigger model loading when skeleton enters view
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadChessPiece();
                    obs.disconnect();
                }
            });
        }, { rootMargin: '200px' });

        if (canvasSkeleton) observer.observe(canvasSkeleton);
    } else {
        // Fallback: load immediately
        loadChessPiece();
    }

    // --- END Lazy Loading ---

    // Mobile nav toggle (from index.html)
    const menuBtn = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    const glassNav = document.querySelector('.glass-nav');
    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('open');
        menuBtn.classList.toggle('open');
        document.body.classList.toggle('nav-open');
        if (window.innerWidth <= 768) {
            glassNav.classList.toggle('menu-open', nav.classList.contains('open'));
        }
    });
    // Close nav on link click (mobile)
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('open');
            menuBtn.classList.remove('open');
            document.body.classList.remove('nav-open');
            if (window.innerWidth <= 768) {
                glassNav.classList.remove('menu-open');
            }
        });
    });

    // --- About Section Slide-in Logic ---
    const aboutBtn = document.getElementById('about-btn');
    const aboutSection = document.getElementById('about-section');
    const aboutBackBtn = document.getElementById('about-back-btn');
    const aboutBlurOverlay = document.getElementById('about-blur-overlay');
    const timeline = document.querySelector('.timeline');

    function openAboutSection() {
        aboutSection.classList.add('active');
        aboutBlurOverlay.classList.add('active');
        timeline.style.filter = 'blur(4px)';
        timeline.style.pointerEvents = 'none';
        document.body.style.overflow = 'hidden';
        aboutSection.scrollTop = 0;
        disableMainScrollEvents();
        aboutSection.style.overflowY = 'auto';
    }

    function closeAboutSection() {
        aboutSection.classList.remove('active');
        aboutBlurOverlay.classList.remove('active');
        timeline.style.filter = '';
        timeline.style.pointerEvents = '';
        document.body.style.overflow = '';
        enableMainScrollEvents();
        aboutSection.style.overflowY = '';
    }

    if (aboutBtn && aboutSection && aboutBackBtn && aboutBlurOverlay && timeline) {
        aboutBtn.addEventListener('click', openAboutSection);
        aboutBackBtn.addEventListener('click', closeAboutSection);
        aboutBlurOverlay.addEventListener('click', closeAboutSection);
    }

    // --- Mobile Slide Gesture for Details Box ---
    if (window.innerWidth <= 1023) {
        const slideIndicator = document.getElementById('slideIndicator');
        let currentDetailsBox = null;
        let isDetailsBoxOpen = false;
        let slideStartY = 0;
        let slideCurrentY = 0;
        let isDragging = false;

        function showSlideIndicator() {
            if (slideIndicator && !isDetailsBoxOpen) {
                slideIndicator.classList.add('show');
                setTimeout(() => {
                    slideIndicator.classList.remove('show');
                }, 3000);
            }
        }

        function updateDetailsBox() {
            const activeCheckpoint = document.querySelector('.checkpoint.active');
            if (activeCheckpoint) {
                currentDetailsBox = activeCheckpoint.querySelector('.details-box');
                if (currentDetailsBox) {
                    // Update slide indicator text based on current checkpoint
                    const checkpointIndex = Array.from(htmlCheckpoints).indexOf(activeCheckpoint);
                    if (slideIndicator) {
                        const messages = [
                            'Swipe up for platform overview',
                            'Swipe up for learning details',
                            'Swipe up for visualizer info',
                            'Swipe up for puzzle details',
                            'Swipe up for our vision'
                        ];
                        slideIndicator.innerHTML = `
                            <span class="material-icons" style="font-size: 0.9rem; margin-right: 0.3rem;">swipe_up</span>
                            ${messages[checkpointIndex] || 'Swipe up for details'}
                        `;
                    }
                    showSlideIndicator();
                }
            }
        }

        function handleSlideStart(e) {
            if (isAnimating) return;
            
            // Only handle slide gestures in the bottom half of the screen
            const screenHeight = window.innerHeight;
            const touchY = e.touches ? e.touches[0].clientY : e.clientY;
            
            if (touchY < screenHeight * 0.5 && !isDetailsBoxOpen) {
                return; // Let main navigation handle this
            }
            
            slideStartY = touchY;
            slideCurrentY = slideStartY;
            isDragging = true;
            
            if (currentDetailsBox) {
                currentDetailsBox.style.transition = 'none';
            }
        }

        function handleSlideMove(e) {
            if (!isDragging || isAnimating) return;
            
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaY = slideStartY - currentY;
            slideCurrentY = currentY;

            if (currentDetailsBox) {
                if (!isDetailsBoxOpen && deltaY > 0) {
                    // Swiping up to open
                    const progress = Math.min(deltaY / 150, 1);
                    const translateY = 100 - (progress * 100);
                    currentDetailsBox.style.transform = `translateY(${translateY}%)`;
                } else if (isDetailsBoxOpen && deltaY < 0) {
                    // Swiping down to close
                    const progress = Math.min(Math.abs(deltaY) / 150, 1);
                    const translateY = progress * 100;
                    currentDetailsBox.style.transform = `translateY(${translateY}%)`;
                }
            }
        }

        function handleSlideEnd(e) {
            if (!isDragging || isAnimating) return;
            isDragging = false;

            const deltaY = slideStartY - slideCurrentY;
            const threshold = 75;

            if (currentDetailsBox) {
                currentDetailsBox.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                
                if (!isDetailsBoxOpen && deltaY > threshold) {
                    // Open details box
                    currentDetailsBox.classList.add('show');
                    currentDetailsBox.style.transform = 'translateY(0)';
                    isDetailsBoxOpen = true;
                    if (slideIndicator) {
                        slideIndicator.innerHTML = `
                            <span class="material-icons" style="font-size: 0.9rem; margin-right: 0.3rem;">swipe_down</span>
                            Swipe down to close
                        `;
                        slideIndicator.classList.add('show');
                    }
                } else if (isDetailsBoxOpen && deltaY < -threshold) {
                    // Close details box
                    currentDetailsBox.classList.remove('show');
                    currentDetailsBox.style.transform = 'translateY(100%)';
                    isDetailsBoxOpen = false;
                    setTimeout(updateDetailsBox, 300);
                } else {
                    // Snap back to current state
                    if (isDetailsBoxOpen) {
                        currentDetailsBox.style.transform = 'translateY(0)';
                    } else {
                        currentDetailsBox.style.transform = 'translateY(100%)';
                    }
                }
            }
        }

        // Touch events for mobile slide gesture
        document.addEventListener('touchstart', handleSlideStart, { passive: true });
        document.addEventListener('touchmove', handleSlideMove, { passive: true });
        document.addEventListener('touchend', handleSlideEnd, { passive: true });

        // Mouse events for testing on desktop
        document.addEventListener('mousedown', handleSlideStart);
        document.addEventListener('mousemove', handleSlideMove);
        document.addEventListener('mouseup', handleSlideEnd);

        // Listen for checkpoint changes
        document.addEventListener('checkpointChanged', (e) => {
            isDetailsBoxOpen = false;
            updateDetailsBox();
        });

        // Initialize on first load
        setTimeout(updateDetailsBox, 1000);
    }
});