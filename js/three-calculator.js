// Renders the ALIO MX-12B as a flat, orthographic Three.js scene instead of
// DOM/CSS. Each button is a textured plane; the button textures are drawn on
// an offscreen 2D canvas so the same "flat CSS card" look (gradients, a
// bottom ledge standing in for box-shadow, a pressed/inset state) survives
// the move to WebGL. The arithmetic engine (calculator-engine.js) and click
// sound are unchanged and reused as-is.
import * as THREE from 'three';

// ---- Layout (CSS-px-equivalent world units) ----
const CALC_W = 380;
const PAD_X = 18, PAD_TOP = 18, PAD_BOTTOM = 22;
const CONTENT_W = CALC_W - PAD_X * 2;
const BRAND_H = 46, GAP_BRAND_DISPLAY = 12, DISPLAY_H = 92, GAP_DISPLAY_KEYPAD = 16;
const KEY_GAP = 8, KEY_H = 48, ROWS = 5, COLS = 5;
const KEYPAD_H = ROWS * KEY_H + (ROWS - 1) * KEY_GAP;
const CALC_H = PAD_TOP + BRAND_H + GAP_BRAND_DISPLAY + DISPLAY_H + GAP_DISPLAY_KEYPAD + KEYPAD_H + PAD_BOTTOM;
const KEY_W = (CONTENT_W - (COLS - 1) * KEY_GAP) / COLS;
const DISPLAY_TOP = PAD_TOP + BRAND_H + GAP_BRAND_DISPLAY;
const KEYPAD_TOP = DISPLAY_TOP + DISPLAY_H + GAP_DISPLAY_KEYPAD;

function colLeft(c) { return PAD_X + c * (KEY_W + KEY_GAP); }
function rowTop(r) { return KEYPAD_TOP + r * (KEY_H + KEY_GAP); }
function toWorld(leftPx, topPx, w, h) {
  const cx = leftPx + w / 2, cy = topPx + h / 2;
  return { x: cx - CALC_W / 2, y: CALC_H / 2 - cy };
}

// ---- Palette (matches the retired css/style.css variables) ----
const HOUSING = '#fdfdfb', INK = '#1c1c1a';
const LCD_BG = '#d7e6da', LCD_BG_DARK = '#c7dccb', LCD_INK = '#26362a';
const KEY_WHITE = '#fdfdfb', KEY_WHITE_DARK = '#d8d6ce';
const KEY_GREY = '#cac6ba', KEY_GREY_DARK = '#a9a498';
const KEY_CLEAR = '#e3a79a', KEY_CLEAR_DARK = '#c4816f';
const KEY_TEXT = '#2a2a27';

const STYLES = {
  num: { topColor: KEY_GREY, bottomColor: KEY_GREY_DARK, ledgeColor: '#8b8778', textColor: KEY_TEXT, fontSize: 16 },
  fn: { topColor: KEY_WHITE, bottomColor: KEY_WHITE_DARK, ledgeColor: '#b6b3a8', textColor: KEY_TEXT, fontSize: 13 },
  op: { topColor: KEY_WHITE, bottomColor: KEY_WHITE_DARK, ledgeColor: '#b6b3a8', textColor: KEY_TEXT, fontSize: 18 },
  clear: { topColor: KEY_CLEAR, bottomColor: KEY_CLEAR_DARK, ledgeColor: '#9c5c48', textColor: '#4a1c10', fontSize: 13 },
};

// ---- Key layout, mirroring the old index.html grid 1:1 ----
const KEY_DEFS = [
  { row: 0, col: 1, cls: 'fn', action: 'mc', label: 'MC' },
  { row: 0, col: 2, cls: 'fn', action: 'mr', label: 'MR' },
  { row: 0, col: 3, cls: 'fn', action: 'm-', label: 'M-' },
  { row: 0, col: 4, half: 'left', cls: 'fn', action: 'percent', label: '%' },
  { row: 0, col: 4, half: 'right', cls: 'fn', action: 'm+', label: 'MU' },

  { row: 1, col: 0, cls: 'fn', action: 'sign', label: '+/-' },
  { row: 1, col: 1, cls: 'num', digit: '7', label: '7' },
  { row: 1, col: 2, cls: 'num', digit: '8', label: '8' },
  { row: 1, col: 3, cls: 'num', digit: '9', label: '9' },
  { row: 1, col: 4, cls: 'op', op: '÷', label: '÷' },

  { row: 2, col: 0, cls: 'fn', action: 'backspace', label: '▶' },
  { row: 2, col: 1, cls: 'num', digit: '4', label: '4' },
  { row: 2, col: 2, cls: 'num', digit: '5', label: '5' },
  { row: 2, col: 3, cls: 'num', digit: '6', label: '6' },
  { row: 2, col: 4, cls: 'op', op: '×', label: '×' },

  { row: 3, col: 0, cls: 'clear', action: 'clear', label: 'C/AC', subLabel: 'ON' },
  { row: 3, col: 1, cls: 'num', digit: '1', label: '1' },
  { row: 3, col: 2, cls: 'num', digit: '2', label: '2' },
  { row: 3, col: 3, cls: 'num', digit: '3', label: '3' },
  { row: 3, col: 4, cls: 'op', op: '-', label: '-' },

  { row: 4, col: 0, cls: 'fn', digit: '0', label: '0' },
  { row: 4, col: 1, cls: 'fn', digit: '00', label: '00' },
  { row: 4, col: 2, cls: 'fn', action: 'decimal', label: '·' },
  { row: 4, col: 3, cls: 'fn', action: 'equals', label: '=' },
  { row: 4, col: 4, cls: 'op', op: '+', label: '+' },
];

// ---- Canvas texture drawing ----
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawButtonFace(ctx, w, h, opts) {
  const { topColor, bottomColor, ledgeColor, textColor, label, subLabel, fontSize, pressed } = opts;
  const r = 9;
  ctx.clearRect(0, 0, w, h);

  if (pressed) {
    roundRectPath(ctx, 0, 3, w, h - 3, r);
    ctx.fillStyle = bottomColor;
    ctx.fill();
    const grad = ctx.createLinearGradient(0, 3, 0, 13);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    roundRectPath(ctx, 0, 3, w, h - 3, r);
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 4;
    roundRectPath(ctx, 0, 0, w, h - 4, r);
    ctx.fillStyle = ledgeColor;
    ctx.fill();
    ctx.restore();

    roundRectPath(ctx, 0, 4, w, h - 4, r);
    ctx.fillStyle = ledgeColor;
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, 0, h - 4);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    roundRectPath(ctx, 0, 0, w, h - 4, r);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, 0, 0, w, h - 4, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 1.5);
    ctx.lineTo(w - 2, 1.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
  const cy = pressed ? h / 2 + 2 : (h - 4) / 2;
  if (subLabel) {
    ctx.fillText(label, w / 2, cy - 5);
    ctx.font = '700 9px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(subLabel, w / 2, cy + 9);
  } else {
    ctx.fillText(label, w / 2, cy);
  }
}

function makeButtonTexture(w, h, opts) {
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawButtonFace(ctx, w, h, opts);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeBackgroundTexture() {
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = CALC_W * scale;
  canvas.height = CALC_H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  roundRectPath(ctx, 0, 0, CALC_W, CALC_H, 20);
  ctx.fillStyle = HOUSING;
  ctx.fill();
  ctx.strokeStyle = '#eceae3';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = '900 22px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ALIO', PAD_X, PAD_TOP + 24);

  const spX = PAD_X + 64, spY = PAD_TOP + 6, spW = CONTENT_W - 64 - 80, spH = 20;
  const spGrad = ctx.createLinearGradient(spX, spY, spX + spW * 0.6, spY + spH);
  spGrad.addColorStop(0, '#4a3628');
  spGrad.addColorStop(0.55, '#1c1410');
  spGrad.addColorStop(1, '#2b1f17');
  roundRectPath(ctx, spX, spY, spW, spH, 2);
  ctx.fillStyle = spGrad;
  ctx.fill();

  ctx.fillStyle = '#4a4a45';
  ctx.textAlign = 'right';
  ctx.font = '700 11px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('MX-12B', CALC_W - PAD_X, PAD_TOP + 12);
  ctx.font = '800 15px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('12', CALC_W - PAD_X - 30, PAD_TOP + 28);
  ctx.font = '700 8px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('DIGITS', CALC_W - PAD_X, PAD_TOP + 28);

  const dpGrad = ctx.createLinearGradient(0, DISPLAY_TOP, 0, DISPLAY_TOP + DISPLAY_H);
  dpGrad.addColorStop(0, LCD_BG);
  dpGrad.addColorStop(1, LCD_BG_DARK);
  roundRectPath(ctx, PAD_X, DISPLAY_TOP, CONTENT_W, DISPLAY_H, 4);
  ctx.fillStyle = dpGrad;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawDisplayOverlay(ctx, w, h, { display, memoryActive, errorActive, stoActive }) {
  ctx.clearRect(0, 0, w, h);

  const inds = [
    { label: 'M', active: memoryActive, y: h * 0.3, size: 10 },
    { label: 'STO', active: stoActive, y: h * 0.52, size: 7 },
    { label: 'E', active: errorActive, y: h * 0.76, size: 10 },
  ];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  inds.forEach((ind) => {
    ctx.font = `700 ${ind.size}px "Courier New", monospace`;
    ctx.fillStyle = `rgba(38,54,42,${ind.active ? 0.9 : 0.15})`;
    ctx.fillText(ind.label, 6, ind.y);
  });

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '700 40px "Courier New", monospace';
  ctx.fillStyle = LCD_INK;
  ctx.fillText(display, w - 14, h / 2 + 2);
}

// ---- Scene setup ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a3a38);

const camera = new THREE.OrthographicCamera();
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  const viewAspect = w / h;
  const calcAspect = CALC_W / CALC_H;
  const margin = 1.08;
  let viewW, viewH;
  if (viewAspect > calcAspect) {
    viewH = CALC_H * margin;
    viewW = viewH * viewAspect;
  } else {
    viewW = CALC_W * margin;
    viewH = viewW / viewAspect;
  }
  camera.left = -viewW / 2;
  camera.right = viewW / 2;
  camera.top = viewH / 2;
  camera.bottom = -viewH / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', fitCamera);
fitCamera();

// Housing + brand row + display background (static, baked once).
const backgroundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(CALC_W, CALC_H),
  new THREE.MeshBasicMaterial({ map: makeBackgroundTexture() })
);
backgroundMesh.position.z = 0;
scene.add(backgroundMesh);

// Screen digits + M/STO/E indicators (dynamic, redrawn on every state change).
const displayCanvas = document.createElement('canvas');
const DISPLAY_SCALE = 3;
displayCanvas.width = CONTENT_W * DISPLAY_SCALE;
displayCanvas.height = DISPLAY_H * DISPLAY_SCALE;
const displayCtx = displayCanvas.getContext('2d');
displayCtx.scale(DISPLAY_SCALE, DISPLAY_SCALE);
const displayTexture = new THREE.CanvasTexture(displayCanvas);
displayTexture.colorSpace = THREE.SRGBColorSpace;
const displayMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(CONTENT_W, DISPLAY_H),
  new THREE.MeshBasicMaterial({ map: displayTexture, transparent: true })
);
const displayPos = toWorld(PAD_X, DISPLAY_TOP, CONTENT_W, DISPLAY_H);
displayMesh.position.set(displayPos.x, displayPos.y, 0.2);
scene.add(displayMesh);

// ---- Keys ----
function geometryForDef(def) {
  const topPx = rowTop(def.row);
  if (def.half) {
    const cellLeft = colLeft(def.col);
    const halfW = (KEY_W - 6) / 2;
    const leftPx = def.half === 'left' ? cellLeft : cellLeft + halfW + 6;
    return { leftPx, topPx, w: halfW, h: KEY_H };
  }
  return { leftPx: colLeft(def.col), topPx, w: KEY_W, h: KEY_H };
}

function actionFromDef(def) {
  if (def.digit !== undefined) return { type: 'digit', value: def.digit };
  if (def.op !== undefined) return { type: 'op', value: def.op };
  return { type: def.action };
}

const entries = [];
const byDigit = {}, byOp = {}, byAction = {};

KEY_DEFS.forEach((def) => {
  const { leftPx, topPx, w, h } = geometryForDef(def);
  const pos = toWorld(leftPx, topPx, w, h);
  const style = STYLES[def.cls];
  const opts = { ...style, label: def.label, subLabel: def.subLabel };

  const normalTexture = makeButtonTexture(w, h, { ...opts, pressed: false });
  const pressedTexture = makeButtonTexture(w, h, { ...opts, pressed: true });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: normalTexture, transparent: true })
  );
  mesh.position.set(pos.x, pos.y, 0.5);
  scene.add(mesh);

  const entry = { def, mesh, normalTexture, pressedTexture, baseY: pos.y, action: actionFromDef(def), timer: null };
  entries.push(entry);

  if (def.digit !== undefined) byDigit[def.digit] = entry;
  else if (def.op !== undefined) byOp[def.op] = entry;
  else byAction[def.action] = entry;
});

// ---- Engine wiring ----
const state = CalculatorEngine.createState();
let stoFlashUntil = 0;

function updateDisplay() {
  drawDisplayOverlay(displayCtx, CONTENT_W, DISPLAY_H, {
    display: state.display,
    memoryActive: state.memory !== 0,
    errorActive: state.error,
    stoActive: performance.now() < stoFlashUntil,
  });
  displayTexture.needsUpdate = true;
}

function flashSto() {
  stoFlashUntil = performance.now() + 500;
  updateDisplay();
  setTimeout(updateDisplay, 520);
}

function pressVisual(entry) {
  if (!entry) return;
  entry.mesh.material.map = entry.pressedTexture;
  entry.mesh.position.y = entry.baseY - 2;
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.mesh.material.map = entry.normalTexture;
    entry.mesh.position.y = entry.baseY;
  }, 90);
}

// Central dispatcher: every valid key action funnels through here so the
// click sound and re-render always stay in sync with a state mutation.
function dispatch(action, entry) {
  switch (action.type) {
    case 'digit': CalculatorEngine.inputDigit(state, action.value); break;
    case 'decimal': CalculatorEngine.inputDecimal(state); break;
    case 'op': CalculatorEngine.inputOperator(state, action.value); break;
    case 'equals': CalculatorEngine.inputEquals(state); break;
    case 'percent': CalculatorEngine.inputPercent(state); break;
    case 'sqrt': CalculatorEngine.inputSqrt(state); break;
    case 'sign': CalculatorEngine.toggleSign(state); break;
    case 'backspace': CalculatorEngine.backspace(state); break;
    case 'ac': CalculatorEngine.allClear(state); break;
    case 'clear': CalculatorEngine.clearOrAllClear(state); break;
    case 'mc': CalculatorEngine.memoryClear(state); break;
    case 'mr': CalculatorEngine.memoryRecall(state); break;
    case 'm+': CalculatorEngine.memoryAdd(state); flashSto(); break;
    case 'm-': CalculatorEngine.memorySubtract(state); flashSto(); break;
    default: return;
  }
  ClickSound.play();
  pressVisual(entry);
  updateDisplay();
}

// --- Mouse / touch wiring ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const keyMeshes = entries.map((e) => e.mesh);

renderer.domElement.addEventListener('pointerdown', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(keyMeshes);
  if (!hits.length) return;
  const entry = entries.find((en) => en.mesh === hits[0].object);
  dispatch(entry.action, entry);
});

// --- Keyboard wiring ---
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; // no key-repeat, matches a physical button press

  if (e.key >= '0' && e.key <= '9') return dispatch({ type: 'digit', value: e.key }, byDigit[e.key]);
  if (e.key === '.') return dispatch({ type: 'decimal' }, byAction['decimal']);
  if (e.key === '+') return dispatch({ type: 'op', value: '+' }, byOp['+']);
  if (e.key === '-') return dispatch({ type: 'op', value: '-' }, byOp['-']);
  if (e.key === '*') return dispatch({ type: 'op', value: '×' }, byOp['×']);
  if (e.key === '/') { e.preventDefault(); return dispatch({ type: 'op', value: '÷' }, byOp['÷']); }
  if (e.key === '%') return dispatch({ type: 'percent' }, byAction['percent']);
  if (e.key === 'Enter' || e.key === '=') return dispatch({ type: 'equals' }, byAction['equals']);
  if (e.key === 'Escape') return dispatch({ type: 'ac' }, byAction['clear']);
  if (e.key === 'Backspace') return dispatch({ type: 'backspace' }, byAction['backspace']);
});

updateDisplay();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
