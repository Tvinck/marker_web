import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import "./index.css";
import MainLayout from "./layout/MainLayout";
import MapView from "./components/MapView";
import Gallery from "./components/Gallery";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { toast } from "./hooks/use-toast";
import { Plus, Check, Star, Sun, Moon, Crown, MapPin, MessageSquare, ThumbsUp, Upload } from "lucide-react";
import { useTheme } from "./hooks/useTheme";

import {
  initClient,
  getStore,
  getMarkers,
  addMarker,
  confirmMarker,
  addComment,
  rateMarker,
  leaderboard,
  mapStyles,
  updateUser,
  claimDaily,
  tryActivateProFromPoints,
  grantProTrial,
  isTop10FreePro,
  getPending,
  adminApprove,
  mockCreateEnotPayment,
  isAdmin,
  myMarkers,
} from "./mock/mock";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function useClientId() {
  const [search] = useSearchParams();
  const clientId = search.get("client_id") || "local_dev";
  return clientId;
}

const TYPE_LIST = [
  { id: "dps", label: "ДПС" },
  { id: "camera", label: "Камера" },
  { id: "parking", label: "Парковка" },
  { id: "fire", label: "Пожар" },
  { id: "ambulance", label: "Скорая" },
  { id: "post", label: "Пост" },
  { id: "repair", label: "Ремонт" },
  { id: "accident", label: "Авария" },
  { id: "bump", label: "Неровность" },
  { id: "traffic", label: "Затор" },
];

async function filesToMedia(fileList) {
  const files = Array.from(fileList || []);
  const reads = files.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ type: file.type.startsWith("video") ? file.type : "image", url: reader.result });
        reader.readAsDataURL(file);
      }),
  );
  return Promise.all(reads);
}

function MapPage() {
  const clientId = useClientId();
  const [store, setStore] = useState(() => initClient(clientId));
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState(() => Object.fromEntries(TYPE_LIST.map(t => [t.id, true])));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newType, setNewType] = useState("dps");
  const [mediaFiles, setMediaFiles] = useState([]);

  useEffect(() => {
    const k = `marker_onboarded_v1_${clientId}`;
    if (!localStorage.getItem(k)) { setShowOnboarding(true); localStorage.setItem(k, "1"); }
  }, [clientId]);

  const styleId = getStore(clientId).user.settings.mapStyle;

  const markers = useMemo(() => {
    const all = getMarkers(clientId);
    return all.filter((m) => filter[m.type]);
  }, [clientId, filter, store]);

  const onAddAt = (coords) => { setSelected({ mode: "new", coords }); };

  const onSubmitNew = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get("type"); const title = fd.get("title"); const description = fd.get("description");
    const media = await filesToMedia(mediaFiles);
    addMarker(clientId, { type, title, description, location: selected.coords, media });
    setSelected(null); setAdding(false); setMediaFiles([]); setStore({ ...getStore(clientId) });
    toast({ title: "Отправлено на модерацию", description: "Метка появится после подтверждения (+5 баллов)" });
  };

  const onConfirm = (id) => { confirmMarker(clientId, id); setStore({ ...getStore(clientId) }); toast({ title: "+2 балла за подтверждение" }); };
  const onComment = (id, text) => { if (!text) return; addComment(clientId, id, text); setStore({ ...getStore(clientId) }); toast({ title: "+1 балл за комментарий" }); };
  const onRate = (id, v) => { rateMarker(clientId, id, v); setStore({ ...getStore(clientId) }); toast({ title: "+1 балл за оценку" }); };

  return (
    <MainLayout subtitle="Сообщество водителей. Метки, подтверждения и рейтинг.">
      <div className="mb-2 flex items-center gap-2">
        <Button variant={adding ? "default" : "secondary"} size="sm" onClick={() => setAdding((s) => !s)}>
          <Plus className="mr-1" size={16} /> Новая метка
        </Button>
        <div className="ml-auto flex items-center gap-3 overflow-x-auto text-xs">
          {TYPE_LIST.map((t) => (
            <label key={t.id} className="flex min-w-max items-center gap-1">
              <input type="checkbox" checked={!!filter[t.id]} onChange={(e) => setFilter((f) => ({ ...f, [t.id]: e.target.checked }))} />{t.label}
            </label>
          ))}
        </div>
      </div>

      <MapView markers={markers} onMarkerClick={setSelected} addingMode={adding} onAddAt={onAddAt} styleId={styleId} />

      {/* Floating Add Marker Button */}
      <div className="fixed bottom-[180px] left-1/2 z-30 -translate-x-1/2">
        <Button
          onClick={() => {
            setAdding(true);
            toast({ title: "Режим добавления", description: "Тапните по карте, чтобы поставить метку" });
          }}
          className="rounded-full h-12 px-6 shadow-lg"
        >
          <Plus className="mr-2" size={18} /> Добавить метку
        </Button>
      </div>

      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Добро пожаловать в Маркер</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-card"><CardHeader className="p-3"><div className="flex items-center gap-2 text-primary"><MapPin size={18}/><span className="font-medium">Метки</span></div></CardHeader><CardContent className="p-3 text-sm text-muted-foreground">Добавляйте точки на карту (тап по карте), прикрепляйте фото/видео.</CardContent></Card>
            <Card className="bg-card"><CardHeader className="p-3"><div className="flex items-center gap-2 text-primary"><ThumbsUp size={18}/><span className="font-medium">Подтверждайте</span></div></CardHeader><CardContent className="p-3 text-sm text-muted-foreground">Подтверждайте актуальные метки — помогайте другим.</CardContent></Card>
            <Card className="bg-card"><CardHeader className="p-3"><div className="flex items-center gap-2 text-primary"><MessageSquare size={18}/><span className="font-medium">Комментируйте</span></div></CardHeader><CardContent className="p-3 text-sm text-muted-foreground">Оставляйте комментарии и зарабатывайте баллы.</CardContent></Card>
          </div>
          <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">Топ‑10 получают PRO бесплатно.</div>
          <div className="flex justify-end"><Button onClick={() => setShowOnboarding(false)}>Начать</Button></div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{selected?.mode === "new" ? "Новая метка" : selected?.title}</SheetTitle></SheetHeader>
          {selected?.mode === "new" ? (
            <form className="space-y-3 py-3" onSubmit={onSubmitNew}>
              <input type="hidden" name="type" value={newType} />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Тип</Label><Select value={newType} onValueChange={setNewType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TYPE_LIST.map(t => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent></Select></div>
                <div><Label>Заголовок</Label><Input name="title" placeholder="Например: Проверка документов" required className="mt-1" /></div>
              </div>
              <div><Label>Описание</Label><Textarea name="description" placeholder="Короткий комментарий" className="mt-1" /></div>
              <div>
                <Label className="flex items-center gap-2"><Upload size={16}/> Фото/Видео</Label>
                <input className="mt-1 w-full text-sm" type="file" multiple accept="image/*,video/*" onChange={(e)=>setMediaFiles(e.target.files)} />
                {mediaFiles?.length ? <p className="mt-1 text-xs text-muted-foreground">Файлов: {mediaFiles.length}</p> : null}
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Отмена</Button><Button type="submit">Отправить</Button></div>
            </form>
          ) : selected ? (
            <div className="space-y-4 py-3">
              <Gallery items={selected.media} />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">Подтв.: {selected.confirmations}</Badge>
                <Badge variant="secondary">Комментарии: {selected.comments.length}</Badge>
                <Badge variant="secondary">Рейтинг: {selected.ratingsBy.length ? (selected.ratingsBy.reduce((a, r) => a + r.value, 0) / selected.ratingsBy.length).toFixed(1) : "-"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { onConfirm(selected.id); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }}><Check className="mr-1" size={16} /> Подтвердить</Button>
                <div className="ml-auto flex items-center gap-1">{[1,2,3,4,5].map(v => (<button key={v} className={`p-1 ${selected.ratingsBy.find(r => r.value >= v) ? "text-yellow-500" : "text-muted-foreground"}`} onClick={() => { onRate(selected.id, v); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }}><Star size={18} /></button>))}</div>
              </div>
              <div><Label>Новый комментарий</Label><CommentForm onSubmit={(text) => { onComment(selected.id, text); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }} /></div>
              <div><Label>Комментарии</Label><div className="mt-2 space-y-2">{selected.comments.length === 0 && (<p className="text-sm text-muted-foreground">Пока нет комментариев</p>)}{selected.comments.map((c) => (<Card key={c.id}><CardContent className="p-3 text-sm"><div className="flex items-center justify-between"><span className="font-medium">{c.userId === store.user.id ? store.user.name : `Пользователь_${String(c.userId).slice(-4)}`}</span><span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span></div><p className="mt-1">{c.text}</p></CardContent></Card>))}</div></div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

function CommentForm({ onSubmit }) { const [text, setText] = useState(""); return (<form onSubmit={(e) => { e.preventDefault(); onSubmit(text); setText(""); }} className="mt-1 flex items-center gap-2"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ваш комментарий" /><Button type="submit" disabled={!text}>Отправить</Button></form>); }

function LeaderboardPage() { const clientId = useClientId(); const lb = leaderboard(clientId); const isFree = isTop10FreePro(clientId); return (<MainLayout title="Топ Активности" subtitle="Топ-10 получают PRO бесплатно"><div className="space-y-2">{lb.map((u, idx) => (<Card key={u.id}><CardContent className="flex items-center justify-between p-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">{idx + 1}</div><div><div className="text-sm font-medium">{u.name}</div><div className="text-xs text-muted-foreground">Баллы: {u.score}</div></div></div>{idx < 10 && <Badge>FREE PRO</Badge>}</CardContent></Card>))}</div>{isFree && (<p className="mt-3 text-sm text-emerald-600">Вы в Топ-10 — подписка будет бесплатной!</p>)}</MainLayout>); }

function ProPage() {
  const clientId = useClientId();
  const s = getStore(clientId);
  const [user, setUser] = useState(s.user);

  const handleTrial = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/create?client_id=${clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "trial" }) });
      if (res.ok) { const data = await res.json(); window.open(data.paymentUrl || data.url, "_blank"); return; }
    } catch {}
    grantProTrial(clientId);
    setUser(getStore(clientId).user);
    toast({ title: "PRO активирован (мок)", description: "Пробный месяц подключён" });
  };

  const handleBuy = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/create?client_id=${clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "monthly" }) });
      if (res.ok) { const data = await res.json(); window.open(data.paymentUrl || data.url, "_blank"); return; }
    } catch {}
    const payment = mockCreateEnotPayment(clientId, { amountRub: 149 });
    toast({ title: "Создан платёж (мок)", description: payment.url });
  };

  const tryPoints = () => { const res = tryActivateProFromPoints(clientId); if (!res.ok) toast({ title: "Недостаточно баллов", description: "Нужно 1000 баллов" }); setUser(getStore(clientId).user); };

  return (
    <MainLayout title="PRO" subtitle="Навигатор, стили карты, камеры, парковки онлайн">
      <Card><CardHeader><CardTitle>Ваш статус</CardTitle><CardDescription>{user.isPro ? `Активно до ${new Date(user.proUntil).toLocaleDateString()}` : "Обычный аккаунт"}</CardDescription></CardHeader><CardContent className="space-y-3">{!user.isPro && (<div className="flex flex-wrap gap-2"><Button onClick={handleTrial}>Пробный месяц — 1 ₽</Button><Button variant="secondary" onClick={handleBuy}>Купить за 149 ₽/мес</Button><Button variant="outline" onClick={tryPoints}>Активировать за 1000 баллов</Button></div>)}<div className="text-sm text-muted-foreground">PRO даёт: смена стиля карты, бесплатные парковки и онлайн-камеры, камеры ДПС, навигатор и бонусы.</div></CardContent></Card>
      <Card className="mt-3"><CardHeader><CardTitle>Стили карты</CardTitle><CardDescription>Доступно для PRO</CardDescription></CardHeader><CardContent><Tabs defaultValue={getStore(clientId).user.settings.mapStyle}><TabsList>{mapStyles().map((s) => (<TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>))}</TabsList>{mapStyles().map((s) => (<TabsContent key={s.id} value={s.id}><div className="flex items-center justify-between"><span>Стиль: {s.name}</span><Button size="sm" onClick={() => { if (!getStore(clientId).user.isPro) return toast({ title: "Только для PRO" }); updateUser(clientId, { settings: { ...getStore(clientId).user.settings, mapStyle: s.id } }); toast({ title: "Стиль применён" }); }}>Применить</Button></div></TabsContent>))}</Tabs></CardContent></Card>
    </MainLayout>
  );
}

function ProfilePage() {
  const clientId = useClientId();
  const [user, setUser] = useState(getStore(clientId).user);
  const { theme, toggle } = useTheme();
  const [mine, setMine] = useState(myMarkers(clientId));

  const claim = () => { const res = claimDaily(clientId); if (res.ok) toast({ title: "+10 баллов начислено" }); else toast({ title: res.message }); setUser(getStore(clientId).user); };

  useEffect(()=>{ setMine(myMarkers(clientId)); }, [user]);

  return (
    <MainLayout title="Профиль">
      <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-base font-semibold">{user.name} {user.isPro && <Badge className="ml-2">PRO</Badge>}</div><div className="text-sm text-muted-foreground">Баллы: {user.points}</div></div><div className="flex items-center gap-2"><Button variant="secondary" onClick={claim}>Ежедневная награда</Button><Button variant="outline" onClick={toggle} aria-label="Сменить тему">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</Button></div></div></CardContent></Card>

      <Card className="mt-3"><CardHeader><CardTitle>Мои метки</CardTitle><CardDescription>Активные и ожидающие модерации</CardDescription></CardHeader><CardContent className="space-y-3">
        {mine.pending.map(m => (<Card key={m.id}><CardContent className="p-3"><div className="flex items-center justify-between"><div><div className="font-medium">{m.title}</div><div className="text-xs text-muted-foreground">Статус: на модерации</div></div><Badge variant="secondary">{m.type}</Badge></div><div className="mt-2"><Gallery items={m.media} /></div></CardContent></Card>))}
        {mine.active.map(m => (<Card key={m.id}><CardContent className="p-3"><div className="flex items-center justify-between"><div><div className="font-medium">{m.title}</div><div className="text-xs text-muted-foreground">Подтв.: {m.confirmations} • Комментарии: {m.comments.length}</div></div><Badge>{m.type}</Badge></div><div className="mt-2"><Gallery items={m.media} /></div></CardContent></Card>))}
        {mine.pending.length === 0 && mine.active.length === 0 && (<p className="text-sm text-muted-foreground">Вы ещё не добавили ни одной метки</p>)}
      </CardContent></Card>
    </MainLayout>
  );
}

function AdminPage() { const clientId = useClientId(); const [pending, setPending] = useState(getPending(clientId)); if (!isAdmin(clientId)) { return (<MainLayout title="Модерация"><p className="text-sm text-muted-foreground">Доступ запрещён. Вы не администратор.</p></MainLayout>); } const act = (id, ok) => { adminApprove(clientId, id, ok); setPending(getPending(clientId)); toast({ title: ok ? "Метка одобрена" : "Отклонено" }); }; return (<MainLayout title="Модерация">{pending.length === 0 ? (<p className="text-sm text-muted-foreground">Нет новых меток</p>) : (<div className="space-y-2">{pending.map((m) => (<Card key={m.id}><CardHeader><CardTitle className="text-base">{m.title}</CardTitle><CardDescription>{m.description}</CardDescription></CardHeader><CardContent className="space-y-2"><Gallery items={m.media} /><div className="flex gap-2"><Button onClick={() => act(m.id, true)}>Одобрить</Button><Button variant="secondary" onClick={() => act(m.id, false)}>Отклонить</Button></CardContent></Card>))}</div>)}</MainLayout>); }

function AdvertisePage() { return (<MainLayout title="Реклама" subtitle="Оставьте заявку на сотрудничество"><Card><CardContent className="p-4"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); toast({ title: "Заявка отправлена (мок)", description: "Мы свяжемся с вами" }); e.currentTarget.reset(); }}><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><Label>Компания</Label><Input required placeholder="ООО Реклама" /></div><div><Label>Телефон/Telegram</Label><Input required placeholder="@username" /></div></div><div><Label>Комментарий</Label><Textarea placeholder="Опишите задачу" /></div><Button type="submit">Отправить</Button></form></CardContent></Card><div className="mt-4 text-xs text-muted-foreground">Оплата и интеграции будут реализованы через ENOT после подключения бэкенда.</div></MainLayout>); }

function RouterApp() { const clientId = useClientId(); useEffect(() => { initClient(clientId); }, [clientId]); return (<Routes><Route path="/" element={<MapPage />} /><Route path="/leaderboard" element={<LeaderboardPage />} /><Route path="/pro" element={<ProPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/advertise" element={<AdvertisePage />} /></Routes>); }

export default function App() { return (<BrowserRouter><RouterApp /></BrowserRouter>); }