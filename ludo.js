"use strict";
/* ============================================================
   BOARDVERSE — LUDO.JS
   Full 4-player Ludo with classic rules & premium 3D dice
   ============================================================ */

// ── BOARD LAYOUT (15×15 grid) ──────────────────────────────
const PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],           // 0–4
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],     // 5–10
  [0,7],                                    // 11 (home col G)
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],     // 12–17
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],// 18–23
  [7,14],                                   // 24
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],// 25–30
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],// 31–36
  [14,7],                                   // 37
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],// 38–43
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],     // 44–49
  [7,0],                                    // 50
  [6,0]                                     // 51
];

const HOME_STRETCH = {
  r: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  g: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  y: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Swapped from b
  b: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]  // Swapped from y
};

const START_POS = { r: 0, g: 13, y: 25, b: 38 }; // Swapped y and b
const HOME_ENTRY = { r: 51, g: 12, y: 24, b: 37 }; // Swapped y and b

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

const COLORS = ['r', 'g', 'y', 'b']; // Swapped y and b
const COLOR_NAMES = { r: 'Red', g: 'Green', y: 'Yellow', b: 'Blue' }; // Swapped y and b
const COLOR_HEX = { r: '#FF4757', g: '#2ED573', y: '#FFD166', b: '#5DADE2' }; // Swapped y and b
const HOME_CELLS = {
  r: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5]],
  g: [[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[1,9],[1,10],[1,11],[1,12],[1,13],[1,14],[2,9],[2,10],[2,11],[2,12],[2,13],[2,14],[3,9],[3,10],[3,11],[3,12],[3,13],[3,14],[4,9],[4,10],[4,11],[4,12],[4,13],[4,14],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14]],
  y: [[9,9],[9,10],[9,11],[9,12],[9,13],[9,14],[10,9],[10,10],[10,11],[10,12],[10,13],[10,14],[11,9],[11,10],[11,11],[11,12],[11,13],[11,14],[12,9],[12,10],[12,11],[12,12],[12,13],[12,14],[13,9],[13,10],[13,11],[13,12],[13,13],[13,14],[14,9],[14,10],[14,11],[14,12],[14,13],[14,14]], // Swapped from b
  b: [[9,0],[9,1],[9,2],[9,3],[9,4],[9,5],[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],[11,0],[11,1],[11,2],[11,3],[11,4],[11,5],[12,0],[12,1],[12,2],[12,3],[12,4],[12,5],[13,0],[13,1],[13,2],[13,3],[13,4],[13,5],[14,0],[14,1],[14,2],[14,3],[14,4],[14,5]] // Swapped from y
};

// ── STATE ──────────────────────────────────────────────────
let numPlayers = 4;
let currentPlayer = 0;
let diceValue = 0;
let rolled = false;
let gameOver = false;
let tokens = {}; // {r:[{pos:-1,done:false}×4], g:..., y:..., b:...}

// ── CONFETTI ENGINE ────────────────────────────────────────
let confettiActive = false;
let confettiPieces = [];
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

function startConfetti() {
  const winOv = document.getElementById('winOverlay');
  if (!confettiCanvas || !confettiCtx || !winOv || winOv.style.display === 'none') return;
  
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiActive = true;
  confettiPieces = [];
  
  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * confettiCanvas.height,
      color: ['#FF4757', '#2ED573', '#FFD166', '#5DADE2', '#F0B429'][Math.floor(Math.random() * 5)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }
  requestAnimationFrame(updateConfetti);
}

function updateConfetti() {
  if (!confettiActive || !confettiCtx) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let remaining = false;
  confettiPieces.forEach(p => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.tiltAngle);
    p.tilt = Math.sin(p.tiltAngle - p.r/2) * 15;

    if (p.y <= confettiCanvas.height) {
      remaining = true;
    }

    confettiCtx.beginPath();
    confettiCtx.lineWidth = p.r;
    confettiCtx.strokeStyle = p.color;
    confettiCtx.moveTo(p.x + p.tilt + p.r/2, p.y);
    confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r/2);
    confettiCtx.stroke();
  });

  // Recycle falling pieces
  confettiPieces.forEach(p => {
    if (p.y > confettiCanvas.height) {
      p.x = Math.random() * confettiCanvas.width;
      p.y = -20;
      p.tilt = Math.random() * 10 - 5;
    }
  });

  if (remaining && confettiActive) {
    requestAnimationFrame(updateConfetti);
  }
}

function stopConfetti() {
  confettiActive = false;
  if (confettiCtx && confettiCanvas) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

window.addEventListener('resize', () => {
  if (confettiActive && confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

// ── PLAYERS SELECT OVERLAY CONTROLLER ──────────────────────
function selectPlayers(n) {
  numPlayers = n;
  document.getElementById('startOverlay').style.display = 'none';
  initGame();
}

function showStartScreen() {
  stopConfetti();
  document.getElementById('winOverlay').style.display = 'none';
  document.getElementById('startOverlay').style.display = 'flex';
}

// ── INITIALIZE GAME ────────────────────────────────────────
function initGame() {
  stopConfetti();
  document.getElementById('winOverlay').style.display = 'none';
  document.getElementById('startOverlay').style.display = 'none';
  gameOver = false;
  rolled = false;
  currentPlayer = 0;
  diceValue = 0;
  
  // Reset 3D dice to front face
  const dice = document.getElementById('ludo-dice');
  if (dice) {
    dice.style.transform = 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
  }
  document.getElementById('diceVal').textContent = '—';
  document.getElementById('gameLog').innerHTML = '';

  tokens = {};
  COLORS.forEach(c => {
    tokens[c] = [{pos:-1,done:false},{pos:-1,done:false},{pos:-1,done:false},{pos:-1,done:false}];
  });

  buildBoard();
  initTokens();
  renderBoard();
  updatePlayerCards();
  updateStatus();
}

function initTokens() {
  document.querySelectorAll('.ludo-token').forEach(t => t.remove());
  const board = document.getElementById('ludo-board');
  COLORS.forEach(col => {
    tokens[col].forEach((tok, ti) => {
      const div = document.createElement('div');
      div.className = `ludo-token ludo-token-${col}`;
      div.id = `token-${col}-${ti}`;
      div.textContent = col.toUpperCase() + (ti + 1);
      div.dataset.col = col;
      div.dataset.ti = ti;
      div.onclick = () => tokenClick(col, ti);
      // Accessibility
      div.setAttribute('role', 'button');
      div.tabIndex = 0;
      div.setAttribute('aria-label', `${COLOR_NAMES[col]} token ${ti + 1}`);
      div.onkeydown = (e) => { if(e.key==='Enter'||e.key===' ') tokenClick(col, ti); };
      
      div.style.position = 'absolute';
      div.style.width = '4.5%';
      div.style.height = '4.5%';
      div.style.margin = '0';
      board.appendChild(div);
      tok.element = div;
    });
  });
}

// ── BUILD GRID ─────────────────────────────────────────────
function buildBoard() {
  const board = document.getElementById('ludo-board');
  board.innerHTML = '';
  const grid = Array.from({length:15}, () => Array(15).fill('blank'));

  // Mark home zones
  HOME_CELLS.r.forEach(([r,c]) => grid[r][c] = 'home-r');
  HOME_CELLS.g.forEach(([r,c]) => grid[r][c] = 'home-g');
  HOME_CELLS.y.forEach(([r,c]) => grid[r][c] = 'home-y');
  HOME_CELLS.b.forEach(([r,c]) => grid[r][c] = 'home-b');

  // Mark path
  PATH.forEach(([r,c]) => { if(grid[r][c]==='blank') grid[r][c]='path'; });

  // Safe squares
  SAFE_SQUARES.forEach(i => { const [r,c]=PATH[i]; grid[r][c]='safe'; });

  // Home stretches
  HOME_STRETCH.r.forEach(([r,c]) => grid[r][c]='path-r');
  HOME_STRETCH.g.forEach(([r,c]) => grid[r][c]='path-g');
  HOME_STRETCH.y.forEach(([r,c]) => grid[r][c]='path-y');
  HOME_STRETCH.b.forEach(([r,c]) => grid[r][c]='path-b');

  // Center division
  grid[6][7] = 'center-g';
  grid[7][6] = 'center-r';
  grid[7][8] = 'center-y';
  grid[8][7] = 'center-b';
  grid[7][7] = 'center-mid';
  [[6,6],[6,8],[8,6],[8,8]].forEach(([r,c]) => grid[r][c]='center-corner');

  const isYardSlot = (r, c) => {
    return (r===1 && c===1) || (r===1 && c===4) || (r===4 && c===1) || (r===4 && c===4) ||
           (r===1 && c===10) || (r===1 && c===13) || (r===4 && c===10) || (r===4 && c===13) ||
           (r===10 && c===10) || (r===10 && c===13) || (r===13 && c===10) || (r===13 && c===13) ||
           (r===10 && c===1) || (r===10 && c===4) || (r===13 && c===1) || (r===13 && c===4);
  };

  for(let r=0;r<15;r++){
    for(let c=0;c<15;c++){
      const cell = document.createElement('div');
      let classes = ['ludo-cell', 'ludo-' + grid[r][c]];
      if(isYardSlot(r, c)) classes.push('ludo-yard-slot');
      cell.className = classes.join(' ');
      cell.id = `cell-${r}-${c}`;
      board.appendChild(cell);
    }
  }
}

// ── RENDER TOKENS ON BOARD ─────────────────────────────────
function renderBoard() {
  const cellTokens = {};

  COLORS.forEach((col, ci) => {
    if(ci >= numPlayers) {
      tokens[col].forEach(tok => { if(tok.element) tok.element.style.display = 'none'; });
      return;
    }
    tokens[col].forEach((tok, ti) => {
      if(!tok.element) return;
      tok.element.style.display = 'flex';
      let r, c;
      if(tok.done || tok.pos === 57) {
        [r, c] = [[6,6],[6,8],[8,6],[8,8]][ti];
      } else if(tok.pos === -1) {
        [r, c] = getHomeYardCell(col, ti);
      } else if(tok.pos >= 51) {
        [r, c] = HOME_STRETCH[col][tok.pos - 51];
      } else {
        const pathIdx = (START_POS[col] + tok.pos) % 52;
        [r, c] = PATH[pathIdx];
      }

      const cellId = `cell-${r}-${c}`;
      if(!cellTokens[cellId]) cellTokens[cellId] = [];
      cellTokens[cellId].push(tok.element);
      
      // Store base coordinates
      tok.targetR = r;
      tok.targetC = c;
    });
  });

  // Apply positions with stacking offsets
  Object.values(cellTokens).forEach(list => {
    const n = list.length;
    list.forEach((el, idx) => {
      const r = el._targetR || tokens[el.dataset.col][el.dataset.ti].targetR;
      const c = el._targetC || tokens[el.dataset.col][el.dataset.ti].targetC;
      
      let baseLeft = c * 6.666 + 1.08; // 6.666/2 - 4.5/2 = 1.08
      let baseTop = r * 6.666 + 1.08;
      
      const tokData = tokens[el.dataset.col][el.dataset.ti];
      let t = 'rotateX(-45deg) ';
      if (tokData.isHopping) t += 'translateY(-25px) ';
      
      if (n > 1) {
        el.style.transform = t + 'scale(0.55)';
        if (n === 2) {
          el.style.left = `calc(${baseLeft}% + ${idx === 0 ? -1 : 1}%)`;
          el.style.top = `calc(${baseTop}% + 0%)`;
        } else if (n === 3) {
          el.style.left = `calc(${baseLeft}% + ${idx === 0 ? -1 : (idx === 1 ? 1 : 0)}%)`;
          el.style.top = `calc(${baseTop}% + ${idx === 2 ? 1 : -1}%)`;
        } else {
          el.style.left = `calc(${baseLeft}% + ${idx % 2 === 0 ? -1 : 1}%)`;
          el.style.top = `calc(${baseTop}% + ${idx < 2 ? -1 : 1}%)`;
        }
      } else {
        el.style.transform = t + 'scale(1)';
        el.style.left = `${baseLeft}%`;
        el.style.top = `${baseTop}%`;
      }
    });
  });
}

function getHomeYardCell(col, idx) {
  const corners = { 
    r:[[1,1],[1,4],[4,1],[4,4]], 
    g:[[1,10],[1,13],[4,10],[4,13]], 
    y:[[10,10],[10,13],[13,10],[13,13]], // Swapped y and b
    b:[[10,1],[10,4],[13,1],[13,4]]       // Swapped y and b
  };
  return corners[col][idx];
}

// ── DICE ROLL (3D CUBE ANIMATION) ──────────────────────────
const baseRotations = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 180, y: 0 }
};

function rollDice() {
  if(rolled || gameOver) return;
  const dice = document.getElementById('ludo-dice');
  const rollBtn = document.getElementById('rollBtn');
  if(rollBtn) rollBtn.disabled = true;

  // Rapidly rotate 3D cube multiple times
  let extraX = (Math.floor(Math.random() * 4) + 4) * 360; 
  let extraY = (Math.floor(Math.random() * 4) + 4) * 360;
  let extraZ = (Math.floor(Math.random() * 2) + 1) * 360;

  diceValue = Math.floor(Math.random() * 6) + 1;
  
  if (typeof playRollSound === 'function') playRollSound();

  const rot = baseRotations[diceValue];
  const finalX = rot.x + extraX;
  const finalY = rot.y + extraY;
  const finalZ = extraZ;

  if (dice) {
    dice.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg) rotateZ(${finalZ}deg)`;
  }

  setTimeout(() => {
    if(rollBtn) rollBtn.disabled = false;
    document.getElementById('diceVal').textContent = diceValue;
    rolled = true;

    const col = COLORS[currentPlayer];
    addLog(`${COLOR_NAMES[col]} rolled a <b style="color:${COLOR_HEX[col]}">${diceValue}</b>`);

    const movable = getMovableTokens(col, diceValue);
    if(movable.length === 0) {
      addLog(`${COLOR_NAMES[col]} has no moves — skipping`);
      setTimeout(() => nextTurn(true), 1000);
    } else if(movable.length === 1) {
      setTimeout(() => moveToken(col, movable[0]), 600);
    } else {
      highlightTokens(col, movable);
      updateStatus(`${COLOR_NAMES[col]}: Pick a token to move`);
    }
  }, 800);
}

function getMovableTokens(col, roll) {
  const movable = [];
  tokens[col].forEach((tok, ti) => {
    if(tok.done || tok.pos === 57) return;
    if(tok.pos === -1) {
      if(roll === 6) movable.push(ti);
    } else {
      if(tok.pos + roll <= 57) movable.push(ti);
    }
  });
  return movable;
}

function highlightTokens(col, movable) {
  movable.forEach(ti => {
    document.querySelectorAll(`.ludo-token[data-col="${col}"][data-ti="${ti}"]`)
      .forEach(el => el.classList.add('ludo-selectable'));
  });
}

function clearHighlights() {
  document.querySelectorAll('.ludo-token.ludo-selectable').forEach(el => el.classList.remove('ludo-selectable'));
}

function tokenClick(col, ti) {
  if(!rolled || gameOver) return;
  const playerCol = COLORS[currentPlayer];
  if(col !== playerCol) return;

  const movable = getMovableTokens(col, diceValue);
  if(!movable.includes(ti)) return;

  clearHighlights();
  moveToken(col, ti);
}

// ── MOVE TOKEN ─────────────────────────────────────────────
async function moveToken(col, ti) {
  const tok = tokens[col][ti];
  let captured = false;

  if(tok.pos === -1 && diceValue === 6) {
    tok.pos = 0;
    addLog(`${COLOR_NAMES[col]} token ${ti+1} enters the board!`);
    renderBoard();
    if (typeof playMoveSound === 'function') playMoveSound();
  } else {
    const targetPos = tok.pos + diceValue;
    while(tok.pos < targetPos) {
      tok.pos++;
      tok.isHopping = true;
      renderBoard();
      if (typeof playMoveSound === 'function') playMoveSound();
      await new Promise(r => setTimeout(r, 150));
      
      tok.isHopping = false;
      renderBoard();
      await new Promise(r => setTimeout(r, 50));
    }
    
    if(tok.pos === 57) {
      tok.done = true;
      addLog(`🏁 ${COLOR_NAMES[col]} token ${ti+1} reached home!`);
    } else if(tok.pos >= 51) {
      addLog(`${COLOR_NAMES[col]} token ${ti+1} advances in home stretch`);
    } else {
      addLog(`${COLOR_NAMES[col]} token ${ti+1} moves to position ${tok.pos}`);
      captured = await checkCapture(col, ti);
    }
  }

  rolled = false;
  renderBoard();
  updatePlayerCards();

  if(checkWin(col)) {
    showWin(col);
    return;
  }

  const extraTurn = diceValue === 6 || captured;
  nextTurn(!extraTurn);
}

async function checkCapture(col, ti) {
  const tok = tokens[col][ti];
  if(tok.pos < 0 || tok.pos >= 51) return false;

  const pathIdx = (START_POS[col] + tok.pos) % 52;
  if(SAFE_SQUARES.includes(pathIdx)) return false;

  let captures = [];
  COLORS.forEach((c, ci) => {
    if(c === col || ci >= numPlayers) return;
    tokens[c].forEach((t, ti2) => {
      if(t.done || t.pos === -1 || t.pos >= 51) return;
      const theirIdx = (START_POS[c] + t.pos) % 52;
      if(theirIdx === pathIdx) {
        t.element.classList.add('token-capture');
        addLog(`💥 ${COLOR_NAMES[col]} captures ${COLOR_NAMES[c]} token ${ti2+1}!`);
        captures.push(new Promise(resolve => {
          setTimeout(() => {
            t.element.classList.remove('token-capture');
            t.pos = -1;
            renderBoard();
            resolve();
          }, 450);
        }));
      }
    });
  });
  
  if(captures.length > 0) {
    await Promise.all(captures);
    return true;
  }
  return false;
}

function checkWin(col) {
  return tokens[col].every(t => t.done);
}

function nextTurn(advance) {
  if(advance) {
    let nextP = currentPlayer;
    do {
      nextP = (nextP + 1) % numPlayers;
    } while(tokens[COLORS[nextP]].every(t => t.done) && nextP !== currentPlayer);
    currentPlayer = nextP;
  }
  rolled = false;
  updateStatus();
  updatePlayerCards();
}

// ── UI HELPERS ─────────────────────────────────────────────
function updatePlayerCards() {
  const container = document.getElementById('playerCards');
  container.innerHTML = '';
  COLORS.forEach((col, i) => {
    if(i >= numPlayers) return;
    const done = tokens[col].filter(t => t.done).length;
    const isActive = i === currentPlayer;
    const div = document.createElement('div');
    div.className = 'p-card' + (isActive ? ` active active-${col}` : '');
    div.innerHTML = `<div class="p-dot" style="background:${COLOR_HEX[col]};box-shadow:0 0 8px ${COLOR_HEX[col]}"></div>
      <span class="p-name" style="color:${COLOR_HEX[col]}">${COLOR_NAMES[col]}</span>
      <span class="p-pos">${done}/4 home</span>`;
    container.appendChild(div);
  });
}

function updateStatus(msg) {
  const col = COLORS[currentPlayer];
  document.getElementById('statusMsg').textContent = msg || `${COLOR_NAMES[col]}'s turn — Roll!`;
  
  document.querySelectorAll('.ludo-yard-slot').forEach(el => el.classList.remove('ludo-home-active'));
  document.querySelectorAll(`.ludo-yard-slot.ludo-home-${col}`).forEach(el => el.classList.add('ludo-home-active'));
}

function addLog(msg) {
  const log = document.getElementById('gameLog');
  const div = document.createElement('div');
  div.className = 'log-item';
  div.innerHTML = msg;
  log.prepend(div);
  // Show last 5 moves exactly
  if(log.children.length > 5) log.lastChild.remove();
}

function showWin(col) {
  gameOver = true;
  document.getElementById('winTitle').textContent = `${COLOR_NAMES[col]} Wins!`;
  document.getElementById('winSub').textContent = `${COLOR_NAMES[col]} brought all tokens home. Champion!`;
  document.getElementById('winOverlay').style.display = 'flex';
  
  if (typeof playWinSound === 'function') playWinSound();
  // Fire confetti animation!
  startConfetti();
}

// ── NAV ────────────────────────────────────────────────────
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40));
document.getElementById('ham').addEventListener('click', () => document.getElementById('navLinks').classList.toggle('open'));

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
