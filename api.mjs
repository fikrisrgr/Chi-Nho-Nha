import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';

const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const secret = () => process.env.SESSION_SECRET || 's:' + process.env.ADMIN_PIN;
const sign = (exp) => { const p = String(exp); return p + '.' + createHmac('sha256', secret()).update(p).digest('hex'); };
const valid = (t) => {
  try {
    const [p, h] = String(t).split('.');
    if (!p || !h || +p < Date.now()) return false;
    const e = createHmac('sha256', secret()).update(p).digest('hex');
    return h.length === e.length && timingSafeEqual(Buffer.from(h), Buffer.from(e));
  } catch { return false; }
};
const authed = (req) => valid((req.headers.get('authorization') || '').replace('Bearer ', ''));
const clip = (s, n) => String(s || '').slice(0, n);
const tries = new Map();

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const store = getStore('chinhonha');
  try {
    // Public: everyone sees the content the admin saved
    if (path === 'content' && req.method === 'GET') return J((await store.get('content', { type: 'json' })) || {});

    // Admin login: PIN is checked on the server (env var ADMIN_PIN), never in the page
    if (path === 'login' && req.method === 'POST') {
      const ip = req.headers.get('x-nf-client-connection-ip') || 'x';
      const a = tries.get(ip) || { n: 0, t: 0 };
      if (a.n >= 5 && Date.now() - a.t < 60000) return J({ error: 'locked' }, 429);
      const { pin } = await req.json();
      const pass = String(process.env.ADMIN_PIN || '');
      if (pass && String(pin) === pass) { tries.delete(ip); return J({ token: sign(Date.now() + 15 * 60000) }); }
      tries.set(ip, { n: a.n + 1, t: Date.now() });
      return J({ error: 'bad' }, 401);
    }

    // Admin: save content
    if (path === 'content' && req.method === 'PUT') {
      if (!authed(req)) return J({ error: 'auth' }, 401);
      const d = await req.json();
      await store.setJSON('content', {
        voices: d.voices || [], reviews: d.reviews || [], products: d.products || {},
        settings: d.settings || {}, log: (d.log || []).slice(0, 30),
      });
      return J({ ok: 1 });
    }

    // Public: visitor submits a review (goes to the pending queue for admin approval)
    if (path === 'review' && req.method === 'POST') {
      const b = await req.json();
      const q = (await store.get('pending', { type: 'json' })) || [];
      if (q.length >= 100) return J({ error: 'full' }, 429);
      q.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), n: clip(b.n, 60), c: clip(b.c, 60), f: clip(b.f, 80), s: Math.min(5, Math.max(1, +b.s || 5)), t: clip(b.t, 600) });
      await store.setJSON('pending', q);
      return J({ ok: 1 });
    }

    if (path === 'pending' && req.method === 'GET') {
      if (!authed(req)) return J({ error: 'auth' }, 401);
      return J((await store.get('pending', { type: 'json' })) || []);
    }

    if (path === 'pending-delete' && req.method === 'POST') {
      if (!authed(req)) return J({ error: 'auth' }, 401);
      const { ids } = await req.json();
      const q = ((await store.get('pending', { type: 'json' })) || []).filter((x) => !ids.includes(x.id));
      await store.setJSON('pending', q);
      return J({ ok: 1 });
    }
  } catch (e) { return J({ error: 'server' }, 500); }
  return J({ error: 'not found' }, 404);
};

export const config = { path: '/api/*' };
