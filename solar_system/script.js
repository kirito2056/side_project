// Three.js 초기화
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('globe').appendChild(renderer.domElement);

// 배경 파티클 생성
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 10000;
const posArray = new Float32Array(particlesCount * 3);

// 더 넓은 구형 분포로 파티클 생성 (반지름 300~600)
for(let i = 0; i < particlesCount; i++) {
    const radius = 300 + Math.random() * 300; // 300~600 사이의 반지름
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    posArray[i * 3 + 2] = radius * Math.cos(phi);
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 1,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// OrbitControls 초기화
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.minDistance = 30;
controls.maxDistance = 200;

// 태양 생성
const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
const textureLoader = new THREE.TextureLoader();

// 태양 텍스처 로드
const sunTexture = textureLoader.load('sun_texture.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({
    map: sunTexture,
    transparent: true,
    opacity: 0.9
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// 태양 빛 효과
const sunLight = new THREE.PointLight(0xffffff, 2, 200);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// 행성 생성 함수 (공전 그룹 방식)
function createPlanet(size, texture, orbitRadius, tilt, orbitTilt, ringTexture) {
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        map: textureLoader.load(texture),
        shininess: 5
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.rotation.z = tilt;
    planet.position.x = orbitRadius;
    orbitGroup.add(planet);

    if (ringTexture) {
        const ringInner = size * 1.2;
        const ringOuter = size * 2.0;
        const ringSegments = 128;
        const ringGeometry = new THREE.RingGeometry(ringInner, ringOuter, ringSegments);

        // === UV 직접 세팅 ===
        const pos = ringGeometry.attributes.position;
        const uv = ringGeometry.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            // 반지름 방향: 0(내부)~1(외부)
            const r = (v3.length() - ringInner) / (ringOuter - ringInner);
            // 각도 방향: 0~1 (기본값 그대로)
            const theta = Math.atan2(v3.y, v3.x);
            uv.setXY(i, r, (theta + Math.PI) / (2 * Math.PI));
        }

        const ringMap = textureLoader.load(ringTexture);
        const ringMat = new THREE.MeshBasicMaterial({
            map: ringMap,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMat);
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);
    }

    orbitGroup.rotation.z = orbitTilt;

    // 궤도 표시
    const orbitGeometry = new THREE.RingGeometry(orbitRadius, orbitRadius + 0.1, 128);
    const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);

    return { planet, orbitGroup };
}

const AU = 40; // 1 AU = 40 단위로 설정

// 행성들 생성 (공전 그룹 방식)
const mercury = createPlanet(1, 'mercury_texture.jpg', 0.39 * AU, 0.034, 0.122);
const venus = createPlanet(1.5, 'venus_texture.jpg', 0.72 * AU, Math.PI, 0.059);
const earth = createPlanet(2, 'earth_texture.jpg', 1.00 * AU, 0.409, 0);
const mars = createPlanet(1.2, 'mars_texture.jpeg', 1.52 * AU, 0.439, 0.032);
const jupiter = createPlanet(5, 'jupiter_texture.jpg', 5.20 * AU, 0.055, 0.022);
const saturn = createPlanet(4, 'saturn_texture.jpg', 9.58 * AU, 0.466, 0.043, 'saturn_ring.png');
const uranus = createPlanet(3.5, 'uranus_texture.jpg', 19.18 * AU, 0.773, 0.045);
const neptune = createPlanet(3.4, 'neptune_texture.jpg', 30.07 * AU, 0.494, 0.030);

// 조명 설정
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

camera.position.z = 1500;

// 애니메이션 변수
let time = 0;

// 행성들의 공전 속도
const planetSpeeds = {
    mercury: 0.04,
    venus: 0.015,
    earth: 0.01,
    mars: 0.008,
    jupiter: 0.002,
    saturn: 0.0009
};

// 애니메이션 루프
const animate = () => {
    requestAnimationFrame(animate);
    time += 0.001;

    // 행성 공전 (공전 그룹 회전)
    mercury.orbitGroup.rotation.y += planetSpeeds.mercury * 0.5;
    venus.orbitGroup.rotation.y += planetSpeeds.venus * 0.5;
    earth.orbitGroup.rotation.y += planetSpeeds.earth * 0.5;
    mars.orbitGroup.rotation.y += planetSpeeds.mars * 0.5;
    jupiter.orbitGroup.rotation.y += planetSpeeds.jupiter * 0.5;
    saturn.orbitGroup.rotation.y += planetSpeeds.saturn * 0.5;
    uranus.orbitGroup.rotation.y += 0.0004 * 0.5;
    neptune.orbitGroup.rotation.y += 0.0002 * 0.5;

    // 행성 자전
    mercury.planet.rotation.y += 0.004;
    venus.planet.rotation.y += 0.002;
    earth.planet.rotation.y += 0.02;
    mars.planet.rotation.y += 0.018;
    jupiter.planet.rotation.y += 0.04;
    saturn.planet.rotation.y += 0.038;
    uranus.planet.rotation.y += 0.03;
    neptune.planet.rotation.y += 0.028;

    sun.rotation.y += 0.002;
    particlesMesh.rotation.x += 0.0001;
    particlesMesh.rotation.y += 0.0001;
    controls.update();
    renderer.render(scene, camera);
};

// 윈도우 리사이즈 처리
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(); 