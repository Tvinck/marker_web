# Маркер — API Contracts (FastAPI + MongoDB)

Статус: Этап 1. Фронтенд — MOCK. Это спецификация того, что будет реализовано в бэкенде. Все эндпоинты — с префиксом /api.

Идентификация: по client_id, получаемому из URL (от бота). Пользователь создаётся лениво при первом обращении.

## 1. Модели (MongoDB)
- users (id = client_id: string)
  - id, name, avatarUrl, role: 'user'|'admin' (admin: список client_id, начально ['12345'])
  - isPro: bool, proUntil: datetime|null, prefix: string|null
  - points: int (по умолчанию 50)
  - dailyClaimedAt: datetime|null
  - settings: { mapStyle: 'classic'|'dark' }
  - createdAt, updatedAt

- markers
  - id (uuid), type: enum['dps','camera','parking','fire','ambulance','post','repair','accident','bump','traffic']
  - title, description, location { lng:number, lat:number }
  - createdAt, createdBy (userId)
  - status: 'pending'|'active'|'rejected'
  - confirmations: int, confirmationsBy: [userId]

- comments
  - id (uuid), markerId, userId, text, createdAt

- ratings
  - id (uuid), markerId, userId(unique per marker), value (1..5), createdAt

- activities (аудит баллов)
  - id (uuid), userId, type: 'create_marker'|'confirm'|'comment'|'rate'|'daily'
  - points: int, createdAt, meta: any

- subscriptions
  - id (uuid), userId, status: 'active'|'expired', type: 'trial'|'paid'|'free_top'
  - startAt, endAt, source: 'enot'|'points'|'top10'
  - priceRub: number|null, createdAt, updatedAt

- payments
  - id (uuid), userId, provider: 'enot', externalId, amountRub, status: 'created'|'pending'|'success'|'fail'
  - linkUrl, createdAt, updatedAt, meta

- ad_requests
  - id (uuid), clientId, company, contact, comment, createdAt

## 2. Правила начисления баллов
- create_marker: +5
- confirm: +2
- comment: +1
- rate: +1 (только первый рейтинг пользователя по метке)
- daily: +10
- PRO за 1000 баллов (1 месяц). Топ‑10 получают PRO бесплатно, пока в топе.

## 3. Эндпоинты (все под /api)

### Users
- GET /api/users/me?client_id=... → { user }
  - Автосоздание пользователя. role устанавливается на 'admin' если client_id входит в ALLOWED_ADMINS (env/конфиг).
- POST /api/users/daily-claim?client_id=... → { ok, points, dailyClaimedAt }

### Markers
- GET /api/markers?client_id=...&types=dps,camera,... → [{ marker }]
- GET /api/markers/{id}?client_id=... → { marker, comments, ratingAvg, myRating }
- POST /api/markers?client_id=... body: { type, title, description, location } → { marker } (status=pending)
- POST /api/markers/{id}/confirm?client_id=... → { marker }
- POST /api/markers/{id}/comment?client_id=... body: { text } → { comment }
- POST /api/markers/{id}/rate?client_id=... body: { value:1..5 } → { rating }

### Leaderboard
- GET /api/leaderboard?client_id=... → [{ id, name, score }] (top 20)

### Admin (только role=admin)
- GET /api/admin/pending?client_id=... → [{ marker }]
- POST /api/admin/markers/{id}/approve?client_id=... → { ok }
- POST /api/admin/markers/{id}/reject?client_id=... → { ok }

### PRO / Points
- POST /api/pro/activate-from-points?client_id=... → { ok, user }
- GET  /api/subscriptions/me?client_id=... → { isPro, proUntil, type }

### Payments (ENOT)
- POST /api/payments/create?client_id=... body: { plan: 'trial'|'monthly' }
  - trial → amount=1 RUB, monthly → amount=149 RUB
  - ответ: { paymentUrl, paymentId }
- POST /api/payments/enot/webhook  (ENOT callback)
  - При статусах: created/pending/success/fail — обновляем платеж, подписку и начисляем/продлеваем PRO.
  - Также отправляем callback-уведомления в Salebot API (см. ниже).

## 4. Интеграция ENOT (через requests)
Переменные окружения (backend/.env):
- ENOT_SHOP_ID=
- ENOT_SECRET=
- ENOT_EXTRA_KEY=
- ENOT_USER_ID=
- ENOT_API_KEY=
- ENOT_BAZZAR_API_KEY=
- ENOT_WEBHOOK_SECRET= (если требуется подпись)
- ENOT_SUCCESS_URL= (например, https://ваш-домен/pro?status=success)
- ENOT_FAIL_URL= (например, https://ваш-домен/pro?status=fail)
- SALEBOT_SUCCESS_API=https://chatter.salebot.pro/api/1616106385e376e80fd856318a4c64da/callback?client_id=#{client_id}&message=/success_url_marker
- SALEBOT_WAIT_API=https://chatter.salebot.pro/api/1616106385e376e80fd856318a4c64da/callback?client_id=#{client_id}&message=/wait_url_api_marker
- SALEBOT_FAIL_API=https://chatter.salebot.pro/api/1616106385e376e80fd856318a4c64da/callback?client_id=#{client_id}&message=/fail_url_api_marker

Создание платежа: backend обращается к API ENOT (endpoint создания счёта/ссылки на оплату), передаёт amount, order_id (uuid), success_url, fail_url, callback_url: https://<домен>/api/payments/enot/webhook.

Webhook обработчик:
- Валидация подписи (если ENOT присылает хеш)
- По статусу:
  - pending/created → обновить payment.status, вызвать SALEBOT_WAIT_API (подставив client_id)
  - success → payment.status=success, создать/обновить subscription(type: 'trial' или 'paid', на 1 месяц), user.isPro=true, proUntil=now+1 мес; вызвать SALEBOT_SUCCESS_API
  - fail → payment.status=fail; вызвать SALEBOT_FAIL_API

## 5. Что сейчас мокируется во фронтенде (mock.js)
- Пользователь/очки/подписка (isPro/proUntil)
- Метки/подтверждения/комментарии/рейтинги
- Топ/баллы/ежедневная награда
- Админ-модерация (локальная)
- Платёж ENOT — создаётся мок‑ссылка (без реальной оплаты)

После реализации бэкенда фронтенд перейдёт на реальные эндпоинты и mock.js будет удалён.

## 6. Интеграция фронтенд ↔ бэкенд
- Все запросы из фронта идут на `${process.env.REACT_APP_BACKEND_URL}/api/...` (без хардкода URL)
- Передача client_id во всех запросах как query‑параметр
- Замена моков: функции из mock.js будут заменены на axios‑запросы по контрактам выше.

## 7. Нехитрые детали реализации
- Индексы: markers(status, type), comments(markerId), ratings(markerId, userId unique)
- Безопасность: базовая валидация типов через Pydantic, rate limit простыми средствами (по необходимости)
- Правило TOP10: cron/периодический пересчёт не обязателен — считаем «на лету» при запросах; free_top подписка не создаётся, статус FREE даём вычислительно.

## 8. Тестирование
- deep_testing_backend_v2: CRUD для всех сущностей, happy/edge cases, ENOT webhook симуляция (подпись — заглушка/фиктивная в тесте)
- После бек-тестов: ручная проверка фронта и (по вашему желанию) авто‑тесты playwright.