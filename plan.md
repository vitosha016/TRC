# TRC × FRC — Документация / План реверсинжениринга

Игра: **Tiles Survive** (зомби-стратегия, мобильная)
Сайт: `https://trk-frc.ru/`
Бекенд: **PHP**, единая точка входа `index.php`
Фронтенд: **ванильный JS SPA**, hash-роутинг, без фреймворков

## Исходная структура (референс)

### Режимы работы

| URL                       | Режим              | BUFF_MANAGE_MODE |
| ------------------------- | ------------------ | ---------------- |
| `index.php`               | Публичный сайт     | `false`          |
| `index.php?buff_manage=1` | Управление баффами | `true`           |
| `index.php?admin=1`       | Админ-панель       | —                |

Все 3 режима отдают полный HTML, данные вшиты в `<script>` как JS-константы.

---

## Что оставляем в новом проекте

### ✅ Ядро баффов (MVP)

| Фича               | Эндпоинты                                     | Назначение                                   |
| ------------------ | --------------------------------------------- | -------------------------------------------- |
| Очередь баффов     | `GET/POST ?api=buffs`                         | Ядро. scoreBuff, calcNeeded, getQueueFireIds |
| Применить бафф     | `POST ?api=apply_buff`                        | Ключевая операция — раздача баффа            |
| Статистика доноров | `GET ?api=givers`                             | Сколько раздал + кулдаун 3 суток             |
| Лог действий       | `GET/POST ?api=logs`                          | Аудит: кто добавил/ускорил/удалил            |
| Ники               | `GET/POST ?api=nicks`                         | Автокомплит                                  |
| Копирование в чат  | — (JS)                                        | Формат игры с #номерами                      |
| Шаблон копирования | `POST action=save_template`                   | Заголовки, лимиты                            |
| CRUD баффов        | `POST action=save_buff`, `action=delete_buff` | Админка                                      |
| Оповещение         | `POST action=save_note`                       | Объявление на главной                        |
| Аутентификация     | `login` / `logout`                            | Пароль, один админ                           |

**Итого: 11 эндпоинтов** (6 JSON API + 5 форм).

### 🗑️ Выбрасываем

| Фича                                  | Причина                                |
| ------------------------------------- | -------------------------------------- |
| Валентинки                            | Соц-фича, не про баффы                 |
| Статьи/гайды (5 CRUD)                 | Блог с картинками и HTML               |
| Цитаты (add/delete/reset)             | 73 текстовых прикола                   |
| Дни рождения (add/delete)             | Соц-фича                               |
| Событие (save_event)                  | Можно добавить позже при необходимости |
| Калькуляторы VIP/скиллы/здания/звёзды | Статика, не меняется                   |

---

## Структуры данных (только нужные)

### Buff

```typescript
{
  id: string; // "b" + timestamp + random(36)
  nick: string; // ник игрока
  type: "Стройка" | "Исследования";
  buff: number; // процент баффа, по умолчанию 15
  endAt: number; // unix timestamp окончания
  createdAt: number; // unix timestamp создания
  applied: number; // суммарный % выданных баффов
  appliedCount: number; // количество выдач (max 14)
  queueReceived: 0 | 1; // получил ли в текущем круге
  queueLastAt: number; // unix timestamp последнего получения
}
```

### BuffHistory

```typescript
{
  id: string; // "bh" + timestamp + random(36)
  recipient_id: string; // ссылка на Buff.id
  recipient: string; // ник получателя
  type: "Стройка" | "Исследования";
  giver: string; // ник раздающего (или "Не указан")
  percent: number; // сколько % выдано
  time: number; // unix timestamp
}
```

### Log

```typescript
{ nick: string, action: string, time: number }
```

### Givers

```typescript
{ [nick: string]: { total: number, last_buff: number } }
```

### Template

```typescript
{
  header_build: string; // "#184 Стройка | {date}\r\n"
  limit_build: number; // 15
  header_research: string; // "\r\n#173 Исследование\r\n"
  limit_research: number; // 15
  include_5: number; // 0 | 1
  header_5: string; // "#186 Для ускорений стройки отдаём баффы 5%\r\n"
}
```

---

## Ключевые формулы

### scoreBuff — приоритет в очереди

```javascript
left = max(0, endAt - nowSec())
saving = round(left * buff% / 100)
boost = type === 'Стройка' ? 1.1 : 1.05
score = round(saving * boost)
```

### calcNeeded — сколько баффов 15% нужно

```javascript
if (leftSec <= targetSec) return 0;
return ceil(log(targetSec / leftSec) / log(0.85));
// Каждый бафф 15% = умножение времени на 0.85
```

### getQueueFireIds — кому срочно

```
Для каждой категории отдельно:
  если alreadyReceived > 0 И pending.length ∈ {1, 2}
    → пометить всех pending как 🔥
```

### Сортировка очереди

```
1. 🔥 (queueFire DESC)
2. score DESC
3. left DESC
```

### Кулдаун доноров

```
COOLDOWN_SEC = 259200  (3 суток = 72 часа)
```

### Формат копирования в чат

```
#184 Стройка | {дата}
• Имя — Xд Yч
...

#173 Исследование
• Имя — Xд Yч
...

[опционально: #186 блок 5%]
#186 Спасибо за помощь!
[20% шанс: топ-3 донора]
#199 Образец:
Ник | Процент | Тип
Vi007 10% Стройка
```

---

## Архитектура нового проекта

```
game-center/
├── src/
│   ├── lib/
│   │   ├── formulas.ts          # scoreBuff, calcNeeded, getQueueFireIds
│   │   ├── format.ts            # formatSeconds, fmt, escapeHtml, etc.
│   │   ├── db.ts                # адаптер БД
│   │   └── types.ts             # Buff, BuffHistory, Log, Givers, Template
│   ├── pages/
│   │   ├── index.astro          # публичный SPA
│   │   └── admin.astro          # админка (+ логин)
│   └── api/
│       ├── buffs.ts             # GET/POST
│       ├── apply-buff.ts        # POST
│       ├── givers.ts            # GET
│       ├── logs.ts              # GET/POST
│       └── nicks.ts             # GET/POST
├── package.json
└── wrangler.toml                # Cloudflare D1
```

**Бекенд: Cloudflare D1 + Hono** — бесплатный тир, настоящая БД, без кредитки.

### Эндпоинты нового проекта

| Метод  | Путь                  | Назначение                  |
| ------ | --------------------- | --------------------------- |
| GET    | `/api/buffs`          | Очередь + история           |
| POST   | `/api/buffs`          | Сохранить очередь           |
| POST   | `/api/apply-buff`     | Применить бафф              |
| GET    | `/api/givers`         | Статистика доноров          |
| GET    | `/api/logs`           | Лог действий                |
| POST   | `/api/logs`           | Добавить запись             |
| GET    | `/api/nicks`          | Сохранённые ники            |
| POST   | `/api/nicks`          | Добавить ник                |
| POST   | `/api/admin/template` | Сохранить шаблон            |
| POST   | `/api/admin/buff`     | Добавить/обновить участника |
| DELETE | `/api/admin/buff/:id` | Удалить участника           |
| POST   | `/api/admin/note`     | Сохранить оповещение        |
| POST   | `/api/admin/login`    | Вход                        |
| POST   | `/api/admin/logout`   | Выход                       |

---

## Этап 2: Переезд на Astro + Svelte

**Что сейчас:** публичная страница и админка — 2 HTML-файла с инлайн-CSS и JS. Вся логика в одном `<script>`, разметка захардкожена. API отдельно на Hono.

**Цель:** Astro-проект, где страницы собираются из компонентов, интерактивные виджеты сделаны на Svelte, API остаётся тот же.

### Преимущества Astro + Svelte

- **Компонентный подход** — каждый виджет (очередь баффов, карточка игрока, доноры) — отдельный `.svelte`/`.astro` файл
- **Astro Islands** — интерактивные части (баффы с автообновлением, доноры, лог, копирование) грузятся как Svelte-острова с `client:load`
- **Реактивность Svelte** — нет ручного `innerHTML`, нет `document.getElementById`, нет прямой работы с DOM
- **Скоупные стили** — CSS живёт внутри компонента, не глобальный
- **Меньше кода** — Svelte в 2-3 раза короче эквивалентного vanilla JS
- **Серверный рендеринг** — статические части (задачи на день, оповещение) рендерятся на сервере

### Компонентное дерево

```
src/
├── pages/
│   ├── index.astro               # Публичная SPA-обёртка
│   └── admin.astro               # Админка
├── components/
│   ├── layout/
│   │   ├── Header.astro          # Шапка (лого, тема)
│   │   ├── BottomTabs.astro      # Нижнее меню (для публичной)
│   │   └── AdminLayout.astro     # Обёртка админки
│   ├── main/
│   │   ├── DayCard.svelte        # Карточка дня (интерактивная: чек-листы)
│   │   └── NoteCard.svelte       # Оповещение (кнопка "принято")
│   ├── buffs/
│   │   ├── BuffQueue.svelte      # Очередь баффов (весь экран, автообновление)
│   │   ├── BuffCard.svelte       # Карточка одного игрока
│   │   ├── BuffHistory.svelte    # История выдач для игрока
│   │   ├── CopyBuffButton.svelte # Кнопка копирования в чат
│   │   └── BuffProgress.svelte   # Прогресс-бар
│   ├── givers/
│   │   └── GiversList.svelte     # Список доноров (кулдаун в реальном времени)
│   ├── logs/
│   │   └── LogList.svelte        # Лог действий
│   └── admin/
│       ├── LoginForm.svelte       # Форма входа
│       ├── NoteEditor.svelte      # Редактор оповещения
│       ├── TemplateEditor.svelte  # Редактор шаблона
│       └── BuffEditor.svelte      # CRUD очереди (список + форма)
```

### Что куда (Astro vs Svelte)

| Компонент                              | Технология | Почему                                                        |
| -------------------------------------- | ---------- | ------------------------------------------------------------- |
| Header, BottomTabs                     | `.astro`   | Статика, не меняется                                          |
| DayCard                                | `.svelte`  | Чек-листы + навигация по дням — интерактив                    |
| NoteCard                               | `.svelte`  | Кнопка "принято", localStorage                                |
| BuffQueue + BuffCard + BuffHistory     | `.svelte`  | Автообновление каждые 15с, пересчёт таймеров, интерактивность |
| CopyBuffButton                         | `.svelte`  | Генерация текста, clipboard API                               |
| GiversList                             | `.svelte`  | Кулдаун в реальном времени (setInterval 1с)                   |
| LogList                                | `.svelte`  | Автообновление                                                |
| LoginForm                              | `.svelte`  | Форма с валидацией                                            |
| NoteEditor, TemplateEditor, BuffEditor | `.svelte`  | Формы с отправкой JSON                                        |

### Пример: как BuffCard выглядит на Svelte vs текущий vanilla

**Сейчас (vanilla JS, renderBuffs):** 60 строк шаблонной строки с `es()`, ручная сборка HTML, `innerHTML`, нет типизации.

**На Svelte:**

```svelte
<script lang="ts">
  import type { EnrichedBuff } from "$lib/types";
  import { formatSeconds } from "$lib/format";
  export let entry: EnrichedBuff;
  export let position: number;
  export let maxScore: number;
</script>

<article class="card rank-card" class:fire={entry.queueFire}>
  <div class="rank-top">
    <span class="rank-num">{position}</span>
    <div>
      <strong>{entry.queueFire ? '🔥 ' : ''}{entry.nick}</strong>
      <p>{entry.type} · осталось {formatSeconds(entry.left)} · бафф {entry.buff}%</p>
    </div>
    <div class="saving">{formatSeconds(entry.saving)}</div>
  </div>
  <div class="bar">
    <i style="width:{(entry.score / maxScore * 100).toFixed(1)}%"></i>
  </div>
</article>
```

В 5 раз короче, типизировано, без `innerHTML`.

### План переезда (не приступать без команды)

1. `npm create astro@latest` поверх текущего проекта
2. Добавить Svelte-интеграцию (`npx astro add svelte`)
3. Скопировать `src/lib/formulas.ts`, `format.ts`, `types.ts` — они уже чистые
4. Вынести `api/` как отдельный пакет или оставить в `src/api/` с Astro API routes
5. Собрать статические Astro-компоненты (Header, BottomTabs, AdminLayout)
6. Переписать BuffQueue на Svelte (самый сложный компонент, ядро приложения)
7. Переписать DayCard, NoteCard, GiversList, LogList на Svelte
8. Переписать админку на Svelte (формы)
9. Удалить `public/index.html` и `public/admin.html` — больше не нужны

### Результат этапа 2

- Компонентная архитектура, легко расширять
- Меньше кода, лучше читаемость
- Svelte-реактивность вместо ручного DOM
- Astro-сборка с tree-shaking и оптимизацией
