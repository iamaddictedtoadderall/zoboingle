'use strict';
/* Route map: generation and the ink-on-paper SVG table. */
(function () {
const NAMES = {
  1: ['Ashgrove', 'Kessel Siding', 'Dunmore', 'Halt Nine', 'Pruitt', 'Coldwater Tank', 'Bellmouth', 'Sayer’s Mill', 'Old Granary', 'Tolland', 'Rook Crossing', 'Fallow', 'Cinder Halt', 'Merritt', 'Gallows Bend', 'Pike Bluff', 'Shiloh Bins', 'Ebbet'],
  2: ['Mercy', 'Stillwell', 'Drowned Ford', 'Pellam', 'Lake Halt', 'Saltmarsh', 'Weir Six', 'Upright', 'Brindle', 'Ferris Landing', 'Low Chapel', 'Glass Creek', 'Heron', 'Moss Siding', 'Sounding', 'Carrow'],
  3: ['Bentneck', 'Grey Halt', 'Ceiling Creek', 'Stoop', 'Underhill', 'Lamplight', 'Low Sky', 'Hollin', 'Last Water', 'Ironmark', 'Tether', 'Bowhead', 'Crook', 'Vesper']
};
const TYPES = {
  station: { label: 'Station', hint: 'Shop, rest, repairs, telegraph.' },
  depot: { label: 'Water Tower', hint: 'Fuel, usually.' },
  town: { label: 'Town', hint: 'People. Trade. Trouble.' },
  wreck: { label: 'Wreck', hint: 'Salvage, for a risk.' },
  signal: { label: 'Signal Box', hint: 'Radio traffic. Records.' },
  shrine: { label: 'Shrine', hint: 'Lore, for a price.' },
  ambush: { label: 'Cutting', hint: 'Something waits in the cutting.' },
  unknown: { label: 'Unknown', hint: 'Unmapped since the Hush.' },
  start: { label: 'Departure', hint: '' },
  end: { label: 'Terminal', hint: 'End of this leg.' },
  pillars: { label: 'The Pillars', hint: 'Where the sky comes down.' },
  spur: { label: 'Spur IX', hint: 'Not on any Company map.' },
  unbuilt: { label: 'The Unbuilt Station', hint: '' }
};
IP.NODE_TYPES = TYPES;

function weighted(w) {
  let t = 0; for (const k in w) t += w[k];
  let r = Math.random() * t;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return Object.keys(w)[0];
}

IP.genMap = function (leg) {
  const names = IP.shuffle(NAMES[leg]);
  let ni = 0;
  const nodes = {}, cols = [];
  const W = { unknown: 3, town: 2, wreck: 2, depot: 2.2, signal: 1, shrine: 1, ambush: 1 + leg * 0.4 };
  const mk = (c, type, y, name) => {
    const id = 'n' + c + '_' + cols[c].length;
    nodes[id] = { id, col: c, type, y, x: 60 + c * (680 / 7), name: name || names[ni++ % names.length], links: [], done: false };
    cols[c].push(id); return nodes[id];
  };
  for (let c = 0; c <= 7; c++) {
    cols[c] = [];
    if (c === 0) { mk(c, 'start', 210, IP.LEGS[leg].start); continue; }
    if (c === 7) { mk(c, 'end', 210, IP.LEGS[leg].end); continue; }
    const n = c === 1 ? 2 : (Math.random() < 0.3 ? 4 : 3) - (Math.random() < 0.2 ? 1 : 0);
    const ys = [];
    for (let i = 0; i < n; i++) ys.push(70 + (i + 0.5) * (280 / n) + (Math.random() - 0.5) * 30);
    ys.forEach(y => mk(c, weighted(W), y));
  }
  // guarantees
  const set = (c, type) => { const id = IP.pick(cols[c]); nodes[id].type = type; return nodes[id]; };
  set(Math.random() < 0.5 ? 3 : 4, 'station');
  if (Math.random() < 0.6) set(6, 'station');
  if (!cols[2].some(i => nodes[i].type === 'depot')) set(2, 'depot');
  if (!cols[5].some(i => ['depot', 'station'].includes(nodes[i].type))) set(5, 'depot');
  if (leg === 3) {
    const p = set(4, 'pillars'); p.name = 'The Pillars';
  }
  // links
  for (let c = 0; c < 7; c++) {
    const a = cols[c].map(i => nodes[i]).sort((p, q) => p.y - q.y);
    const b = cols[c + 1].map(i => nodes[i]).sort((p, q) => p.y - q.y);
    a.forEach((n, i) => {
      const j = a.length === 1 ? Math.floor(b.length / 2) : Math.round(i * (b.length - 1) / (a.length - 1));
      n.links.push(b[j].id);
      if (b.length > 1 && Math.random() < 0.45) { const k = Math.min(b.length - 1, Math.max(0, j + (Math.random() < 0.5 ? -1 : 1))); if (!n.links.includes(b[k].id)) n.links.push(b[k].id); }
      if (a.length === 1) b.forEach(x => { if (!n.links.includes(x.id)) n.links.push(x.id); });
    });
    b.forEach(x => {
      if (!a.some(n => n.links.includes(x.id))) {
        const near = a.reduce((m, n) => Math.abs(n.y - x.y) < Math.abs(m.y - x.y) ? n : m, a[0]);
        near.links.push(x.id);
      }
    });
  }
  // the secret spur
  if (leg === 3 && IP.knows('spur_known')) {
    const p = Object.values(nodes).find(n => n.type === 'pillars');
    cols[5].push('spur'); cols[6].push('unbuilt');
    nodes.spur = { id: 'spur', col: 5, type: 'spur', y: 395, x: 60 + 5 * (680 / 7) - 20, name: 'Spur IX', links: ['unbuilt'], done: false, secret: true };
    nodes.unbuilt = { id: 'unbuilt', col: 6, type: 'unbuilt', y: 400, x: 60 + 6 * (680 / 7) + 10, name: 'The Unbuilt Station', links: [], done: false, secret: true };
    p.links.push('spur');
  }
  return { nodes, cols, start: cols[0][0] };
};

/* ---------- rendering ---------- */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function glyph(g, type, x, y) {
  const s = { stroke: 'currentColor', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' };
  switch (type) {
    case 'station': case 'start': el('path', { d: `M${x - 7} ${y + 5}V${y - 1}L${x} ${y - 7}L${x + 7} ${y - 1}V${y + 5}Z M${x - 2} ${y + 5}V${y + 1}H${x + 2}V${y + 5}`, ...s }, g); break;
    case 'depot': el('circle', { cx: x, cy: y - 3, r: 4.5, ...s }, g); el('path', { d: `M${x - 4} ${y + 1}L${x - 6} ${y + 7}M${x + 4} ${y + 1}L${x + 6} ${y + 7}M${x} ${y + 1.5}V${y + 7}`, ...s }, g); break;
    case 'town': el('path', { d: `M${x - 8} ${y + 6}V${y - 1}H${x - 3}V${y + 6}M${x - 2} ${y + 6}V${y - 6}H${x + 3}V${y + 6}M${x + 4} ${y + 6}V${y + 1}H${x + 8}V${y + 6}`, ...s }, g); break;
    case 'wreck': el('path', { d: `M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}`, ...s }, g); break;
    case 'signal': el('path', { d: `M${x} ${y + 7}V${y - 2}`, ...s }, g); el('circle', { cx: x, cy: y - 5, r: 3, ...s }, g); el('path', { d: `M${x} ${y - 2}L${x + 6} ${y - 6}`, ...s }, g); break;
    case 'shrine': case 'pillars': el('path', { d: `M${x - 3} ${y - 8}V${y + 8}M${x + 3} ${y - 8}V${y + 8}`, ...s }, g); el('circle', { cx: x, cy: y, r: 6, ...s }, g); break;
    case 'ambush': el('path', { d: `M${x - 7} ${y + 5}L${x - 2} ${y - 6}L${x + 1} ${y}L${x + 4} ${y - 4}L${x + 8} ${y + 5}Z`, ...s }, g); break;
    case 'end': el('circle', { cx: x, cy: y, r: 7, ...s }, g); el('circle', { cx: x, cy: y, r: 2.5, fill: 'currentColor' }, g); break;
    case 'spur': case 'unbuilt': el('path', { d: `M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`, ...s }, g); el('circle', { cx: x, cy: y, r: 7, ...s, 'stroke-dasharray': '2 2' }, g); break;
    default: { const t = el('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, fill: 'currentColor', 'font-family': 'IM Fell English, Georgia, serif' }, g); t.textContent = '?'; }
  }
}

IP.renderMap = function (host, run, onPick) {
  host.innerHTML = '';
  const map = run.map, cur = map.nodes[run.node];
  const svg = el('svg', { viewBox: '0 0 800 430', class: 'mapsvg', role: 'img', 'aria-label': 'Route map of ' + IP.LEGS[run.leg].name }, host);
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'quietg', x1: 0, x2: 1 }, defs);
  el('stop', { offset: 0, style: 'stop-color:var(--quiet);stop-opacity:.85' }, lg);
  el('stop', { offset: 0.8, style: 'stop-color:var(--quiet);stop-opacity:.55' }, lg);
  el('stop', { offset: 1, style: 'stop-color:var(--quiet);stop-opacity:0' }, lg);
  const filt = el('filter', { id: 'rough' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.04, numOctaves: 2, seed: 7 }, filt);
  el('feDisplacementMap', { in: 'SourceGraphic', scale: 18 }, filt);

  // grid / survey marks
  const grid = el('g', { class: 'grid' }, svg);
  for (let c = 0; c <= 7; c++) { const x = 60 + c * (680 / 7); el('line', { x1: x, y1: 24, x2: x, y2: 408 }, grid); const t = el('text', { x, y: 18, 'text-anchor': 'middle' }, grid); t.textContent = 'MP ' + ((run.leg - 1) * 7 + c) * 40; }

  // edges
  const reach = cur ? cur.links : [];
  const eg = el('g', {}, svg);
  Object.values(map.nodes).forEach(n => n.links.forEach(t => {
    const m = map.nodes[t];
    const travelled = n.done && (m.done || m.id === run.node) && run.path.includes(n.id) && run.path.includes(m.id);
    const live = n.id === run.node;
    const mx = (n.x + m.x) / 2;
    const d = `M${n.x} ${n.y}C${mx} ${n.y} ${mx} ${m.y} ${m.x} ${m.y}`;
    const cls = 'track' + (travelled ? ' done' : '') + (live ? ' live' : '') + (m.secret ? ' secret' : '');
    el('path', { d, class: cls + ' ties' }, eg);
    el('path', { d, class: cls + ' rail' }, eg);
  }));

  // nodes
  const ng = el('g', {}, svg);
  Object.values(map.nodes).forEach(n => {
    const can = reach.includes(n.id) && !run.busy;
    const g = el('g', { class: 'node t-' + n.type + (n.id === run.node ? ' here' : '') + (n.done ? ' done' : '') + (can ? ' can' : ''), tabindex: can ? 0 : -1, role: can ? 'button' : 'img', 'aria-label': n.name + ', ' + TYPES[n.type].label + (can ? ', reachable' : '') }, ng);
    el('circle', { cx: n.x, cy: n.y, r: n.type === 'end' || n.type === 'start' ? 17 : 15, class: 'disc' }, g);
    glyph(g, n.type, n.x, n.y);
    const lbl = el('text', { x: n.x, y: n.y + 31, 'text-anchor': 'middle', class: 'nlabel' }, g);
    lbl.textContent = n.name;
    if (can) {
      g.addEventListener('click', () => onPick(n.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(n.id); } });
    }
  });

  // the Quiet
  const qx = Math.max(0, 60 + run.quiet * (680 / 7));
  if (qx > 0) {
    const q = el('g', { class: 'quiet' }, svg);
    el('rect', { x: -40, y: 0, width: qx + 40, height: 430, fill: 'url(#quietg)', filter: 'url(#rough)' }, q);
    const t = el('text', { x: Math.max(18, qx - 30), y: 412, 'text-anchor': 'end', class: 'qlabel' }, q);
    t.textContent = 'THE QUIET';
  }
  // train marker
  if (cur) {
    const tm = el('g', { class: 'trainmark' }, svg);
    el('path', { d: `M${cur.x - 9} ${cur.y - 26}h18v8h-18z M${cur.x - 5} ${cur.y - 18}v3 M${cur.x + 5} ${cur.y - 18}v3`, class: 'tm' }, tm);
  }
  return svg;
};
})();
