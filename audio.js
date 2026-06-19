"use strict";

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = false;

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  document.querySelectorAll('.sound-toggle').forEach(btn => {
    btn.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    btn.setAttribute('aria-pressed', soundEnabled);
  });
}

function playTone(freq, type, duration, vol=0.1) {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playRollSound() {
  playTone(400, 'square', 0.1, 0.05);
  setTimeout(() => playTone(600, 'square', 0.15, 0.05), 100);
}

function playMoveSound() {
  playTone(800, 'sine', 0.1, 0.05);
}

function playWinSound() {
  if (!soundEnabled) return;
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    setTimeout(() => playTone(f, 'square', 0.3, 0.1), i * 150);
  });
}
