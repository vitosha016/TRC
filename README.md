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
│   ├── App.svelte         # Header, лейаут, копирование
│   ├── utils/             # Чистые формулы + API + Svelte-сторы
│   │   ├── formulas.js         # rankBuffsForQueue, applyBuffMath, calcNeeded…
│   │   ├── formulas.test.js    # Юнит-тесты (vitest)
│   │   ├── api.js              # HTTP-клиент к GAS (gasGet/gasSave)
│   │   └── stores.js           # Svelte-сторы: buffs, history, givers, ranked…
│   ├── components/        # Бизнес-компоненты
│   │   ├── AddForm.svelte       # Форма добавления/редактирования
│   │   ├── GiverPanel.svelte    # Поле «кто добавил» + топ донатеров
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

| Метод  | Параметр        | Назначение                                          | Кеш    |
| ------ | --------------- | --------------------------------------------------- | ------ |
| `GET`  | `?type=state`   | buffs, givers, nicks, template (без истории)        | 1 час  |
| `GET`  | `?type=history` | Только история транзакций                           | 30 мин |
| `GET`  | `?type=all`     | Всё сразу (buffs, history, givers, nicks, template) | нет    |
| `POST` | `?type=save`    | Сохранить изменения (инвалидирует оба кеша)         | —      |

Бекенд — **pure data store**. Никакой логики, только CRUD в Google-таблицы. Вся математика на фронте.

Кеширование — `CacheService` Apps Script. `state` загружается каждые 120с, `history` — только при открытии блока «История транзакций». Плюс `localStorage` для мгновенного первого рендера.

## Команды

```bash
npm run dev       # Dev-сервер (Vite + Svelte, hot reload)
npm run build     # Production-сборка → dist/
npm test          # Юнит-тесты (vitest)
npm run lint      # Линтер с автофиксом (oxlint --fix)
npm run format    # Форматтер (oxfmt)
```

## Механика

<details>
<summary>Сортировка, экономия и применение баффа</summary>

### Сортировка очереди

1. **Приоритетные** (`📌`, `priority = 1`) — выше
2. **Время добавления** (`createdAt` ASC) — кто раньше добавлен, тот выше

«Стройка» и «Исследования» сортируются независимо. Приоритетные игроки идут первыми и в тексте копирования.

### Экономия в таблице

Колонка «Экономия» = `round(left × applied / 100)`. Совокупный эффект от уже выданных баффов.

### applyBuff — применение баффа

5%/10%/15%:

- `endAt = now + remaining × (1 − percent/100)`
- `applied` += percent, `appliedCount` += 1
- `queueReceived = 1`, `queueLastAt = now`
- Запись в историю, обновление статистики «Кто добавил»

### Донатеры

Топ-8 по количеству розданных баффов (горизонтальный скролл). Кулдаун — **3 суток** (259 200 сек). На сортировку не влияет.

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
- **[vitest](https://vitest.dev/)** — юнит-тесты
