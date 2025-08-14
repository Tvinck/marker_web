/*
  Mock data + localStorage helpers for "Маркер" (EasyRide-like clone)
  - All state persists per client_id (from URL)
  - Replace with real API in backend phase
*/

// Storage helpers
const LS_KEY = (clientId) => `marker_app_v1_${clientId}`;

function readStore(clientId) {
  const raw = localStorage.getItem(LS_KEY(clientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Bad store json", e);
    return null;
  }
}

function writeStore(clientId, data) {
  localStorage.setItem(LS_KEY(clientId), JSON.stringify(data));
}

// Utils
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

// Seed demo markers around Moscow center
function seedMarkers(authorId) {
  return [
    {
      id: uid(),
      type: "dps",
      title: "Пост ДПС",
      description: "Проверяют документы",
      location: { lng: 37.620393, lat: 55.75396 },
      createdAt: now(),
      createdBy: authorId,
      confirmations: 4,
      confirmationsBy: [],
      comments: [
        { id: uid(), userId: authorId, text: "Стоят слева", createdAt: now() },
      ],
      ratingsBy: [{ userId: authorId, value: 4 }],
      status: "active",
    },
    {
      id: uid(),
      type: "parking",
      title: "Бесплатная парковка",
      description: "На выходных бесплатно",
      location: { lng: 37.605, lat: 55.757 },
      createdAt: now(),
      createdBy: authorId,
      confirmations: 9,
      confirmationsBy: [],
      comments: [
        { id: uid(), userId: authorId, text: "Мест немного", createdAt: now() },
      ],
      ratingsBy: [{ userId: authorId, value: 5 }],
      status: "active",
    },
    {
      id: uid(),
      type: "camera",
      title: "Камера",
      description: "Контроль скорости",
      location: { lng: 37.63, lat: 55.748 },
      createdAt: now(),
      createdBy: authorId,
      confirmations: 2,
      confirmationsBy: [],
      comments: [],
      ratingsBy: [],
      status: "active",
    },
  ];
}

export function initClient(clientId) {
  // if store exists, return it
  let store = readStore(clientId);
  if (store) return store;

  // create new store
  const userId = clientId || uid();
  const username = `Пользователь_${String(userId).slice(-4)}`;
  store = {
    clientId: userId,
    user: {
      id: userId,
      name: username,
      isPro: false,
      proUntil: null,
      prefix: null,
      avatarUrl: null,
      points: 50,
      dailyClaimedAt: null,
      settings: {
        mapStyle: "classic",
        showDps: true,
        showParking: true,
        showCameras: true,
      },
    },
    markers: seedMarkers(userId),
    // admin
    pending: [],
  };
  writeStore(clientId, store);
  return store;
}

export function getStore(clientId) {
  return initClient(clientId);
}

export function updateUser(clientId, patch) {
  const s = getStore(clientId);
  s.user = { ...s.user, ...patch };
  writeStore(clientId, s);
  return s.user;
}

export function getMarkers(clientId) {
  const s = getStore(clientId);
  return s.markers.filter((m) => m.status === "active");
}

export function addMarker(clientId, marker) {
  const s = getStore(clientId);
  const newMarker = {
    id: uid(),
    createdAt: now(),
    createdBy: s.user.id,
    confirmations: 0,
    confirmationsBy: [],
    comments: [],
    ratingsBy: [],
    status: "pending", // отправляем в модерацию
    ...marker,
  };
  s.pending.unshift(newMarker);
  writeStore(clientId, s);
  return newMarker;
}

export function adminApprove(clientId, markerId, approve = true) {
  const s = getStore(clientId);
  const idx = s.pending.findIndex((p) => p.id === markerId);
  if (idx === -1) return;
  const m = s.pending[idx];
  s.pending.splice(idx, 1);
  if (approve) {
    m.status = "active";
    s.markers.unshift(m);
  } else {
    m.status = "rejected";
  }
  writeStore(clientId, s);
}

export function confirmMarker(clientId, markerId) {
  const s = getStore(clientId);
  const marker = s.markers.find((m) => m.id === markerId);
  if (!marker) return;
  const uid_ = s.user.id;
  if (!marker.confirmationsBy.includes(uid_)) {
    marker.confirmationsBy.push(uid_);
    marker.confirmations += 1;
    s.user.points += 2; // геймификация
  }
  writeStore(clientId, s);
  return marker;
}

export function addComment(clientId, markerId, text) {
  const s = getStore(clientId);
  const marker = s.markers.find((m) => m.id === markerId);
  if (!marker) return;
  marker.comments.push({ id: uid(), userId: s.user.id, text, createdAt: now() });
  s.user.points += 1;
  writeStore(clientId, s);
  return marker;
}

export function rateMarker(clientId, markerId, value) {
  const s = getStore(clientId);
  const marker = s.markers.find((m) => m.id === markerId);
  if (!marker) return;
  const i = marker.ratingsBy.findIndex((r) => r.userId === s.user.id);
  if (i === -1) marker.ratingsBy.push({ userId: s.user.id, value });
  else marker.ratingsBy[i].value = value;
  writeStore(clientId, s);
  return marker;
}

export function leaderboard(clientId) {
  const s = getStore(clientId);
  const stats = {};
  const addScore = (id, by) => (stats[id] = (stats[id] || 0) + by);
  s.markers.forEach((m) => {
    addScore(m.createdBy, 5);
    addScore(m.createdBy, m.comments.length);
    addScore(m.createdBy, m.confirmations);
    m.comments.forEach((c) => addScore(c.userId, 1));
    m.confirmationsBy.forEach((u) => addScore(u, 1));
  });
  // include self
  stats[s.user.id] = (stats[s.user.id] || 0) + s.user.points;
  const arr = Object.entries(stats).map(([uidX, score]) => ({
    id: uidX,
    name: uidX === s.user.id ? s.user.name : `Пользователь_${String(uidX).slice(-4)}`,
    score,
  }));
  arr.sort((a, b) => b.score - a.score);
  return arr.slice(0, 20);
}

export function isTop10FreePro(clientId) {
  const lb = leaderboard(clientId);
  const meIdx = lb.findIndex((u) => u.id === getStore(clientId).user.id);
  return meIdx > -1 && meIdx < 10;
}

export function claimDaily(clientId) {
  const s = getStore(clientId);
  const last = s.user.dailyClaimedAt ? new Date(s.user.dailyClaimedAt) : null;
  const today = new Date();
  const isSameDay = last && last.toDateString() === today.toDateString();
  if (isSameDay) return { ok: false, message: "Сегодня уже получено" };
  s.user.dailyClaimedAt = today.toISOString();
  s.user.points += 10;
  writeStore(clientId, s);
  return { ok: true, points: s.user.points };
}

export function tryActivateProFromPoints(clientId) {
  const s = getStore(clientId);
  if (s.user.points < 1000) return { ok: false, message: "Недостаточно баллов" };
  s.user.points -= 1000;
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  s.user.isPro = true;
  s.user.proUntil = until.toISOString();
  s.user.prefix = "PRO";
  writeStore(clientId, s);
  return { ok: true };
}

export function mockCreateEnotPayment(clientId, { amountRub }) {
  // Mock: emulate payment creation
  const payId = uid();
  return {
    id: payId,
    url: `https://pay.enot.example/mock/${payId}?amount=${amountRub}`,
    status: "pending",
  };
}

export function grantProTrial(clientId) {
  const s = getStore(clientId);
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  s.user.isPro = true;
  s.user.proUntil = until.toISOString();
  s.user.prefix = "PRO";
  writeStore(clientId, s);
  return s.user;
}

export function mapStyles() {
  return [
    { id: "classic", name: "Классическая" },
    { id: "dark", name: "Тёмная (скоро)" },
  ];
}

export function getPending(clientId) {
  return getStore(clientId).pending;
}