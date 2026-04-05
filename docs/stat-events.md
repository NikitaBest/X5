# События статистики: `POST /app/stat-event` (tat-event / CJM)

---

## Тело запроса (JSON)

| Поле | Тип | Описание |
|------|-----|----------|
| `type` | string | Идентификатор события: префикс `cjm_screen_` или `cjm_action_` + суффикс из URL (см. ниже). |
| `data` | string | Человекочитаемое описание на русском (контекст и детали). |
| `durationSeconds` | number (целое ≥ 0) | Для событий экрана — время в секундах; для кликов всегда `0`. |

**Авторизация:** при наличии JWT в приложении передаётся заголовок `Authorization: Bearer <token>`.

Пустой `type` на клиенте не отправляется.

---

## Два семейства событий

### 1. `cjm_screen_<суффикс>` — время на экране / уход с экрана

- **При смене маршрута** отправляется событие для **предыдущего** экрана: в `durationSeconds` — сколько секунд пользователь **пробыл на том экране** до перехода.
- Текст в `data`: `Пользователь был на экране <path> <N> сек` (где `<path>` — pathname, например `/results`).

- **При закрытии вкладки / уходе со страницы приложения** (размонтирование трекера) — ещё одно событие для **текущего** экрана.
- Текст в `data`: `Пользователь покинул экран <path> через <N> сек`.

### 2. `cjm_action_<суффикс>` — клик по интерактивному элементу

- Суффикс соответствует **текущему** URL (экрану, на котором произошёл клик).
- `durationSeconds` всегда **0**.
- `data`: `Действие на экране <path>: <метка>`.

**Метка элемента** (`<метка>`) выбирается так:

1. атрибут `aria-label`, если не пустой;
2. иначе атрибут `data-track`, если не пустой;
3. иначе текст элемента, обрезанный до 80 символов;
4. иначе `#id`, если есть `id`;
5. иначе имя тега в нижнем регистре (например `button`).

**Целевые элементы:** `button`, `a`, `[role="button"]`, `input[type="submit"]` (и ближайший родитель через `closest`).

---

## Правило суффикса: `normalizePathToType`

Из `pathname`:

1. убираются ведущие `/`;
2. оставшиеся `/` заменяются на `_`;
3. удаляются все символы, **кроме** латинских букв, цифр и `_` (в том числе **дефисы**);
4. результат приводится к **нижнему регистру**;
5. если после нормализации строка пустая — используется **`home`**.

**Важно для парсинга на бэке:** пути с дефисом дают суффикс **без** дефиса, например:

- `/algorithm-settings` → `algorithmsettings`
- `/nutrition-report` → `nutritionreport`

---

## Таблица маршрутов приложения → `type`

| Маршрут (pathname) | Суффикс | Примеры `type` |
|--------------------|---------|----------------|
| `/` | `home` | `cjm_screen_home`, `cjm_action_home` |
| `/welcome` | `welcome` | `cjm_screen_welcome`, `cjm_action_welcome` |
| `/priority` | `priority` | `cjm_screen_priority`, `cjm_action_priority` |
| `/pilot-banner` | `pilotbanner` | `cjm_screen_pilotbanner`, `cjm_action_pilotbanner` |
| `/algorithm-settings` | `algorithmsettings` | `cjm_screen_algorithmsettings`, `cjm_action_algorithmsettings` |
| `/allergies` | `allergies` | `cjm_screen_allergies`, `cjm_action_allergies` |
| `/preparation` | `preparation` | `cjm_screen_preparation`, `cjm_action_preparation` |
| `/camera` | `camera` | `cjm_screen_camera`, `cjm_action_camera` |
| `/results` | `results` | `cjm_screen_results`, `cjm_action_results` |
| `/nutrition` | `nutrition` | `cjm_screen_nutrition`, `cjm_action_nutrition` |
| `/cart` | `cart` | `cjm_screen_cart`, `cjm_action_cart` |
| `/survey` | `survey` | `cjm_screen_survey`, `cjm_action_survey` |
| `/nutrition-report` | `nutritionreport` | `cjm_screen_nutritionreport`, `cjm_action_nutritionreport` |

Любой другой путь обрабатывается тем же алгоритмом (например, при появлении новых маршрутов).

---

## Смысл экранов (продуктовая расшифровка)

| Суффикс в `type` | Экран |
|------------------|--------|
| `home` | Корень `/` — стартовая логика (в т.ч. перед редиректом на приветствие или результаты). |
| `welcome` | Приветствие / онбординг. |
| `priority` | Выбор приоритетов / целей. |
| `pilotbanner` | Информационный экран «Пилотная версия NutriScan» между целями и настройкой алгоритма. |
| `algorithmsettings` | Настройка алгоритма (параметры профиля для сканирования). |
| `allergies` | Аллергии и ограничения. |
| `preparation` | Инструкция и подготовка к сканированию. |
| `camera` | Сканирование (камера, сессия измерения). |
| `results` | Результаты измерения. |
| `nutrition` | План питания / рацион. |
| `cart` | Корзина. |
| `survey` | Опрос. |
| `nutritionreport` | Отчёт по питанию. |

**Итог:** префикс `cjm_screen_*` удобен для **времени на экране** и **воронки экранов**; `cjm_action_*` — для **частоты действий** с привязкой к экрану (тот же суффикс, что у URL).

---

## Примеры

**Пользователь 45 секунд был на результатах, затем перешёл на рацион:**

- `type`: `cjm_screen_results`
- `data`: `Пользователь был на экране /results 45 сек`
- `durationSeconds`: `45`

**На экране `/results` нажата кнопка с текстом «Измерить снова»:**

- `type`: `cjm_action_results`
- `data`: `Действие на экране /results: Измерить снова` (или укороченный текст / `aria-label` / `data-track`, если заданы)
- `durationSeconds`: `0`
