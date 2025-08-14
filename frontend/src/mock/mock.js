/* Mock data + localStorage helpers for "Маркер" */
const LS_KEY = (clientId) => `marker_app_v1_${clientId}`;
const readStore = (clientId) => { try { const raw = localStorage.getItem(LS_KEY(clientId)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const writeStore = (clientId, data) => localStorage.setItem(LS_KEY(clientId), JSON.stringify(data));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

function seedMarkers(authorId) {
  return [
    { id: uid(), type: "dps", title: "Пост ДПС", description: "Проверяют документы", location: { lng: 37.620393, lat: 55.75396 }, createdAt: now(), createdBy: authorId, confirmations: 4, confirmationsBy: [], comments: [{ id: uid(), userId: authorId, text: "Стоят слева", createdAt: now() }], ratingsBy: [{ userId: authorId, value: 4 }], media: [], status: "active" },
    { id: uid(), type: "parking", title: "Бесплатная парковка", description: "На выходных бесплатно", location: { lng: 37.605, lat: 55.757 }, createdAt: now(), createdBy: authorId, confirmations: 9, confirmationsBy: [], comments: [], ratingsBy: [{ userId: authorId, value: 5 }], media: [], status: "active" },
  ];
}

export function initClient(clientId) {
  let store = readStore(clientId);
  if (store) return store;
  const userId = clientId || uid();
  const username = `Пользователь_${String(userId).slice(-4)}`;
  store = { clientId: userId, user: { id: userId, name: username, isPro: false, proUntil: null, prefix: null, avatarUrl: null, points: 50, dailyClaimedAt: null, settings: { mapStyle: "classic" } }, admins: ["12345"], markers: seedMarkers(userId), pending: [] };
  writeStore(clientId, store); return store;
}
export const getStore = (clientId) => initClient(clientId);
export function updateUser(clientId, patch) { const s = getStore(clientId); s.user = { ...s.user, ...patch }; writeStore(clientId, s); return s.user; }
export const getMarkers = (clientId) => getStore(clientId).markers.filter((m) => m.status === "active");
export function addMarker(clientId, marker) { const s = getStore(clientId); const newMarker = { id: uid(), createdAt: now(), createdBy: s.user.id, confirmations: 0, confirmationsBy: [], comments: [], ratingsBy: [], media: marker.media || [], status: "pending", ...marker }; s.pending.unshift(newMarker); s.user.points = (s.user.points || 0) + 5; writeStore(clientId, s); return newMarker; }
export function adminApprove(clientId, markerId, approve = true) { const s = getStore(clientId); const idx = s.pending.findIndex((p) => p.id === markerId); if (idx === -1) return; const m = s.pending[idx]; s.pending.splice(idx, 1); if (approve) { m.status = "active"; s.markers.unshift(m); } else { m.status = "rejected"; } writeStore(clientId, s); }
export function confirmMarker(clientId, markerId) { const s = getStore(clientId); const marker = s.markers.find((m) => m.id === markerId); if (!marker) return; const uid_ = s.user.id; if (!marker.confirmationsBy.includes(uid_)) { marker.confirmationsBy.push(uid_); marker.confirmations += 1; s.user.points += 2; } writeStore(clientId, s); return marker; }
export function addComment(clientId, markerId, text) { const s = getStore(clientId); const marker = s.markers.find((m) => m.id === markerId); if (!marker) return; marker.comments.push({ id: uid(), userId: s.user.id, text, createdAt: now() }); s.user.points += 1; writeStore(clientId, s); return marker; }
export function rateMarker(clientId, markerId, value) { const s = getStore(clientId); const marker = s.markers.find((m) => m.id === markerId); if (!marker) return; const i = marker.ratingsBy.findIndex((r) => r.userId === s.user.id); if (i === -1) { marker.ratingsBy.push({ userId: s.user.id, value }); s.user.points += 1; } else { marker.ratingsBy[i].value = value; } writeStore(clientId, s); return marker; }
export function leaderboard(clientId) { const s = getStore(clientId); const stats = {}; const add = (id, by) => (stats[id] = (stats[id] || 0) + by); s.markers.forEach((m) => { add(m.createdBy, 5 + m.comments.length + m.confirmations); m.comments.forEach((c) => add(c.userId, 1)); m.confirmationsBy.forEach((u) => add(u, 1)); }); stats[s.user.id] = (stats[s.user.id] || 0) + s.user.points; return Object.entries(stats).map(([id, score]) => ({ id, name: id === s.user.id ? s.user.name : `Пользователь_${String(id).slice(-4)}`, score })).sort((a,b)=>b.score-a.score).slice(0,20); }
export const isTop10FreePro = (clientId) => leaderboard(clientId).findIndex((u) => u.id === getStore(clientId).user.id) < 10;
export function claimDaily(clientId) { const s = getStore(clientId); const last = s.user.dailyClaimedAt ? new Date(s.user.dailyClaimedAt) : null; const today = new Date(); if (last && last.toDateString() === today.toDateString()) return { ok: false, message: "Сегодня уже получено" }; s.user.dailyClaimedAt = today.toISOString(); s.user.points += 10; writeStore(clientId, s); return { ok: true, points: s.user.points }; }
export function tryActivateProFromPoints(clientId) { const s = getStore(clientId); if (s.user.points < 1000) return { ok: false, message: "Недостаточно баллов" }; s.user.points -= 1000; const until = new Date(); until.setMonth(until.getMonth() + 1); s.user.isPro = true; s.user.proUntil = until.toISOString(); s.user.prefix = "PRO"; writeStore(clientId, s); return { ok: true }; }
export const getPending = (clientId) => getStore(clientId).pending;
export const isAdmin = (clientId) => (getStore(clientId).admins || []).includes(String(getStore(clientId).user.id));
export const myMarkers = (clientId) => { const s = getStore(clientId); return { active: s.markers.filter(m=>m.createdBy===s.user.id), pending: s.pending.filter(m=>m.createdBy===s.user.id) } };

// Mock payments
export const mockCreateEnotPayment = (clientId, { amountRub }) => ({ id: uid(), url: `https://pay.enot.example/mock/${uid()}?amount=${amountRub}`, status: "pending" });
export function grantProTrial(clientId) { const s = getStore(clientId); const until = new Date(); until.setMonth(until.getMonth() + 1); s.user.isPro = true; s.user.proUntil = until.toISOString(); s.user.prefix = "PRO"; writeStore(clientId, s); return s.user; }
export const mapStyles = () => [ { id: "classic", name: "Классическая" }, { id: "dark", name: "Тёмная" } ];