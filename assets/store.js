// Lapisan data: Firebase (login Google + Firestore) bila config tersedia, selain itu mode perangkat (localStorage).
import { CONFIG } from '../config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const hasFirebase = !!(CONFIG.firebase && CONFIG.firebase.apiKey);
let fb = null; // { auth, db, m:{...} }
let user = null; // { uid, name, email, photo, tier }
const listeners = new Set();
const emit = () => listeners.forEach(f => f(user));

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

export const store = {
  mode: hasFirebase ? 'cloud' : 'local',
  get user() { return user; },
  onUser(f) { listeners.add(f); f(user); return () => listeners.delete(f); },

  async init() {
    if (!hasFirebase) { user = LS.get('cp.guest', null); emit(); return; }
    const [{ initializeApp }, A, F] = await Promise.all([
      import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
    // Di Vercel/domain sendiri, login lewat proxy /__/auth di domain yang sama (lihat vercel.json)
    const sameOrigin = (CONFIG.authProxyHosts || []).some(h => location.hostname === h || location.hostname.endsWith('.' + h));
    const app = initializeApp({ ...CONFIG.firebase, ...(sameOrigin ? { authDomain: location.host } : {}) });
    fb = { auth: A.getAuth(app), db: F.getFirestore(app), A, F };
    A.getRedirectResult(fb.auth).catch(e => { console.warn('login redirect', e); window.dispatchEvent(new CustomEvent('cp-auth-error', { detail: e })); });
    await new Promise(res => {
      A.onAuthStateChanged(fb.auth, async u => {
        if (!u) { user = null; emit(); res(); return; }
        user = { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL, tier: 'free' };
        try {
          const ref = F.doc(fb.db, 'users', u.uid);
          const s = await F.getDoc(ref);
          if (!s.exists()) await F.setDoc(ref, { name: user.name, email: user.email, tier: 'free', createdAt: F.serverTimestamp() });
          else { const d = s.data(); user.tier = isPro(d) ? 'pro' : 'free'; user.proUntil = d.proUntil || null; }
          user.admin = (await F.getDoc(F.doc(fb.db, 'admins', u.uid))).exists();
        } catch (e) { console.warn('profil', e); }
        emit(); res();
      });
    });
  },

  async signIn() {
    if (!hasFirebase) { // mode perangkat: akun tamu lokal
      user = { uid: 'lokal', name: 'Pelatih (perangkat ini)', email: '', tier: LS.get('cp.tier', 'free') };
      LS.set('cp.guest', user); emit(); return user;
    }
    const p = new fb.A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await fb.A.signInWithPopup(fb.auth, p); }
    catch (e) { if (/popup/.test(e.code || '')) await fb.A.signInWithRedirect(fb.auth, p); else throw e; }
    await new Promise(r => { const off = store.onUser(u => { if (u) { off(); r(); } }); });
    return user;
  },
  async signOut() { if (!hasFirebase) { user = null; LS.set('cp.guest', null); emit(); return; } await fb.A.signOut(fb.auth); },

  get isPro() { return user?.tier === 'pro'; },
  limits() { return this.isPro ? { plans: Infinity, watermark: false } : { plans: CONFIG.freePlans, watermark: true }; },

  async list() {
    if (!hasFirebase) return Object.values(LS.get('cp.plans', {})).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(meta);
    const { F, db } = fb;
    const qs = await F.getDocs(F.query(F.collection(db, 'users', user.uid, 'plans'), F.orderBy('updatedAt', 'desc')));
    return qs.docs.map(d => meta({ id: d.id, ...d.data() }));
  },
  async get(id) {
    if (!hasFirebase) return LS.get('cp.plans', {})[id] || null;
    const s = await fb.F.getDoc(fb.F.doc(fb.db, 'users', user.uid, 'plans', id));
    return s.exists() ? revive({ id: s.id, ...s.data() }) : null;
  },
  async save(plan) {
    plan.updatedAt = Date.now(); if (!plan.createdAt) plan.createdAt = plan.updatedAt;
    if (!plan.id) plan.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (!hasFirebase) { const all = LS.get('cp.plans', {}); all[plan.id] = plan; LS.set('cp.plans', all); return plan; }
    const { id, ...data } = plan;
    // Firestore tidak menerima array bersarang → simpan freq/ci sebagai string
    data.freq = JSON.stringify(plan.freq); data.ci = JSON.stringify(plan.ci);
    await fb.F.setDoc(fb.F.doc(fb.db, 'users', user.uid, 'plans', id), JSON.parse(JSON.stringify(data)));
    return plan;
  },
  async remove(id) {
    if (!hasFirebase) { const all = LS.get('cp.plans', {}); delete all[id]; LS.set('cp.plans', all); return; }
    await fb.F.deleteDoc(fb.F.doc(fb.db, 'users', user.uid, 'plans', id));
  },

  // ---- admin (aktivasi Pro manual setelah pembayaran diterima) ----
  async adminUsers() {
    const { F, db } = fb; const qs = await F.getDocs(F.query(F.collection(db, 'users'), F.orderBy('createdAt', 'desc'), F.limit(200)));
    return qs.docs.map(d => ({ uid: d.id, ...d.data() }));
  },
  async adminSetPro(uid, months) {
    const { F, db } = fb;
    const until = months > 0 ? Date.now() + months * 30.44 * 864e5 : null;
    await F.updateDoc(F.doc(db, 'users', uid), { tier: months > 0 ? 'pro' : 'free', proUntil: until, proBy: user.uid, proAt: F.serverTimestamp() });
  },
};

function isPro(d) { return d.tier === 'pro' && (!d.proUntil || d.proUntil > Date.now()); }
function meta(p) { return { id: p.id, title: p.title, athlete: p.athlete, sportName: p.sportName, start: p.start, weeks: p.weeks, updatedAt: p.updatedAt, events: p.events }; }
export function revive(p) { // dari Firestore
  if (p && typeof p.freq === 'string') p.freq = JSON.parse(p.freq);
  if (p && typeof p.ci === 'string') p.ci = JSON.parse(p.ci);
  return p;
}
