# TRC × FRC — Game Center

Управление очередью баффов для Tiles Survive.

## Структура

```
├── public/           # Фронтенд (ванильный JS)
│   └── index.html    #
├── src/
│   ├── api/          # Бекенд на Google AppScript
│   │   ├── README.md                    # Инструкция по развёртыванию бэка
│   │   └── googleAppScriptBackend.gs   # Код AppScript (скопипастить в редактор)
└──└── lib/
        ├── formulas.js        # Чистые формулы (scoreBuff, rank, calcNeeded…)
        └── formulas.test.js   # 35 тестов на vitest
```

## Как поднять бекенд

См. [src/api/README.md](src/api/README.md) — пошаговая инструкция.

Кратко:
1. Создать гуглотаблицу → Extensions → Apps Script
2. Скопировать код из `src/api/googleAppScriptBackend.gs`
3. Опубликовать как WebApp → скопировать ID
4. Прописать `VITE_GAS_ID` в `.env` (see `.env.sample`)
5. `npm run build` → задеплоить `/dist`

## API

Два эндпоинта:

| Метод | Параметр | Назначение |
|-------|----------|-----------|
| `GET` | `?type=all` | Получить все данные (buffs, history, givers, nicks, template) |
| `POST` | `?type=save` | Сохранить изменения (`{buffs?, historyEntry?, giverStat?, nick?, template?}`) |

Бекенд отвечает только за хранение. Вся логика подсчёта — на фронте.

## Команды

```bash
npm test          # Запуск тестов (vitest)
npm run build     # Копирование public/ → dist/
```
