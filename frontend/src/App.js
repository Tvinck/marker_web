import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import "./index.css";
import MainLayout from "./layout/MainLayout";
import MapView from "./components/MapView";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { toast } from "./hooks/use-toast";
import { Plus, Check, Star } from "lucide-react";

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
} from "./mock/mock";

function useClientId() {
  const [search] = useSearchParams();
  const clientId = search.get("client_id") || "local_dev";
  return clientId;
}

function MapPage() {
  const clientId = useClientId();
  const [store, setStore] = useState(() => initClient(clientId));
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ dps: true, parking: true, camera: true });

  const markers = useMemo(() => {
    const all = getMarkers(clientId);
    return all.filter((m) => filter[m.type]);
  }, [clientId, filter, store]);

  const onAddAt = (coords) => {
    setSelected({ mode: "new", coords });
  };

  const onSubmitNew = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get("type");
    const title = fd.get("title");
    const description = fd.get("description");
    const coords = selected.coords;
    addMarker(clientId, { type, title, description, location: coords });
    setSelected(null);
    setAdding(false);
    setStore({ ...getStore(clientId) });
    toast({ title: "Отправлено на модерацию", description: "Метка появится после подтверждения" });
  };

  const onConfirm = (id) => {
    confirmMarker(clientId, id);
    setStore({ ...getStore(clientId) });
  };

  const onComment = (id, text) => {
    if (!text) return;
    addComment(clientId, id, text);
    setStore({ ...getStore(clientId) });
  };

  const onRate = (id, v) => {
    rateMarker(clientId, id, v);
    setStore({ ...getStore(clientId) });
  };

  return (
    <MainLayout subtitle="Сообщество водителей. Метки, подтверждения и рейтинг.">
      <div className="mb-2 flex items-center gap-2">
        <Button variant={adding ? "default" : "secondary"} size="sm" onClick={() => setAdding((s) => !s)}>
          <Plus className="mr-1" size={16} /> Новая метка
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={filter.dps} onChange={(e) => setFilter((f) => ({ ...f, dps: e.target.checked }))} />ДПС</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={filter.parking} onChange={(e) => setFilter((f) => ({ ...f, parking: e.target.checked }))} />Парковки</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={filter.camera} onChange={(e) => setFilter((f) => ({ ...f, camera: e.target.checked }))} />Камеры</label>
        </div>
      </div>

      <MapView markers={markers} onMarkerClick={setSelected} addingMode={adding} onAddAt={onAddAt} />

      {/* Marker details / new marker form */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.mode === "new" ? "Новая метка" : selected?.title}</SheetTitle>
          </SheetHeader>
          {selected?.mode === "new" ? (
            <form className="space-y-3 py-3" onSubmit={onSubmitNew}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Тип</Label>
                  <Select name="type" defaultValue="dps">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dps">Пост ДПС</SelectItem>
                      <SelectItem value="parking">Парковка</SelectItem>
                      <SelectItem value="camera">Камера</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Заголовок</Label>
                  <Input name="title" placeholder="Например: Проверка документов" required className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea name="description" placeholder="Короткий комментарий" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>Отмена</Button>
                <Button type="submit">Отправить</Button>
              </div>
            </form>
          ) : selected ? (
            <div className="space-y-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">Подтв.: {selected.confirmations}</Badge>
                <Badge variant="secondary">Комментарии: {selected.comments.length}</Badge>
                <Badge variant="secondary">Рейтинг: {selected.ratingsBy.length ? (selected.ratingsBy.reduce((a, r) => a + r.value, 0) / selected.ratingsBy.length).toFixed(1) : "-"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { onConfirm(selected.id); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }}>
                  <Check className="mr-1" size={16} /> Подтвердить
                </Button>

                <div className="ml-auto flex items-center gap-1">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} className={`p-1 ${selected.ratingsBy.find(r => r.value >= v) ? "text-yellow-500" : "text-muted-foreground"}`}
                      onClick={() => { onRate(selected.id, v); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }}
                    >
                      <Star size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Новый комментарий</Label>
                <CommentForm onSubmit={(text) => { onComment(selected.id, text); setSelected({ ...getMarkers(clientId).find(m => m.id === selected.id) }); }} />
              </div>

              <div>
                <Label>Комментарии</Label>
                <div className="mt-2 space-y-2">
                  {selected.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">Пока нет комментариев</p>
                  )}
                  {selected.comments.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.userId === store.user.id ? store.user.name : `Пользователь_${String(c.userId).slice(-4)}`}</span>
                          <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1">{c.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

function CommentForm({ onSubmit }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text);
        setText("");
      }}
      className="mt-1 flex items-center gap-2"
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ваш комментарий" />
      <Button type="submit" disabled={!text}>Отправить</Button>
    </form>
  );
}

function LeaderboardPage() {
  const clientId = useClientId();
  const lb = leaderboard(clientId);
  const isFree = isTop10FreePro(clientId);
  return (
    <MainLayout title="Топ Активности" subtitle="Топ-10 получают PRO бесплатно">
      <div className="space-y-2">
        {lb.map((u, idx) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">{idx + 1}</div>
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">Баллы: {u.score}</div>
                </div>
              </div>
              {idx < 10 && <Badge>FREE PRO</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
      {isFree && (
        <p className="mt-3 text-sm text-emerald-600">Вы в Топ-10 — подписка будет бесплатной!</p>
      )}
    </MainLayout>
  );
}

function ProPage() {
  const clientId = useClientId();
  const s = getStore(clientId);
  const [user, setUser] = useState(s.user);
  const navigate = useNavigate();

  const handleTrial = () => {
    grantProTrial(clientId);
    setUser(getStore(clientId).user);
    toast({ title: "PRO активирован", description: "Пробный месяц подключён (1 ₽) — мок-режим" });
  };

  const handleBuy = () => {
    const payment = mockCreateEnotPayment(clientId, { amountRub: 149 });
    toast({ title: "Создан платёж (мок)", description: payment.url });
  };

  const tryPoints = () => {
    const res = tryActivateProFromPoints(clientId);
    if (!res.ok) toast({ title: "Недостаточно баллов", description: "Нужно 1000 баллов" });
    setUser(getStore(clientId).user);
  };

  return (
    <MainLayout title="PRO" subtitle="Навигатор, стили карты, камеры, парковки онлайн">
      <Card>
        <CardHeader>
          <CardTitle>Ваш статус</CardTitle>
          <CardDescription>
            {user.isPro ? `Активно до ${new Date(user.proUntil).toLocaleDateString()}` : "Обычный аккаунт"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!user.isPro && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTrial}>Пробный месяц — 1 ₽</Button>
              <Button variant="secondary" onClick={handleBuy}>Купить за 149 ₽/мес</Button>
              <Button variant="outline" onClick={tryPoints}>Активировать за 1000 баллов</Button>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            PRO даёт: смена стиля карты, бесплатные парковки и онлайн-камеры, камеры ДПС, навигатор и бонусы.
          </div>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Стили карты</CardTitle>
          <CardDescription>Доступно для PRO</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={getStore(clientId).user.settings.mapStyle}>
            <TabsList>
              {mapStyles().map((s) => (
                <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
              ))}
            </TabsList>
            {mapStyles().map((s) => (
              <TabsContent key={s.id} value={s.id}>
                <div className="flex items-center justify-between">
                  <span>Стиль: {s.name}</span>
                  <Button size="sm" onClick={() => {
                    if (!getStore(clientId).user.isPro) return toast({ title: "Только для PRO" });
                    updateUser(clientId, { settings: { ...getStore(clientId).user.settings, mapStyle: s.id } });
                    toast({ title: "Стиль применён" });
                  }}>Применить</Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

function ProfilePage() {
  const clientId = useClientId();
  const [user, setUser] = useState(getStore(clientId).user);

  const claim = () => {
    const res = claimDaily(clientId);
    if (res.ok) toast({ title: "+10 баллов начислено" });
    else toast({ title: res.message });
    setUser(getStore(clientId).user);
  };

  return (
    <MainLayout title="Профиль">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">{user.name} {user.isPro && <Badge className="ml-2">PRO</Badge>}</div>
              <div className="text-sm text-muted-foreground">Баллы: {user.points}</div>
            </div>
            <Button variant="secondary" onClick={claim}>Ежедневная награда</Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

function AdminPage() {
  const clientId = useClientId();
  const [pending, setPending] = useState(getPending(clientId));

  const act = (id, ok) => {
    adminApprove(clientId, id, ok);
    setPending(getPending(clientId));
    toast({ title: ok ? "Метка одобрена" : "Отклонено" });
  };

  return (
    <MainLayout title="Модерация">
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет новых меток</p>
      ) : (
        <div className="space-y-2">
          {pending.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-base">{m.title}</CardTitle>
                <CardDescription>{m.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => act(m.id, true)}>Одобрить</Button>
                <Button variant="secondary" onClick={() => act(m.id, false)}>Отклонить</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}

function AdvertisePage() {
  const clientId = useClientId();
  return (
    <MainLayout title="Реклама" subtitle="Оставьте заявку на сотрудничество">
      <Card>
        <CardContent className="p-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              toast({ title: "Заявка отправлена (мок)", description: "Мы свяжемся с вами" });
              e.currentTarget.reset();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Компания</Label>
                <Input required placeholder="ООО Реклама" />
              </div>
              <div>
                <Label>Телефон/Telegram</Label>
                <Input required placeholder="@username" />
              </div>
            </div>
            <div>
              <Label>Комментарий</Label>
              <Textarea placeholder="Опишите задачу" />
            </div>
            <Button type="submit">Отправить</Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-4 text-xs text-muted-foreground">Оплата и интеграции будут реализованы через ENOT после подключения бэкенда.</div>
    </MainLayout>
  );
}

function RouterApp() {
  // On first load ensure local store exists
  const clientId = useClientId();
  useEffect(() => {
    initClient(clientId);
  }, [clientId]);

  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/pro" element={<ProPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/advertise" element={<AdvertisePage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouterApp />
    </BrowserRouter>
  );
}