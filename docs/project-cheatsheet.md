# Шпаргалка по проекту X5 NutriScan (Frontend)

Этот документ нужен, чтобы быстро понять:
- что делает приложение;
- где в коде лежит каждая важная часть;
- как реально работает сканирование через SDK;
- какие API вызываются и в каком порядке;
- где проверять спорные моменты (например, "сканирование не работает" / "создаются новые id").

---

## 1) Технологический стек

- `React + Vite`
- `react-router-dom` (маршрутизация)
- `@biosensesignal/web-sdk` (SDK сканирования)
- REST API через `fetch` (файл `src/api/client.js`)
- Локальное хранение через `localStorage` / `sessionStorage` (разные утилиты в `src/utils`)

---

## 2) Точка входа и общий каркас

- Вход: `src/main.jsx`
- Глобальная композиция приложения: `src/App.jsx`
- Shell с прокруткой и сбросом scroll при переходах: `src/layout/MobileAppShell.jsx`

В `App.jsx` подключены:
- провайдеры `AuthProvider` и `UserDataProvider`;
- guard-логика (доступ к экранам, deep-link, resume);
- трекер событий `StatEventTracker`;
- роуты страниц.

---

## 3) Главные роуты (куда смотреть)

- `/welcome` — выбор целей и согласие (`src/pages/Welcome.jsx`)
- `/priority` — приоритет (`src/pages/PrioritySelection.jsx`)
- `/algorithm-settings` — пол/возраст/рост/вес/курение (`src/pages/AlgorithmSettings.jsx`)
- `/allergies` — исключения продуктов (`src/pages/Allergies.jsx`)
- `/preparation` — подготовка к сканированию (`src/pages/Preparation.jsx`)
- `/camera` — экран сканирования + SDK (`src/pages/Camera.jsx`)
- `/results` — результаты скана (`src/pages/Results.jsx`)
- `/nutrition` — рацион (`src/pages/NutritionPlan.jsx`)
- `/cart` — корзина / скачивание / шаринг (`src/pages/Cart.jsx`)
- `/nutrition-report` — публичный рацион по ссылке (`src/pages/NutritionReportPage.jsx`)

---

## 4) Авторизация и user id (самое важное для интеграций)

### Где логин
- `AuthInit` в `src/App.jsx`
- `AuthContext` в `src/contexts/AuthContext.jsx`
- API-метод: `postAuthLogin()` в `src/api/client.js`

### Что отправляется в `/auth/login`
- `id` и `utm` (из query и/или из localStorage по текущим правилам)
- токен из ответа сохраняется в `x5_auth_token`
- `user.id` из ответа сохраняется в `x5_user_id`

### Deep link / UTM логика
- утилиты: `src/utils/deepLinkUtm.js`
- синхронизация UTM по роутам: `UtmQuerySync` в `src/App.jsx`
- редирект нового пользователя на лендинг: `AuthInit` в `src/App.jsx`

---

## 5) Как работает сканирование (SDK) — пошагово

Ключевой файл: `src/pages/Camera.jsx`

### 5.1 Инициализация SDK
- импорт SDK: `@biosensesignal/web-sdk`
- конфиг: `src/config/sdkConfig.js`
  - `VITE_BIOSENSESIGNAL_LICENSE_KEY`
  - `VITE_BIOSENSESIGNAL_PRODUCT_ID`
- вызов `healthMonitorManager.initialize(...)`

### 5.2 Доступ к камере
- `getUserMedia` + привязка stream к `<video>`
- проверки permission/браузера/окружения

### 5.3 Жизненный цикл измерения
- `onStateChange` — состояние сессии SDK
- `onVitalSign` — промежуточные сигналы (важно: признак, что обработка кадров реально идёт)
- `onFinalResults` — финальные метрики
- `onError` — обработка ошибок SDK/окружения

### 5.4 Сохранение результата
- в `onFinalResults` формируется payload
- вызов `postScanSaveRppg(token, payload)` (`src/api/client.js`)
- после сохранения переход на `/results` с данными в `state`

Итого: цепочка "камера -> SDK callbacks -> финальный результат -> save на backend -> results" полностью реализована в `Camera.jsx`.

---

## 6) Экран результатов и генерация рациона

Ключевой файл: `src/pages/Results.jsx`

Что делает:
- подтягивает последний scan через `getScanHistory`
- нормализует transcripts и health score
- рендерит карточки метрик
- показывает модалки для неполных/нулевых результатов
- опрашивает статус генерации рациона через `getRationGenerationStatus`
- включает CTA на рацион, когда статус готов (`Completed`)

Дополнительно:
- в UI есть прогресс генерации кнопки рациона (до 90%, ожидание, затем 100%)
- фиксированный нижний блок с кнопками и дисклеймером стилизуется в `src/pages/Results.css`

---

## 7) Рацион, исключения, замены

### Рацион
- `src/pages/NutritionPlan.jsx`
- загрузка через `getRationByScan` / `getRationById`
- polling статуса генерации
- замена блюда через `postRationItemReplace`
- возможна перегенерация через `postRationRegenerate`

### Исключения
- `src/pages/Allergies.jsx`
- `getExcludeProducts`, `getExcludeProductsForUser`, `postExcludeProducts`
- при возврате из экрана исключений в рацион может автоматически запускаться регенерация

---

## 8) API-слой (единая точка)

Файл: `src/api/client.js`

Основные группы:
- auth: `/auth/login`
- user: `/user/me`, `/user/update`, `/user/feedback`
- exclude-products
- scan: сохранение rPPG
- ration: получение, generation-status, regenerate, replace
- app telemetry: `/app/stat-event`, `/app/save-log`

Важно:
- есть дедупликация in-flight запросов (`withInFlightDedupe`)
- есть стартовый timeout для login

---

## 9) Кэши и user-scoped storage

Ключевые утилиты:
- `src/utils/storageUserScope.js` — ключ user id
- `src/utils/scanResultCache.js` — кэш последнего scan envelope (на user)
- `src/utils/rationDisplayCache.js` — кэш рациона (на user)
- `src/utils/lastScanId.js` — последний scan id (на user)
- `src/utils/lastRationIdStorage.js` — последний ration id (на user)
- `src/utils/rationRegenPollStorage.js` — флаг poll после регенерации

---

## 10) Где искать "доказательства" что сканирование реально работает

### В коде
- `src/pages/Camera.jsx`:
  - `onVitalSign`
  - `onFinalResults`
  - `postScanSaveRppg(...)`
  - `navigate('/results', ...)`

### В Network (DevTools)
- `POST /auth/login`
- `POST /scan/save-rppg` (или эквивалент по бэкенду)
- `GET /scan/get` (при загрузке результатов)
- `GET /ration/scan/{id}/generation-status` (poll рациона)

### В логах фронта
- `src/utils/logger.js`
- в dev включены дополнительные `console.log` в auth/sdk местах

---

## 11) Частые спорные вопросы и где смотреть

### "Почему создался новый пользователь?"
- `AuthInit` в `src/App.jsx` (что ушло в `id/utm`)
- ответ `/auth/login` (какой `user.id` вернулся)
- соответствие окружений (prod/stage/dev)

### "Почему не тот UTM?"
- `UtmQuerySync` в `src/App.jsx`
- `deepLinkUtm` parsing в `AuthInit`
- `src/utils/deepLinkUtm.js`
- формирование ссылок в `src/pages/Cart.jsx`

### "Почему не запускается скан?"
- `Camera.jsx` -> `getFriendlyCameraError`
- коды SDK (карты алертов)
- license/productId/env в `src/config/sdkConfig.js`

---

## 12) Быстрый маршрут по коду для нового разработчика

1. `src/App.jsx` — понять роуты, auth-init, utm/deeplink.
2. `src/contexts/AuthContext.jsx` и `src/contexts/UserDataContext.jsx` — состояние.
3. `src/api/client.js` — все backend контракты.
4. `src/pages/Camera.jsx` — ядро SDK-интеграции.
5. `src/pages/Results.jsx` — агрегатор результата и вход в рацион.
6. `src/pages/NutritionPlan.jsx` и `src/pages/Allergies.jsx` — рацион и исключения.
7. `src/pages/Cart.jsx` и `src/pages/NutritionReportPage.jsx` — шаринг и публичный отчет.

---

## 13) Что можно улучшить дальше (по желанию)

- Вынести deep-link/auth-flow в отдельный модуль с unit-тестами.
- Добавить интеграционные e2e-сценарии:
  - новый пользователь с ref-link;
  - share-ration ссылка;
  - отказ камеры/ошибки SDK.
- Добавить отдельный markdown по API-контрактам с примерами payload/response.

