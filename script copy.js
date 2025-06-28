    // Import THREE.js from a reliable CDN
        import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.165.0/three.module.min.js';

        window.addEventListener('DOMContentLoaded', () => {
            gsap.registerPlugin(ScrollToPlugin);

            // --- Scene Setup ---
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('bgCanvas'),
                alpha: false
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

            // --- The "Knight" Object ---
            const knightGeometry = new THREE.BoxGeometry(1, 1, 1);
            const knightMaterial = new THREE.MeshStandardMaterial({
                color: 0x818cf8,
                roughness: 0.4,
                metalness: 0.6,
                emissive: 0x312e81,
                emissiveIntensity: 0.2
            });
            const knight = new THREE.Mesh(knightGeometry, knightMaterial);
            scene.add(knight);

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

            // --- Initial Positions ---
            knight.position.copy(curve.getPoint(0));
            camera.position.set(0, pathPoints[0].y, 12);
            cameraLookAt.copy(knight.position);
            cameraTargetPosition.copy(camera.position);
            camera.lookAt(cameraLookAt);
            smoothedFrameCenter.copy(knight.position);

            // Ensure camera and renderer are correct on load
            handleResize();

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
            animate();

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

            const rotationTimeline = gsap.timeline({ paused: true });
            rotationTimeline.to(knight.rotation, {
                x: Math.PI * 4,
                y: Math.PI * 2,
                z: Math.PI * 6,
                ease: "none"
            }, 0);

            function updateScene(progress) {
                rotationTimeline.progress(progress);
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
                    }
                });

                currentSectionIndex = index;
            }

            // --- Event Listeners for Mouse Wheel and Touch ---
            window.addEventListener('wheel', (event) => {
                event.preventDefault();
                if (isAnimating) return;

                scrollAccumulator += event.deltaY;

                if (scrollAccumulator > scrollThreshold) {
                    goToSection(currentSectionIndex + 1);
                } else if (scrollAccumulator < -scrollThreshold) {
                    goToSection(currentSectionIndex - 1);
                }
            }, { passive: false });

            window.addEventListener('touchstart', (event) => {
                if (isAnimating) return;
                touchStartY = event.touches[0].clientY;
                touchDeltaY = 0;
            }, { passive: true });

            window.addEventListener('touchmove', (event) => {
                if (isAnimating) return;
                touchDeltaY = event.touches[0].clientY - touchStartY;
            }, { passive: true });

            window.addEventListener('touchend', () => {
                if (isAnimating) return;

                if (touchDeltaY < -touchThreshold) {
                    goToSection(currentSectionIndex + 1);
                }
                else if (touchDeltaY > touchThreshold) {
                    goToSection(currentSectionIndex - 1);
                }

                touchDeltaY = 0;
            }, { passive: true });

            // This was added by the user, leaving it in.
            window.addEventListener('touchmove', function (e) {
                if (window.scrollY === 0 && e.touches[0].clientY > touchStartY) {
                    e.preventDefault();
                }
            }, { passive: false });

            // --- Initial Setup ---
            htmlCheckpoints[0].classList.add('active');
            updateScene(0);
        });

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