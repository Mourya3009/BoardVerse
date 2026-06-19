"use strict";
/* ============================================================
   BOARDVERSE — SNAKES.JS
   Snake & Ladder — Canvas-rendered, up to 4 players
   ============================================================ */

const SNAKES = { 99:21, 87:24, 73:44, 68:33, 54:18, 38:9, 28:6 };
const LADDERS = { 4:56, 13:46, 33:49, 42:63, 50:69, 62:81, 74:92 };

const PCOLORS = ['#FF4757','#2ED573','#FFD166','#5DADE2'];
const PNAMES  = ['Red','Green','Yellow','Blue'];

let numPlayers = 2;
let currentPlayer = 0;
let positions = [];
let rolled = false;
let gameOver = false;

const canvas = document.getElementById('snakes-svg'); // repurpose this variable just so it doesn't fail if used
const ctx = null; // No longer used for background since we switched to CSS grid! 
const SIZE   = 500; // arbitrary base size
const CELL   = SIZE / 10;
let tokenElements = [];

function initGame() {
  document.getElementById('winOverlay').style.display = 'none';
  gameOver = false;
  rolled   = false;
  currentPlayer = 0;
  positions = Array(numPlayers).fill(0);
  diceReset();
  document.getElementById('gameLog').innerHTML = '';
  updatePlayerCards();
  updateStatus();
  
  // We don't draw the background grid via canvas anymore, it's CSS in style.css!
  // But we DO need to generate the cells dynamically.
  if(document.getElementById('snakes-board').children.length === 0) {
    buildGrid();
  }
  
  drawBoard();
  initTokens();
  renderTokens();
}

function buildGrid() {
  const board = document.getElementById('snakes-board');
  board.innerHTML = '';
  // 10x10 Grid. Square 1 is bottom-left, 100 is top-left.
  for(let row = 9; row >= 0; row--) {
    for(let col = 0; col < 10; col++) {
      const isEvenRow = (row % 2 === 0);
      const actualCol = isEvenRow ? col : (9 - col);
      const sq = row * 10 + actualCol + 1;
      
      const cell = document.createElement('div');
      cell.className = `snakes-cell ${(row + actualCol) % 2 === 0 ? 'cell-dark' : 'cell-light'}`;
      
      const span = document.createElement('span');
      span.className = 'snakes-cell-num';
      span.textContent = sq;
      
      cell.appendChild(span);
      board.appendChild(cell);
    }
  }
}

function selectPlayers(n) {
  numPlayers = n;
  document.getElementById('startOverlay').style.display = 'none';
  initGame();
}

function showStartScreen() {
  document.getElementById('startOverlay').style.display = 'flex';
}

function diceReset() {
  const dice = document.getElementById('ludo-dice');
  if (dice) dice.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
  document.getElementById('diceVal').textContent = '—';
}

// ── COORDINATE HELPER ──────────────────────────────────────
// Square 1 = bottom-left, 100 = top-left (boustrophedon)
function squareToXY(sq) {
  if(sq <= 0) return { x: CELL * 0.5, y: SIZE - CELL * 0.5 };
  const idx  = sq - 1;
  const row  = Math.floor(idx / 10);           // 0=bottom
  const col  = (row % 2 === 0) ? idx % 10 : 9 - idx % 10;
  const x    = CELL * col + CELL / 2;
  const y    = SIZE - CELL * (row + 1) + CELL / 2;
  return { x, y };
}

function squareRect(sq) {
  const { x, y } = squareToXY(sq);
  return { x: x - CELL/2, y: y - CELL/2, w: CELL, h: CELL };
}

// ── DRAW ───────────────────────────────────────────────────
function drawBoard() {
  const svg = document.getElementById('snakes-svg');
  if(!svg) return;
  svg.innerHTML = ''; // clear SVG
  
  const board = document.getElementById('snakes-board');
  if(board) {
    board.innerHTML = '';
    for(let i = 0; i < 100; i++) {
      const cell = document.createElement('div');
      const r = Math.floor(i / 10);
      const c = i % 10;
      let sq;
      if (r % 2 === 0) {
        sq = 100 - (r * 10) - c;
      } else {
        sq = 100 - (r * 10) - 9 + c;
      }
      cell.className = 'snakes-cell ' + ((r + c) % 2 === 0 ? 'cell-light' : 'cell-dark');
      const num = document.createElement('div');
      num.className = 'snakes-cell-num';
      num.textContent = sq;
      cell.appendChild(num);
      board.appendChild(cell);
    }
  }

  // Ladders
  Object.entries(LADDERS).forEach(([bottom, top]) => {
    const b = squareToXY(+bottom);
    const t = squareToXY(+top);
    drawLadderSVG(svg, b.x, b.y, t.x, t.y);
  });

  // Snakes
  Object.entries(SNAKES).forEach(([head, tail]) => {
    const h = squareToXY(+head);
    const t = squareToXY(+tail);
    drawSnakeSVG(svg, h.x, h.y, t.x, t.y, +head, +tail);
  });
}

function drawSnakeSVG(svg, x1, y1, x2, y2, headSq, tailSq) {
  const s = 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const segments = 25;
  const colors = [
    ['#FF0055', '#990033'], // Crimson
    ['#00E676', '#00994D'], // Emerald
    ['#D500F9', '#8C00A8'], // Amethyst
    ['#00E5FF', '#0099AA']  // Sapphire
  ];
  const colorIdx = (headSq + tailSq) % colors.length;
  const baseColor = colors[colorIdx][0];
  const patternColor = colors[colorIdx][1];
  
  for(let i=0; i<segments; i++) {
    const t0 = i/segments;
    const t1 = (i+1.1)/segments;
    const w = (CELL * 0.28) * (1 - t0) + (CELL * 0.06) * t0;
    
    let d = "";
    const subs = 4;
    for(let j=0; j<=subs; j++) {
      const t = t0 + (j/subs)*(t1 - t0);
      if (t > 1) continue;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const wave = Math.sin(t * Math.PI * 2 * 2.5) * (CELL * 0.35) * (1 - t*0.3);
      const nx = -dy/len;
      const ny = dx/len;
      const xx = (px + nx * wave) * s;
      const yy = (py + ny * wave) * s;
      if (j===0) d += `M${xx},${yy} `;
      else d += `L${xx},${yy} `;
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', baseColor);
    path.setAttribute('stroke-width', w * s);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }

  let dPattern = "";
  const patPts = Math.floor(len / 3);
  for(let i=0; i<=patPts; i++) {
    const t = i/patPts;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const wave = Math.sin(t * Math.PI * 2 * 2.5) * (CELL * 0.35) * (1 - t*0.3);
    const nx = -dy/len;
    const ny = dx/len;
    const xx = (px + nx * wave) * s;
    const yy = (py + ny * wave) * s;
    if (i===0) dPattern += `M${xx},${yy} `;
    else dPattern += `L${xx},${yy} `;
  }
  const dashPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  dashPath.setAttribute('d', dPattern);
  dashPath.setAttribute('stroke', patternColor);
  dashPath.setAttribute('stroke-width', (CELL * 0.12) * s);
  dashPath.setAttribute('stroke-dasharray', '8, 12');
  dashPath.setAttribute('fill', 'none');
  svg.appendChild(dashPath);

  const h_t = 0.01;
  const h_px = x1 + dx * h_t;
  const h_py = y1 + dy * h_t;
  const h_wave = Math.sin(h_t * Math.PI * 2 * 2.5) * (CELL * 0.35) * (1 - h_t*0.3);
  const nx_h = -dy/len;
  const ny_h = dx/len;
  const h_xx = h_px + nx_h * h_wave;
  const h_yy = h_py + ny_h * h_wave;
  const lookAngle = Math.atan2(y1 - h_yy, x1 - h_xx);
  
  const headGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  headGroup.setAttribute('transform', `translate(${x1*s}, ${y1*s}) rotate(${lookAngle * 180 / Math.PI})`);
  
  const headShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  headShape.setAttribute('d', `M0,-15 C15,-20 25,-10 25,0 C25,10 15,20 0,15 C-15,10 -25,0 -25,0 C-25,0 -15,-10 0,-15 Z`);
  headShape.setAttribute('fill', baseColor);
  headShape.setAttribute('stroke', '#fff');
  headShape.setAttribute('stroke-width', 2);
  headGroup.appendChild(headShape);

  const eye1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  eye1.setAttribute('cx', '5'); eye1.setAttribute('cy', '-8');
  eye1.setAttribute('r', '3'); eye1.setAttribute('fill', '#fff');
  headGroup.appendChild(eye1);
  const pupil1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pupil1.setAttribute('cx', '6'); pupil1.setAttribute('cy', '-8');
  pupil1.setAttribute('r', '1.5'); pupil1.setAttribute('fill', '#000');
  headGroup.appendChild(pupil1);

  const eye2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  eye2.setAttribute('cx', '5'); eye2.setAttribute('cy', '8');
  eye2.setAttribute('r', '3'); eye2.setAttribute('fill', '#fff');
  headGroup.appendChild(eye2);
  const pupil2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pupil2.setAttribute('cx', '6'); pupil2.setAttribute('cy', '8');
  pupil2.setAttribute('r', '1.5'); pupil2.setAttribute('fill', '#000');
  headGroup.appendChild(pupil2);
  
  const tongue = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tongue.setAttribute('d', `M25,0 L35,0 L40,-4 M35,0 L40,4`);
  tongue.setAttribute('stroke', '#FF0055');
  tongue.setAttribute('stroke-width', '2');
  tongue.setAttribute('fill', 'none');
  headGroup.appendChild(tongue);

  svg.appendChild(headGroup);
}

function drawLadderSVG(svg, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy/len * (CELL*0.08), ny = dx/len * (CELL*0.08);
  const s = 2; // scale

  if(!document.getElementById('ladderShadow')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'ladderShadow');
    filter.innerHTML = `<feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>`;
    defs.appendChild(filter);
    svg.appendChild(defs);
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('filter', 'url(#ladderShadow)');
  
  const railStyle = "stroke: #8B4513; stroke-width: 14; stroke-linecap: round;";
  const railInnerStyle = "stroke: #D2691E; stroke-width: 8; stroke-linecap: round;";

  // Rails
  for (let sign of [1, -1]) {
    const rx1 = (x1 + nx * sign) * s;
    const ry1 = (y1 + ny * sign) * s;
    const rx2 = (x2 + nx * sign) * s;
    const ry2 = (y2 + ny * sign) * s;
    
    const rOuter = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rOuter.setAttribute('x1', rx1); rOuter.setAttribute('y1', ry1);
    rOuter.setAttribute('x2', rx2); rOuter.setAttribute('y2', ry2);
    rOuter.setAttribute('style', railStyle);
    group.appendChild(rOuter);
    
    const rInner = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rInner.setAttribute('x1', rx1); rInner.setAttribute('y1', ry1);
    rInner.setAttribute('x2', rx2); rInner.setAttribute('y2', ry2);
    rInner.setAttribute('style', railInnerStyle);
    group.appendChild(rInner);
  }

  // Rungs
  const rungs = Math.max(3, Math.floor(len / (CELL * 0.55)));
  for(let i = 1; i < rungs; i++) {
    const t = i / rungs;
    const mx = x1 + dx*t, my = y1 + dy*t;
    const rx1 = (mx + nx * 1.1) * s, ry1 = (my + ny * 1.1) * s;
    const rx2 = (mx - nx * 1.1) * s, ry2 = (my - ny * 1.1) * s;
    
    const rungOuter = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rungOuter.setAttribute('x1', rx1); rungOuter.setAttribute('y1', ry1);
    rungOuter.setAttribute('x2', rx2); rungOuter.setAttribute('y2', ry2);
    rungOuter.setAttribute('style', railStyle);
    group.appendChild(rungOuter);
    
    const rungInner = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rungInner.setAttribute('x1', rx1); rungInner.setAttribute('y1', ry1);
    rungInner.setAttribute('x2', rx2); rungInner.setAttribute('y2', ry2);
    rungInner.setAttribute('style', railInnerStyle);
    group.appendChild(rungInner);
  }
  
  svg.appendChild(group);
}

function initTokens() {
  document.querySelectorAll('.snakes-token').forEach(t => t.remove());
  const board = document.getElementById('snakes-board');
  tokenElements = [];
  
  // Create tokens
  for(let i = 0; i < 4; i++) {
    const div = document.createElement('div');
    div.className = `snakes-token`;
    div.style.background = `radial-gradient(circle at 35% 35%, ${lightenHex(PCOLORS[i], 60)}, ${PCOLORS[i]})`;
    div.textContent = (i + 1);
    
    // Accessibility
    div.setAttribute('role', 'button');
    div.tabIndex = 0;
    div.setAttribute('aria-label', `${PNAMES[i]} token`);
    
    div.style.position = 'absolute';
    div.style.width = '7%';
    div.style.height = '7%';
    div.style.margin = '0';
    div.style.transition = 'all 0.3s ease';
    div.style.display = 'none'; // hidden if not playing
    
    board.appendChild(div);
    tokenElements.push(div);
  }
}

function renderTokens() {
  const grouped = {};
  for(let i = 0; i < numPlayers; i++) {
    const pos = positions[i];
    if(!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(i);
  }

  for(let i = 0; i < 4; i++) {
    if(i >= numPlayers) {
      tokenElements[i].style.display = 'none';
      continue;
    }
    
    tokenElements[i].style.display = 'flex';
    tokenElements[i].classList.toggle('active', i === currentPlayer && !gameOver);
    
    const pos = positions[i];
    const n = grouped[pos].length;
    const idx = grouped[pos].indexOf(i);
    
    // Calculate CSS left and top percentages
    // sq <= 0 -> off board bottom left
    let sq = pos;
    let targetLeft, targetTop;
    if(sq <= 0) {
      targetLeft = 0;
      targetTop = 90;
    } else {
      const idxCell = sq - 1;
      const row = Math.floor(idxCell / 10);
      const col = (row % 2 === 0) ? idxCell % 10 : 9 - idxCell % 10;
      targetLeft = col * 10;
      targetTop = 90 - row * 10;
    }
    
    // Stack offsets
    let baseLeft = targetLeft + 1.5; // center a 7% token in a 10% cell
    let baseTop = targetTop + 1.5;
    
    if (n > 1) {
      tokenElements[i].style.transform = 'scale(0.7)';
      if (n === 2) {
        tokenElements[i].style.left = `calc(${baseLeft}% + ${idx === 0 ? -1.5 : 1.5}%)`;
        tokenElements[i].style.top = `calc(${baseTop}% + 0%)`;
      } else if (n === 3) {
        tokenElements[i].style.left = `calc(${baseLeft}% + ${idx === 0 ? -1.5 : (idx === 1 ? 1.5 : 0)}%)`;
        tokenElements[i].style.top = `calc(${baseTop}% + ${idx === 2 ? 1.5 : -1.5}%)`;
      } else {
        tokenElements[i].style.left = `calc(${baseLeft}% + ${idx % 2 === 0 ? -1.5 : 1.5}%)`;
        tokenElements[i].style.top = `calc(${baseTop}% + ${idx < 2 ? -1.5 : 1.5}%)`;
      }
    } else {
      tokenElements[i].style.transform = tokenElements[i].classList.contains('active') ? 'scale(1.15)' : 'scale(1)';
      tokenElements[i].style.left = `${baseLeft}%`;
      tokenElements[i].style.top = `${baseTop}%`;
    }
  }
}



function lightenHex(hex, amt) {
  let r = parseInt(hex.slice(1,3),16)+amt;
  let g = parseInt(hex.slice(3,5),16)+amt;
  let b = parseInt(hex.slice(5,7),16)+amt;
  return `rgb(${Math.min(r,255)},${Math.min(g,255)},${Math.min(b,255)})`;
}

// ── ROLL & MOVE ────────────────────────────────────────────
function rollDice() {
  if(rolled || gameOver) return;

  const dice = document.getElementById('ludo-dice');
  const rollBtn = document.getElementById('rollBtn');
  if(dice) dice.classList.add('rolling');
  if(rollBtn) rollBtn.disabled = true;

  if (typeof playRollSound === 'function') playRollSound();
  
  // Rapidly rotate 3D cube multiple times
  let extraX = (Math.floor(Math.random() * 4) + 4) * 360; 
  let extraY = (Math.floor(Math.random() * 4) + 4) * 360;
  let extraZ = (Math.floor(Math.random() * 2) + 1) * 360;

  const val = Math.floor(Math.random()*6) + 1;
  const baseRotations = {
    1: { x: 0, y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: 90, y: 0 },
    6: { x: 180, y: 0 }
  };
  const rot = baseRotations[val];
  const finalX = rot.x + extraX;
  const finalY = rot.y + extraY;
  const finalZ = extraZ;

  if (dice) {
    dice.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg) rotateZ(${finalZ}deg)`;
  }
  
  setTimeout(() => {
    dice.classList.remove('rolling');
    if(rollBtn) rollBtn.disabled = false;
    document.getElementById('diceVal').textContent = val;
    rolled = true;

    addLog(`${PNAMES[currentPlayer]} rolled a <b style="color:${PCOLORS[currentPlayer]}">${val}</b>`);

    setTimeout(() => applyMove(val), 500);
  }, 800);
}

function applyMove(val) {
  const pi = currentPlayer;
  let pos = positions[pi] + val;

  if(pos > 100) {
    pos = 100 - (pos - 100); // bounce back
    addLog(`${PNAMES[pi]} overshoots! Bounces to ${pos}`);
  } else {
    addLog(`${PNAMES[pi]} moves to <b>${pos}</b>`);
  }

  positions[pi] = pos;

  // Snake?
  if(SNAKES[pos] !== undefined) {
    const dest = SNAKES[pos];
    addLog(`🐍 Oops! ${PNAMES[pi]} slides down snake from ${pos} → ${dest}`);
    positions[pi] = dest;
  }
  // Ladder?
  else if(LADDERS[pos] !== undefined) {
    const dest = LADDERS[pos];
    addLog(`🪜 ${PNAMES[pi]} climbs ladder from ${pos} → ${dest}`);
    positions[pi] = dest;
  }

  if (typeof playMoveSound === 'function') playMoveSound();
  renderTokens();
  updatePlayerCards();

  if(positions[pi] === 100) {
    showWin(pi);
    return;
  }

  rolled = false;
  currentPlayer = (currentPlayer + 1) % numPlayers;
  updateStatus();
  updatePlayerCards();
}

// ── UI HELPERS ─────────────────────────────────────────────
function updatePlayerCards() {
  const c = document.getElementById('playerCards');
  c.innerHTML = '';
  const colorsShort = ['r', 'g', 'y', 'b'];
  for(let i = 0; i < numPlayers; i++) {
    const isActive = i === currentPlayer;
    const div = document.createElement('div');
    div.className = 'p-card' + (isActive ? ` active active-${colorsShort[i]}` : '');
    div.innerHTML = `<div class="p-dot" style="background:${PCOLORS[i]};box-shadow:0 0 8px ${PCOLORS[i]}"></div>
      <span class="p-name" style="color:${PCOLORS[i]}">${PNAMES[i]}</span>
      <span class="p-pos">Sq ${positions[i] || 0}</span>`;
    c.appendChild(div);
  }
}

function updateStatus(msg) {
  document.getElementById('statusMsg').textContent = msg || `${PNAMES[currentPlayer]}'s turn — Roll!`;
}

function addLog(msg) {
  const log = document.getElementById('gameLog');
  const div = document.createElement('div');
  div.className = 'log-item';
  div.innerHTML = msg;
  log.prepend(div);
  if(log.children.length > 40) log.lastChild.remove();
}

function showWin(pi) {
  gameOver = true;
  document.getElementById('winTitle').textContent = `${PNAMES[pi]} Wins!`;
  document.getElementById('winSub').textContent = `${PNAMES[pi]} reached square 100! Congratulations, Champion!`;
  document.getElementById('winOverlay').style.display = 'flex';
  if (typeof playWinSound === 'function') playWinSound();
}

// ── NAV ────────────────────────────────────────────────────
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40));
document.getElementById('ham').addEventListener('click', () => document.getElementById('navLinks').classList.toggle('open'));

// ── RESIZE ─────────────────────────────────────────────────
function resizeCanvas() {
  // Empty, no longer resizing canvas since we use CSS grid now!
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── TRANSITION COOLDOWN & INTERCEPTOR ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a:not([target="_blank"]):not([href^="#"])');
  links.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html')) {
        e.preventDefault();
        const main = document.querySelector('.game-page');
        if (main) {
          main.classList.add('page-out');
          setTimeout(() => {
            window.location.href = href;
          }, 300);
        } else {
          window.location.href = href;
        }
      }
    });
  });
});

// ── INIT ───────────────────────────────────────────────────
// We do not call initGame() here because the start screen is shown by default.
// The user must select the number of players to start.
