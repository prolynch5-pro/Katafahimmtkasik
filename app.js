const openingScreen = document.querySelector('#opening-screen');
const openingTrigger = document.querySelector('#opening-trigger');
const canvasContainer = document.querySelector('#sphere-canvas');
const presentation = document.querySelector('.presentation');
const panel = document.querySelector('#lesson-panel');
const partsSection = document.querySelector('#parts-section');
const exploreButton = document.querySelector('#explore-button');
const closeButton = document.querySelector('#close-panel');
const iceLaunchButton = document.querySelector('#ice-launch-button');
const iceOverlay = document.querySelector('#ice-overlay');
const iceGameCanvas = document.querySelector('#ice-game-canvas');
const iceConfirmButton = document.querySelector('#ice-confirm-button');
const zonkMessage = document.querySelector('#ice-zonk');
const iceFeedback = document.querySelector('#ice-game-feedback');
const guessOptions = [...document.querySelectorAll('.guess-option')];

openingTrigger.addEventListener('click', () => {
    openingTrigger.disabled = true;
    openingScreen.classList.add('is-exploding');
    window.setTimeout(() => {
        openingScreen.hidden = true;
        presentation.hidden = false;
        presentation.classList.add('is-entering');
        resizeScene();
        resizeIceGame();
        iceLaunchButton.focus();
        window.setTimeout(() => presentation.classList.remove('is-entering'), 850);
    }, 500);
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.2, 5.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
canvasContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 2.1);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
keyLight.position.set(-3, 4, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 12;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.7);
fillLight.position.set(4, 1, 2);
scene.add(fillLight);

const sphereGroup = new THREE.Group();
sphereGroup.rotation.x = -0.13;
scene.add(sphereGroup);

const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 64, 64),
    new THREE.MeshPhysicalMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.54,
        roughness: 0.24,
        metalness: 0.06,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2
    })
);
core.castShadow = true;
core.receiveShadow = true;
sphereGroup.add(core);

const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1.47, 24, 16)),
    new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.86 })
);
sphereGroup.add(wireframe);

const equator = new THREE.Mesh(
    new THREE.TorusGeometry(1.475, 0.008, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.7 })
);
equator.rotation.x = Math.PI / 2;
sphereGroup.add(equator);

const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 64),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.07 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.set(0, -1.65, 0);
shadowPlane.scale.set(1.4, 0.36, 1);
shadowPlane.visible = false;
scene.add(shadowPlane);

let targetRotationX = -0.13;
let targetRotationY = 0.35;
let isDragging = false;
let previousPointer = { x: 0, y: 0 };
let isFlatMode = false;

const iceScene = new THREE.Scene();
const iceCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
iceCamera.position.z = 8;
const iceRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
iceRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
iceRenderer.outputColorSpace = THREE.SRGBColorSpace;
iceGameCanvas.appendChild(iceRenderer.domElement);

const iceBalls = [];
const iceBallPositions = [
    [-2.25, .65], [-.75, -.5], [.75, .7], [2.25, -.45], [0, .05]
];
const iceBallColors = [0xffffff, 0x111111, 0xd4d4d4, 0xffffff, 0xf5f5f5];
const correctIceBallIndex = 3;
const iceRaycaster = new THREE.Raycaster();
const icePointer = new THREE.Vector2();
const iceRing = new THREE.Mesh(
    new THREE.TorusGeometry(.58, .035, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: .95 })
);
iceRing.visible = false;
iceScene.add(iceRing);

iceBallPositions.forEach(([x, y], index) => {
    const displayX = index === correctIceBallIndex ? 0 : x;
    const displayY = index === correctIceBallIndex ? 0 : y;
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(.4, 32, 24),
        new THREE.MeshStandardMaterial({ color: iceBallColors[index], roughness: .3, metalness: .04 })
    );
    ball.position.set(displayX, displayY, 0);
    ball.userData = { index, baseX: displayX, baseY: displayY, phase: index * 1.4, velocity: .012 + index * .002 };
    iceScene.add(ball);
    iceBalls.push(ball);

    const lineColor = index === 1 || index === 3 ? 0xffffff : 0x111111;
    if (index === 0) {
        ball.add(new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.SphereGeometry(.425, 12, 8)),
            new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: .8 })
        ));
    }
    if (index === 1) {
        const band = new THREE.Mesh(
            new THREE.TorusGeometry(.405, .025, 8, 48),
            new THREE.MeshBasicMaterial({ color: lineColor })
        );
        band.rotation.x = Math.PI / 2;
        ball.add(band);
    }
    if (index === 2) {
        [-.45, .45].forEach((rotation) => {
            const band = new THREE.Mesh(
                new THREE.TorusGeometry(.41, .022, 8, 48),
                new THREE.MeshBasicMaterial({ color: lineColor })
            );
            band.rotation.z = rotation;
            ball.add(band);
        });
    }
    if (index === 3) {
        const cross = new THREE.Mesh(
            new THREE.TorusGeometry(.41, .023, 8, 48),
            new THREE.MeshBasicMaterial({ color: lineColor })
        );
        cross.rotation.set(Math.PI / 2, .65, .35);
        ball.add(cross);
    }
    if (index === 4) {
        const target = new THREE.Mesh(
            new THREE.TorusGeometry(.41, .018, 8, 48),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        target.rotation.x = Math.PI / 2;
        ball.add(target);
        ball.add(new THREE.Mesh(
            new THREE.SphereGeometry(.08, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        ));
    }
    ball.visible = index === correctIceBallIndex;
});

iceScene.add(new THREE.AmbientLight(0xffffff, 2.2));
const iceLight = new THREE.PointLight(0xffffff, 5, 20);
iceLight.position.set(-2, 3, 5);
iceScene.add(iceLight);

let selectedIceBallIndex = null;
let iceGamePaused = false;
let iceWinning = false;

function resizeIceGame() {
    const width = iceGameCanvas.clientWidth;
    const height = iceGameCanvas.clientHeight;
    if (!width || !height) return;
    iceCamera.aspect = width / height;
    iceCamera.updateProjectionMatrix();
    iceRenderer.setSize(width, height, false);
}

function showIceSelection(index) {
    const objectLabel = String.fromCharCode(65 + index);
    selectedIceBallIndex = index;
    iceGamePaused = true;
    guessOptions.forEach((option, optionIndex) => {
        option.classList.toggle('is-selected', optionIndex === index);
    });
    const ball = iceBalls[index];
    iceRing.visible = index === correctIceBallIndex;
    if (ball) iceRing.position.copy(ball.position);
    iceConfirmButton.hidden = false;
    iceFeedback.textContent = `Objek ${objectLabel} dipilih. Yakin dengan pilihanmu? Tekan ENTER untuk mengunci.`;
}

function moveIceSelection(direction) {
    const nextIndex = selectedIceBallIndex === null
        ? 0
        : (selectedIceBallIndex + direction + iceBalls.length) % iceBalls.length;
    showIceSelection(nextIndex);
}

function resetIceGame() {
    iceBalls.forEach((ball) => {
        ball.visible = ball.userData.index === correctIceBallIndex;
        ball.scale.setScalar(1);
        ball.position.set(ball.userData.baseX, ball.userData.baseY, 0);
    });
    selectedIceBallIndex = null;
    iceGamePaused = false;
    iceWinning = false;
    iceRing.visible = false;
    guessOptions.forEach((option) => option.classList.remove('is-selected', 'is-faded'));
    iceConfirmButton.hidden = true;
    zonkMessage.textContent = '';
    zonkMessage.classList.remove('is-visible');
    iceFeedback.textContent = 'Panah kanan/kiri untuk memilih. Klik juga boleh.';
    resizeIceGame();
}

function confirmIceSelection() {
    if (selectedIceBallIndex === null || iceWinning) return;
    if (selectedIceBallIndex !== correctIceBallIndex) {
        zonkMessage.textContent = 'ZONK! SALAH!';
        zonkMessage.classList.remove('is-visible');
        void zonkMessage.offsetWidth;
        zonkMessage.classList.add('is-visible');
        iceRing.visible = false;
        guessOptions.forEach((option) => option.classList.remove('is-selected'));
        selectedIceBallIndex = null;
        iceGamePaused = false;
        iceConfirmButton.hidden = true;
        iceFeedback.textContent = 'ZONK! Itu bukan bangun ruang bola!';
        window.setTimeout(() => {
            zonkMessage.textContent = '';
            zonkMessage.classList.remove('is-visible');
        }, 1500);
        return;
    }
    iceWinning = true;
    guessOptions.forEach((option, index) => {
        if (index !== correctIceBallIndex) option.classList.add('is-faded');
    });
    iceBalls.forEach((ball, index) => { ball.visible = index === correctIceBallIndex; });
    iceConfirmButton.hidden = true;
    iceRing.visible = false;
    iceFeedback.textContent = 'KAMU JENIUS! 🎉';
}

function animateIceGame(time = 0) {
    if (!iceGamePaused && !iceWinning) {
        iceBalls.forEach((ball) => {
            ball.position.y = ball.userData.baseY + Math.sin(time * .002 + ball.userData.phase) * .18;
            ball.position.x = ball.userData.baseX + Math.cos(time * .0014 + ball.userData.phase) * .12;
        });
    }
    if (selectedIceBallIndex === correctIceBallIndex && !iceWinning) {
        iceRing.position.copy(iceBalls[selectedIceBallIndex].position);
    }
    iceBalls[correctIceBallIndex].rotation.y += .006;
    if (iceWinning) {
        const ball = iceBalls[correctIceBallIndex];
        ball.position.lerp(new THREE.Vector3(-1.35, 0, 1), .045);
        ball.scale.lerp(new THREE.Vector3(2.8, 2.8, 2.8), .045);
        if (ball.scale.x > 2.55) {
            setIceOverlayOpen(false);
            setPanelOpen(true);
            resetIceGame();
        }
    }
    iceRenderer.render(iceScene, iceCamera);
}

function setFlatMode(isFlat) {
    isFlatMode = isFlat;
    canvasContainer.classList.toggle('flat-mode', isFlat);
    canvasContainer.setAttribute('aria-pressed', String(isFlat));
    canvasContainer.setAttribute('aria-label', isFlat
        ? 'Gambar bola 2D dengan titik pusat, jari-jari, dan diameter'
        : 'Klik untuk mengubah bola 3D menjadi gambar bola 2D');
}

function resizeScene() {
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

function animate() {
    requestAnimationFrame(animate);
    if (!isDragging) {
        targetRotationY += 0.0024;
    }
    sphereGroup.rotation.x += (targetRotationX - sphereGroup.rotation.x) * 0.08;
    sphereGroup.rotation.y += (targetRotationY - sphereGroup.rotation.y) * 0.08;
    renderer.render(scene, camera);
}

function setPanelOpen(isOpen) {
    panel.classList.toggle('is-open', isOpen);
    presentation.classList.toggle('panel-open', isOpen);
    exploreButton.setAttribute('aria-expanded', String(isOpen));
    iceLaunchButton.hidden = isOpen;
    window.setTimeout(resizeScene, 600);
    if (isOpen) {
        window.setTimeout(() => {
            panel.scrollTo({
                top: Math.max(0, partsSection.offsetTop - 24),
                behavior: 'auto'
            });
        }, 50);
    }
}

canvasContainer.addEventListener('pointerdown', (event) => {
    isDragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    canvasContainer.setPointerCapture(event.pointerId);
});

canvasContainer.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - previousPointer.x;
    const deltaY = event.clientY - previousPointer.y;
    targetRotationY += deltaX * 0.012;
    targetRotationX = Math.max(-0.9, Math.min(0.9, targetRotationX + deltaY * 0.008));
    previousPointer = { x: event.clientX, y: event.clientY };
});

canvasContainer.addEventListener('pointerup', (event) => {
    isDragging = false;
    canvasContainer.releasePointerCapture(event.pointerId);
});

canvasContainer.addEventListener('click', () => setFlatMode(!isFlatMode));
canvasContainer.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setFlatMode(!isFlatMode);
    }
});

function setIceOverlayOpen(isOpen) {
    iceOverlay.hidden = !isOpen;
    document.body.classList.toggle('ice-open', isOpen);
    if (isOpen) {
        resetIceGame();
        window.setTimeout(resizeIceGame, 30);
    } else {
        iceLaunchButton.focus();
    }
}

exploreButton.addEventListener('click', () => setPanelOpen(true));
closeButton.addEventListener('click', () => setPanelOpen(false));
iceLaunchButton.addEventListener('click', () => setIceOverlayOpen(true));
iceConfirmButton.addEventListener('click', confirmIceSelection);

guessOptions.forEach((option) => {
    option.addEventListener('click', () => showIceSelection(Number(option.dataset.guessIndex)));
});

iceGameCanvas.addEventListener('pointerdown', (event) => {
    const rect = iceGameCanvas.getBoundingClientRect();
    icePointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    icePointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    iceRaycaster.setFromCamera(icePointer, iceCamera);
    const hit = iceRaycaster.intersectObjects(iceBalls.filter((ball) => ball.visible))[0];
    if (hit) showIceSelection(hit.object.userData.index);
});

document.addEventListener('keydown', (event) => {
    if (iceOverlay.hidden) return;
    if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveIceSelection(1);
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveIceSelection(-1);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        confirmIceSelection();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        setIceOverlayOpen(false);
    }
});

function readNumber(value) {
    const normalized = value.trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
    if (!normalized) return NaN;
    if (normalized.includes(',')) {
        return Number(normalized.replace(/\./g, '').replace(',', '.'));
    }
    const dotParts = normalized.split('.');
    if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length === 3)) {
        return Number(normalized.replace(/\./g, ''));
    }
    return Number(normalized);
}

function checkAnswer(question) {
    const input = document.querySelector(`#${question}-answer`);
    const feedback = document.querySelector(`#${question}-feedback`);
    const answer = readNumber(input.value);
    const expected = question === 'volume' ? 4312 / 3 : 2464;
    const isCorrect = Number.isFinite(answer) && Math.abs(answer - expected) < 0.1;
    feedback.className = `quiz-feedback ${isCorrect ? 'is-success' : 'is-error'}`;
    feedback.textContent = isCorrect
        ? 'Jawaban benar!'
        : question === 'volume'
            ? 'Belum tepat. Coba gunakan rumus V = 4/3 × π × r³.'
            : 'Belum tepat. Coba gunakan rumus L = 4 × π × r².';
}

document.querySelectorAll('.check-button').forEach((button) => {
    button.addEventListener('click', () => checkAnswer(button.dataset.question));
});

window.addEventListener('resize', resizeScene);
window.addEventListener('resize', resizeIceGame);
const canvasObserver = new ResizeObserver(resizeScene);
canvasObserver.observe(canvasContainer);

resizeScene();
animate();
function renderIceGame(time) {
    animateIceGame(time);
    requestAnimationFrame(renderIceGame);
}
renderIceGame();