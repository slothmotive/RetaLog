/* ============================================================
   RetaLog: Personal Weight, Glucose & Reta Intake Tracker
   Local-first health journal for a Retatrutide weight-loss journey.
   No accounts, no servers: your data stays in localStorage.
   ============================================================ */
'use strict';

/* ---------------------------- utils ---------------------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const pad2 = n => String(n).padStart(2, '0');
const parseDate = s => {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  if (typeof s === 'number') {
    if (!isFinite(s)) return null;
    const dt = new Date(s > 1e11 ? s : s * 1000);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const str = String(s).trim();
  // 1. ISO YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  let m = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const yr = +m[1], mo = +m[2] - 1, dy = +m[3];
    const hr = m[4] != null ? +m[4] : 0;
    const mn = m[5] != null ? +m[5] : 0;
    const sc = m[6] != null ? +m[6] : 0;
    const dt = new Date(yr, mo, dy, hr, mn, sc);
    return isNaN(dt.getTime()) ? null : dt;
  }
  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  m = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    let p1 = +m[1], p2 = +m[2], yr = +m[3];
    let mo, dy;
    if (p1 > 12) {
      dy = p1; mo = p2 - 1;
    } else if (p2 > 12) {
      mo = p1 - 1; dy = p2;
    } else {
      dy = p1; mo = p2 - 1; // standard international format
    }
    const hr = m[4] != null ? +m[4] : 0;
    const mn = m[5] != null ? +m[5] : 0;
    const sc = m[6] != null ? +m[6] : 0;
    const dt = new Date(yr, mo, dy, hr, mn, sc);
    if (!isNaN(dt.getTime())) return dt;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};
const d2s = d => {
  if (!d) return '';
  let dt = (d instanceof Date) ? (isNaN(d.getTime()) ? null : d) : parseDate(d);
  if (!dt || isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const s2d = s => {
  const d = parseDate(s);
  return d || new Date(NaN);
};
const today = () => d2s(new Date());
const addDays = (s, n) => {
  if (n == null || isNaN(n) || !isFinite(n)) return null;
  const d = s2d(s);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + n);
  return d2s(d);
};
const dayDiff = (a, b) => {
  const da = s2d(a), db = s2d(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.round((db - da) / 86400000);
};
const fmtDate = s => {
  const d = parseDate(s);
  return (d && !isNaN(d.getTime())) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '--';
};
const fmtLong = s => {
  const d = parseDate(s);
  return (d && !isNaN(d.getTime())) ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '--';
};
const fmtTime = iso => {
  const d = parseDate(iso);
  return (d && !isNaN(d.getTime())) ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
};
const fmtISO = d => {
  const dt = (d instanceof Date) ? d : parseDate(d);
  if (!dt || isNaN(dt.getTime())) return `${today()}T12:00:00`;
  return `${d2s(dt)}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00`;
};
const inRange = (s, n) => n === 0 || s >= addDays(today(), -(n - 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const fmtKg = v => {
  if (v == null || !isFinite(+v)) return '--';
  return (+v).toFixed(1);
};
const fmtChartVal = (v, u, dp) => {
  if (v == null || !isFinite(+v)) return '--';
  const n = +v;
  if (dp != null) return n.toFixed(dp);
  if (u === 'kg' || u === '%' || u === 'cm' || u === 'h') return n.toFixed(1);
  if (u === 'kcal' || u === 'ml' || u === 'steps' || u === 'mmHg' || u === 'bpm' || u === 'units' || u === 'min' || u === 'mg/dL') return String(Math.round(n));
  if (u === 'mmol/L') return n.toFixed(1);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------------------------- units ---------------------------- */
const MMOL = 18.0182;
const toMmol = v => r2(v / MMOL);
const toMgdl = v => r2(v * MMOL);
const gluLabel = () => state.profile.units === 'mmol' ? 'mmol/L' : 'mg/dL';
const gluShow = v => state.profile.units === 'mmol' ? toMmol(v) : Math.round(v);   // stored canonically as mg/dL
const gluHide = v => state.profile.units === 'mmol' ? toMgdl(v) : Math.round(v);
const gluTarget = () => state.profile.units === 'mmol'
  ? { lo: toMmol(state.profile.fastingLo), hi: toMmol(state.profile.fastingHi) }
  : { lo: state.profile.fastingLo, hi: state.profile.fastingHi };

/* ---------------------------- store ---------------------------- */
const LS = 'retalog.v1';
const LEGACY_LS = 'reta.v2';   // the previous build's key: migrated once
const DEFAULTS = () => ({
  v: 3,
  profile: {
    name: '', sex: 'male', heightCm: 178, startKg: 87.4, targetKg: 78,
    units: 'mgdl', fastingLo: 80, fastingHi: 130, postmealHi: 180,
    recon: { vialMg: 10, bacMl: 2 },               // reconstitution -> concentration
    plan: { start: 0.5, step: 0.5, weeks: 4, max: 30, freqDays: 7 },  // titration ladder & injection frequency
    firstDose: null, currentDose: 0.5,
    kcalTarget: 1900, proteinG: 150, waterMl: 3000, sleepH: 7.5, stepTarget: 8000,
    theme: 'system', waterRemind: false, syncUrl: '', created: today()
  },
  entries: { weight: [], body: [], glucose: [], bp: [], measure: [], nutrition: [],
             workouts: [], sleep: [], dose: [], med: [], symptoms: [], mood: [],
             photos: [], labs: [], notes: [] }
});

let state;
function load() {
  let p = null, migrated = false;
  try { p = JSON.parse(localStorage.getItem(LS)); } catch (e) { p = null; }
  if (!p) {   // one-time migration from the earlier RETA build
    try { p = JSON.parse(localStorage.getItem(LEGACY_LS)); } catch (e) { p = null; }
    if (p && p.profile && Array.isArray(p.profile.dosePlan) && p.profile.dosePlan.length) {
      const d = p.profile.dosePlan;
      p.profile.plan = {
        start: d[0],
        step: Math.max(0.5, r1((d[1] || d[0] + 2.5) - d[0])),
        weeks: 4, max: d[d.length - 1], freqDays: 7
      };
    }
    if (p && p.profile && !p.profile.created) p.profile.created = today();
    migrated = true;
  }
  if (p && p.profile && p.entries) {
    const d = DEFAULTS();
    state = { v: 3, profile: Object.assign(d.profile, p.profile), entries: Object.assign(d.entries, p.entries) };
    if (!state.profile.recon) state.profile.recon = d.profile.recon;
    if (!state.profile.plan) state.profile.plan = d.profile.plan;
    if (!state.profile.plan.freqDays) state.profile.plan.freqDays = 7;
    if (migrated) save();   // persist under the new key so the legacy store is never re-read
    return;
  }
  state = DEFAULTS();
}
function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { toast('Storage full: export your data soon.', 'warn'); } }
const E = () => state.entries;

/* ------------------------- series math ------------------------- */
// collapse to one value per date (latest wins), oldest → newest
function byDate(arr) {
  const m = new Map();
  arr.forEach(e => {
    const k = d2s(e.t);
    const dtE = parseDate(e.t), prev = m.get(k);
    const dtPrev = prev ? parseDate(prev.t) : null;
    if (!m.has(k) || (dtE && dtPrev && dtE > dtPrev)) m.set(k, e);
  });
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => Object.assign({ k }, v));
}
const series = (arr, key) => byDate(arr).map(p => ({ x: p.k, y: p[key] }));
const lastVal = arr => arr.length ? arr[arr.length - 1] : null;

function movAvg(pts, n) {
  return pts.map((p, i) => {
    const s = Math.max(0, i - n + 1), sl = pts.slice(s, i + 1);
    return { x: p.x, y: r1(sl.reduce((a, b) => a + b.y, 0) / sl.length) };
  });
}
// least-squares slope per day over points
function linSlope(pts) {
  if (pts.length < 2) return 0;
  const n = pts.length, xi = (n - 1) / 2;
  let num = 0, den = 0;
  pts.forEach((p, i) => { num += (i - xi) * p.y; den += (i - xi) ** 2; });
  return den ? num / den : 0;
}
// weekly rate (kg/wk) from a daily slope
const wkRate = s => r1(s * 7);

/* ---------------------------- weight --------------------------- */
function wStats() {
  const pts = series(E().weight, 'kg');
  if (!pts.length) return null;
  const P = state.profile;
  const start = P.startKg || pts[0].y;
  const target = P.targetKg;
  const cur = pts[pts.length - 1].y;
  const avg = movAvg(pts, 7);
  const curAvg = avg[avg.length - 1].y;
  const lost = r1(start - cur);
  const goalKg = r1(start - target);
  const pct = goalKg > 0 ? clamp(lost / goalKg, 0, 1) : 0;
  const slope = linSlope(avg.slice(-30)) || linSlope(avg);  // kg/day, negative = losing
  const rate = -slope;                                      // kg/day lost
  let eta = null;
  if (rate > 0.0004) {
    const d = Math.ceil((curAvg - target) / rate);
    if (d > 0 && d < 1500) eta = addDays(today(), d);
  }
  const w1 = avg.length > 7 ? avg[avg.length - 8].y : curAvg;
  const w4 = avg.length > 28 ? avg[avg.length - 29].y : null;
  return { start, cur, curAvg, lost, goalKg, pct, slope, rate, eta, pts, avg,
           dW1: r1(curAvg - w1), dW4: w4 ? r1(curAvg - w4) : null,
           days: dayDiff(pts[0].x, pts[pts.length - 1].x), bmi: P.heightCm ? r1(cur / (P.heightCm / 100) ** 2) : null };
}

/* --------------------------- glucose --------------------------- */
function gStats(n) {
  const f = byDate(E().glucose).filter(p => p.ctx !== 'postmeal' && inRange(p.k, n));
  const pm = byDate(E().glucose).filter(p => p.ctx === 'postmeal' && inRange(p.k, n));
  const s = (a, k) => a.length ? a.reduce((t, p) => t + p[k], 0) / a.length : null;
  const P = state.profile;
  const tir = f.length ? f.filter(p => p.v >= P.fastingLo && p.v <= P.fastingHi).length / f.length : null;
  return { fastAvg: s(f, 'v'), fastN: f.length, pmAvg: s(pm, 'v'), pmN: pm.length, tir,
           low: f.length ? Math.min(...f.map(p => p.v)) : null,
           high: f.length ? Math.max(...f.map(p => p.v)) : null };
}
const gluCtx = c => ({ fasting: 'Fasting', postmeal: 'Post-meal', cgm: 'CGM' }[c] || 'Reading');

/* ---------------------------- dose ----------------------------- */
const SITES = ['Abdomen · left', 'Abdomen · right', 'Thigh · left', 'Thigh · right', 'Arm · left', 'Arm · right'];
// every 0.5 mg from 0.5 to 60 mg, as selectable doses
const DOSE_STEPS = (() => { const a = []; for (let m = 0.5; m <= 60.0001; m += 0.5) a.push(r1(m)); return a; })();
// titration ladder from the user's plan: start, +step, every N weeks, capped at max
function doseLadder() {
  const { start, step, weeks, max } = state.profile.plan;
  const out = [];
  let mg = +start || 0.5, guard = 0;
  while (mg <= (+max || 30) + 1e-9 && guard++ < 80) { out.push(r1(mg)); mg += (+step || 0.5); }
  return out.length ? out : [r1(+start || 0.5)];
}
// reconstitution concentration in mg per ml
const concMgL = () => {
  const r = state.profile.recon;
  return r && +r.bacMl > 0 ? +r.vialMg / +r.bacMl : 0;
};
// mg -> insulin-syringe units (100 units = 1 ml)
function calcDose(mg) {
  const conc = concMgL();
  if (!conc) return { conc: 0, ml: 0, units: 0, mgPerUnit: 0, precise: true, noRecon: true };
  const ml = mg / conc;
  const units = ml * 100;
  return { conc, ml: r2(ml), units: r2(units), mgPerUnit: r2(conc / 100),
           precise: Math.abs(units - Math.round(units)) < 0.05 };
}
function freqDays() {
  const p = state && state.profile && state.profile.plan;
  return p && +p.freqDays > 0 ? +p.freqDays : 7;
}
function freqLabel(days) {
  const f = parseFloat(days) || 7;
  if (f === 7) return 'Weekly';
  if (f === 3.5) return 'Twice weekly';
  if (f === 14) return 'Every 2 weeks';
  if (f === 1) return 'Daily';
  return `Every ${f} days`;
}
function getNextDueDate(lastDate, freq) {
  if (!lastDate) return today();
  const f = parseFloat(freq) || 7;
  if (f === 3.5) {
    const d = s2d(lastDate);
    const dow = d.getDay(); // 0: Sun, 1: Mon, ...
    const step = (dow === 1 || dow === 0 || dow === 2 || dow === 6) ? 3 : 4;
    return addDays(lastDate, step);
  }
  return addDays(lastDate, Math.round(f));
}
function doseInfo() {
  const P = state.profile;
  const doses = [...E().dose].sort((a, b) => (a.t < b.t ? -1 : 1));
  const last = doses.length ? doses[doses.length - 1] : null;
  const lastDate = last ? d2s(last.t) : (d2s(P.firstDose) || P.firstDose);
  const freq = freqDays();
  const nextDue = lastDate ? getNextDueDate(lastDate, freq) : today();
  const dueIn = dayDiff(today(), nextDue);
  const ladder = doseLadder();
  // expected rung: which step the calendar says you should be on
  let rung = 0;
  if (P.firstDose) {
    const w = dayDiff(P.firstDose, today()) / 7;
    rung = clamp(Math.floor(w / (P.plan.weeks || 4)), 0, ladder.length - 1);
  }
  return { doses, last, lastDate, nextDue, dueIn, rung, ladder,
           expected: ladder[rung],
           currentMg: last ? last.mg : P.currentDose,
           totalDoses: doses.length,
           freqDays: freq };
}
function nextSite() {
  const d = doseInfo();
  return d.doses.length ? SITES[d.doses.length % SITES.length] : SITES[0];
}

/* ----------------------- nutrition / habits --------------------- */
function todayNutrition() {
  const t = today();
  const n = E().nutrition.filter(e => d2s(e.t) === t).reduce((a, e) => ({
    kcal: a.kcal + (+e.kcal || 0), proteinG: a.proteinG + (+e.proteinG || 0),
    waterMl: a.waterMl + (+e.waterMl || 0), fiberG: a.fiberG + (+e.fiberG || 0)
  }), { kcal: 0, proteinG: 0, waterMl: 0, fiberG: 0 });
  return n;
}
function todaySleep() {
  const t = today();
  const s = E().sleep.filter(e => d2s(e.t) === t).map(e => +e.h);
  return s.length ? Math.max(...s) : null;
}
function todaySteps() {
  const t = today();
  const st = E().workouts.filter(e => d2s(e.t) === t && e.steps).reduce((a, e) => a + (+e.steps || 0), 0);
  return st || null;
}

/* ---------------------------- hydration -------------------------- */
// pace expectation across a 06:00–22:00 drinking window
function waterReminder() {
  const P = state.profile, nut = todayNutrition();
  const target = P.waterMl || 3000, have = nut.waterMl;
  const h = new Date().getHours();
  const exp = target * clamp((Math.min(h, 22) - 6) / 16, 0, 1);
  const behind = Math.max(0, Math.round(exp - have));
  const pct = clamp(have / target, 0, 1);
  let message;
  if (behind > 600) message = `<b>${(behind / 1000).toFixed(2)} L behind</b> pace for this hour. Nausea, constipation and fatigue on a GLP-1 all ease with water: sip steadily, don't chug.`;
  else if (behind > 0) message = `About <b>${behind} ml</b> behind pace. A glass now keeps the headaches and nausea away.`;
  else if (pct >= 1) message = `<b>Goal hit.</b> Hydration is the cheapest lever you have for fat loss and steady glucose.`;
  else message = `Nicely paced. Keep going: aim for <b>${(target / 1000).toFixed(1)} L</b> by bedtime.`;
  return { waterMl: have, target, pct, behind, message, done: pct >= 1 };
}
let nudgeTimer = null;
function stopWaterNudges() { if (nudgeTimer) { clearInterval(nudgeTimer); nudgeTimer = null; } }
function startWaterNudges(after) {
  if (!('Notification' in window)) { toast('This browser has no notifications: keep an eye on the ring instead.', 'warn'); state.profile.waterRemind = false; save(); after && after(); return; }
  const fire = () => {
    try { new Notification('RetaLog · Drink a glass of water', { body: 'Hydration cuts GLP-1 nausea and keeps glucose steady.', icon: 'icons/icon-192.png' }); } catch (e) {}
  };
  const run = () => { fire(); stopWaterNudges(); nudgeTimer = setInterval(fire, 7200000); };   // every 2 h
  if (Notification.permission === 'granted') { run(); toast('Water nudges on: every 2 hours'); after && after(); }
  else if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') { run(); toast('Water nudges on: every 2 hours'); }
      else { state.profile.waterRemind = false; save(); toast('Notifications blocked: nudges stay off.', 'warn'); }
      after && after();
    });
  } else { state.profile.waterRemind = false; save(); toast('Enable notifications in site settings to get nudges.', 'warn'); after && after(); }
}
function todayWorkoutMin() {
  const t = today();
  return E().workouts.filter(e => d2s(e.t) === t).reduce((a, e) => a + (+e.min || 0), 0);
}
function streak() {
  const days = new Set();
  Object.values(E()).forEach(arr => arr.forEach(e => days.add(d2s(e.t))));
  let s = 0;
  for (let d = today(); days.has(d); d = addDays(d, -1)) s++;
  return s;
}

/* -------------------------- workouts --------------------------- */
function weeklyWorkouts(n) { // last n ISO weeks with minutes, kcal, volume
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const end = addDays(today(), -7 * i), start = addDays(end, -6);
    const ws = E().workouts.filter(e => { const k = d2s(e.t); return k >= start && k <= end; });
    out.push({
      label: fmtDate(start), start,
      min: ws.reduce((a, e) => a + (+e.min || 0), 0),
      kcal: ws.reduce((a, e) => a + (+e.kcal || 0), 0),
      vol: ws.reduce((a, e) => a + (+e.volumeKg || 0), 0),
      n: ws.length
    });
  }
  return out;
}
const KIND_LABEL = { resistance: 'Resistance', cardio: 'Cardio', walk: 'Walk', sport: 'Sport' };

/* -------------------------- achievements ------------------------ */
const ACHV = [
  { id: 'first',   name: 'First log',    sub: 'journey begun',  icon: 'edit',   check: s => totalEntries() >= 1 },
  { id: 'kg1',     name: '−1 kg',        sub: 'first kilo',     icon: 'down',   check: s => (wStats() || {}).lost >= 1 },
  { id: 'kg5',     name: '−5 kg',        sub: 'momentum',       icon: 'down',   check: s => (wStats() || {}).lost >= 5 },
  { id: 'pct10',   name: '10% down',     sub: 'clinical win',   icon: 'star',   check: s => { const w = wStats(); return w && w.lost / w.start >= 0.10; } },
  { id: 'pct25',   name: '25% of goal',  sub: 'quarter way',    icon: 'star',   check: s => (wStats() || {}).pct >= 0.25 },
  { id: 'pct50',   name: 'Halfway',      sub: '50% of goal',    icon: 'star',   check: s => (wStats() || {}).pct >= 0.5 },
  { id: 'pct100',  name: 'Goal reached', sub: 'legend',         icon: 'crown',  check: s => (wStats() || {}).pct >= 0.99 },
  { id: 'wk4',     name: '4-week streak',sub: 'habit forming',  icon: 'fire',   check: s => streak() >= 28 },
  { id: 'wk12',    name: '12 weeks',     sub: 'one season',     icon: 'fire',   check: s => { const w = wStats(); return w && w.days >= 84; } },
  { id: 'protein', name: 'Protein x5',   sub: 'muscle saved',   icon: 'apple',  check: s => proteinDays() >= 5 },
  { id: 'glu',     name: 'In range',     sub: '5 fasts on target', icon: 'drop', check: s => { const g = gStats(30); return g.tir !== null && g.fastN >= 5 && g.tir >= 0.7; } },
  { id: 'lift',    name: 'Stronger',     sub: 'volume PR',      icon: 'dumb',   check: s => volumePR() },
];
function totalEntries() { return Object.values(E()).reduce((a, arr) => a + arr.length, 0); }
function proteinDays() {
  const t = today();
  let n = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(t, -i);
    const hit = E().nutrition.some(e => d2s(e.t) === d && (+e.proteinG || 0) >= state.profile.proteinG * 0.85);
    if (hit) n++; else if (i > 3) break;
  }
  return n;
}
function volumePR() {
  const w = [...E().workouts].filter(e => e.volumeKg).sort((a, b) => (a.t < b.t ? -1 : 1));
  if (w.length < 6) return false;
  const mx = Math.max(...w.slice(0, -1).map(e => +e.volumeKg));
  return +w[w.length - 1].volumeKg > mx;
}

/* ----------------------------- icons ----------------------------- */
const IC = {
  scale: '<path d="M12 3v18"/><path d="M7 21h10"/><circle cx="7" cy="14" r="3"/><circle cx="17" cy="14" r="3"/>',
  drop:  '<path d="M12 2.8C10.5 4.9 6.8 10.5 6.8 14.2a5.2 5.2 0 0 0 10.4 0c0-3.7-3.7-9.3-5.2-11.4z"/>',
  dumb:  '<path d="M4 9v6M20 9v6M7 12h10"/><path d="M2 10.5v3M22 10.5v3"/>',
  walk:  '<circle cx="13" cy="4.5" r="2"/><path d="M12 8l-2.5 4 2 2 1 6"/><path d="M9.5 12L6 14l-1 4"/><path d="M12.5 14l3 1.5 1 4.5"/>',
  moon:  '<path d="M20.5 14.8A8.8 8.8 0 0 1 9.2 3.5a9 9 0 1 0 11.3 11.3z"/>',
  apple: '<path d="M12 7.5a4.8 4.8 0 0 0-4.8 4.8c0 3.8 3.3 6.7 4.8 7.7 1.5-1 4.8-3.9 4.8-7.7A4.8 4.8 0 0 0 12 7.5z"/><path d="M12 7.5c.2-1.5 1.2-2.8 2.5-3.2"/>',
  meat:  '<path fill-rule="evenodd" clip-rule="evenodd" d="M18.8 7.3c-1.3-2.1-3.7-3.3-6.4-3-2.6.4-4.8 2.4-5.6 5-.8 2.5.2 5.3 2.3 6.7 2.1 1.4 5.2.7 7.3-.8 2.1-1.5 2.9-3.9 2.6-6.2-.2-.6-.5-1.1-1-1.7zm-8.4 4.5c-1 0-1.7-.8-1.7-1.7s.8-1.7 1.7-1.7 1.7.8 1.7 1.7-.8 1.7-1.7 1.7z"/>',
  syr:   '<path d="M14 3l7 7-4 4-7-7z"/><path d="M10 7L3 14v7h7l7-7"/><path d="M6 21l-2 2"/>',
  tape:  '<path d="M3 8h18v8H3z"/><path d="M7 8v4M11 8v4M15 8v4M19 8v4"/>',
  cam:   '<path d="M3 8.5A2 2 0 0 1 5 6.5h2l1.2-2h7.6L17 6.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/>',
  pill:  '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><line x1="12" y1="7.7" x2="12" y2="16.3" transform="rotate(-45 12 12)"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.6 12 20 12 20z"/>',
  note:  '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h4.5"/>',
  edit:  '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  down:  '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  up:    '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  star:  '<path d="M12 3.5l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.4l-5.4 2.9 1.1-6.1L3.2 9.9l6.1-.8z"/>',
  crown: '<path d="M3 8l4.5 4L12 4l4.5 8L21 8l-1.5 12h-15z"/><path d="M4.5 15h15"/>',
  fire:  '<path d="M12 3c3 4 5.5 6.2 5.5 9.5A5.5 5.5 0 0 1 6.5 12.5C6.5 9 9 7 12 3z"/><path d="M12 21c2.2 0 4-1.4 4-3.2 0-1.6-1.3-2.6-2.4-3.3-.2 1.6-.8 2.5-1.6 2.5-1 0-1.6-1.2-1.6-2.8C9.2 15.2 8 16.6 8 18.3 8 20 9.8 21 12 21z"/>',
  lab:   '<path d="M9 3h6M10 3v6l-4.5 9A2 2 0 0 0 7.3 21h9.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7 15h10"/>',
  body:  '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v5M8 10l4-3 4 3M12 12l-3 8M12 12l3 8"/>',
  dl:    '<path d="M12 4v11"/><path d="M7.5 11l4.5 5 4.5-5"/><path d="M4 20h16"/>',
  ul:    '<path d="M12 20V9"/><path d="M7.5 13l4.5-5 4.5 5"/><path d="M4 4h16"/>',
  copy:  '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M15.5 5H6a2 2 0 0 0-2 2v9"/>',
  sync:  '<path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M4 5v4h4M20 19v-4h-4"/>',
  info:  '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 14h10l1-14"/>',
  chev:  '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.5 2"/>',
  calc:  '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8h8M8 12h.01M12 12h.01M16 12h.01M8 15.5h.01M12 15.5h.01M16 15.5h.01"/>',
  wave:  '<path d="M2.5 12c2-3.5 3.5-3.5 5.5 0s3.5 3.5 5.5 0 3.5-3.5 5.5 0 3.5 3.5 3.5 0"/>',
  sun:   '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"/>',
};
const icon = (n, s) => `<svg width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;

/* ---------------------------- toasts ----------------------------- */
function toast(msg, type, durationMs) {
  const dur = durationMs || 2600;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = `<i></i><span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = 'all .3s'; }, dur);
  setTimeout(() => t.remove(), dur + 400);
}

/* ---------------------------- sheets ----------------------------- */
let openSheetId = null;
function openSheet(id) {
  closeSheets();
  const s = document.getElementById(id);
  if (!s) return;
  s.classList.add('on'); $('#scrim').classList.add('on');
  openSheetId = id;
}
function closeSheets() {
  $$('.sheet.on').forEach(s => s.classList.remove('on'));
  $('#scrim').classList.remove('on');
  openSheetId = null;
}
$('#scrim').addEventListener('click', closeSheets);
// a button inside <form> defaults to type=submit and would reload the page;
// neutralise submission so save runs on click and the sheet never navigates
$('#formBody').addEventListener('submit', e => e.preventDefault());
$$('[data-close]').forEach(b => b.addEventListener('click', closeSheets));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

/* ---------------------------- nav ------------------------------- */
const VIEW_TITLES = { today: 'Today', trends: 'Trends', dose: 'Dose & Titration', more: 'More' };
let currentView = 'today';
function go(view) {
  currentView = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('.nav-link').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  $('#deskTitle').textContent = VIEW_TITLES[view];
  moveNavInd();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const hero = $('#hero');
  if (hero) {
    hero.style.transform = '';
    hero.style.opacity = '';
  }
  if (view === 'trends') renderTrends();
  if (view === 'dose') renderDose();
  if (view === 'more') renderMore();
  if (view === 'today') renderToday();
  observeReveals();
}
$$('.nav-link').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
$('#fab').addEventListener('click', () => openSheet('sheet-add'));
$('#deskFab').addEventListener('click', () => openSheet('sheet-add'));

/* ------------------------- onboarding --------------------------- */
/* ------------------------- onboarding --------------------------- */
let obStep = 0;
function obShow(n) {
  obStep = n;
  $$('.ob-step').forEach(s => s.classList.toggle('on', +s.dataset.step === n));
  $$('#obProgress .ob-bar').forEach(b => b.classList.toggle('on', +b.dataset.step <= n));
  const ob = $('#ob');
  if (ob) ob.scrollTo({ top: 0, behavior: 'smooth' });
}

function updBmiChip() {
  const s = +$('#obStart').value, h = +$('#obHeight').value, t = +$('#obTarget').value;
  const chip = $('#obBmiChip');
  if (!chip) return;
  if (s > 30 && h > 100) {
    const bmiStart = (s / (h / 100) ** 2).toFixed(1);
    const bmiTarget = (t > 30) ? (t / (h / 100) ** 2).toFixed(1) : null;
    chip.innerHTML = `Starting BMI: <b>${bmiStart}</b>${bmiTarget ? ` · Target BMI: <b>${bmiTarget}</b>` : ''}`;
  } else {
    chip.textContent = '';
  }
}

['#obStart', '#obHeight', '#obTarget'].forEach(sel => {
  const el = $(sel);
  if (el) { el.addEventListener('input', updBmiChip); el.addEventListener('change', updBmiChip); }
});

$$('#ob [data-next]').forEach(b => b.addEventListener('click', () => {
  if (obStep === 1) {
    const s = +$('#obStart').value, h = +$('#obHeight').value, t = +$('#obTarget').value;
    const errEl = $('#obErr1');
    let err = '';
    $$('#ob [data-step="1"] input').forEach(i => i.classList.remove('field-err'));

    if (!(s > 30 && s < 400)) { err = 'Enter a valid starting weight between 30 and 400 kg.'; $('#obStart').classList.add('field-err'); }
    else if (!(h > 100 && h < 250)) { err = 'Enter your height between 100 and 250 cm.'; $('#obHeight').classList.add('field-err'); }
    else if (!(t > 30 && t < 400)) { err = 'Enter a realistic target weight between 30 and 400 kg.'; $('#obTarget').classList.add('field-err'); }
    else if (t >= s) { err = 'Target should be below starting weight for a weight-loss protocol.'; $('#obTarget').classList.add('field-err'); }

    if (err) {
      if (errEl) { errEl.textContent = err; errEl.style.display = 'block'; }
      toast(err, 'err');
      return;
    }
    if (errEl) errEl.style.display = 'none';
  }
  obShow(obStep + 1);
}));

$$('#ob [data-back]').forEach(b => b.addEventListener('click', () => obShow(obStep - 1)));

$$('#obUnits button').forEach(b => b.addEventListener('click', () => {
  $$('#obUnits button').forEach(x => x.classList.toggle('on', x === b));
  const mmol = b.dataset.u === 'mmol';
  $('#obFLo').value = mmol ? 4.4 : 80;
  $('#obFHi').value = mmol ? 7.2 : 130;
  $('#obFLo').placeholder = mmol ? 4.4 : 80;
  $('#obFHi').placeholder = mmol ? 7.2 : 130;
}));

$('#obSkip').addEventListener('click', () => { seedDemo(); closeOnboarding(); });

function closeOnboarding() {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const ob = $('#ob');
  if (ob) {
    ob.classList.add('ob-exit');
    setTimeout(() => {
      ob.style.display = 'none';
      ob.classList.remove('ob-exit');
      save();
      renderAll();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      triggerDashboardEntrance();
      toast('Welcome aboard: first entry logged.');
    }, 320);
  } else {
    save();
    renderAll();
    triggerDashboardEntrance();
    toast('Welcome aboard: first entry logged.');
  }
}

function triggerDashboardEntrance() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const app = $('.app');
  const topbar = $('.topbar');
  if (app) {
    app.classList.remove('entering');
    if (topbar) topbar.classList.remove('entering');
    void app.offsetWidth;
    app.classList.add('entering');
    if (topbar) topbar.classList.add('entering');
    setTimeout(() => {
      app.classList.remove('entering');
      if (topbar) topbar.classList.remove('entering');
    }, 1300);
  }
  setTimeout(() => {
    const w = wStats();
    if (w && $('#ringFg')) {
      $('#ringFg').style.strokeDashoffset = (339.3 * (1 - w.pct)).toFixed(1);
    }
  }, 160);
}

// live reconstitution + ladder previews on the dose step
function obReconUpd() {
  const v = parseFloat($('#obVial').value), b = parseFloat($('#obBac').value), el = $('#obRecon');
  if (!el) return;
  if (v > 0 && b > 0) {
    const conc = v / b;
    const sDose = parseFloat($('#obStartDose').value) || 0.5;
    const units = r1((sDose / conc) * 100);
    el.style.display = 'block';
    el.innerHTML = `Vial Strength: <b>${r1(conc)} mg/ml</b> · ${sDose} mg dose = <b>${units} syringe units</b> (0.01 ml/unit)`;
    $('#obVial').classList.remove('field-err');
    $('#obBac').classList.remove('field-err');
  } else {
    el.style.display = 'none';
    el.textContent = '';
  }
}

function obLadderUpd() {
  const s = +$('#obStartDose').value || 0.5, st = +$('#obStep').value || 0.5;
  let wk = +$('#obWk').value || 4;
  if ($('#obWk') && $('#obWk').value === 'custom') {
    wk = +$('#obWkCustom').value || 4;
  }
  let mx = +$('#obMax').value || 30;
  if ($('#obMax') && $('#obMax').value === 'custom') {
    mx = +$('#obMaxCustom').value || 30;
  }
  let freq = parseFloat($('#obFreq') ? $('#obFreq').value : 7);
  if ($('#obFreq') && $('#obFreq').value === 'custom') {
    freq = parseFloat($('#obFreqCustom') ? $('#obFreqCustom').value : 7) || 7;
  }
  const steps = [r1(s)]; let m = s, g = 0;
  while (m + st <= mx + 1e-9 && g++ < 30) { m += st; steps.push(r1(m)); }
  const el = $('#obLadder');
  if (el) {
    el.innerHTML = `Protocol: <b>${steps.slice(0, 4).join(' → ')}${steps.length > 4 ? ' → … → ' + steps[steps.length - 1] : ''} mg</b> · <b>${freqLabel(freq)}</b>, stepping every ${wk} week${wk > 1 ? 's' : ''}.`;
  }
}

['#obVial', '#obBac', '#obStartDose', '#obStep', '#obWk', '#obWkCustom', '#obMax', '#obMaxCustom', '#obFreq', '#obFreqCustom'].forEach(sel => {
  const el = $(sel);
  if (!el) return;
  el.addEventListener('input', obReconUpd); el.addEventListener('change', obReconUpd);
  el.addEventListener('input', obLadderUpd); el.addEventListener('change', obLadderUpd);
});

const obFreqEl = $('#obFreq');
if (obFreqEl) {
  obFreqEl.addEventListener('change', () => {
    const isC = obFreqEl.value === 'custom';
    if ($('#obFreqCustomWrap')) $('#obFreqCustomWrap').style.display = isC ? 'block' : 'none';
    if (isC && $('#obFreqCustom')) $('#obFreqCustom').focus();
    obLadderUpd();
  });
}

const obWkEl = $('#obWk');
if (obWkEl) {
  obWkEl.addEventListener('change', () => {
    const isC = obWkEl.value === 'custom';
    if ($('#obWkCustomWrap')) $('#obWkCustomWrap').style.display = isC ? 'block' : 'none';
    if (isC && $('#obWkCustom')) $('#obWkCustom').focus();
    obLadderUpd();
  });
}

const obMaxEl = $('#obMax');
if (obMaxEl) {
  obMaxEl.addEventListener('change', () => {
    const isC = obMaxEl.value === 'custom';
    if ($('#obMaxCustomWrap')) $('#obMaxCustomWrap').style.display = isC ? 'block' : 'none';
    if (isC && $('#obMaxCustom')) $('#obMaxCustom').focus();
    obLadderUpd();
  });
}

$('#obFinish').addEventListener('click', () => {
  const P = state.profile;
  const sWeight = +$('#obStart').value || P.startKg;
  const height = +$('#obHeight').value || P.heightCm;
  const tWeight = +$('#obTarget').value || P.targetKg;
  const sex = $('#obSex').value || 'male';
  const units = ($('#obUnits button.on') || { dataset: { u: 'mgdl' } }).dataset.u;
  const fLo = +$('#obFLo').value || (units === 'mmol' ? 4.4 : 80);
  const fHi = +$('#obFHi').value || (units === 'mmol' ? 7.2 : 130);

  const vialVal = $('#obVial') ? $('#obVial').value.trim() : '';
  const bacVal = $('#obBac') ? $('#obBac').value.trim() : '';
  const doseVal = $('#obStartDose') ? $('#obStartDose').value.trim() : '';

  const vial = parseFloat(vialVal);
  const bac = parseFloat(bacVal);
  const startDose = parseFloat(doseVal);

  const errEl = $('#obErr3');
  let err = '';

  $$('#ob [data-step="3"] input').forEach(i => i.classList.remove('field-err'));

  if (!vialVal || isNaN(vial) || vial <= 0) {
    err = 'Please enter your vial amount in mg (e.g. 10 or 20 mg).';
    if ($('#obVial')) { $('#obVial').classList.add('field-err'); $('#obVial').focus(); }
  } else if (!bacVal || isNaN(bac) || bac <= 0) {
    err = 'Please enter the BAC water volume added in ml (e.g. 1 or 2 ml).';
    if ($('#obBac')) { $('#obBac').classList.add('field-err'); $('#obBac').focus(); }
  } else if (!doseVal || isNaN(startDose) || startDose < 0.5 || startDose > 30) {
    err = 'Starting dose must be specified between 0.5 and 30 mg.';
    if ($('#obStartDose')) { $('#obStartDose').classList.add('field-err'); $('#obStartDose').focus(); }
  }

  if (err) {
    if (errEl) {
      errEl.textContent = err;
      errEl.style.display = 'block';
      errEl.classList.remove('shake');
      void errEl.offsetWidth;
      errEl.classList.add('shake');
    }
    toast(err, 'err');
    return; // BLOCK! Do not proceed into dashboard without valid reconstitution.
  }

  if (errEl) errEl.style.display = 'none';

  let freqDaysVal = parseFloat($('#obFreq') ? $('#obFreq').value : 7);
  if ($('#obFreq') && $('#obFreq').value === 'custom') {
    freqDaysVal = parseFloat($('#obFreqCustom') ? $('#obFreqCustom').value : 7);
  }
  if (!freqDaysVal || freqDaysVal <= 0 || isNaN(freqDaysVal)) freqDaysVal = 7;

  let wkVal = +$('#obWk').value || 4;
  if ($('#obWk') && $('#obWk').value === 'custom') {
    wkVal = +$('#obWkCustom').value || 4;
  }
  if (!wkVal || wkVal <= 0 || isNaN(wkVal)) wkVal = 4;

  let maxVal = +$('#obMax').value || 30;
  if ($('#obMax') && $('#obMax').value === 'custom') {
    maxVal = +$('#obMaxCustom').value || 30;
  }
  if (!maxVal || maxVal <= 0 || isNaN(maxVal)) maxVal = 30;

  P.startKg = sWeight;
  P.heightCm = height;
  P.targetKg = tWeight;
  P.sex = sex;
  P.units = units;
  P.fastingLo = fLo;
  P.fastingHi = fHi;
  P.recon = { vialMg: vial, bacMl: bac };
  P.plan = {
    start: startDose,
    step: +$('#obStep').value || 0.5,
    weeks: wkVal,
    max: maxVal,
    freqDays: freqDaysVal
  };
  P.firstDose = today();
  P.currentDose = startDose;
  P.created = today();

  E().weight.push({ t: new Date().toISOString(), kg: P.startKg });
  const c = calcDose(startDose);
  E().dose.push({ t: P.firstDose + 'T08:00:00', mg: startDose, units: c.noRecon ? undefined : c.units, site: SITES[0] });

  closeOnboarding();
});

/* ------------------------ demo data seed ------------------------ */
function seedDemo() {
  const P = state.profile;
  P.created = today();
  P.startKg = P.startKg || 87.4; P.targetKg = P.targetKg || 78;
  P.heightCm = P.heightCm || 178; P.units = P.units || 'mgdl';
  P.firstDose = addDays(today(), -83);
  const e = E();
  for (const k in e) e[k] = [];
  const rnd = mulberry32(7);
  const D = i => addDays(P.firstDose, i);
  const T = (d, h, m) => `${d}T${pad2(h || 7)}:${pad2(m || 30)}:00`;
  const w0 = P.startKg, days = 84;

  // weight: front-loaded loss with a real plateau at weeks 7–8
  for (let i = 0; i < days; i++) {
    const wk = i / 7;
    let lost;
    if (wk < 4) lost = 0.74 * wk + 0.34 * (1 - Math.exp(-wk / 1.4));
    else if (wk < 6) lost = 3.42 + 0.55 * (wk - 4);
    else if (wk < 8) lost = 4.52 + 0.07 * (wk - 6);           // plateau
    else lost = 4.66 + 0.63 * (wk - 8);
    const kg = r1(w0 - lost + (rnd() - 0.55) * 1.15);
    e.weight.push({ t: T(D(i), 7, 5 + Math.floor(rnd() * 40)), kg });
  }
  // doses follow your titration plan (one rung per plan.weeks)
  const lad = doseLadder();
  for (let i = 0; i < 12; i++) {
    const mg = lad[clamp(Math.floor(i / (P.plan.weeks || 4)), 0, lad.length - 1)];
    const c = calcDose(mg);
    e.dose.push({ t: T(D(i * 7), 8, 0), mg, units: c.noRecon ? undefined : c.units, site: SITES[i % SITES.length], brand: 'Retatrutide' });
  }
  P.currentDose = lad[clamp(Math.floor(11 / (P.plan.weeks || 4)), 0, lad.length - 1)];
  // glucose: fasting drifting down, post-meal spikes, one flagged low
  for (let i = 0; i < days; i++) {
    const d = D(i);
    const base = 152 - 0.42 * i + (rnd() - 0.5) * 17;
    e.glucose.push({ t: T(d, 7, 20), v: Math.round(clamp(base, 66, 172)), ctx: 'fasting' });
    if (i % 7 === 3) e.glucose.push({ t: T(d, 12, 40), v: Math.round(clamp(168 - 0.3 * i + rnd() * 24, 120, 205)), ctx: 'postmeal' });
    if (i === 66) e.glucose.push({ t: T(d, 11, 10), v: 64, ctx: 'fasting', note: 'Light-headed after walk, had juice' });
  }
  // body composition + tape, weekly
  for (let w = 0; w <= 11; w++) {
    const d = D(w * 7 + 2);
    e.body.push({ t: T(d, 6, 45), fatPct: r1(34.2 - 0.32 * w + (rnd() - .5) * .8), muscleKg: r1(62.4 + 0.14 * w + (rnd() - .5) * .7), visceral: r1(14 - 0.28 * w) });
    e.measure.push({ t: T(d, 6, 50), waist: r1(108 - 0.72 * w), chest: r1(112 - 0.5 * w), hip: r1(112 - 0.6 * w), arm: r1(37 + 0.06 * w), thigh: r1(60 - 0.12 * w), neck: r1(41 - 0.14 * w) });
  }
  // nutrition daily
  for (let i = 0; i < days; i++) {
    e.nutrition.push({ t: T(D(i), 21, 0), kcal: Math.round(1780 - i * 2.2 + (rnd() - .5) * 360),
      proteinG: Math.round(128 + 0.35 * i + (rnd() - .5) * 46), waterMl: Math.round(2600 + (rnd() - .5) * 1400), fiberG: r1(22 + rnd() * 16) });
  }
  // sleep
  for (let i = 0; i < days; i++) e.sleep.push({ t: T(D(i), 22, 30), h: r1(clamp(7.1 + (rnd() - .5) * 1.5, 5.6, 8.6)) });
  // workouts: 4–5/wk, strength volume climbing
  for (let i = 0; i < days; i++) {
    const dow = i % 7;
    if ([1, 3].includes(dow)) e.workouts.push({ t: T(D(i), 7, 30), kind: 'cardio', min: 34 + Math.floor(rnd() * 16), kcal: 300 + Math.floor(rnd() * 110) });
    if ([0, 2, 5].includes(dow)) e.workouts.push({ t: T(D(i), 17, 30), kind: 'resistance', min: 52 + Math.floor(rnd() * 22), kcal: 210 + Math.floor(rnd() * 90), volumeKg: Math.round(4400 + 28 * i + rnd() * 500) });
    if (dow === 4) { e.workouts.push({ t: T(D(i), 18, 0), kind: 'walk', min: 28 + Math.floor(rnd() * 12), kcal: 90 + Math.floor(rnd() * 40), steps: 7200 + Math.floor(rnd() * 4200) }); e.nutrition.push({ t: T(D(i), 18, 0), waterMl: 400 }); }
  }
  // vitals weekly
  for (let w = 0; w <= 11; w++) e.bp.push({ t: T(D(w * 7 + 1), 8, 10), sys: Math.round(139 - 0.9 * w + (rnd() - .5) * 8), dia: Math.round(87 - 0.55 * w + (rnd() - .5) * 6), hr: Math.round(79 - 0.8 * w + (rnd() - .5) * 6) });
  // side effects, concentrated in the first two titrations
  [[1, 2], [2, 1], [8, 2], [9, 1], [15, 1], [29, 1], [57, 1]].forEach(([i, s]) =>
    e.symptoms.push({ t: T(D(i), 14, 0), type: ['Nausea', 'Nausea', 'Fatigue', 'Constipation', 'Headache', 'Nausea', 'Reduced appetite'][i % 7] || 'Nausea', sev: s, note: s > 1 ? 'Day after dose increase' : '' }));
  // mood / energy
  for (let i = 0; i < days; i += 2) e.mood.push({ t: T(D(i), 20, 0), energy: clamp(Math.round(2.6 + i / 42 + (rnd() - .5)), 1, 5), mood: clamp(Math.round(3 + i / 60 + (rnd() - .5)), 1, 5) });
  // labs: before & ~11 weeks in
  e.labs.push({ t: T(D(0), 8, 0), a1c: 8.1, ldl: 118, hdl: 38, tg: 196, egfr: 92, alt: 46, vitd: 24, note: 'Baseline, pre-retatrutide' });
  e.labs.push({ t: T(D(77), 8, 0), a1c: 6.7, ldl: 104, hdl: 41, tg: 158, egfr: 94, alt: 37, vitd: 31, note: 'Week 11 follow-up' });
  e.notes.push({ t: T(D(6), 21, 15), text: 'First week done. Appetite is noticeably lower: protein is the priority now.' });
  e.notes.push({ t: T(D(48), 21, 0), text: 'Scale flat for 10 days but belt tightened a notch. Trust the tape.' });
  save();
}

/* ------------------------- quick add ---------------------------- */
const ADD_ITEMS = [
  { t: 'weight',   l: 'Weight',     i: 'scale', c: 'var(--mint)' },
  { t: 'glucose',  l: 'Glucose',    i: 'drop',  c: 'var(--sky)' },
  { t: 'dose',     l: 'Injection',  i: 'syr',   c: 'var(--violet)' },
  { t: 'calc',     l: 'Dose calc',  i: 'calc',  c: 'var(--violet)' },
  { t: 'workout',  l: 'Workout',    i: 'dumb',  c: 'var(--amber)' },
  { t: 'nutrition',l: 'Nutrition',  i: 'apple', c: 'var(--mint)' },
  { t: 'body',     l: 'Body comp',  i: 'body',  c: 'var(--teal)' },
  { t: 'measure',  l: 'Tape',       i: 'tape',  c: 'var(--sky)' },
  { t: 'bp',       l: 'Blood pressure', i: 'heart', c: 'var(--rose)' },
  { t: 'sleep',    l: 'Sleep',      i: 'moon',  c: 'var(--violet)' },
  { t: 'symptom',  l: 'Side effect',i: 'alert', c: 'var(--amber)' },
  { t: 'mood',     l: 'Energy',     i: 'fire',  c: 'var(--amber)' },
  { t: 'photo',    l: 'Photo',      i: 'cam',   c: 'var(--mint)' },
  { t: 'lab',      l: 'Lab result', i: 'lab',   c: 'var(--sky)' },
  { t: 'note',     l: 'Note',       i: 'note',  c: 'var(--muted)' },
];
function renderAddGrid() {
  $('#addGrid').innerHTML = ADD_ITEMS.map(a =>
    `<button class="add-item" data-add="${a.t}">
       <span class="add-ic" style="color:${a.c};background:color-mix(in srgb,${a.c} 14%,transparent)">${icon(a.i, 20)}</span>
       <b>${a.l}</b></button>`).join('');
  $$('#addGrid [data-add]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.add === 'calc') openCalc(); else openForm(b.dataset.add);
  }));
}

/* ----------------------- dose calculator ------------------------ */
let calcMg = 0.5;
function fmtU(u) { return Math.abs(u - Math.round(u)) < 0.05 ? String(Math.round(u)) : (+u).toFixed(1); }
function openCalc(mg) {
  calcMg = mg != null ? clamp(r1(+mg), 0.5, 30) : doseInfo().expected;
  $('#formTitle').textContent = 'Dose calculator';
  $('#formBody').innerHTML = `
    <div class="hint" id="calcRecon" style="margin:-4px 0 12px"></div>
    <div class="calc-row">
      <button class="step-btn" id="calcMinus" type="button" aria-label="Decrease">−</button>
      <div class="step-val"><span id="calcMg">${calcMg}</span><small>mg</small></div>
      <button class="step-btn" id="calcPlus" type="button" aria-label="Increase">+</button>
    </div>
    <div class="calc-out" id="calcOut"></div>
    <div style="display:flex;gap:9px;margin-top:14px">
      <button class="btn ghost" id="calcReconBtn" type="button" style="flex:1">Vial strength</button>
      <button class="btn primary" id="calcLog" type="button" style="flex:1.5">Log this dose</button>
    </div>`;
  const upd = () => {
    $('#calcMg').textContent = calcMg;
    const c = calcDose(calcMg), P = state.profile;
    $('#calcRecon').innerHTML = c.noRecon
      ? `<span style="color:var(--amber)">Set your vial strength first in “Vial strength” below.</span>`
      : `Vial <b>${P.recon.vialMg} mg</b> mixed with <b>${P.recon.bacMl} ml</b> = <b>${r1(c.conc)} mg/ml</b> · every 10 units (0.1 ml) delivers <b>${c.mgPerUnit} mg</b>`;
    $('#calcOut').innerHTML = c.noRecon ? `
        <div class="calc-warn">${icon('alert', 14)}<span>Add your vial amount and BAC water volume to convert mg into syringe units.</span></div>` : `
        <div class="calc-big">${fmtU(c.units)}<span style="font-size:17px;color:var(--muted);font-family:var(--f-ui)"> units</span></div>
        <div class="calc-u">draw on a 100-unit syringe</div>
        <div class="calc-sub">
          <div>Volume<b>${c.ml} ml</b></div>
          <div>Scheduled today<b>${doseInfo().expected} mg</b></div>
        </div>
        ${c.precise ? '' : `<div class="calc-warn">${icon('alert', 14)}<span>Not a whole unit: a 0.5 ml (50-unit) syringe gives the precision this dose needs.</span></div>`}`;
  };
  $('#calcMinus').addEventListener('click', () => { calcMg = clamp(r1(calcMg - 0.5), 0.5, 30); upd(); });
  $('#calcPlus').addEventListener('click', () => { calcMg = clamp(r1(calcMg + 0.5), 0.5, 30); upd(); });
  $('#calcReconBtn').addEventListener('click', () => {
    closeSheets();
    go('more');
    setTimeout(() => { const el = $('#m_vialMg'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.style.borderColor = 'var(--mint)'; } }, 320);
  });
  $('#calcLog').addEventListener('click', () => { closeSheets(); setTimeout(() => openForm('dose', { mg: calcMg }), 220); });
  upd();
  openSheet('sheet-form');
}

/* ---------------------------- forms ----------------------------- */
const SEV = [['1', 'Mild'], ['2', 'Moderate'], ['3', 'Severe']];
const SYMPTOMS = ['Nausea', 'Fatigue', 'Constipation', 'Diarrhoea', 'Vomiting', 'Headache', 'Reduced appetite', 'Injection site reaction', 'Dizziness', 'Other'];
const KINDS = [['resistance', 'Resistance'], ['cardio', 'Cardio'], ['walk', 'Walk / steps'], ['sport', 'Sport']];
// form type -> entry array key (singular form types map to plural collections)
const STORE_KEY = { weight: 'weight', glucose: 'glucose', dose: 'dose', workout: 'workouts',
  nutrition: 'nutrition', body: 'body', measure: 'measure', bp: 'bp', sleep: 'sleep',
  symptom: 'symptoms', mood: 'mood', photo: 'photos', lab: 'labs', note: 'notes' };

function formDef(type) {
  const P = state.profile;
  const lw = lastVal(E().weight), lb = lastVal(E().body), lm = lastVal(E().measure);
  const ph = e => (e == null ? '' : e);
  switch (type) {
    case 'weight': return { title: 'Log weight', sub: 'Morning, fasted, after the restroom: that is the most comparable reading.', fields: [
      { k: 'kg', label: 'Weight (kg)', half: true, ph: ph(lw ? lw.kg : ''), req: true },
      { k: 'note', label: 'Note', half: true, type: 'text', ph: 'optional' }] };
    case 'glucose': return { title: 'Log glucose', sub: `Targets: fasting ${gluShow(P.fastingLo)}–${gluShow(P.fastingHi)}, post-meal under ${gluShow(P.postmealHi)} ${gluLabel()}.`, fields: [
      { k: 'v', label: `Reading (${gluLabel()})`, half: true, req: true, ph: gluShow(120) },
      { k: 'ctx', label: 'Context', half: true, type: 'select', options: [['fasting', 'Fasting'], ['postmeal', '2h post-meal'], ['cgm', 'CGM']] },
      { k: 'note', label: 'Note', type: 'text', ph: 'e.g. after a long walk' }] };
    case 'dose': return { title: 'Log injection', sub: `Next suggested site: ${nextSite()} (rotate to protect your skin).`, fields: [
      { k: 'mg', label: 'Dose (mg)', half: true, type: 'select', value: String(doseInfo().expected), options: DOSE_STEPS.map(d => [String(d), d + ' mg']) },
      { k: 'site', label: 'Site', half: true, type: 'select', value: nextSite(), options: SITES.map(s => [s, s]) },
      { k: 'brand', label: 'Brand / vial', type: 'text', half: true, ph: 'Retatrutide' },
      { k: 'note', label: 'Note', type: 'text', half: true, ph: 'optional' }] };
    case 'workout': return { title: 'Log workout', sub: 'Strength volume = sets × reps × kg. It is the trend that proves muscle is being kept.', fields: [
      { k: 'kind', label: 'Type', half: true, type: 'select', options: KINDS },
      { k: 'min', label: 'Duration (min)', half: true, ph: '60' },
      { k: 'kcal', label: 'Calories burned', half: true, ph: '250' },
      { k: 'volumeKg', label: 'Volume (kg)', half: true, ph: '5200' },
      { k: 'steps', label: 'Steps', half: true, ph: '8000' },
      { k: 'note', label: 'Note', type: 'text', half: true, ph: 'e.g. leg day' }] };
    case 'nutrition': return { title: 'Log nutrition', sub: `Protein target ${P.proteinG} g protects lean mass during fast loss.`, fields: [
      { k: 'kcal', label: 'Calories', half: true, ph: '1800' },
      { k: 'proteinG', label: 'Protein (g)', half: true, ph: P.proteinG },
      { k: 'waterMl', label: 'Water (ml)', half: true, ph: '2500' },
      { k: 'fiberG', label: 'Fibre (g)', half: true, ph: '28' }] };
    case 'body': return { title: 'Log body composition', sub: 'From your smart scale. Fat falls, muscle holds: that is the goal.', fields: [
      { k: 'fatPct', label: 'Body fat (%)', half: true, ph: ph(lb ? lb.fatPct : ''), req: true },
      { k: 'muscleKg', label: 'Muscle (kg)', half: true, ph: ph(lb ? lb.muscleKg : '') },
      { k: 'visceral', label: 'Visceral fat rating', half: true, ph: ph(lb ? lb.visceral : '') }] };
    case 'measure': return { title: 'Log measurements', sub: 'Weekly, same conditions. Waist is the cardiometabolic one to watch.', fields: [
      { k: 'waist', label: 'Waist (cm)', half: true, ph: ph(lm ? lm.waist : ''), req: true },
      { k: 'chest', label: 'Chest (cm)', half: true, ph: ph(lm ? lm.chest : '') },
      { k: 'hip', label: 'Hips (cm)', half: true, ph: ph(lm ? lm.hip : '') },
      { k: 'neck', label: 'Neck (cm)', half: true, ph: ph(lm ? lm.neck : '') },
      { k: 'arm', label: 'Arm (cm)', half: true, ph: ph(lm ? lm.arm : '') },
      { k: 'thigh', label: 'Thigh (cm)', half: true, ph: ph(lm ? lm.thigh : '') }] };
    case 'bp': return { title: 'Log blood pressure', sub: 'Seated, 5 minutes of quiet first. Retatrutide tends to lower this.', fields: [
      { k: 'sys', label: 'Systolic', half: true, req: true, ph: '128' },
      { k: 'dia', label: 'Diastolic', half: true, req: true, ph: '80' },
      { k: 'hr', label: 'Heart rate', half: true, ph: '72' }] };
    case 'sleep': return { title: 'Log sleep', sub: 'Short sleep blunts fat loss and raises morning glucose.', fields: [
      { k: 'h', label: 'Hours slept', req: true, ph: '7.5' }] };
    case 'symptom': return { title: 'Log side effect', sub: 'Severity is data for your clinician and for titration decisions.', fields: [
      { k: 'type', label: 'Symptom', half: true, type: 'select', options: SYMPTOMS.map(s => [s, s]) },
      { k: 'sev', label: 'Severity', half: true, type: 'seg', options: SEV },
      { k: 'note', label: 'Note', type: 'text', ph: 'when it started, what helped' }] };
    case 'mood': return { title: 'Log energy & mood', sub: 'Energy climbing while weight falls is the sign of a good deficit.', fields: [
      { k: 'energy', label: 'Energy (1 to 5)', half: true, type: 'seg', options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']] },
      { k: 'mood', label: 'Mood (1 to 5)', half: true, type: 'seg', options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']] }] };
    case 'lab': return { title: 'Log lab result', sub: 'HbA1c is the headline diabetes number: quarterly.', fields: [
      { k: 'a1c', label: 'HbA1c (%)', half: true, ph: '6.7' },
      { k: 'ldl', label: 'LDL', half: true, ph: '104' },
      { k: 'hdl', label: 'HDL', half: true, ph: '41' },
      { k: 'tg', label: 'Triglycerides', half: true, ph: '158' },
      { k: 'egfr', label: 'eGFR', half: true, ph: '94' },
      { k: 'alt', label: 'ALT', half: true, ph: '37' },
      { k: 'vitd', label: 'Vitamin D', half: true, ph: '31' },
      { k: 'note', label: 'Note', type: 'text', half: true, ph: 'clinic / date' }] };
    case 'photo': return { title: 'Progress photo', sub: 'Same lighting, same pose, weekly. The truth on plateau weeks.', fields: [
      { k: 'photo', label: 'Photo', type: 'file' },
      { k: 'note', label: 'Note', type: 'text', half: true, ph: 'week 12, morning' }] };
    case 'note': return { title: 'Write a note', fields: [
      { k: 'text', label: 'Note', type: 'textarea', ph: 'How today felt, what changed, questions for the clinician…' }] };
  }
  return { title: 'Log', fields: [] };
}

function fieldHtml(f, i) {
  const wrap = inner => `<div class="field" data-f="${f.k}">${inner}</div>`;
  if (f.type === 'select')
    return wrap(`<label>${f.label}</label><select data-k="${f.k}">${f.options.map(o => `<option value="${esc(o[0])}" ${String(f.value) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`);
  if (f.type === 'textarea')
    return wrap(`<label>${f.label}</label><textarea data-k="${f.k}" placeholder="${esc(f.ph || '')}"></textarea>`);
  if (f.type === 'seg')
    return wrap(`<label>${f.label}</label><div class="seg-toggle" data-k="${f.k}">${f.options.map((o, j) => `<button type="button" data-v="${esc(o[0])}" class="${j === 0 ? 'on' : ''}">${esc(o[1])}</button>`).join('')}</div>`);
  if (f.type === 'file')
    return wrap(`<label>${f.label}</label><input type="file" accept="image/*" capture="user" data-k="${f.k}" style="padding:10px">`);
  return wrap(`<label>${f.label}</label><input data-k="${f.k}" type="${f.type === 'text' ? 'text' : 'number'}" inputmode="${f.inputmode || (f.type === 'text' ? 'text' : 'decimal')}" step="${f.step || 'any'}" placeholder="${esc(f.ph || '')}" value="${esc(f.value || '')}">`);
}

let photoStash = null;
function openForm(type, preset) {
  const def = formDef(type);
  photoStash = null;
  $('#formTitle').textContent = def.title;
  let html = '';
  if (def.sub) html += `<p class="hint" style="margin:-4px 0 14px;font-size:11.5px">${esc(def.sub)}</p>`;
  for (let i = 0; i < def.fields.length; i++) {
    const f = def.fields[i];
    if (f.half && def.fields[i + 1] && def.fields[i + 1].half) {
      html += `<div class="field-row">${fieldHtml(f)}${fieldHtml(def.fields[++i])}</div>`;
    } else html += fieldHtml(f);
  }
  html += `<button class="btn primary block" id="formSave" type="button" style="margin-top:6px">Save ${def.title.replace(/^Log /, '').toLowerCase()}</button>`;
  $('#formBody').innerHTML = html;

  // apply preset values (e.g. from the calculator)
  if (preset) def.fields.forEach(f => {
    if (preset[f.k] == null) return;
    const el = $(`#formBody [data-k="${f.k}"]`);
    if (el) el.value = preset[f.k];
  });

  // live unit conversion on the dose form
  if (type === 'dose') {
    const mgSel = $('#formBody [data-k="mg"]');
    if (mgSel) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      mgSel.closest('.field').appendChild(hint);
      const upd = () => {
        const c = calcDose(+mgSel.value);
        hint.innerHTML = c.noRecon
          ? `<span style="color:var(--amber)">Set your vial strength in More → Reconstitution to see syringe units.</span>`
          : `≈ <b style="color:var(--mint)">${fmtU(c.units)} units</b> (${c.ml} ml) on a 100-unit syringe`;
      };
      mgSel.addEventListener('change', upd);
      upd();
    }
  }

  $$('#formBody .seg-toggle').forEach(s => $$('button', s).forEach(b => b.addEventListener('click', () => $$('button', s).forEach(x => x.classList.toggle('on', x === b)))));
  const fileIn = $('#formBody input[type=file]');
  if (fileIn) fileIn.addEventListener('change', ev => {
    const f = ev.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const mx = 520, sc = Math.min(1, mx / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        photoStash = c.toDataURL('image/jpeg', 0.7);
        toast('Photo ready: hit save.');
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
  $('#formSave').addEventListener('click', () => saveForm(type, def));
  openSheet('sheet-form');
}

function saveForm(type, def) {
  const out = { t: new Date().toISOString() };
  let ok = true;
  def.fields.forEach(f => {
    if (f.type === 'seg') {
      const b = $(`#formBody .seg-toggle[data-k="${f.k}"] button.on`);
      out[f.k] = b ? b.dataset.v : '';
      return;
    }
    if (f.type === 'file') return;
    const el = $(`#formBody [data-k="${f.k}"]`);
    let v = el ? el.value.trim() : '';
    if (f.req && v === '') { ok = false; el.style.borderColor = 'var(--rose)'; return; }
    if (f.type === 'select') { if (v !== '' && /^-?\d+(\.\d+)?$/.test(v)) v = +v; }   // e.g. mg "1.5" -> 1.5
    else if (f.type !== 'text' && f.type !== 'textarea' && v !== '') v = +v;
    if (v !== '') out[f.k] = v;
  });
  if (!ok) { toast('Fill in the highlighted fields.', 'err'); return; }
  if (type === 'photo' && !photoStash) { toast('Choose a photo first.', 'warn'); return; }
  if (type === 'photo') out.dataUrl = photoStash;
  if (type === 'glucose' && out.v != null) out.v = gluHide(out.v);       // store as mg/dL
  if (type === 'dose') {
    state.profile.currentDose = out.mg;
    const c = calcDose(out.mg);
    if (!c.noRecon) out.units = c.units;   // keep units in history
  }
  if (type === 'weight' && !E().weight.length) state.profile.startKg = out.kg;
  if (type === 'symptom' && out.sev) out.sev = +out.sev;
  if (type === 'mood') { out.energy = +out.energy; out.mood = +out.mood; }
  E()[STORE_KEY[type] || type].push(out);
  save(); closeSheets();
  toast(def.title.replace(/^Log /, '') + ' saved');
  renderAll();
}

/* ---------------------------- today ----------------------------- */
function miniRing(pct, color, size, strokeW) {
  const s = size || 26;
  const sw = strokeW || 4;
  const r = s / 2 - sw / 2 - 1;
  const c = 2 * Math.PI * r, p = clamp(pct, 0, 1);
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="var(--stroke-2)" stroke-width="${sw}"/>
    <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}" transform="rotate(-90 ${s/2} ${s/2})"/></svg>`;
}

function renderToday() {
  destroyCharts();
  const P = state.profile, w = wStats();
  const st = streak();
  $('#streakPill').innerHTML = `<i class="dot"></i> Day ${st} · ${w ? 'week ' + Math.max(1, Math.round((w.days + 1) / 7)) : 'day 1'}`;
  $('#deskPill').innerHTML = `<i class="dot"></i> Day ${st} · ${w ? 'week ' + Math.max(1, Math.round((w.days + 1) / 7)) : 'day 1'}`;

  // hero
  if (w) {
    countUp($('#heroLost'), Math.max(0, w.lost), 1);
    requestAnimationFrame(() => { $('#ringFg').style.strokeDashoffset = (339.3 * (1 - w.pct)).toFixed(1); });
    const toGo = r1(w.curAvg - P.targetKg);
    $('#heroStats').innerHTML = [
      ['Current', fmtKg(w.curAvg), 'kg', '7-day avg'],
      ['Started', fmtKg(w.start), 'kg', w.days + ' days ago'],
      ['Goal', fmtKg(P.targetKg), 'kg', toGo > 0 ? fmtKg(toGo) + ' kg to go' : 'Goal reached 🎉'],
    ].map(([l, v, u, f]) => `<div class="hstat"><div><div class="hstat-v num">${v}<span class="hstat-u">${u}</span></div><div class="hstat-l" style="margin:0">${l} · ${f}</div></div></div>`).join('');
    $('#etaVal').textContent = w.eta
      ? `${fmtLong(w.eta)} · −${fmtKg(w.rate * 7)} kg/wk`
      : (w.days > 10 ? 'nearly on pace' : 'log 2+ weeks of weight');
    sparkChart(w);
  } else {
    $('#heroStats').innerHTML = `<div class="empty" style="padding:8px 0;text-align:left">
      <b style="font-size:15px">Log your first weight</b>
      <p style="font-size:12px">Everything here: the ring, the projection, the milestones, wakes up after one entry.</p></div>`;
    $('#etaVal').textContent = 'log your first weight';
    $('#heroLost').textContent = '0.0';
  }

  // stat grid
  const g = gStats(7), nut = todayNutrition(), steps = todaySteps();
  const lastG = lastVal(byDate(E().glucose));
  const dChip = (v, good) => `<span class="delta ${good === null ? 'flat' : good ? 'good' : 'bad'}">${v}</span>`;
  const dLoss = w ? (w.dW1 < -0.05 ? '−' + Math.abs(w.dW1).toFixed(1) : w.dW1 > 0.05 ? '+' + w.dW1.toFixed(1) : '0.0') : '--';
  const dLossGood = w ? (w.dW1 < -0.05 ? true : w.dW1 > 0.05 ? false : null) : null;
  const statsList = [
    { ic: 'drop', l: 'Fasting glucose', v: lastG ? gluShow(lastG.v) : '--', u: gluLabel(),
      f: g.fastAvg != null ? dChip(gluShow(g.fastAvg) + ' avg', true) : '<span class="delta flat">no data yet</span>' },
    { ic: 'scale', l: 'Weight 7-day Δ', v: dLoss, u: 'kg',
      f: w ? dChip(dLoss + ' /wk', dLossGood) : '<span class="delta flat">no data yet</span>' },
    { ic: 'apple', l: 'Calories today', v: nut.kcal || '--', u: 'kcal', f: `<span class="delta flat">${P.kcalTarget - nut.kcal > 0 ? P.kcalTarget - nut.kcal + ' left' : 'over target'}</span>` },
    { ic: 'walk', l: 'Steps today', v: steps || '--', u: '', f: `<span class="delta ${steps >= P.stepTarget ? 'good' : 'flat'}">${steps ? Math.round(steps / P.stepTarget * 100) + '% of goal' : 'no data yet'}</span>` },
  ];
  $('#statGrid').innerHTML = statsList.map(s => `<div class="stat"><div class="stat-l" style="display:flex;align-items:center;gap:6px">${icon(s.ic, 13)} ${s.l}</div><div class="stat-v num">${s.v}${s.u ? `<small>${s.u}</small>` : ''}</div><div class="stat-f">${s.f}</div></div>`).join('');

  // hydration card
  const wr = waterReminder();
  $('#waterCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('drop', 12)} Hydration</div>
      <div class="card-title">${wr.behind > 0 ? 'You are behind: drink up' : wr.done ? 'Hydration goal hit' : 'Stay ahead of thirst'}</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="nutrition">Log</button></div></div>
    <div class="water-top">
      <div class="water-ring">${miniRing(wr.pct, 'var(--sky)', 92)}
        <div class="ring-center"><div><div class="water-v">${(wr.waterMl / 1000).toFixed(2)}</div><div class="water-l">of ${(P.waterMl / 1000).toFixed(1)} L</div></div></div>
      </div>
      <div class="water-msg">${wr.message}</div>
    </div>
    <div class="water-add">
      <button data-water="250">+250 ml</button>
      <button data-water="500">+500 ml</button>
      <button data-water="1000">+1 L</button>
    </div>
    <div class="remind-row">
      <span style="color:var(--sky)">${icon('wave', 15)}</span>
      <span>Water nudges every 2 hours while the app is open</span>
      <button class="switch ${P.waterRemind ? 'on' : ''}" id="remindSw" aria-label="Toggle water nudges"></button>
    </div>`;
  $$('#waterCard [data-water]').forEach(b => b.addEventListener('click', () => {
    E().nutrition.push({ t: new Date().toISOString(), waterMl: +b.dataset.water });
    save(); renderToday(); toast(`+${b.dataset.water} ml logged`);
  }));
  const wsw = $('#remindSw');
  if (wsw) wsw.addEventListener('click', () => {
    if (!P.waterRemind) { P.waterRemind = true; save(); startWaterNudges(() => { renderToday(); }); }
    else { P.waterRemind = false; save(); stopWaterNudges(); renderToday(); toast('Water nudges off'); }
  });
  const wl = $('#waterCard [data-add]'); if (wl) wl.addEventListener('click', () => openForm('nutrition'));

  // dose card
  const d = doseInfo();
  const dd = d.dueIn;
  const dc = calcDose(d.currentMg);
  const freqUnit = d.freqDays === 7 ? 'week' : 'dose';
  $('#doseCard').innerHTML = `
    <div class="card-head">
      <div><div class="card-eyebrow">${icon('syr', 12)} Next injection · ${freqLabel(d.freqDays)}</div><div class="card-title">${dd < 0 ? `${Math.abs(dd)} day${Math.abs(dd) > 1 ? 's' : ''} overdue` : dd === 0 ? 'Due today' : `Due in ${dd} day${dd > 1 ? 's' : ''}`}</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="dose">Log dose</button><button class="mini-btn" data-add="calc">Calc</button></div>
    </div>
    <div class="cd">
      <div class="cd-cell"><div class="cd-n">${dd < 0 ? '!' : dd}</div><div class="cd-l">days</div></div>
      <div class="cd-cell"><div class="cd-n">${d.currentMg}</div><div class="cd-l">mg / ${freqUnit}</div></div>
      <div class="cd-cell"><div class="cd-n">${dc.noRecon ? '--' : fmtU(dc.units)}</div><div class="cd-l">units</div></div>
      <div class="cd-cell"><div class="cd-n">${d.doses.length ? fmtDate(d.nextDue) : '--'}</div><div class="cd-l">date</div></div>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted)">
      ${icon('syr', 16)}<span>Suggested site: <b style="color:var(--ink)">${nextSite()}</b></span>
      <span style="margin-left:auto" class="tag">rung ${d.rung + 1}/${d.ladder.length}</span>
    </div>`;
  $$('#doseCard [data-add]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.add === 'calc') openCalc(); else openForm('dose');
  }));

  // habit rings
  const waterPct = nut.waterMl / P.waterMl, proPct = nut.proteinG / P.proteinG;
  const sl = todaySleep(), slPct = sl ? sl / P.sleepH : 0;
  const habitSvgs = {
    water: `<svg width="32" height="32" viewBox="0 0 150 150" fill="currentColor">
      <path d="M75 1 C73 3 21.5 67 21.5 95.5 A53.5 53.5 0 0 0 128.5 95.5 C128.5 67 77 3 75 1 Z"/>
      <path d="M41 96 A41 41 0 0 0 73 131" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"/>
    </svg>`,
    protein: `<img src="icons/egg.png" width="32" height="32" alt="Protein">`,
    sleep: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.6 14.8A9 9 0 0 1 9.2 3.4a9.2 9.2 0 1 0 11.4 11.4z"/>
    </svg>`
  };
  const habits = [
    { label: 'Water', val: nut.waterMl ? (nut.waterMl / 1000).toFixed(1) + 'L' : '--', pct: waterPct, color: 'var(--sky)', svg: habitSvgs.water, icColor: 'var(--sky)' },
    { label: 'Protein', val: nut.proteinG ? Math.round(nut.proteinG) + 'g' : '--', pct: proPct, color: 'var(--mint)', svg: habitSvgs.protein, icColor: 'var(--mint)' },
    { label: 'Sleep', val: sl ? (+sl).toFixed(1) + 'h' : '--', pct: slPct, color: 'var(--violet)', svg: habitSvgs.sleep, icColor: 'var(--violet)' }
  ];
  $('#habitCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('fire', 12)} Daily habits</div><div class="card-title">Rings reset at midnight</div></div></div>
    <div class="rings">
      ${habits.map(h => `
        <div class="hring">
          <div class="hring-ring">
            ${miniRing(h.pct, h.color, 68, 5.5)}
            <div class="hring-center" style="color:${h.icColor}">
              ${h.svg}
            </div>
          </div>
          <div class="hring-val num">${h.val}</div>
          <div class="hring-lbl">${h.label}</div>
        </div>`).join('')}
    </div>`;

  // sparkline card
  $('#sparkCard').innerHTML = w ? `
    <div class="card-head"><div><div class="card-eyebrow">${icon('scale', 12)} Weight trend</div><div class="card-title">Last 30 days · 7-day average</div></div>
      <div class="card-actions"><button class="mini-btn" data-goto="trends">All charts</button></div></div>
    <div class="chart-wrap" style="height:150px"><canvas id="w30"></canvas></div>
    <div class="chart-foot">From <b>${fmtKg(w.avg[Math.max(0, w.avg.length - 30)].y)} kg</b> to <b>${fmtKg(w.curAvg)} kg</b> 7-day average${w.dW4 != null ? ` · <b style="color:var(--mint)">${fmtKg(w.dW4)} kg</b> in the last 4 weeks` : ''}.</div>`
    : `<div class="empty">${icon('scale', 26)}<b>No weight logged yet</b><p>Tap the + button and log your morning weight: the trend chart builds itself.</p></div>`;
  const gt = $('#sparkCard [data-goto]'); if (gt) gt.addEventListener('click', () => go('trends'));
  if (w) w30Chart(w);

  // today's log
  renderTodayLog();
  observeReveals();
}

function renderTodayLog() {
  const t = today();
  const items = [];
  const push = (kind, label, val, sub, ref, ic, c) => items.push({ kind, label, val, sub, ref, ic, c });
  E().weight.filter(e => d2s(e.t) === t).forEach(e => push('weight', 'Weight', fmtKg(e.kg) + ' kg', fmtTime(e.t), e, 'scale', 'var(--mint)'));
  E().glucose.filter(e => d2s(e.t) === t).forEach(e => push('glucose', 'Glucose', gluShow(e.v) + ' ' + gluLabel(), gluCtx(e.ctx) + ' · ' + fmtTime(e.t), e, 'drop', 'var(--sky)'));
  E().dose.filter(e => d2s(e.t) === t).forEach(e => push('dose', 'Injection', e.mg + ' mg' + (e.units ? ` · ${fmtU(e.units)}u` : ''), (e.site || '') + ' · ' + fmtTime(e.t), e, 'syr', 'var(--violet)'));
  E().workouts.filter(e => d2s(e.t) === t).forEach(e => push('workouts', KIND_LABEL[e.kind] || 'Workout', e.min + ' min', e.kcal ? e.kcal + ' kcal · ' + fmtTime(e.t) : fmtTime(e.t), e, 'dumb', 'var(--amber)'));
  E().nutrition.filter(e => d2s(e.t) === t).forEach(e => push('nutrition', 'Nutrition', e.kcal + ' kcal', (e.proteinG || 0) + ' g protein · ' + (e.waterMl || 0) + ' ml water', e, 'apple', 'var(--mint)'));
  E().bp.filter(e => d2s(e.t) === t).forEach(e => push('bp', 'Blood pressure', e.sys + '/' + e.dia, (e.hr ? e.hr + ' bpm · ' : '') + fmtTime(e.t), e, 'heart', 'var(--rose)'));
  E().sleep.filter(e => d2s(e.t) === t).forEach(e => push('sleep', 'Sleep', e.h + ' h', fmtTime(e.t), e, 'moon', 'var(--violet)'));
  E().symptoms.filter(e => d2s(e.t) === t).forEach(e => push('symptoms', 'Side effect', e.type, ['mild', 'moderate', 'severe'][e.sev - 1] || '', e, 'alert', 'var(--amber)'));
  E().body.filter(e => d2s(e.t) === t).forEach(e => push('body', 'Body composition', fmtKg(e.fatPct) + '% fat', (e.muscleKg ? fmtKg(e.muscleKg) + ' kg muscle' : '') + ' · ' + fmtTime(e.t), e, 'body', 'var(--teal)'));
  E().measure.filter(e => d2s(e.t) === t).forEach(e => push('measure', 'Measurements', e.waist + ' cm waist', fmtTime(e.t), e, 'tape', 'var(--sky)'));
  E().mood.filter(e => d2s(e.t) === t).forEach(e => push('mood', 'Energy', e.energy + '/5', 'mood ' + e.mood + '/5', e, 'fire', 'var(--amber)'));
  E().photos.filter(e => d2s(e.t) === t).forEach(e => push('photos', 'Progress photo', '', fmtTime(e.t), e, 'cam', 'var(--mint)'));
  E().notes.filter(e => d2s(e.t) === t).forEach(e => push('notes', 'Note', '', fmtTime(e.t), e, 'note', 'var(--muted)'));
  E().labs.filter(e => d2s(e.t) === t).forEach(e => push('labs', 'Lab result', e.a1c ? 'A1c ' + e.a1c + '%' : 'Labs', fmtTime(e.t), e, 'lab', 'var(--sky)'));

  items.sort((a, b) => (a.ref.t < b.ref.t ? 1 : -1));
  $('#todayLogCard').innerHTML = items.length
    ? `<div class="card-head"><div><div class="card-eyebrow">${icon('edit', 12)} Today</div><div class="card-title">${items.length} entr${items.length > 1 ? 'ies' : 'y'} logged</div></div></div>
       <div class="list">${items.map((it, i) => `
         <div class="row">
           <span class="row-ic" style="color:${it.c}">${icon(it.ic, 17)}</span>
           <div class="row-t"><b>${esc(it.label)}</b><span>${esc(it.sub)}</span></div>
           <span class="row-v">${esc(it.val)}</span>
           <button class="icon-btn" style="width:28px;height:28px;border-radius:9px" data-del="${i}" aria-label="Delete">${icon('trash', 14)}</button>
         </div>`).join('')}</div>`
    : `<div class="empty">${icon('edit', 26)}<b>Nothing logged today</b><p>Tap the + button. Weight, glucose and dose are the three that matter most.</p></div>`;
  $$('#todayLogCard [data-del]').forEach(b => b.addEventListener('click', () => {
    const it = items[+b.dataset.del];
    const arr = E()[it.kind], idx = arr.indexOf(it.ref);
    if (idx > -1) { arr.splice(idx, 1); save(); renderAll(); toast('Entry deleted'); }
  }));
}

/* ---------------------------- charts ---------------------------- */
function getThemeColors() {
  const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.dataset && document.documentElement.dataset.theme === 'light';
  return {
    mint: isLight ? '#0A8F6A' : '#2CE5A5',
    teal: isLight ? '#078276' : '#00D9B8',
    sky: isLight ? '#1473BC' : '#4CAAF5',
    amber: isLight ? '#BA6500' : '#FFB834',
    rose: isLight ? '#CE2D30' : '#FF6B6B',
    violet: isLight ? '#6B3EBF' : '#A78BFA',
    daily: isLight ? '#283832' : 'rgba(255,255,255,0.45)',
    dailyDot: isLight ? '#1A2923' : '#FFFFFF',
    targetLine: isLight ? 'rgba(12,24,20,0.38)' : 'rgba(255,255,255,0.38)',
    pointBorder: isLight ? '#FFFFFF' : '#0D1614',
    grid: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
    tick: isLight ? 'rgba(12,24,20,0.65)' : 'rgba(234,243,240,0.45)',
    tooltipBg: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(12,22,19,0.96)',
    tooltipBorder: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)',
    tooltipTitle: isLight ? '#0C1814' : '#EAF3F0',
    tooltipBody: isLight ? '#283631' : '#96A7A1'
  };
}
const C = {
  get mint() { return getThemeColors().mint; },
  get teal() { return getThemeColors().teal; },
  get sky() { return getThemeColors().sky; },
  get amber() { return getThemeColors().amber; },
  get rose() { return getThemeColors().rose; },
  get violet() { return getThemeColors().violet; },
  get daily() { return getThemeColors().daily; },
  get dailyDot() { return getThemeColors().dailyDot; },
  get targetLine() { return getThemeColors().targetLine; },
  get pointBorder() { return getThemeColors().pointBorder; },
  get grid() { return getThemeColors().grid; },
  get tick() { return getThemeColors().tick; }
};
let trendRange = 30;
let bigCharts = [], miniCharts = [];
const chartById = {};   // canvas id -> Chart instance, so reveals can replay entry animation
function destroyCharts() { bigCharts.forEach(c => { try { c.destroy(); } catch (e) {} }); bigCharts = []; for (const k in chartById) delete chartById[k]; }
function destroyMinis() { miniCharts.forEach(c => { try { c.destroy(); } catch (e) {} }); miniCharts = []; }

function hex2rgba(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function vGrad(ctx, area, hex, top) {
  // chartArea is undefined until the first layout pass: fall back to flat, then update
  if (!area) return hex2rgba(hex, (top == null ? 0.22 : top) || 0.22);
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  const maxA = top == null ? 0.32 : top;
  g.addColorStop(0, hex2rgba(hex, maxA));
  g.addColorStop(0.35, hex2rgba(hex, maxA * 0.45));
  g.addColorStop(0.75, hex2rgba(hex, maxA * 0.08));
  g.addColorStop(1, hex2rgba(hex, 0));
  return g;
}
function lineDs(label, pts, color, o) {
  o = o || {};
  const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.dataset && document.documentElement.dataset.theme === 'light';
  const ptBg = o.pointBg || color;
  const ptBorder = o.pointBorder || (isLight ? '#FFFFFF' : '#0D1614');
  return {
    label, data: pts, borderColor: color,
    backgroundColor: o.fill ? c => vGrad(c.chart.ctx, c.chart.chartArea, color, o.fillAmt) : 'transparent',
    borderWidth: o.width || 2.4, borderCapStyle: 'round', borderJoinStyle: 'round',
    tension: 0.38, pointRadius: o.point == null ? 0 : o.point,
    pointHoverRadius: 5.8,
    pointBackgroundColor: ptBg,
    pointBorderColor: ptBorder,
    pointBorderWidth: o.pointBorderWidth != null ? o.pointBorderWidth : 1.6,
    pointHoverBackgroundColor: ptBg,
    pointHoverBorderColor: ptBorder,
    pointHoverBorderWidth: 2,
    borderDash: o.dashed ? [5, 4] : undefined, yAxisID: o.axis || 'y', spanGaps: true,
    type: o.type || undefined,
    _u: o.u || '', _dp: o.dp, hidden: !!o.hidden, showLine: o.showLine !== false
  };
}
const xScale = extra => Object.assign({ grid: { display: false }, border: { display: false }, ticks: { color: () => C.tick, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "JetBrains Mono", monospace', size: 9.5 }, maxRotation: 0, autoSkipPadding: 18 } }, extra || {});
const yScale = extra => Object.assign({ grid: { color: () => C.grid }, border: { display: false }, ticks: { color: () => C.tick, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "JetBrains Mono", monospace', size: 9.5 }, maxTicksLimit: 6 } }, extra || {});
function common(o) {
  const tc = getThemeColors();
  return Object.assign({
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    animations: {
      y: { easing: 'easeOutQuart', duration: 850 }
    },
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tc.tooltipBg, borderColor: tc.tooltipBorder, borderWidth: 1,
        titleColor: tc.tooltipTitle, bodyColor: tc.tooltipBody, padding: 12, cornerRadius: 12, displayColors: true,
        boxWidth: 8, boxHeight: 8, boxPadding: 4, usePointStyle: true,
        titleFont: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif', size: 11, weight: '600' },
        bodyFont: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif', size: 12.5, weight: '600' },
        callbacks: {
          title: its => {
            if (!its || !its.length) return '';
            const it = its[0];
            const rawVal = it.label || (it.chart && it.chart.data && it.chart.data.labels && it.chart.data.labels[it.dataIndex]) || (it.raw && (it.raw.x || it.raw)) || it.parsed.x;
            return fmtLong(rawVal);
          },
          label: it => {
            const ds = it.dataset, u = ds._u || '';
            const val = fmtChartVal(it.parsed.y, u, ds._dp);
            return `  ${ds.label}: ${val}${u ? ' ' + u : ''}`;
          }
        }
      }
    },
    scales: { x: xScale(), y: yScale() }
  }, o);
}
// shaded target zones + reference lines, drawn under the data
const bandPlugin = {
  id: 'retaBands',
  beforeDatasetsDraw(chart) {
    const opts = chart.options || chart.config.options, bands = opts.bands, lines = opts.lines;
    if (!bands && !lines) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    (bands || []).forEach(b => {
      const y1 = scales.y.getPixelForValue(b.lo), y2 = scales.y.getPixelForValue(b.hi);
      ctx.save();
      ctx.fillStyle = b.color || 'rgba(44,229,165,.08)';
      const topY = Math.min(y1, y2);
      const h = Math.abs(y2 - y1) || 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(chartArea.left, topY, chartArea.right - chartArea.left, h, 6);
      else ctx.rect(chartArea.left, topY, chartArea.right - chartArea.left, h);
      ctx.fill();
      if (b.label) {
        ctx.fillStyle = b.labelColor || 'rgba(44,229,165,.85)';
        ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.fillText(b.label.toUpperCase(), chartArea.left + 8, topY + 12);
      }
      ctx.restore();
    });
    (lines || []).forEach(l => {
      const y = scales.y.getPixelForValue(l.y);
      ctx.save();
      ctx.strokeStyle = l.color || C.targetLine || 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath();
      ctx.moveTo(chartArea.left, y); ctx.lineTo(chartArea.right, y); ctx.stroke();
      if (l.label) {
        ctx.setLineDash([]);
        ctx.fillStyle = l.color || C.targetLine || 'rgba(255,255,255,.55)';
        ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.fillText(l.label, chartArea.right - 56, y - 5);
      }
      ctx.restore();
    });
  }
};
try { Chart.register(bandPlugin); } catch (e) {}

function mk(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  const c = new Chart(el, cfg);
  bigCharts.push(c);
  if (el.id) chartById[el.id] = c;
  // re-resolve scriptable fills once chartArea exists (first pass has none)
  requestAnimationFrame(() => { try { c.update(); } catch (e) {} });
  return c;
}
function mkMini(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  const c = new Chart(el, cfg);
  miniCharts.push(c);
  if (el.id) chartById[el.id] = c;
  requestAnimationFrame(() => { try { c.update(); } catch (e) {} });
  return c;
}
const rangePts = (pts, r) => r === 0 ? pts : pts.filter(p => inRange(p.x, r));
const weeksFor = r => r === 0 ? 99 : Math.max(2, Math.ceil(r / 7));

// hero sparkline
function sparkChart(w) {
  destroyMinis();
  const pts = w.avg.slice(-30);
  mkMini('spark', {
    type: 'line',
    data: { labels: pts.map(p => p.x), datasets: [lineDs('Weight', pts, C.mint, { fill: true, width: 2.2, fillAmt: .45 })] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 950, easing: 'easeOutQuart' },
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }
    }
  });
}
// today-view 30-day weight
function w30Chart(w) {
  const pts = rangePts(w.pts, 30), avg = movAvg(pts, 7);
  mk('w30', {
    type: 'line',
    data: { labels: pts.map(p => p.x), datasets: [
      lineDs('Daily', pts, C.daily, { point: 2.2, pointBg: C.dailyDot, pointBorder: C.pointBorder, width: 1.2, u: 'kg', dp: 1 }),
      Object.assign(lineDs('7-day avg', avg, C.mint, { fill: true, width: 2.6, u: 'kg', dp: 1 }), {
        backgroundColor: c => vGrad(c.chart.ctx, c.chart.chartArea, C.mint, .38)
      }),
      lineDs('Goal', pts.map(p => ({ x: p.x, y: state.profile.targetKg })), C.targetLine, { dashed: true, width: 1.2, u: 'kg', dp: 1, point: 0 })
    ] },
    options: common({
      scales: { x: xScale(), y: yScale({ suggestedMin: Math.min(...pts.map(p => p.y)) - 1, suggestedMax: Math.max(...pts.map(p => p.y)) + 1 }) }
    })
  });
}

/* ---------------------------- trends ---------------------------- */
const EYEBROW_IC = {
  'Body weight': 'scale',
  'Body composition': 'body',
  'Diabetes': 'drop',
  'Blood glucose': 'drop',
  'The tape': 'tape',
  'Measurements': 'tape',
  'Training': 'dumb',
  'Workouts': 'dumb',
  'Workouts & lifting': 'dumb',
  'Nutrition': 'apple',
  'Recovery': 'moon',
  'Sleep': 'moon',
  'Vitals': 'heart',
  'Wellbeing': 'fire',
  'Energy & mood': 'fire',
  'Labs': 'lab',
  'Progress': 'cam',
  'Progress photos': 'cam'
};
function card(o) {
  const ic = o.icon || EYEBROW_IC[o.eyebrow] || EYEBROW_IC[o.title] || 'info';
  return `<section class="card reveal ${o.span ? 'span-2' : ''}">
    <div class="card-head">
      <div><div class="card-eyebrow">${icon(ic, 12)} ${o.eyebrow}</div><div class="card-title">${o.title}</div>${o.sub ? `<div class="card-sub">${o.sub}</div>` : ''}</div>
      ${o.action ? `<div class="card-actions">${o.action}</div>` : ''}
    </div>
    ${o.legend ? `<div class="legend">${o.legend.map((l, i) => `<button data-ds="${i}" class="on"><i style="background:${l.color}"></i>${l.label}</button>`).join('')}</div>` : ''}
    ${o.top || ''}
    ${o.empty ? `<div class="empty">${icon(o.icon || 'info', 26)}<b>${o.empty.title}</b><p>${o.empty.body}</p></div>`
      : o.cid ? `<div class="chart-wrap ${o.tall ? 'chart-tall' : ''}"><canvas id="${o.cid}"></canvas></div>` : ''}
    ${o.foot ? `<div class="chart-foot">${o.foot}</div>` : ''}
  </section>`;
}
function wireLegend(chart) {
  const host = chart.canvas.closest('.card');
  $$('.legend button', host).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.ds;
    const meta = chart.getDatasetMeta(i);
    meta.hidden = !meta.hidden;
    b.classList.toggle('on', !meta.hidden);
    chart.update();
  }));
}

function renderTrends() {
  destroyCharts();
  const R = trendRange, P = state.profile, w = wStats();
  const host = $('#chartsHost');
  const html = [];

  // ---- weight ----
  if (w && w.pts.length) {
    const pts = rangePts(w.pts, R), avg = movAvg(pts, 7);
    const slope = linSlope(avg), rate = r1(-slope * 7);   // positive = kg lost per week
    const flat = pts.length > 10 && rate < 0.15;
    const dFirst = avg[0].y, dLast = avg[avg.length - 1].y;
    html.push(card({
      eyebrow: 'Body weight', title: 'Weight trend', span: true,
      sub: 'Daily dots are noise: the smoothed line is the signal.', tall: true,
      legend: [{ label: '7-day average', color: C.mint }, { label: 'Daily', color: C.daily }, { label: 'Goal', color: C.targetLine }],
      action: `<button class="mini-btn" data-add="weight">Log weight</button>`,
      cid: 'chWeight',
      foot: flat
        ? `Nearly flat for this window (<b>${fmtKg(rate)} kg/wk</b>). Normal: exactly when the <b>tape measurements</b> and <b>photos</b> tell the truth. Check water, sleep and protein before the scale.`
        : `<b>${(dFirst - dLast > 0 ? '−' : '+')}${Math.abs(dFirst - dLast).toFixed(1)} kg</b> over this window · <b>${fmtKg(rate)} kg/wk</b> · projection: <b>${w.eta ? fmtLong(w.eta) : '--'}</b>`
    }));
    CH.weight = { pts, avg };
  } else html.push(card({ eyebrow: 'Body weight', title: 'Weight trend', span: true, icon: 'scale', empty: { title: 'No weight logged', body: 'Log your morning weight a few times and this becomes the most honest chart you own.' } }));

  // ---- body composition ----
  const bf = rangePts(series(E().body, 'fatPct'), R), bm = rangePts(series(E().body, 'muscleKg'), R);
  if (bf.length || bm.length) {
    const firstF = bf.length ? bf[0].y : null, lastF = bf.length ? bf[bf.length - 1].y : null;
    const firstM = bm.length ? bm[0].y : null, lastM = bm.length ? bm[bm.length - 1].y : null;
    CH.body = { bf, bm };
    html.push(card({
      eyebrow: 'Body composition', title: 'Fat vs muscle',
      sub: 'On a fast GLP-1-era loss, muscle is what you are trying to keep.',
      legend: [{ label: 'Body fat %', color: C.rose }, { label: 'Muscle mass', color: C.mint }],
      cid: 'chBody',
      foot: [firstF != null && lastF != null ? `fat <b>${fmtKg(firstF)}% → ${fmtKg(lastF)}%</b>` : null,
             firstM != null && lastM != null ? `muscle <b>${fmtKg(firstM)} → ${fmtKg(lastM)} kg</b>` : null,
             (lastM != null && firstM != null && lastM >= firstM - 0.5) ? '<b style="color:var(--mint)">muscle preserved</b>' : null]
        .filter(Boolean).join(' · ')
    }));
  }

  // ---- glucose ----
  const allG = byDate(E().glucose).map(p => ({ x: p.k, y: p.v, ctx: p.ctx, note: p.note }));
  const fast = rangePts(allG.filter(p => p.ctx !== 'postmeal'), R).map(p => ({ x: p.x, y: gluShow(p.y) }));
  const pm = allG.filter(p => p.ctx === 'postmeal' && inRange(p.x, R)).map(p => ({ x: p.x, y: gluShow(p.y) }));
  if (fast.length || pm.length) {
    const g7 = gStats(7), T = gluTarget();
    CH.glu = { fast, pm };
    html.push(card({
      eyebrow: 'Diabetes', title: 'Glucose',
      sub: `Targets: fasting ${gluShow(P.fastingLo)}–${gluShow(P.fastingHi)}, post-meal < ${gluShow(P.postmealHi)} ${gluLabel()}.`,
      tall: true,
      legend: [{ label: 'Fasting', color: C.sky }, { label: 'Post-meal', color: C.amber }],
      action: `<button class="mini-btn" data-add="glucose">Log glucose</button>`,
      cid: 'chGlu',
      foot: g7.tir != null
        ? `Last 7 days: <b>${Math.round(g7.tir * 100)}%</b> of fasts in target (avg ${gluShow(g7.fastAvg)} ${gluLabel()}), ${g7.low != null ? `low ${gluShow(g7.low)}, high ${gluShow(g7.high)}` : ''}.`
        : 'Log a few fasting readings to see time-in-target.'
    }));
  }

  // ---- tape ----
  const wa = rangePts(series(E().measure, 'waist'), R), ne = rangePts(series(E().measure, 'neck'), R);
  const hip = rangePts(series(E().measure, 'hip'), R), chst = rangePts(series(E().measure, 'chest'), R);
  if (wa.length) {
    CH.tape = { wa, ne, hip, chst };
    const dw = wa.length > 1 ? r1(wa[0].y - wa[wa.length - 1].y) : 0;
    const cur = wa[wa.length - 1].y;
    html.push(card({
      eyebrow: 'Measurements', title: 'The tape',
      sub: 'Waist is the cardiometabolic number: under 102 cm is the standard men\'s target.',
      legend: [{ label: 'Waist', color: C.mint }, { label: 'Chest', color: C.sky }, { label: 'Hips', color: C.violet }, { label: 'Neck', color: C.amber }],
      cid: 'chTape',
      foot: `Waist <b>${(+wa[0].y).toFixed(1)} → ${(+cur).toFixed(1)} cm</b> (${dw > 0 ? '−' : '+'}${Math.abs(dw).toFixed(1)}) · ${cur <= 102 ? '<b style="color:var(--mint)">under 102 cm</b>' : `<b>${(cur - 102).toFixed(1)} cm</b> to the 102 cm mark`}`
    }));
  }

  // ---- workouts ----
  const wk = weeklyWorkouts(weeksFor(R));
  if (E().workouts.length) {
    const tot = wk.reduce((a, x) => a + x.min, 0), vol0 = wk[0].vol, volN = wk[wk.length - 1].vol;
    CH.work = { wk };
    html.push(card({
      eyebrow: 'Training', title: 'Workouts',
      sub: 'Weekly active minutes and lifting volume: volume climbing while weight falls is the recomp signature.',
      legend: [{ label: 'Active min', color: C.mint }, { label: 'Volume (kg)', color: C.amber }],
      action: `<button class="mini-btn" data-add="workout">Log workout</button>`,
      cid: 'chWork',
      foot: `<b>${Math.round(tot / wk.length)} min/wk</b> average · ${E().workouts.length} sessions logged · volume ${volN >= vol0 ? `<b style="color:var(--mint)">up ${Math.round((volN / Math.max(1, vol0) - 1) * 100)}%</b>` : `down ${Math.round((1 - volN / Math.max(1, vol0)) * 100)}%`}`
    }));
  }

  // ---- nutrition ----
  const days = Math.max(1, Math.round((R === 0 ? 28 : R)));
  const nut = byDate(E().nutrition).filter(p => inRange(p.k, R === 0 ? 0 : R));
  if (nut.length) {
    const kc = nut.map(p => ({ x: p.k, y: p.kcal })), pr = nut.map(p => ({ x: p.k, y: p.proteinG }));
    const avgP = pr.reduce((a, b) => a + b.y, 0) / pr.length, avgK = kc.reduce((a, b) => a + b.y, 0) / kc.length;
    CH.nut = { kc, pr };
    html.push(card({
      eyebrow: 'Nutrition', title: 'Calories & protein',
      sub: `Protein target ${P.proteinG} g: the lever that keeps muscle on during the drop.`,
      legend: [{ label: 'Calories', color: C.sky }, { label: 'Protein (g)', color: C.mint }, { label: 'Protein target', color: C.targetLine }],
      action: `<button class="mini-btn" data-add="nutrition">Log food</button>`,
      cid: 'chNut',
      foot: `Avg <b>${Math.round(avgK)} kcal</b> · <b>${Math.round(avgP)} g</b> protein (${Math.round(avgP / P.proteinG * 100)}% of target)`
    }));
  }

  // ---- sleep ----
  const sl = rangePts(series(E().sleep, 'h'), R);
  if (sl.length) {
    const avgS = sl.reduce((a, b) => a + b.y, 0) / sl.length;
    CH.sleep = { sl };
    html.push(card({
      eyebrow: 'Recovery', title: 'Sleep',
      sub: 'Under ~6.5 h, fat loss stalls and morning glucose rises.',
      legend: [{ label: 'Hours slept', color: C.violet }],
      cid: 'chSleep',
      foot: `Average <b>${avgS.toFixed(1)} h</b> · ${avgS >= 7 ? '<b style="color:var(--mint)">on track</b>' : 'short of the 7-9 h band'}`
    }));
  }

  // ---- vitals ----
  const sys = rangePts(series(E().bp, 'sys'), R), dia = rangePts(series(E().bp, 'dia'), R), hr = rangePts(series(E().bp, 'hr'), R);
  if (sys.length) {
    const l = sys.length - 1;
    CH.vitals = { sys, dia, hr };
    html.push(card({
      eyebrow: 'Vitals', title: 'Blood pressure & heart rate',
      sub: 'Retatrutide tends to lower blood pressure: worth showing your clinician.',
      legend: [{ label: 'Systolic', color: C.rose }, { label: 'Diastolic', color: C.amber }, { label: 'Heart rate', color: C.sky }],
      cid: 'chVitals',
      foot: `Latest <b>${sys[l].y}/${dia[l].y}</b> mmHg · ${sys[l].y < 130 && dia[l].y < 80 ? '<b style="color:var(--mint)">in the normal band</b>' : 'above the 130/80 reference'}`
    }));
  }

  // ---- energy & mood ----
  const en = rangePts(series(E().mood, 'energy'), R);
  if (en.length) {
    CH.mood = { en };
    html.push(card({
      eyebrow: 'Wellbeing', title: 'Energy & mood',
      sub: 'Energy climbing while weight falls means the deficit is sustainable.',
      legend: [{ label: 'Energy', color: C.amber }, { label: 'Mood', color: C.sky }],
      cid: 'chMood',
      foot: `Energy trending <b>${linSlope(en) > 0.01 ? 'up' : linSlope(en) < -0.01 ? 'down' : 'steady'}</b>: logging this twice a week is plenty.`
    }));
  }

  // ---- HbA1c ----
  const a1c = rangePts(series(E().labs, 'a1c'), R);
  if (a1c.length) {
    CH.a1c = { a1c };
    html.push(card({
      eyebrow: 'Labs', title: 'HbA1c',
      sub: 'The headline diabetes number: drawn roughly every 3 months.',
      legend: [{ label: 'HbA1c (%)', color: C.teal }],
      action: `<button class="mini-btn" data-add="lab">Log labs</button>`,
      cid: 'chA1c',
      foot: a1c.length > 1 ? `<b>${(+a1c[0].y).toFixed(1)}% → ${(+a1c[a1c.length - 1].y).toFixed(1)}%</b> · ${a1c[a1c.length - 1].y <= 6.5 ? '<b style="color:var(--mint)">at or below the 6.5% target</b>' : (a1c[a1c.length - 1].y < 7 ? 'under 7% (on target for many)' : 'above 7% (a good conversation for your next visit)')}` : 'One result logged: add a past baseline to see the change.'
    }));
  }

  // ---- photos ----
  const ph = [...E().photos].sort((a, b) => (a.t < b.t ? -1 : 1));
  html.push(card({
    eyebrow: 'Progress', title: 'Progress photos',
    sub: 'Same lighting, same pose, weekly.',
    top: ph.length ? `<div class="photo-strip">${ph.map(p => `<div class="photo"><img src="${p.dataUrl}" alt="Progress photo"><span>${fmtDate(p.t)}</span></div>`).join('')}</div>`
      : `<div class="empty" style="padding:16px 8px">${icon('cam', 24)}<b>No photos yet</b><p>Weekly photos are the thing you will thank yourself for in 12 weeks.</p></div>`,
    action: `<button class="mini-btn" data-add="photo">Add photo</button>`
  }));

  host.innerHTML = `<div class="grid-d">${html.join('')}</div>`;

  // ---- instantiate charts ----
  if (CH.weight) {
    const { pts, avg } = CH.weight;
    const mn = Math.min(...pts.map(p => p.y)) - 1, mx = Math.max(...pts.map(p => p.y)) + 1;
    const ch = mk('chWeight', {
      type: 'line',
      data: { labels: pts.map(p => p.x), datasets: [
        lineDs('7-day average', avg, C.mint, { fill: true, width: 2.6, u: 'kg', dp: 1 }),
        lineDs('Daily', pts, C.daily, { point: 2.8, pointBg: C.dailyDot, pointBorder: C.pointBorder, width: 1.2, u: 'kg', dp: 1 }),
        lineDs('Goal', pts.map(p => ({ x: p.x, y: P.targetKg })), C.targetLine, { dashed: true, width: 1.2, u: 'kg', dp: 1, point: 0 })
      ] },
      options: common({ scales: { x: xScale(), y: yScale({ suggestedMin: mn, suggestedMax: mx }) } })
    });
    wireLegend(ch);
  }
  if (CH.body) {
    const { bf, bm } = CH.body;
    const labels = Array.from(new Set(bf.map(p => p.x).concat(bm.map(p => p.x)))).sort();
    const ch = mk('chBody', {
      type: 'line',
      data: { labels,
        datasets: [
          lineDs('Body fat %', bf, C.rose, { width: 2.2, u: '%', dp: 1, point: 2 }),
          lineDs('Muscle mass', bm, C.mint, { width: 2.2, u: 'kg', axis: 'y1', point: 0, dp: 1 })
        ] },
      options: common({ scales: { x: xScale(), y: yScale({ position: 'left', suggestedMin: 10, suggestedMax: 40 }), y1: yScale({ position: 'right', suggestedMin: 55, suggestedMax: 78, grid: { display: false } }) } })
    });
    wireLegend(ch);
  }
  if (CH.glu) {
    const { fast, pm } = CH.glu, T = gluTarget(), all = fast.concat(pm).map(p => p.y);
    const mn = Math.min(...all, T.lo) - 1, mx = Math.max(...all, T.hi, gluShow(P.postmealHi)) + 1;
    const labels = Array.from(new Set(fast.map(p => p.x).concat(pm.map(p => p.x)))).sort();
    const ch = mk('chGlu', {
      type: 'line',
      data: { labels,
        datasets: [
          lineDs('Fasting', fast, C.sky, { width: 2.2, u: gluLabel(), point: 2.5, dp: state.profile.units === 'mmol' ? 1 : 0 }),
          lineDs('Post-meal', pm, C.amber, { width: 1.6, u: gluLabel(), point: 3.5, hidden: !pm.length, showLine: false, dp: state.profile.units === 'mmol' ? 1 : 0 })
        ] },
      options: common({
        scales: { x: xScale(), y: yScale({ suggestedMin: mn, suggestedMax: mx }) },
        bands: [{ lo: T.lo, hi: T.hi, color: 'rgba(57,227,166,.09)', label: 'fasting target' }],
        lines: [{ y: gluShow(P.postmealHi), color: hex2rgba(C.amber, .8), label: 'post-meal' },
                { y: gluShow(70), color: hex2rgba(C.rose, .8), label: 'low' }]
      })
    });
    wireLegend(ch);
  }
  if (CH.tape) {
    const { wa, ne, hip, chst } = CH.tape;
    const ch = mk('chTape', {
      type: 'line',
      data: { labels: wa.map(p => p.x),
        datasets: [
          lineDs('Waist', wa, C.mint, { width: 2.4, u: 'cm', point: 2, dp: 1 }),
          lineDs('Chest', chst, C.sky, { width: 1.8, u: 'cm', dp: 1 }),
          lineDs('Hips', hip, C.violet, { width: 1.8, u: 'cm', dp: 1 }),
          lineDs('Neck', ne, C.amber, { width: 1.8, u: 'cm', dp: 1 })
        ] },
      options: common({ scales: { x: xScale(), y: yScale() },
        lines: [{ y: 102, color: C.targetLine, label: '102 cm' }] })
    });
    wireLegend(ch);
  }
  if (CH.work) {
    const { wk } = CH.work;
    const ch = mk('chWork', {
      type: 'bar',
      data: { labels: wk.map(x => x.label),
        datasets: [
          { label: 'Active min', data: wk.map(x => x.min), backgroundColor: c => vGrad(c.chart.ctx, c.chart.chartArea, C.mint, .55), borderRadius: 6, borderSkipped: false, _u: 'min', _dp: 0, maxBarThickness: 26 },
          lineDs('Volume (kg)', wk.map(x => x.vol), C.amber, { width: 2, u: 'kg', axis: 'y1', point: 2, type: 'line', dp: 0 })
        ] },
      options: common({ scales: { x: xScale({ type: 'category' }), y: yScale({ beginAtZero: true }), y1: yScale({ position: 'right', grid: { display: false } }) } })
    });
    wireLegend(ch);
  }
  if (CH.nut) {
    const { kc, pr } = CH.nut;
    const ch = mk('chNut', {
      type: 'bar',
      data: { labels: kc.map(p => p.x),
        datasets: [
          { label: 'Calories', data: kc.map(p => p.y), backgroundColor: c => vGrad(c.chart.ctx, c.chart.chartArea, C.sky, .5), borderRadius: 6, borderSkipped: false, _u: 'kcal', _dp: 0, maxBarThickness: 22 },
          lineDs('Protein (g)', pr.map(p => p.y), C.mint, { width: 2, u: 'g', axis: 'y1', point: 0, type: 'line', dp: 0 })
        ] },
      options: common({ scales: { x: xScale({ type: 'category' }), y: yScale({ beginAtZero: true }), y1: yScale({ position: 'right', suggestedMax: P.proteinG * 1.3, grid: { display: false } }) },
        lines: [{ y: P.proteinG, color: C.targetLine, label: 'target' }] })
    });
    wireLegend(ch);
  }
  if (CH.sleep) {
    const { sl } = CH.sleep;
    const ch = mk('chSleep', {
      type: 'line',
      data: { labels: sl.map(p => p.x), datasets: [lineDs('Hours slept', sl, C.violet, { fill: true, width: 2.2, u: 'h', dp: 1, point: 2 })] },
      options: common({ scales: { x: xScale(), y: yScale({ suggestedMin: 4, suggestedMax: 10 }) },
        bands: [{ lo: 7, hi: 9, color: 'rgba(166,140,255,.10)', label: '7-9 h' }] })
    });
    wireLegend(ch);
  }
  if (CH.vitals) {
    const { sys, dia, hr } = CH.vitals;
    const ch = mk('chVitals', {
      type: 'line',
      data: { labels: sys.map(p => p.x),
        datasets: [
          lineDs('Systolic', sys, C.rose, { width: 2.2, u: 'mmHg', point: 2, dp: 0 }),
          lineDs('Diastolic', dia, C.amber, { width: 2.2, u: 'mmHg', dp: 0 }),
          lineDs('Heart rate', hr, C.sky, { width: 1.8, u: 'bpm', axis: 'y1', point: 0, dp: 0 })
        ] },
      options: common({ scales: { x: xScale(), y: yScale({ suggestedMin: 60, suggestedMax: 150 }), y1: yScale({ position: 'right', suggestedMin: 50, suggestedMax: 95, grid: { display: false } }) } })
    });
    wireLegend(ch);
  }
  if (CH.mood) {
    const { en } = CH.mood;
    const md = rangePts(series(E().mood, 'mood'), R);
    const ch = mk('chMood', {
      type: 'line',
      data: { labels: en.map(p => p.x), datasets: [lineDs('Energy', en, C.amber, { width: 2.2, fill: true, dp: 0, point: 2 }), lineDs('Mood', md, C.sky, { width: 2, dp: 0, point: 2 })] },
      options: common({ scales: { x: xScale(), y: yScale({ suggestedMin: 1, suggestedMax: 5, ticks: { stepSize: 1 } }) } })
    });
    wireLegend(ch);
  }
  if (CH.a1c) {
    const { a1c } = CH.a1c;
    const ch = mk('chA1c', {
      type: 'line',
      data: { labels: a1c.map(p => p.x), datasets: [lineDs('HbA1c (%)', a1c, C.teal, { width: 2.4, point: 4, u: '%', dp: 1 })] },
      options: common({ scales: { x: xScale(), y: yScale({ suggestedMin: 5.5, suggestedMax: 9 }) },
        lines: [{ y: 7, color: C.targetLine, label: '7.0' }, { y: 6.5, color: hex2rgba(C.mint, .7), label: '6.5' }] })
    });
    wireLegend(ch);
  }
  $$('#chartsHost [data-add]').forEach(b => b.addEventListener('click', () => openForm(b.dataset.add)));
  observeReveals();
}
const CH = {};

/* range segmented control */
$$('#rangeSeg button').forEach(b => b.addEventListener('click', () => {
  $$('#rangeSeg button').forEach(x => x.classList.toggle('on', x === b));
  trendRange = +b.dataset.range;
  renderTrends();
}));

/* ----------------------------- dose ----------------------------- */
const SEV_COLOR = ['var(--mint)', 'var(--amber)', 'var(--rose)'];
function renderDose() {
  const P = state.profile, d = doseInfo(), dd = d.dueIn;
  const overdue = dd < 0;
  const curCalc = calcDose(d.currentMg);

  // dose calculator
  $('#calcCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('calc', 12)} Dose calculator</div><div class="card-title">mg → syringe units</div>
      <div class="card-sub">${curCalc.noRecon ? 'Add your vial strength below to unlock unit conversion.'
        : `Vial <b>${P.recon.vialMg} mg</b> + <b>${P.recon.bacMl} ml</b> = <b>${r1(curCalc.conc)} mg/ml</b>`}</div></div>
      <div class="card-actions"><button class="mini-btn" id="calcOpen">Open</button></div></div>
    ${curCalc.noRecon ? `<div class="calc-warn">${icon('alert', 14)}<span>Set your reconstitution strength in More → Reconstitution.</span></div>` : `
      <div class="calc-out" style="text-align:left">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <div><div class="calc-big" style="font-size:30px">${fmtU(curCalc.units)}<span style="font-size:15px;color:var(--muted);font-family:var(--f-ui)"> units</span></div>
          <div class="calc-u">for your ${d.currentMg} mg dose</div></div>
          <div style="margin-left:auto;text-align:right"><div class="calc-u">volume</div><b style="font-family:var(--f-mono);font-size:16px">${curCalc.ml} ml</b></div>
        </div>
        <div class="calc-sub" style="grid-template-columns:1fr 1fr 1fr">
          <div>10 units<b>${curCalc.mgPerUnit} mg</b></div>
          <div>Scheduled<b>${d.expected} mg</b></div>
          <div>Max dose<b>${P.plan.max} mg</b></div>
        </div>
      </div>`}`;

  const freqUnit = d.freqDays === 7 ? 'week' : 'dose';
  $('#nextDoseCard').innerHTML = `
    <div class="card-head">
      <div><div class="card-eyebrow">${icon('syr', 12)} ${freqLabel(d.freqDays)} injection</div>
        <div class="card-title" style="${overdue ? 'color:var(--rose)' : ''}">${overdue ? `${Math.abs(dd)} day${Math.abs(dd) > 1 ? 's' : ''} overdue` : dd === 0 ? 'Due today' : `Due in ${dd} day${dd > 1 ? 's' : ''}`}</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="dose">Log dose</button></div>
    </div>
    <div class="cd">
      <div class="cd-cell"><div class="cd-n" style="${overdue ? 'color:var(--rose)' : ''}">${overdue ? '!' : dd}</div><div class="cd-l">days</div></div>
      <div class="cd-cell"><div class="cd-n">${d.currentMg}</div><div class="cd-l">mg / ${freqUnit}</div></div>
      <div class="cd-cell"><div class="cd-n">${d.totalDoses}</div><div class="cd-l">doses taken</div></div>
      <div class="cd-cell"><div class="cd-n" style="font-size:15px">${d.last ? fmtDate(d.nextDue) : '--'}</div><div class="cd-l">next date</div></div>
    </div>
    <div style="margin-top:13px;display:flex;gap:9px;align-items:center;font-size:12.5px;color:var(--muted)">
      ${icon('syr', 16)}<span>Rotate sites: next <b style="color:var(--ink)">${nextSite()}</b></span>
      <span style="margin-left:auto" class="tag">rung ${d.rung + 1}/${d.ladder.length}</span>
    </div>`;

  // titration ladder: built from your plan
  const wk = P.plan.weeks || 4;
  const freq = freqDays();
  const rungs = d.ladder.map((mg, i) => {
    const start = P.firstDose ? addDays(P.firstDose, 7 * wk * i) : null;
    const end = start ? addDays(start, 7 * wk - 1) : null;
    const cls = i < d.rung ? 'done' : i === d.rung ? 'now' : '';
    const st = i < d.rung ? 'Done' : i === d.rung ? 'Current' : start ? fmtDate(start) : 'Upcoming';
    const c = calcDose(mg);
    return `<div class="rung ${cls}">
      <div class="rung-d">${mg} mg</div>
      <div class="rung-t"><b>Weeks ${wk * i + 1} to ${wk * (i + 1)} · ${freqLabel(freq)}</b>
        <span>${start ? `${fmtDate(start)} to ${fmtDate(end)}` : 'set your first-dose date in More → Profile'}${c.noRecon ? '' : ` · ${fmtU(c.units)} units`}</span></div>
      <div class="rung-st">${st}</div>
      <div class="rung-x">${i < d.rung ? `<span style="color:var(--mint)">${icon('check', 15)}</span>` : i === d.rung ? `<span style="color:var(--mint)">${icon('clock', 15)}</span>` : ''}</div>
    </div>`;
  }).join('');
  $('#ladderCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('up', 12)} Titration · your ladder</div><div class="card-title">${P.plan.start} → ${P.plan.max} mg · ${freqLabel(freq)}, +${P.plan.step} mg every ${wk} wk</div>
      <div class="card-sub">Scroll for later rungs. Follow your own prescription.</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="calc">Calc</button></div></div>
    <div class="ladder">${rungs}</div>`;

  // injection history / site rotation
  const hist = [...d.doses].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 8);
  $('#siteCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('body', 12)} Site rotation</div><div class="card-title">Recent injections</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="dose">Log</button></div></div>
    ${hist.length ? `<div class="list">${hist.map(x => `<div class="row">
        <span class="row-ic" style="color:var(--violet)">${icon('syr', 16)}</span>
        <div class="row-t"><b>${esc(x.site || '--')}</b><span>${fmtLong(x.t)}</span></div>
        <span class="row-v">${x.mg} mg${x.units ? ` · ${fmtU(x.units)}u` : ''}</span></div>`).join('')}</div>`
      : `<div class="empty">${icon('syr', 24)}<b>No injections logged</b><p>Log your first dose and the countdown, ladder and rotation hints all come alive.</p></div>`}`;

  // side effects
  const syms = [...E().symptoms].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 8);
  $('#symptomCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('alert', 12)} Tolerability</div><div class="card-title">Side effects</div>
      <div class="card-sub">Severity patterns are exactly what your clinician wants before an escalation.</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="symptom">Log</button></div></div>
    ${syms.length ? `<div class="list">${syms.map(s => `<div class="row">
        <span class="row-ic" style="color:${SEV_COLOR[s.sev - 1]}">${icon('alert', 16)}</span>
        <div class="row-t"><b>${esc(s.type)}</b><span>${fmtLong(s.t)}${s.note ? ' · ' + esc(s.note) : ''}</span></div>
        <span class="row-v" style="color:${SEV_COLOR[s.sev - 1]}">${['', 'mild', 'moderate', 'severe'][s.sev]}</span></div>`).join('')}</div>`
      : `<div class="empty">${icon('check', 24)}<b>Nothing logged</b><p>That is good news. Log even mild symptoms: the pattern matters more than any single day.</p></div>`}`;

  // latest labs
  const labs = [...E().labs].sort((a, b) => (a.t < b.t ? 1 : -1));
  const lastL = labs[0], prevL = labs[1];
  const L = [['A1c', 'a1c', '%', 1], ['LDL', 'ldl', '', 0], ['HDL', 'hdl', '', 0], ['Trigl.', 'tg', '', 0], ['eGFR', 'egfr', '', 0], ['ALT', 'alt', '', 0]];
  $('#labCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('lab', 12)} Labs</div><div class="card-title">Latest results</div>
      <div class="card-sub">${lastL ? fmtLong(lastL.t) + (lastL.note ? ' · ' + esc(lastL.note) : '') : 'nothing logged'}</div></div>
      <div class="card-actions"><button class="mini-btn" data-add="lab">Log labs</button></div></div>
    ${lastL ? `<div class="stat-grid" style="margin-bottom:0">${L.map(([l, k, u, dp]) => {
      const v = lastL[k], p = prevL ? prevL[k] : null, dv = (v != null && p != null) ? v - p : null;
      return `<div class="stat" style="padding:10px 12px"><div class="stat-l">${l}</div>
        <div class="stat-v" style="font-size:19px">${v != null ? (dp != null ? (+v).toFixed(dp) : Math.round(+v)) : '--'}<small>${u}</small></div>
        <div class="stat-f">${dv != null ? `<span class="delta ${Math.abs(dv) < 0.01 ? 'flat' : (k === 'hdl' || k === 'egfr' ? (dv > 0 ? 'good' : 'bad') : (dv < 0 ? 'good' : 'bad'))}">${dv > 0 ? '+' : ''}${dp != null ? (+dv).toFixed(dp) : Math.round(+dv)}</span>` : '<span class="delta flat">baseline</span>'}</div></div>`;
    }).join('')}</div>`
      : `<div class="empty">${icon('lab', 24)}<b>No lab results yet</b><p>Log your baseline HbA1c, lipids and kidney panel: the before-and-after is worth it.</p></div>`}`;

  $$('#view-dose [data-add]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.add === 'calc') openCalc(); else openForm(b.dataset.add);
  }));
  const co = $('#calcOpen'); if (co) co.addEventListener('click', () => openCalc(d.currentMg));
  observeReveals();
}

/* ------------------------- retatrutide tips ------------------------- */
const RETA_TIPS = [
  {
    id: 'titration',
    cat: 'titration',
    tag: 'Titration',
    tagColor: 'var(--mint)',
    tagBg: 'rgba(10,143,106,.14)',
    icon: 'pill',
    title: 'Start low and allow 4+ weeks per rung',
    desc: 'Retatrutide has an elimination half-life of roughly 6 days. It takes 4 to 5 weeks for blood serum concentrations to reach a steady plateau. Do not rush dose increases simply because hunger suppression feels subtle early on: glucagon thermogenesis and GIP receptor activity ramp up progressively in the background.',
    src: 'NEJM Phase 2 Trial & Clinical Consensus'
  },
  {
    id: 'hydration',
    cat: 'hydration',
    tag: 'Hydration',
    tagColor: 'var(--sky)',
    tagBg: 'rgba(20,115,188,.14)',
    icon: 'drop',
    title: 'Morning electrolytes & generous water',
    desc: 'Glucagon receptor activation speeds hepatic glycogen breakdown, carrying significant water and mineral ions out of the body in the first weeks. Drinking 2.5 to 3 liters of water and adding morning electrolytes (sodium, potassium, magnesium) helps prevent postural dizziness, morning fatigue, and keto-like headaches.',
    src: 'Community Protocol · r/Retatrutide'
  },
  {
    id: 'protein',
    cat: 'nutrition',
    tag: 'Nutrition',
    tagColor: 'var(--amber)',
    tagBg: 'rgba(186,101,0,.14)',
    icon: 'apple',
    title: 'Prioritize protein to defend lean muscle',
    desc: 'Target 1.2 to 1.6 grams of protein per kilogram of body weight daily (or at least 100 to 130 grams). Retatrutide substantially elevates 24-hour resting energy expenditure. Pairing high protein intake with resistance training protects your skeletal muscle mass while fat oxidation runs at full speed.',
    src: 'Peptide Medicine & Exercise Science'
  },
  {
    id: 'vitals',
    cat: 'vitals',
    tag: 'Vitals',
    tagColor: 'var(--rose)',
    tagBg: 'rgba(206,45,48,.14)',
    icon: 'heart',
    title: 'Monitor morning resting heart rate',
    desc: 'Both GLP-1 and glucagon receptor activation moderately stimulate sinoatrial cardiac tissue. Clinical studies report an average resting heart rate rise of 2 to 7 beats per minute. Log your resting HR regularly and hold off escalating your dose if you observe sustained spikes or palpitations.',
    src: 'Phase 2 Safety Data & Cardiology Reviews'
  },
  {
    id: 'sens',
    cat: 'effects',
    tag: 'Side Effects',
    tagColor: 'var(--violet)',
    tagBg: 'rgba(107,62,191,.14)',
    icon: 'alert',
    title: 'Transient skin sensitivity (Allodynia)',
    desc: 'Some researchers report transient skin sensitivity or mild tingling (feels like a light sunburn without any visible redness or rash, usually across shoulders, neck, or back). This is a known, benign GLP-1/GIP class effect that typically resolves on its own within 2 to 4 weeks.',
    src: 'Patient Logs & Clinical Trial Observations'
  },
  {
    id: 'rotation',
    cat: 'titration',
    tag: 'Dosing',
    tagColor: 'var(--teal)',
    tagBg: 'rgba(7,130,118,.14)',
    icon: 'body',
    title: 'Rotate subcutaneous injection sites',
    desc: 'Rotate your weekly injection site among the 4 abdominal quadrants, thighs, and outer upper arms. Many community members experiencing mild nausea find that switching from the abdominal area to the outer thigh or upper arm noticeably improves gastrointestinal comfort.',
    src: 'Subcutaneous Administration Guidelines'
  },
  {
    id: 'alcohol',
    cat: 'nutrition',
    tag: 'Lifestyle',
    tagColor: 'var(--amber)',
    tagBg: 'rgba(186,101,0,.14)',
    icon: 'fire',
    title: 'Alcohol tolerance drops significantly',
    desc: 'Triple agonists alter gastric emptying and liver metabolism. Alcohol hits much faster, magnifies next-day dehydration, triggers tachycardia, and can cause intense nausea. Limit alcoholic beverages, especially within 48 hours of your injection.',
    src: 'r/Retatrutide Clinical Insights'
  },
  {
    id: 'measure',
    cat: 'progress',
    tag: 'Progress',
    tagColor: 'var(--mint)',
    tagBg: 'rgba(10,143,106,.14)',
    icon: 'tape',
    title: 'Track waist measurements and photos',
    desc: 'Retatrutide aggressively targets visceral abdominal fat and hepatic (liver) lipids. Even when the bathroom scale pauses due to water retention or muscle maintenance, waist tape measurements and fortnightly photos frequently show noticeable body recomposition continuing uninterrupted.',
    src: 'Body Composition Imaging Analysis'
  }
];

let selectedTipFilter = 'all';
function renderTips() {
  const el = $('#tipsCard');
  if (!el) return;
  const filtered = selectedTipFilter === 'all' ? RETA_TIPS : RETA_TIPS.filter(t => t.cat === selectedTipFilter);
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'titration', label: 'Titration' },
    { id: 'hydration', label: 'Hydration' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'effects', label: 'Side effects' }
  ];
  el.innerHTML = `
    <div class="card-head">
      <div>
        <div class="card-eyebrow">${icon('star', 12)} Retatrutide insights</div>
        <div class="card-title">Community & clinical tips</div>
        <div class="card-sub">Distilled from peer-reviewed Phase 2 trials, peptide medicine consensus, and real-world patient logs.</div>
      </div>
    </div>
    <div class="seg" style="margin:10px 0 12px;overflow-x:auto" id="tipCatSeg" role="tablist">
      ${categories.map(c => `<button data-cat="${c.id}" class="${selectedTipFilter === c.id ? 'on' : ''}" style="font-size:11px;padding:5px 11px;white-space:nowrap">${c.label}</button>`).join('')}
    </div>
    <div class="tips-grid">
      ${filtered.map(t => `
        <div class="tip-item">
          <div class="tip-head">
            <div class="tip-ic" style="color:${t.tagColor};background:${t.tagBg}">${icon(t.icon, 15)}</div>
            <div class="tip-title">${esc(t.title)}</div>
            <span class="tip-tag" style="color:${t.tagColor};background:${t.tagBg}">${esc(t.tag)}</span>
          </div>
          <p class="tip-desc">${esc(t.desc)}</p>
          <span class="tip-src">Source: ${esc(t.src)}</span>
        </div>
      `).join('')}
    </div>
  `;
  $$('#tipCatSeg button').forEach(btn => btn.addEventListener('click', () => {
    selectedTipFilter = btn.dataset.cat;
    renderTips();
  }));
}

/* ----------------------------- more ----------------------------- */
function fieldRow(label, inner) { return `<div class="field"><label>${label}</label>${inner}</div>`; }
function renderMore() {
  const P = state.profile;
  const inp = (id, v, type, ph) => `<input id="m_${id}" type="${type || 'number'}" step="${type === 'text' ? '' : 'any'}" value="${v == null ? '' : v}" placeholder="${ph || ''}">`;

  $('#appearanceCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('sun', 12)} Appearance</div><div class="card-title">Theme</div>
      <div class="card-sub">Translucent liquid glass: follows your phone's setting when on System.</div></div></div>
    <div class="seg-toggle" id="m_theme">
      <button data-t="system" class="${P.theme === 'system' ? 'on' : ''}">System</button>
      <button data-t="light" class="${P.theme === 'light' ? 'on' : ''}">Light</button>
      <button data-t="dark" class="${P.theme === 'dark' ? 'on' : ''}">Dark</button>
    </div>`;

  const conc = concMgL();
  $('#reconCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('calc', 12)} Reconstitution</div><div class="card-title">Vial strength</div>
      <div class="card-sub">${conc ? `Currently <b>${r1(conc)} mg/ml</b>: every 10 units (0.1 ml) delivers ${r2(conc / 100)} mg.` : 'Saved here and used by the dose calculator.'}</div></div>
      <div class="card-actions"><button class="mini-btn" id="calcFromMore">Calc</button></div></div>
    <div class="field-row">
      ${fieldRow('Vial amount (mg)', inp('vialMg', P.recon.vialMg))}
      ${fieldRow('BAC water added (ml)', inp('bacMl', P.recon.bacMl))}
    </div>
    <div class="hint" id="reconLive"></div>
    <button class="btn primary block" id="saveRecon">Save strength</button>`;

  const curFreq = freqDays();
  const isCustomFreq = ![7, 3.5, 5, 4, 3, 6, 10, 14].includes(curFreq);
  const curWk = +P.plan.weeks || 4;
  const isCustomWk = ![1, 2, 3, 4, 6, 8].includes(curWk);
  const curMax = +P.plan.max || 30;
  const isCustomMax = ![5, 10, 12, 15, 20, 24, 25, 30].includes(curMax);
  $('#planCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('pill', 12)} Titration &amp; Schedule</div><div class="card-title">Dose protocol</div>
      <div class="card-sub">Your protocol: injection frequency, starting dose, step-up interval, and ceiling.</div></div></div>
    <div class="field">
      <label>Injection frequency</label>
      <select id="m_planFreq">
        <option value="7" ${curFreq === 7 ? 'selected' : ''}>Every 7 days (Once weekly)</option>
        <option value="3.5" ${curFreq === 3.5 ? 'selected' : ''}>Every 3.5 days (Twice weekly / split)</option>
        <option value="5" ${curFreq === 5 ? 'selected' : ''}>Every 5 days</option>
        <option value="4" ${curFreq === 4 ? 'selected' : ''}>Every 4 days</option>
        <option value="3" ${curFreq === 3 ? 'selected' : ''}>Every 3 days</option>
        <option value="6" ${curFreq === 6 ? 'selected' : ''}>Every 6 days</option>
        <option value="10" ${curFreq === 10 ? 'selected' : ''}>Every 10 days</option>
        <option value="14" ${curFreq === 14 ? 'selected' : ''}>Every 14 days (Every 2 weeks)</option>
        <option value="custom" ${isCustomFreq ? 'selected' : ''}>Custom days...</option>
      </select>
    </div>
    <div class="field" id="m_planFreqCustomWrap" style="${isCustomFreq ? '' : 'display:none'}">
      <label>Custom interval (days)</label>
      <input id="m_planFreqCustom" type="number" inputmode="decimal" step="any" min="1" max="60" value="${curFreq}" placeholder="e.g. 5">
    </div>
    <div class="field-row">
      ${fieldRow('Starting dose (mg)', inp('planStart', P.plan.start))}
      ${fieldRow('Step up by (mg)', `<select id="m_planStep">${['0.5', '1', '1.5', '2', '2.5', '5'].map(v => `<option value="${v}" ${String(P.plan.step) === v ? 'selected' : ''}>${v} mg</option>`).join('')}</select>`)}
    </div>
    <div class="field-row">
      <div class="field">
        <label>Increase every</label>
        <select id="m_planWk">
          ${[1, 2, 3, 4, 6, 8].map(v => `<option value="${v}" ${!isCustomWk && curWk === v ? 'selected' : ''}>${v} week${v > 1 ? 's' : ''}</option>`).join('')}
          <option value="custom" ${isCustomWk ? 'selected' : ''}>Custom weeks...</option>
        </select>
      </div>
      <div class="field">
        <label>Max dose (mg)</label>
        <select id="m_planMax">
          ${[5, 10, 12, 15, 20, 24, 25, 30].map(v => `<option value="${v}" ${!isCustomMax && curMax === v ? 'selected' : ''}>${v} mg</option>`).join('')}
          <option value="custom" ${isCustomMax ? 'selected' : ''}>Custom max dose...</option>
        </select>
      </div>
    </div>
    <div class="field" id="m_planWkCustomWrap" style="${isCustomWk ? '' : 'display:none'}">
      <label>Custom increase interval (weeks)</label>
      <input id="m_planWkCustom" type="number" inputmode="numeric" min="1" max="52" value="${curWk}" placeholder="e.g. 6">
    </div>
    <div class="field" id="m_planMaxCustomWrap" style="${isCustomMax ? '' : 'display:none'}">
      <label>Custom max dose (mg)</label>
      <input id="m_planMaxCustom" type="number" inputmode="decimal" step="any" min="0.5" max="100" value="${curMax}" placeholder="e.g. 35">
    </div>
    <div class="hint" id="planLive"></div>
    <button class="btn primary block" id="savePlan">Save protocol</button>`;

  $('#profileCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('body', 12)} Profile</div><div class="card-title">About you</div></div></div>
    <div class="field-row">
      ${fieldRow('Height (cm)', inp('heightCm', P.heightCm))}
      ${fieldRow('Sex', `<select id="m_sex"><option value="male" ${P.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${P.sex === 'female' ? 'selected' : ''}>Female</option></select>`)}
    </div>
    <div class="field-row">
      ${fieldRow('Starting weight (kg)', inp('startKg', P.startKg))}
      ${fieldRow('Target weight (kg)', inp('targetKg', P.targetKg))}
    </div>
    ${fieldRow('First injection date', inp('firstDose', d2s(P.firstDose) || today(), 'date'))}
    <div class="field-row">
      ${fieldRow('Glucose units', `<div class="seg-toggle" id="m_units"><button data-u="mgdl" class="${P.units === 'mgdl' ? 'on' : ''}">mg/dL</button><button data-u="mmol" class="${P.units === 'mmol' ? 'on' : ''}">mmol/L</button></div>`)}
      <div class="field">
        <label>Fasting targets (${gluLabel()})</label>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
          ${inp('fastingLo', gluShow(P.fastingLo), 'number', 'Low')}
          ${inp('fastingHi', gluShow(P.fastingHi), 'number', 'High')}
        </div>
      </div>
    </div>
    <button class="btn primary block" id="saveProfile">Save profile</button>`;

  // render tips card
  renderTips();

  $('#goalCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('crown', 12)} Daily targets</div><div class="card-title">Goals & defaults</div>
      <div class="card-sub">Used for the habit rings and the dashed target lines.</div></div></div>
    <div class="field-row">${fieldRow('Calories', inp('kcalTarget', P.kcalTarget))}${fieldRow('Protein (g)', inp('proteinG', P.proteinG))}</div>
    <div class="field-row">${fieldRow('Water (ml)', inp('waterMl', P.waterMl))}${fieldRow('Sleep (h)', inp('sleepH', P.sleepH))}</div>
    ${fieldRow('Steps', inp('stepTarget', P.stepTarget))}
    <button class="btn primary block" id="saveGoals">Save targets</button>`;

  const unlocked = ACHV.filter(a => a.check());
  $('#badgeCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('star', 12)} Milestones</div><div class="card-title">${unlocked.length} of ${ACHV.length} unlocked</div></div></div>
    <div class="badge-grid">${ACHV.map(a => `<div class="badge ${a.check() ? '' : 'locked'}">
      <div class="badge-ic" style="color:${a.check() ? 'var(--mint)' : 'var(--faint)'}">${icon(a.icon, 18)}</div>
      <b>${a.name}</b><span>${a.sub}</span></div>`).join('')}</div>`;

  $('#dataCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('dl', 12)} Your data</div><div class="card-title">Own every byte</div>
      <div class="card-sub">Everything is stored locally in this browser. Nothing is uploaded unless you choose to sync.</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px">
      <button class="btn sm" id="btnExport">${icon('dl', 15)} Export backup</button>
      <button class="btn sm" id="btnImport">${icon('ul', 15)} Import backup</button>
      <button class="btn sm" id="btnCopy">${icon('copy', 15)} Copy data</button>
      <button class="btn sm warn" id="btnWipe">${icon('trash', 15)} Clear all</button>
    </div>
    <input type="file" id="importFile" accept="application/json" style="display:none">
    <div class="field" style="margin-top:12px"><label>Cloud sync URL (optional · experimental)</label>
      ${inp('syncUrl', P.syncUrl, 'text', 'https://kvdb.io/your-bucket-id/reta')}
      <div class="hint">Point this at any free JSON key-value bin. For kvdb.io, include a key name at the end (e.g. <code>/reta</code>) and ensure you verify the activation email sent by kvdb.io to enable writing. Push uploads, Pull downloads.</div></div>
    <div style="display:flex;gap:9px">
      <button class="btn sm ghost" id="btnPush" style="flex:1">${icon('sync', 15)} Push</button>
      <button class="btn sm ghost" id="btnPull" style="flex:1">${icon('sync', 15)} Pull</button>
    </div>
    <button class="btn sm ghost block" id="btnDemo" style="margin-top:10px">Reload demo journey</button>`;

  $('#aboutCard').innerHTML = `
    <div class="card-head"><div><div class="card-eyebrow">${icon('info', 12)} About</div><div class="card-title">RetaLog</div></div></div>
    <div class="chart-foot" style="border:none;padding-top:0">
      A private, offline-first tracker for your Retatrutide journey: built for a phone first, because that is where life gets logged.
      <br><br>Weight follows the 7-day average. Glucose, blood pressure and HbA1c get shaded clinical target bands. The dose calculator converts your vial strength into exact syringe units, and the titration ladder mirrors your own protocol: 0.5 mg all the way to 30 mg.
      <br><br><b>Not medical advice.</b> This tool records what you tell it and shows it back beautifully. Decisions about dosing, medication and targets belong to you and your clinician: bring the charts to your appointments.
    </div>`;

  // wiring
  $$('#m_theme button').forEach(b => b.addEventListener('click', () => {
    $$('#m_theme button').forEach(x => x.classList.toggle('on', x === b));
    applyTheme(b.dataset.t);
    toast(b.dataset.t === 'system' ? 'Theme follows your system' : b.dataset.t === 'light' ? 'Light glass on' : 'Dark glass on');
  }));
  const reconLive = () => {
    const v = +$('#m_vialMg').value, b = +$('#m_bacMl').value;
    $('#reconLive').innerHTML = (v > 0 && b > 0)
      ? `Concentration <b>${r1(v / b)} mg/ml</b> → your ${P.plan.start} mg dose is <b>${fmtU(calcDose(P.plan.start).units)} units</b>`
      : '';
  };
  $('#m_vialMg').addEventListener('input', reconLive);
  $('#m_bacMl').addEventListener('input', reconLive);
  reconLive();
  $('#saveRecon').addEventListener('click', () => {
    const v = +$('#m_vialMg').value, b = +$('#m_bacMl').value;
    if (!(v > 0 && b > 0)) { toast('Enter both the vial amount and the water volume.', 'err'); return; }
    P.recon = { vialMg: v, bacMl: b };
    save(); renderAll(); toast(`Vial strength saved: ${r1(v / b)} mg/ml`);
  });
  const planLive = () => {
    const s = +$('#m_planStart').value || P.plan.start;
    let f = parseFloat($('#m_planFreq') ? $('#m_planFreq').value : (P.plan.freqDays || 7));
    if ($('#m_planFreq') && $('#m_planFreq').value === 'custom') {
      f = parseFloat($('#m_planFreqCustom') ? $('#m_planFreqCustom').value : f) || f;
    }
    let wk = +($('#m_planWk') ? $('#m_planWk').value : (P.plan.weeks || 4));
    if ($('#m_planWk') && $('#m_planWk').value === 'custom') {
      wk = +($('#m_planWkCustom') ? $('#m_planWkCustom').value : wk) || 4;
    }
    let mx = +($('#m_planMax') ? $('#m_planMax').value : (P.plan.max || 30));
    if ($('#m_planMax') && $('#m_planMax').value === 'custom') {
      mx = +($('#m_planMaxCustom') ? $('#m_planMaxCustom').value : mx) || 30;
    }
    $('#planLive').innerHTML = `Protocol: <b>${doseInfo().expected} mg</b> (${freqLabel(f)}) = <b>${fmtU(calcDose(doseInfo().expected).units)} units</b> · stepping every ${wk} wk up to ${mx} mg.`;
  };
  const freqSel = $('#m_planFreq');
  if (freqSel) {
    freqSel.addEventListener('change', () => {
      const isC = freqSel.value === 'custom';
      const w = $('#m_planFreqCustomWrap');
      if (w) w.style.display = isC ? 'block' : 'none';
      if (isC && $('#m_planFreqCustom')) $('#m_planFreqCustom').focus();
      planLive();
    });
  }
  const freqCust = $('#m_planFreqCustom');
  if (freqCust) freqCust.addEventListener('input', planLive);

  const wkSel = $('#m_planWk');
  if (wkSel) {
    wkSel.addEventListener('change', () => {
      const isC = wkSel.value === 'custom';
      const w = $('#m_planWkCustomWrap');
      if (w) w.style.display = isC ? 'block' : 'none';
      if (isC && $('#m_planWkCustom')) $('#m_planWkCustom').focus();
      planLive();
    });
  }
  const wkCust = $('#m_planWkCustom');
  if (wkCust) wkCust.addEventListener('input', planLive);

  const maxSel = $('#m_planMax');
  if (maxSel) {
    maxSel.addEventListener('change', () => {
      const isC = maxSel.value === 'custom';
      const w = $('#m_planMaxCustomWrap');
      if (w) w.style.display = isC ? 'block' : 'none';
      if (isC && $('#m_planMaxCustom')) $('#m_planMaxCustom').focus();
      planLive();
    });
  }
  const maxCust = $('#m_planMaxCustom');
  if (maxCust) maxCust.addEventListener('input', planLive);

  $('#m_planStart').addEventListener('input', planLive);
  $('#m_planStep').addEventListener('change', planLive);
  planLive();

  $('#savePlan').addEventListener('click', () => {
    const s = +$('#m_planStart').value;
    if (!(s >= 0.5 && s <= 100)) { toast('Starting dose must be 0.5 to 100 mg.', 'err'); return; }
    let f = parseFloat($('#m_planFreq').value);
    if ($('#m_planFreq').value === 'custom') {
      f = parseFloat($('#m_planFreqCustom') ? $('#m_planFreqCustom').value : 7);
    }
    if (!f || f <= 0 || isNaN(f)) f = 7;

    let wk = +$('#m_planWk').value;
    if ($('#m_planWk').value === 'custom') {
      wk = +($('#m_planWkCustom') ? $('#m_planWkCustom').value : 4);
    }
    if (!wk || wk <= 0 || isNaN(wk)) wk = 4;

    let mx = +$('#m_planMax').value;
    if ($('#m_planMax').value === 'custom') {
      mx = +($('#m_planMaxCustom') ? $('#m_planMaxCustom').value : 30);
    }
    if (!mx || mx <= 0 || isNaN(mx)) mx = 30;

    P.plan = {
      start: s,
      step: +$('#m_planStep').value,
      weeks: wk,
      max: mx,
      freqDays: f
    };
    save(); renderAll(); toast(`Protocol saved: ${freqLabel(f)}, max ${mx} mg`);
  });
  const cfm = $('#calcFromMore'); if (cfm) cfm.addEventListener('click', () => openCalc());
  $$('#m_units button').forEach(b => b.addEventListener('click', () => $$('#m_units button').forEach(x => x.classList.toggle('on', x === b))));
  $('#saveProfile').addEventListener('click', () => {
    const g = id => $('#' + id) ? $('#' + id).value : '';
    const nu = ($('#m_units button.on') || {}).dataset ? $('#m_units button.on').dataset.u : P.units;
    const conv = v => nu === 'mmol' && v ? toMgdl(+v) : +v;
    P.heightCm = +g('m_heightCm') || P.heightCm;
    P.sex = g('m_sex') || P.sex;
    P.startKg = +g('m_startKg') || P.startKg;
    P.targetKg = +g('m_targetKg') || P.targetKg;
    P.units = nu;
    P.fastingLo = conv(g('m_fastingLo')) || P.fastingLo;
    P.fastingHi = conv(g('m_fastingHi')) || P.fastingHi;
    P.firstDose = d2s(g('m_firstDose')) || P.firstDose;
    save(); renderAll(); toast('Profile saved');
  });
  $('#saveGoals').addEventListener('click', () => {
    const g = id => $('#' + id) ? $('#' + id).value : '';
    P.kcalTarget = +g('m_kcalTarget') || P.kcalTarget;
    P.proteinG = +g('m_proteinG') || P.proteinG;
    P.waterMl = +g('m_waterMl') || P.waterMl;
    P.sleepH = +g('m_sleepH') || P.sleepH;
    P.stepTarget = +g('m_stepTarget') || P.stepTarget;
    save(); renderAll(); toast('Targets saved');
  });
  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnImport').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', importJSON);
  $('#btnCopy').addEventListener('click', copyData);
  $('#btnWipe').addEventListener('click', () => {
    if (!confirm('Delete every entry and start the onboarding again? This cannot be undone.')) return;
    localStorage.removeItem(LS);
    localStorage.removeItem(LEGACY_LS);   // or the old store would re-migrate straight back
    stopWaterNudges();
    // drop any cached shell too, so the reload is guaranteed a clean fetch
    try { caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).catch(() => {}); } catch (e) {}
    location.reload();
  });
  $('#btnDemo').addEventListener('click', () => { if (confirm('Replace your current data with the 12-week demo journey?')) { seedDemo(); renderAll(); toast('Demo journey loaded'); } });
  $('#btnPush').addEventListener('click', syncPush);
  $('#btnPull').addEventListener('click', syncPull);
  const syncInp = document.getElementById('m_syncUrl');
  if (syncInp) {
    syncInp.addEventListener('change', () => readSyncUrl());
    syncInp.addEventListener('blur', () => readSyncUrl());
  }
  observeReveals();
}

/* ---------------------------- data io --------------------------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `retalog-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup downloaded: save it to Files or iCloud Drive');
}
function importJSON(ev) {
  const f = ev.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const p = JSON.parse(rd.result);
      if (!p || !p.profile || !p.entries) throw new Error('bad shape');
      const d = DEFAULTS();
      state = { v: 2, profile: Object.assign(d.profile, p.profile), entries: Object.assign(d.entries, p.entries) };
      save(); renderAll(); closeSheets();
      toast('Backup imported');
    } catch (e) { toast('That file is not a RETA backup', 'err'); }
  };
  rd.readAsText(f);
  ev.target.value = '';
}
async function copyData() {
  try { await navigator.clipboard.writeText(JSON.stringify(state)); toast('Data copied: paste it anywhere safe'); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = JSON.stringify(state); document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast('Data copied');
  }
}
async function syncPush() {
  const url = readSyncUrl();
  if (!url) return toast('Set a sync URL first (More → Cloud sync)', 'warn');

  try {
    const parsed = new URL(url);
    if ((parsed.hostname === 'kvdb.io' || parsed.hostname.endsWith('.kvdb.io')) && parsed.pathname.split('/').filter(Boolean).length < 2) {
      return toast('KVdb URL needs a key name at the end (e.g. /reta)', 'warn', 5000);
    }
  } catch (_) {}

  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: 2, at: new Date().toISOString(), profile: state.profile, entries: state.entries })
    });
    if (!r.ok) {
      const text = (await r.text().catch(() => '')).trim();
      if (r.status === 403 && /email address not verified/i.test(text)) {
        return toast('KVdb: Verify your email at kvdb.io/login to enable writing', 'err', 6500);
      }
      if (r.status === 405) {
        return toast('URL rejected: missing key name at end (e.g. /reta)', 'err', 5000);
      }
      throw new Error(`HTTP ${r.status}${text ? ': ' + text : ''}`);
    }
    toast('Pushed to your cloud bin');
  } catch (e) {
    toast(`Push failed: ${e.message || 'Check URL and connection'}`, 'err', 5500);
  }
}
async function syncPull() {
  const url = readSyncUrl();
  if (!url) return toast('Set a sync URL first (More → Cloud sync)', 'warn');

  try {
    const parsed = new URL(url);
    if ((parsed.hostname === 'kvdb.io' || parsed.hostname.endsWith('.kvdb.io')) && parsed.pathname.split('/').filter(Boolean).length < 2) {
      return toast('KVdb URL needs a key name at the end (e.g. /reta)', 'warn', 5000);
    }
  } catch (_) {}

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = (await r.text().catch(() => '')).trim();
      if (r.status === 404) {
        return toast('Cloud bin is empty: push from your other device first', 'warn', 5500);
      }
      if (r.status === 405) {
        return toast('URL rejected: missing key name at end (e.g. /reta)', 'err', 5000);
      }
      throw new Error(`HTTP ${r.status}${text ? ': ' + text : ''}`);
    }
    const p = await r.json();
    if (!p || !p.entries) throw new Error('Cloud bin does not contain valid RetaLog data');
    const d = DEFAULTS();
    state = { v: 2, profile: Object.assign(d.profile, p.profile), entries: Object.assign(d.entries, p.entries) };
    save(); renderAll();
    toast('Pulled from cloud: this device is up to date');
  } catch (e) {
    toast(`Pull failed: ${e.message || 'Check URL'}`, 'err', 5500);
  }
}
function normalizeSyncUrl(raw) {
  if (!raw) return '';
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'kvdb.io' || parsed.hostname.endsWith('.kvdb.io')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length === 1) {
        parsed.pathname = `/${parts[0]}/reta`;
        url = parsed.toString();
      }
    }
  } catch (_) {}
  return url;
}
function readSyncUrl() {
  const el = document.getElementById('m_syncUrl');
  const raw = el ? el.value : state.profile.syncUrl;
  const normalized = normalizeSyncUrl(raw);
  if (normalized) {
    state.profile.syncUrl = normalized;
    if (el && el.value !== normalized) el.value = normalized;
    save();
  }
  return state.profile.syncUrl;
}

/* ---------------------------- render ---------------------------- */
function renderAll() {
  renderToday();
  if (currentView === 'trends') renderTrends();
  else if (currentView === 'dose') renderDose();
  else if (currentView === 'more') renderMore();
  observeReveals();
}

/* ---------------------------- theme ----------------------------- */
function resolvedLight(t) {
  if (t === 'light') return true;
  if (t !== 'system') return false;
  try { return !!window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches; }
  catch (e) { return false; }   // environments without matchMedia default to dark
}
function applyTheme(t, skipSave) {
  const P = state.profile;
  P.theme = t;
  if (!skipSave) save();
  try { localStorage.setItem('retalog.theme', JSON.stringify({ value: t })); } catch (e) {}
  const light = resolvedLight(t);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', light ? '#E6EDF5' : '#060B12'));
  const ic = $('#themeIcon');
  if (ic) ic.innerHTML = light ? IC.sun : IC.moon;
  if (currentView === 'more' && !skipSave) renderMore();
  else if (currentView === 'trends') renderTrends();
  else if (currentView === 'today') renderToday();
}
$('#themeBtn').addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});
if (window.matchMedia) {
  const mq = matchMedia('(prefers-color-scheme:light)');
  const onSys = () => { if (state.profile.theme === 'system') applyTheme('system', true); };
  (mq.addEventListener ? mq.addEventListener('change', onSys) : mq.addListener(onSys));
}

/* --------------------- scroll choreography ----------------------- */
let revealObs = null;
function initReveal() {
  if (!('IntersectionObserver' in window)) return;   // no IO -> content stays visible
  document.documentElement.classList.add('anim');
  revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      revealObs.unobserve(en.target);
      // replay each chart's entry animation as its card slides in
      en.target.querySelectorAll('canvas').forEach(cv => {
        const ch = cv.id && chartById[cv.id];
        if (!ch || ch._retaPlayed) return;
        ch._retaPlayed = true;
        try { ch.reset(); ch.update(); } catch (e) {}
      });
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
}
function observeReveals() {
  if (!revealObs) return;
  $$('.card:not(.reveal), .stat:not(.reveal), .hero:not(.reveal)').forEach(el => el.classList.add('reveal'));
  $$('.reveal:not(.in)').forEach((el, i) => {
    el.style.transitionDelay = Math.min(380, (i % 6) * 55) + 'ms';
    revealObs.observe(el);
  });
}
// topbar scroll sync
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const topbar = $('.topbar');
  if (topbar) topbar.classList.toggle('scrolled', y > 8);
}, { passive: true });
// sliding nav indicator
function moveNavInd() {
  const ind = $('#navInd');
  if (!ind) return;
  const cur = $('.nav-item.nav-link.on');
  if (!cur) { ind.style.width = '0'; return; }
  ind.style.left = cur.offsetLeft + 'px';
  ind.style.width = cur.offsetWidth + 'px';
}
// animated number count-up
let lastHeroVal = null;
function countUp(el, to, decimals) {
  if (el.textContent === String(to)) return;
  const t0 = performance.now(), dur = 1100;
  const step = t => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step); else lastHeroVal = to;
  };
  requestAnimationFrame(step);
}

/* ----------------------------- init ----------------------------- */
load();
renderAddGrid();
applyTheme(state.profile.theme || 'system', true);
initReveal();
const fresh = !state.profile.created || !E().weight.length;
$('#ob').style.display = fresh ? 'block' : 'none';
if (!fresh) {
  renderAll();
  const wr = waterReminder();
  if (wr.behind > 600) toast(`You're ${(wr.behind / 1000).toFixed(2)} L behind on water: drink up.`, 'warn');
} else {
  obReconUpd(); obLadderUpd();
}
if (state.profile.waterRemind && 'Notification' in window && Notification.permission === 'granted') startWaterNudges();
document.addEventListener('visibilitychange', () => { if (!document.hidden && !fresh) renderToday(); });
window.addEventListener('load', moveNavInd);
window.addEventListener('resize', moveNavInd);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

