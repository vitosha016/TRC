# TRC × FRC — Game Center

Управление очередью баффов для Tiles Survive. 
Svelte 5 + Vite + Google AppScript.

## Быстрый старт

```bash
npm install
cp .env.sample .env          # впиши ID развертывания GAS
npm run dev                   # http://localhost:5173
```

## Как поднять

<details>
<summary>☁️ Бекенд (Google AppScript)</summary>

Подробная инструкция: [src/api/README.md](src/api/README.md).

Кратко:

1. Создать Google-таблицу → **Расширения → Apps Script**
2. Скопировать код из `src/api/googleAppScriptBackend.gs` в редактор
3. **Развернуть → Новое развертывание → Веб-приложение**
4. Доступ: **Все (в том числе анонимные)**
5. Скопировать **Идентификатор развертывания**
6. Вписать в `.env`: `PUBLIC_PROD_GOOGLE_APPSCRIPT_ID=<id>`

После первого запроса скрипт сам создаст листы: `Buffs`, `History`, `Givers`, `Nicks`, `Template`.
</details>

<details>
<summary>🖥️ Фронтенд (локально)</summary>

```bash
npm install
npm run dev
```

Открыть `http://localhost:5173`. Горячая перезагрузка — Vite + Svelte.

Переменная `PUBLIC_PROD_GOOGLE_APPSCRIPT_ID` в `.env` указывает на рабочий GAS-бекенд. Без неё запросы пойдут в пустоту.
</details>

<details>
<summary>🌍 Деплой (GitHub Pages)</summary>

1. В репо: **Settings → Environments → production**
2. Добавить переменную `PUBLIC_PROD_GOOGLE_APPSCRIPT_ID` со значением ID развертывания
3. Settings → Pages → Source: **GitHub Actions**
4. Пуш в `master` → GitHub Actions соберёт и задеплоит

Workflow: `.github/workflows/deploy.yml`
</details>

## Структура

```
├── scripts/              # Dev-скрипты (seed, fix-buff, test-api)
├── src/
│   ├── api/              # Бекенд на Google AppScript
│   │   ├── README.md                    # Инструкция по развёртыванию бэка
│   │   └── googleAppScriptBackend.gs   # Код для копирования в Apps Script
│   ├── utils/             # Чистые формулы + API + Svelte-сторы
│   │   ├── formulas.js         # scoreBuff, getQueueFireIds, calcNeeded…
│   │   ├── formulas.test.js    # 39 тестов (vitest)
│   │   ├── api.js              # HTTP-клиент к GAS (gasGet/gasSave)
│   │   └── stores.js           # Svelte-сторы: buffs, history, givers, ranked…
│   ├── components/        # Бизнес-компоненты
│   │   ├── App.svelte           # Header, лейаут, копирование
│   │   ├── AddForm.svelte       # Форма добавления/редактирования
│   │   ├── GiverPanel.svelte    # Поле «кто накладывает» + топ донатеров
│   │   ├── BuffTable.svelte     # Таблицы очереди (2 колонки)
│   │   └── LogList.svelte       # История транзакций (details)
│   └── components/ui/     # Stateless UI-компоненты
│       ├── Button.svelte        # main / danger / small / full
│       ├── Card.svelte          # Остров-карточка
│       ├── Input.svelte         # Текстовое поле
│       ├── Select.svelte        # Выпадающий список
│       ├── Suggest.svelte       # Автокомплит (combobox)
│       └── SyncSpinner.svelte   # Плашка синхронизации / ошибок
├── .oxfmtrc.json         # Конфиг форматтера oxfmt
├── lefthook.yml          # Pre-commit хуки (format + lint)
├── vite.config.js        # Vite + Svelte + envPrefix
└── plan.md               # Референс: архитектура оригинала
```

## API (GAS)

| Метод  | Параметр     | Назначение                                                    |
| ------ | ------------ | ------------------------------------------------------------- |
| `GET`  | `?type=all`  | Получить все данные (buffs, history, givers, nicks, template) |
| `POST` | `?type=save` | Сохранить изменения                                           |

Бекенд — **pure data store**. Никакой логики, только CRUD в Google-таблицы. Вся математика на фронте.

## Команды

```bash
npm run dev       # Dev-сервер (Vite + Svelte, hot reload)
npm run build     # Production-сборка → dist/
npm test          # 39 тестов (vitest)
npm run lint      # Линтер с автофиксом (oxlint --fix)
npm run format    # Форматтер (oxfmt)
```

## Механика сортировки

<details>
<summary>Механика сортировки и 🔥-правила</summary>

### scoreBuff — приоритет очереди

```
left   = max(0, endAt - now)
saving = round(left × applied / 100)               // накопленная экономия (отображение)
score  = round(round(left × buff / 100) × boost)   // приоритет сортировки
```

- **boost** = 1.1 (Стройка) / 1.05 (Исследования)
- **buff** — процент баффа игрока
- **applied** — суммарный % уже выданных баффов

### Буст донатерам

Топ-3 по количеству розданных баффов:

- **№1** → `score × 1.5`
- **№2-3** → `score × 1.25`

Ники сравниваются без учёта регистра. При наведении на ник в таблице — tooltip с раскладкой score.

### Сортировка

1. 🔥 **queueFire** — горящие всегда наверху
2. **score** по убыванию (с учётом донатерского буста)
3. **left** по убыванию (при равном score)

### 🔥 queueFire

Игрок получает 🔥, если в его категории:

- есть хотя бы один уже получивший бафф (`queueReceived = 1`)
- **и** неполучивших ∈ {1, 2}

> Загорается когда почти все получили, а 1-2 ещё нет — им срочно нужен бафф.

### applyBuff — применение баффа

5%/10%/15%:

- `endAt = now + remaining × (1 − percent/100)`
- `applied` += percent, `appliedCount` += 1
- `queueReceived = 1`, `queueLastAt = now`
- Запись в историю, обновление статистики донора

### Экономия в таблице

Колонка «Экономия» = `round(left × applied / 100)`. Совокупный эффект от уже выданных баффов.

### Донатеры

Топ-8 по количеству розданных баффов (горизонтальный скролл). Кулдаун — **3 суток** (259 200 сек).

### Копирование в чат

Формат:

```
#X | дата
• Игрок — Xд Yч
#Y
• Игрок — Xд Yч
#Z
N. Игрок - Xд Yч - N/14 шт.
#186 Спасибо за помощь!
#199 Образец:
Ник | Процент | Тип
Vi007 10% Стройка
```

Где `#X`, `#Y`, `#Z` — значения `header_build`, `header_research`, `header_5` из листа `Template`. Блок `#Z` включается когда `include_5 = 1`.

</details>

## Технологии

- **[Svelte 5](https://svelte.dev/)** — реактивность через руны (`$state`, `$derived`, `$effect`)
- **[Vite](https://vitejs.dev/)** — сборка, dev-сервер
- **[Google AppScript](https://developers.google.com/apps-script)** — бекенд-как-сервис на Google Sheets
- **[oxlint](https://oxc.rs/)** + **[oxfmt](https://oxc.rs/)** — линтинг и форматирование
- **[lefthook](https://github.com/evilmartians/lefthook)** — git-хуки
- **[vitest](https://vitest.dev/)** — тесты (39 штук)
