BiosenseSignal Web SDK — интеграция в React (Vite) проект

Документ описывает, что нужно для стабильной интеграции BiosenseSignal Web SDK: требования, установка, лицензия, жизненный цикл сессии, данные пользователя, камера, обработка ошибок/предупреждений и получение результатов.

Версия документации: Web SDK v5.11 (портал “latest”).

1) Общая схема приложения

Поток UX

Пользователь вводит:

Пол (Sex: MALE/FEMALE/UNSPECIFIED)

Возраст (Age, years)

Рост (Height, cm)

Вес (Weight, kg)

Курит/нет (SmokingStatus: SMOKER/NON_SMOKER/UNSPECIFIED)

Открывается экран камеры (video preview).

Создаётся Face Session (сессия измерения по лицу).

Ждём SessionState.ACTIVE → запускаем измерение (start()).

Во время измерения получаем instant показатели (пульс/дыхание).

По завершении получаем final results (полный набор доступных показателей + confidence).

Показываем результат, завершаем/терминируем сессию.

2) Системные требования (важно для QA)
Android / Chrome

Рекомендуемый Geekbench 6 single-core: 500+ (минимально поддерживается 300+)

RAM: минимум 3 GB

Камера: 15 FPS и 640×480

Браузер: Chrome 113+

iOS / Safari

iOS: 16.7+ (некоторые индикаторы только на Android и iPhone с iOS 17+)

Safari/iOS: требуется iOS 16.6+

Поддерживаемые iPhone: iPhone XS и новее

Поддерживаемые iPad: iPad 6th gen и новее

3) Установка SDK в проект
Как поставляется SDK

SDK приходит как архив от BiosenseSignal (BiosenseSignal_Web_Sample_X.X.X.zip), внутри — пакет .tgz.

Установка пакета

По документации:

распаковать .tgz

положить biosensesignal-web-sdk-vX.X.X-X.tgz в проект

установить через npm/yarn

Важно про ассеты (WASM/worker файлы)

Документация показывает пример для Webpack: копировать @biosensesignal/web-sdk/dist в build.

Для Vite смысл тот же: при сборке/деплое должны быть доступны файлы из @biosensesignal/web-sdk/dist (worker/wasm и т.п.) по URL, откуда SDK их ожидает загрузить.

Рекомендованный подход для Vite:

обеспечить копирование node_modules/@biosensesignal/web-sdk/dist в public/ или в папку билда,

проверить в Network/DevTools, что *.worker.js и *.wasm реально грузятся без 404/blocked.

4) Обязательное требование: COOP/COEP (SharedArrayBuffer)

SDK использует multi-threaded WASM, ему нужен SharedArrayBuffer, а значит сайт должен быть cross-origin isolated.

Нужно выставить заголовки на главный документ:

Cross-Origin-Opener-Policy: same-origin

Cross-Origin-Embedder-Policy: require-corp

И проверить в консоли:

self.crossOriginIsolated === true

Примечания из документации (важные для интеграций):

для ресурсов может понадобиться Cross-Origin-Resource-Policy и/или cors/crossorigin

для iframe с SharedArrayBuffer: allow="cross-origin-isolated" и рекурсивно заголовки для nested iframes/worker scripts

5) Лицензия: как работает и что ломается
Что нужно

Без валидного licenseKey нельзя создать измерительную сессию/активировать пользователя.

Ключ нужно защищать и не светить третьим лицам.

Sessions License (квота измерений)

При start() SDK списывает одно измерение с сервера лицензий.

Если квота закончилась — измерение будет прервано, придёт ошибка, сессия вернётся через STOPPING обратно в ACTIVE.

Сервер лицензий и регионы

SDK обращается к licensing-api.biosensesignal.com (через Cloudflare). В некоторых регионах может быть недоступно — у них есть workaround через саппорт.

Ошибка 2007 (domain: 2000)

По официальному списку Alerts:

LICENSE_CODE_INVALID_LICENSE_KEY_ERROR

Code: 2007

Причина: “provided license key is invalid”

Решение: использовать ключ от саппорта / если не помогает — писать в поддержку

Практика из твоего кейса (ngrok): если в UI написано “лицензия не активирована для домена …ngrok…”, то очень вероятно, что ключ привязан к allowlist доменов. Тогда при запуске через ngrok сервер лицензий трактует это как невалидную активацию и ты видишь 2007.

✅ Что делать:

Для dev: попросить саппорт добавить домен *.ngrok-free.app или конкретный поддомен в разрешённые домены лицензии.

Для прод: заранее согласовать список доменов (prod + staging).

6) Данные пользователя (обязательно для ASCVD Risk и Heart Age)

Для расчёта ASCVD Risk и Heart Age SDK требует userInformation. Если не передать — эти показатели не будут рассчитаны.

Состав userInformation:

Sex (UNSPECIFIED / MALE / FEMALE)

Age (years)

Weight (kg)

Height (cm)

SmokingStatus (UNSPECIFIED / SMOKER / NON_SMOKER)

Важно:

Если часть данных неизвестна — передавать известные, остальные оставлять null/UNSPECIFIED.

Если создал сессию с userInformation, то в рамках этой сессии данные неизменны — чтобы обновить, надо создать новую сессию.

7) Сессия измерения: базовый жизненный цикл
Quick Start (общие правила)

Одновременно может существовать только одна сессия. Перед новой — завершить предыдущую.

Сессия рассчитана на одного пользователя. Для другого пользователя — новая сессия (и новый userInformation).

Session State (ключ к стабильности)

Состояния: INIT → ACTIVE → MEASURING → STOPPING → ACTIVE → TERMINATED

Смысл:

INIT: идёт инициализация — нельзя стартовать измерение и дёргать API.

ACTIVE: можно показывать preview, можно start()

MEASURING: идёт вычисление показателей

STOPPING: идёт финальный расчёт, это переходное состояние — не вызывай методы сессии

TERMINATED: можно создавать новую сессию

8) Камера и Preview

Рекомендуется показывать пользователю camera preview, чтобы он правильно центрировал лицо.
Важно: preview рисует браузер на <video>, не SDK.

9) Качество измерения: Image Validity и Guidance
Image Validity

SDK валидирует каждый кадр и сообщает причину, если кадр “не ок”. Примеры причин:

INVALID_DEVICE_ORIENTATION

INVALID_ROI (лицо не найдено)

TILTED_HEAD

UNEVEN_LIGHT
(и т.д.)

Strict Measurement Guidance

Параметр strictMeasurementGuidance:

false (по умолчанию): обрабатывает все кадры, пока лицо найдено

true: обрабатывает только валидные кадры → выше точность, но:

если >0.5 сек идут невалидные кадры — warnings

при повторениях может остановить сессию ошибкой без final results

10) Ориентация устройства

В face-сессии можно задать deviceOrientation (например, LANDSCAPE_LEFT). Если не задать — “легальная” ориентация фиксируется в момент start().

11) Какие результаты и как их получать
Enabled Vital Signs

Внутри сессии есть “карта доступных/включённых показателей”. Её можно получить через onEnabledVitalSigns (часть LicenseInfo).
Это полезно, чтобы:

скрывать недоступные метрики в UI,

не ждать то, что не придёт.

Instantaneous vs Final

SDK отдаёт результаты в двух этапах:

Instantaneous (в процессе измерения): доступны, например:

Pulse Rate

Respiration Rate

Final results (после завершения): полный набор результатов с confidence

Confidence Level

Confidence бывает: LOW / MEDIUM / HIGH / UNKNOWN. В отчётах по точности обычно учитывают только HIGH.

12) Alerts (ошибки и предупреждения) + обязательный UX
Что такое Alerts

Warning: временная/мелкая проблема, измерение продолжается

Error: критическая проблема → измерение завершается

Рекомендация документации:

всегда показывать числовой код в UI (это ускоряет дебаг и общение с саппортом).

Alerts List (полезно для маппинга UI)

Полный список публичных кодов доступен в “Alerts List”, включая license/camera/measurement ошибки.
Там же указано, что есть alerts.json для скачивания (можно положить в проект и использовать как справочник).

Критично для твоего кейса:

2007 = Invalid license key

2024 = No internet connection (лицензия требует сеть)

3006 = License activation failed

13) Частые проблемы Dev/Staging
1) Ngrok домен и лицензия

Симптомы:

запрос на https://licensing-api.biosensesignal.com/v3/activations возвращает 400

затем SDK отдаёт code: 2007 (часто)

Действия:

попросить саппорт добавить домен ngrok в allowlist лицензии

для стейджа завести отдельный “staging license”

2) Нет COOP/COEP → проблемы с worker/wasm

Симптомы могут быть странные: падения worker, WASM errors, нестабильность.
Проверка:

self.crossOriginIsolated === true

3) Низкая производительность девайса / плохой свет

Симптомы:

warnings/ошибки измерения, деградация FPS, низкий confidence
Решение:

улучшить свет, закрыть тяжёлые приложения, дать устройству остыть (в known limitations рекомендуют паузу между измерениями).