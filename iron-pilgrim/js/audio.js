'use strict';
/* All sound is synthesized: diesel drone, rail joints, radio static, Morse, records. */
(function () {
const A = { ctx: null, master: null, amb: null, muted: false, mode: 'silent', nodes: {}, clackT: null, radio: null, speed: 1 };
try { A.muted = localStorage.getItem('ip.mute') === '1'; } catch (e) {}

function ctx() { return A.ctx; }
function now() { return A.ctx.currentTime; }
let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  const n = A.ctx.sampleRate * 2; noiseBuf = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function noise(dur, { freq = 0, q = 1, type = 'bandpass', vol = 0.2, at = 0, dest } = {}) {
  if (!A.ctx) return;
  const s = A.ctx.createBufferSource(); s.buffer = noiseBuffer();
  const g = A.ctx.createGain(); const t = now() + at;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = s;
  if (freq) { const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); node = f; }
  node.connect(g); g.connect(dest || A.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function tone(freq, dur, { type = 'sine', vol = 0.1, at = 0, slide = 0, attack = 0.005, dest } = {}) {
  if (!A.ctx) return;
  const o = A.ctx.createOscillator(); const g = A.ctx.createGain(); const t = now() + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || A.master); o.start(t); o.stop(t + dur + 0.05);
  return o;
}

function init() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try {
    A.ctx = new (window.AudioContext || window.webkitAudioContext)();
    A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 0.9; A.master.connect(A.ctx.destination);
    A.amb = A.ctx.createGain(); A.amb.gain.value = 0; A.amb.connect(A.master);
    // diesel drone
    const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 4;
    const dg = A.ctx.createGain(); dg.gain.value = 0.11;
    [41, 41.6, 82.3].forEach((f, i) => { const o = A.ctx.createOscillator(); o.type = i === 2 ? 'square' : 'sawtooth'; o.frequency.value = f; const g = A.ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 1; o.connect(g); g.connect(lp); o.start(); });
    const lfo = A.ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = A.ctx.createGain(); lg.gain.value = 50; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    lp.connect(dg); dg.connect(A.amb);
    A.nodes.drone = dg; A.nodes.lfo = lfo;
    // night pad
    const pad = A.ctx.createGain(); pad.gain.value = 0; pad.connect(A.amb);
    [110, 155.56, 164.81, 233.08].forEach(f => { const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = A.ctx.createGain(); g.gain.value = 0.025; o.connect(g); g.connect(pad); o.start(); });
    A.nodes.pad = pad;
    clackLoop();
  } catch (e) { A.ctx = null; }
}
function clackLoop() {
  let beat = 0;
  const tick = () => {
    if (A.ctx && A.mode !== 'silent' && A.mode !== 'station' && !A.radio) {
      const pat = [1, 0, 1, 0, 0, 0, 0, 0];
      if (pat[beat % 8]) {
        noise(0.06, { freq: 2400, q: 2, vol: 0.18, dest: A.amb });
        tone(85, 0.09, { type: 'sine', vol: 0.12, dest: A.amb });
      }
      beat++;
    }
    A.clackT = setTimeout(tick, 115 / A.speed);
  };
  tick();
}
function ambient(mode) {
  A.mode = mode;
  if (!A.ctx) return;
  const t = now();
  A.amb.gain.cancelScheduledValues(t);
  A.amb.gain.setTargetAtTime(mode === 'silent' ? 0 : mode === 'station' ? 0.35 : 0.8, t, 0.6);
  A.nodes.pad.gain.setTargetAtTime(mode === 'night' || mode === 'combat' ? 1 : 0, t, 1.2);
  A.nodes.drone.gain.setTargetAtTime(mode === 'station' ? 0.05 : 0.11, t, 0.8);
  A.nodes.lfo.frequency.setTargetAtTime(mode === 'station' ? 2.5 : 5.2, t, 1);
  A.speed = mode === 'station' ? 0.5 : 1;
}
let hb = null;
function combat(on) {
  clearInterval(hb); hb = null;
  if (on) { ambient('combat'); hb = setInterval(() => { tone(55, 0.16, { vol: 0.25 }); tone(50, 0.18, { vol: 0.2, at: 0.22 }); }, 1100); }
  else ambient(A.prevMode || 'travel');
}

const SFX = {
  click: () => tone(900, 0.03, { type: 'square', vol: 0.03 }),
  hit: () => { noise(0.09, { freq: 600, vol: 0.3 }); tone(110, 0.12, { type: 'sawtooth', vol: 0.06, slide: -50 }); },
  shot: () => { noise(0.18, { freq: 1500, q: 0.6, vol: 0.5 }); noise(0.5, { freq: 300, vol: 0.12, at: 0.05 }); },
  death: () => { tone(330, 0.9, { type: 'sawtooth', vol: 0.05, slide: -280 }); noise(0.6, { freq: 200, vol: 0.15 }); },
  kill: () => { tone(220, 0.25, { type: 'square', vol: 0.04, slide: -150 }); noise(0.15, { freq: 900, vol: 0.12 }); },
  thud: () => { tone(60, 0.3, { vol: 0.35 }); noise(0.2, { freq: 150, vol: 0.2 }); },
  whisper: () => { for (let i = 0; i < 3; i++) noise(0.7, { freq: 1200 + i * 700, q: 8, vol: 0.12, at: i * 0.12 }); },
  tear: () => { for (let i = 0; i < 5; i++) noise(0.08, { freq: 3000 - i * 400, q: 3, vol: 0.2, at: i * 0.06 }); },
  crush: () => { tone(45, 0.9, { vol: 0.5, slide: -20 }); noise(0.8, { freq: 120, vol: 0.4 }); },
  throttle: () => { tone(60, 1.2, { type: 'sawtooth', vol: 0.12, slide: 120 }); noise(1, { freq: 400, vol: 0.1 }); },
  jam: () => noise(0.6, { freq: 2500, q: 0.3, vol: 0.25 }),
  cello: () => { const o = tone(65.4, 2.4, { type: 'sawtooth', vol: 0.18, attack: 0.25 }); if (o) { const v = A.ctx.createOscillator(); v.frequency.value = 5; const vg = A.ctx.createGain(); vg.gain.value = 1.5; v.connect(vg); vg.connect(o.frequency); v.start(); v.stop(now() + 2.5); } tone(98, 2.2, { type: 'triangle', vol: 0.06, attack: 0.3 }); },
  lamp: () => { tone(880, 0.5, { vol: 0.08, slide: 900 }); noise(0.3, { freq: 5000, vol: 0.08 }); },
  rite: () => { tone(146.8, 1.4, { type: 'sawtooth', vol: 0.06, attack: 1.0 }); tone(207.6, 1.4, { type: 'sawtooth', vol: 0.05, attack: 1.0 }); },
  bell: () => { tone(1320, 1.2, { vol: 0.1 }); tone(1980, 0.8, { vol: 0.04 }); },
  boom: () => { noise(1.6, { freq: 90, type: 'lowpass', vol: 0.8 }); tone(40, 1.2, { vol: 0.5, slide: -15 }); },
  whistle: () => { [311, 370, 466].forEach(f => tone(f, 1.6, { type: 'sawtooth', vol: 0.05, attack: 0.08 })); },
  page: () => noise(0.18, { freq: 3500, q: 0.4, vol: 0.08 }),
  type: () => { tone(1700 + Math.random() * 300, 0.015, { type: 'square', vol: 0.02 }); noise(0.02, { freq: 4000, vol: 0.05 }); },
  coin: () => { tone(1800, 0.12, { type: 'triangle', vol: 0.08 }); tone(2400, 0.1, { type: 'triangle', vol: 0.06, at: 0.06 }); }
};

/* ---- radio ---- */
function radioOn() {
  if (!A.ctx || A.radio) return;
  const s = A.ctx.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true;
  const bp = A.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5;
  const g = A.ctx.createGain(); g.gain.value = 0.12;
  s.connect(bp); bp.connect(g); g.connect(A.master); s.start();
  const sig = A.ctx.createGain(); sig.gain.value = 0; sig.connect(A.master);
  A.radio = { s, g, bp, sig, timer: null, seq: 0 };
}
function radioOff() {
  if (!A.radio) return;
  try { A.radio.s.stop(); } catch (e) {}
  A.radio.g.disconnect(); A.radio.sig.disconnect(); clearTimeout(A.radio.timer);
  A.radio = null; stopSpeech();
}
function radioTune(strength) {
  if (!A.radio) return;
  const t = now();
  A.radio.g.gain.setTargetAtTime(0.03 + (1 - strength) * 0.16, t, 0.05);
  A.radio.bp.frequency.setTargetAtTime(900 + strength * 1600, t, 0.05);
  A.radio.sig.gain.setTargetAtTime(strength * strength, t, 0.05);
}
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
function morse(text, onDone) {
  if (!A.radio) return 0;
  const u = 0.075; let t = 0.2; const seq = ++A.radio.seq;
  text.toUpperCase().split('').forEach(ch => {
    if (ch === ' ') { t += u * 7; return; }
    const m = MORSE[ch]; if (!m) return;
    m.split('').forEach(sym => { const d = sym === '.' ? u : u * 3; tone(640, d, { vol: 0.12, at: t, attack: 0.004, dest: A.radio.sig }); t += d + u; });
    t += u * 2;
  });
  A.radio.timer = setTimeout(() => { if (A.radio && A.radio.seq === seq && onDone) onDone(); }, t * 1000 + 1500);
  return t;
}
function encodeMorse(text) { return text.toUpperCase().split('').map(c => c === ' ' ? '/' : (MORSE[c] || '')).join(' '); }

/* ---- speech ---- */
let speaking = false;
function stopSpeech() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} speaking = false; }
function speak(text, { pitch = 0.6, rate = 0.82, onEnd } = {}) {
  if (A.muted) { if (onEnd) setTimeout(onEnd, 400); return false; }
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { if (onEnd) setTimeout(onEnd, 400); return false; }
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = pitch; u.rate = rate; u.volume = 0.8;
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find(x => /en[-_](GB|US)/i.test(x.lang) && /male|daniel|fred|george|alex/i.test(x.name)) || vs.find(x => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = () => { speaking = false; if (onEnd) onEnd(); };
    u.onerror = () => { speaking = false; if (onEnd) onEnd(); };
    speaking = true; window.speechSynthesis.speak(u);
    return true;
  } catch (e) { if (onEnd) setTimeout(onEnd, 400); return false; }
}

/* ---- gramophone ---- */
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function nf(n) { const m = n.match(/^([A-G]#?)(\d)$/); if (!m) return 0; return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); }
let recT = null;
function playRecord(rec, onDone) {
  if (!A.ctx) { if (onDone) onDone(); return; }
  stopRecord();
  const notes = rec.notes.split(' ');
  const dur = rec.tempo;
  const total = notes.length * dur;
  // crackle bed
  for (let i = 0; i < total * 8; i++) if (Math.random() < 0.6) noise(0.01, { freq: 6000, vol: 0.05 + Math.random() * 0.05, at: Math.random() * total });
  noise(total, { freq: 800, q: 0.3, vol: 0.015 });
  notes.forEach((n, i) => {
    if (n === '.') return;
    const f = nf(n);
    if (rec.reverse) tone(f, dur * 1.8, { type: rec.wave, vol: 0.06, at: i * dur, attack: dur * 1.6 });
    else { tone(f, dur * 1.6, { type: rec.wave, vol: 0.07, at: i * dur }); tone(f / 2, dur * 1.2, { type: 'sine', vol: 0.03, at: i * dur }); }
  });
  if (rec.reverse) noise(total, { freq: 1500, q: 9, vol: 0.05, at: 0 });
  recT = setTimeout(() => { recT = null; if (onDone) onDone(); }, total * 1000 + 600);
}
function stopRecord() { clearTimeout(recT); recT = null; }

function setMuted(m) {
  A.muted = m; try { localStorage.setItem('ip.mute', m ? '1' : '0'); } catch (e) {}
  if (A.master) A.master.gain.value = m ? 0 : 0.9;
  if (m) stopSpeech();
}

IP.audio = {
  init, ambient: m => { if (m !== 'combat') A.prevMode = m; ambient(m); }, combat,
  sfx: n => { if (A.ctx && SFX[n]) try { SFX[n](); } catch (e) {} },
  radioOn, radioOff, radioTune, morse, encodeMorse, speak, stopSpeech, playRecord, stopRecord,
  muted: () => A.muted, setMuted, ready: () => !!A.ctx
};
})();
