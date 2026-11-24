import * as THREE from 'three';
import type { VolumeMeta } from '../data/volumes';

export interface BookPBRTextures {
  frontMap: THREE.CanvasTexture;
  frontBump: THREE.CanvasTexture;
  frontRoughness: THREE.CanvasTexture;
  frontMetalness: THREE.CanvasTexture;
  spineMap: THREE.CanvasTexture;
  spineBump: THREE.CanvasTexture;
  spineRoughness: THREE.CanvasTexture;
  spineMetalness: THREE.CanvasTexture;
  backMap: THREE.CanvasTexture;
  backBump: THREE.CanvasTexture;
  backRoughness: THREE.CanvasTexture;
  backMetalness: THREE.CanvasTexture;
}

export interface PaperBlockTextures {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

// Logical design coordinates (baked at 2x physical resolution = 2048x3020 & 560x3020 for retina sharpness!)
const COVER_W = 1024;
const COVER_H = 1510;
const SPINE_W = 280;
const SPINE_H = 1510;
const TEX_SCALE = 2;

function createHiResCanvas(logicalW: number, logicalH: number, scale = TEX_SCALE): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  align: 'center' | 'left' = 'center',
  flipX = false
) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = align === 'left' ? 0 : (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.save();
  if (flipX) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}

function drawPebbleMonogram(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  height: number,
  color: string,
  lineWidth: number
) {
  const s = height / 30;
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 15 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth / s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer capsule
  ctx.beginPath();
  ctx.roundRect(4, 3, 16, 24, 8);
  ctx.stroke();

  // Inner P-loop
  ctx.beginPath();
  ctx.roundRect(7.5, 6.5, 9, 10, 4.5);
  ctx.stroke();

  // Stem
  ctx.beginPath();
  ctx.moveTo(7.5, 12);
  ctx.lineTo(7.5, 23.5);
  ctx.stroke();

  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  // Keep Latin/number tokens intact and avoid leading CJK punctuation on new lines
  const tokens = text.match(/[A-Za-z0-9_/+.-]+|./g) || [];
  const noLineStart = new Set(['、', '，', '。', '：', '；', '）', '》', '」', ',', '.', ':', ';']);
  let line = '';
  let curY = y;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const test = line + tok;
    if (ctx.measureText(test).width > maxWidth && line.length > 0 && !noLineStart.has(tok)) {
      ctx.fillText(line.trimEnd(), x, curY);
      line = tok.trimStart();
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trimEnd(), x, curY);
}

// Procedural subtle linen / cotton paper tactile bump canvas
let cachedGrainCanvas: HTMLCanvasElement | null = null;
function getGrainCanvas(): HTMLCanvasElement {
  if (cachedGrainCanvas) return cachedGrainCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const imgData = ctx.createImageData(256, 256);
  const d = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      // Subtle woven linen warp/weft + fine random paper tooth
      const weave = ((x % 3 === 0 ? 7 : -3) + (y % 3 === 0 ? 7 : -3)) * 0.7;
      const noise = (Math.random() - 0.5) * 18;
      const v = Math.max(0, Math.min(255, Math.round(128 + weave + noise)));
      d[idx] = v;
      d[idx + 1] = v;
      d[idx + 2] = v;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  cachedGrainCanvas = c;
  return c;
}

function fillBumpBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hingeSide: 'left' | 'right' | 'none'
) {
  const pattern = ctx.createPattern(getGrainCanvas(), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
  }

  // Authentic physical pressed hardcover spine-joint hinge groove
  if (hingeSide !== 'none') {
    const gx = hingeSide === 'left' ? w * 0.045 : w * 0.955;
    const gw = w * 0.036;
    const grad = ctx.createLinearGradient(gx - gw, 0, gx + gw, 0);
    grad.addColorStop(0, 'rgba(128,128,128,0)');
    grad.addColorStop(0.28, 'rgba(176,176,176,0.55)');
    grad.addColorStop(0.5, 'rgba(28,28,28,0.88)');
    grad.addColorStop(0.72, 'rgba(176,176,176,0.55)');
    grad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx - gw, 0, gw * 2, h);
  }
}

function buildRoughnessAndMetalnessFromFoilMask(
  foilCanvas: HTMLCanvasElement,
  baseRoughness = 0.95,
  foilRoughness = 0.14,
  foilMetalness = 0.96
): { roughness: HTMLCanvasElement; metalness: HTMLCanvasElement } {
  // Bake roughness/metalness at 1x logical size using pure native Canvas ops (< 1ms!)
  const w = Math.round(foilCanvas.width / TEX_SCALE);
  const h = Math.round(foilCanvas.height / TEX_SCALE);

  const baseR = Math.round(baseRoughness * 255);
  const foilR = Math.round(foilRoughness * 255);
  const maxM = Math.round(foilMetalness * 255);

  // Metalness map: black everywhere except foil artwork tinted to maxM
  const mCanvas = document.createElement('canvas');
  mCanvas.width = w;
  mCanvas.height = h;
  const mCtx = mCanvas.getContext('2d')!;
  mCtx.fillStyle = '#000000';
  mCtx.fillRect(0, 0, w, h);

  const mTint = document.createElement('canvas');
  mTint.width = w;
  mTint.height = h;
  const mtCtx = mTint.getContext('2d')!;
  mtCtx.drawImage(foilCanvas, 0, 0, w, h);
  mtCtx.globalCompositeOperation = 'source-in';
  mtCtx.fillStyle = `rgb(${maxM},${maxM},${maxM})`;
  mtCtx.fillRect(0, 0, w, h);
  mCtx.drawImage(mTint, 0, 0);

  // Roughness map: matte baseR everywhere, replaced by low foilR on foil areas
  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = `rgb(${baseR},${baseR},${baseR})`;
  rCtx.fillRect(0, 0, w, h);

  const rTint = document.createElement('canvas');
  rTint.width = w;
  rTint.height = h;
  const rtCtx = rTint.getContext('2d')!;
  rtCtx.drawImage(foilCanvas, 0, 0, w, h);
  rtCtx.globalCompositeOperation = 'source-in';
  rtCtx.fillStyle = `rgb(${foilR},${foilR},${foilR})`;
  rtCtx.fillRect(0, 0, w, h);
  rCtx.drawImage(rTint, 0, 0);

  return { roughness: rCanvas, metalness: mCanvas };
}

function toTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.min(16, maxAnisotropy);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function bakePaperBlockTextures(maxAnisotropy: number): PaperBlockTextures {
  const w = 256;
  const h = 1024;

  const mapC = document.createElement('canvas');
  mapC.width = w;
  mapC.height = h;
  const ctx = mapC.getContext('2d')!;

  const bumpC = document.createElement('canvas');
  bumpC.width = w;
  bumpC.height = h;
  const bctx = bumpC.getContext('2d')!;

  ctx.fillStyle = '#F2EDE0';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, w, h);

  // Fine vertical 80gsm page sheet striations (along thickness x)
  for (let x = 0; x < w; x += 3) {
    const tone = 228 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${tone}, ${tone - 6}, ${tone - 17})`;
    ctx.fillRect(x, 0, 2, h);

    const bt = 104 + Math.floor(Math.random() * 48);
    bctx.fillStyle = `rgb(${bt},${bt},${bt})`;
    bctx.fillRect(x, 0, 2, h);
  }

  // Subtle recessed edge AO along top/bottom/board borders
  const edgeV = ctx.createLinearGradient(0, 0, 0, h);
  edgeV.addColorStop(0, 'rgba(20,16,12,0.22)');
  edgeV.addColorStop(0.03, 'rgba(20,16,12,0)');
  edgeV.addColorStop(0.97, 'rgba(20,16,12,0)');
  edgeV.addColorStop(1, 'rgba(20,16,12,0.24)');
  ctx.fillStyle = edgeV;
  ctx.fillRect(0, 0, w, h);

  const edgeH = ctx.createLinearGradient(0, 0, w, 0);
  edgeH.addColorStop(0, 'rgba(20,16,12,0.18)');
  edgeH.addColorStop(0.1, 'rgba(20,16,12,0)');
  edgeH.addColorStop(0.9, 'rgba(20,16,12,0)');
  edgeH.addColorStop(1, 'rgba(20,16,12,0.18)');
  ctx.fillStyle = edgeH;
  ctx.fillRect(0, 0, w, h);

  return {
    map: toTexture(mapC, true, maxAnisotropy),
    bump: toTexture(bumpC, false, maxAnisotropy),
  };
}

export async function bakeBookPBRTextures(
  volume: VolumeMeta,
  maxAnisotropy: number
): Promise<BookPBRTextures> {
  // Load cover artwork if applicable
  let artImg: HTMLImageElement | null = null;
  if (volume.designKey === 'mysql') artImg = await loadImage('/covers/mysql-cloth.jpg').catch(() => null);
  if (volume.designKey === 'redis') artImg = await loadImage('/covers/redis-ebru.jpg').catch(() => null);
  if (volume.designKey === 'spring') artImg = await loadImage('/covers/spring-dawn.jpg').catch(() => null);

  // Create 2x HiDPI canvases for Front, Spine, Back diffuse & foil (bump stays crisp 1x for pure cloth/hinge relief!)
  const { canvas: frontC, ctx: fCtx } = createHiResCanvas(COVER_W, COVER_H, TEX_SCALE);
  const { canvas: frontBumpC, ctx: fBump } = createHiResCanvas(COVER_W, COVER_H, 1);
  fillBumpBase(fBump, COVER_W, COVER_H, 'left');
  const { canvas: frontFoilC, ctx: fFoil } = createHiResCanvas(COVER_W, COVER_H, TEX_SCALE);

  const { canvas: spineC, ctx: sCtx } = createHiResCanvas(SPINE_W, SPINE_H, TEX_SCALE);
  const { canvas: spineBumpC, ctx: sBump } = createHiResCanvas(SPINE_W, SPINE_H, 1);
  fillBumpBase(sBump, SPINE_W, SPINE_H, 'none');
  const { canvas: spineFoilC, ctx: sFoil } = createHiResCanvas(SPINE_W, SPINE_H, TEX_SCALE);

  const { canvas: backC, ctx: bCtx } = createHiResCanvas(COVER_W, COVER_H, TEX_SCALE);
  const { canvas: backBumpC, ctx: bBump } = createHiResCanvas(COVER_W, COVER_H, 1);
  fillBumpBase(bBump, COVER_W, COVER_H, 'right');
  const { canvas: backFoilC, ctx: bFoil } = createHiResCanvas(COVER_W, COVER_H, TEX_SCALE);

  // Stamp razor-sharp text onto Diffuse + Foil ONLY (never into bumpMap, avoiding WebGL 2x2 dFdx/dFdy edge ringing!)
  const stampText = (
    cCtx: CanvasRenderingContext2D,
    mCtx: CanvasRenderingContext2D,
    _bmCtx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    isFoil: boolean,
    align: CanvasTextAlign = 'left'
  ) => {
    cCtx.font = font;
    cCtx.textAlign = align;
    cCtx.fillStyle = color;
    cCtx.fillText(text, x, y);

    if (isFoil) {
      mCtx.font = font;
      mCtx.textAlign = align;
      mCtx.fillStyle = '#ffffff';
      mCtx.fillText(text, x, y);
    }
  };

  // =========================================================================
  // BOOK 1: MySQL — Olive Buckram Monograph + Gold-Foil InnoDB B+ Tree
  // =========================================================================
  if (volume.designKey === 'mysql') {
    fCtx.fillStyle = '#42473B';
    fCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(fCtx, artImg, COVER_W, COVER_H, 'center');

    // Subtle matte hinge shadow baked softly into diffuse
    const hGrad = fCtx.createLinearGradient(0, 0, 86, 0);
    hGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
    hGrad.addColorStop(0.55, 'rgba(0,0,0,0.14)');
    hGrad.addColorStop(1, 'rgba(0,0,0,0)');
    fCtx.fillStyle = hGrad;
    fCtx.fillRect(0, 0, 86, COVER_H);

    // Top-right burnished gold cloth tab (signature Stripe Press monograph detail)
    const tabX = COVER_W - 154;
    fCtx.fillStyle = '#DDBF6D';
    fCtx.fillRect(tabX, 0, 102, 126);
    fFoil.fillStyle = '#ffffff';
    fFoil.fillRect(tabX, 0, 102, 126);
    drawPebbleMonogram(fCtx, tabX + 51, 65, 58, '#34392E', 5);
    // Cut out monogram from foil mask so it stays matte dark debossed
    fFoil.save();
    fFoil.globalCompositeOperation = 'destination-out';
    drawPebbleMonogram(fFoil, tabX + 51, 65, 58, '#000000', 5.5);
    fFoil.restore();

    // Upper-left refined typography (Gold Foil!)
    stampText(fCtx, fFoil, fBump, 'MySQL', 124, 290, '600 132px "Cormorant Garamond", Georgia, serif', '#E7CC7E', true);

    fCtx.fillStyle = '#DFC06C';
    fCtx.fillRect(128, 336, 78, 2.5);
    fFoil.fillStyle = '#ffffff';
    fFoil.fillRect(128, 336, 78, 2.5);

    stampText(fCtx, fFoil, fBump, 'Storage Engines,', 126, 396, 'italic 400 38px "EB Garamond", Georgia, serif', '#E3C980', true);
    stampText(fCtx, fFoil, fBump, 'B+ Trees & MVCC', 126, 444, 'italic 400 38px "EB Garamond", Georgia, serif', '#E3C980', true);

    // Middleware Essence: Architectural Gold-Foil 3-Tier InnoDB B+ Tree & Linked Leaf Chain
    const drawBPlusTree = (ctx: CanvasRenderingContext2D, color: string, lw: number) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;

      // Level 0: Root Page
      const rx = 510;
      const ry = 590;
      ctx.strokeRect(rx - 74, ry, 148, 34);
      ctx.beginPath();
      ctx.moveTo(rx - 24, ry);
      ctx.lineTo(rx - 24, ry + 34);
      ctx.moveTo(rx + 24, ry);
      ctx.lineTo(rx + 24, ry + 34);
      ctx.stroke();

      // Level 1: 3 Internal Index Pages
      const l1Y = 748;
      const l1Xs = [300, 510, 720];
      l1Xs.forEach((nx, i) => {
        ctx.strokeRect(nx - 62, l1Y, 124, 30);
        ctx.beginPath();
        ctx.moveTo(nx, l1Y);
        ctx.lineTo(nx, l1Y + 30);
        // Connector from root slots
        const parentX = rx - 48 + i * 48;
        ctx.moveTo(parentX, ry + 34);
        ctx.lineTo(parentX, ry + 92);
        ctx.lineTo(nx, ry + 92);
        ctx.lineTo(nx, l1Y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, l1Y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Level 2: 5 Clustered Leaf Pages linked by horizontal bidirectional pointers
      const l2Y = 924;
      const l2Xs = [212, 361, 510, 659, 808];
      const leafW = 104;
      const leafH = 44;

      // Tree connectors L1 -> L2
      const edges: [number, number][] = [
        [0, 0],
        [0, 1],
        [1, 2],
        [2, 3],
        [2, 4],
      ];
      edges.forEach(([pIdx, cIdx]) => {
        const px = l1Xs[pIdx];
        const cx = l2Xs[cIdx];
        ctx.beginPath();
        ctx.moveTo(px, l1Y + 30);
        ctx.lineTo(px, l1Y + 96);
        ctx.lineTo(cx, l1Y + 96);
        ctx.lineTo(cx, l2Y);
        ctx.stroke();
      });

      // Draw Leaf Data Pages + Horizontal Doubly-Linked Chain
      l2Xs.forEach((lx, idx) => {
        ctx.strokeRect(lx - leafW / 2, l2Y, leafW, leafH);
        // Subtle data row ticks inside leaf page
        ctx.beginPath();
        ctx.moveTo(lx - leafW / 2 + 14, l2Y + 15);
        ctx.lineTo(lx + leafW / 2 - 14, l2Y + 15);
        ctx.moveTo(lx - leafW / 2 + 14, l2Y + 29);
        ctx.lineTo(lx + leafW / 2 - 26, l2Y + 29);
        ctx.stroke();

        // Bidirectional leaf pointer chain (InnoDB range scan signature)
        if (idx < l2Xs.length - 1) {
          const x1 = lx + leafW / 2 + 4;
          const x2 = l2Xs[idx + 1] - leafW / 2 - 4;
          const midY = l2Y + leafH / 2;
          ctx.beginPath();
          ctx.moveTo(x1, midY - 4);
          ctx.lineTo(x2, midY - 4);
          ctx.moveTo(x2, midY + 4);
          ctx.lineTo(x1, midY + 4);
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    drawBPlusTree(fCtx, 'rgba(235, 207, 126, 0.94)', 2.4);
    drawBPlusTree(fFoil, '#ffffff', 2.8);

    // Lower-left quiet imprint
    stampText(fCtx, fFoil, fBump, 'InnoDB Internals', 126, 1345, 'italic 400 38px "EB Garamond", Georgia, serif', '#E3C980', true);
    stampText(fCtx, fFoil, fBump, 'PEBBLE PRESS', 128, 1396, '500 22px "JetBrains Mono", monospace', 'rgba(227,201,128,0.68)', true);

    // Spine
    sCtx.fillStyle = '#3D4236';
    sCtx.fillRect(0, 0, SPINE_W, SPINE_H);
    if (artImg) drawCoverImage(sCtx, artImg, SPINE_W, SPINE_H, 'left');

    stampText(sCtx, sFoil, sBump, 'PEBBLE', SPINE_W / 2, 118, '500 22px "JetBrains Mono", monospace', 'rgba(228,200,121,0.78)', true, 'center');
    [sCtx, sFoil, sBump].forEach((ctx) => {
      ctx.save();
      ctx.translate(SPINE_W / 2, SPINE_H / 2);
      ctx.rotate(Math.PI / 2);
    });
    stampText(sCtx, sFoil, sBump, 'MySQL', 0, 22, '600 72px "Cormorant Garamond", Georgia, serif', '#E6CB7C', true, 'center');
    [sCtx, sFoil, sBump].forEach((ctx) => ctx.restore());

    drawPebbleMonogram(sCtx, SPINE_W / 2, SPINE_H - 115, 76, '#E6CB7C', 4.5);
    drawPebbleMonogram(sFoil, SPINE_W / 2, SPINE_H - 115, 76, '#ffffff', 5);

    // Back (generous museum margins so standing spine perspective shows clean matte cloth!)
    bCtx.fillStyle = '#42473B';
    bCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(bCtx, artImg, COVER_W, COVER_H, 'center', true);
    const bAo1 = bCtx.createLinearGradient(COVER_W, 0, COVER_W - 240, 0);
    bAo1.addColorStop(0, 'rgba(0,0,0,0.34)');
    bAo1.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = bAo1;
    bCtx.fillRect(COVER_W - 240, 0, 240, COVER_H);

    drawPebbleMonogram(bCtx, COVER_W / 2, 580, 96, '#EED587', 5);
    drawPebbleMonogram(bFoil, COVER_W / 2, 580, 96, '#ffffff', 5.5);
    bCtx.textAlign = 'center';
    bCtx.font = '500 22px "JetBrains Mono", monospace';
    bCtx.fillStyle = 'rgba(228,200,121,0.75)';
    bCtx.fillText('PEBBLE PRESS · FIRST EDITION', COVER_W / 2, 700);
    bCtx.font = 'italic 400 32px "EB Garamond", Georgia, serif';
    bCtx.fillStyle = '#EED587';
    bCtx.fillText(volume.subtitle, COVER_W / 2, 756);
    bCtx.textAlign = 'left';
  }

  // =========================================================================
  // BOOK 2: Redis — Florentine Ebru Marbled Paper + Pasted Bookplate & SkipList
  // =========================================================================
  else if (volume.designKey === 'redis') {
    fCtx.fillStyle = '#6B2421';
    fCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(fCtx, artImg, COVER_W, COVER_H, 'center');

    // Antique pasted warm-ivory rag paper bookplate cartouche
    const bx = 176;
    const by = 246;
    const bw = 672;
    const bh = 684;

    // Soft paper drop shadow onto marbled cover
    fCtx.save();
    fCtx.shadowColor = 'rgba(15, 8, 6, 0.36)';
    fCtx.shadowBlur = 28;
    fCtx.shadowOffsetY = 10;
    fCtx.fillStyle = '#F4EEE1';
    fCtx.fillRect(bx, by, bw, bh);
    fCtx.restore();

    // Raised edge of pasted label on bump map
    fBump.fillStyle = '#9C9C9C';
    fBump.fillRect(bx, by, bw, bh);
    fBump.strokeStyle = '#383838';
    fBump.lineWidth = 5;
    fBump.strokeRect(bx, by, bw, bh);

    // Double antique hairline frame (Outer Oxblood + Inner Burnished Gold Foil!)
    fCtx.strokeStyle = '#6B2421';
    fCtx.lineWidth = 3;
    fCtx.strokeRect(bx + 20, by + 20, bw - 40, bh - 40);

    fCtx.strokeStyle = '#C69747';
    fCtx.lineWidth = 2;
    fCtx.strokeRect(bx + 32, by + 32, bw - 64, bh - 64);
    fFoil.strokeStyle = '#ffffff';
    fFoil.lineWidth = 3;
    fFoil.strokeRect(bx + 32, by + 32, bw - 64, bh - 64);

    stampText(fCtx, fFoil, fBump, 'PEBBLE PRESS', COVER_W / 2, by + 104, '500 22px "JetBrains Mono", monospace', '#6B2421', false, 'center');
    stampText(fCtx, fFoil, fBump, 'Redis', COVER_W / 2, by + 258, '700 148px "Cormorant Garamond", Georgia, serif', '#1C1412', false, 'center');

    // Thin metallic gold divider
    fCtx.fillStyle = '#C69747';
    fCtx.fillRect(COVER_W / 2 - 70, by + 296, 140, 2);
    fFoil.fillStyle = '#ffffff';
    fFoil.fillRect(COVER_W / 2 - 70, by + 296, 140, 2.5);

    stampText(fCtx, fFoil, fBump, 'In-Memory Data Structures & Caching', COVER_W / 2, by + 354, 'italic 400 32px "EB Garamond", Georgia, serif', '#4A3935', false, 'center');

    // Middleware Essence: Minimalist SkipList Probabilistic Multi-Level Tower Trace
    const drawSkipList = (ctx: CanvasRenderingContext2D, lineColor: string, accentColor: string) => {
      ctx.save();
      const sx = bx + 92;
      const baseY = by + 548;
      const cols = [0, 86, 172, 258, 344, 430, 488];
      const levels = [4, 1, 2, 1, 3, 1, 2]; // Probabilistic tower heights
      const stepY = 30;

      // Baseline L0 chain
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx + cols[cols.length - 1], baseY);
      ctx.stroke();

      // Upper skip express lanes (L3, L2, L1) in metallic gold
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // L3 jump: col 0 -> col 4
      ctx.moveTo(sx + cols[0], baseY - stepY * 3);
      ctx.lineTo(sx + cols[4], baseY - stepY * 3);
      // L2 jumps: 0 -> 2 -> 4 -> 6
      ctx.moveTo(sx + cols[0], baseY - stepY * 2);
      ctx.lineTo(sx + cols[6], baseY - stepY * 2);
      // L1 jumps: 0 -> 2 -> 4 -> 6
      ctx.moveTo(sx + cols[0], baseY - stepY);
      ctx.lineTo(sx + cols[6], baseY - stepY);
      ctx.stroke();

      // Tower pillars & nodes
      cols.forEach((cxOff, i) => {
        const cx = sx + cxOff;
        const hLv = levels[i];
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.lineTo(cx, baseY - stepY * (hLv - 1));
        ctx.stroke();

        for (let lv = 0; lv < hLv; lv++) {
          ctx.fillStyle = lv > 0 ? accentColor : lineColor;
          ctx.beginPath();
          ctx.arc(cx, baseY - stepY * lv, lv === hLv - 1 ? 5 : 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    };

    drawSkipList(fCtx, '#6B2421', '#C69747');
    drawSkipList(fFoil, 'rgba(255,255,255,0)', '#ffffff');

    stampText(fCtx, fFoil, fBump, '16,384 SLOTS · SINGLE-THREADED EVENT LOOP', COVER_W / 2, by + 616, '500 17px "JetBrains Mono", monospace', 'rgba(107,36,33,0.72)', false, 'center');

    // Bottom antique ivory seal badge
    fCtx.save();
    fCtx.shadowColor = 'rgba(0,0,0,0.28)';
    fCtx.shadowBlur = 14;
    fCtx.fillStyle = '#F4EEE1';
    fCtx.fillRect(COVER_W / 2 - 44, 1300, 88, 102);
    fCtx.restore();
    drawPebbleMonogram(fCtx, COVER_W / 2, 1351, 56, '#6B2421', 4.5);

    // Spine: Continuous Ebru Marbling + Pasted Ivory Spine Label
    sCtx.fillStyle = '#5C201E';
    sCtx.fillRect(0, 0, SPINE_W, SPINE_H);
    if (artImg) drawCoverImage(sCtx, artImg, SPINE_W, SPINE_H, 'left');

    const labelY = 530;
    const labelH = 420;
    sCtx.save();
    sCtx.shadowColor = 'rgba(0,0,0,0.35)';
    sCtx.shadowBlur = 14;
    sCtx.fillStyle = '#F4EEE1';
    sCtx.fillRect(28, labelY, SPINE_W - 56, labelH);
    sCtx.restore();
    sCtx.fillStyle = '#6B2421';
    sCtx.fillRect(28, labelY, SPINE_W - 56, 8);
    sCtx.fillRect(28, labelY + labelH - 8, SPINE_W - 56, 8);
    sCtx.fillStyle = '#C69747';
    sCtx.fillRect(28, labelY + 14, SPINE_W - 56, 3);
    sCtx.fillRect(28, labelY + labelH - 17, SPINE_W - 56, 3);
    sFoil.fillStyle = '#ffffff';
    sFoil.fillRect(28, labelY + 14, SPINE_W - 56, 3);
    sFoil.fillRect(28, labelY + labelH - 17, SPINE_W - 56, 3);

    sCtx.save();
    sCtx.translate(SPINE_W / 2, labelY + labelH / 2);
    sCtx.rotate(Math.PI / 2);
    sCtx.font = '700 72px "Cormorant Garamond", Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = '#1C1412';
    sCtx.fillText('Redis', 0, 22);
    sCtx.restore();

    // Bottom spine seal
    sCtx.fillStyle = '#F4EEE1';
    sCtx.fillRect(SPINE_W / 2 - 46, SPINE_H - 165, 92, 106);
    drawPebbleMonogram(sCtx, SPINE_W / 2, SPINE_H - 112, 64, '#6B2421', 4.8);

    // Back
    bCtx.fillStyle = '#6B2421';
    bCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(bCtx, artImg, COVER_W, COVER_H, 'center', true);
    bCtx.fillStyle = '#F4EEE1';
    bCtx.fillRect(160, 440, 704, 560);
    bCtx.strokeStyle = '#6B2421';
    bCtx.lineWidth = 3;
    bCtx.strokeRect(180, 460, 664, 520);
    bCtx.font = '500 22px "JetBrains Mono", monospace';
    bCtx.fillStyle = '#6B2421';
    bCtx.fillText('EBRU MARBLED EDITION', 224, 535);
    bCtx.font = '400 34px "EB Garamond", "Songti SC", serif';
    bCtx.fillStyle = '#251B19';
    wrapText(bCtx, volume.description, 224, 615, 576, 56);
    bCtx.font = '500 20px "JetBrains Mono", monospace';
    bCtx.fillStyle = 'rgba(107,36,33,0.75)';
    bCtx.fillText('PEBBLE PRESS · FIRST EDITION', 224, 926);
  }

  // =========================================================================
  // BOOK 3: JUC — 1960s Swiss Brutalist Typographic Grid + AQS CLH & CAS Foil
  // =========================================================================
  else if (volume.designKey === 'juc') {
    fCtx.fillStyle = '#ECEAE1';
    fCtx.fillRect(0, 0, COVER_W, COVER_H);

    // Crisp Swiss header rule
    fCtx.fillStyle = '#141619';
    fCtx.fillRect(96, 128, 840, 4);
    fCtx.font = '600 22px "JetBrains Mono", monospace';
    fCtx.fillText('NO. 03', 96, 108);
    fCtx.textAlign = 'right';
    fCtx.fillText('JAVA.UTIL.CONCURRENT', 936, 108);
    fCtx.textAlign = 'left';

    // Monumental Grotesque Title
    stampText(fCtx, fFoil, fBump, 'JUC', 84, 386, '800 250px "Inter", sans-serif', '#141619', false);

    fCtx.font = '600 28px "Inter", sans-serif';
    fCtx.fillStyle = '#1D4491';
    fCtx.fillText('CONCURRENCY, LOCKS & EXECUTORS', 98, 446);

    // Middleware Essence: Swiss Bauhaus AQS CLH Queue & Stepped Thread Execution Grid
    const gx = 96;
    const gy = 532;
    const gw = 840;
    const gh = 680;

    // Fine vertical Swiss grid lines (crisp enough to remain visible under soft studio light)
    fCtx.strokeStyle = 'rgba(20, 22, 25, 0.24)';
    fCtx.lineWidth = 2.2;
    for (let i = 0; i <= 6; i++) {
      const lx = gx + (gw / 6) * i;
      fCtx.beginPath();
      fCtx.moveTo(lx, gy);
      fCtx.lineTo(lx, gy + gh);
      fCtx.stroke();
    }

    // Parallel Thread Phase Blocks (Matte Carbon + Klein Cobalt)
    const bars = [
      { x: 0, y: 26, w: 390, h: 66, c: '#141619', foil: false },
      { x: 420, y: 26, w: 230, h: 66, c: '#1D4491', foil: false },
      { x: 140, y: 124, w: 490, h: 66, c: '#1D4491', foil: false },
      { x: 660, y: 124, w: 180, h: 66, c: '#141619', foil: false },
      { x: 0, y: 222, w: 260, h: 66, c: '#1D4491', foil: false },
      { x: 290, y: 222, w: 550, h: 66, c: '#141619', foil: false },
      // Highlighted Metallic Foil CAS Critical Section Lock Block!
      { x: 140, y: 320, w: 340, h: 66, c: '#C68C32', foil: true },
      { x: 510, y: 320, w: 330, h: 66, c: '#1D4491', foil: false },
      { x: 0, y: 418, w: 560, h: 66, c: '#141619', foil: false },
      { x: 590, y: 418, w: 140, h: 66, c: '#C4452C', foil: false },
    ];

    bars.forEach((b) => {
      fCtx.fillStyle = b.c;
      fCtx.fillRect(gx + b.x, gy + b.y, b.w, b.h);
      if (b.foil) {
        fFoil.fillStyle = '#ffffff';
        fFoil.fillRect(gx + b.x, gy + b.y, b.w, b.h);
        fCtx.font = '600 22px "JetBrains Mono", monospace';
        fCtx.fillStyle = '#141619';
        fCtx.fillText('CAS · STATE = 1', gx + b.x + 24, gy + b.y + 41);
      }
    });

    // Crisp AQS CLH FIFO Queue Schematic at bottom of grid
    const qY = gy + 558;
    const nodes = ['HEAD', 'NODE 01', 'NODE 02', 'TAIL'];
    nodes.forEach((label, idx) => {
      const nx = gx + idx * 224;
      fCtx.strokeStyle = '#141619';
      fCtx.lineWidth = 3;
      fCtx.strokeRect(nx, qY, 166, 62);
      fCtx.font = '600 20px "JetBrains Mono", monospace';
      fCtx.fillStyle = idx === 0 ? '#1D4491' : '#141619';
      fCtx.textAlign = 'center';
      fCtx.fillText(label, nx + 83, qY + 38);
      if (idx < nodes.length - 1) {
        fCtx.beginPath();
        fCtx.moveTo(nx + 166, qY + 31);
        fCtx.lineTo(nx + 224, qY + 31);
        fCtx.stroke();
      }
    });
    fCtx.textAlign = 'left';

    // Bottom Swiss Colophon Rule
    fCtx.fillStyle = 'rgba(20,22,25,0.35)';
    fCtx.fillRect(96, 1344, 840, 2);
    fCtx.font = '600 22px "JetBrains Mono", monospace';
    fCtx.fillStyle = '#141619';
    fCtx.fillText('AQS · CAS · THREADPOOL', 96, 1396);
    fCtx.textAlign = 'right';
    fCtx.fillText('PEBBLE PRESS', 936, 1396);
    fCtx.textAlign = 'left';

    // Spine: Two-Tone Swiss Klein-Cobalt Cap + Chalk Body + Bold Grotesque
    sCtx.fillStyle = '#E5E2D8';
    sCtx.fillRect(0, 0, SPINE_W, SPINE_H);
    sCtx.fillStyle = '#1D4491';
    sCtx.fillRect(0, 0, SPINE_W, 210);
    sCtx.font = '600 28px "JetBrains Mono", monospace';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = '#ECEAE1';
    sCtx.fillText('03', SPINE_W / 2, 118);

    sCtx.save();
    sCtx.translate(SPINE_W / 2, SPINE_H / 2 + 10);
    sCtx.rotate(Math.PI / 2);
    sCtx.font = '800 78px "Inter", sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = '#141619';
    sCtx.fillText('JUC', 0, 26);
    sCtx.restore();

    drawPebbleMonogram(sCtx, SPINE_W / 2, SPINE_H - 115, 76, '#141619', 5.2);

    // Back (centered Stripe Press colophon so standing perspective stays pure chalk board!)
    bCtx.fillStyle = '#E8E5DC';
    bCtx.fillRect(0, 0, COVER_W, COVER_H);
    const bAo3 = bCtx.createLinearGradient(COVER_W, 0, COVER_W - 240, 0);
    bAo3.addColorStop(0, 'rgba(14,16,20,0.3)');
    bAo3.addColorStop(1, 'rgba(14,16,20,0)');
    bCtx.fillStyle = bAo3;
    bCtx.fillRect(COVER_W - 240, 0, 240, COVER_H);

    drawPebbleMonogram(bCtx, COVER_W / 2, 580, 96, '#141619', 5.5);
    bCtx.fillStyle = '#1D4491';
    bCtx.fillRect(COVER_W / 2 - 44, 668, 88, 6);
    bCtx.textAlign = 'center';
    bCtx.font = '600 22px "JetBrains Mono", monospace';
    bCtx.fillStyle = '#141619';
    bCtx.fillText('PEBBLE PRESS · NO. 03', COVER_W / 2, 728);
    bCtx.font = '500 24px "Inter", sans-serif';
    bCtx.fillStyle = '#4B5058';
    bCtx.fillText('JAVA.UTIL.CONCURRENT', COVER_W / 2, 774);
    bCtx.textAlign = 'left';
  }

  // =========================================================================
  // BOOK 4: Spring — Cotton Rag Dawn Watercolor + Champagne-Gold IoC Orbit
  // =========================================================================
  else {
    fCtx.fillStyle = '#E6DDD0';
    fCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(fCtx, artImg, COVER_W, COVER_H, 'center');

    // Whisper-thin archival hairline frame
    fCtx.strokeStyle = 'rgba(28, 36, 32, 0.2)';
    fCtx.lineWidth = 2;
    fCtx.strokeRect(58, 58, COVER_W - 116, COVER_H - 116);

    // Top centered charcoal Pebble monogram
    drawPebbleMonogram(fCtx, COVER_W / 2, 146, 54, '#1C2420', 4);

    // Middleware Essence: Delicate Champagne-Gold Metallic Foil IoC Bean Lifecycle Orbit
    const ox = COVER_W / 2;
    const oy = 590;
    const drawOrbit = (ctx: CanvasRenderingContext2D, color: string, lw: number) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;

      ctx.beginPath();
      ctx.arc(ox, oy, 290, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.arc(ox, oy, 246, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4 cardinal Bean Lifecycle phase dots (Instantiate / Populate / Initialize / Proxy)
      const pts = [
        [ox, oy - 290],
        [ox + 290, oy],
        [ox, oy + 290],
        [ox - 290, oy],
      ];
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    drawOrbit(fCtx, 'rgba(182, 142, 68, 0.72)', 2);
    drawOrbit(fFoil, '#ffffff', 2.6);

    // Micro cardinal phase annotations
    fCtx.font = '500 17px "JetBrains Mono", monospace';
    fCtx.fillStyle = 'rgba(42, 56, 48, 0.72)';
    fCtx.textAlign = 'center';
    fCtx.fillText('INSTANTIATE', ox, oy - 312);
    fCtx.fillText('INITIALIZE', ox, oy + 324);

    // Centered classical gallery title floating inside dawn sky
    stampText(fCtx, fFoil, fBump, 'Spring', ox, oy + 28, '600 164px "Cormorant Garamond", Georgia, serif', '#1A231E', false, 'center');
    stampText(fCtx, fFoil, fBump, 'IOC · AOP · TRANSACTIONS', ox, oy + 96, '500 22px "JetBrains Mono", monospace', '#36473E', false, 'center');

    // Bottom crisp pine-charcoal colophon
    stampText(fCtx, fFoil, fBump, 'Pebble Press', ox, 1384, 'italic 400 36px "EB Garamond", Georgia, serif', '#1A231E', false, 'center');

    // Spine: Seamless Dawn Watercolor Wrap
    sCtx.fillStyle = '#DED6C8';
    sCtx.fillRect(0, 0, SPINE_W, SPINE_H);
    if (artImg) drawCoverImage(sCtx, artImg, SPINE_W, SPINE_H, 'left');

    sCtx.font = '500 22px "JetBrains Mono", monospace';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = 'rgba(28, 36, 32, 0.7)';
    sCtx.fillText('PEBBLE', SPINE_W / 2, 118);

    sCtx.save();
    sCtx.translate(SPINE_W / 2, SPINE_H / 2);
    sCtx.rotate(Math.PI / 2);
    sCtx.font = '600 76px "Cormorant Garamond", Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = '#1A231E';
    sCtx.fillText('Spring', 0, 24);
    sCtx.restore();

    drawPebbleMonogram(sCtx, SPINE_W / 2, SPINE_H - 115, 76, '#1A231E', 4.6);

    // Back (centered Stripe Press colophon so standing perspective stays clean cotton watercolor!)
    bCtx.fillStyle = '#E6DDD0';
    bCtx.fillRect(0, 0, COVER_W, COVER_H);
    if (artImg) drawCoverImage(bCtx, artImg, COVER_W, COVER_H, 'center', true);
    const bAo4 = bCtx.createLinearGradient(COVER_W, 0, COVER_W - 240, 0);
    bAo4.addColorStop(0, 'rgba(18,22,20,0.3)');
    bAo4.addColorStop(1, 'rgba(18,22,20,0)');
    bCtx.fillStyle = bAo4;
    bCtx.fillRect(COVER_W - 240, 0, 240, COVER_H);

    drawPebbleMonogram(bCtx, COVER_W / 2, 580, 96, '#1C2420', 5);
    bCtx.textAlign = 'center';
    bCtx.font = '500 22px "JetBrains Mono", monospace';
    bCtx.fillStyle = 'rgba(28, 36, 32, 0.72)';
    bCtx.fillText('PEBBLE PRESS · FIRST EDITION', COVER_W / 2, 700);
    bCtx.font = 'italic 400 32px "EB Garamond", Georgia, serif';
    bCtx.fillStyle = '#1C2420';
    bCtx.fillText(volume.subtitle, COVER_W / 2, 756);
    bCtx.textAlign = 'left';
  }

  // Convert Foil Masks into crisp PBR Roughness + Metalness maps (high-glint hot foil vs dry velvet matte cloth!)
  const frontRM = buildRoughnessAndMetalnessFromFoilMask(frontFoilC, 0.95, 0.14, 0.96);
  const spineRM = buildRoughnessAndMetalnessFromFoilMask(spineFoilC, 0.95, 0.16, 0.94);
  const backRM = buildRoughnessAndMetalnessFromFoilMask(backFoilC, 0.95, 0.16, 0.92);

  return {
    frontMap: toTexture(frontC, true, maxAnisotropy),
    frontBump: toTexture(frontBumpC, false, maxAnisotropy),
    frontRoughness: toTexture(frontRM.roughness, false, maxAnisotropy),
    frontMetalness: toTexture(frontRM.metalness, false, maxAnisotropy),
    spineMap: toTexture(spineC, true, maxAnisotropy),
    spineBump: toTexture(spineBumpC, false, maxAnisotropy),
    spineRoughness: toTexture(spineRM.roughness, false, maxAnisotropy),
    spineMetalness: toTexture(spineRM.metalness, false, maxAnisotropy),
    backMap: toTexture(backC, true, maxAnisotropy),
    backBump: toTexture(backBumpC, false, maxAnisotropy),
    backRoughness: toTexture(backRM.roughness, false, maxAnisotropy),
    backMetalness: toTexture(backRM.metalness, false, maxAnisotropy),
  };
}
