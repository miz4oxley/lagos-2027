// Lagos 2027 · Family Trip Planner
// Works offline on one phone out of the box. Add a Firebase config (firebase-config.js)
// and sign in to share one plan between phones.
import { firebaseConfig as FILE_CONFIG } from './firebase-config.js';

const TRIP_ID = 'lagos-2027';
const FIREBASE_V = '10.12.2';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clean = o => JSON.parse(JSON.stringify(o));
const parseDate = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const fmt = (d, o = { weekday: 'short', month: 'short', day: 'numeric' }) => d ? d.toLocaleDateString(undefined, o) : '';
const money = (n, cur) => cur === 'NGN' ? '₦' + Math.round(n).toLocaleString() : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const normUrl = u => { u = (u || '').trim(); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u.replace(/^@/, 'instagram.com/'); };
const findUrl = t => (String(t || '').match(/https?:\/\/[^\s]+/i) || [''])[0];

function guessName(url) {
  try {
    const u = new URL(normUrl(url));
    const parts = u.pathname.split('/').filter(Boolean);
    if (/instagram\.com$/.test(u.hostname.replace('www.', '')) && parts[0] && !['p', 'reel', 'reels', 'stories', 'explore', 'tv'].includes(parts[0])) return '@' + parts[0];
    if (/tiktok\.com$/.test(u.hostname.replace('www.', '')) && parts[0]?.startsWith('@')) return parts[0];
    return u.hostname.replace('www.', '');
  } catch { return ''; }
}
function linkLabel(url) {
  if (!url) return '';
  if (/instagram\.com/i.test(url)) return 'Open Instagram ↗';
  if (/tiktok\.com/i.test(url)) return 'Open TikTok ↗';
  if (/maps\.|goo\.gl\/maps|maps\.app/i.test(url)) return 'Open map ↗';
  return 'Open link ↗';
}

/* ---------- options ---------- */
const O = {
  spotCat: ['Adire & fabric', 'Fashion brand', 'Restaurant', 'Shopping', 'Beauty & hair', 'Kids fun', 'Beach & outing', 'Nightlife', 'Culture & art', 'Other'],
  area: ['Lekki', 'Victoria Island', 'Ikoyi', 'Ikeja', 'Yaba', 'Surulere', 'Lagos Island', 'Ajah', 'Magodo', 'Abeokuta', 'Ibadan', 'Other / not sure'],
  spotStatus: ['Want to go', 'Planned', 'Visited'],
  todoType: ['To-do', 'Buy in US', 'Book in Lagos'],
  who: ['Both', 'Moses', 'Adunni'],
  evType: ['Travel', 'Stay', 'Family', 'Photo shoot', 'Shopping', 'Food', 'Outing', 'Church', 'Rest', 'Other'],
  vendorRole: ['Adire / tailor', 'Photographer', 'Driver / chauffeur', 'Cook / home meals', 'Food supplier', 'Hotel', 'Airbnb', 'Reunion venue', 'Event planner / decor', 'Cargo shipper', 'Hair & makeup', 'Other'],
  vendorStatus: ['Researching', 'Contacted', 'Quote received', 'Booked', 'Paid'],
  cur: ['USD', 'NGN'],
  expCat: ['Flights', 'Hotel & Airbnb', 'Transport & driver', 'Food & cook', 'Adire & clothing', 'Photographer', 'Reunion', 'Shopping', 'Gifts', 'Cargo', 'Other'],
  cargoStatus: ['Packing', 'Ready to drop off', 'Dropped off', 'In transit', 'Arrived in Lagos', 'Picked up'],
  side: ['Us', "Moses's family", "Adunni's family", 'Friends'],
  rsvp: ['Not invited yet', 'Invited', 'Coming', 'Not coming'],
};
const ICON = { spot: '✦', todo: '✓', event: '▦', vendor: '☎', expense: '₦', cargo: '▣', guest: '☺' };
const APPROVAL_KINDS = ['spot', 'event', 'vendor', 'expense', 'todo'];
const LAGOS_TZ = 'Africa/Lagos';
const CAT_ICON = { 'Adire & fabric': '◍', 'Fashion brand': '👗', Restaurant: '🍲', Shopping: '🛍', 'Beauty & hair': '💇🏾‍♀️', 'Kids fun': '🎈', 'Beach & outing': '🏖', Nightlife: '🌙', 'Culture & art': '🎨', Other: '✦' };

/* ---------- forms (field specs) ---------- */
const dayOpts = () => [{ v: '', t: 'Not on a day yet' }, ...Array.from({ length: S().tripDays }, (_, i) => ({ v: i + 1, t: `Day ${i + 1} · ${fmt(dayDate(i + 1))}` }))];
const vendorOpts = () => [{ v: '', t: '—' }, ...items('vendor').map(v => ({ v: v.id, t: `${v.role}: ${v.name || 'to find'}` }))];

const SPECS = {
  spot: { title: 'Saved spot', fields: [
    { k: 'link', l: 'Instagram / website / map link', type: 'url', hint: 'Paste a link — I\'ll guess the name from Instagram handles.', paste: true },
    { k: 'name', l: 'Name', type: 'text', req: true },
    { k: 'image', l: 'Screenshot or photo', type: 'image' },
    [{ k: 'category', l: 'Type', type: 'select', o: O.spotCat }, { k: 'area', l: 'Area', type: 'select', o: O.area }],
    [{ k: 'status', l: 'Status', type: 'select', o: O.spotStatus }, { k: 'day', l: 'Which day?', type: 'select', o: dayOpts, num: true }],
    { k: 'notes', l: 'Notes (what to buy, price, address…)', type: 'textarea' },
  ] },
  todo: { title: 'To-do', fields: [
    { k: 'title', l: 'What needs doing?', type: 'text', req: true },
    [{ k: 'type', l: 'Kind', type: 'select', o: O.todoType }, { k: 'who', l: 'Who', type: 'select', o: O.who }],
    [{ k: 'weeksBefore', l: 'Weeks before we land', type: 'number', hint: 'Moves with your trip dates' }, { k: 'due', l: '…or exact date', type: 'date', hint: 'Exact date wins' }],
    { k: 'link', l: 'Link (store, product, vendor)', type: 'url' },
    { k: 'notes', l: 'Notes', type: 'textarea' },
    { k: 'done', l: 'Done', type: 'checkbox' },
  ] },
  event: { title: 'Plan item', fields: [
    { k: 'title', l: 'What', type: 'text', req: true },
    [{ k: 'day', l: 'Day', type: 'select', o: dayOpts, num: true, req: true }, { k: 'time', l: 'Time', type: 'time' }],
    [{ k: 'type', l: 'Type', type: 'select', o: O.evType }, { k: 'vendorId', l: 'Vendor', type: 'select', o: vendorOpts }],
    { k: 'place', l: 'Where', type: 'text' },
    { k: 'link', l: 'Link (map, Instagram, booking)', type: 'url' },
    { k: 'notes', l: 'Notes', type: 'textarea' },
  ] },
  vendor: { title: 'Vendor / contact', fields: [
    [{ k: 'role', l: 'Role', type: 'select', o: O.vendorRole }, { k: 'status', l: 'Status', type: 'select', o: O.vendorStatus }],
    { k: 'name', l: 'Name / business', type: 'text' },
    { k: 'phone', l: 'Phone / WhatsApp (with country code)', type: 'tel', hint: 'e.g. +234 803 123 4567' },
    { k: 'link', l: 'Instagram / website', type: 'url', paste: true },
    [{ k: 'quote', l: 'Quote', type: 'number' }, { k: 'currency', l: 'Currency', type: 'select', o: O.cur }],
    { k: 'notes', l: 'Notes', type: 'textarea' },
  ] },
  expense: { title: 'Budget item', fields: [
    { k: 'title', l: 'What', type: 'text', req: true },
    [{ k: 'amount', l: 'Amount', type: 'number', req: true }, { k: 'currency', l: 'Currency', type: 'select', o: O.cur }],
    { k: 'category', l: 'Category', type: 'select', o: O.expCat },
    { k: 'paid', l: 'Already paid', type: 'checkbox' },
    { k: 'notes', l: 'Notes', type: 'textarea' },
  ] },
  cargo: { title: 'Cargo box', fields: [
    { k: 'label', l: 'Box label', type: 'text', req: true, hint: 'e.g. Box 1 — gifts for Mummy' },
    { k: 'contents', l: 'What\'s inside', type: 'textarea' },
    [{ k: 'weight', l: 'Weight (lb)', type: 'number' }, { k: 'shipBy', l: 'Ship by', type: 'date' }],
    [{ k: 'shipper', l: 'Shipper', type: 'text' }, { k: 'status', l: 'Status', type: 'select', o: O.cargoStatus }],
    { k: 'tracking', l: 'Tracking number', type: 'text' },
    { k: 'receiver', l: 'Who receives it in Lagos', type: 'text' },
    { k: 'notes', l: 'Notes', type: 'textarea' },
  ] },
  guest: { title: 'Reunion guest', fields: [
    { k: 'name', l: 'Name / household', type: 'text', req: true },
    [{ k: 'side', l: 'Side', type: 'select', o: O.side }, { k: 'people', l: 'How many people', type: 'number' }],
    [{ k: 'rsvp', l: 'RSVP', type: 'select', o: O.rsvp }, { k: 'phone', l: 'Phone / WhatsApp', type: 'tel' }],
    { k: 'adire', l: 'Wearing our matching Adire', type: 'checkbox' },
    { k: 'sizes', l: 'Sizes (for the Adire)', type: 'text', hint: 'e.g. Dad XL, Mum 14, kids 6 & 9' },
    { k: 'notes', l: 'Notes', type: 'textarea' },
  ] },
};
const DEFAULTS = {
  spot: { category: 'Fashion brand', area: 'Lekki', status: 'Want to go' },
  todo: { type: 'To-do', who: 'Both', done: false },
  event: { type: 'Outing' },
  vendor: { role: 'Photographer', status: 'Researching', currency: 'NGN' },
  expense: { currency: 'USD', category: 'Other', paid: false },
  cargo: { status: 'Packing' },
  guest: { side: "Moses's family", rsvp: 'Not invited yet', people: 1, adire: true },
};

/* ---------- starter plan (deterministic IDs so two phones never duplicate) ---------- */
const DEFAULT_SETTINGS = { tripStart: '2027-06-14', tripDays: 21, rate: 1500, adireNames: 'Moses · Adunni · the girls', placeholderDates: true,
  members: ['Moses', 'Adunni'], homeTz: 'America/New_York', flights: { out: {}, back: {} } };
function seeds() {
  const t = (id, title, weeksBefore, type = 'To-do', notes = '') => ({ id: 'seed-t-' + id, kind: 'todo', title, weeksBefore, type, who: 'Both', done: false, notes });
  const e = (id, day, time, title, type, notes = '') => ({ id: 'seed-e-' + id, kind: 'event', day, time, title, type, notes });
  const v = (id, role) => ({ id: 'seed-v-' + id, kind: 'vendor', role, name: '', status: 'Researching', currency: 'NGN' });
  return [
    t('flights', 'Lock in trip dates & book flights for 4', 30),
    t('passports', 'Check all 4 passports (6+ months validity) and Nigeria entry/visa needs for each of us', 26),
    t('health', 'Check travel health requirements (yellow fever cards) & book clinic visit', 12),
    t('adire-find', 'Pick our Adire maker & design (names on the cloth)', 20, 'Book in Lagos', 'Names: ' + DEFAULT_SETTINGS.adireNames),
    t('adire-sizes', 'Send everyone\'s sizes + names spelling to Adire maker', 16, 'Book in Lagos'),
    t('adire-ready', 'Adire outfits finished & delivered to family in Lagos', 3, 'Book in Lagos', 'Ask for photos/video before final payment'),
    t('photog', 'Book family photographer for the reunion shoot', 12, 'Book in Lagos'),
    t('hotel', 'Book hotel for arrival nights', 14, 'Book in Lagos'),
    t('airbnb', 'Book the Airbnb (family-friendly, generator/inverter, security)', 14, 'Book in Lagos'),
    t('driver', 'Arrange driver / chauffeur for the whole stay + airport pickup', 6, 'Book in Lagos'),
    t('cook', 'Find a cook / home-meal supplier to deliver to the Airbnb', 6, 'Book in Lagos'),
    t('venue', 'Pick reunion date & venue with both families', 12, 'Book in Lagos'),
    t('invites', 'Send reunion invites + collect Adire sizes from relatives', 10),
    t('cargo-quote', 'Get cargo shipper quotes & transit times (sea vs air)', 16, 'To-do', 'Ship early enough that it lands before we do'),
    t('cargo-drop', 'Pack & drop off cargo boxes', 10),
    t('gifts', 'Buy gifts for parents & family', 12, 'Buy in US'),
    t('kids', 'Buy the girls\' travel essentials (meds, snacks, entertainment)', 4, 'Buy in US'),
    t('money', 'Plan money: cards, cash, naira transfers', 2),
    t('sim', 'Sort phones: Nigerian SIM / eSIM / roaming', 1),
    e('land', 1, '', 'Land in Lagos → driver pickup → hotel check-in', 'Travel'),
    e('airbnb', 3, '12:00', 'Check out of hotel → move into the Airbnb', 'Stay'),
    e('market', 5, '10:00', 'Shopping day — fabric & Adire markets', 'Shopping'),
    e('shoot', 8, '15:00', 'Family photo shoot — everyone in matching Adire', 'Photo shoot'),
    e('reunion', 8, '17:00', 'Family reunion get-together (both families + friends)', 'Family'),
    e('fly', 21, '', 'Fly home', 'Travel'),
    v('adire', 'Adire / tailor'), v('photo', 'Photographer'), v('driver', 'Driver / chauffeur'), v('cook', 'Cook / home meals'),
    v('hotel', 'Hotel'), v('airbnb', 'Airbnb'), v('cargo', 'Cargo shipper'),
    { id: 'seed-g-us', kind: 'guest', name: 'Us — Moses, Adunni & the girls', side: 'Us', people: 4, rsvp: 'Coming', adire: true, sizes: '' },
  ].map(x => ({ ...x, createdAt: Date.now(), updatedAt: Date.now() }));
}

/* ---------- state ---------- */
const state = { items: new Map(), settings: { ...DEFAULT_SETTINGS }, view: 'home', sub: null, spotFilter: 'All', q: '', todoFilter: 'Open', ready: false };
const S = () => state.settings;
const items = kind => [...state.items.values()].filter(i => i.kind === kind);
const dayDate = n => addDays(parseDate(S().tripStart), n - 1);
const dueDate = t => t.due ? parseDate(t.due) : (t.weeksBefore != null && t.weeksBefore !== '' ? addDays(parseDate(S().tripStart), -7 * Number(t.weeksBefore)) : null);

/* ---------- flights & time zones ---------- */
const fl = () => ({ out: {}, back: {}, ...(S().flights || {}) });
const splitDT = s => { if (!s) return null; const [d, t = ''] = s.split('T'); return { date: parseDate(d), day: d, time: t.slice(0, 5) }; };
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const fmtDT = s => { const x = splitDT(s); return x ? `${fmt(x.date)} · ${fmtTime(x.time)}` : ''; };
function zonedToUTC(dtStr, tz) {
  const [d, t = '00:00'] = dtStr.split('T'); const [y, m, da] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, da, h, mi);
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess)).map(x => [x.type, x.value]));
    const asTz = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    return new Date(guess - (asTz - guess));
  } catch { return new Date(guess); }
}
const flightCode = f => String(f?.flightNo || '').replace(/\s+/g, '').toUpperCase();
const trackLinks = f => { const c = flightCode(f); return c ? `<a class="linkbtn" href="https://www.flightradar24.com/data/flights/${c.toLowerCase()}" target="_blank" rel="noopener" data-stop>Track ${c} ↗</a> <a class="linkbtn" href="https://www.google.com/search?q=${c}+flight+status" target="_blank" rel="noopener" data-stop>Flight status ↗</a>` : ''; };

/* ---------- people & approvals ---------- */
const members = () => (S().members || ['Moses', 'Adunni']).filter(Boolean);
const me = () => { const m = localStorage.getItem('me'); return members().includes(m) ? m : members()[0]; };
const others = () => members().filter(n => n !== me()).join(' & ') || 'your partner';
const shared = () => state.mode === 'cloud';
const needsOk = it => shared() && APPROVAL_KINDS.includes(it.kind);
function decision(it) {
  if (!needsOk(it) || !it.votes) return 'Agreed';
  if (members().some(n => it.votes[n] === 'no')) return 'Declined';
  return members().every(n => it.votes[n] === 'yes') ? 'Agreed' : 'Proposed';
}
const live = it => decision(it) !== 'Declined';
const needsMyOk = it => needsOk(it) && ((it.removeReq && it.removeReq.by !== me()) || (!it.removeReq && it.votes && decision(it) === 'Proposed' && !it.votes[me()]));
const itemTitle = it => it.name || it.title || it.label || (it.role ? `${it.role}${it.name ? ': ' + it.name : ''}` : 'Item');
function approvalPill(it) {
  const c = (it.comments || []).length ? ` <span class="pill">💬 ${it.comments.length}</span>` : '';
  if (!needsOk(it)) return c;
  if (it.removeReq) return `<span class="pill red">${esc(it.removeReq.by)} wants to remove</span>` + c;
  const d = decision(it);
  if (d === 'Agreed') return (it.votes ? '<span class="pill green">✓ Agreed</span>' : '') + c;
  if (d === 'Declined') return `<span class="pill grey">✗ Declined by ${esc(members().filter(n => it.votes[n] === 'no').join(', '))}</span>` + c;
  return (needsMyOk(it) ? '<span class="pill gold">Needs your OK</span>' : `<span class="pill gold">Waiting for ${esc(members().filter(n => it.votes[n] !== 'yes').join(', '))}</span>`) + c;
}
const dcls = it => decision(it) === 'Declined' ? ' declined' : '';

/* ---------- local storage (IndexedDB) ---------- */
const idb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('lagos-planner', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('items', { keyPath: 'id' }); d.createObjectStore('meta'); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async run(store, mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode); const s = tx.objectStore(store); let out;
      const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
      tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error);
    });
  },
};
const local = {
  async load() { return { items: await idb.run('items', 'readonly', s => s.getAll()), settings: await idb.run('meta', 'readonly', s => s.get('settings')) }; },
  put: it => idb.run('items', 'readwrite', s => s.put(it)),
  del: id => idb.run('items', 'readwrite', s => s.delete(id)),
  putSettings: st => idb.run('meta', 'readwrite', s => s.put(st, 'settings')),
  putMany: arr => idb.run('items', 'readwrite', s => { arr.forEach(i => s.put(i)); }),
};

/* ---------- cloud (Firebase) ---------- */
const cloud = { fb: null, user: null, unsub: [] };
function getConfig() {
  try { const c = JSON.parse(localStorage.getItem('fbConfig') || 'null'); if (c && c.apiKey) return c; } catch {}
  return FILE_CONFIG && FILE_CONFIG.apiKey ? FILE_CONFIG : null;
}
async function loadFirebase(cfg) {
  if (cloud.fb) return cloud.fb;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_V}/`;
  const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = appM.initializeApp(cfg);
  const auth = authM.getAuth(app);
  let db;
  try { db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) }); }
  catch { db = fsM.getFirestore(app); }
  cloud.fb = { authM, fsM, auth, db };
  return cloud.fb;
}
const itemsCol = () => cloud.fb.fsM.collection(cloud.fb.db, 'trips', TRIP_ID, 'items');
const itemDoc = id => cloud.fb.fsM.doc(cloud.fb.db, 'trips', TRIP_ID, 'items', id);
const settingsDoc = () => cloud.fb.fsM.doc(cloud.fb.db, 'trips', TRIP_ID, 'meta', 'settings');

function startCloud() {
  const { fsM } = cloud.fb;
  state.mode = 'cloud';
  cloud.unsub.forEach(u => u()); cloud.unsub = [];
  let seededCheck = false;
  cloud.unsub.push(fsM.onSnapshot(settingsDoc(), async snap => {
    if (snap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...snap.data() };
    else if (!seededCheck && !snap.metadata.fromCache) {
      seededCheck = true;
      await fsM.setDoc(settingsDoc(), clean(DEFAULT_SETTINGS));
      await Promise.all(seeds().map(i => fsM.setDoc(itemDoc(i.id), clean(i))));
    }
    render();
  }, err => toast('Sync error: ' + err.code)));
  cloud.unsub.push(fsM.onSnapshot(itemsCol(), snap => {
    state.items = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    const first = !state.ready; state.ready = true; render();
    if (first && !members().includes(localStorage.getItem('me'))) askWho();
  }, err => toast('Sync error: ' + err.code + ' — check Firestore rules')));
  setSync(`Shared · ${cloud.user.email}`);
}

/* ---------- unified store ---------- */
const store = {
  async save(item) {
    item.updatedAt = Date.now(); item.createdAt = item.createdAt || item.updatedAt;
    state.items.set(item.id, item); render();
    if (state.mode === 'cloud') await cloud.fb.fsM.setDoc(itemDoc(item.id), clean(item)).catch(e => toast('Not saved: ' + e.code));
    else await local.put(item);
  },
  async remove(id) {
    state.items.delete(id); render();
    if (state.mode === 'cloud') await cloud.fb.fsM.deleteDoc(itemDoc(id));
    else await local.del(id);
  },
  async saveSettings(patch) {
    state.settings = { ...state.settings, ...patch }; render();
    if (state.mode === 'cloud') await cloud.fb.fsM.setDoc(settingsDoc(), clean(state.settings), { merge: true });
    else await local.putSettings(state.settings);
  },
};

async function startLocal() {
  state.mode = 'local';
  const { items: list, settings } = await local.load();
  if (!settings) { await local.putSettings(DEFAULT_SETTINGS); const sd = seeds(); await local.putMany(sd); state.items = new Map(sd.map(i => [i.id, i])); }
  else { state.settings = { ...DEFAULT_SETTINGS, ...settings }; state.items = new Map(list.map(i => [i.id, i])); }
  state.ready = true;
  setSync(getConfig() ? 'This phone only · tap More → Sharing to sign in' : 'This phone only');
  render();
}
function askWho() {
  openSheet(`<h2>Who's using this phone?</h2><p class="sub">So the app knows whose ✓ Agree it is.</p>
    <div class="kinds">${members().map(n => `<button class="kind" data-act="setMe" data-v="${esc(n)}"><b>${esc(n)}</b><span>This is my phone</span></button>`).join('')}</div>`);
}
function setSync(t) { $('#syncStatus').textContent = t; }

/* ---------- UI ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
const pillFor = (txt) => {
  const c = { Booked: 'green', Paid: 'green', Coming: 'green', Visited: 'green', 'Picked up': 'green', 'Arrived in Lagos': 'green', Planned: 'gold', Invited: 'gold', Contacted: 'gold', 'Quote received': 'gold', 'In transit': 'gold', 'Dropped off': 'gold', 'Not coming': 'grey' }[txt] || '';
  return `<span class="pill ${c}">${esc(txt)}</span>`;
};
const linkBtn = url => url ? `<a class="linkbtn" href="${esc(normUrl(url))}" target="_blank" rel="noopener" data-stop>${linkLabel(url)}</a>` : '';
const waBtn = phone => { const d = String(phone || '').replace(/[^\d]/g, ''); return d ? `<a class="linkbtn" href="https://wa.me/${d}" target="_blank" rel="noopener" data-stop>WhatsApp ↗</a> <a class="linkbtn" href="tel:${esc(phone)}" data-stop>Call</a>` : ''; };

function render() {
  if (!state.ready) return;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === state.view));
  const v = $('#view');
  document.body.classList.toggle('itin-mode', state.view === 'itinerary');
  const fn = { home: viewHome, spots: viewSpots, plan: viewPlan, todos: viewTodos, more: viewMore, itinerary: viewItinerary }[state.view];
  v.innerHTML = fn();
  if (state.view === 'spots') renderSpotList();
}

function viewHome() {
  const s = S(), start = parseDate(s.tripStart), end = dayDate(s.tripDays);
  const f = fl(), dep = splitDT(f.out.depart), arr = splitDT(f.out.arrive), ret = splitDT(f.back.depart);
  const leftLand = daysBetween(today(), start);
  const leftFly = dep ? daysBetween(today(), dep.date) : null;
  const todos = items('todo').filter(live);
  const open = todos.filter(t => !t.done).sort((a, b) => (dueDate(a) || 9e15) - (dueDate(b) || 9e15));
  const vendors = items('vendor').filter(live);
  const adire = items('guest').filter(g => g.adire && g.rsvp !== 'Not coming').reduce((n, g) => n + (Number(g.people) || 1), 0);
  const pending = [...state.items.values()].filter(needsMyOk);
  let heroTop;
  if (leftFly != null && leftFly > 0) heroTop = `<div class="big">${leftFly}</div><div class="lbl">day${leftFly === 1 ? '' : 's'} until we fly to Lagos</div>`;
  else if (leftFly === 0) heroTop = `<div class="big">Today ✈︎</div><div class="lbl">We fly to Lagos today!</div>`;
  else if (leftLand > 0) heroTop = `<div class="big">${leftLand}</div><div class="lbl">days until we land in Lagos${dep ? '' : ' (estimate)'}</div>`;
  else if (leftLand > -s.tripDays) heroTop = `<div class="big">Day ${-leftLand + 1}</div><div class="lbl">We're in Lagos! 🇳🇬</div>`;
  else heroTop = `<div class="big">Ẹ kú àbọ̀</div><div class="lbl">Welcome home</div>`;
  const legLine = (ic, label, x, tz, extra = '') => x ? `<div class="leg"><span>${ic}</span><div><b>${label}</b> ${extra}<br>${fmt(x.date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(x.time) || 'time TBC'} <span class="tz">${tz}</span></div></div>` : '';
  const flightsHTML = dep || arr ? `<div class="legs">
      ${legLine('🛫', `Depart ${esc(f.out.from || 'US')}`, dep, 'US time', esc(f.out.flightNo || ''))}
      ${legLine('🛬', `Land ${esc(f.out.to || 'Lagos')}`, arr, 'Lagos time')}
      ${legLine('🏠', `Fly home ${esc(f.back.from || '')}`, ret, 'Lagos time', esc(f.back.flightNo || ''))}
      <div style="margin-top:6px">${trackLinks(f.out)}</div></div>`
    : `<div class="dates">${fmt(start, { month: 'long', day: 'numeric', year: 'numeric' })} → ${fmt(end, { month: 'long', day: 'numeric' })} · ${s.tripDays} days</div>`;
  return `
  <div class="hero" data-act="flights">${heroTop}${flightsHTML}
    <button class="hero-edit" data-act="flights">✎ ${dep ? 'Edit flights' : 'Add our flights'}</button>
  </div>
  ${s.placeholderDates && !dep ? `<div class="notice">These are placeholder dates. Tap <b>Add our flights</b> once you book — every day and deadline moves with them.</div>` : ''}
  ${pending.length ? `<h3>Needs your OK (${pending.length})</h3>${pending.map(it => `<div class="item" data-act="edit" data-id="${it.id}"><div class="thumb">${ICON[it.kind] || '•'}</div><div class="body">
      <div class="t">${esc(itemTitle(it))}</div>
      <div class="m">${it.removeReq ? `${esc(it.removeReq.by)} wants to remove this` : `${esc(it.editedBy || it.addedBy || '')} ${it.editedBy ? 'changed' : 'added'} this · ${esc(SPECS[it.kind].title)}`}</div>
      <div class="row" style="margin-top:8px">${it.removeReq
        ? `<button class="btn sm danger" data-act="rmYes" data-id="${it.id}">Remove</button><button class="btn sm" data-act="rmNo" data-id="${it.id}">Keep</button>`
        : `<button class="btn sm" data-act="vote" data-v="yes" data-id="${it.id}">✓ Agree</button><button class="btn sm danger" data-act="vote" data-v="no" data-id="${it.id}">✗ Decline</button>`}</div></div></div>`).join('')}` : ''}
  <button class="btn alt block" style="margin-top:12px" data-act="nav" data-view="itinerary">📖 See full itinerary</button>
  <div class="quick">
    <button class="btn gold" data-act="pasteSpot">📋 Paste a link</button>
    <button class="btn" data-act="add" data-kind="spot">✦ Save a spot</button>
  </div>
  <div class="stats">
    <button class="stat" data-act="nav" data-view="spots"><b>${items('spot').filter(live).length}</b><span>spots saved</span></button>
    <button class="stat" data-act="nav" data-view="todos"><b>${todos.filter(t => t.done).length}/${todos.length}</b><span>to-dos done</span></button>
    <button class="stat" data-act="sub" data-sub="vendors"><b>${vendors.filter(v => ['Booked', 'Paid'].includes(v.status)).length}/${vendors.length}</b><span>vendors booked</span></button>
    <button class="stat" data-act="sub" data-sub="guests"><b>${adire}</b><span>Adire outfits</span></button>
    <button class="stat" data-act="sub" data-sub="cargo"><b>${items('cargo').length}</b><span>cargo boxes</span></button>
    <button class="stat" data-act="sub" data-sub="budget"><b>${money(budgetTotals().usd, 'USD')}</b><span>budget</span></button>
  </div>
  <h3>Coming up</h3>
  ${open.slice(0, 6).map(todoRow).join('') || '<p class="muted">All caught up 🎉</p>'}
  ${open.length > 6 ? `<button class="btn alt block" data-act="nav" data-view="todos">See all ${open.length} open to-dos</button>` : ''}`;
}

function todoRow(t) {
  const d = dueDate(t); const late = d && !t.done && d < today();
  const when = d ? `${late ? '⚠︎ ' : ''}by ${fmt(d, { month: 'short', day: 'numeric', year: d.getFullYear() !== today().getFullYear() ? 'numeric' : undefined })}` : 'no date';
  return `<div class="item ${t.done ? 'done' : ''}${dcls(t)}" data-act="edit" data-id="${t.id}">
    <button class="check ${t.done ? 'on' : ''}" data-act="toggle" data-id="${t.id}" aria-label="Mark done">${t.done ? '✓' : ''}</button>
    <div class="body"><div class="t">${esc(t.title)}</div>
    <div class="m">${late ? `<span class="pill red">${when}</span>` : esc(when)} · ${esc(t.type)} · ${esc(t.who)}</div>
    ${approvalPill(t) ? `<div class="m">${approvalPill(t)}</div>` : ''}
    ${t.link ? linkBtn(t.link) : ''}</div></div>`;
}

function viewSpots() {
  const cats = ['All', ...O.spotCat.filter(c => items('spot').some(s => s.category === c))];
  return `<h2>Saved spots</h2><p class="sub">Stores, Adire makers, restaurants & places you find while scrolling.</p>
  <div class="quick"><button class="btn gold" data-act="pasteSpot">📋 Paste a link</button><button class="btn" data-act="add" data-kind="spot">＋ Add spot</button></div>
  <div style="height:10px"></div>
  <input class="search" id="spotSearch" placeholder="Search names, notes, areas…" value="${esc(state.q)}">
  <div class="chips">${cats.map(c => `<button class="chip ${state.spotFilter === c ? 'on' : ''}" data-act="spotFilter" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div id="spotList"></div>`;
}
function renderSpotList() {
  const q = state.q.toLowerCase();
  const list = items('spot').filter(s => (state.spotFilter === 'All' || s.category === state.spotFilter) &&
    (!q || [s.name, s.notes, s.area, s.category, s.link].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $('#spotList').innerHTML = list.length ? `<div class="grid">${list.map(s => `
    <div class="spot${dcls(s)}" data-act="edit" data-id="${s.id}">
      <div class="img" ${s.image ? `style="background-image:url('${s.image}')"` : ''}>${s.image ? '' : (CAT_ICON[s.category] || '✦')}</div>
      <div class="info"><div class="t">${esc(s.name)}</div>
      <div class="m">${esc(s.area || '')}${s.day ? ` · Day ${s.day}` : ''}</div>
      <div style="margin-top:6px">${pillFor(s.status)} ${approvalPill(s)}</div>
      ${linkBtn(s.link)}</div></div>`).join('')}</div>`
    : `<div class="card muted">No spots yet. When you see a store or place on Instagram, copy the link and tap <b>Paste a link</b>.</div>`;
}

function viewPlan() {
  const s = S();
  const evs = items('event'), spots = items('spot').filter(x => x.day);
  const unsched = items('spot').filter(x => !x.day && x.status !== 'Visited').length;
  let html = `<h2>Day-by-day plan</h2><p class="sub">${fmt(dayDate(1), { month: 'long', day: 'numeric' })} – ${fmt(dayDate(s.tripDays), { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  <div class="row wrap"><button class="btn sm" data-act="add" data-kind="event">＋ Add to plan</button><button class="btn sm gold" data-act="nav" data-view="itinerary">📖 See full itinerary</button><button class="btn sm alt" data-act="ics">📅 Add to calendar</button></div>
  ${unsched ? `<div class="notice blue">${unsched} saved spot${unsched > 1 ? 's are' : ' is'} not on a day yet. Open a spot and choose “Which day?”.</div>` : ''}`;
  for (let d = 1; d <= s.tripDays; d++) {
    const dayEv = evs.filter(e => Number(e.day) === d && !(e.id === 'seed-e-fly' && fl().back.depart)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const daySp = spots.filter(x => Number(x.day) === d);
    html += `<div class="day"><div class="day-h"><div class="day-n">${d}</div><div><div class="t">${fmt(dayDate(d), { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      <div class="m">${dayEv.length + daySp.length ? `${dayEv.length + daySp.length} planned` : 'Free day'}</div></div></div>
      ${flightRows(d).map(r => `<div class="ev" data-act="flights"><div class="time">${esc(fmtTime(r.time) || '✈︎')}</div><div class="body"><div class="t">${esc(r.title)}</div><div class="m">${esc(r.sub || '')}</div></div></div>`).join('')}
      ${dayEv.map(e => { const v = e.vendorId && state.items.get(e.vendorId); return `<div class="ev${dcls(e)}" data-act="edit" data-id="${e.id}"><div class="time">${esc(fmtTime(e.time) || '—')}</div>
        <div class="body"><div class="t">${esc(e.title)}</div><div class="m">${esc(e.type || '')}${e.place ? ' · ' + esc(e.place) : ''}${v ? ' · ' + esc(v.name || v.role) : ''}</div>${approvalPill(e) ? `<div class="m">${approvalPill(e)}</div>` : ''}${linkBtn(e.link)}</div></div>`; }).join('')}
      ${daySp.map(x => `<div class="ev${dcls(x)}" data-act="edit" data-id="${x.id}"><div class="time">✦</div><div class="body"><div class="t">${esc(x.name)}</div><div class="m">${esc(x.category)} · ${esc(x.area || '')}</div>${approvalPill(x) ? `<div class="m">${approvalPill(x)}</div>` : ''}${linkBtn(x.link)}</div></div>`).join('')}
      <div class="add-row"><button class="btn sm alt" data-act="add" data-kind="event" data-day="${d}">＋ Add</button></div></div>`;
  }
  return html;
}

function viewTodos() {
  const all = items('todo');
  const f = state.todoFilter;
  const list = all.filter(t => f === 'All' ? true : f === 'Done' ? t.done : f === 'Open' ? !t.done : (!t.done && t.type === f))
    .sort((a, b) => (dueDate(a) || 9e15) - (dueDate(b) || 9e15));
  const groups = new Map();
  list.forEach(t => { const d = dueDate(t); const k = !d ? 'No date' : (d < today() && !t.done) ? 'Overdue' : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  return `<h2>Before we go</h2><p class="sub">${all.filter(t => !t.done).length} open · deadlines count back from landing day.</p>
  <button class="btn block" data-act="add" data-kind="todo">＋ Add to-do or shopping item</button>
  <div class="chips" style="margin-top:10px">${['Open', 'Buy in US', 'Book in Lagos', 'To-do', 'Done', 'All'].map(c => `<button class="chip ${f === c ? 'on' : ''}" data-act="todoFilter" data-v="${c}">${c}</button>`).join('')}</div>
  ${[...groups].map(([k, arr]) => `<h3>${esc(k)}</h3>${arr.map(todoRow).join('')}`).join('') || '<p class="muted">Nothing here.</p>'}`;
}

function viewMore() {
  if (state.sub) return ({ vendors: viewVendors, budget: viewBudget, cargo: viewCargo, guests: viewGuests, settings: viewSettings }[state.sub])();
  const m = (sub, ic, t, d) => `<div class="item" data-act="sub" data-sub="${sub}"><div class="ic">${ic}</div><div class="body"><div class="t">${t}</div><div class="m">${d}</div></div><div>›</div></div>`;
  const vendors = items('vendor');
  return `<h2>More</h2><div class="menu">
    ${m('vendors', '☎', 'Vendors & contacts', `${vendors.filter(v => ['Booked', 'Paid'].includes(v.status)).length} of ${vendors.length} booked — photographer, cook, driver, Adire…`)}
    ${m('guests', '☺', 'Reunion guests & Adire', `${items('guest').length} households`)}
    ${m('cargo', '▣', 'Cargo boxes', `${items('cargo').length} boxes`)}
    ${m('budget', '₦', 'Budget', `${money(budgetTotals().usd, 'USD')} planned`)}
    ${m('settings', '⚙', 'Settings, sharing & backup', 'Trip dates, exchange rate, sync with Adunni')}
  </div>`;
}
const back = t => `<button class="btn sm alt" data-act="sub" data-sub="">‹ More</button><h2 style="margin-top:12px">${t}</h2>`;

function viewVendors() {
  const list = items('vendor').sort((a, b) => O.vendorRole.indexOf(a.role) - O.vendorRole.indexOf(b.role));
  return `${back('Vendors & contacts')}<p class="sub">Everyone we need in Lagos. Tap to add their number — WhatsApp opens straight from here.</p>
  <button class="btn block" data-act="add" data-kind="vendor">＋ Add vendor</button>
  ${list.map(v => `<div class="item${dcls(v)}" data-act="edit" data-id="${v.id}"><div class="thumb">${ICON.vendor}</div><div class="body">
    <div class="t">${esc(v.name || 'To find')} <span class="muted small">· ${esc(v.role)}</span></div>
    <div class="m">${pillFor(v.status)} ${v.quote ? ' ' + money(v.quote, v.currency) : ''} ${approvalPill(v)}</div>
    <div>${waBtn(v.phone)} ${linkBtn(v.link)}</div></div></div>`).join('')}`;
}

function budgetTotals() {
  const r = Number(S().rate) || 1;
  const ex = items('expense').filter(live);
  const usd = ex.reduce((n, e) => n + (e.currency === 'NGN' ? Number(e.amount || 0) / r : Number(e.amount || 0)), 0);
  const paid = ex.filter(e => e.paid).reduce((n, e) => n + (e.currency === 'NGN' ? Number(e.amount || 0) / r : Number(e.amount || 0)), 0);
  return { usd, paid, r, ex };
}
function viewBudget() {
  const { usd, paid, r, ex } = budgetTotals();
  const byCat = O.expCat.map(c => [c, ex.filter(e => e.category === c).reduce((n, e) => n + (e.currency === 'NGN' ? Number(e.amount || 0) / r : Number(e.amount || 0)), 0)]).filter(([, v]) => v > 0);
  return `${back('Budget')}<p class="sub">Mix dollars and naira — totals use your rate of ₦${Number(r).toLocaleString()} per $1 (change in Settings).</p>
  <div class="card"><table class="sum">
    <tr><td><b>Total planned</b></td><td><b>${money(usd, 'USD')}</b> · ${money(usd * r, 'NGN')}</td></tr>
    <tr><td>Paid so far</td><td>${money(paid, 'USD')}</td></tr>
    <tr><td>Still to pay</td><td>${money(usd - paid, 'USD')}</td></tr>
    ${byCat.map(([c, v]) => `<tr><td class="muted">${esc(c)}</td><td>${money(v, 'USD')}</td></tr>`).join('')}
  </table></div>
  <button class="btn block" data-act="add" data-kind="expense">＋ Add cost</button>
  ${items('expense').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(e => `<div class="item${dcls(e)}" data-act="edit" data-id="${e.id}"><div class="body"><div class="t">${esc(e.title)}</div><div class="m">${esc(e.category)} ${e.paid ? '<span class="pill green">Paid</span>' : ''} ${approvalPill(e)}</div></div><div class="right"><b>${money(e.amount, e.currency)}</b></div></div>`).join('')}`;
}

function viewCargo() {
  const list = items('cargo');
  const wt = list.reduce((n, c) => n + (Number(c.weight) || 0), 0);
  return `${back('Cargo boxes')}<p class="sub">${list.length} boxes${wt ? ` · ${wt} lb total` : ''}. Ship early enough that everything lands before we do.</p>
  <button class="btn block" data-act="add" data-kind="cargo">＋ Add box</button>
  ${list.map(c => `<div class="item" data-act="edit" data-id="${c.id}"><div class="thumb">${ICON.cargo}</div><div class="body">
    <div class="t">${esc(c.label)}</div><div class="m">${pillFor(c.status)} ${c.weight ? c.weight + ' lb' : ''} ${c.shipBy ? '· ship by ' + fmt(parseDate(c.shipBy)) : ''}</div>
    <div class="m">${esc((c.contents || '').slice(0, 90))}</div>${c.tracking ? `<div class="m">Tracking: ${esc(c.tracking)}</div>` : ''}</div></div>`).join('')}`;
}

function viewGuests() {
  const list = items('guest').sort((a, b) => O.side.indexOf(a.side) - O.side.indexOf(b.side));
  const live = list.filter(g => g.rsvp !== 'Not coming');
  const heads = list.filter(g => g.rsvp === 'Coming').reduce((n, g) => n + (Number(g.people) || 1), 0);
  const adire = live.filter(g => g.adire).reduce((n, g) => n + (Number(g.people) || 1), 0);
  return `${back('Reunion & Adire')}
  <div class="card"><table class="sum">
    <tr><td>Confirmed coming</td><td><b>${heads}</b> people</td></tr>
    <tr><td>Matching Adire outfits needed</td><td><b>${adire}</b></td></tr>
    <tr><td>Names on our Adire</td><td>${esc(S().adireNames)}</td></tr>
  </table></div>
  <button class="btn block" data-act="add" data-kind="guest">＋ Add guest / household</button>
  ${O.side.map(side => { const g = list.filter(x => x.side === side); return g.length ? `<h3>${esc(side)}</h3>` + g.map(x => `<div class="item" data-act="edit" data-id="${x.id}"><div class="body">
    <div class="t">${esc(x.name)} <span class="muted small">· ${Number(x.people) || 1} ${Number(x.people) === 1 ? 'person' : 'people'}</span></div>
    <div class="m">${pillFor(x.rsvp)} ${x.adire ? '<span class="pill">Adire</span>' : ''} ${x.sizes ? esc(x.sizes) : ''}</div><div>${waBtn(x.phone)}</div></div></div>`).join('') : ''; }).join('')}`;
}

function viewSettings() {
  const s = S(), cfg = getConfig();
  const signed = state.mode === 'cloud';
  return `${back('Settings')}
  <div class="card">
    <button class="btn gold block" data-act="flights">✈︎ ${splitDT(fl().out.depart) ? 'Edit our flights' : 'Add our flights'}</button>
    <p class="small muted">Adding flights sets the landing date and trip length automatically.</p>
    <div class="two"><div class="field"><label>Landing date</label><input type="date" id="setStart" value="${esc(s.tripStart)}"></div>
    <div class="field"><label>Trip length (days)</label><input type="number" id="setDays" min="1" max="60" value="${esc(s.tripDays)}"></div></div>
    <div class="field"><label>Naira per $1 (your rate)</label><input type="number" id="setRate" value="${esc(s.rate)}"></div>
    <div class="field"><label>Names on our Adire</label><input type="text" id="setNames" value="${esc(s.adireNames)}"></div>
    <button class="btn block" data-act="saveSettings">Save settings</button>
  </div>
  <h3>Who's deciding</h3>
  <div class="card">
    <p class="small muted">When sharing is on, anything one of you adds or changes waits for the other's ✓ Agree.</p>
    <div class="two"><div class="field"><label>Planner 1</label><input type="text" id="setM1" value="${esc(members()[0] || '')}"></div>
    <div class="field"><label>Planner 2</label><input type="text" id="setM2" value="${esc(members()[1] || '')}"></div></div>
    <div class="field"><label>This phone belongs to</label><select id="setMe">${members().map(n => `<option ${n === me() ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <button class="btn block" data-act="saveMembers">Save</button>
  </div>
  <h3>Share with ${esc(others())}</h3>
  <div class="card">
    ${signed ? `<p>✅ Signed in as <b>${esc(cloud.user.email)}</b>. Everything you add shows up on both phones.</p>
      <button class="btn alt block" data-act="pushLocal">Copy this phone's offline plan into the shared plan</button><div style="height:8px"></div>
      <button class="btn danger block" data-act="signout">Sign out</button>`
    : cfg ? `<p class="small muted">Sign in with your shared-planner account. Adunni signs in with hers on her phone.</p>
      <div class="field"><label>Email</label><input type="email" id="authEmail" autocomplete="username"></div>
      <div class="field"><label>Password</label><input type="password" id="authPass" autocomplete="current-password"></div>
      <div class="row"><button class="btn" style="flex:1" data-act="signin">Sign in</button><button class="btn alt" style="flex:1" data-act="signup">Create account</button></div>`
    : `<p class="small">Right now your plan lives on this phone only. To share it, set up the free Firebase database (steps in the README) — then it connects automatically.</p>
      <details><summary class="small">Paste a Firebase config here instead</summary>
      <div class="field"><textarea id="cfgText" placeholder="{ apiKey: '…', authDomain: '…', projectId: '…', appId: '…' }"></textarea></div>
      <button class="btn sm" data-act="saveCfg">Save & connect</button></details>`}
  </div>
  <h3>Backup</h3>
  <div class="card row wrap">
    <button class="btn sm alt" data-act="export">⬇ Export backup</button>
    <label class="btn sm alt">⬆ Import backup<input type="file" accept="application/json" id="importFile" hidden></label>
    <button class="btn sm alt" data-act="ics">📅 Calendar file</button>
  </div>
  <p class="small muted">Tip: on iPhone open this site in Safari → Share → <b>Add to Home Screen</b>. On Android Chrome → ⋮ → <b>Install app</b> — then you can share Instagram links straight into the planner.</p>`;
}

/* ---------- sheet / forms ---------- */
let sheetImage = null, sheetItem = null;
function openSheet(html) { $('#sheet').innerHTML = `<div class="grab"></div>` + html; $('#sheetWrap').hidden = false; document.body.style.overflow = 'hidden'; }
function closeSheet() { $('#sheetWrap').hidden = true; document.body.style.overflow = ''; sheetItem = null; sheetImage = null; }

function fieldHTML(f, v) {
  const val = v[f.k] ?? '';
  const id = 'f_' + f.k;
  if (f.type === 'checkbox') return `<div class="field cb"><label><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${esc(f.l)}</label></div>`;
  let input;
  if (f.type === 'select') {
    const opts = typeof f.o === 'function' ? f.o() : f.o.map(x => ({ v: x, t: x }));
    input = `<select id="${id}" name="${f.k}">${opts.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.k}">${esc(val)}</textarea>`;
  else if (f.type === 'image') {
    sheetImage = v.image || null;
    input = `<div class="imgbox"><img id="imgPrev" ${sheetImage ? `src="${sheetImage}"` : 'hidden'} alt="">
      <label class="btn sm alt">📷 ${sheetImage ? 'Change' : 'Add'} screenshot<input type="file" accept="image/*" id="imgFile" hidden></label>
      ${sheetImage ? '<button type="button" class="btn sm danger" data-act="imgRemove">Remove</button>' : ''}</div>`;
  } else input = `<input id="${id}" name="${f.k}" type="${f.type}" value="${esc(val)}" ${f.type === 'number' ? 'inputmode="decimal" step="any"' : ''}>`;
  const paste = f.paste ? `<button type="button" class="btn sm alt" style="margin-top:6px" data-act="pasteInto" data-k="${f.k}">📋 Paste</button>` : '';
  return `<div class="field"><label for="${id}">${esc(f.l)}${f.req ? ' *' : ''}</label>${input}${paste}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
}

function openForm(kind, item = null, prefill = {}) {
  const spec = SPECS[kind];
  sheetItem = item ? { ...item } : { id: uid(), kind, ...DEFAULTS[kind], ...prefill, _new: true };
  const v = sheetItem;
  const fields = spec.fields.map(f => Array.isArray(f) ? `<div class="two">${f.map(x => fieldHTML(x, v)).join('')}</div>` : fieldHTML(f, v)).join('');
  openSheet(`<h2>${v._new ? 'New' : 'Edit'} ${spec.title.toLowerCase()}</h2>${approvalPanel(v)}<form id="itemForm">${fields}
    ${v._new && needsOk(v) ? `<p class="small muted">${esc(others())} will be asked to agree.</p>` : ''}
    <div class="sheet-actions">${v._new ? '' : '<button type="button" class="btn danger" data-act="delete">Delete</button>'}
    <button type="button" class="btn alt" data-act="close">Cancel</button><button type="submit" class="btn">Save</button></div></form>`);
}

function collectForm() {
  const form = $('#itemForm'); const kind = sheetItem.kind;
  const flat = SPECS[kind].fields.flat();
  const out = { ...sheetItem }; delete out._new;
  for (const f of flat) {
    if (f.type === 'image') { out.image = sheetImage || null; continue; }
    const el = form.elements[f.k]; if (!el) continue;
    if (f.type === 'checkbox') out[f.k] = el.checked;
    else if (f.type === 'number' || f.num) out[f.k] = el.value === '' ? null : Number(el.value);
    else out[f.k] = el.value.trim();
    if (f.req && (out[f.k] === '' || out[f.k] == null)) { toast(`Please fill in “${f.l}”`); el.focus(); return null; }
  }
  if (out.link) out.link = normUrl(out.link);
  if (kind === 'spot' && out.day && out.status === 'Want to go') out.status = 'Planned';
  return out;
}

const cmtHTML = cs => cs.length ? cs.map(c => `<div class="cmt ${c.by === me() ? 'mine' : ''}"><b>${esc(c.by)}</b> ${esc(c.text)}<span>${new Date(c.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>`).join('') : '<div class="small muted" style="margin-top:6px">No notes yet.</div>';
function approvalPanel(it) {
  if (it._new) return '';
  let h = '';
  if (needsOk(it) && (it.votes || it.removeReq)) {
    const mine = (it.votes || {})[me()];
    h += `<div class="card appr"><div class="small muted">Added by ${esc(it.addedBy || '—')}${it.editedBy ? ` · last changed by ${esc(it.editedBy)}` : ''}</div>
      <div class="row wrap" style="margin:8px 0">${members().map(n => { const x = (it.votes || {})[n]; return `<span class="pill ${x === 'yes' ? 'green' : x === 'no' ? 'red' : 'gold'}">${esc(n)}: ${x === 'yes' ? '✓ agreed' : x === 'no' ? '✗ declined' : 'waiting'}</span>`; }).join('')}</div>
      ${it.removeReq ? `<div class="notice">${esc(it.removeReq.by)} wants to remove this.</div>${it.removeReq.by !== me()
        ? `<div class="row"><button class="btn danger" style="flex:1" data-act="rmYes" data-id="${it.id}">Remove it</button><button class="btn" style="flex:1" data-act="rmNo" data-id="${it.id}">Keep it</button></div>`
        : `<button class="btn alt block" data-act="rmNo" data-id="${it.id}">Cancel my request</button>`}`
      : it.votes ? `<div class="row">${mine !== 'yes' ? `<button class="btn" style="flex:1" data-act="vote" data-v="yes" data-id="${it.id}">✓ Agree</button>` : ''}${mine !== 'no' ? `<button class="btn danger" style="flex:1" data-act="vote" data-v="no" data-id="${it.id}">✗ ${mine === 'yes' ? 'Change to decline' : 'Decline'}</button>` : ''}</div>` : ''}
    </div>`;
  }
  h += `<div class="card"><b class="small">💬 Talk it over</b><div id="cmtList">${cmtHTML(it.comments || [])}</div>
    <div class="row" style="margin-top:8px"><input type="text" id="cmtText" class="cmt-in" placeholder="Note to ${esc(others())}…"><button type="button" class="btn sm" data-act="comment">Send</button></div></div>`;
  return h;
}

/* ---------- flights sheet ---------- */
function openFlights() {
  const f = fl();
  const leg = (k, label, fromTz, toTz, l) => `<h3>${label}</h3>
    <div class="two"><div class="field"><label>Flight number</label><input type="text" id="${k}_flightNo" value="${esc(l.flightNo || '')}" placeholder="e.g. DL 54" autocapitalize="characters"></div>
    <div class="field"><label>Airline</label><input type="text" id="${k}_airline" value="${esc(l.airline || '')}" placeholder="e.g. Delta"></div></div>
    <div class="two"><div class="field"><label>From (airport)</label><input type="text" id="${k}_from" value="${esc(l.from || '')}" placeholder="${k === 'out' ? 'ATL' : 'LOS'}"></div>
    <div class="field"><label>To (airport)</label><input type="text" id="${k}_to" value="${esc(l.to || '')}" placeholder="${k === 'out' ? 'LOS' : 'ATL'}"></div></div>
    <div class="field"><label>Departs (${fromTz})</label><input type="datetime-local" id="${k}_depart" value="${esc(l.depart || '')}"></div>
    <div class="field"><label>Arrives (${toTz})</label><input type="datetime-local" id="${k}_arrive" value="${esc(l.arrive || '')}"></div>
    <div class="field"><label>Connections / layovers</label><input type="text" id="${k}_via" value="${esc(l.via || '')}" placeholder="e.g. via Amsterdam, 2h layover"></div>
    <div class="field"><label>Booking / confirmation code</label><input type="text" id="${k}_conf" value="${esc(l.conf || '')}"></div>
    <div class="row wrap">${trackLinks(l)}${flightCode(l) ? ` <button type="button" class="linkbtn" style="border:0" data-act="shareFlight" data-k="${k}">💬 Send to Messages</button>` : ''}</div>`;
  openSheet(`<h2>Our flights</h2><p class="sub">Times are local: US time when leaving the US, Lagos time when landing. Saving updates the countdown, Day 1 and trip length.</p>
    ${leg('out', '🛫 Going to Lagos', 'US time', 'Lagos time', f.out)}
    ${leg('back', '🏠 Coming home', 'Lagos time', 'US time', f.back)}
    <div class="sheet-actions"><button type="button" class="btn alt" data-act="close">Cancel</button><button type="button" class="btn" data-act="saveFlights">Save flights</button></div>`);
}
function readLeg(k) { const g = n => ($(`#${k}_${n}`)?.value || '').trim(); return { flightNo: g('flightNo').toUpperCase(), airline: g('airline'), from: g('from').toUpperCase(), to: g('to').toUpperCase(), depart: g('depart'), arrive: g('arrive'), via: g('via'), conf: g('conf') }; }
function flightRows(d) {
  const f = fl(), date = ymd(dayDate(d)), rows = [];
  const dep = splitDT(f.out.depart), arr = splitDT(f.out.arrive), bd = splitDT(f.back.depart), ba = splitDT(f.back.arrive);
  if (arr && arr.day === date) {
    if (dep) rows.push({ sort: '00:00', time: '', title: `🛫 Left ${f.out.from || 'the US'} ${fmt(dep.date)} at ${fmtTime(dep.time)} (US time)`, sub: [f.out.airline, f.out.flightNo, f.out.via].filter(Boolean).join(' · ') });
    rows.push({ sort: arr.time || '00:01', time: arr.time, title: `🛬 Land in Lagos${f.out.to ? ' (' + f.out.to + ')' : ''}`, sub: [f.out.flightNo, f.out.conf && 'Booking ' + f.out.conf].filter(Boolean).join(' · ') });
  }
  if (bd && bd.day === date) rows.push({ sort: bd.time || '23:58', time: bd.time, title: `🏠 Fly home${f.back.from ? ' from ' + f.back.from : ''}`, sub: [f.back.airline, f.back.flightNo, f.back.via, ba && `lands ${fmtDT(f.back.arrive)} US time`].filter(Boolean).join(' · ') });
  return rows;
}

/* ---------- full itinerary ---------- */
function dayRows(d) {
  const rows = flightRows(d).map(r => ({ ...r, kind: 'flight' }));
  items('event').filter(e => Number(e.day) === d && live(e) && !(e.id === 'seed-e-fly' && fl().back.depart)).forEach(e => {
    const v = e.vendorId && state.items.get(e.vendorId);
    rows.push({ sort: e.time || '99', time: e.time, title: e.title, sub: [e.type, e.place, v && `${v.name || v.role}${v.phone ? ' ' + v.phone : ''}`].filter(Boolean).join(' · '), notes: e.notes, link: e.link, pending: decision(e) === 'Proposed' });
  });
  items('spot').filter(x => Number(x.day) === d && live(x)).forEach(x => rows.push({ sort: '98', time: '', title: '✦ ' + x.name, sub: [x.category, x.area].filter(Boolean).join(' · '), notes: x.notes, link: x.link, pending: decision(x) === 'Proposed' }));
  return rows.sort((a, b) => a.sort.localeCompare(b.sort));
}
const dayLabel = d => `Day ${d} · ${fmt(dayDate(d), { weekday: 'long', month: 'long', day: 'numeric' })}`;
function dayText(d) {
  const rows = dayRows(d);
  return `${dayLabel(d)}\n` + (rows.length ? rows.map(r => `${r.time ? fmtTime(r.time) : '•'}  ${r.title}${r.pending ? ' (not agreed yet)' : ''}${r.sub ? `\n    ${r.sub}` : ''}${r.notes ? `\n    ${r.notes}` : ''}${r.link ? `\n    ${r.link}` : ''}`).join('\n') : 'Free day');
}
function tripText() {
  const s = S();
  return `WellPlanned · Lagos 2027\n${fmt(dayDate(1), { month: 'long', day: 'numeric' })} – ${fmt(dayDate(s.tripDays), { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
    Array.from({ length: s.tripDays }, (_, i) => dayText(i + 1)).join('\n\n');
}
function viewItinerary() {
  const s = S(), f = fl();
  let h = `<div class="no-print row wrap" style="margin-bottom:8px"><button class="btn sm alt" data-act="nav" data-view="plan">‹ Plan</button></div>
  <div class="itin-head"><div class="small">WellPlanned · Lagos 2027</div><h2>Our itinerary</h2>
    <div>${fmt(dayDate(1), { month: 'long', day: 'numeric' })} – ${fmt(dayDate(s.tripDays), { month: 'long', day: 'numeric', year: 'numeric' })} · ${s.tripDays} days</div>
    ${f.out.depart ? `<div class="small" style="margin-top:6px">🛫 ${esc(f.out.flightNo || '')} departs ${esc(f.out.from || '')} ${esc(fmtDT(f.out.depart))} (US) · 🛬 lands ${esc(fmtDT(f.out.arrive))} (Lagos)</div>` : ''}
    ${f.back.depart ? `<div class="small">🏠 ${esc(f.back.flightNo || '')} departs ${esc(fmtDT(f.back.depart))} (Lagos)${f.back.arrive ? ` · lands ${esc(fmtDT(f.back.arrive))} (US)` : ''}</div>` : ''}
  </div>
  <div class="no-print itin-actions">
    <button class="btn sm" data-act="print">📄 Save as PDF / print</button>
    <button class="btn sm alt" data-act="ics">📅 Whole trip to calendar</button>
    <button class="btn sm alt" data-act="shareTrip">💬 Share as text</button>
  </div>`;
  for (let d = 1; d <= s.tripDays; d++) {
    const rows = dayRows(d);
    h += `<section class="itin-day"><div class="itin-dh"><div class="day-n">${d}</div><div class="t">${esc(fmt(dayDate(d), { weekday: 'long', month: 'long', day: 'numeric' }))}</div></div>
      ${rows.length ? rows.map(r => `<div class="itin-row"><div class="time">${esc(fmtTime(r.time) || '')}</div><div><div class="t">${esc(r.title)}${r.pending ? ' <span class="pill gold">not agreed yet</span>' : ''}</div>
        ${r.sub ? `<div class="m">${esc(r.sub)}</div>` : ''}${r.notes ? `<div class="m">${esc(r.notes)}</div>` : ''}${r.link ? `<div class="m print-only">${esc(r.link)}</div><div class="no-print">${linkBtn(r.link)}</div>` : ''}</div></div>`).join('') : '<div class="empty">Free day</div>'}
      <div class="no-print itin-day-act"><button class="btn sm alt" data-act="icsDay" data-day="${d}">📅 Calendar</button><button class="btn sm alt" data-act="picDay" data-day="${d}">🖼 Picture</button><button class="btn sm alt" data-act="shareDay" data-day="${d}">💬 Text</button></div>
    </section>`;
  }
  return h;
}
async function shareText(text, title) {
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Copied — paste it into a message'); } catch { download('itinerary.txt', text, 'text/plain'); }
}
function wrapLines(ctx, text, maxW) {
  const out = [];
  String(text).split('\n').forEach(par => {
    let line = '';
    par.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
}
async function dayPicture(d) {
  const W = 1080, pad = 72, rows = dayRows(d);
  const c = document.createElement('canvas'); c.width = W; c.height = 4000; const x = c.getContext('2d');
  const sans = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', serif = 'Georgia, "Times New Roman", serif';
  x.fillStyle = '#faf6ef'; x.fillRect(0, 0, W, c.height);
  x.fillStyle = '#1d2b64'; x.fillRect(0, 0, W, 330);
  x.fillStyle = 'rgba(255,255,255,.12)';
  for (let i = 0; i < W; i += 36) for (let j = 0; j < 330; j += 36) { x.beginPath(); x.arc(i + 18, j + 18, 4, 0, 7); x.fill(); }
  x.fillStyle = '#e0a526'; x.font = `600 34px ${sans}`; x.fillText('WellPlanned · Lagos 2027', pad, 100);
  x.fillStyle = '#fff'; x.font = `700 96px ${serif}`; x.fillText(`Day ${d}`, pad, 205);
  x.font = `500 42px ${sans}`; x.fillText(fmt(dayDate(d), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), pad, 275);
  let y = 410; const tx = pad + 200, tw = W - tx - pad;
  if (!rows.length) { x.fillStyle = '#6b6f80'; x.font = `500 44px ${sans}`; x.fillText('Free day — rest & enjoy 🇳🇬', pad, y); y += 60; }
  rows.forEach(r => {
    x.fillStyle = '#2f4296'; x.font = `700 36px ${sans}`; x.fillText(r.time ? fmtTime(r.time) : '•', pad, y);
    x.fillStyle = '#1a1d2b'; x.font = `650 42px ${sans}`;
    wrapLines(x, r.title + (r.pending ? ' (not agreed yet)' : ''), tw).forEach(l => { x.fillText(l, tx, y); y += 54; });
    x.fillStyle = '#6b6f80'; x.font = `400 32px ${sans}`;
    [r.sub, r.notes].filter(Boolean).forEach(t => wrapLines(x, t, tw).forEach(l => { x.fillText(l, tx, y); y += 44; }));
    y += 18; x.fillStyle = '#e6e1d6'; x.fillRect(pad, y - 10, W - pad * 2, 2); y += 46;
  });
  y += 20;
  const out = document.createElement('canvas'); out.width = W; out.height = Math.max(y, 900);
  out.getContext('2d').drawImage(c, 0, 0);
  const blob = await new Promise(r => out.toBlob(r, 'image/png'));
  const file = new File([blob], `lagos-2027-day-${d}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: dayLabel(d) }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast('Picture saved');
}

async function compressImage(file, max = 900, q = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}

function quickAdd() {
  const k = (kind, t, d) => `<button class="kind" data-act="add" data-kind="${kind}"><div class="k-ic">${ICON[kind]}</div><b>${t}</b><span>${d}</span></button>`;
  openSheet(`<h2>Add something</h2>
    <button class="btn gold block" data-act="pasteSpot">📋 Paste a link I just copied</button><div style="height:10px"></div>
    <div class="kinds">${k('spot', 'Spot', 'Store, brand, place')}${k('todo', 'To-do', 'Task or thing to buy')}${k('event', 'Plan item', 'Something on a day')}
    ${k('vendor', 'Vendor', 'Photographer, cook, driver')}${k('guest', 'Guest', 'Reunion & Adire')}${k('cargo', 'Cargo box', 'Shipping to Lagos')}${k('expense', 'Cost', 'Budget item')}</div>`);
}

async function readClipboard() {
  try { return await navigator.clipboard.readText(); } catch { return ''; }
}
async function pasteSpot() {
  const txt = await readClipboard();
  const url = findUrl(txt) || (/^[\w.-]+\.[a-z]{2,}\//i.test(txt.trim()) ? txt.trim() : '');
  if (!url) toast(txt ? 'No link found on the clipboard' : 'Couldn’t read the clipboard — paste into the link box');
  openForm('spot', null, url ? { link: normUrl(url), name: guessName(url) } : {});
}

/* ---------- export / import / calendar ---------- */
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportICS(onlyDay = null) {
  const s = S(), f = fl(), homeTz = s.homeTz || 'America/New_York';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WellPlanned//Lagos2027//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Lagos 2027'];
  const e = t => String(t || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const z = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const d8 = d => ymd(d).replace(/-/g, '');
  const stamp = z(new Date());
  const ev = (id, title, start, end, desc, loc) => {
    lines.push('BEGIN:VEVENT', `UID:${id}@wellplanned`, `DTSTAMP:${stamp}`);
    if (start instanceof Date) lines.push(`DTSTART:${z(start)}`, `DTEND:${z(end || new Date(+start + 3600e3))}`);
    else lines.push(`DTSTART;VALUE=DATE:${d8(start.date)}`, `DTEND;VALUE=DATE:${d8(addDays(start.date, 1))}`);
    lines.push(`SUMMARY:${e(title)}`); if (loc) lines.push(`LOCATION:${e(loc)}`); if (desc) lines.push(`DESCRIPTION:${e(desc)}`); lines.push('END:VEVENT');
  };
  const inDay = date => onlyDay == null || ymd(date) === ymd(dayDate(onlyDay));
  const lagosAt = (d, time) => zonedToUTC(`${ymd(dayDate(d))}T${time}`, LAGOS_TZ);
  // flights (real time zones, so they show correctly on any phone)
  if (f.out.depart && f.out.arrive && (onlyDay == null || inDay(splitDT(f.out.arrive).date)))
    ev('flight-out', `✈︎ ${f.out.flightNo || 'Flight'} ${f.out.from || ''} → ${f.out.to || 'LOS'}`.trim(), zonedToUTC(f.out.depart, homeTz), zonedToUTC(f.out.arrive, LAGOS_TZ), [f.out.airline, f.out.via, f.out.conf && 'Booking ' + f.out.conf].filter(Boolean).join('\n'));
  if (f.back.depart && (onlyDay == null || inDay(splitDT(f.back.depart).date)))
    ev('flight-back', `✈︎ ${f.back.flightNo || 'Flight'} home ${f.back.from || 'LOS'} → ${f.back.to || ''}`.trim(), zonedToUTC(f.back.depart, LAGOS_TZ), f.back.arrive ? zonedToUTC(f.back.arrive, homeTz) : null, [f.back.airline, f.back.via, f.back.conf && 'Booking ' + f.back.conf].filter(Boolean).join('\n'));
  items('event').filter(x => x.day && live(x) && (onlyDay == null || Number(x.day) === onlyDay)).forEach(x => {
    const desc = [x.link, x.notes].filter(Boolean).join('\n');
    if (x.time) ev(x.id, '🇳🇬 ' + x.title, lagosAt(Number(x.day), x.time), null, desc, x.place); else ev(x.id, '🇳🇬 ' + x.title, { date: dayDate(Number(x.day)) }, null, desc, x.place);
  });
  items('spot').filter(x => x.day && live(x) && (onlyDay == null || Number(x.day) === onlyDay)).forEach(x => ev(x.id, '✦ ' + x.name, { date: dayDate(Number(x.day)) }, null, [x.link, x.notes].filter(Boolean).join('\n'), x.area));
  if (onlyDay == null) items('todo').filter(t => !t.done && live(t) && dueDate(t)).forEach(t => ev(t.id, '✓ Lagos: ' + t.title, { date: dueDate(t) }, null, t.notes));
  lines.push('END:VCALENDAR');
  download(onlyDay == null ? 'lagos-2027.ics' : `lagos-2027-day-${onlyDay}.ics`, lines.join('\r\n'), 'text/calendar');
  toast(`Calendar file ready — open it to add${s.placeholderDates && !f.out.depart ? ' (dates are still placeholders)' : ''}`);
}
function parseConfig(txt) {
  const m = txt.match(/\{[\s\S]*\}/); if (!m) return null;
  const json = m[0].replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,\s*}/g, '}');
  try { const c = JSON.parse(json); return c.apiKey ? c : null; } catch { return null; }
}

/* ---------- events ---------- */
document.addEventListener('click', async ev => {
  if (ev.target.closest('[data-stop]')) return;
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (el.tagName === 'A') ev.preventDefault();
  switch (act) {
    case 'nav': closeSheet(); state.view = el.dataset.view; state.sub = null; render(); scrollTo(0, 0); break;
    case 'sub': closeSheet(); state.view = 'more'; state.sub = el.dataset.sub || null; render(); scrollTo(0, 0); break;
    case 'quick': quickAdd(); break;
    case 'close': closeSheet(); break;
    case 'add': ev.stopPropagation(); { const pre = el.dataset.day ? { day: Number(el.dataset.day) } : {}; openForm(el.dataset.kind, null, pre); } break;
    case 'edit': { const it = state.items.get(el.dataset.id); if (it) openForm(it.kind, it); } break;
    case 'toggle': ev.stopPropagation(); { const it = state.items.get(el.dataset.id); if (it) store.save({ ...it, done: !it.done }); } break;
    case 'delete': {
      const it = state.items.get(sheetItem.id) || sheetItem;
      if (needsOk(it) && it.votes && decision(it) === 'Agreed') {
        if (confirm(`You both agreed on this. Ask ${others()} to confirm removing it?`)) { closeSheet(); store.save({ ...it, removeReq: { by: me(), at: Date.now() } }); toast(`Sent to ${others()} to confirm`); }
      } else if (confirm('Delete this?')) { closeSheet(); store.remove(it.id); toast('Deleted'); }
    } break;
    case 'vote': { const it = state.items.get(el.dataset.id); if (!it) break; closeSheet();
      await store.save({ ...it, votes: { ...(it.votes || {}), [me()]: el.dataset.v } }); toast(el.dataset.v === 'yes' ? '✓ Agreed' : 'Declined'); } break;
    case 'rmYes': { closeSheet(); await store.remove(el.dataset.id); toast('Removed'); } break;
    case 'rmNo': { const it = state.items.get(el.dataset.id); if (!it) break; closeSheet(); const { removeReq, ...rest } = it; await store.save(rest); toast('Kept'); } break;
    case 'comment': {
      const inp = $('#cmtText'); const text = inp.value.trim(); if (!text) break;
      const base = state.items.get(sheetItem.id) || sheetItem;
      const comments = [...(base.comments || []), { by: me(), text, at: Date.now() }];
      sheetItem.comments = comments; inp.value = '';
      $('#cmtList').innerHTML = cmtHTML(comments);
      await store.save({ ...base, comments }); } break;
    case 'flights': ev.stopPropagation(); openFlights(); break;
    case 'saveFlights': {
      const out = readLeg('out'), backL = readLeg('back');
      if (out.depart && out.arrive && out.arrive.slice(0, 10) < out.depart.slice(0, 10)) { toast('Landing is before departure — check the dates'); break; }
      const patch = { flights: { out, back: backL } };
      const landDay = (out.arrive || out.depart || '').slice(0, 10);
      if (landDay) {
        patch.tripStart = landDay; patch.placeholderDates = false;
        if (backL.depart) patch.tripDays = Math.max(1, Math.min(60, daysBetween(parseDate(landDay), parseDate(backL.depart.slice(0, 10))) + 1));
      }
      closeSheet(); await store.saveSettings(patch); toast('Flights saved'); } break;
    case 'shareFlight': { const l = readLeg(el.dataset.k); const c = flightCode(l); const d = splitDT(l.depart);
      shareText(`Our flight: ${l.airline ? l.airline + ' ' : ''}${c}${d ? ' on ' + fmt(d.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}${l.from && l.to ? ` (${l.from} → ${l.to})` : ''}`, 'Our flight'); } break;
    case 'saveMembers': {
      const m = [$('#setM1').value.trim(), $('#setM2').value.trim()].filter(Boolean);
      if (!m.length) break;
      const pick = $('#setMe').selectedIndex; localStorage.setItem('me', m[pick] || m[0]);
      await store.saveSettings({ members: m }); toast('Saved'); } break;
    case 'setMe': localStorage.setItem('me', el.dataset.v); closeSheet(); render(); toast(`Hi ${el.dataset.v}!`); break;
    case 'print': window.print(); break;
    case 'shareTrip': shareText(tripText(), 'Lagos 2027 itinerary'); break;
    case 'shareDay': shareText(`WellPlanned · Lagos 2027\n${dayText(Number(el.dataset.day))}`, dayLabel(Number(el.dataset.day))); break;
    case 'picDay': dayPicture(Number(el.dataset.day)); break;
    case 'icsDay': exportICS(Number(el.dataset.day)); break;
    case 'imgRemove': sheetImage = null; $('#imgPrev').hidden = true; el.remove(); break;
    case 'spotFilter': state.spotFilter = el.dataset.v; render(); break;
    case 'todoFilter': state.todoFilter = el.dataset.v; render(); break;
    case 'pasteSpot': closeSheet(); pasteSpot(); break;
    case 'pasteInto': { const t = await readClipboard(); const u = findUrl(t) || t.trim(); if (!u) { toast('Clipboard is empty'); break; }
      const f = $('#itemForm').elements[el.dataset.k]; f.value = normUrl(u);
      const n = $('#itemForm').elements.name; if (n && !n.value) n.value = guessName(u); } break;
    case 'saveSettings': {
      const start = $('#setStart').value, days = Math.max(1, Math.min(60, Number($('#setDays').value) || 21));
      const patch = { tripDays: days, rate: Number($('#setRate').value) || S().rate, adireNames: $('#setNames').value.trim() };
      if (start) { patch.placeholderDates = start === S().tripStart ? S().placeholderDates : false; patch.tripStart = start; }
      await store.saveSettings(patch); toast('Saved'); } break;
    case 'export': download(`lagos-planner-backup-${ymd(new Date())}.json`, JSON.stringify({ settings: S(), items: [...state.items.values()] }, null, 1), 'application/json'); break;
    case 'ics': exportICS(null); break;
    case 'saveCfg': { const c = parseConfig($('#cfgText').value); if (!c) { toast('That doesn’t look like a Firebase config'); break; }
      localStorage.setItem('fbConfig', JSON.stringify(c)); toast('Saved — reloading'); setTimeout(() => location.reload(), 600); } break;
    case 'signin': case 'signup': {
      const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
      if (!email || pass.length < 6) { toast('Enter email and a 6+ character password'); break; }
      try { const fb = await loadFirebase(getConfig()); const fn = act === 'signin' ? fb.authM.signInWithEmailAndPassword : fb.authM.createUserWithEmailAndPassword; await fn(fb.auth, email, pass); toast('Signed in'); }
      catch (e) { toast('Sign-in failed: ' + (e.code || e.message)); } } break;
    case 'signout': await cloud.fb.authM.signOut(cloud.fb.auth); location.reload(); break;
    case 'pushLocal': {
      const { items: list, settings } = await local.load();
      if (!list.length) { toast('No offline data on this phone'); break; }
      if (!confirm(`Copy ${list.length} items from this phone into the shared plan?`)) break;
      for (const it of list) await cloud.fb.fsM.setDoc(itemDoc(it.id), clean(it));
      if (settings && !settings.placeholderDates) await store.saveSettings(settings);
      toast('Copied into the shared plan'); } break;
  }
});
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'itemForm') return; ev.preventDefault();
  const out = collectForm(); if (!out) return;
  const prev = state.items.get(out.id);
  if (prev) { out.votes = prev.votes; out.comments = prev.comments; out.removeReq = prev.removeReq; }
  out.addedBy = out.addedBy || me();
  let msg = 'Saved';
  if (needsOk(out)) {
    const keys = SPECS[out.kind].fields.flat().map(f => f.k).filter(k => !['done', 'paid'].includes(k));
    const changed = !prev || keys.some(k => JSON.stringify(prev[k] ?? '') !== JSON.stringify(out[k] ?? ''));
    if (changed) { out.votes = { [me()]: 'yes' }; if (prev) out.editedBy = me(); msg = `Saved — sent to ${others()} to agree`; }
  }
  if (out.removeReq === undefined) delete out.removeReq;
  closeSheet(); store.save(out); toast(msg);
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'spotSearch') { state.q = ev.target.value; renderSpotList(); }
  if (ev.target.name === 'link' && sheetItem?.kind === 'spot') { const n = $('#itemForm').elements.name; if (n && !n.value) n.value = guessName(ev.target.value); }
});
document.addEventListener('change', async ev => {
  if (ev.target.id === 'imgFile' && ev.target.files[0]) {
    try { sheetImage = await compressImage(ev.target.files[0]); const p = $('#imgPrev'); p.src = sheetImage; p.hidden = false; }
    catch { toast('Couldn’t read that image'); }
  }
  if (ev.target.id === 'importFile' && ev.target.files[0]) {
    try {
      const data = JSON.parse(await ev.target.files[0].text());
      if (!Array.isArray(data.items)) throw 0;
      if (!confirm(`Import ${data.items.length} items? Items with the same ID are replaced.`)) return;
      for (const it of data.items) await store.save(it);
      if (data.settings) await store.saveSettings(data.settings);
      toast('Imported');
    } catch { toast('That file isn’t a planner backup'); }
  }
});

/* ---------- boot ---------- */
async function boot() {
  const p = new URLSearchParams(location.search);
  const shared = findUrl([p.get('url'), p.get('text'), p.get('title')].join(' '));
  if (p.toString()) history.replaceState(null, '', location.pathname);
  const afterReady = () => { if (shared) openForm('spot', null, { link: normUrl(shared), name: guessName(shared), notes: (p.get('title') || '') }); };

  const cfg = getConfig();
  if (cfg) {
    try {
      const fb = await loadFirebase(cfg);
      let first = true;
      fb.authM.onAuthStateChanged(fb.auth, async user => {
        cloud.user = user;
        if (user) { startCloud(); if (first) { const iv = setInterval(() => { if (state.ready) { clearInterval(iv); afterReady(); } }, 100); } }
        else { await startLocal(); if (first) afterReady(); }
        first = false;
      });
      return;
    } catch (e) { console.warn('Firebase unavailable, using offline mode', e); }
  }
  await startLocal(); afterReady();
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
window.__wp = { state, render, store }; // handy for debugging
boot();
