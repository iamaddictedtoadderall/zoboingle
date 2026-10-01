'use strict';
/* Iron Pilgrim: state, saving, screens. */
(function () {
/* ---------------- utils ---------------- */
IP.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
IP.pick = a => a[Math.floor(Math.random() * a.length)];
IP.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
IP.chance = p => Math.random() < p;
const $ = s => document.querySelector(s);
const STAGE = () => $('#stage');
IP.stage = STAGE;
const para = t => IP.esc(t).split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

/* ---------------- state ---------------- */
let META = null, RUN = null;
let realName = '';
function newMeta() { return { v: 1, knots: 0, flags: {}, endings: {}, docs: {}, name: '', slate: '', seenIntro: false }; }
IP.run = () => RUN;
IP.meta = () => META;
IP.knows = f => !!(META && META.flags[f]);
IP.learn = f => { if (META && !META.flags[f]) { META.flags[f] = Date.now(); } };
IP.N = () => (META && META.name) || 'Conductor';
IP.knot = () => (META ? META.knots + 1 : 1);
IP.alive = id => !!(RUN && RUN.crew[id] && RUN.crew[id].alive);
IP.crewInCombat = () => IP.CREW_ORDER.filter(id => IP.alive(id) && RUN.crew[id].crew);
IP.slateText = () => {
  const k = META.knots;
  let s = k >= 4 && IP.knows('spur_known') ? IP.SLATES[4] : IP.SLATES[Math.min(3, k)];
  if (k >= 5 && IP.knows('lp_077') && !IP.knows('fork_found')) s = 'AT THE WINDOW SAY: LOW WATER.';
  META.slate = s; return s;
};
IP.fill = s => String(s).replace(/\{N\}/g, IP.esc(IP.N())).replace(/\{K\}/g, IP.knot()).replace(/\{SLATE\}/g, IP.esc(META.slate || IP.SLATES[0])).replace(/\{TALLY\}/g, tally(IP.knot()));
function tally(n) { let s = ''; for (let i = 0; i < n; i++) s += (i % 5 === 4) ? '∕ ' : '|'; return s + ' (' + n + ')'; }

function newRun() {
  const crew = {};
  IP.CREW_ORDER.forEach(id => { const c = IP.CREW[id]; crew[id] = { hp: c.hp, nerve: c.nerve, alive: true, trust: 0, crew: id !== 'constance' }; });
  const map = IP.genMap(1);
  RUN = {
    leg: 1, map, node: map.start, path: [map.start], moves: 0, quiet: -1.5, night: false,
    res: { fuel: 11, hull: 20, hullMax: 20, prov: 12, ward: 5, lore: 0, scrip: 30, pass: 9 },
    att: 0, cars: ['loco', 'tender', 'zero', 'radio', 'lamp', 'coach'], crew,
    items: { bandage: 1, flare: 1 }, flags: {}, seen: {}, screen: 'map', stationVisit: null, deaths: []
  };
  map.nodes[map.start].done = true;
  ['hire', 'timetable', 'pamphlet', 'handbook'].forEach(d => META.docs[d] = META.docs[d] || 1);
}

/* resources */
IP.res = (k, d) => {
  if (!RUN) return;
  if (k === 'att') { RUN.att = Math.max(0, Math.min(12, RUN.att + d)); return; }
  const r = RUN.res; r[k] = Math.max(0, r[k] + d);
  if (k === 'hull') r.hull = Math.min(r.hullMax, r.hull);
};
const RES_LABEL = { fuel: 'Fuel', hull: 'Hull', prov: 'Provisions', ward: 'Ward oil', lore: 'Lore', scrip: 'Scrip', pass: 'Passengers', att: 'Watched', quiet: 'The Quiet' };
const sgn = n => (n > 0 ? '+' : '−') + Math.abs(n);
IP.fx = (fx) => {
  const out = [];
  if (!fx) return out;
  ['fuel', 'hull', 'prov', 'ward', 'lore', 'scrip', 'pass', 'att'].forEach(k => { if (fx[k]) { IP.res(k, fx[k]); out.push(RES_LABEL[k] + ' ' + sgn(fx[k])); } });
  if (fx.quiet) { RUN.quiet += fx.quiet; out.push(fx.quiet > 0 ? 'The Quiet gains ground' : 'You gain ground on the Quiet'); }
  const each = (obj, fn) => Object.keys(obj || {}).forEach(id => { if (IP.alive(id)) fn(id, obj[id]); });
  const cap = (id, k) => k === 'hp' ? IP.CREW[id].hp : IP.CREW[id].nerve;
  const adj = (id, k, d) => { const c = RUN.crew[id]; if (k === 'nerve' && IP.CREW[id].steady) return; c[k] = Math.max(k === 'hp' ? 1 : 0, Math.min(cap(id, k), c[k] + d)); };
  if (fx.nerveAll) { IP.CREW_ORDER.forEach(id => { if (IP.alive(id)) adj(id, 'nerve', fx.nerveAll); }); out.push('Crew nerve ' + sgn(fx.nerveAll)); }
  if (fx.hpAll) { IP.CREW_ORDER.forEach(id => { if (IP.alive(id)) adj(id, 'hp', fx.hpAll); }); out.push('Crew health ' + sgn(fx.hpAll)); }
  each(fx.nerve, (id, d) => { adj(id, 'nerve', d); out.push(IP.CREW[id].short + ' nerve ' + sgn(d)); });
  each(fx.hp, (id, d) => { adj(id, 'hp', d); out.push(IP.CREW[id].short + ' health ' + sgn(d)); });
  each(fx.trust, (id, d) => { RUN.crew[id].trust = Math.max(-3, Math.min(5, RUN.crew[id].trust + d)); out.push(IP.CREW[id].short + (d > 0 ? ' trusts you more' : ' trusts you less')); });
  Object.keys(fx.item || {}).forEach(k => { RUN.items[k] = (RUN.items[k] || 0) + fx.item[k]; out.push((fx.item[k] > 0 ? 'Gained: ' : 'Lost: ') + IP.ITEMS[k].name); });
  [].concat(fx.doc || []).forEach(d => { if (!META.docs[d]) out.push('New document: ' + IP.DOCS[d].title); META.docs[d] = 1; });
  [].concat(fx.learn || []).forEach(f => IP.learn(f));
  [].concat(fx.flag || []).forEach(f => RUN.flags[f] = true);
  return out;
};
IP.onCrewDeath = id => { RUN.deaths.push(id); };

/* ---------------- persistence ---------------- */
const store = { db: null, uid: null, chain: Promise.resolve(), t: null };
const LKEY = 'ironpilgrim.v1';
async function initStore() {
  try {
    for (let i = 0; i < 15 && !(window.claude && window.claude.use); i++) await new Promise(r => setTimeout(r, 100));
    if (!window.claude || !window.claude.use) return;
    const user = await window.claude.use('user');
    const db = await window.claude.use('db');
    if (user) { try { const me = await user.me(); realName = me.name || ''; if (db && me.id) { store.db = db; store.uid = me.id; } } catch (e) {} }
  } catch (e) {}
}
async function load() {
  let data = null;
  if (store.db) {
    try { const s = await store.db.doc('data/users/' + store.uid + '/save').get(); if (s.exists) data = s.data(); } catch (e) {}
  }
  if (!data) { try { data = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) {} }
  META = (data && data.meta) ? JSON.parse(JSON.stringify(data.meta)) : newMeta();
  RUN = (data && data.run) ? JSON.parse(JSON.stringify(data.run)) : null;
}
IP.save = function () {
  clearTimeout(store.t);
  store.t = setTimeout(() => {
    const body = { meta: META, run: RUN, at: Date.now() };
    try { localStorage.setItem(LKEY, JSON.stringify(body)); } catch (e) {}
    if (store.db) {
      const json = JSON.parse(JSON.stringify(body));
      store.chain = store.chain.then(() => store.db.doc('data/users/' + store.uid + '/save').set(json)).catch(() => {});
    }
  }, 300);
};

/* ---------------- HUD ---------------- */
function gauge(k, v, max, warn) {
  const pct = Math.max(0, Math.min(1, v / max));
  const a = -120 + pct * 240;
  return `<div class="g ${warn ? 'warn' : ''}" title="${RES_LABEL[k]}"><svg viewBox="0 0 44 30" aria-hidden="true"><path d="M5 26 A17 17 0 1 1 39 26" class="g-arc"/><line x1="22" y1="24" x2="22" y2="9" class="g-needle" transform="rotate(${a} 22 24)"/><circle cx="22" cy="24" r="2.4" class="g-hub"/></svg><span class="g-v">${v}</span><span class="g-k">${RES_LABEL[k]}</span></div>`;
}
IP.hud = function () {
  const h = $('#hud');
  if (!RUN || ['title', 'intro'].includes(RUN.screen) || !META) { h.hidden = true; return; }
  h.hidden = false;
  const r = RUN.res;
  const day = Math.floor(RUN.moves / 2);
  const date = new Date(1931, 10, 9 + day);
  const ds = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  h.innerHTML = `<div class="hud-l"><span class="leg">${IP.esc(IP.LEGS[RUN.leg].name)}</span><span class="date">${ds}, 1931 · ${RUN.night ? 'night' : 'day'}</span><span class="knot" title="Knots in the bell-cord">knot ${IP.knot()}</span></div>
  <div class="gauges">${gauge('fuel', r.fuel, 16, r.fuel <= 2)}${gauge('hull', r.hull, r.hullMax, r.hull <= 6)}${gauge('prov', r.prov, 20, r.prov <= 3)}${gauge('ward', r.ward, 10, r.ward === 0)}
  <div class="g num"><span class="g-v">${r.lore}</span><span class="g-k">Lore</span></div><div class="g num"><span class="g-v">${r.scrip}</span><span class="g-k">Scrip</span></div><div class="g num"><span class="g-v">${r.pass}</span><span class="g-k">Passengers</span></div>
  <div class="g eye ${RUN.att >= 8 ? 'warn' : ''}" title="How closely you are being watched"><span class="g-v">${'●'.repeat(Math.min(RUN.att, 12)) || '·'}</span><span class="g-k">Watched</span></div></div>`;
};

/* ---------------- dock & sheets ---------------- */
function dock(on) {
  const d = $('#dock'); d.hidden = !on;
}
function openSheet(kind) {
  IP.audio.sfx('page');
  const sh = $('#sheet'); sh.hidden = false; sh.dataset.kind = kind;
  document.querySelectorAll('#dock button').forEach(b => b.classList.toggle('on', b.dataset.sheet === kind));
  ({ train: sheetTrain, crew: sheetCrew, radio: sheetRadio, archive: sheetArchive })[kind]();
  sh.querySelector('.sheet-body').scrollTop = 0;
}
function closeSheet() {
  const sh = $('#sheet'); if (sh.hidden) return;
  if (sh.dataset.kind === 'radio') { IP.audio.radioOff(); IP.audio.stopRecord(); }
  sh.hidden = true; document.querySelectorAll('#dock button').forEach(b => b.classList.remove('on'));
}
function sheetFrame(title, body) {
  $('#sheet').innerHTML = `<div class="sheet-in"><div class="sheet-head"><h2>${title}</h2><button class="btn ghost" id="sheetClose">Close</button></div><div class="sheet-body">${body}</div></div>`;
  $('#sheetClose').addEventListener('click', closeSheet);
}

/* ---------- train ---------- */
function sheetTrain() {
  let h = `<div class="trainline" role="list">`;
  RUN.cars.forEach((k, i) => { h += `<div class="tcar t-${k}" role="listitem"><span>${IP.CARS[k].short}</span></div>${i < RUN.cars.length - 1 ? '<i class="coupler"></i>' : ''}`; });
  h += `</div><div class="cardlist">`;
  RUN.cars.forEach(k => { h += `<div class="cline"><b>${IP.CARS[k].name}</b><span>${IP.CARS[k].desc}</span></div>`; });
  h += `</div><h3>Stores</h3><div class="cardlist">`;
  const items = Object.keys(RUN.items).filter(k => RUN.items[k] > 0);
  if (!items.length) h += `<div class="cline muted">Nothing in the stores cupboard.</div>`;
  items.forEach(k => { h += `<div class="cline"><b>${IP.ITEMS[k].name}${RUN.items[k] > 1 ? ' ×' + RUN.items[k] : ''}</b><span>${IP.ITEMS[k].desc}</span></div>`; });
  h += `</div><button class="btn" id="manifestBtn">Read the passenger manifest</button><div id="manifest"></div>`;
  sheetFrame('The Train', h);
  $('#manifestBtn').addEventListener('click', () => {
    IP.audio.sfx('page');
    const names = IP.PASSENGERS.slice(0, Math.max(0, RUN.res.pass - 1));
    let m = `<div class="paper manifest"><div class="ph">HALVORSEN TRANSCONTINENTAL · MANIFEST · ENGINE No. 9</div><ol>`;
    m += `<li><span>Coach</span><span>${IP.knows('constance_name') ? 'Miss Constance Halvorsen (travelling as Mrs. C. Reed)' : 'Mrs. C. Reed, widow'}${IP.alive('constance') ? '' : ' <s>deceased</s>'}</span></li>`;
    names.forEach(n => m += `<li><span>Coach</span><span>${IP.esc(n)}</span></li>`);
    m += `</ol><div class="ph">CONSIGNMENTS</div><ol><li><span>Car 0</span><span>One (1) sealed car. Contents: Company property. DO NOT OPEN.</span></li>`;
    m += `<li class="ghost-line"><span>Car 0, berth 1</span><span>${realName ? IP.esc(realName) : '<span class="blot">██████ █████</span>'} &mdash; destination: &mdash;</span></li></ol></div>`;
    $('#manifest').innerHTML = m;
  });
}

/* ---------- crew ---------- */
const KNOW = {
  odile: [['odile_tally', 'Keeps a tally of runs scratched inside the firebox door.'], ['odile_son', 'Lost her son, a fireman, in the Hush. Hears him on the radio at night.'], ['luca_false', 'The voice on 1290 is not her son.']],
  tull: [['tull_cufflink', 'Wears the parallel mark on his cufflinks.'], ['tull_telegram', 'Reports to someone called G.S. in Sallow Haven.']],
  wren: [['wren_numbers', 'Hears numbers in her bad ear, always the same ones.'], ['spur_known', 'The numbers spell SPUR NINE, LEFT AT THE PILLARS.']],
  vane: [['vane_orders', 'Carries sealed orders: Mrs. Reed is not to cross Hinge Bridge.']],
  jonah: [['jonah_watch', 'His pocket watch is engraved with your name.']],
  constance: [['constance_photo', 'A 1911 photograph shows the Halvorsen family and a girl called Connie.'], ['constance_name', 'She is Constance Halvorsen. Her father rides in Car Zero.']]
};
function trustWord(t) { return t <= -2 ? 'cold' : t < 0 ? 'wary' : t === 0 ? 'guarded' : t < 2 ? 'warming' : t < 4 ? 'trusting' : 'loyal'; }
function sheetCrew() {
  let h = `<div class="crewgrid">`;
  IP.CREW_ORDER.forEach(id => {
    const c = IP.CREW[id], s = RUN.crew[id];
    const nm = id === 'constance' && IP.knows('constance_name') ? 'Constance Halvorsen' : c.name;
    const known = KNOW[id].filter(([f]) => IP.knows(f)).map(([, t]) => `<li>${t}</li>`).join('');
    h += `<article class="ccard ${s.alive ? '' : 'dead'}">
      <canvas class="portrait" width="120" height="150" data-id="${id}" aria-label="Photograph of ${IP.esc(nm)}"></canvas>
      <div class="cc-body"><h3>${IP.esc(nm)}</h3><div class="muted">${c.role}${s.crew ? '' : ' · not crew'}${s.alive ? '' : ' · lost'}</div>
      ${s.alive ? `<div class="bars"><span>Health ${s.hp}/${c.hp}</span>${c.steady ? '<span>Nerve: steady</span>' : `<span>Nerve ${s.nerve}/${c.nerve}</span>`}<span>${trustWord(s.trust)}</span></div>` : ''}
      <p>${c.bio}</p><p class="ab"><b>${c.ability.name}.</b> ${c.ability.desc}</p>
      ${known ? `<div class="known"><span class="label">What you know</span><ul>${known}</ul></div>` : ''}</div></article>`;
  });
  h += `</div>`;
  sheetFrame('The Crew', h);
  document.querySelectorAll('canvas.portrait').forEach(cv => drawPortrait(cv, cv.dataset.id, !RUN.crew[cv.dataset.id].alive));
}
function drawPortrait(cv, id, dead) {
  const g = cv.getContext('2d'); const W = cv.width, H = cv.height; const look = IP.CREW[id].look;
  let seed = 0; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const bg = g.createRadialGradient(W * 0.5, H * 0.38, 10, W * 0.5, H * 0.5, W * 0.9);
  bg.addColorStop(0, '#cbb48a'); bg.addColorStop(0.6, '#8f7652'); bg.addColorStop(1, '#3b2e1d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(40,28,16,0.9)';
  const b = look.build; const cx = W / 2;
  g.beginPath(); g.ellipse(cx, H + 18, 52 * b, 62, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - 8 * b, H * 0.5, 16 * b, 24);
  g.beginPath(); g.ellipse(cx, H * 0.42, 19 * b, 24 * b, 0, 0, Math.PI * 2); g.fill();
  if (look.hair === 'bob') { g.fillRect(cx - 22, H * 0.3, 44, 26); }
  if (look.hair === 'long') { g.beginPath(); g.ellipse(cx, H * 0.5, 24, 34, 0, 0, Math.PI * 2); g.fill(); }
  if (look.hat === 'cap') { g.beginPath(); g.ellipse(cx, H * 0.29, 22, 10, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 4, H * 0.29, 30, 4); }
  if (look.hat === 'bowler') { g.beginPath(); g.ellipse(cx, H * 0.28, 17, 15, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 26, H * 0.28, 52, 4); }
  if (look.hat === 'brim') { g.beginPath(); g.ellipse(cx, H * 0.27, 18, 13, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(cx, H * 0.28, 36, 5, 0, 0, Math.PI * 2); g.fill(); }
  if (look.hat === 'veil') { g.beginPath(); g.ellipse(cx, H * 0.27, 26, 8, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(40,28,16,0.55)'; for (let i = -24; i <= 24; i += 4) { g.beginPath(); g.moveTo(cx + i, H * 0.27); g.lineTo(cx + i * 0.8, H * 0.47); g.stroke(); } }
  // grain & scratches
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 38; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(240,225,190,0.25)'; for (let i = 0; i < 4; i++) { g.beginPath(); const x = rnd() * W; g.moveTo(x, 0); g.lineTo(x + (rnd() - 0.5) * 20, H); g.stroke(); }
  const v = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,12,4,0.75)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  if (id === 'jonah' && IP.knows('jonah_watch')) { g.fillStyle = 'rgba(255,240,200,0.18)'; g.font = '10px serif'; g.fillText(IP.N(), 6, H - 8); }
  if (dead) { g.strokeStyle = 'rgba(20,10,5,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 8); g.lineTo(W - 8, H - 8); g.stroke(); }
}

/* ---------- radio ---------- */
let radioState = { f: 820, heard: {} };
function hourBetween() { const h = new Date().getHours(); return h >= 0 && h < 4; }
function stationAt(f) {
  let best = null, bd = 99;
  IP.STATIONS.forEach(s => {
    if (s.night && !RUN.night) return;
    if (s.hour && !hourBetween()) return;
    if (s.f === 1290 && !(IP.alive('odile') && RUN.leg >= 2)) return;
    const d = Math.abs(s.f - f); if (d < bd) { bd = d; best = s; }
  });
  return bd <= 14 ? { s: best, strength: Math.max(0, 1 - bd / 14) } : null;
}
function stationContent(s) {
  const lg = RUN.leg;
  if (s.f === 640) {
    const L = {
      1: 'Good evening, Meridian. This is the Company Hour on W-H-T-C. The Halvorsen Transcontinental reminds you: the Pilgrim is safe. The Pilgrim is punctual. Arrival is assured. Now, a word about keeping your blinds down after dark.',
      2: 'Good evening, Meridian. Water levels in the Sunken Counties are holding perfectly level. Passengers are reminded not to count the knots in the bell-cord. The Company has counted them for you. Arrival is assured.',
      3: 'Good evening. Good evening. The Pilgrim is safe. The Pilgrim is punctual. Arrival is assured. Arrival is assured. Arrival is'
    };
    return { speech: L[lg], text: L[lg] };
  }
  if (s.f === 910) {
    const msg = lg === 1 ? 'CLAIM 077 LOST PROPERTY' : 'CENTRAL KEEPS THE LEDGER';
    return { morse: msg, text: IP.audio.encodeMorse(msg), trans: IP.alive('wren') ? msg : null };
  }
  if (s.f === 1107) {
    const t = `Eleven oh seven, Calder Yard. Eleven oh seven, Harrow's Cross. Eleven oh seven, Lowater. Eleven oh seven, Hinge Bridge. Eleven oh seven, Sallow Haven. Conductor ${IP.N()}, now arriving. Now arriving. Now arriving.`;
    return { speech: t, text: t, pitch: 0.2, rate: 0.6, once: 'n1107', fx: { lore: 1, nerveAll: -1 } };
  }
  if (s.f === 1290) {
    const t = 'Mama? Mama, it’s warm here. Keep driving. Don’t stop for anything. Don’t stop.';
    return { speech: t, text: t, pitch: 1.7, rate: 0.9, learn: 'luca_heard' };
  }
  if (s.f === 1440) {
    const now = new Date(); const tm = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const t = `If you can hear this, it's ${tm} where you are, and you ought to be asleep. My name is Elias Ashby. I was the conductor before you. I expect I'm the conductor after you as well. The Company keeps everything we lose. Ask them for seventy-seven. Then go to Lowater and say what they tell you to say. And don't sign anything.`;
    return { speech: t, text: t, pitch: 0.75, rate: 0.85, once: 'hour', fx: { lore: 2 }, learn: 'hour_between' };
  }
  return { text: '' };
}
function sheetRadio() {
  const recs = Object.keys(RUN.items).filter(k => RUN.items[k] > 0 && IP.ITEMS[k].record);
  const hasRadio = RUN.cars.includes('radio');
  let h = `<div class="radio ${hasRadio ? '' : 'off'}">
    <div class="dialface"><svg viewBox="0 0 320 130" aria-hidden="true">${dialMarks()}<line id="needle" x1="160" y1="122" x2="160" y2="30" class="needle"/><circle cx="160" cy="122" r="6" class="hubc"/></svg>
      <div class="freq"><span id="freqv">${radioState.f}</span> kc</div><div class="meter"><i id="sigm"></i></div></div>
    <label class="sr" for="dial">Tuning dial</label><input type="range" id="dial" min="540" max="1600" step="1" value="${radioState.f}" ${hasRadio ? '' : 'disabled'}>
    <div class="finetune"><button class="btn small" data-df="-10">◀◀</button><button class="btn small" data-df="-1">◀</button><button class="btn small" data-df="1">▶</button><button class="btn small" data-df="10">▶▶</button></div>
    <div class="paper transcript" id="tx"><span class="muted">${hasRadio ? 'Static. Turn the dial slowly.' : 'There is no radio car on the train.'}</span></div>
    </div><h3>Gramophone</h3><div class="records">`;
  if (!recs.length) h += `<p class="muted">No records aboard.</p>`;
  recs.forEach(k => { h += `<button class="btn record" data-rec="${k}">▶ ${IP.ITEMS[k].name.replace('Record: ', '')}</button>`; });
  h += `</div><p class="muted small" id="recnote"></p>`;
  sheetFrame('Wireless &amp; Gramophone', h);
  if (!hasRadio) return;
  IP.audio.radioOn();
  const dial = $('#dial');
  let cur = null, playT = null;
  const update = () => {
    const f = +dial.value; radioState.f = f; $('#freqv').textContent = f;
    const a = -70 + (f - 540) / 1060 * 140; $('#needle').setAttribute('transform', `rotate(${a} 160 122)`);
    const st = stationAt(f); const strength = st ? st.strength : 0;
    $('#sigm').style.width = Math.round(strength * 100) + '%';
    IP.audio.radioTune(strength);
    const lock = st && st.strength > 0.72 ? st.s : null;
    if (lock !== cur) {
      cur = lock; IP.audio.stopSpeech(); clearTimeout(playT);
      const tx = $('#tx');
      if (!lock) { tx.innerHTML = `<span class="muted">${st ? 'Something under the static. Closer.' : 'Static.'}</span>`; return; }
      const c = stationContent(lock);
      tx.innerHTML = `<div class="callsign">${lock.f} kc ${lock.call ? '· ' + lock.call : ''} · ${IP.esc(lock.name)}</div><div class="txt" id="txt"></div>${c.trans ? `<div class="trans">Wren writes it down: <b>${IP.esc(c.trans)}</b></div>` : ''}`;
      const txt = $('#txt');
      if (c.morse) { txt.className = 'txt mono'; txt.textContent = c.text; const loop = () => { if (cur === lock) IP.audio.morse(c.morse, () => { playT = setTimeout(loop, 800); }); }; loop(); }
      else { typeInto(txt, c.text, 28); IP.audio.speak(c.text, { pitch: c.pitch || 0.7, rate: c.rate || 0.9 }); }
      if (c.learn) IP.learn(c.learn);
      if (c.once && !RUN.flags['r_' + c.once + (c.once === 'n1107' ? RUN.moves : '')]) {
        RUN.flags['r_' + c.once + (c.once === 'n1107' ? RUN.moves : '')] = true;
        const lines = IP.fx(c.fx); if (lines.length) tx.insertAdjacentHTML('beforeend', `<div class="fxl">${lines.map(IP.esc).join(' · ')}</div>`);
        IP.hud();
      }
      IP.save();
    }
  };
  dial.addEventListener('input', update);
  document.querySelectorAll('[data-df]').forEach(b => b.addEventListener('click', () => { dial.value = Math.max(540, Math.min(1600, +dial.value + +b.dataset.df)); update(); }));
  update();
  document.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.rec; const rec = IP.RECORDS[k];
    IP.audio.radioTune(0); IP.audio.stopSpeech();
    $('#recnote').textContent = 'Playing… ' + rec.note;
    IP.audio.playRecord(rec, () => { $('#recnote').textContent = rec.note; update(); });
    const day = Math.floor(RUN.moves / 2);
    if (RUN.flags['rec_' + k] !== day) {
      RUN.flags['rec_' + k] = day;
      const fx = k === 'record_waltz' ? { nerveAll: 1 } : k === 'record_hymn' ? { nerveAll: 1, att: 1 } : { lore: 1, nerveAll: -1 };
      if (k === 'record_blank') IP.learn('blank_record');
      $('#recnote').textContent += '  ' + IP.fx(fx).join(' · ');
      IP.hud(); IP.save();
    }
  }));
}
function dialMarks() {
  const pt = (f, r) => { const a = (-70 + (f - 540) / 1060 * 140) * Math.PI / 180; return [160 + Math.sin(a) * r, 122 - Math.cos(a) * r]; };
  let h = '';
  for (let f = 550; f <= 1600; f += 25) { const [x1, y1] = pt(f, 104), [x2, y2] = pt(f, f % 100 === 0 ? 94 : 99); h += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="tick"/>`; }
  [600, 800, 1000, 1200, 1400, 1600].forEach(f => { const [x, y] = pt(f, 80); h += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">${f / 10}</text>`; });
  return h;
}
function typeInto(el, text, ms) {
  let i = 0; el.textContent = '';
  const iv = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(iv); }, ms);
}

/* ---------- archive ---------- */
const DOC_ORDER = ['handbook', 'hire', 'timetable', 'pamphlet', 'ashby1', 'ticket077', 'ashby2', 'ashby3', 'signallog', 'cufflink', 'tulltel', 'tullreply', 'society', 'notebook', 'orders', 'photo', 'letter', 'slate', 'tally', 'watch', 'survey', 'porter'];
const ENDINGS = [['arrival', 'Arrival'], ['cut', 'The Line Is Cut'], ['stationmaster', 'Stationmaster'], ['spur', 'Spur Nine']];
IP.DOCS.handbook = { kind: 'pamphlet', title: 'Conductor’s Handbook', body:
  '<b>THE ROUTE.</b> Pick the next stop on the map. Each move burns fuel. Every second move, night falls.<br><br><b>THE QUIET.</b> The grey on the left of the map is coming. If it reaches you, crew and hull suffer. If it passes you, the run is over. Waiting costs ground.<br><br><b>NIGHTS.</b> Lit ward-lamps keep most things off the roof. Nights eat provisions.<br><br><b>BOARDINGS.</b> Every enemy shows what it will do next. Move crew out of harm, cover the cars that matter, then ring the bell. Crossing Car Zero’s roof costs nerve. Shaken crew hit softer; broken crew lose a turn.<br><br><b>LORE.</b> Spend it on rites in a fight. Rites, shrines and certain choices draw attention. Something is keeping count.<br><br><b>THE LEDGER.</b> What you learn stays learned. The train does not.' };
function sheetArchive(openId) {
  let h = `<div class="ledger"><div class="lg-row"><span class="label">Knots in the bell-cord</span><b>${META.knots}</b></div><div class="lg-row"><span class="label">Endings</span><span>${ENDINGS.map(([k, n]) => META.endings[k] ? `<b>${n}</b>` : '<span class="muted">unwritten</span>').join(' · ')}</span></div></div><div class="docgrid">`;
  DOC_ORDER.filter(d => META.docs[d]).forEach(d => { const D = IP.DOCS[d]; h += `<button class="docbtn k-${D.kind}" data-doc="${d}"><span>${IP.esc(D.title)}</span></button>`; });
  h += `</div><div id="docview"></div>`;
  sheetFrame('Archive', h);
  document.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => showDoc(b.dataset.doc)));
  if (openId) showDoc(openId);
}
function showDoc(id) {
  IP.audio.sfx('page');
  const D = IP.DOCS[id];
  let body = IP.fill(D.body);
  let extra = '';
  if (D.map) extra = surveySVG(false);
  if (D.glyph) extra = `<svg class="glyph" viewBox="0 0 60 60" aria-hidden="true"><path d="M24 6V54M36 6V54"/><circle cx="30" cy="30" r="14"/></svg>`;
  let h = `<article class="paper doc k-${D.kind}" id="doc-${id}"><div class="doc-title">${IP.esc(D.title)}</div><div class="doc-body">${body}</div>${extra}${D.hidden ? `<div class="hiddenink" id="hink">${IP.fill(D.hidden)}</div>` : ''}</article>`;
  if (D.hidden) h += `<button class="btn small" id="holdLamp">Hold it up to the lamp</button>`;
  if (D.cipher) h += `<form class="cipher" id="cipherForm"><label for="cipherIn">Your reading of the numbers</label><div class="row"><input id="cipherIn" autocomplete="off" spellcheck="false" placeholder="Write it out…"><button class="btn small">Check</button></div><p class="muted small" id="cipherOut">${IP.knows('spur_known') ? 'Deciphered: SPUR NINE, LEFT AT THE PILLARS.' : ''}</p></form>`;
  const v = $('#docview'); v.innerHTML = h; v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const hl = $('#holdLamp');
  if (hl) hl.addEventListener('click', () => { const hk = $('#hink'); hk.classList.toggle('lit'); $('#doc-' + id).classList.toggle('lamp'); if (D.map) $('#doc-' + id).querySelector('.survey').outerHTML = surveySVG(hk.classList.contains('lit')); IP.audio.sfx('lamp'); if (D.map && hk.classList.contains('lit')) IP.learn('spur_seen'); });
  const cf = $('#cipherForm');
  if (cf) cf.addEventListener('submit', e => {
    e.preventDefault();
    const t = $('#cipherIn').value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ');
    const ok = /SPUR (NINE|9|IX)/.test(t) && /PILLAR/.test(t);
    $('#cipherOut').textContent = ok ? 'That’s it. SPUR NINE, LEFT AT THE PILLARS.' : (/SPUR/.test(t) ? 'Part of it. Not all.' : 'That isn’t it.');
    if (ok) { IP.learn('spur_known'); IP.save(); }
  });
}
function surveySVG(lit) {
  const st = [['Calder Yard', 40, 150], ['Harrow’s Cross', 40, 40], ['Lowater', 160, 40], ['The Pillars', 160, 150], ['Hinge Bridge', 100, 100], ['Sallow Haven', 100, 175]];
  return `<svg class="survey" viewBox="0 0 220 200" aria-label="Survey sheet"><path d="M40 190V10M160 190V10" class="sv-line"/><circle cx="100" cy="100" r="62" class="sv-line"/>${st.map(([n, x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" class="sv-dot"/><text x="${x + 6}" y="${y - 5}">${n}</text>`).join('')}${lit ? '<path d="M160 150 C120 160 60 175 8 196" class="sv-spur"/><text x="12" y="186" class="sv-spurt">Spur IX</text>' : ''}</svg>`;
}

/* ---------------- screens ---------------- */
function setScreen(s) { RUN && (RUN.screen = s); }
function title(loading) {
  dock(false); IP.hud();
  const has = RUN && !['dead', 'ending'].includes(RUN.screen);
  STAGE().innerHTML = `<section class="title">
    <div class="t-mark"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="M48 8V112M72 8V112"/><circle cx="60" cy="60" r="34"/></svg></div>
    <h1>Iron Pilgrim</h1>
    <p class="t-sub">Halvorsen Transcontinental &middot; Meridian Line &middot; Winter 1931</p>
    <div class="t-acts">${loading ? '<p class="muted">Opening the ledger…</p>' : `
      ${has ? '<button class="btn primary" id="cont">Continue the run</button>' : ''}
      <button class="btn ${has ? '' : 'primary'}" id="board">${has ? 'Abandon run and begin again' : META.knots ? 'Board the Pilgrim again' : 'Board the Pilgrim'}</button>`}
    </div>
    ${!loading && META.knots ? `<p class="t-knots">${META.knots} knot${META.knots === 1 ? '' : 's'} in the bell-cord.</p>` : ''}
    <p class="t-note">Sound on. Headphones help.</p>
  </section>`;
  if (loading) return;
  const go = () => { IP.audio.init(); };
  const c = $('#cont'); if (c) c.addEventListener('click', () => { go(); resume(); });
  const b = $('#board');
  let confirmAb = false;
  b.addEventListener('click', () => {
    go();
    if (has && !confirmAb) { confirmAb = true; b.textContent = 'Abandon this run? The Quiet takes it. Click again.'; return; }
    if (has) { META.knots++; }
    newRun(); intro(0);
  });
}
function resume() {
  dock(true); IP.hud(); IP.audio.ambient('travel');
  if (RUN.leftInDark) {
    RUN.leftInDark = false;
    const l = IP.fx({ nerveAll: -1 });
    return result('The Morning After', IP.alive('jonah') ? 'Nobody will tell you how the fight ended. Jonah hands you his slate without being asked. It says: YOU LEFT THEM IN THE DARK.' : 'Nobody will tell you how the fight ended. The passengers will not meet your eye.', l, () => resume());
  }
  const s = RUN.screen;
  if (s === 'night') return nightfall();
  if (s === 'station') return station(RUN.map.nodes[RUN.node]);
  if (s === 'legend') { const n = RUN.map.nodes[RUN.node]; return n.type === 'unbuilt' ? finale(0) : legEnd(); }
  showMap();
}

/* ---------- intro ---------- */
function intro(step) {
  setScreen('intro'); dock(false); IP.hud();
  const again = META.knots > 0;
  const steps = [
    () => panel('Western Union', `<div class="paper doc k-telegram"><div class="doc-body">${IP.fill(IP.DOCS.hire.body)}</div></div>`, 'Report to Calder Yard'),
    () => {
      const signed = again && META.name;
      STAGE().innerHTML = `<section class="scene"><div class="paper doc contract"><div class="doc-title">Contract of Carriage</div><div class="doc-body">I, the undersigned, accept the position of Conductor on the Meridian Line of the Halvorsen Transcontinental Railway Company, and undertake to deliver all passengers and consignments to Sallow Haven.<br><br><i>Arrival is assured.</i></div>
        <form id="signf" class="sign"><label for="signName">Signature</label><input id="signName" maxlength="28" autocomplete="off" value="${IP.esc(signed ? META.name : '')}" ${signed ? 'readonly' : ''} placeholder="Sign your name"><button class="btn primary">${signed ? 'The ink is already dry' : 'Sign'}</button></form></div></section>`;
      const inp = $('#signName'); if (!signed) inp.focus();
      $('#signf').addEventListener('submit', e => {
        e.preventDefault();
        const v = inp.value.trim().replace(/\s+/g, ' ').slice(0, 28);
        if (!v) { inp.focus(); return; }
        META.name = v; IP.audio.sfx('page'); intro(2);
      });
    },
    () => panel('Calder Yard, 6 a.m.', again
      ? `You know this platform. You know the smell of diesel and wet cinders and the sound of the Pilgrim idling. You don’t know how you know it.\n\nBehind the tender, Car Zero sits with its coupling welded solid. Someone has tied ${META.knots === 1 ? 'a knot' : META.knots + ' knots'} in the bell-cord.${META.endings.cut ? '\n\nThe newspaper on the bench says Hinge Bridge has been rebuilt. It took them no time at all.' : ''}`
      : 'The Iron Pilgrim stands at platform one with her engine idling: a long armoured diesel the colour of a stove, No. 9 in brass on her nose. Six cars. Behind the tender, a car with no windows and its coupling welded solid: Car Zero.\n\nThe yard is empty except for your crew.', 'Meet the crew'),
    () => panel('The Crew', again
      ? `Odile Marchetti looks you up and down. “Morning, Conductor. You look like you’ve seen a ghost.”\n\nDr. Tull shakes your hand. “Punctual. Good.” Wren waves from the radio car. Vane is already at the back.\n\nJonah is filling the lamps. He looks at you for a long moment and writes on his slate: ${META.knots >= 3 ? 'YOU AGAIN.' : 'AGAIN.'}`
      : '“You’re the new one.” Odile Marchetti, the engineer, wipes her hands on a rag. “Governor sticks below forty. Don’t ask me to go slower than forty.”\n\n“Ambrose Tull.” The doctor’s handshake is cool and dry. “If anyone is hurt, send them to me. If anyone is frightened, send them to me too.”\n\n“Wren. Wireless.” A girl leans out of the radio car. “Stand on my right if you want me to hear you.”\n\n“Vane. Company police.” He doesn’t offer his hand. “I’ll be at the back.”\n\nA very large man is filling the ward-lamps. He looks at you for a long moment, then writes on a slate, LAMPS, and points at himself.', 'Go aboard'),
    () => panel('Coach', 'Nine passengers. A grain broker, two sisters, a watchmaker, a discharged soldier, a mother with an infant. A widow in black sits with a cello case on the seat beside her. She is watching Car Zero through the window, and she does not look away when you come in.\n\nOdile leans on the horn. The Pilgrim pulls out of Calder Yard into the Cinderlands.\n\nSomewhere behind you, the Quiet is already moving.', 'Take the map', true)
  ];
  steps[step]();
  function panel(t, body, next, last) {
    STAGE().innerHTML = `<section class="scene"><h2>${t}</h2><div class="prose">${body.startsWith('<') ? body : para(body)}</div><div class="choices"><button class="btn primary" id="nx">${next}</button></div></section>`;
    $('#nx').addEventListener('click', () => {
      IP.audio.sfx('click');
      if (last) { META.seenIntro = true; IP.audio.sfx('whistle'); IP.audio.ambient('travel'); RUN.screen = 'map'; IP.save(); dock(true); showMap(); if (!META.flags.handbookShown) { META.flags.handbookShown = 1; openSheet('archive'); showDoc('handbook'); } }
      else intro(step + 1);
    });
  }
}

/* ---------- map ---------- */
function moveCost() { return 1 + (IP.alive('odile') ? 0 : 1) + (RUN.cars.length > 7 ? 1 : 0); }
function showMap(msg) {
  setScreen('map'); RUN.busy = false; dock(true); IP.hud();
  IP.audio.ambient(RUN.night ? 'night' : 'travel');
  const cur = RUN.map.nodes[RUN.node];
  const cost = moveCost();
  const stuck = cur.links.length && RUN.res.fuel < cost;
  const deadEnd = !cur.links.length && cur.col > 0;
  STAGE().innerHTML = `<section class="mapview">
    <div class="maphead"><h2>${IP.esc(IP.LEGS[RUN.leg].name)}</h2><span class="muted">${IP.esc(IP.LEGS[RUN.leg].blurb)}</span></div>
    ${msg ? `<div class="notice">${msg}</div>` : ''}
    <div class="maptable"><div class="mapscroll" id="mapHost"></div></div>
    <div class="mapinfo" id="mapInfo">${deadEnd ? `<p>The Pilgrim is standing at <b>${IP.esc(cur.name)}</b>.</p><button class="btn primary" id="pullIn">Go on</button>` : stuck ? `<p><b>Out of fuel.</b> The Pilgrim cannot move. The Quiet does not need to.</p><button class="btn primary" id="stranded">Wait for it</button>` : `<p class="muted">At <b>${IP.esc(cur.name)}</b>. Pick the next stop. Each move costs ${cost} fuel.</p>`}</div>
  </section>`;
  IP.renderMap($('#mapHost'), RUN, pickNode);
  const s = $('#stranded'); if (s) s.addEventListener('click', () => death('fuel'));
  const pi = $('#pullIn'); if (pi) pi.addEventListener('click', () => cur.type === 'unbuilt' ? finale(0) : legEnd());
  IP.save();
}
function pickNode(id) {
  const n = RUN.map.nodes[id]; const T = IP.NODE_TYPES[n.type];
  IP.audio.sfx('click');
  $('#mapInfo').innerHTML = `<div class="pick"><div><b>${IP.esc(n.name)}</b> <span class="muted">· ${T.label}</span><div class="muted small">${T.hint}</div></div><button class="btn primary" id="goBtn">Run to ${IP.esc(n.name)} · ${moveCost()} fuel</button></div>`;
  $('#goBtn').addEventListener('click', () => travel(id));
}
function travel(id) {
  if (RUN.busy) return; RUN.busy = true;
  const cost = moveCost();
  if (RUN.res.fuel < cost) return showMap();
  IP.res('fuel', -cost);
  RUN.node = id; RUN.path.push(id); RUN.map.nodes[id].done = true; RUN.moves++; RUN.night = false;
  RUN.quiet += 0.85 + 0.1 * RUN.leg;
  const n = RUN.map.nodes[id];
  const notes = [];
  if (RUN.quiet >= n.col + 1) return death('quiet');
  if (RUN.quiet > n.col - 0.6) { notes.push(...IP.fx({ nerveAll: -1, hull: -1, pass: RUN.res.pass > 0 ? -1 : 0 })); RUN.inQuiet = true; } else RUN.inQuiet = false;
  if (RUN.res.hull <= 0) return death('hull');
  IP.audio.sfx('whistle');
  arrive(n, notes);
}
function arrive(n, notes) {
  RUN.pendingNotes = notes;
  IP.save();
  switch (n.type) {
    case 'station': return station(n);
    case 'end': return legEnd();
    case 'pillars': return runScene('pillars', afterNode);
    case 'spur': return spurNode();
    case 'unbuilt': return finale(0);
    case 'ambush': return ambush();
    case 'depot': {
      const f = 2 + Math.floor(Math.random() * 2);
      const pre = notes.concat(IP.fx({ fuel: f }));
      if (IP.chance(0.5)) return eventFor('depot', pre);
      return result('Water Tower', 'A Company water tower with a diesel standpipe, still working. Odile fills the tender without being asked.', pre, afterNode);
    }
    default: return eventFor(n.type, notes);
  }
}
function afterNode() {
  if (RUN.moves % 2 === 0 && !RUN.night) return nightfall();
  showMap();
}

/* ---------- events ---------- */
function eventFor(type, pre) {
  const pool = IP.EVENTS.filter(e => e.where.includes(type) && e.legs.includes(RUN.leg) && !(e.once && RUN.seen[e.id]) && (!e.req || e.req()));
  if (!pool.length) return fallback(type, pre);
  let tot = 0; pool.forEach(e => tot += (e.weight || 1));
  let r = Math.random() * tot; let ev = pool[0];
  for (const e of pool) { r -= (e.weight || 1); if (r <= 0) { ev = e; break; } }
  runEvent(ev, afterNode, pre);
}
function fallback(type, pre) {
  const F = {
    signal: () => { if (!RUN.items.record_blank && !IP.knows('blank_record')) return ['Signal Box', 'The box is empty. On the lever frame sits a gramophone record in a plain sleeve with no label. The grooves run from the centre outward.', { item: { record_blank: 1 } }]; return ['Signal Box', 'Wren copies an hour of traffic from the box’s set. Most of it is weather. Some of it is not.', { lore: 1 }]; },
    shrine: () => ['A Mark on a Barn', 'The parallel mark, painted on a barn in something dark. You don’t stop.', { nerveAll: -1 }],
    wreck: () => ['Wreck', 'A burned-out motorcar on the crossing. You strip what you can.', { scrip: 6, prov: 1 }],
    town: () => ['A Halt', 'A town that is mostly empty. Mostly. You trade a little and leave.', { prov: 2, scrip: -2 }],
    depot: () => ['Water Tower', 'Diesel and water. Nothing else.', {}],
    unknown: () => ['Open Country', 'Nothing on the line but the line.', { nerveAll: 1 }]
  };
  const [t, x, fx] = (F[type] || F.unknown)();
  result(t, x, (pre || []).concat(IP.fx(fx)), afterNode);
}
function runEvent(ev, then, pre) {
  RUN.seen[ev.id] = true;
  RUN.screen = 'event'; dock(true); IP.hud();
  const choices = ev.choices();
  STAGE().innerHTML = `<section class="scene event"><h2>${IP.esc(ev.title)}</h2>${pre && pre.length ? `<div class="fxl">${pre.map(IP.esc).join(' · ')}</div>` : ''}<div class="prose" id="prose"></div><div class="choices" id="ch"></div></section>`;
  revealText($('#prose'), IP.fill(ev.text()), () => {
    const ch = $('#ch');
    choices.forEach((c, i) => {
      const ok = !c.req || c.req();
      const b = document.createElement('button'); b.className = 'btn choice';
      b.innerHTML = `<span class="n">${i + 1}</span><span>${IP.esc(c.t)}${!ok && c.why ? `<em>${IP.esc(c.why)}</em>` : ''}</span>`;
      b.disabled = !ok;
      b.addEventListener('click', () => { IP.audio.sfx('click'); resolve(ev.title, c.go(), then); });
      ch.appendChild(b);
    });
    IP.save();
  });
}
function resolve(title, r, then) {
  if (r.scene) return runScene(r.scene, then);
  const lines = IP.fx(r.fx);
  if (r.combat) {
    return result(title, r.text, lines, () => fight(Object.assign({ title }, r.combat), then), 'Fight');
  }
  result(title, r.text, lines, then);
}
function result(title, text, lines, then, btn) {
  IP.hud();
  STAGE().innerHTML = `<section class="scene"><h2>${IP.esc(title)}</h2><div class="prose" id="prose"></div>${lines && lines.length ? `<div class="fxl">${lines.map(IP.esc).join(' · ')}</div>` : ''}<div class="choices"><button class="btn primary" id="nx">${btn || 'Continue'}</button></div></section>`;
  revealText($('#prose'), IP.fill(text || ''));
  $('#nx').addEventListener('click', () => { IP.audio.sfx('click'); if (checkFail()) return; then(); });
  IP.save();
}
function checkFail() {
  if (RUN.res.hull <= 0) { death('hull'); return true; }
  if (!IP.crewInCombat().length) { death('crew'); return true; }
  return false;
}
let revealT = null;
function revealText(el, text, done) {
  clearInterval(revealT);
  const html = para(text);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.innerHTML = html; if (done) done(); return; }
  el.innerHTML = html; el.classList.add('revealing');
  const ps = [...el.querySelectorAll('p')];
  ps.forEach(p => p.style.opacity = 0);
  let i = 0;
  const fin = () => { clearInterval(revealT); ps.forEach(p => p.style.opacity = 1); el.classList.remove('revealing'); el.removeEventListener('click', fin); if (done) { const d = done; done = null; d(); } };
  el.addEventListener('click', fin);
  revealT = setInterval(() => { if (i >= ps.length) return fin(); ps[i].style.opacity = 1; IP.audio.sfx('type'); i++; }, 420);
  if (ps.length) { ps[0].style.opacity = 1; i = 1; }
}
function runScene(id, then) {
  const S = IP.SCENES[id];
  if (id === 'lostprop') return lostProperty(then);
  runEvent({ id: 'scene_' + id, title: S.title, text: S.text, choices: S.choices }, then);
}

/* ---------- lost property ---------- */
function lostProperty(then) {
  RUN.screen = 'event';
  STAGE().innerHTML = `<section class="scene"><h2>Lost Property</h2><div class="prose">${para(IP.SCENES.lostprop.text())}</div>
    <form class="sign" id="lpf"><label for="lpIn">Claim number or passphrase</label><input id="lpIn" autocomplete="off" spellcheck="false"><button class="btn primary">Ask</button></form>
    <div class="prose" id="lpOut"></div><div class="choices"><button class="btn" id="lpLeave">Leave the window</button></div></section>`;
  $('#lpIn').focus();
  $('#lpf').addEventListener('submit', e => {
    e.preventDefault();
    const raw = $('#lpIn').value.trim(); const v = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ');
    let out;
    if (/^0*77$/.test(v)) { IP.learn('lp_077'); out = '“Seventy-seven.” He runs a finger down a ledger. “Claimed already. By you, Conductor. Signed and everything.” He turns the book so you can see your own signature. “If you want the particulars, Central Office keeps the full ledger. You’ll find it with the rest of your things.”'; }
    else if (v.replace(/ /g, '') === 'LOWWATER') {
      if (RUN.items.fork) out = '“You have it already,” he says. “You always do, by this point.”';
      else { RUN.items.fork = 1; IP.learn('fork_found'); out = 'The clerk takes off his eyeshade. For a moment he looks at you as though you were someone he had been waiting for a long time. Then he goes back, a long way back, and returns with a narrow box.\n\nOne tuning fork, brass, engraved SPUR IX. It hums in your hand. Behind you, in Car Zero, something stops counting.'; IP.audio.sfx('lamp'); }
    }
    else if (v === 'ASHBY' || v === 'E ASHBY' || v === 'ELIAS ASHBY') out = '“Mr. Ashby’s effects went to Central. All but the coat. He would keep the coat.”';
    else if (v === '1107' || v === '11 07') out = '“Eleven-oh-seven. One hour, unclaimed.” He doesn’t look up. “We can’t release that to you. It isn’t yours yet.”';
    else if (META.name && v === META.name.toUpperCase().replace(/[^A-Z0-9 ]/g, '')) out = '“We hold a great deal under that name. You would need the claim numbers.”';
    else if (/^\d+$/.test(v)) out = '“Nothing under ' + v + '. Not here. Central might have it.”';
    else out = 'The clerk waits politely for you to say something that means something.';
    $('#lpOut').innerHTML = para(out); IP.save();
  });
  $('#lpLeave').addEventListener('click', () => { IP.audio.sfx('click'); then(); });
}

/* ---------- station ---------- */
function station(n) {
  RUN.screen = 'station'; dock(true); IP.hud(); IP.audio.ambient('station');
  if (RUN.stationVisit !== RUN.node) { RUN.stationVisit = RUN.node; RUN.flags.rested = false; RUN.flags.wired = false; }
  const leg = RUN.leg;
  const shop = [
    ['fuel', 'Diesel, two drums', 6, { fuel: 2 }],
    ['prov', 'Provisions, three days', 5, { prov: 3 }],
    ['ward', 'Ward oil, one can', 6, { ward: 1 }],
    ['hull', 'Plate and rivets', 8, { hull: 4 }],
    ['bandage', 'Bandages', 10, { item: { bandage: 1 } }],
    ['laudanum', 'Laudanum', 14, { item: { laudanum: 1 } }],
    ['flare', 'Signal flare', 12, { item: { flare: 1 } }]
  ];
  if (leg >= 2) shop.push(['dynamite', 'Dynamite', 30, { item: { dynamite: 1 } }]);
  if (!RUN.items.record_hymn) shop.push(['record_hymn', 'Record: Company Hymn', 6, { item: { record_hymn: 1 } }]);
  const cars = ['infirmary', 'armory', 'dining', 'observe'].filter(k => !RUN.cars.includes(k));
  const notes = RUN.pendingNotes || []; RUN.pendingNotes = null;
  const render = (msg) => {
    let h = `<section class="scene station"><h2>${IP.esc(n.name)} Station</h2>${notes.length ? `<div class="fxl">${notes.map(IP.esc).join(' · ')}</div>` : ''}
      <p class="muted">A Company station, more or less staffed. The stationmaster does not ask where you have come from.</p>
      ${msg ? `<div class="notice">${msg}</div>` : ''}
      <div class="st-grid"><div class="st-col"><h3>Company Store <span class="muted">· ${RUN.res.scrip} scrip</span></h3><ul class="shop">`;
    shop.forEach(([k, label, cost]) => { h += `<li><span>${label}</span><button class="btn small" data-buy="${k}" ${RUN.res.scrip < cost ? 'disabled' : ''}>${cost}</button></li>`; });
    h += `</ul>${cars.length ? `<h3>Rolling stock</h3><ul class="shop">${cars.map(k => `<li><span>${IP.CARS[k].name}<em>${IP.CARS[k].desc}</em></span><button class="btn small" data-car="${k}" ${RUN.res.scrip < IP.CARS[k].cost || RUN.cars.length >= 8 ? 'disabled' : ''}>${IP.CARS[k].cost}</button></li>`).join('')}</ul>${RUN.cars.length >= 7 ? '<p class="muted small">More than seven cars costs extra fuel on every move.</p>' : ''}` : ''}</div>
      <div class="st-col"><h3>Services</h3><div class="svc">
        <button class="btn" id="rest" ${RUN.flags.rested ? 'disabled' : ''}>Lay over a night<em>Crew +2 health, +2 nerve. Costs 2 provisions. The Quiet gains ground.</em></button>
        <button class="btn" id="wire" ${RUN.flags.wired ? 'disabled' : ''}>Wire the Company for an advance<em>+15 scrip. They will know where you are.</em></button>
        ${leg >= 2 ? '<button class="btn" id="lp">Lost Property window</button>' : ''}
      </div><h3>Arrange the train</h3><ol class="arrange">`;
    RUN.cars.forEach((k, i) => { const fixed = IP.CARS[k].fixed; h += `<li><span>${IP.CARS[k].name}</span>${fixed ? '<span class="muted small">fixed</span>' : `<span><button class="btn tiny" data-up="${i}" ${i <= 3 ? 'disabled' : ''} aria-label="Move ${IP.CARS[k].name} forward">▲</button><button class="btn tiny" data-dn="${i}" ${i >= RUN.cars.length - 1 ? 'disabled' : ''} aria-label="Move ${IP.CARS[k].name} rearward">▼</button></span>`}</li>`; });
    h += `</ol></div></div><div class="choices"><button class="btn primary" id="leave">Back aboard</button></div></section>`;
    STAGE().innerHTML = h;
    document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const it = shop.find(s => s[0] === b.dataset.buy); if (RUN.res.scrip < it[2]) return;
      IP.res('scrip', -it[2]); IP.fx(it[3]); IP.audio.sfx('coin'); IP.hud(); IP.save();
      if (it[0] === 'record_hymn') shop.splice(shop.indexOf(it), 1);
      render('Bought: ' + it[1] + '.');
    }));
    document.querySelectorAll('[data-car]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.car; if (RUN.res.scrip < IP.CARS[k].cost) return;
      IP.res('scrip', -IP.CARS[k].cost); RUN.cars.push(k); cars.splice(cars.indexOf(k), 1); IP.audio.sfx('thud'); IP.hud(); IP.save();
      render(IP.CARS[k].name + ' coupled on at the rear.');
    }));
    document.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.up; [RUN.cars[i - 1], RUN.cars[i]] = [RUN.cars[i], RUN.cars[i - 1]]; IP.audio.sfx('thud'); render(); }));
    document.querySelectorAll('[data-dn]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.dn; [RUN.cars[i + 1], RUN.cars[i]] = [RUN.cars[i], RUN.cars[i + 1]]; IP.audio.sfx('thud'); render(); }));
    $('#rest').addEventListener('click', () => {
      if (RUN.res.prov < 2) return render('Not enough provisions to lay over.');
      RUN.flags.rested = true; const l = IP.fx({ prov: -2, hpAll: 2, nerveAll: 2, quiet: 1 }); IP.hud(); IP.save();
      if (RUN.quiet >= n.col + 1) return death('quiet');
      render('You lay over. ' + l.join(' · '));
    });
    $('#wire').addEventListener('click', () => { RUN.flags.wired = true; const l = IP.fx({ scrip: 15, att: 1 }); IP.hud(); IP.save(); render('The reply comes in under a minute: ADVANCE APPROVED STOP THE CHAIRMAN THANKS YOU. ' + l.join(' · ')); });
    const lp = $('#lp'); if (lp) lp.addEventListener('click', () => lostProperty(() => station(n)));
    $('#leave').addEventListener('click', () => { IP.audio.sfx('click'); RUN.stationVisit = null; afterNode(); });
  };
  render();
}

/* ---------- combat glue ---------- */
function ambush() {
  const list = IP.pick(IP.ENCOUNTERS[RUN.leg]);
  result('The Cutting', IP.pick([
    'The line runs into a deep cutting. Halfway through, something drops onto the roof. Then something else.',
    'A tree across the rails. Odile brakes hard. The tree was put there.',
    'The Pilgrim slows for a washed-out culvert, and the things that were waiting in it climb aboard.'
  ]), RUN.pendingNotes || [], () => fight({ list, title: 'The Cutting', reward: { scrip: 8 + Math.floor(Math.random() * 8), prov: 1 }, winText: 'You throw what is left off the train and keep going.' }, afterNode), 'Fight');
}
function fight(spec, then) {
  RUN.screen = 'combat'; dock(false); IP.save();
  IP.startCombat(spec, (res, why) => {
    IP.audio.ambient(RUN.night ? 'night' : 'travel');
    dock(true);
    if (res === 'lose') return death(why === 'hull' ? 'hull' : 'crew');
    const lines = res === 'win' ? IP.fx(spec.reward || {}) : [];
    if (res === 'win' && spec.boss) { const t = {}; IP.CREW_ORDER.forEach(id => { if (IP.alive(id)) t[id] = 1; }); IP.fx({ trust: t }); lines.push('The crew trust you more'); }
    const t = res === 'dawn' ? 'Dawn comes up grey over the line. What is left of them lets go and drops away into the ditches.' : (spec.winText || 'It is over.');
    if (spec.after) return spec.after(res, lines);
    result(spec.title || 'After', t, lines, then);
  });
}

/* ---------- night ---------- */
function nightfall() {
  RUN.screen = 'night'; dock(true); IP.hud(); IP.audio.ambient('night');
  const alive = IP.CREW_ORDER.filter(id => IP.alive(id)).length;
  const need = Math.max(1, Math.ceil((alive + RUN.res.pass) / 4) - (RUN.cars.includes('dining') ? 1 : 0));
  STAGE().innerHTML = `<section class="scene night"><h2>Nightfall</h2><div class="prose">${para(IP.pick([
    'The light goes out of the sky all at once, the way it does out here now. The passengers pull their blinds down without being told.',
    'Dusk, and then not dusk. Jonah goes from car to car with his can of oil, looking at you each time he passes.',
    'Night. The wheels sound louder. Something on the plain is keeping pace with the train, a long way off.'
  ]))}</div><p class="muted">Supper will cost ${need} provision${need > 1 ? 's' : ''}. ${RUN.res.prov < need ? '<b>There is not enough.</b>' : ''}</p>
  <div class="choices"><button class="btn choice" id="lit" ${RUN.res.ward < 1 ? 'disabled' : ''}><span class="n">1</span><span>Light the ward-lamps<em>1 ward oil. Most things stay off the roof.</em></span></button><button class="btn choice" id="dark"><span class="n">2</span><span>Keep the lamps dark<em>Save the oil. Take your chances.</em></span></button></div></section>`;
  const go = lit => {
    IP.audio.sfx('click');
    RUN.night = true;
    const notes = [];
    if (lit) notes.push(...IP.fx({ ward: -1 }));
    if (RUN.res.prov >= need) notes.push(...IP.fx({ prov: -need }));
    else { RUN.res.prov = 0; notes.push('Hunger.', ...IP.fx({ nerveAll: -2, hpAll: -1, pass: RUN.res.pass >= 2 ? -2 : -RUN.res.pass })); }
    const p = 0.2 + 0.09 * RUN.leg + RUN.att * 0.03 - (lit ? 0.22 : 0) + (RUN.flags.porterMarked ? 0.05 : 0);
    if (Math.random() < p) {
      const list = IP.pick(IP.ENCOUNTERS[RUN.leg]).slice();
      if (!lit && RUN.leg >= 2) list.push('lantern');
      return result('Something on the Roof', lit ? 'Despite the lamps, something lands on the roof of the rear car. Then something else.' : 'In the dark, the first you hear of them is the scraping on the roof.', notes, () => fight({ list, night: true, dawn: lit ? 4 : 5, title: 'Night Boarding', reward: { scrip: 6, lore: 1 }, winText: 'The last of them goes over the side. Nobody sleeps, but nobody has to.' }, showMap), 'Fight');
    }
    const pool = IP.EVENTS.filter(e => e.where.includes('night') && e.legs.includes(RUN.leg) && !(e.once && RUN.seen[e.id]) && (!e.req || e.req()));
    const story = pool.filter(e => e.id !== 'n_quiet' && e.id !== 'n_zero');
    let ev = story.length && Math.random() < 0.75 ? IP.pick(story) : IP.pick(pool);
    if (!ev) ev = IP.EVENTS.find(e => e.id === 'n_quiet');
    runEvent(ev, showMap, notes);
  };
  $('#lit').addEventListener('click', () => go(true));
  $('#dark').addEventListener('click', () => go(false));
  IP.save();
}

/* ---------- leg ends ---------- */
function legEnd() {
  RUN.screen = 'legend'; IP.save();
  const leg = RUN.leg;
  if (leg === 1) {
    return result('Harrow’s Cross', 'Harrow’s Cross station. Every lamp is lit and the platform is empty except for a man in Company grey standing by the water column with his hands folded. He is taller than he should be. His face is pleasant in the way a clock face is pleasant.\n\nHe steps up onto the rear car without using the ladder.', RUN.pendingNotes || [], () =>
      fight(Object.assign({ title: 'Harrow’s Cross', boss: true, reward: { scrip: 20, ward: 2, lore: 2 } }, IP.BOSSES.harrow), () => runScene('harrow_after', () => nextLeg())), 'Fight');
  }
  if (leg === 2) {
    return result('Lowater', 'Lowater, on its stilts over the level lake. Out on the water, figures in white stand in a ring, singing. In the middle of the ring, one taller than the rest raises its arms like a conductor, and every figure turns toward the train.', RUN.pendingNotes || [], () =>
      fight(Object.assign({ title: 'Lowater', boss: true, reward: { scrip: 20, ward: 2, lore: 2, item: { laudanum: 1 } } }, IP.BOSSES.lowater), () => lowaterAfter()), 'Fight');
  }
  return hinge(0);
}
function lowaterAfter() {
  // Lost Property does not use up the stop.
  const S = IP.SCENES.lowater_after;
  const ev = { id: 'scene_lowater', title: S.title, text: S.text, choices: S.choices };
  RUN.seen.scene_lowater = true;
  const choices = ev.choices();
  STAGE().innerHTML = `<section class="scene event"><h2>${S.title}</h2><div class="prose" id="prose"></div><div class="choices" id="ch"></div></section>`;
  revealText($('#prose'), S.text(), () => {
    choices.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'btn choice';
      b.innerHTML = `<span class="n">${i + 1}</span><span>${IP.esc(c.t)}</span>`;
      b.addEventListener('click', () => { const r = c.go(); if (r.scene === 'lostprop') return lostProperty(lowaterAfter); resolve(S.title, r, nextLeg); });
      $('#ch').appendChild(b);
    });
  });
}
function nextLeg() {
  RUN.leg++;
  RUN.map = IP.genMap(RUN.leg); RUN.node = RUN.map.start; RUN.path = [RUN.node]; RUN.map.nodes[RUN.node].done = true;
  RUN.quiet = -1.5 - (RUN.leg === 3 ? 0 : 0.3); RUN.night = false;
  let sab = '', sl = [];
  if (RUN.leg === 3 && IP.alive('tull') && !RUN.flags.tullTurned) {
    sab = '\n\nIn the night, someone opened the stores and salted half the provisions with something fine and grey. Dr. Tull is very helpful about it. He says it looks like mould. It does not look like mould.';
    sl = IP.fx({ prov: -Math.ceil(RUN.res.prov / 2), att: 2 });
  }
  IP.save();
  result(IP.LEGS[RUN.leg].name, RUN.leg === 2
    ? 'Past Harrow’s Cross the prairie gives way to floodland. Water stands in the fields in walls and blocks and columns, perfectly still, fish hanging in it. The Pilgrim runs along the embankment between walls of water, like a train in a corridor.'
    : 'Past Lowater the sky comes down. Not cloud: sky. A grey ceiling, low enough that the passengers duck when they walk the aisle. It hums. Under it, the line runs straight toward Hinge Bridge.' + sab, sl, () => showMap());
}

/* ---------- Hinge Bridge ---------- */
function hinge(step) {
  RUN.screen = 'legend';
  if (step === 0) {
    return result('Hinge Bridge', 'The Hinge Bridge crosses the Throat: a gorge so deep the bottom is a rumour. On the far side, under the low sky, the lights of Sallow Haven.\n\nOdile slows to a crawl at the bridgehead. The rails ahead are wet. Something is climbing up the trestle out of the gorge, something long, something that has been waiting under this bridge since 1929.', RUN.pendingNotes || [], () =>
      fight(Object.assign({ title: 'Hinge Bridge', boss: true, reward: { lore: 3 } }, IP.BOSSES.hinge), () => hinge(1)), 'Fight');
  }
  if (step === 1) return vaneStandoff(() => hinge(2), 'With the tendril gone, Vane walks up the train to Coach. He breaks the seal on his envelope and reads it without expression.');
  if (step === 2) {
    const ev = { id: 'hinge_choice', title: 'The Bridge', text: () => 'The bridge is clear. Sallow Haven is a mile away across the gorge, every window lit, every clock in every tower stopped at the same time.' + (IP.knows('ashby3') ? '\n\nAshby wrote: don’t cut it. Unmake it.' : ''),
      choices: () => [
        { t: 'Cross to Sallow Haven', go: () => ({ end: 'sallow' }) },
        { t: 'Blow the bridge with the Pilgrim on it', req: () => (RUN.items.dynamite || 0) > 0, why: 'Needs dynamite', go: () => ({ end: 'cut' }) }
      ] };
    return runEventCustom(ev, null);
  }
}
function vaneStandoff(then, lead) {
  if (!(IP.alive('vane') && IP.alive('constance') && !RUN.flags.vaneTurned)) return then();
  const ev = { id: 'vane_' + RUN.leg, title: 'Open at Hinge Bridge', text: () => lead + ' Then he puts it away and unslings his rifle and looks at Mrs. Reed.\n\n“Ma’am,” he says. “I’ll ask you to step off the train.”',
    choices: () => [
      { t: '“I know what your orders say, Vane. Don’t.”', req: () => IP.knows('vane_orders'), why: 'You would need to know what they say', go: () => {
        if (RUN.crew.vane.trust >= 1) { RUN.flags.vaneTurned = true; return { text: 'He looks at you a long time. “How could you know that?” You tell him: the coat, the knots, the bell-cord. He believes you, which frightens him more than anything else has. He lowers the rifle.', fx: { trust: { vane: 2 } } }; }
        return { text: '“Then you know I don’t have a choice.” He doesn’t trust you enough. The shot is very loud in the coach.', fx: { att: 2 }, kill: 'constance' };
      } },
      { t: 'Step between them', go: () => {
        if (IP.alive('jonah')) return { text: 'Before you can move, Jonah is there, filling the aisle. The shot takes him in the chest. He looks down at it with mild interest, takes the rifle out of Vane’s hands and bends the barrel. Vane sits down on the floor. At the next chance, he walks off into the dark without his badge.', fx: { hp: { jonah: -6 }, trust: { jonah: 2 } }, vaneOut: true };
        return { text: 'You step into the aisle. Vane hesitates, and in that second Mrs. Reed goes out the far door and up onto the roof. When the shot comes it is not at you. You do not see where she lands. You never find out.', fx: { att: 1 }, kill: 'constance' };
      } },
      { t: 'Let the Company have its way', go: () => ({ text: 'You look away. The shot is very loud in the coach. Afterwards Vane closes her eyes for her, which you did not expect.', fx: { att: 2, nerveAll: -2 }, kill: 'constance' }) }
    ] };
  runEventCustom(ev, then);
}
function runEventCustom(ev, then) {
  RUN.seen[ev.id] = true;
  const choices = ev.choices();
  STAGE().innerHTML = `<section class="scene event"><h2>${IP.esc(ev.title)}</h2><div class="prose" id="prose"></div><div class="choices" id="ch"></div></section>`;
  revealText($('#prose'), IP.fill(ev.text()), () => {
    choices.forEach((c, i) => {
      const ok = !c.req || c.req();
      const b = document.createElement('button'); b.className = 'btn choice'; b.disabled = !ok;
      b.innerHTML = `<span class="n">${i + 1}</span><span>${IP.esc(c.t)}${!ok && c.why ? `<em>${IP.esc(c.why)}</em>` : ''}</span>`;
      b.addEventListener('click', () => {
        IP.audio.sfx('click');
        const r = c.go();
        if (r.end) return ending(r.end);
        if (r.kill && IP.alive(r.kill)) { RUN.crew[r.kill].alive = false; RUN.deaths.push(r.kill); }
        if (r.vaneOut && IP.alive('vane')) { RUN.crew.vane.alive = false; RUN.flags.vaneLeft = true; }
        result(ev.title, r.text, IP.fx(r.fx), then);
      });
      $('#ch').appendChild(b);
    });
  });
}

/* ---------- Spur IX & the Unbuilt Station ---------- */
function spurNode() {
  result('Spur IX', 'Odile throws the points herself, with her whole weight, and the Pilgrim leans left off the main line onto rails that appear on none of your maps.\n\nThe Lid lifts. For the first time in days you can see a strip of real sky at the horizon, pale green, like the moment before a dawn. The rails are bright and new. Nobody has ever laid them.\n\nIn Car Zero, the counting has become very fast.', RUN.pendingNotes || [], () => { RUN.night = true; showMap(); });
}
function finale(step) {
  RUN.screen = 'legend'; IP.save(); dock(false);
  const A = IP.alive;
  if (step === 0) return result('The Unbuilt Station', 'The spur ends at a platform with no station on it. A single lamp-post. A clock with no hands. Beyond it, the rails simply stop, as if whoever was laying them put down their tools one evening and never came back.\n\nThe Pilgrim stops. Her engine goes on idling. Then, for the first time since Calder Yard, it goes quiet.\n\nBehind the tender, Car Zero’s welded coupling is glowing a dull red.', [], () => vaneStandoff(() => finale(1), 'Vane has been reading something by the lamp-post: his envelope, opened early. Nobody told him the line would end here.'), 'Go back to Car Zero');
  if (step === 1) {
    if (!A('constance')) { IP.learn('blood_door'); return result('Car Zero', 'You put your shoulder to the door of Car Zero. Jonah puts his shoulder to it. It does not move.\n\nFrom inside, a voice, very kind, like an old man reading to a child: “Only blood opens a Halvorsen door, Conductor. You know that. You will next time.”\n\nThe clock with no hands begins to tick.', [], () => death('unbuilt'), 'Listen to it tick'); }
    return result('Car Zero', 'Constance Halvorsen walks the length of the train with her cello case and sets it down by the door of Car Zero. She puts her palm flat on the iron.\n\nThe welded coupling sighs like a sleeper turning over. The door opens inward, the way a door opens for someone it has been expecting since 1911.\n\nInside is not a car. Inside is a man the size of a room. Augustin Halvorsen has grown into the walls: his ribs are the rafters, his breath moves the curtains, a surveyor’s chain runs out of his hand and into the floor and, you understand, all the way down the line. His eyes are open. They are very kind.\n\n“Connie,” he says.', [], () => finale(2), 'Listen');
  }
  if (step === 2) {
    const tull = RUN.flags.tullTurned && A('tull');
    return result('Augustin', '“You came to see the end of the line.”\n\n“I came to see whether you were kind once,” she says. “Mother said you were.”\n\n“I was. I am. I gave the world an end, child. Everything wants to arrive. Every grief, every war, every ache of every waiting room. I surveyed the route and the route was a promise, and the promise was kept at 11:07.” He looks at you. “Your conductor has been very punctual. ' + IP.knot() + ' times punctual.”' + (tull ? '\n\nBehind you, Dr. Tull says quietly: “He believes it. I believed it too.”' : ''), [], () => finale(3), 'Continue');
  }
  if (step === 3) {
    if (!RUN.items.fork) { IP.learn('need_fork'); return result('The Clock', '“And what will you answer the clock with?” Augustin asks gently. “You have come all this way with empty hands.”\n\nYou have nothing. The clock with no hands begins to tick. Somewhere a long way behind you, Lost Property keeps what you did not claim.', [], () => death('unbuilt'), 'Listen to it tick'); }
    if (!A('wren')) { IP.learn('need_wren'); return result('The Note', 'You take out the tuning fork. It hums in your hand. You strike it against the rail and the note goes out, and it is wrong. Of course it is wrong. Wren would have known which note. Wren heard it every night in her bad ear.\n\nAugustin closes his eyes, almost sorry for you. The clock begins to tick.', [], () => death('unbuilt'), 'Listen to it tick'); }
    const ev = { id: 'final', title: 'The Note', text: () => '“Conductor.” Wren is at your elbow with her notebook open, white as the paper. “The numbers. They’re not just letters. It’s a pitch. Eleven-oh-seven is out of tune. That’s all it ever was. Somebody tuned the whole line a hair off true, and it’s been ringing ever since, and the ringing is what’s wrong with everything.”\n\nShe looks at the fork in your hand. Augustin looks at it too.\n\n“Give it to me, Conductor,” he says, so kindly. “I will keep it safe. I keep everything.”',
      choices: () => [
        { t: 'Strike the fork on the rail', go: () => ({ end: 'spur' }) },
        { t: 'Give him the fork', go: () => ({ end: 'stationmaster_fork' }) }
      ] };
    return runEventCustom(ev, null);
  }
}

/* ---------- endings ---------- */
function ending(kind) {
  RUN.screen = 'ending'; dock(false); IP.hud(); IP.audio.ambient(kind === 'spur' ? 'silent' : 'night');
  let title, text, key, loop = true;
  const A = IP.alive;
  if (kind === 'sallow') {
    if (RUN.att >= 8) {
      const ev = { id: 'sallow', title: 'Sallow Haven', text: () => 'The station at Sallow Haven is perfect. Brass rails polished to mirrors, benches without a scratch. Every clock on every wall reads 11:07, and every one of them is ticking.\n\nThere is no one here but a porter in Company grey, who comes down the platform holding a cap in both hands, the way you would hold a crown.\n\n“You have been watched, Conductor,” he says. “You have been found punctual. The Stationmaster’s post is vacant.”',
        choices: () => [{ t: 'Take the cap', go: () => ({ end: 'stationmaster' }) }, { t: 'Hand him your ticket instead', go: () => ({ end: 'arrival' }) }] };
      return runEventCustom(ev, null);
    }
    kind = 'arrival';
  }
  if (kind === 'arrival') {
    key = 'arrival'; title = 'Arrival'; META.docs.porter = 1;
    text = 'The station at Sallow Haven is perfect. Brass rails polished to mirrors. Benches without a scratch. Every clock on every wall reads 11:07, and every one of them is ticking.\n\nThere is no one here.\n\nA porter in Company grey comes down the platform. He takes your ticket, punches it twice, and gives it back to you.\n\nADMIT ONE. RETURN JOURNEY.\n\nBehind you the Pilgrim’s whistle blows. The doors close. You are already moving.\n\nSomewhere in the bell-cord, a knot pulls tight.';
  }
  if (kind === 'cut') {
    key = 'cut'; title = 'The Line Is Cut';
    text = 'You put the passengers off at the near end of the bridge with what food there is.' + (A('constance') ? ' Mrs. Reed stays on the platform with her cello case, looking at Car Zero until it is out of sight.' : '') + '\n\n' + (A('odile') ? 'Odile takes the Pilgrim out onto the bridge at walking pace, alone, because she will not let anybody else drive her.' : 'You take the Pilgrim out onto the bridge yourself, at walking pace.') + ' The fuse burns. The Hinge Bridge comes apart in the middle like a book closing, and the Iron Pilgrim goes down into the Throat with every lamp lit.\n\nAcross the Meridian, every clock jumps forward one minute.\n\nFor a while, nothing is due.\n\nSix weeks later, a tall man with a measuring chain over his shoulder is seen walking the rim of the gorge, taking careful notes.';
  }
  if (kind === 'stationmaster' || kind === 'stationmaster_fork') {
    key = 'stationmaster'; title = 'Stationmaster';
    text = (kind === 'stationmaster_fork' ? 'You hold out the fork. Augustin takes it in a hand that is mostly chain, and closes the hand, and the fork is gone. Wren makes a small sound, like a door shutting.\n\n“Thank you,” he says. “You will want this.” He gives you a cap.\n\n' : 'The cap is Company grey with a brass badge: STATIONMASTER.\n\n') + '“It fits,” you are told, before you have put it on. It does.\n\nFrom the stationmaster’s window you can see the whole line: every halt, every water tower, every knot. You understand the timetable now. You understand that it is beautiful.\n\nAt 11:07 exactly, the Terminus arrives.\n\nYou are there to meet it. You are punctual. The Company thanks you.';
  }
  if (kind === 'spur') {
    key = 'spur'; title = 'Spur Nine'; loop = false;
    const lines = [];
    lines.push('You strike the fork on the bright new rail.\n\nThe note is very small. It runs down the spur and onto the main line and round. You hear it pass Hinge Bridge, and Lowater, and Harrow’s Cross, and Calder Yard. It goes round once for every knot, ' + IP.knot() + ' times, and every time it passes, one comes undone.');
    lines.push('In Car Zero, Augustin Halvorsen lets out a breath he has been holding since 1929. Constance holds his hand until it is over. Afterwards she sits on the step of the car with her cello and plays something low and ordinary.');
    lines.push('Across the Meridian, every clock ticks over to 11:08.');
    if (A('odile')) lines.push(IP.knows('luca_false') && RUN.flags.lucaTold ? 'Odile switches off the radio herself. Then, for the first time in two years, she cries the ordinary way, and after that she asks what there is for breakfast.' : 'Odile turns on the radio. There is nothing on 1290 at all. She listens to the nothing for a long time, and you watch her understand, and let go.');
    if (A('jonah')) lines.push(IP.knows('jonah_watch') ? 'Jonah opens his mouth. He says your name, out loud, in your own voice. He says it like he is giving something back. Then he is not there, and the lamps are trimmed, and on the slate it says: THANK YOU.' : 'Jonah sets down his oil can. He looks at you like someone looking in a mirror, smiles, and walks off down the spur toward the green sky. He does not take his slate.');
    if (A('wren')) lines.push('Wren takes off her earphones. There is nothing in her bad ear at all. She says it is the best thing she has ever heard.');
    if (A('tull')) lines.push(RUN.flags.tullTurned ? 'Dr. Tull takes off his cufflinks and drops them between the rails. He sits on the edge of the platform and laughs until he has to wipe his eyes.' : 'Dr. Tull stands very still for a long time. Then he takes off his cufflinks and puts them in his pocket, which is something.');
    if (A('vane')) lines.push('Vane unpins his Company badge and leaves it on the lamp-post.');
    lines.push('The Iron Pilgrim never reaches Sallow Haven.\n\nThere is no need.');
    text = lines.join('\n\n');
  }
  META.endings[key] = (META.endings[key] || 0) + 1;
  if (loop) META.knots++;
  const cls = 'ending e-' + key;
  STAGE().innerHTML = `<section class="scene ${cls}"><div class="end-mark">${loop ? 'A knot pulls tight' : 'The last knot comes undone'}</div><h2>${title}</h2><div class="prose" id="prose"></div><div class="choices" id="ch"></div></section>`;
  if (kind === 'spur') IP.audio.sfx('bell');
  RUN.screen = 'ending'; const done = RUN; RUN = null; IP.save();
  revealText($('#prose'), IP.fill(text), () => {
    $('#ch').innerHTML = `<p class="muted">${loop ? `Ending: ${title}. ${META.knots} knot${META.knots === 1 ? '' : 's'} in the bell-cord. What you learned is in the archive.` : 'THE END. The ledger is closed. You may ride again; the line remembers you.'}</p><button class="btn primary" id="again">${loop ? 'Wake at Calder Yard' : 'Ride again'}</button>`;
    $('#again').addEventListener('click', () => { IP.audio.sfx('click'); newRun(); intro(0); });
  });
}
function death(why) {
  RUN.screen = 'dead'; dock(false); IP.audio.combat(false); IP.audio.ambient('night');
  const T = {
    hull: ['Broken Open', 'The Pilgrim’s plates give all at once, and the night comes in through every seam, and the last thing you hear is Odile still trying the throttle.'],
    crew: ['No One Left', 'There is no one left on the train who can hold a lamp. You walk the cars alone with the last of the oil until it runs out.'],
    fuel: ['Stranded', 'With the tender dry, the Pilgrim stands on the line with her lamps lit, and the Quiet comes up the track at a walking pace. It is in no hurry. It is never in a hurry.'],
    quiet: ['The Quiet', 'The Quiet overtakes the Pilgrim between one clack of the wheels and the next. There is no sound after that. There is no after that.'],
    unbuilt: ['The Clock Ticks', 'The clock with no hands ticks once. It is very loud. It is 11:07.']
  }[why] || ['Lost', 'The line takes you.'];
  META.knots++; const k = META.knots; RUN = null; IP.save();
  STAGE().innerHTML = `<section class="scene ending e-dead"><div class="end-mark">A knot pulls tight</div><h2>${T[0]}</h2><div class="prose" id="prose"></div><div class="choices" id="ch"></div></section>`;
  revealText($('#prose'), T[1] + '\n\nYou wake at Calder Yard at six in the morning with a telegram in your pocket. Someone has tied a knot in the bell-cord. You don’t remember doing it.', () => {
    $('#ch').innerHTML = `<p class="muted">${k} knot${k === 1 ? '' : 's'} in the bell-cord. What you learned is in the archive. The train does not remember. You do.</p><button class="btn primary" id="again">Board the Pilgrim</button>`;
    $('#again').addEventListener('click', () => { IP.audio.sfx('click'); newRun(); intro(0); });
  });
}

/* ---------------- boot ---------------- */
function bindChrome() {
  document.querySelectorAll('#dock button').forEach(b => b.addEventListener('click', () => {
    if (!RUN) return;
    const k = b.dataset.sheet; const sh = $('#sheet');
    if (!sh.hidden && sh.dataset.kind === k) return closeSheet();
    if (!sh.hidden) closeSheet();
    openSheet(k);
  }));
  const snd = $('#snd');
  const upd = () => { snd.setAttribute('aria-pressed', IP.audio.muted() ? 'true' : 'false'); snd.textContent = IP.audio.muted() ? 'Sound off' : 'Sound on'; };
  snd.addEventListener('click', () => { IP.audio.init(); IP.audio.setMuted(!IP.audio.muted()); upd(); });
  upd();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if (/^[1-9]$/.test(e.key) && !e.target.matches('input')) { const b = document.querySelectorAll('#ch .btn.choice, .choices .btn.choice')[+e.key - 1]; if (b && !b.disabled) b.click(); }
  });
  const lines = ['the line is waiting', 'Car Zero is counting', 'come back, Conductor', '11:07', 'the lamps are going out', 'someone is in your seat'];
  let ti = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && RUN && RUN.moves > 0) { document.title = lines[ti++ % lines.length]; }
    else document.title = 'Iron Pilgrim';
  });
}
async function boot() {
  bindChrome();
  META = newMeta();
  title(true);
  await Promise.race([initStore(), new Promise(r => setTimeout(r, 4500))]);
  await load();
  if (RUN && RUN.screen === 'combat') { RUN.screen = 'map'; RUN.leftInDark = true; }
  if (RUN && RUN.screen === 'event') RUN.screen = 'map';
  title(false);
}
boot();
})();
