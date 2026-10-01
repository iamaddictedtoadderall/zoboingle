'use strict';
/* Boarding fights. The train is a line of cars; crew and things stand in cars.
   Every enemy shows its next move. You act, then they do. */
(function () {
let C = null;
let FUID = 1;
const ATK_LABEL = { strike: 'Strike', lunge: 'Lunge', whisper: 'Whisper', tear: 'Tear', devour: 'Devour light', seize: 'Seize', conduct: 'Conduct', crush: 'Crush', reach: 'Reach', move: 'Advance', stunned: 'Stunned' };

function last() { return C.cars.length - 1; }
function crewAt(i) { return C.units.filter(u => u.pos === i); }
function foesAt(i) { return C.foes.filter(f => f.pos === i); }
function cdata(u) { return IP.run().crew[u.id]; }
function isZero(i) { return C.cars[i] === 'zero'; }
function log(s) { C.log.unshift(s); if (C.log.length > 30) C.log.pop(); }
function stepToward(from, to, n) {
  let p = from;
  for (let k = 0; k < n && p !== to; k++) {
    let q = p + Math.sign(to - p);
    if (isZero(q)) q += Math.sign(to - p);
    if (q < 0 || q > last()) break;
    if (C.sealed.has(q)) break;
    p = q;
  }
  return p;
}
function nearestCrewPos(from) {
  let best = null, bd = 99;
  C.units.forEach(u => { const d = Math.abs(u.pos - from); if (d < bd) { bd = d; best = u.pos; } });
  return best;
}
function mkFoe(type, pos) {
  const d = IP.ENEMIES[type];
  return { uid: FUID++, type, hp: d.hp, maxHp: d.hp, pos, intent: null, stun: false };
}
function spawnPos(type) {
  const L = last();
  const z = C.cars.indexOf('zero');
  if (type === 'tendril') return L;
  if (type === 'tick' && Math.random() < 0.3) return C.cars.indexOf('tender');
  const opts = [];
  for (let i = Math.max(z + 1, 1); i <= L; i++) for (let w = 0; w <= i - z; w++) opts.push(i);
  if (Math.random() < 0.15) opts.push(1);
  return IP.pick(opts);
}

IP.startCombat = function (spec, done) {
  const run = IP.run();
  const cars = run.cars.slice();
  C = {
    spec, done, cars, units: [], foes: [], turn: 0, night: !!spec.night, dawn: spec.dawn || 6,
    waves: spec.waves || {}, sel: null, mode: null, covered: new Set(), sealed: new Set(), jammed: false,
    used: {}, riteUsed: false, log: [], over: false, boss: !!spec.boss
  };
  const idx = k => cars.indexOf(k);
  const z = idx('zero');
  const firstAfter = () => Math.min(z + 1, cars.length - 1);
  const place = { odile: 0, jonah: idx('lamp'), wren: idx('radio'), tull: idx('infirmary') >= 0 ? idx('infirmary') : firstAfter(), vane: idx('armory') >= 0 ? idx('armory') : cars.length - 1, constance: idx('coach') };
  IP.crewInCombat().forEach(id => {
    let p = place[id]; if (p == null || p < 0) p = firstAfter();
    C.units.push({ id, pos: p, moved: false, acted: false, broken: false, standing: false, cd: 0 });
  });
  spec.list.forEach(t => C.foes.push(mkFoe(t, spawnPos(t))));
  log(spec.night ? 'Night. Something is on the roof.' : 'They are on the train.');
  IP.audio.combat(true);
  startTurn();
};

function startTurn() {
  C.turn++;
  const w = C.waves[C.turn];
  if (w && C.turn > 1) { w.forEach(t => C.foes.push(mkFoe(t, spawnPos(t)))); log('More of them climb aboard.'); IP.audio.sfx('thud'); }
  C.units.forEach(u => {
    u.moved = false; u.acted = false; u.standing = false; if (u.cd > 0) u.cd--;
    const cd = cdata(u); u.broken = !IP.CREW[u.id].steady && cd.nerve <= 0;
    if (u.broken) { log(IP.CREW[u.id].short + ' is broken and cannot act.'); u.moved = u.acted = true; }
  });
  C.covered.clear(); C.sealed.clear(); C.jammed = false; C.riteUsed = false; C.mode = null;
  C.foes.forEach(plan);
  if (!C.sel || !C.units.find(u => u.id === C.sel)) C.sel = (C.units.find(u => !u.broken) || C.units[0] || {}).id || null;
  render();
}

function plan(f) {
  const np = nearestCrewPos(f.pos);
  const dist = np == null ? 99 : Math.abs(np - f.pos);
  const lamp = C.cars.indexOf('lamp');
  switch (f.type) {
    case 'hollow': f.intent = crewAt(f.pos).length ? { kind: 'strike', dmg: 2 } : { kind: 'move', to: stepToward(f.pos, np ?? 0, 1) }; break;
    case 'hound': f.intent = dist <= 2 && np != null ? { kind: 'lunge', car: np, dmg: 3 } : { kind: 'move', to: stepToward(f.pos, np ?? 0, 2) }; break;
    case 'choir': f.intent = dist <= 1 ? { kind: 'whisper', amt: 2 } : { kind: 'move', to: stepToward(f.pos, np ?? 0, 1) }; break;
    case 'tick': f.intent = { kind: 'tear', dmg: 2 }; break;
    case 'lantern':
      if (lamp < 0) f.intent = crewAt(f.pos).length ? { kind: 'strike', dmg: 1 } : { kind: 'move', to: stepToward(f.pos, np ?? 0, 1) };
      else f.intent = f.pos === lamp ? { kind: 'devour' } : { kind: 'move', to: stepToward(f.pos, lamp, 1) };
      break;
    case 'porter': f.intent = crewAt(f.pos).length ? { kind: 'seize', dmg: 2 } : { kind: 'move', to: stepToward(f.pos, np ?? 0, 1) }; break;
    case 'master': f.intent = { kind: 'conduct', amt: 1, summon: C.turn % 2 === 0 }; break;
    case 'tendril': {
      if (C.turn % 2 === 1) {
        const cands = [f.pos, f.pos - 1, f.pos - 2].filter(i => i >= 0 && !isZero(i));
        const car = cands.sort((a, b) => crewAt(b).length - crewAt(a).length)[0];
        f.intent = { kind: 'crush', car, dmg: 3, hull: 3 };
      } else f.intent = { kind: 'reach', dmg: 1 };
      break;
    }
  }
}

function intentCars(f) {
  const i = f.intent; if (!i || f.stun) return [];
  switch (i.kind) {
    case 'strike': case 'seize': case 'tear': case 'devour': return [f.pos];
    case 'lunge': case 'crush': return [i.car];
    case 'whisper': return [f.pos - 1, f.pos, f.pos + 1].filter(x => x >= 0 && x <= last());
    case 'conduct': return C.cars.map((_, k) => k);
    default: return [];
  }
}
function intentText(f) {
  if (f.stun) return 'Stunned';
  const i = f.intent; if (!i) return '';
  const car = c => IP.CARS[C.cars[c]].short;
  switch (i.kind) {
    case 'strike': return 'Strike ' + i.dmg;
    case 'lunge': return 'Lunge → ' + car(i.car) + ', bite ' + i.dmg;
    case 'whisper': return (C.jammed ? 'Whisper (jammed)' : 'Whisper −' + i.amt + ' nerve, ±1 car');
    case 'tear': return 'Tear hull ' + i.dmg;
    case 'devour': return 'Eat the light';
    case 'seize': return 'Seize & drag';
    case 'conduct': return (C.jammed ? 'Conduct (jammed)' : 'All cars −1 nerve') + (i.summon ? ', call a singer' : '');
    case 'crush': return 'Crush ' + car(i.car) + ': ' + i.dmg + ' to all, hull −' + i.hull;
    case 'reach': return 'Reach: pull nearest crew rearward';
    case 'move': return i.to === f.pos ? 'Wait' : 'Advance → ' + car(i.to);
  }
  return '';
}

/* ---- damage helpers ---- */
function hurtUnit(u, dmg, why) {
  const cd = cdata(u);
  cd.hp = Math.max(0, cd.hp - dmg);
  IP.audio.sfx('hit');
  log(IP.CREW[u.id].short + ' takes ' + dmg + (why ? ' (' + why + ')' : '') + '.');
  if (cd.hp <= 0) killUnit(u, why);
}
function killUnit(u, why) {
  const cd = cdata(u); cd.alive = false; cd.hp = 0;
  C.units = C.units.filter(x => x !== u);
  log(IP.CREW[u.id].name + (why === 'dragged' ? ' is dragged off the end of the train.' : ' falls.'));
  IP.audio.sfx('death');
  IP.onCrewDeath(u.id);
}
function nerve(u, amt) {
  if (IP.CREW[u.id].steady) return;
  const cd = cdata(u); cd.nerve = Math.max(0, Math.min(IP.CREW[u.id].nerve, cd.nerve + amt));
}
/* A blow aimed at a car. Returns the unit hit or null. */
function blowAt(car, dmg, why) {
  if (C.covered.has(car)) { C.covered.delete(car); log('Covering fire. The blow at ' + IP.CARS[C.cars[car]].short + ' goes wide.'); IP.audio.sfx('shot'); return null; }
  if (C.sealed.has(car)) { log('The seal on ' + IP.CARS[C.cars[car]].short + ' holds.'); return null; }
  const here = crewAt(car);
  if (!here.length) return null;
  const jon = here.find(u => u.id === 'jonah' && u.standing);
  const t = jon || here.slice().sort((a, b) => cdata(a).hp - cdata(b).hp)[0];
  hurtUnit(t, dmg, why);
  return t;
}

function execFoe(f) {
  if (!C.foes.includes(f)) return;
  const i = f.intent; const run = IP.run();
  if (f.stun) { f.stun = false; return; }
  if (!i) return;
  switch (i.kind) {
    case 'move': if (!C.sealed.has(i.to)) f.pos = i.to; break;
    case 'strike': {
      const hit = blowAt(f.pos, i.dmg, IP.ENEMIES[f.type].name);
      if (!hit && C.cars[f.pos] === 'coach' && !crewAt(f.pos).length && run.res.pass > 0) { run.res.pass--; log('The ' + IP.ENEMIES[f.type].name + ' feeds in the coach. A passenger is gone.'); }
      break;
    }
    case 'lunge': {
      if (C.sealed.has(i.car)) { log('The hound hits the seal and falls back.'); break; }
      f.pos = i.car; blowAt(i.car, i.dmg, 'Gauge-Hound'); break;
    }
    case 'whisper': {
      if (C.jammed) break;
      C.units.filter(u => Math.abs(u.pos - f.pos) <= 1).forEach(u => nerve(u, -i.amt));
      IP.audio.sfx('whisper'); log('The Choir sings. Nerve frays.'); break;
    }
    case 'conduct': {
      if (!C.jammed) { C.units.forEach(u => nerve(u, -i.amt)); IP.audio.sfx('whisper'); log('The Choirmaster lifts its hands. Every car hears it.'); }
      if (i.summon) { C.foes.push(mkFoe('choir', last())); log('A new singer climbs onto the rear car.'); }
      break;
    }
    case 'tear': {
      if (C.covered.has(f.pos)) { C.covered.delete(f.pos); log('Covering fire drives the Tick-Man off the panels.'); break; }
      IP.res('hull', -i.dmg); log('The Tick-Man tears at ' + IP.CARS[C.cars[f.pos]].short + '. Hull −' + i.dmg + '.'); IP.audio.sfx('tear');
      if (C.cars[f.pos] === 'tender') { IP.res('fuel', -1); log('Diesel sprays from the tender. Fuel −1.'); }
      if (C.cars[f.pos] === 'coach' && run.res.pass > 0) { run.res.pass--; log('A passenger is pulled through the floor.'); }
      break;
    }
    case 'devour': {
      if (run.res.ward > 0) { IP.res('ward', -1); log('The Lantern-Eater swallows a lamp. Ward −1.'); }
      else { IP.res('hull', -1); log('No light left to eat. It eats the car.'); }
      break;
    }
    case 'seize': {
      if (C.covered.has(f.pos)) { C.covered.delete(f.pos); log('Covering fire. The Porter lets go.'); break; }
      const here = crewAt(f.pos); if (!here.length) break;
      const jon = here.find(u => u.id === 'jonah' && u.standing);
      const t = jon || here.slice().sort((a, b) => cdata(a).hp - cdata(b).hp)[0];
      hurtUnit(t, i.dmg, 'The Porter');
      if (!C.units.includes(t)) break;
      let np = t.pos + 1; if (np <= last() && isZero(np)) np++;
      if (np > last()) { killUnit(t, 'dragged'); f.pos = last(); }
      else { t.pos = np; f.pos = np; log('The Porter drags ' + IP.CREW[t.id].short + ' rearward.'); }
      break;
    }
    case 'crush': {
      if (C.covered.has(i.car)) { C.covered.delete(i.car); log('Covering fire. The tendril flinches back.'); break; }
      IP.res('hull', -i.hull); IP.audio.sfx('crush');
      log('The tendril comes down on ' + IP.CARS[C.cars[i.car]].short + '. Hull −' + i.hull + '.');
      const here = crewAt(i.car); const jon = here.find(u => u.id === 'jonah' && u.standing);
      if (jon) hurtUnit(jon, i.dmg, 'crush'); else here.slice().forEach(u => hurtUnit(u, i.dmg, 'crush'));
      break;
    }
    case 'reach': {
      const cand = C.units.filter(u => Math.abs(u.pos - f.pos) <= 3).sort((a, b) => b.pos - a.pos)[0];
      if (!cand) break;
      hurtUnit(cand, i.dmg, 'tendril');
      if (C.units.includes(cand)) { let np = cand.pos + 1; if (np <= last() && isZero(np)) np++; if (np > last()) killUnit(cand, 'dragged'); else { cand.pos = np; log('The tendril hauls ' + IP.CREW[cand.id].short + ' toward the gorge.'); } }
      break;
    }
  }
}

function hitFoe(f, dmg, src) {
  f.hp -= dmg; IP.audio.sfx('hit');
  log(src + ' hits the ' + IP.ENEMIES[f.type].name + ' for ' + dmg + '.');
  if (f.hp <= 0) { C.foes = C.foes.filter(x => x !== f); log('The ' + IP.ENEMIES[f.type].name + ' is gone.'); IP.audio.sfx('kill'); }
}
function unitAtk(u) {
  let a = IP.CREW[u.id].atk;
  if (C.cars[u.pos] === 'armory') a++;
  if (!IP.CREW[u.id].steady && cdata(u).nerve <= 2) a--;
  return Math.max(1, a);
}
function canHit(u, f) { const d = Math.abs(u.pos - f.pos); return d === 0 || (IP.CREW[u.id].ranged && d === 1) || (IP.CREW[u.id].ranged && d === 2 && isZero((u.pos + f.pos) / 2)); }

function endTurn() {
  if (C.over) return;
  C.mode = null;
  C.foes.slice().forEach(execFoe);
  // end of round
  C.units.forEach(u => {
    const cd = cdata(u);
    if (C.cars[u.pos] === 'infirmary' && cd.alive) cd.hp = Math.min(IP.CREW[u.id].hp, cd.hp + 1);
    if (C.cars[u.pos] === 'dining') nerve(u, 1);
    if (u.broken) { cd.nerve = 2; }
  });
  if (check(true)) return;
  startTurn();
}

function check(eor) {
  const run = IP.run();
  if (run.res.hull <= 0) return finish('lose', 'hull');
  if (!C.units.length) return finish('lose', 'crew');
  const pending = Object.keys(C.waves).some(t => +t > C.turn);
  if (!C.foes.length && !pending) return finish('win');
  if (eor && C.night && C.turn >= C.dawn && !C.boss) return finish('dawn');
  return false;
}
function finish(result, why) {
  C.over = true; IP.audio.combat(false);
  const d = C.done; const spec = C.spec;
  setTimeout(() => d(result, why, spec), 10);
  return true;
}

/* ---------------- player actions ---------------- */
function selUnit() { return C.units.find(u => u.id === C.sel); }
function act(kind, arg) {
  const u = selUnit(); const run = IP.run();
  if (!u || C.over) return;
  IP.audio.sfx('click');
  if (kind === 'move') {
    if (u.moved) return;
    let np = u.pos + arg; let cost = 0;
    if (np >= 0 && np <= last() && isZero(np)) { np += arg; cost = 1; }
    if (np < 0 || np > last()) return;
    u.pos = np; u.moved = true;
    if (cost) { nerve(u, -1); log(IP.CREW[u.id].short + ' crosses the roof of Car Zero. Something inside moves with them.'); }
  } else if (kind === 'attack') {
    C.mode = C.mode === 'attack' ? null : 'attack';
  } else if (kind === 'ability') {
    const ab = IP.CREW[u.id].ability.id;
    if (ab === 'throttle') {
      if (C.cars[u.pos] !== 'loco' || C.used.throttle) return;
      C.used.throttle = true; u.acted = true; IP.res('fuel', -1); IP.audio.sfx('throttle');
      log('Odile opens the throttle. The whole train lurches.');
      C.foes.slice().forEach(f => {
        hitFoe(f, 1, 'The lurch');
        if (!C.foes.includes(f) || IP.ENEMIES[f.type].boss) return;
        let np = f.pos + 1; if (np <= last() && isZero(np)) np++;
        if (np > last()) { C.foes = C.foes.filter(x => x !== f); log('A ' + IP.ENEMIES[f.type].name + ' goes off the back of the train.'); } else f.pos = np;
      });
    } else if (ab === 'suture') {
      const t = C.units.filter(x => Math.abs(x.pos - u.pos) <= 1).sort((a, b) => (cdata(a).hp / IP.CREW[a.id].hp) - (cdata(b).hp / IP.CREW[b.id].hp))[0];
      if (!t) return;
      const cd = cdata(t); cd.hp = Math.min(IP.CREW[t.id].hp, cd.hp + 3); u.acted = true;
      log('Tull sutures ' + IP.CREW[t.id].short + '. +3.');
    } else if (ab === 'jam') {
      if (u.cd > 0) return;
      C.jammed = true; u.cd = 2; IP.audio.sfx('jam');
      log('Wren floods the air with static.');
      if (C.cars[u.pos] === 'radio' && C.foes.length) { C.mode = 'jamstun'; render(); return; }
      u.acted = true;
    } else if (ab === 'cover') { C.mode = 'cover'; render(); return; }
    else if (ab === 'stand') { u.standing = true; u.acted = true; log('Jonah plants his feet. Nothing gets past him.'); }
    else if (ab === 'note') {
      C.foes.filter(f => Math.abs(f.pos - u.pos) <= 1).forEach(f => f.stun = true);
      nerve(u, -2); u.acted = true; IP.audio.sfx('cello'); log('Mrs. Reed draws the bow. The low note fills three cars. Everything near her stops.');
    }
  } else if (kind === 'lamp') {
    if (C.cars[u.pos] !== 'lamp') return;
    const free = u.id === 'jonah' && !C.used.lampFree;
    if (!free && run.res.ward <= 0) return;
    if (free) C.used.lampFree = true; else IP.res('ward', -1);
    C.foes.filter(f => Math.abs(f.pos - u.pos) <= 1).forEach(f => f.stun = true);
    u.acted = true; IP.audio.sfx('lamp'); log('The ward-lamps flare white. Everything near them recoils.');
  } else if (kind === 'item') {
    const it = arg; if (!run.items[it]) return;
    if (it === 'bandage') { const cd = cdata(u); cd.hp = Math.min(IP.CREW[u.id].hp, cd.hp + 3); log('Bandages. ' + IP.CREW[u.id].short + ' +3.'); }
    else if (it === 'laudanum') { nerve(u, 3); log('Laudanum. ' + IP.CREW[u.id].short + ' steadies.'); }
    else if (it === 'flare') { foesAt(u.pos).forEach(f => f.stun = true); log('A flare burns red in ' + IP.CARS[C.cars[u.pos]].short + '.'); IP.audio.sfx('lamp'); }
    else if (it === 'dynamite') { C.mode = 'dynamite'; render(); return; }
    run.items[it]--; u.acted = true;
  } else if (kind === 'rite') {
    if (C.riteUsed) return;
    const cost = riteCost(arg);
    if (run.res.lore < cost) return;
    C.mode = 'rite:' + arg; render(); return;
  } else if (kind === 'cancel') { C.mode = null; }
  render();
  check();
}
function riteCost(r) { const base = { name: 2, seal: 3, unspoken: 5 }[r]; const u = selUnit(); return base - (u && C.cars[u.pos] === 'observe' ? 1 : 0); }

function clickFoe(f) {
  const u = selUnit(); const run = IP.run(); if (!u) return;
  if (C.mode === 'attack') {
    if (u.acted || !canHit(u, f)) return;
    hitFoe(f, unitAtk(u), IP.CREW[u.id].short); u.acted = true; C.mode = null;
    IP.audio.sfx(IP.CREW[u.id].ranged ? 'shot' : 'hit');
  } else if (C.mode === 'jamstun') { f.stun = true; u.acted = true; C.mode = null; log('Wren finds its frequency. The ' + IP.ENEMIES[f.type].name + ' freezes.'); }
  else if (C.mode && C.mode.startsWith('rite:')) {
    const r = C.mode.slice(5);
    if (r === 'name') { f.stun = true; doRite(r, 'Spoken aloud, its true name pins the ' + IP.ENEMIES[f.type].name + ' in place.'); }
    else if (r === 'unspoken') {
      if (IP.ENEMIES[f.type].boss) return;
      C.foes = C.foes.filter(x => x !== f); doRite(r, 'You read it a line from the Unspoken Timetable. Its stop has come. It is not there anymore.');
      C.units.forEach(x => nerve(x, -1));
    } else return;
  } else return;
  render(); check();
}
function clickCar(i) {
  const u = selUnit(); const run = IP.run(); if (!u) return;
  if (C.mode === 'cover') { if (Math.abs(i - u.pos) > 1) return; C.covered.add(i); u.acted = true; C.mode = null; log('Vane sights down the aisle of ' + IP.CARS[C.cars[i]].short + '.'); }
  else if (C.mode === 'dynamite') {
    if (Math.abs(i - u.pos) > 1 || isZero(i)) return;
    run.items.dynamite--; u.acted = true; C.mode = null; IP.res('hull', -2); IP.audio.sfx('boom');
    log('Dynamite in ' + IP.CARS[C.cars[i]].short + '.');
    foesAt(i).slice().forEach(f => hitFoe(f, 6, 'The blast'));
    crewAt(i).slice().forEach(x => hurtUnit(x, 3, 'blast'));
  } else if (C.mode === 'rite:seal') {
    if (isZero(i)) return;
    C.sealed.add(i); doRite('seal', 'You draw the mark backward on the door of ' + IP.CARS[C.cars[i]].short + '. Nothing will cross it tonight.');
  } else return;
  render(); check();
}
function doRite(r, text) {
  const u = selUnit(); const run = IP.run();
  IP.res('lore', -riteCost(r)); C.riteUsed = true; C.mode = null;
  nerve(u, -1); IP.res('att', r === 'unspoken' ? 2 : 1);
  IP.audio.sfx('rite'); log(text);
}

/* ---------------- render ---------------- */
function render() {
  const st = IP.stage(); const run = IP.run();
  const u = selUnit();
  const threats = {};
  C.foes.forEach(f => intentCars(f).forEach(c => { (threats[c] = threats[c] || []).push(f); }));
  const head = C.night ? `Night · turn ${C.turn} of ${C.dawn} until dawn` : `${C.spec.title || 'Boarded'} · turn ${C.turn}`;
  let h = `<div class="combat">
  <div class="c-head"><h2>${IP.esc(C.spec.title || (C.night ? 'Night Boarding' : 'Boarded'))}</h2><span class="c-sub">${head}</span></div>
  <div class="strip-wrap"><div class="strip" style="--n:${C.cars.length}">`;
  C.cars.forEach((k, i) => {
    const tgt = C.mode === 'cover' ? Math.abs(i - (u ? u.pos : -9)) <= 1 : C.mode === 'dynamite' ? (Math.abs(i - (u ? u.pos : -9)) <= 1 && !isZero(i)) : C.mode === 'rite:seal' ? !isZero(i) : false;
    const th = threats[i] || [];
    h += `<div class="car c-${k}${tgt ? ' pick' : ''}${C.sealed.has(i) ? ' sealed' : ''}${C.covered.has(i) ? ' covered' : ''}${th.length ? ' threat' : ''}" data-car="${i}">
      <div class="car-top"><span>${IP.CARS[k].short}</span>${C.sealed.has(i) ? '<span class="tag">SEALED</span>' : ''}${C.covered.has(i) ? '<span class="tag">COVERED</span>' : ''}</div>
      <div class="foes">`;
    foesAt(i).forEach(f => {
      const inRange = C.mode === 'attack' && u && !u.acted && canHit(u, f);
      const pickable = inRange || C.mode === 'jamstun' || C.mode === 'rite:name' || (C.mode === 'rite:unspoken' && !IP.ENEMIES[f.type].boss);
      h += `<button class="foe ${pickable ? 'pick' : ''} ${f.stun ? 'stun' : ''} ${IP.ENEMIES[f.type].elite ? 'elite' : ''}" data-foe="${f.uid}" ${pickable ? '' : 'aria-disabled="true"'} title="${IP.esc(IP.ENEMIES[f.type].desc)}">
        <span class="f-name">${IP.ENEMIES[f.type].name}</span>
        <span class="pips">${pips(f.hp, f.maxHp, 'hp')}</span>
        <span class="intent">${IP.esc(intentText(f))}</span></button>`;
    });
    h += `</div><div class="crew">`;
    crewAt(i).forEach(x => {
      const cd = cdata(x); const c = IP.CREW[x.id];
      h += `<button class="tok ${x.id === C.sel ? 'sel' : ''} ${x.broken ? 'broken' : ''} ${x.acted && x.moved ? 'spent' : ''}" data-unit="${x.id}">
        <span class="t-name">${c.short}${x.standing ? ' ▣' : ''}</span>
        <span class="pips">${pips(cd.hp, c.hp, 'hp')}</span>
        ${c.steady ? '<span class="pips steady">steady</span>' : `<span class="pips">${pips(cd.nerve, c.nerve, 'nv')}</span>`}
      </button>`;
    });
    h += `</div>`;
    if (th.length) h += `<div class="warn">${th.map(f => IP.esc(intentText(f))).filter(Boolean).join('<br>')}</div>`;
    h += `</div>`;
  });
  h += `</div></div>`;
  // panel
  h += `<div class="c-panel">`;
  if (u) {
    const c = IP.CREW[u.id]; const cd = cdata(u);
    const ab = c.ability;
    const abOk = !u.acted && !u.broken && (ab.id !== 'throttle' || (C.cars[u.pos] === 'loco' && !C.used.throttle)) && (ab.id !== 'jam' || u.cd === 0);
    const lampOk = C.cars[u.pos] === 'lamp' && !u.acted && (run.res.ward > 0 || (u.id === 'jonah' && !C.used.lampFree));
    const canL = !u.moved && !u.broken && u.pos > 0 && !(u.pos - 1 === 0 && false);
    const canR = !u.moved && !u.broken && u.pos < last() && !(isZero(u.pos + 1) && u.pos + 2 > last());
    const canAtk = !u.acted && !u.broken && C.foes.some(f => canHit(u, f));
    h += `<div class="p-who"><b>${c.name}</b> <span class="muted">${c.role} · in ${IP.CARS[C.cars[u.pos]].name} · hits for ${unitAtk(u)}${cd.nerve <= 2 && !c.steady ? ' (shaken)' : ''}</span></div>
    <div class="p-acts">
      <button class="btn" data-act="move" data-arg="-1" ${canL ? '' : 'disabled'}>◀ Forward</button>
      <button class="btn" data-act="move" data-arg="1" ${canR ? '' : 'disabled'}>Rearward ▶</button>
      <button class="btn ${C.mode === 'attack' ? 'on' : ''}" data-act="attack" ${canAtk ? '' : 'disabled'}>${c.ranged ? 'Shoot' : 'Attack'}</button>
      <button class="btn ${C.mode === 'cover' ? 'on' : ''}" data-act="ability" ${abOk ? '' : 'disabled'} title="${IP.esc(ab.desc)}">${ab.name}</button>
      ${C.cars[u.pos] === 'lamp' ? `<button class="btn" data-act="lamp" ${lampOk ? '' : 'disabled'}>Light the Lamps${u.id === 'jonah' && !C.used.lampFree ? ' (free)' : ' (1 ward)'}</button>` : ''}
    </div>
    <div class="p-items">`;
    Object.keys(run.items).filter(k => run.items[k] > 0 && IP.ITEMS[k].combat).forEach(k => {
      h += `<button class="btn small ${C.mode === 'dynamite' && k === 'dynamite' ? 'on' : ''}" data-act="item" data-arg="${k}" ${u.acted || u.broken ? 'disabled' : ''} title="${IP.esc(IP.ITEMS[k].desc)}">${IP.ITEMS[k].name} ×${run.items[k]}</button>`;
    });
    h += `</div><div class="p-rites"><span class="label">Rites · lore ${run.res.lore}</span>`;
    [['name', 'Name It', 'Stun one enemy.'], ['seal', 'Seal a Car', 'Nothing enters or strikes that car this turn.'], ['unspoken', 'The Unspoken Timetable', 'Remove one enemy. Everyone loses 1 nerve.']].forEach(([k, n, d]) => {
      const cost = riteCost(k);
      h += `<button class="btn small rite ${C.mode === 'rite:' + k ? 'on' : ''}" data-act="rite" data-arg="${k}" ${C.riteUsed || run.res.lore < cost || u.broken ? 'disabled' : ''} title="${d} Costs the speaker nerve and draws attention.">${n} (${cost})</button>`;
    });
    h += `</div>`;
    if (C.mode) h += `<div class="p-hint">${modeHint()} <button class="link" data-act="cancel">cancel</button></div>`;
  }
  h += `<div class="p-end"><span class="muted">Hull ${run.res.hull} · Ward ${run.res.ward} · Fuel ${run.res.fuel} · Passengers ${run.res.pass}</span><button class="btn primary" data-act="end">Ring the bell: end turn</button></div>`;
  h += `</div><ol class="c-log">${C.log.slice(0, 6).map(l => `<li>${IP.esc(l)}</li>`).join('')}</ol></div>`;
  st.innerHTML = h;
  st.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => { C.sel = b.dataset.unit; C.mode = null; IP.audio.sfx('click'); render(); }));
  st.querySelectorAll('[data-foe]').forEach(b => b.addEventListener('click', () => { const f = C.foes.find(x => x.uid === +b.dataset.foe); if (f) clickFoe(f); }));
  st.querySelectorAll('.car').forEach(b => b.addEventListener('click', e => { if (e.target.closest('button')) return; clickCar(+b.dataset.car); }));
  st.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act; if (a === 'end') { IP.audio.sfx('bell'); return endTurn(); }
    act(a, a === 'move' ? +b.dataset.arg : b.dataset.arg);
  }));
  IP.hud();
}
function modeHint() {
  switch (C.mode) {
    case 'attack': return 'Pick a target in range.';
    case 'cover': return 'Pick this car or one beside it.';
    case 'dynamite': return 'Pick a car within one to blow.';
    case 'jamstun': return 'Pick any enemy to freeze.';
    case 'rite:name': return 'Speak its name: pick an enemy.';
    case 'rite:seal': return 'Pick a car to seal.';
    case 'rite:unspoken': return 'Pick an enemy whose stop has come.';
  }
  return '';
}
function pips(v, max, cls) {
  let s = '';
  for (let i = 0; i < max; i++) s += `<i class="${cls}${i < v ? '' : ' x'}"></i>`;
  return s;
}
IP.combatActive = () => C && !C.over;
IP._cx = { C: () => C, act, clickFoe, clickCar, endTurn, intentCars, sel: id => { C.sel = id; C.mode = null; } };
})();
