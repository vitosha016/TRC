# AGENTS.md

Инструкции для AI-агентов, работающих в этом репозитории.

## Проект

**TRC × FRC — Game Center**: управление очередью баффов для игры Tiles Survive.

- **Фронтенд:** Svelte 5 (руны) + Vite, обычный JavaScript (не TypeScript)
- **Бекенд:** Google AppScript (`src/api/googleAppScriptBackend.gs`) поверх Google Sheets
- **Язык интерфейса и комментариев:** русский
- **Хостинг:** GitHub Pages (ветка `master`)

Главный принцип архитектуры: **бекенд — pure data store**. Никакой бизнес-логики в GAS. Все формулы, сортировка, расчёты и форматирование живут на фронтенде в `src/utils/`.

## Команды

```bash
npm install       # зависимости
npm run dev       # dev-сервер, http://localhost:5173
npm run build     # production-сборка → dist/
npm test          # vitest (один прогон)
npm run test:watch
npm run lint      # oxlint --fix
npm run format    # oxfmt
```

Перед завершением задачи обязательно запускай `npm test` и `npm run lint`.

Переменная окружения: `PUBLIC_PROD_GOOGLE_APPSCRIPT_ID` (см. `.env.sample`). Vite прокидывает префиксы `VITE_` и `PUBLIC_`.

## Структура

```
src/
├── main.js                  # точка входа, mount(App)
├── App.svelte               # лейаут, загрузка данных, копирование в чат
├── api/                     # бекенд GAS (код копируется вручную в Apps Script)
├── utils/
│   ├── formulas.js          # rankBuffsForQueue, applyBuffMath, calcNeeded…
│   ├── formulas.test.js
│   ├── api.js               # HTTP-клиент gasGet/gasSave + трекинг синхронизации
│   └── stores.js            # Svelte-сторы и действия (doLoad, doApply, doAdd, doDelete)
└── components/
    ├── *.svelte             # бизнес-компоненты (AddForm, BuffTable, GiverPanel, LogList)
    └── ui/                  # stateless UI (Button, Card, Input, Select, Suggest, SyncSpinner)
scripts/                     # dev-утилиты (seed, fix-buff, test-api)
plan.md                      # исторический референс оригинала
```

## Конвенции кода

- Svelte 5: только руны — `$props()`, `$state()`, `$derived()`, `$effect()`, `$bindable()`. Никаких `export let`, `$:` и Svelte 3/4-паттернов.
- Стили — внутри компонента через `<style>`, глобальные только через `:global(...)` в `App.svelte`.
- Форматирование (oxfmt): 2 пробела, ширина 120, одинарные кавычки, точки с запятой, trailing comma.
- UI-компоненты из `components/ui/` не содержат бизнес-логики; варианты передаются строкой через `variant="main full"`.
- Даты/время — unix-timestamp **в секундах** (`nowSec()` из `formulas.js`).
- Ники сравниваются без учёта регистра (`toLowerCase()`).
- Не добавляй зависимости без необходимости; проект намеренно минималистичен.
- Pre-commit (lefthook) прогоняет `oxfmt` и `oxlint --fix` по staged-файлам.

## Бизнес-логика (не ломать)

- Сортировка очереди: приоритетные (`priority = 1`, 📌) выше, затем по времени добавления (`createdAt` ASC).
- «Стройка» и «Исследования» — независимые списки; приоритет и порядок считаются внутри каждой категории.
- Приоритетные игроки идут первыми и в тексте копирования.
- `saving = round(left × applied / 100)` — колонка «Экономия».
- `applyBuffMath`: `endAt = now + remaining × (1 − percent/100)`, `appliedCount` максимум 14.
- Кулдаун донора — 3 суток (259 200 сек).
- Поле `giver` («Кто добавил») — справочное, на сортировку не влияет.
- `buff` остаётся в данных для совместимости, на сортировку не влияет.
- `calcNeeded`: `ceil(log(target/left) / log(0.85))`.

## API (GAS)

| Метод | Параметр        | Назначение                     | Кеш    |
| ----- | --------------- | ------------------------------ | ------ |
| GET   | `?type=state`   | buffs, givers, nicks, template | 1 час  |
| GET   | `?type=history` | только история                 | 30 мин |
| GET   | `?type=all`     | всё сразу                      | нет    |
| POST  | `?type=save`    | сохранение, инвалидирует кеши  | —      |

Особенности:

- POST отправляется с `Content-Type: text/plain;charset=utf-8` (требование GAS), тело — JSON.
- `save` принимает любую комбинацию: `buffs` (полная замена листа), `historyEntry`, `giverStat`, `nick`, `nick2`, `template`.
- Ответ `save` содержит свежие данные всех таблиц — сторы синхронизируются им.
- Действия оптимистичны (сначала локально, потом `bgSave`); при ошибке — `bgFail()` с перезагрузкой.
- Фронт опрашивает `state` каждые 120 с; история грузится лениво при открытии блока.
- `localStorage` (`trc_cache`) используется только для мгновенного первого рендера.

## Тесты

- Vitest, тесты рядом с кодом: `src/utils/formulas.test.js`.
- Покрывай изменения в `formulas.js` юнит-тестами. Компоненты и сторы тестами не покрыты — проверяй вручную через `npm run dev`.

## Деплой

Пуш в `master` → GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages. Переменная `PUBLIC_PROD_GOOGLE_APPSCRIPT_ID` берётся из environment `production`. Секреты в репозиторий не коммитить.

## Чего не делать

- Не переносить логику на бекенд и не менять контракт API без необходимости.
- Не начинать миграцию на Astro из `plan.md` без явной команды.
- Не коммитить `.env`, `dist/`, `node_modules/`.
- Не хардкодить ID развертывания GAS — только через переменную окружения.
