import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { VolumeMeta } from '../data/volumes';
import { bakeBookPBRTextures, bakePaperBlockTextures, type PaperBlockTextures } from './book-textures';

export interface BookshelfCallbacks {
  onSelect: (index: number, flippedBack: boolean) => void;
  onOpenVolume: (volumeId: string) => void;
}

export interface BookshelfController {
  select: (index: number) => void;
  next: () => void;
  prev: () => void;
  toggleFlip: () => void;
  destroy: () => void;
}

const BOOK_W = 2.02;
const BOOK_H = 2.98;
const BOOK_D = 0.42;
const BOARD_T = 0.038;
const OVERHANG = 0.056;
const SPINE_BULGE = 0.052;

/**
 * Build a smooth curved hardcover cloth spine bridging back board (-D/2) to front board (+D/2).
 * UV u: 0 (back hinge) -> 1 (front hinge), v: 0 (bottom) -> 1 (top).
 * Outward normal points along -X (facing viewer when bookGroup.rotation.y = +PI/2).
 */
function createCurvedSpineGeometry(
  height: number,
  depth: number,
  bulge: number,
  segments = 14
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfH = height / 2;
  const halfD = depth / 2;

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const theta = -Math.PI / 2 + u * Math.PI; // -PI/2 -> +PI/2
    const x = -bulge * Math.cos(theta);
    const z = halfD * Math.sin(theta);

    // Analytic outward normal of ellipse (x = -bulge cos t, z = halfD sin t)
    const nxRaw = -halfD * Math.cos(theta);
    const nzRaw = bulge * Math.sin(theta);
    const len = Math.hypot(nxRaw, nzRaw) || 1;
    const nx = nxRaw / len;
    const nz = nzRaw / len;

    // Bottom vertex (v = 0)
    positions.push(x, -halfH, z);
    normals.push(nx, 0, nz);
    uvs.push(u, 0);

    // Top vertex (v = 1)
    positions.push(x, halfH, z);
    normals.push(nx, 0, nz);
    uvs.push(u, 1);
  }

  for (let i = 0; i < segments; i++) {
    const b0 = i * 2;
    const t0 = b0 + 1;
    const b1 = b0 + 2;
    const t1 = b0 + 3;

    // CCW winding for outward -X normal
    indices.push(b0, b1, t1);
    indices.push(b0, t1, t0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function createHardcoverBookGroup(
  volume: VolumeMeta,
  index: number,
  paperTextures: PaperBlockTextures,
  maxAnisotropy: number
): {
  group: THREE.Group;
  applyTextures: (tex: Awaited<ReturnType<typeof bakeBookPBRTextures>>) => void;
} {
  const group = new THREE.Group();
  group.userData.bookIndex = index;
  group.userData.volumeId = volume.id;

  const baseColor = new THREE.Color(volume.coverBg);
  const spineColor = new THREE.Color(volume.spineBg);

  const edgeClothMat = new THREE.MeshStandardMaterial({
    color: spineColor,
    roughness: 0.92,
    metalness: 0.0,
  });

  const frontMat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.93,
    metalness: 0.0,
    bumpScale: 0.0055,
    clearcoat: 0.0,
    envMapIntensity: 0.9,
  });

  const backMat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.93,
    metalness: 0.0,
    bumpScale: 0.0055,
    clearcoat: 0.0,
    envMapIntensity: 0.85,
  });

  const spineMat = new THREE.MeshPhysicalMaterial({
    color: spineColor,
    roughness: 0.94,
    metalness: 0.0,
    bumpScale: 0.006,
    clearcoat: 0.0,
    envMapIntensity: 0.85,
  });

  // 1. Front Hardcover Board (+Z face = index 4)
  const boardGeo = new THREE.BoxGeometry(BOOK_W, BOOK_H, BOARD_T);
  const frontBoard = new THREE.Mesh(boardGeo, [
    edgeClothMat,
    edgeClothMat,
    edgeClothMat,
    edgeClothMat,
    frontMat,
    edgeClothMat,
  ]);
  frontBoard.position.set(0, 0, BOOK_D / 2 - BOARD_T / 2);
  frontBoard.castShadow = true;
  frontBoard.receiveShadow = true;
  frontBoard.userData.bookIndex = index;
  group.add(frontBoard);

  // 2. Back Hardcover Board (-Z face = index 5)
  const backBoard = new THREE.Mesh(boardGeo, [
    edgeClothMat,
    edgeClothMat,
    edgeClothMat,
    edgeClothMat,
    edgeClothMat,
    backMat,
  ]);
  backBoard.position.set(0, 0, -BOOK_D / 2 + BOARD_T / 2);
  backBoard.castShadow = true;
  backBoard.receiveShadow = true;
  backBoard.userData.bookIndex = index;
  group.add(backBoard);

  // 3. Curved Rounded Cloth Spine (-X side)
  const spineGeo = createCurvedSpineGeometry(BOOK_H, BOOK_D, SPINE_BULGE, 16);
  const spineMesh = new THREE.Mesh(spineGeo, spineMat);
  spineMesh.position.set(-BOOK_W / 2, 0, 0);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  spineMesh.userData.bookIndex = index;
  group.add(spineMesh);

  // Spine interior cap strips (top/bottom thin cloth edge closing the spine curve)
  const capShape = new THREE.Shape();
  capShape.moveTo(0, -BOOK_D / 2);
  for (let i = 0; i <= 12; i++) {
    const t = -Math.PI / 2 + (i / 12) * Math.PI;
    capShape.lineTo(-SPINE_BULGE * Math.cos(t), (BOOK_D / 2) * Math.sin(t));
  }
  capShape.lineTo(0, BOOK_D / 2);
  capShape.closePath();

  const capGeo = new THREE.ShapeGeometry(capShape);
  const topCap = new THREE.Mesh(capGeo, edgeClothMat);
  topCap.rotation.x = -Math.PI / 2;
  topCap.position.set(-BOOK_W / 2, BOOK_H / 2 - 0.002, 0);
  group.add(topCap);

  const bottomCap = new THREE.Mesh(capGeo, edgeClothMat);
  bottomCap.rotation.x = Math.PI / 2;
  bottomCap.position.set(-BOOK_W / 2, -BOOK_H / 2 + 0.002, 0);
  group.add(bottomCap);

  // 4. Recessed Ivory 80gsm Paper Block (physically inset inside overhanging boards!)
  const pageW = BOOK_W - OVERHANG;
  const pageH = BOOK_H - OVERHANG * 2;
  const pageD = BOOK_D - BOARD_T * 2 - 0.008;

  const pageSideMat = new THREE.MeshStandardMaterial({
    map: paperTextures.map,
    bumpMap: paperTextures.bump,
    bumpScale: 0.008,
    roughness: 0.94,
    metalness: 0.0,
  });

  // Rotated UV clone for top & bottom page edges so striations run along book depth (Z)
  const topPaperMap = paperTextures.map.clone();
  topPaperMap.rotation = Math.PI / 2;
  topPaperMap.center.set(0.5, 0.5);
  topPaperMap.anisotropy = Math.min(16, maxAnisotropy);
  topPaperMap.needsUpdate = true;

  const pageTopMat = new THREE.MeshStandardMaterial({
    map: topPaperMap,
    roughness: 0.94,
    metalness: 0.0,
  });

  const pageGeo = new THREE.BoxGeometry(pageW, pageH, pageD);
  const pageMesh = new THREE.Mesh(pageGeo, [
    pageSideMat, // +X fore-edge
    edgeClothMat, // -X spine interior
    pageTopMat, // +Y top edge
    pageTopMat, // -Y bottom edge
    pageTopMat,
    pageTopMat,
  ]);
  pageMesh.position.set(-OVERHANG / 2 + 0.008, 0, 0);
  pageMesh.castShadow = true;
  pageMesh.receiveShadow = true;
  pageMesh.userData.bookIndex = index;
  group.add(pageMesh);

  // 5. Woven Headband & Tailband detail peeking at top/bottom spine edge
  const bandMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(volume.coverAccent),
    roughness: 0.85,
    metalness: 0.1,
  });
  const bandGeo = new THREE.CylinderGeometry(0.02, 0.02, pageD * 0.92, 8);
  const headBand = new THREE.Mesh(bandGeo, bandMat);
  headBand.rotation.x = Math.PI / 2;
  headBand.position.set(-BOOK_W / 2 + 0.025, pageH / 2 + 0.004, 0);
  group.add(headBand);

  const tailBand = new THREE.Mesh(bandGeo, bandMat);
  tailBand.rotation.x = Math.PI / 2;
  tailBand.position.set(-BOOK_W / 2 + 0.025, -pageH / 2 - 0.004, 0);
  group.add(tailBand);

  const applyTextures = (tex: Awaited<ReturnType<typeof bakeBookPBRTextures>>) => {
    frontMat.color.set('#ffffff');
    frontMat.map = tex.frontMap;
    frontMat.bumpMap = tex.frontBump;
    frontMat.roughnessMap = tex.frontRoughness;
    frontMat.metalnessMap = tex.frontMetalness;
    frontMat.roughness = 1.0;
    frontMat.metalness = 1.0;
    frontMat.needsUpdate = true;

    spineMat.color.set('#ffffff');
    spineMat.map = tex.spineMap;
    spineMat.bumpMap = tex.spineBump;
    spineMat.roughnessMap = tex.spineRoughness;
    spineMat.metalnessMap = tex.spineMetalness;
    spineMat.roughness = 1.0;
    spineMat.metalness = 1.0;
    spineMat.needsUpdate = true;

    backMat.color.set('#ffffff');
    backMat.map = tex.backMap;
    backMat.bumpMap = tex.backBump;
    backMat.roughnessMap = tex.backRoughness;
    backMat.metalnessMap = tex.backMetalness;
    backMat.roughness = 1.0;
    backMat.metalness = 1.0;
    backMat.needsUpdate = true;
  };

  return { group, applyTextures };
}

export async function mountBookshelfWebGL(
  container: HTMLElement,
  volumes: VolumeMeta[],
  callbacks: BookshelfCallbacks
): Promise<BookshelfController> {
  // Explicitly force-load EVERY bundled cover font face before painting 2K Canvas textures
  if (document.fonts) {
    await Promise.allSettled([
      document.fonts.load('600 132px "Cormorant Garamond"'),
      document.fonts.load('700 148px "Cormorant Garamond"'),
      document.fonts.load('italic 400 38px "EB Garamond"'),
      document.fonts.load('400 36px "EB Garamond"'),
      document.fonts.load('800 250px "Inter"'),
      document.fonts.load('600 28px "Inter"'),
      document.fonts.load('500 22px "JetBrains Mono"'),
      document.fonts.load('600 22px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  // Supersample at >= 1.75x DPR (capped at 2.5x) so fine serif cover type stays razor-sharp even on 100% 1080p screens!
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.75), 2.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'pan-y';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Lightweight procedural studio softbox environment for shimmering metallic foil reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.72;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(27, 16 / 9, 0.1, 60);

  // Calibrated Museum Studio Lighting (preserves light chalk/peach covers while making gold foil glint!)
  const hemiLight = new THREE.HemisphereLight(0xfff9ee, 0x15171c, 0.56);
  scene.add(hemiLight);

  // Soft balanced front fill (keeps JUC chalk & Spring apricot richly saturated, never washed out)
  const frontFill = new THREE.DirectionalLight(0xfff5e6, 0.34);
  frontFill.position.set(0.4, 1.8, 6.5);
  scene.add(frontFill);

  // Subtle rim light separating dark cloth silhouettes from gallery void
  const rimLight = new THREE.DirectionalLight(0xeef2ff, 0.28);
  rimLight.position.set(-2.5, 3.0, -4.5);
  scene.add(rimLight);

  // Dedicated cursor-tracking foil glint point light (no shadow cost, makes metallic gold/copper shimmer!)
  const foilGlintLight = new THREE.PointLight(0xfff3d4, 10, 14, 1.6);
  foilGlintLight.position.set(-1.5, 1.8, 3.2);
  scene.add(foilGlintLight);

  // Cursor-Controlled Key SpotLight with creamy Gaussian VSM soft shadows!
  const keySpot = new THREE.SpotLight(0xfff7ea, 30, 30, Math.PI / 2.8, 0.88, 1.25);
  keySpot.position.set(-2.4, 5.6, 4.4);
  keySpot.target.position.set(0, -0.5, -0.5);
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.set(1024, 1024);
  keySpot.shadow.camera.near = 1.8;
  keySpot.shadow.camera.far = 16;
  keySpot.shadow.bias = -0.0005;
  keySpot.shadow.blurSamples = 18;
  keySpot.shadow.radius = 6.5;
  scene.add(keySpot);
  scene.add(keySpot.target);

  // Seamless Transparent Shadow-Catching Gallery Floor Plane
  const floorGeo = new THREE.PlaneGeometry(36, 24);
  const floorMat = new THREE.ShadowMaterial({
    color: 0x000000,
    opacity: 0.42,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, -BOOK_H / 2 - 0.002, -0.4);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Build Books
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const paperTex = bakePaperBlockTextures(maxAniso);

  const books = volumes.map((vol, idx) => {
    const built = createHardcoverBookGroup(vol, idx, paperTex, maxAniso);
    scene.add(built.group);
    return built;
  });

  // Per-book spring animation state
  let activeIdx = 0;
  let flippedBack = false;
  let hoveredIdx = -1;
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartRy = 0;
  let dragStartRx = 0;
  let rafId: number | null = null;
  let destroyed = false;

  // Smooth cursor light state
  let lightNx = -0.35;
  let lightNy = 0.12;
  let targetLightNx = -0.35;
  let targetLightNy = 0.12;

  const states = volumes.map((_, i) => ({
    x: 0,
    targetX: 0,
    y: 0,
    targetY: 0,
    z: i === 0 ? 0.52 : 0,
    targetZ: i === 0 ? 0.52 : 0,
    ry: i === 0 ? -0.22 : Math.PI / 2,
    targetRy: i === 0 ? -0.22 : Math.PI / 2,
    rx: i === 0 ? 0.035 : 0,
    targetRx: i === 0 ? 0.035 : 0,
    hoverRy: 0,
    hoverRx: 0,
  }));

  function computeLayout(snap = false) {
    const spineW = BOOK_D + SPINE_BULGE + 0.02;
    const spineGap = 0.13;
    const activeFlankGap = 0.28;
    const widths = states.map((_, i) => (i === activeIdx ? BOOK_W : spineW));

    let totalW = 0;
    for (let i = 0; i < volumes.length; i++) {
      totalW += widths[i];
      if (i < volumes.length - 1) {
        totalW += i === activeIdx || i + 1 === activeIdx ? activeFlankGap : spineGap;
      }
    }

    let cursor = -totalW / 2;
    for (let i = 0; i < volumes.length; i++) {
      const center = cursor + widths[i] / 2;
      states[i].targetX = center;
      if (snap) states[i].x = center;
      cursor += widths[i] + (i === activeIdx || i + 1 === activeIdx ? activeFlankGap : spineGap);
    }
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(360, Math.round(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // Fit monumental Stripe Press book scale cleanly (~68–74% of canvas height, generous floor shadow margin)
    const vFovRad = (camera.fov * Math.PI) / 180;
    const desiredVisibleH = BOOK_H * 1.44;
    const distByH = desiredVisibleH / (2 * Math.tan(vFovRad / 2));

    const totalRowW = BOOK_W + (volumes.length - 1) * (BOOK_D + 0.22) + 0.9;
    const hFovHalfTan = Math.tan(vFovRad / 2) * camera.aspect;
    const distByW = totalRowW / (2 * hFovHalfTan);

    const camZ = Math.max(distByH, distByW) + 0.4;
    // Slight elevated gallery eye-line looking gently down so diagonal floor shadows are unmistakable!
    camera.position.set(0, 0.72, camZ);
    camera.lookAt(0, -0.26, 0);
    camera.updateProjectionMatrix();
    wake();
  }

  function select(nextIdx: number) {
    activeIdx = ((nextIdx % volumes.length) + volumes.length) % volumes.length;
    flippedBack = false;

    for (let i = 0; i < volumes.length; i++) {
      const isAct = i === activeIdx;
      states[i].targetY = 0;
      states[i].hoverRy = 0;
      states[i].hoverRx = 0;
      if (isAct) {
        states[i].targetRy = -0.22;
        states[i].targetRx = 0.035;
        states[i].targetZ = 0.52;
      } else {
        states[i].targetRy = Math.PI / 2;
        states[i].targetRx = 0;
        states[i].targetZ = 0;
      }
    }

    computeLayout(false);
    callbacks.onSelect(activeIdx, flippedBack);
    wake();
  }

  function toggleFlip() {
    flippedBack = !flippedBack;
    states[activeIdx].targetRy = flippedBack ? Math.PI - 0.22 : -0.22;
    states[activeIdx].targetRx = 0.035;
    callbacks.onSelect(activeIdx, flippedBack);
    wake();
  }

  // Sleep-on-settle render loop (0% GPU/CPU when idle!)
  function tick() {
    if (destroyed) return;
    let moving = false;

    // Smooth cursor key spotlight
    const dlx = targetLightNx - lightNx;
    const dly = targetLightNy - lightNy;
    if (Math.abs(dlx) > 0.0012 || Math.abs(dly) > 0.0012) {
      lightNx += dlx * 0.12;
      lightNy += dly * 0.12;
      moving = true;
    } else {
      lightNx = targetLightNx;
      lightNy = targetLightNy;
    }

    // Orbit physical SpotLight + foil glint PointLight smoothly with cursor!
    keySpot.position.set(
      lightNx * 5.8,
      5.6 - lightNy * 1.1,
      4.4 + lightNy * 0.85
    );
    keySpot.target.position.set(states[activeIdx].x * 0.35, -0.45, -0.7);
    keySpot.target.updateMatrixWorld();

    foilGlintLight.position.set(
      lightNx * 3.8,
      1.6 - lightNy * 1.4,
      3.1
    );

    for (let i = 0; i < volumes.length; i++) {
      const s = states[i];
      const isAct = i === activeIdx;
      const goalRy = s.targetRy + (isAct && !isDragging ? s.hoverRy : 0);
      const goalRx = s.targetRx + (isAct && !isDragging ? s.hoverRx : 0);
      const rotEase = isDragging && isAct ? 0.26 : 0.12;

      const dx = s.targetX - s.x;
      const dy = s.targetY - s.y;
      const dz = s.targetZ - s.z;
      const dry = goalRy - s.ry;
      const drx = goalRx - s.rx;

      if (
        Math.abs(dx) > 0.0015 ||
        Math.abs(dy) > 0.0015 ||
        Math.abs(dz) > 0.0015 ||
        Math.abs(dry) > 0.001 ||
        Math.abs(drx) > 0.001
      ) {
        s.x += dx * 0.13;
        s.y += dy * 0.18;
        s.z += dz * 0.13;
        s.ry += dry * rotEase;
        s.rx += drx * rotEase;
        moving = true;
      } else {
        s.x = s.targetX;
        s.y = s.targetY;
        s.z = s.targetZ;
        s.ry = goalRy;
        s.rx = goalRx;
      }

      const g = books[i].group;
      g.position.set(s.x, s.y, s.z);
      g.rotation.set(s.rx, s.ry, 0);
    }

    renderer.render(scene, camera);

    if (moving || isDragging) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function wake() {
    if (!destroyed && rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  // Exact 3D Raycasting for zero-occlusion book clicks & hover lifts
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function pickBookIndex(clientX: number, clientY: number): number {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(
      books.map((b) => b.group),
      true
    );
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (typeof obj.userData.bookIndex === 'number') {
          return obj.userData.bookIndex;
        }
        obj = obj.parent;
      }
    }
    return -1;
  }

  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    targetLightNx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetLightNy = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      states[activeIdx].targetRy = dragStartRy + dx * 0.011;
      states[activeIdx].targetRx = Math.max(-0.48, Math.min(0.48, dragStartRx + dy * 0.006));
      wake();
      return;
    }

    const hitIdx = pickBookIndex(e.clientX, e.clientY);
    if (hitIdx !== hoveredIdx) {
      if (hoveredIdx >= 0 && hoveredIdx !== activeIdx) {
        states[hoveredIdx].targetY = 0;
      }
      hoveredIdx = hitIdx;
      if (hoveredIdx >= 0 && hoveredIdx !== activeIdx) {
        states[hoveredIdx].targetY = 0.095;
      }
    }

    if (hitIdx === activeIdx) {
      renderer.domElement.style.cursor = 'grab';
      states[activeIdx].hoverRy = targetLightNx * 0.14;
      states[activeIdx].hoverRx = targetLightNy * 0.07;
    } else if (hitIdx >= 0) {
      renderer.domElement.style.cursor = 'pointer';
      states[activeIdx].hoverRy = 0;
      states[activeIdx].hoverRx = 0;
    } else {
      renderer.domElement.style.cursor = 'default';
      states[activeIdx].hoverRy = 0;
      states[activeIdx].hoverRx = 0;
    }

    wake();
  };

  const onPointerDown = (e: PointerEvent) => {
    const hitIdx = pickBookIndex(e.clientX, e.clientY);
    if (hitIdx < 0) return;

    if (hitIdx !== activeIdx) {
      select(hitIdx);
      return;
    }

    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartRy = states[activeIdx].targetRy;
    dragStartRx = states[activeIdx].targetRx;
    renderer.domElement.style.cursor = 'grabbing';
    renderer.domElement.setPointerCapture?.(e.pointerId);
    wake();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    renderer.domElement.releasePointerCapture?.(e.pointerId);
    renderer.domElement.style.cursor = 'grab';

    const norm = (((states[activeIdx].targetRy % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    flippedBack = norm > Math.PI * 0.55 && norm < Math.PI * 1.45;
    callbacks.onSelect(activeIdx, flippedBack);
    wake();
  };

  const onPointerLeave = () => {
    if (hoveredIdx >= 0 && hoveredIdx !== activeIdx) {
      states[hoveredIdx].targetY = 0;
    }
    hoveredIdx = -1;
    states[activeIdx].hoverRy = 0;
    states[activeIdx].hoverRx = 0;
    targetLightNx = -0.35;
    targetLightNy = 0.12;
    wake();
  };

  const onDblClick = (e: MouseEvent) => {
    if (dragMoved) return;
    const hitIdx = pickBookIndex(e.clientX, e.clientY);
    if (hitIdx === activeIdx) {
      callbacks.onOpenVolume(volumes[activeIdx].id);
    }
  };

  // Track cursor across the entire hero section so shadows react everywhere in the gallery
  const stageParent = container.closest('section') || container;
  stageParent.addEventListener('pointermove', onPointerMove as EventListener);
  stageParent.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('dblclick', onDblClick);

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);

  computeLayout(true);
  resize();
  callbacks.onSelect(0, false);

  // Bake all 4 books' PBR textures asynchronously and apply immediately
  Promise.all(
    volumes.map(async (vol, idx) => {
      const tex = await bakeBookPBRTextures(vol, maxAniso);
      if (!destroyed) {
        books[idx].applyTextures(tex);
        wake();
      }
    })
  );

  return {
    select,
    next: () => select(activeIdx + 1),
    prev: () => select(activeIdx - 1),
    toggleFlip,
    destroy: () => {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
      stageParent.removeEventListener('pointermove', onPointerMove as EventListener);
      stageParent.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      renderer.dispose();
      envTex.dispose();
      renderer.domElement.remove();
    },
  };
}
