# Редизайн админки CMS «Премиум» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью переработать UI админ-панели `/admin` и страницы `/login` в материале liquid glass дизайн-системы витрины, не меняя контракт с бэкендом.

**Architecture:** Вся чистая логика (валидация, сортировка, черновики, хоткеи, оптимистичные операции, бейджи статуса) выносится в отдельные модули `lib/admin/*.ts` без React и DOM — их можно прочитать целиком и проверить глазами. Поверх неё — слой переиспользуемых UI-примитивов `app/(admin)/admin/components/ui/`, затем каркас (сайдбар + топбар + провайдер данных), затем экраны. Данные загружаются на клиенте через существующие Server Actions и живут в одном контексте `AdminDataProvider`, из которого их берут счётчики сайдбара, палитра ⌘K, плитки Обзора и таблицы.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, CSS Modules, react-icons 5, GSAP 3.13 (только при необходимости оркестровки). Новых зависимостей не добавляется.

**Источники:** `design_handoff_admin_redesign/README.md` (спецификация), `design_handoff_admin_redesign/Админка новая.dc.html` (высокоточный прототип), `app/globals.css` (токены), `/DESIGN.md`.

---

## Global Constraints

Требования ниже действуют во **всех** задачах — повторять их в каждом шаге не нужно, но нарушать нельзя.

- **Никаких литеральных цветов** в `app/(admin)/**` и `app/(site)/**`: только `var(--…)`. Нужен новый цвет или тень — токен добавляется в `:root` в `app/globals.css` с русским комментарием и переопределяется в `html[data-a11y="1"]`.
- **Никаких инлайн-стилей** в `app/(admin)/**`. Инлайн допустим только для передачи вычисленных CSS-переменных (`style={{ "--cols": … } as React.CSSProperties}`) — это данные, а не стили.
- **CSS Modules**, один `.module.css` рядом с компонентом. Tailwind не добавлять.
- **Только светлая тема.** Тёмную не делать. `--brand-deep` — акцент (сайдбар, аватар), не общий грунт.
- **`app/(admin)/admin/actions.ts` не трогать.** Реальные имена экшенов: `actionListAllServices`, `actionCreateService`, `actionPatchService`, `actionListAllDoctors`, `actionCreateDoctor`, `actionPatchDoctor`, `actionUploadMedia`. (В README пакета они названы иначе — README ошибается, источник истины — файл.)
- **Логин не менять по сути:** `POST /api/login`, редирект по `?next=`, `middleware.ts` — как есть. Меняется только разметка и стили.
- **Русский язык интерфейса.**
- Длительности — `var(--dur-fast)` 160мс / `var(--dur)` 260мс / `var(--dur-slow)` 420мс. Кривая зависит от свойства: **перемещение и масштаб** (`transform`) — на `var(--spring)` = `cubic-bezier(0.34, 1.35, 0.64, 1)`; **кроссфейды цвета, фона, границы и тени** — на `ease`. Пружина даёт перелёт, а у цвета перелёта не бывает — витрина уже разделяет их ровно так (`globals.css:303-304`). Глобальное правило `@media (prefers-reduced-motion: reduce)` в `globals.css:171-173` уже отключает всё — новых `!important` не добавлять.
- **`backdrop-filter` только на контейнерах.** Ни на одном элементе, который может повториться десятки раз (строка таблицы, пункт списка, чип), `backdrop-filter` быть не должно.
- **Фокус виден всегда.** `outline: none` без замены запрещён. Базовое правило `:focus-visible` уже есть в `globals.css:161-164`.
- **Сообщения коммитов — на английском**, формат `feat(admin): …`. Текст интерфейса, комментарии в коде и этот план — на русском.
- **Минимальный тап-таргет 44px — там, где вводят пальцем.** На указателе мыши плотный грид может быть компактнее: `.sm` (36px) живёт в строках таблицы и в шапках контейнеров. Всё, что доступно на тач-вводе, остаётся 44px.
- Иконки — только `react-icons` (наборы `ai`, `bs`, `fi`, `hi2` — как на витрине). Своих SVG не рисовать.
- Каждая задача заканчивается зелёными `npx tsc --noEmit` и `npm run build` — без ошибок и без новых warning-ов.

### Решения, принятые до начала работы (отклонения от README пакета)

1. **Удаления записей нет.** `DELETE /api/cms/service/{id}` и `/doctors/{id}` в бэкенде отсутствуют. Кнопка «Удалить», связанная модалка подтверждения удаления и тост «Отменить» **не делаются**. Компонент `Modal` всё равно строится — он нужен для подтверждения ухода со страницы с несохранёнными изменениями. Колонка «Действия» сужается до одной кнопки «Открыть»: ширина колонки `120px` вместо `196px`.
2. **Раздела «Медиа» нет.** `GET /api/cms/media` отсутствует. Маршрут `/admin/media` не создаётся, пункт из сайдбара исключён, на Обзоре — две плитки вместо трёх. `Dropzone` всё равно строится: он заменяет `input[type=file]` в формах услуг и врачей.
3. **Отдельного `Wallpaper.tsx` нет.** Обои уже нарисованы глобально в `app/globals.css:203-217` (`body::before`, `position: fixed`, `z-index: -1`, гаснут в `data-a11y="1"`). Дублировать их отдельным слоем внутри админки — значит рисовать один и тот же градиент дважды. Вместо этого каркас админки держит прозрачный фон, и глобальные обои просвечивают. Расхождение с прототипом — сдвиг центров пятен на 2–4% — визуально неразличимо.
4. **Панели услуги и врача — два отдельных компонента, а не один обобщённый.** `ServiceSheet` и `DoctorSheet` имеют одинаковую форму (черновик, валидация, `beforeunload`, модалка ухода), но разные типы payload, разные наборы полей, разные валидаторы и разные лимиты. Обобщение потребовало бы дженериков по payload и карты описаний полей — читать стало бы труднее, а сущностей всего две и новых не предвидится. Общее у них — примитивы `Sheet`, `Input`, `Textarea`, `Dropzone`, `Modal` и CSS-модуль `ServiceSheet.module.css`, который панель врача переиспользует. Дословно продублированного кода при этом нет: совпадает структура, не текст.
5. **Автотестов нет.** В проекте нет тестового фреймворка, и он не добавляется. Приёмка каждой задачи — `npx tsc --noEmit`, `npm run build` и явный список того, что смотрится в браузере: он есть у каждой задачи, где появляется видимое поведение. Логика в `lib/admin/` устроена как чистые функции именно поэтому — её можно прочитать и проверить рассуждением, а её поведение наблюдается на экранах Task 14 и Task 15.

### CSS-конвенции админки

Чтобы не повторять один и тот же блок в каждом модуле, эти три рецепта применяются по имени:

**Рецепт «лёгкое стекло»** (карточки, контейнер таблицы, плитки):
```css
  position: relative;
  isolation: isolate;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
```

**Рецепт «плотное стекло»** (сайдбар, топбар, sheet, модалка, тосты, палитра): то же, но `background: var(--glass-bg-strong)`.

**Рецепт «блик по поверхности»** — отдельный слой поверх содержимого, чтобы блик ложился и на фото внутри:
```css
  .x::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    background: var(--glass-gloss);
    pointer-events: none;
  }
```

---

## File Structure

```
app/globals.css                                # M: блок токенов админки в :root + a11y + reduced-transparency

lib/admin/                                     # C: чистая логика — ни React, ни DOM
  validation.ts                                #   валидация форм услуги и врача
  sort.ts                                      #   сортировка и фильтрация строк
  badges.ts                                    #   статус-бейдж строки
  draft.ts                                     #   черновики форм в localStorage
  hotkeys.ts                                   #   разбор клавиатурных сочетаний
  optimistic.ts                                #   применение и фиксация оптимистичных операций

app/(admin)/
  layout.tsx                                   # M: голая обёртка, инлайн paddingTop убран
  login/
    page.tsx                                   # M: новая разметка, логика запроса без изменений
    login.module.css                           # C
  admin/
    actions.ts                                 # НЕ ТРОГАТЬ
    layout.tsx                                 # C: AdminDataProvider + ToastProvider + Sidebar + Topbar + main
    layout.module.css                          # C
    page.tsx                                   # M: Обзор
    overview.module.css                        # C
    services/page.tsx                          # C
    doctors/page.tsx                           # C
    admin.module.css                           # D: удалить
    components/
      header/AdminHeader.tsx                   # D: удалить, заменён Topbar
      ServiceManager.tsx                       # D: удалить, распадается на ServiceTable + ServiceSheet
      DoctorManager.tsx                        # D: удалить, распадается на DoctorTable + DoctorSheet
      data/
        AdminDataProvider.tsx                  # C: контекст услуг и врачей, оптимистичные мутации
      shell/
        Sidebar.tsx + Sidebar.module.css       # C
        Topbar.tsx + Topbar.module.css         # C
        SaveStatus.tsx + SaveStatus.module.css # C
      ui/
        useCursorGlow.ts                       # C: --mx/--my от pointermove
        useFocusTrap.ts                        # C: ловушка и возврат фокуса
        GlassCard.tsx + .module.css            # C
        Button.tsx + .module.css               # C
        Input.tsx + .module.css                # C
        Textarea.tsx + .module.css             # C
        Skeleton.tsx + .module.css             # C
        EmptyState.tsx + .module.css           # C
        Sheet.tsx + .module.css                # C
        Modal.tsx + .module.css                # C
        ToastProvider.tsx + Toast.module.css   # C
        Table.tsx + .module.css                # C: TableShell, TableHeadCell, TableRow
        InlineEdit.tsx + .module.css           # C
        Dropzone.tsx + .module.css             # C
        CommandPalette.tsx + .module.css       # C
      ServiceTable.tsx + ServiceSheet.tsx      # C
      DoctorTable.tsx + DoctorSheet.tsx        # C
```

Логика в `lib/admin/` лежит вне `app/` рядом с существующими `lib/cms.ts` и `lib/types.ts`: она не привязана к маршрутам и её видно как отдельный слой.

---
### Task 1: Токены плотного интерфейса

**Files:**
- Modify: `app/globals.css:7-156` (блок `:root`, блок `html[data-a11y="1"]`, медиазапрос `prefers-reduced-transparency`)

**Interfaces:**
- Consumes: ничего.
- Produces: набор CSS-переменных, на который опираются все последующие задачи —
  `--radius-md`, `--radius-sm`, `--radius-xs`, `--row-h`, `--sidebar-w`, `--sidebar-w-collapsed`,
  `--topbar-h`, `--danger`, `--danger-tint`, `--danger-line`, `--danger-soft`, `--success`,
  `--success-tint`, `--glass-row-hover`, `--glass-dark-bg-nav`, `--pill-fill`, `--ring-brand`,
  `--ring-danger`, `--row-line`, `--shimmer`, `--glow-soft`, `--dur-fast`, `--dur`, `--dur-slow`.

Каждый цветовой токен обязан появиться в трёх местах: `:root`, `html[data-a11y="1"]` и — где это меняет дело — в `@media (prefers-reduced-transparency: reduce)`. Токены геометрии и таймингов переопределять не нужно: они не про контраст.

- [ ] **Step 1: Добавить токены в `:root`**

В `app/globals.css` перед закрывающей скобкой `:root` (сразу после строки `--focus: 3px;`, `globals.css:105`) вставить:

```css

  /* ── Админка: плотный рабочий интерфейс ─────────────────────────── */
  /* Радиусы витрины (22/30px) слишком крупные для плотного грида —
     у админки своя, более мелкая шкала. */
  --radius-md: 18px;       /* стеклянные контейнеры плотного интерфейса */
  --radius-sm: 12px;       /* поля, кнопки, чипы */
  --radius-xs: 8px;        /* ячейка инлайн-правки, мелкие теги */
  --row-h: 52px;           /* высота строки дата-грида */
  --sidebar-w: 260px;
  --sidebar-w-collapsed: 72px;
  --topbar-h: 64px;

  --danger: #b3261e;             /* деструктивное действие и ошибка поля */
  --danger-tint: #fdeceb;        /* подложка ошибки на светлом */
  --danger-line: rgba(179, 38, 30, 0.32);
  --danger-soft: rgba(179, 38, 30, 0.28);  /* ховер кнопки выхода на тёмном */
  --success: #0f7a52;            /* статус «сохранено» */
  --success-tint: #e4f6ee;

  /* Ховер строки без blur: строк в списке могут быть сотни, и
     backdrop-filter на каждой убивает скролл. */
  --glass-row-hover: rgba(230, 240, 253, 0.9);
  --row-line: 0 1px 0 rgba(15, 31, 56, 0.05);  /* волосяная линия под строкой */
  /* Сайдбар плотнее общего тёмного стекла: под ним едет контент. */
  --glass-dark-bg-nav: rgba(12, 30, 58, 0.8);
  --pill-fill: rgba(255, 255, 255, 0.16);      /* активная пилюля сайдбара */
  /* Кольца фокуса и ошибки — тенью, а не outline: не сдвигают геометрию поля. */
  --ring-brand: 0 0 0 3px rgba(37, 99, 235, 0.24);
  --ring-danger: 0 0 0 3px rgba(179, 38, 30, 0.16);
  --shimmer: linear-gradient(90deg,
    rgba(15, 31, 56, 0.07) 0%,
    rgba(15, 31, 56, 0.13) 40%,
    rgba(15, 31, 56, 0.07) 80%);               /* бегущая полоса скелетона */
  --glow-soft: rgba(255, 255, 255, 0.4);       /* блик, идущий за курсором */

  --dur-fast: 160ms;
  --dur: 260ms;
  --dur-slow: 420ms;
```

- [ ] **Step 2: Переопределить цветовые токены в режиме для слабовидящих**

В блок `html[data-a11y="1"]` (`app/globals.css:108-141`), после строки `--glass-primary: #0b3fb0;`, вставить:

```css

  /* админка: сплошные поверхности, максимальный контраст */
  --danger: #8c1d16;
  --danger-tint: #ffffff;
  --danger-line: #8c1d16;
  --danger-soft: #8c1d16;
  --success: #0a5c3d;
  --success-tint: #ffffff;
  --glass-row-hover: #eef4fd;
  --glass-dark-bg-nav: #08183a;
  --pill-fill: #0b3fb0;
  --ring-brand: 0 0 0 3px #0b3fb0;
  --ring-danger: 0 0 0 3px #8c1d16;
  --row-line: 0 1px 0 rgba(0, 0, 0, 0.35);
  --shimmer: linear-gradient(90deg, #e8eef8 0%, #d6e2f4 40%, #e8eef8 80%);
  --glow-soft: transparent;
```

- [ ] **Step 3: Переопределить в `prefers-reduced-transparency`**

В медиазапрос `@media (prefers-reduced-transparency: reduce)` (`app/globals.css:144-156`), в блок `:root`, добавить две строки — остальное уже перекрыто существующими правилами стекла:

```css
    --glass-row-hover: #eef4fd;
    --glass-dark-bg-nav: #12294d;
```

- [ ] **Step 4: Проверить, что ни один цветовой токен не забыт в a11y-блоке**

Run:
```bash
for t in danger danger-tint danger-line danger-soft success success-tint \
         glass-row-hover glass-dark-bg-nav pill-fill ring-brand ring-danger \
         row-line shimmer glow-soft; do
  printf '%-20s root=%s a11y=%s\n' "$t" \
    "$(grep -c -- "--$t:" app/globals.css)" \
    "$(sed -n '/^html\[data-a11y="1"\] {/,/^}/p' app/globals.css | grep -c -- "--$t:")"
done
```
Expected: у каждого токена `a11y=1`. `root` может быть больше единицы — токен встречается и в `:root`, и в переопределениях; важно, что в блоке доступности он есть.

- [ ] **Step 5: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: обе команды без ошибок. Витрина визуально не изменилась — новые токены пока никем не используются.

- [ ] **Step 6: Коммит**

```bash
git add app/globals.css
git commit -m "feat(admin): dense-interface design tokens"
```

---

### Task 2: Логика строк — валидация, сортировка, статусы

Три чистых модуля без React и без DOM: их можно читать и проверять глазами, и они не зависят друг от друга. Собраны в одну задачу, потому что по отдельности это «создай файл на 40 строк» — ревьюер не сможет принять один и отклонить соседний.

**Files:**
- Create: `lib/admin/validation.ts`
- Create: `lib/admin/sort.ts`
- Create: `lib/admin/badges.ts`

**Interfaces:**
- Consumes: типы `Service`, `Doctor`, `ServicePayload`, `DoctorPayload` из `lib/types.ts`.
- Produces:
  - `validation.ts`: `type FieldErrors<K extends string> = Partial<Record<K, string>>`, `type ServiceField = "serviceName" | "slug" | "price" | "description"`, `type DoctorField = "name" | "specialty" | "bio"`, `const SERVICE_FIELD_ORDER: ServiceField[]`, `const DOCTOR_FIELD_ORDER: DoctorField[]`, `const DESCRIPTION_MAX = 160`, `const BIO_MAX = 400`, `validateService(v: ServicePayload): FieldErrors<ServiceField>`, `validateDoctor(v: DoctorPayload): FieldErrors<DoctorField>`, `firstErrorField<K extends string>(errors: FieldErrors<K>, order: K[]): K | null`, `isPriceInput(raw: string): boolean`
  - `sort.ts`: `type SortDir = "asc" | "desc"`, `type SortKind = "text" | "number"`, `type SortState<K extends string> = { key: K; dir: SortDir }`, `sortRows<T>(rows: T[], key: keyof T, dir: SortDir, kind: SortKind): T[]`, `filterRows<T>(rows: T[], query: string, fields: (keyof T)[]): T[]`, `toggleSort<K extends string>(current: SortState<K>, key: K): SortState<K>`, `ariaSort(state: SortState<string>, key: string): "ascending" | "descending" | "none"`
  - `badges.ts`: `type BadgeTone = "success" | "danger" | "brand"`, `type Badge = { label: string; tone: BadgeTone }`, `serviceBadge(s: Pick<Service, "imageSrc" | "price">, pending: boolean): Badge`, `doctorBadge(d: Pick<Doctor, "imgSrc">, pending: boolean): Badge`, `countAttention<T>(rows: T[], badge: (row: T) => Badge): number`

- [ ] **Step 1: Валидация**

Создать `lib/admin/validation.ts`.

```ts
/** Валидация форм админки. Чистые функции: одна форма → карта ошибок по полям. */

import type { DoctorPayload, ServicePayload } from "@/lib/types";

export const DESCRIPTION_MAX = 160;
export const BIO_MAX = 400;

/** Слаг уходит в адрес /services/<slug> — только то, что не ломает URL. */
const SLUG_RE = /^[a-z0-9-]+$/;
/** Инлайн-правка цены: пустая строка допустима как промежуточное состояние ввода. */
const PRICE_INPUT_RE = /^\d*$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ServiceField = "serviceName" | "slug" | "price" | "description";
export type DoctorField = "name" | "specialty" | "bio";

/** Порядок обхода полей формы — по нему выбирается, куда вести фокус. */
export const SERVICE_FIELD_ORDER: ServiceField[] = [
    "serviceName",
    "slug",
    "price",
    "description",
];
export const DOCTOR_FIELD_ORDER: DoctorField[] = ["name", "specialty", "bio"];

export function validateService(v: ServicePayload): FieldErrors<ServiceField> {
    const errors: FieldErrors<ServiceField> = {};

    if (!v.serviceName.trim()) errors.serviceName = "Укажите название услуги";

    const slug = v.slug.trim();
    if (!slug) errors.slug = "Укажите слаг";
    else if (!SLUG_RE.test(slug)) errors.slug = "Только строчные латинские буквы, цифры и дефис";

    // Ноль допустим: у клиники есть бесплатная первичная консультация.
    if (!Number.isInteger(v.price) || v.price < 0) {
        errors.price = "Цена — целое число не меньше нуля";
    }

    if (v.description.length > DESCRIPTION_MAX) {
        errors.description = `Не длиннее ${DESCRIPTION_MAX} символов`;
    }

    return errors;
}

export function validateDoctor(v: DoctorPayload): FieldErrors<DoctorField> {
    const errors: FieldErrors<DoctorField> = {};

    if (!v.name.trim()) errors.name = "Укажите полное имя";
    if (!v.specialty.trim()) errors.specialty = "Укажите специализацию";
    if (v.bio.length > BIO_MAX) errors.bio = `Не длиннее ${BIO_MAX} символов`;

    return errors;
}

/** Первое проблемное поле в порядке формы, а не в порядке ключей объекта. */
export function firstErrorField<K extends string>(
    errors: FieldErrors<K>,
    order: K[],
): K | null {
    return order.find((field) => errors[field] !== undefined) ?? null;
}

export function isPriceInput(raw: string): boolean {
    return PRICE_INPUT_RE.test(raw);
}
```

- [ ] **Step 2: Сортировка и фильтрация**

Создать `lib/admin/sort.ts`.

```ts
/** Сортировка и фильтрация строк дата-грида. Чистые функции, вход не мутируется. */

export type SortDir = "asc" | "desc";
export type SortKind = "text" | "number";
export type SortState<K extends string> = { key: K; dir: SortDir };

/** Русский порядок: ё после е, регистр не главнее буквы. */
const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

export function sortRows<T>(rows: T[], key: keyof T, dir: SortDir, kind: SortKind): T[] {
    const sign = dir === "asc" ? 1 : -1;
    // Array.prototype.sort устойчива по спецификации — равные строки не переставляются.
    return [...rows].sort((a, b) => {
        const left = a[key];
        const right = b[key];
        const diff =
            kind === "number"
                ? Number(left) - Number(right)
                : collator.compare(String(left ?? ""), String(right ?? ""));
        return diff * sign;
    });
}

export function filterRows<T>(rows: T[], query: string, fields: (keyof T)[]): T[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
        fields.some((field) => String(row[field] ?? "").toLowerCase().includes(needle)),
    );
}

/** Клик по активной колонке разворачивает порядок, по новой — начинает с возрастания. */
export function toggleSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
    if (current.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    }
    return { key, dir: "asc" };
}

export function ariaSort(
    state: SortState<string>,
    key: string,
): "ascending" | "descending" | "none" {
    if (state.key !== key) return "none";
    return state.dir === "asc" ? "ascending" : "descending";
}
```

- [ ] **Step 3: Статус-бейджи**

Создать `lib/admin/badges.ts`.

```ts
/** Статус строки дата-грида: одна метка, никаких выдуманных метрик. */

import type { Doctor, Service } from "@/lib/types";

export type BadgeTone = "success" | "danger" | "brand";
export type Badge = { label: string; tone: BadgeTone };

const SENDING: Badge = { label: "Отправка", tone: "brand" };
const PUBLISHED: Badge = { label: "Опубликовано", tone: "success" };
const NO_PHOTO: Badge = { label: "Нет фото", tone: "danger" };
const NO_PRICE: Badge = { label: "Без цены", tone: "danger" };

/**
 * Цена важнее фото: услуга без цены не попадает в прайс, а без картинки
 * всё равно продаётся. Нулевая цена в CMS почти всегда означает
 * «не заполнили», поэтому она тоже подсвечивается.
 */
export function serviceBadge(s: Pick<Service, "imageSrc" | "price">, pending: boolean): Badge {
    if (pending) return SENDING;
    if (!Number.isFinite(s.price) || s.price <= 0) return NO_PRICE;
    if (!s.imageSrc) return NO_PHOTO;
    return PUBLISHED;
}

export function doctorBadge(d: Pick<Doctor, "imgSrc">, pending: boolean): Badge {
    if (pending) return SENDING;
    if (!d.imgSrc) return NO_PHOTO;
    return PUBLISHED;
}

/** Сколько строк требуют внимания — подпись под цифрой на Обзоре. */
export function countAttention<T>(rows: T[], badge: (row: T) => Badge): number {
    return rows.filter((row) => badge(row).tone === "danger").length;
}
```

- [ ] **Step 4: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок. Модули пока никем не используются — поведение проверяется в Task 14 и Task 15, где они попадают в интерфейс.

- [ ] **Step 5: Коммит**

```bash
git add lib/admin/validation.ts lib/admin/sort.ts lib/admin/badges.ts
git commit -m "feat(admin): row logic — validation, sorting, status badges"
```

---

### Task 3: Логика поведения — черновики, хоткеи, оптимистичные операции

**Files:**
- Create: `lib/admin/draft.ts`
- Create: `lib/admin/hotkeys.ts`
- Create: `lib/admin/optimistic.ts`

**Interfaces:**
- Consumes: ничего (модули не знают ни про React, ни про типы домена).
- Produces:
  - `draft.ts`: `type DraftScope = "service" | "doctor"`, `type DraftId = number | "new"`, `interface DraftStorage { getItem; setItem; removeItem }`, `defaultStorage(): DraftStorage | null`, `draftKey(scope, id): string`, `saveDraft<T>(scope, id, value, storage?): void`, `loadDraft<T>(scope, id, storage?): T | null`, `clearDraft(scope, id, storage?): void`, `isDirty<T extends object>(a: T, b: T): boolean`
  - `hotkeys.ts`: `type HotkeyAction = "palette" | "focusSearch" | "close" | "save" | "submit"`, `interface HotkeyEventLike { key; metaKey; ctrlKey }`, `interface EditableLike { tagName?; isContentEditable? }`, `isEditableTarget(target: EditableLike | null): boolean`, `matchHotkey(e: HotkeyEventLike, ctx: { inEditable: boolean }): HotkeyAction | null`, `type OverlayState = { palette: boolean; modal: boolean; sheet: boolean }`, `nextOverlayToClose(s: OverlayState): "palette" | "modal" | "sheet" | null`
  - `optimistic.ts`: `type Identified = { id: number }`, `type Pending<T> = T & { pending?: true }`, `type CollectionOp<T extends Identified>`, `nextTempId(rows: Identified[]): number`, `applyOp<T extends Identified>(rows: Pending<T>[], op: CollectionOp<T>): Pending<T>[]`, `commitOp<T extends Identified>(rows: Pending<T>[], op: CollectionOp<T>, saved: T): Pending<T>[]`, `isPending<T extends Identified>(row: Pending<T>): boolean`

- [ ] **Step 1: Черновики форм**

Создать `lib/admin/draft.ts`. Хранилище передаётся параметром, чтобы модуль не падал при серверном рендере.

```ts
/** Черновики форм админки: набранное не теряется при закрытии панели. */

export type DraftScope = "service" | "doctor";
export type DraftId = number | "new";

export interface DraftStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** На сервере localStorage нет — тогда все операции становятся пустыми. */
export function defaultStorage(): DraftStorage | null {
    return typeof localStorage === "undefined" ? null : localStorage;
}

export function draftKey(scope: DraftScope, id: DraftId): string {
    return `admin:draft:${scope}:${id}`;
}

export function saveDraft<T>(
    scope: DraftScope,
    id: DraftId,
    value: T,
    storage: DraftStorage | null = defaultStorage(),
): void {
    if (!storage) return;
    // Сериализуем снаружи try: ошибка сериализации — это баг в данных
    // вызывающего кода, и он должен быть виден, а не проглочен вместе
    // с отказом хранилища.
    const raw = JSON.stringify(value);
    try {
        storage.setItem(draftKey(scope, id), raw);
    } catch {
        // квота или приватный режим — черновик не критичен, молчим
    }
}

export function loadDraft<T>(
    scope: DraftScope,
    id: DraftId,
    storage: DraftStorage | null = defaultStorage(),
): T | null {
    if (!storage) return null;
    const raw = storage.getItem(draftKey(scope, id));
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        // битый черновик игнорируем, а не роняем форму
        return null;
    }
}

export function clearDraft(
    scope: DraftScope,
    id: DraftId,
    storage: DraftStorage | null = defaultStorage(),
): void {
    storage?.removeItem(draftKey(scope, id));
}

/** Формы плоские (строки и числа) — поверхностного сравнения достаточно. */
export function isDirty<T extends object>(a: T, b: T): boolean {
    const keys = Object.keys(a) as (keyof T)[];
    if (keys.length !== Object.keys(b).length) return true;
    return keys.some((key) => a[key] !== b[key]);
}
```

- [ ] **Step 2: Хоткеи**

Создать `lib/admin/hotkeys.ts`.

```ts
/**
 * Разбор клавиатурных сочетаний админки. Событие принимается «утиным» типом:
 * функция ничего не знает о DOM и её легко читать целиком.
 */

export type HotkeyAction = "palette" | "focusSearch" | "close" | "save" | "submit";

export interface HotkeyEventLike {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
}

export interface EditableLike {
    tagName?: string;
    isContentEditable?: boolean;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EditableLike | null): boolean {
    if (!target) return false;
    if (target.isContentEditable) return true;
    return EDITABLE_TAGS.has(target.tagName ?? "");
}

export function matchHotkey(
    e: HotkeyEventLike,
    ctx: { inEditable: boolean },
): HotkeyAction | null {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Сочетания с модификатором работают и внутри полей: это команды приложения.
    if (mod && key === "k") return "palette";
    if (mod && key === "s") return "save";
    if (mod && key === "enter") return "submit";
    if (key === "escape") return "close";
    // Одиночный символ — команда только вне полей, иначе его нельзя набрать.
    if (!mod && !ctx.inEditable && e.key === "/") return "focusSearch";

    return null;
}

export type OverlayState = { palette: boolean; modal: boolean; sheet: boolean };

/** Escape закрывает слои сверху вниз: палитра → модалка → sheet. */
export function nextOverlayToClose(s: OverlayState): "palette" | "modal" | "sheet" | null {
    if (s.palette) return "palette";
    if (s.modal) return "modal";
    if (s.sheet) return "sheet";
    return null;
}
```

- [ ] **Step 3: Оптимистичные операции**

Создать `lib/admin/optimistic.ts`.

```ts
/**
 * Оптимистичные операции над коллекцией админки.
 * applyOp — редьюсер для useOptimistic, commitOp — фиксация ответа сервера.
 * Отката здесь нет: при провале транзакции useOptimistic сам возвращает
 * базовое состояние, а пользователю показывается тост с «Повторить».
 */

export type Identified = { id: number };

/** Строка, чей запрос ещё в полёте: рисуется бейджем «Отправка» и приглушённой. */
export type Pending<T> = T & { pending?: true };

export type CollectionOp<T extends Identified> =
    | { kind: "create"; tempId: number; draft: Omit<T, "id"> }
    | { kind: "update"; id: number; patch: Partial<Omit<T, "id">> };

/** Временный id отрицательный — так он никогда не столкнётся с id бэкенда. */
export function nextTempId(rows: Identified[]): number {
    const min = rows.reduce((acc, row) => Math.min(acc, row.id), 0);
    return min - 1;
}

export function applyOp<T extends Identified>(
    rows: Pending<T>[],
    op: CollectionOp<T>,
): Pending<T>[] {
    if (op.kind === "create") {
        // Новая запись встаёт первой: пользователь видит результат действия.
        const row = { ...op.draft, id: op.tempId, pending: true } as Pending<T>;
        return [row, ...rows];
    }
    return rows.map((row) =>
        row.id === op.id ? ({ ...row, ...op.patch, pending: true } as Pending<T>) : row,
    );
}

export function commitOp<T extends Identified>(
    rows: Pending<T>[],
    op: CollectionOp<T>,
    saved: T,
): Pending<T>[] {
    const target = op.kind === "create" ? op.tempId : op.id;
    const found = rows.some((row) => row.id === target);
    // Строку могли смахнуть обновлением списка — тогда просто добавляем ответ.
    if (!found) return [saved, ...rows];
    return rows.map((row) => (row.id === target ? saved : row));
}

export function isPending<T extends Identified>(row: Pending<T>): boolean {
    return row.pending === true;
}
```

- [ ] **Step 4: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add lib/admin/draft.ts lib/admin/hotkeys.ts lib/admin/optimistic.ts
git commit -m "feat(admin): form drafts, hotkeys, optimistic collection ops"
```

---
---

## Примитивы (Tasks 4–10)

Задачи этого раздела целиком про разметку и вид. Приёмка — `npx tsc --noEmit`, `npm run build` и явный список того, что смотрится в браузере. Компоненты пока никем не используются, поэтому их надо временно подключить к `app/(admin)/admin/page.tsx` для просмотра — либо посмотреть после Task 14, когда появится первый настоящий экран. Второй путь короче; список «что проверить» тогда переносится в приёмку Task 14.

### Task 4: Блик по курсору, GlassCard и Button

**Files:**
- Create: `app/(admin)/admin/components/ui/useCursorGlow.ts`
- Create: `app/(admin)/admin/components/ui/GlassCard.tsx`, `app/(admin)/admin/components/ui/GlassCard.module.css`
- Create: `app/(admin)/admin/components/ui/Button.tsx`, `app/(admin)/admin/components/ui/Button.module.css`

**Interfaces:**
- Consumes: токены Task 1.
- Produces:
  - `useCursorGlow<T extends HTMLElement>(): { ref: RefObject<T | null>; glowProps: { onPointerMove; onPointerLeave } }`
  - `<GlassCard as?: "div" | "section" | "article"; density?: "light" | "strong"; glow?: boolean; className?: string>`
  - `<Button variant?: "primary" | "ghost" | "quiet" | "danger"; size?: "md" | "sm" | "icon"; loading?: boolean>` — расширяет `React.ButtonHTMLAttributes<HTMLButtonElement>`

- [ ] **Step 1: Хук блика**

Создать `app/(admin)/admin/components/ui/useCursorGlow.ts`.

```ts
"use client";

import { useCallback, useRef } from "react";

/**
 * Блик ведёт себя как отражение: слой-градиент centered на --mx/--my,
 * которые пишутся из pointermove. Это CSS-переменные, а не стили —
 * запрет на инлайн-стили они не нарушают.
 */
export function useCursorGlow<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    }, []);

    const onPointerLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--mx", "50%");
        el.style.setProperty("--my", "0%");
    }, []);

    return { ref, glowProps: { onPointerMove, onPointerLeave } };
}
```

- [ ] **Step 2: GlassCard**

Создать `app/(admin)/admin/components/ui/GlassCard.tsx`.

```tsx
"use client";

import type { ReactNode } from "react";
import { useCursorGlow } from "./useCursorGlow";
import styles from "./GlassCard.module.css";

type Props = {
    children: ReactNode;
    /** light — карточки и контейнеры, strong — плотное стекло оверлеев. */
    density?: "light" | "strong";
    /** Блик, идущий за курсором. Не включать на элементах, которых много. */
    glow?: boolean;
    className?: string;
    as?: "div" | "section" | "article";
};

export default function GlassCard({
    children,
    density = "light",
    glow = false,
    className = "",
    as: Tag = "div",
}: Props) {
    const { ref, glowProps } = useCursorGlow<HTMLDivElement>();

    return (
        <Tag
            ref={glow ? ref : undefined}
            className={`${styles.card} ${density === "strong" ? styles.strong : ""} ${className}`}
            {...(glow ? glowProps : {})}
        >
            {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
            {children}
        </Tag>
    );
}
```

- [ ] **Step 3: Стили GlassCard**

Создать `app/(admin)/admin/components/ui/GlassCard.module.css`.

```css
/* Лёгкое стекло плотного интерфейса: радиус мельче витринного,
   кромку рисует --glass-sheen, а не рамка. */
.card {
  position: relative;
  isolation: isolate;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
}

.strong {
  background: var(--glass-bg-strong);
}

/* Статичный блик поверхности — поверх содержимого, чтобы ложился и на фото. */
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  background: var(--glass-gloss);
  pointer-events: none;
}

/* Подвижный блик: центр берётся из --mx/--my, которые пишет useCursorGlow. */
.glow {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    220px circle at var(--mx, 50%) var(--my, 0%),
    var(--glow-soft),
    transparent 70%
  );
  transition: opacity var(--dur) ease;
}
```

- [ ] **Step 4: Button**

Создать `app/(admin)/admin/components/ui/Button.tsx`.

```tsx
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCursorGlow } from "./useCursorGlow";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "quiet" | "danger";
    size?: "md" | "sm" | "icon";
    /** Запрос в полёте: кнопка блокируется и показывает подпись занятости. */
    loading?: boolean;
    busyLabel?: string;
    children?: ReactNode;
};

export default function Button({
    variant = "ghost",
    size = "md",
    loading = false,
    busyLabel,
    className = "",
    children,
    disabled,
    onPointerMove,
    onPointerLeave,
    ...rest
}: Props) {
    const { ref, glowProps } = useCursorGlow<HTMLButtonElement>();
    const glow = variant === "primary";

    return (
        <button
            ref={glow ? ref : undefined}
            type="button"
            className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
            {...rest}
            disabled={disabled || loading}
            aria-busy={loading || rest["aria-busy"]}
            // Блик и обработчики вызывающего кода живут вместе: спред не должен
            // молча отключать эффект, ради которого кнопка primary и существует.
            onPointerMove={(e) => {
                if (glow) glowProps.onPointerMove(e);
                onPointerMove?.(e);
            }}
            onPointerLeave={(e) => {
                if (glow) glowProps.onPointerLeave(e);
                onPointerLeave?.(e);
            }}
        >
            {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
            <span className={styles.label}>
                {loading ? (busyLabel ?? children) : children}
            </span>
        </button>
    );
}
```

- [ ] **Step 5: Стили Button**

Создать `app/(admin)/admin/components/ui/Button.module.css`.

```css
/* Кнопка плотного интерфейса. Витринная .btn — капсула 15/30 под лендинг;
   здесь ниже, компактнее и с мелким радиусом рабочей шкалы. */
.btn {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;          /* минимальный тап-таргет */
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dur-fast) ease,
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    box-shadow var(--dur) ease,
    transform var(--dur) var(--spring);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.label {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.glow {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    120px circle at var(--mx, 50%) var(--my, 0%),
    var(--glow-soft),
    transparent 65%
  );
}

/* Первичная — синее стекло, белый текст. Единственная, что подпрыгивает. */
.primary {
  background: var(--glass-primary);
  color: var(--surface);
  box-shadow: var(--glass-sheen), var(--shadow-soft);
}
.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--glass-sheen), var(--shadow-lift);
}

/* Контурная — чистое стекло, синий текст. */
.ghost {
  background: var(--glass-bg);
  color: var(--brand);
  border-color: var(--glass-border);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen);
}
.ghost:hover:not(:disabled) {
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
}

/* Тихая — без стекла: живёт внутри строк таблицы, где blur запрещён. */
.quiet {
  background: transparent;
  color: var(--ink-soft);
}
.quiet:hover:not(:disabled) {
  background: var(--brand-tint);
  color: var(--brand);
}

.danger {
  background: transparent;
  color: var(--danger);
}
.danger:hover:not(:disabled) {
  background: var(--danger-tint);
}

.md { min-height: 44px; }
/* Плотный грид на десктопе: 36px читается как «служебное действие в строке».
   Тач-ввод сюда не приходит — на узких экранах строка разбирается в карточку. */
.sm { min-height: 36px; padding: 0 12px; font-size: 13px; }
/* Квадратная кнопка-иконка: 44px, чтобы попадать пальцем. */
.icon {
  width: 44px;
  min-height: 44px;
  padding: 0;
}
```

- [ ] **Step 6: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок. Компоненты пока не подключены — визуальных изменений нет.

- [ ] **Step 7: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): GlassCard and Button primitives with cursor glow"
```

---

### Task 5: Поля ввода

**Files:**
- Create: `app/(admin)/admin/components/ui/Input.tsx`, `Input.module.css`
- Create: `app/(admin)/admin/components/ui/Textarea.tsx`, `Textarea.module.css`

**Interfaces:**
- Consumes: токены Task 1.
- Produces:
  - `<Input id: string; label: string; error?: string; hint?: string; ...InputHTMLAttributes>` — сам расставляет `aria-invalid`, `aria-describedby`, `role="alert"` на сообщении.
  - `<Textarea id: string; label: string; error?: string; max?: number; ...TextareaHTMLAttributes>` — плюс счётчик «N / MAX».

- [ ] **Step 1: Input**

Создать `app/(admin)/admin/components/ui/Input.tsx`.

```tsx
"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
    id: string;
    label: string;
    /** Сообщение валидации: подсвечивает поле и озвучивается скринридером. */
    error?: string;
    hint?: string;
    required?: boolean;
};

export default function Input({
    id,
    label,
    error,
    hint,
    required,
    className = "",
    ...rest
}: Props) {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>
                {label}
                {required ? <span aria-hidden="true" className={styles.star}>*</span> : null}
            </label>
            {/* {...rest} идёт первым: aria-разметку собирает сам компонент,
                и вызывающая форма не должна случайно её перебить — иначе
                aria-describedby укажет на несуществующий элемент. */}
            <input
                {...rest}
                id={id}
                required={required}
                className={`${styles.input} ${error ? styles.invalid : ""} ${className}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy || undefined}
                aria-required={required || undefined}
            />
            {hint ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 2: Стили Input**

Создать `app/(admin)/admin/components/ui/Input.module.css`.

```css
.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.star {
  margin-left: 3px;
  color: var(--danger);
}

/* Поле — лёгкое стекло: под ним обои, поэтому оно не выглядит серой плашкой.
   backdrop-filter допустим — полей в форме единицы, не сотни. */
.input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
  transition:
    border-color var(--dur-fast) ease,
    background var(--dur-fast) ease,
    box-shadow var(--dur) ease;
}

.input::placeholder {
  color: var(--ink-soft);
}

/* Кольцо тенью, а не outline: геометрия поля не сдвигается. */
.input:focus {
  outline: none;
  border-color: var(--brand);
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-sheen), var(--ring-brand);
}

.invalid,
.invalid:focus {
  border-color: var(--danger);
  background: var(--danger-tint);
  box-shadow: var(--glass-sheen), var(--ring-danger);
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-soft);
}

.error {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--danger);
  animation: shake var(--dur-slow) var(--spring);
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  30%, 70% { transform: translateX(3px); }
  50% { transform: translateX(-4px); }
}
```

- [ ] **Step 3: Textarea**

Создать `app/(admin)/admin/components/ui/Textarea.tsx`.

```tsx
"use client";

import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
    id: string;
    label: string;
    error?: string;
    /** Лимит символов: показывается счётчиком и краснеет при превышении. */
    max?: number;
    value: string;
};

export default function Textarea({
    id,
    label,
    error,
    max,
    value,
    className = "",
    ...rest
}: Props) {
    const errorId = `${id}-error`;
    const countId = `${id}-count`;
    const over = max !== undefined && value.length > max;
    const describedBy = [error ? errorId : null, max !== undefined ? countId : null]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={styles.field}>
            <div className={styles.head}>
                <label className={styles.label} htmlFor={id}>{label}</label>
                {max !== undefined ? (
                    <span id={countId} className={`${styles.count} ${over ? styles.over : ""}`}>
                        {value.length} / {max}
                    </span>
                ) : null}
            </div>
            {/* Тот же порядок, что в Input: вычисленная aria-разметка последняя. */}
            <textarea
                {...rest}
                id={id}
                value={value}
                className={`${styles.area} ${error ? styles.invalid : ""} ${className}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy || undefined}
            />
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 4: Стили Textarea**

Создать `app/(admin)/admin/components/ui/Textarea.module.css`. Повторяет геометрию Input, отличается высотой и шапкой со счётчиком.

```css
.field {
  display: grid;
  gap: 6px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

/* Счётчик моноширинный — цифры не прыгают при наборе. */
.count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.over {
  color: var(--danger);
  font-weight: 600;
}

.area {
  width: 100%;
  min-height: 104px;
  padding: 12px 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: var(--line);
  resize: vertical;
  transition:
    border-color var(--dur-fast) ease,
    background var(--dur-fast) ease,
    box-shadow var(--dur) ease;
}

.area:focus {
  outline: none;
  border-color: var(--brand);
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-sheen), var(--ring-brand);
}

.invalid,
.invalid:focus {
  border-color: var(--danger);
  background: var(--danger-tint);
  box-shadow: var(--glass-sheen), var(--ring-danger);
}

/* Та же встряска, что у Input: два поля в одной форме не должны
   вести себя по-разному при ошибке. */
.error {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--danger);
  animation: shake var(--dur-slow) var(--spring);
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  30%, 70% { transform: translateX(3px); }
  50% { transform: translateX(-4px); }
}
```

- [ ] **Step 5: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): form fields with validation states and aria wiring"
```

---

### Task 6: Скелетоны и пустые состояния

**Files:**
- Create: `app/(admin)/admin/components/ui/Skeleton.tsx`, `Skeleton.module.css`
- Create: `app/(admin)/admin/components/ui/EmptyState.tsx`, `EmptyState.module.css`

**Interfaces:**
- Consumes: токены Task 1 (`--shimmer`, `--row-h`).
- Produces:
  - `<SkeletonBar width?: string>` — одна полоса
  - `<SkeletonRows cols: string; rows?: number; widths?: string[][]>` — скелетон в геометрии таблицы; `cols` — то же значение `grid-template-columns`, что у настоящей таблицы
  - `<EmptyState title: string; description: string; action?: ReactNode>`

- [ ] **Step 1: Skeleton**

Создать `app/(admin)/admin/components/ui/Skeleton.tsx`.

```tsx
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export function SkeletonBar({ width = "100%" }: { width?: string }) {
    return (
        <span
            aria-hidden="true"
            className={styles.bar}
            style={{ "--bar-w": width } as CSSProperties}
        />
    );
}

/**
 * Скелетон повторяет геометрию таблицы, а не крутит спиннер по центру:
 * страница не перекладывается, когда данные приезжают.
 */
export function SkeletonRows({
    cols,
    rows = 6,
    widths = [["62%"], ["48%"], ["70%"], ["40%"]],
}: {
    cols: string;
    rows?: number;
    widths?: string[][];
}) {
    return (
        <div
            className={styles.rows}
            style={{ "--cols": cols } as CSSProperties}
            aria-hidden="true"
        >
            {Array.from({ length: rows }, (_, rowIndex) => (
                <div key={rowIndex} className={styles.row}>
                    {widths.map((cell, cellIndex) => (
                        <SkeletonBar key={cellIndex} width={cell[0]} />
                    ))}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Стили Skeleton**

Создать `app/(admin)/admin/components/ui/Skeleton.module.css`.

```css
.rows {
  display: grid;
  gap: 6px;
  padding: 6px;
}

/* Та же сетка, что у настоящей строки: --cols приходит от таблицы.
   min-height, а не height: настоящая строка тоже тянется под содержимое,
   и жёсткая высота развалила бы совпадение ровно там, где оно нужно. */
.row {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 12px;
  align-items: center;
  min-height: var(--row-h);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.bar {
  display: block;
  width: var(--bar-w, 100%);
  height: 12px;
  border-radius: 999px;
  background: var(--shimmer);
  background-size: 420px 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  from { background-position: -420px 0; }
  to { background-position: 420px 0; }
}
```

- [ ] **Step 3: EmptyState**

Создать `app/(admin)/admin/components/ui/EmptyState.tsx`.

```tsx
import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/**
 * Пустое состояние всегда объясняет причину и даёт первое действие.
 * Текст «список пуст» и «по фильтру ничего не найдено» — разный:
 * это решает вызывающий экран, компонент только показывает.
 */
export default function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className={styles.empty}>
            <div aria-hidden="true" className={styles.mark} />
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            {action ? <div className={styles.action}>{action}</div> : null}
        </div>
    );
}
```

- [ ] **Step 4: Стили EmptyState**

Создать `app/(admin)/admin/components/ui/EmptyState.module.css`.

```css
.empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 56px 24px;
  text-align: center;
}

/* Штрихованный квадрат вместо иллюстрации: своих ассетов дизайн не приносит. */
.mark {
  width: 76px;
  height: 76px;
  border: 2px dashed var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--brand-tint);
}

.title {
  margin: 6px 0 0;
  font-family: var(--font-head);
  font-size: 20px;
  color: var(--ink);
}

.description {
  margin: 0;
  max-width: 44ch;
  font-size: 14px;
  color: var(--ink-soft);
  text-wrap: pretty;
}

.action {
  margin-top: 6px;
}
```

- [ ] **Step 5: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): table-shaped skeletons and empty states"
```

---

### Task 7: Ловушка фокуса, Sheet и Modal

**Files:**
- Create: `app/(admin)/admin/components/ui/useFocusTrap.ts`
- Create: `app/(admin)/admin/components/ui/Sheet.tsx`, `Sheet.module.css`
- Create: `app/(admin)/admin/components/ui/Modal.tsx`, `Modal.module.css`

**Interfaces:**
- Consumes: токены Task 1, `Button` из Task 4.
- Produces:
  - `useFocusTrap(open: boolean): RefObject<HTMLDivElement | null>` — ставит фокус внутрь при открытии, зацикливает Tab, возвращает фокус на прежний элемент при закрытии
  - `<Sheet open: boolean; title: string; onClose: () => void; footer?: ReactNode; children>`
  - `<Modal open: boolean; title: string; description: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void>`

`Esc` компоненты не слушают сами: порядок закрытия слоёв решает глобальный обработчик из Task 17 через `nextOverlayToClose`. Клик по скриму закрывает.

- [ ] **Step 1: Ловушка фокуса**

Создать `app/(admin)/admin/components/ui/useFocusTrap.ts`.

```ts
"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Пока слой открыт, Tab не выпускает фокус наружу; при закрытии фокус
 * возвращается на элемент, с которого слой открыли (строку таблицы).
 */
export function useFocusTrap(open: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const restoreTo = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        restoreTo.current = document.activeElement as HTMLElement | null;
        const node = ref.current;
        node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Tab" || !node) return;
            const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            restoreTo.current?.focus();
        };
    }, [open]);

    return ref;
}
```

- [ ] **Step 2: Sheet**

Создать `app/(admin)/admin/components/ui/Sheet.tsx`.

```tsx
"use client";

import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./Sheet.module.css";

/**
 * Выезжающая панель справа. Список под ней остаётся на месте —
 * форма не уводит со страницы, а уходит в глубину: блюр и лёгкий отъезд
 * содержимого делает .sheetOpen в layout.module.css.
 */
export default function Sheet({
    open,
    title,
    onClose,
    footer,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    footer?: ReactNode;
    children: ReactNode;
}) {
    const trapRef = useFocusTrap(open);
    if (!open) return null;

    return (
        <>
            <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
            <div
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={styles.sheet}
            >
                <header className={styles.head}>
                    <h2 className={styles.title}>{title}</h2>
                    <Button
                        variant="quiet"
                        size="icon"
                        onClick={onClose}
                        aria-label="Закрыть панель"
                    >
                        <FiX aria-hidden="true" />
                    </Button>
                </header>
                <div className={styles.body}>{children}</div>
                {footer ? <footer className={styles.foot}>{footer}</footer> : null}
            </div>
        </>
    );
}
```

- [ ] **Step 3: Стили Sheet**

Создать `app/(admin)/admin/components/ui/Sheet.module.css`.

```css
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: rgba(var(--scrim), 0.28);
}

/* Плотное стекло: под ним едет содержимое страницы, лёгкого не хватит. */
.sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: calc(var(--z-overlay) + 1);
  display: flex;
  flex-direction: column;
  width: 520px;
  max-width: 100%;
  border-left: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
  animation: sheetIn var(--dur-slow) var(--spring);
}

@keyframes sheetIn {
  from { transform: translateX(102%); }
  to { transform: none; }
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px 22px;
  border-bottom: 1px solid var(--glass-border);
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 20px;
  color: var(--ink);
}

.body {
  flex: 1;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 20px 22px;
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--glass-border);
}
```

- [ ] **Step 4: Modal**

Создать `app/(admin)/admin/components/ui/Modal.tsx`. Используется для подтверждения ухода с несохранёнными изменениями.

```tsx
"use client";

import { useId } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "./Button";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./Modal.module.css";

export default function Modal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const trapRef = useFocusTrap(open);
    const titleId = useId();
    const descId = useId();
    if (!open) return null;

    return (
        <>
            <div className={styles.scrim} onClick={onCancel} aria-hidden="true" />
            <div className={styles.wrap}>
                <div
                    ref={trapRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className={styles.modal}
                >
                    <div aria-hidden="true" className={styles.icon}>
                        <FiAlertTriangle />
                    </div>
                    <h2 id={titleId} className={styles.title}>{title}</h2>
                    <p id={descId} className={styles.description}>{description}</p>
                    <div className={styles.actions}>
                        {/* Безопасное действие первое — на нём же автофокус от ловушки. */}
                        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
                        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
                    </div>
                </div>
            </div>
        </>
    );
}
```

- [ ] **Step 5: Стили Modal**

Создать `app/(admin)/admin/components/ui/Modal.module.css`.

```css
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: rgba(var(--scrim), 0.42);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.wrap {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-overlay) + 2);
  display: grid;
  place-items: center;
  padding: 24px;
  pointer-events: none;
}

.modal {
  pointer-events: auto;
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 460px;
  max-width: 100%;
  padding: 24px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
  animation: popIn var(--dur) var(--spring);
}

@keyframes popIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

.icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--danger-line);
  border-radius: var(--radius-sm);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 20px;
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 20px;
  color: var(--ink);
}

.description {
  margin: 0;
  font-size: 14px;
  color: var(--ink-soft);
  text-wrap: pretty;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
```

- [ ] **Step 6: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): sheet, modal and focus trap"
```

---

### Task 8: Тосты

**Files:**
- Create: `app/(admin)/admin/components/ui/ToastProvider.tsx`, `Toast.module.css`

**Interfaces:**
- Consumes: `Button` из Task 4.
- Produces:
  - `<ToastProvider>{children}</ToastProvider>` — рендерит контейнер уведомлений
  - `useToast(): { push: (toast: ToastInput) => void }`
  - `type ToastInput = { tone: "success" | "error"; title: string; action?: { label: string; onClick: () => void } }`

Успех скрывается сам через 4200мс, ошибка висит до закрытия — иначе пользователь не успеет прочитать, что сломалось, и нажать «Повторить».

- [ ] **Step 1: ToastProvider**

Создать `app/(admin)/admin/components/ui/ToastProvider.tsx`.

```tsx
"use client";

import {
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button";
import styles from "./Toast.module.css";

const SUCCESS_TTL = 4200;

export type ToastInput = {
    tone: "success" | "error";
    title: string;
    /** «Повторить» для проваленного запроса — подпись задаёт вызывающий код. */
    action?: { label: string; onClick: () => void };
};

type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ push: (t: ToastInput) => void } | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast вызван вне ToastProvider");
    return ctx;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seq = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (input: ToastInput) => {
            seq.current += 1;
            const id = seq.current;
            setToasts((list) => [...list, { ...input, id }]);
            // Ошибка не гаснет сама: её надо прочитать и, возможно, повторить.
            if (input.tone === "success") {
                setTimeout(() => dismiss(id), SUCCESS_TTL);
            }
        },
        [dismiss],
    );

    const value = useMemo(() => ({ push }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.stack} aria-live="polite">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${toast.tone === "error" ? styles.error : styles.success}`}
                    >
                        <span aria-hidden="true" className={styles.dot} />
                        <p className={styles.title}>{toast.title}</p>
                        {toast.action ? (
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={() => {
                                    toast.action?.onClick();
                                    dismiss(toast.id);
                                }}
                            >
                                {toast.action.label}
                            </Button>
                        ) : null}
                        <Button
                            variant="quiet"
                            size="icon"
                            aria-label="Закрыть уведомление"
                            onClick={() => dismiss(toast.id)}
                        >
                            <FiX aria-hidden="true" />
                        </Button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
```

- [ ] **Step 2: Стили тостов**

Создать `app/(admin)/admin/components/ui/Toast.module.css`.

```css
.stack {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: calc(var(--z-overlay) + 3);
  display: grid;
  gap: 10px;
  justify-items: end;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 300px;
  max-width: 400px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
  animation: toastIn var(--dur) var(--spring);
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(14px) scale(0.96); }
  to { opacity: 1; transform: none; }
}

/* Цветная точка — второй канал к цвету текста: не только оттенок. */
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.success .dot { background: var(--success); }
.error .dot { background: var(--danger); }

.title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  text-wrap: pretty;
}
```

- [ ] **Step 3: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): glass toasts with action and auto-dismiss"
```

---

### Task 9: Дата-грид и инлайн-правка

**Files:**
- Create: `app/(admin)/admin/components/ui/Table.tsx`, `Table.module.css`
- Create: `app/(admin)/admin/components/ui/InlineEdit.tsx`, `InlineEdit.module.css`

**Interfaces:**
- Consumes: `ariaSort`, `SortState` из `lib/admin/sort.ts` (Task 2); `Badge` из `lib/admin/badges.ts` (Task 2).
- Produces:
  - `<TableShell title: ReactNode; actions?: ReactNode; children>` — стеклянный контейнер со шапкой; **единственное место с `backdrop-filter`**
  - `<TableHead cols: string; children>` и `<TableHeadCell sortKey: string; state: SortState<string>; onSort: (key: string) => void; children>`
  - `<TableRow cols: string; muted?: boolean; leaving?: boolean; children>`
  - `<StatusBadge badge: Badge>`
  - `<TableCounter shown: number; total: number>`, `<TableChip>{children}</TableChip>`, `<TableColumnLabel>{children}</TableColumnLabel>` — общий хром шапки списка; таблицы услуг и врачей берут его отсюда, а не заводят свои копии
  - `<InlineEdit value: string; label: string; onCommit: (next: string) => void; validate?: (raw: string) => boolean; children>` — клик по содержимому включает поле, Enter сохраняет, Esc отменяет, blur сохраняет

- [ ] **Step 1: Table**

Создать `app/(admin)/admin/components/ui/Table.tsx`.

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { type SortState, ariaSort } from "@/lib/admin/sort";
import type { Badge } from "@/lib/admin/badges";
import styles from "./Table.module.css";

/** Стеклянный контейнер списка. backdrop-filter живёт только здесь. */
export function TableShell({
    title,
    actions,
    children,
}: {
    title: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.shell}>
            <header className={styles.shellHead}>
                <div className={styles.shellTitle}>{title}</div>
                {actions ? <div className={styles.shellActions}>{actions}</div> : null}
            </header>
            <div className={styles.body} role="table">{children}</div>
        </section>
    );
}

export function TableHead({ cols, children }: { cols: string; children: ReactNode }) {
    return (
        <div
            role="row"
            className={styles.head}
            style={{ "--cols": cols } as CSSProperties}
        >
            {children}
        </div>
    );
}

export function TableHeadCell({
    sortKey,
    state,
    onSort,
    children,
}: {
    sortKey: string;
    state: SortState<string>;
    onSort: (key: string) => void;
    children: ReactNode;
}) {
    const active = state.key === sortKey;
    return (
        <div role="columnheader" aria-sort={ariaSort(state, sortKey)}>
            <button
                type="button"
                className={`${styles.headButton} ${active ? styles.headActive : ""}`}
                onClick={() => onSort(sortKey)}
            >
                {children}
                <span aria-hidden="true" className={styles.arrow}>
                    {active ? (state.dir === "asc" ? "↑" : "↓") : ""}
                </span>
            </button>
        </div>
    );
}

/** Строка держится на --surface: blur на сотне строк убивает скролл. */
export function TableRow({
    cols,
    muted = false,
    children,
}: {
    cols: string;
    muted?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            role="row"
            className={`${styles.row} ${muted ? styles.rowMuted : ""}`}
            style={{ "--cols": cols } as CSSProperties}
        >
            {children}
        </div>
    );
}

export function TableCell({ children }: { children: ReactNode }) {
    return <div role="cell" className={styles.cell}>{children}</div>;
}

export function StatusBadge({ badge }: { badge: Badge }) {
    return <span className={`${styles.badge} ${styles[badge.tone]}`}>{badge.label}</span>;
}

/* ── Хром шапки контейнера. Общий для всех списков, поэтому живёт здесь,
      а не дублируется в модуле каждой таблицы. ─────────────────────── */

export function TableCounter({ shown, total }: { shown: number; total: number }) {
    return <span className={styles.counter}>{shown} из {total}</span>;
}

export function TableChip({ children }: { children: ReactNode }) {
    return <span className={styles.chip}>{children}</span>;
}

/** Заголовок несортируемой колонки: выглядит как остальные, но не кликается. */
export function TableColumnLabel({ children }: { children: ReactNode }) {
    return (
        <div role="columnheader" className={styles.columnLabel}>
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Стили Table**

Создать `app/(admin)/admin/components/ui/Table.module.css`.

```css
/* Лёгкое стекло на контейнере — и ни на чём внутри. */
.shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
}

.shellHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--glass-border);
}

.shellTitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.shellActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.body {
  display: grid;
  gap: 6px;
  padding: 6px;
}

.head {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 12px;
  padding: 4px 12px;
}

.headButton {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color var(--dur-fast) ease;
}

.headButton:hover { color: var(--brand); }
.headActive { color: var(--brand); }

.arrow {
  font-size: 12px;
  letter-spacing: 0;
}

.row {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 12px;
  align-items: center;
  min-height: var(--row-h);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--row-line);
  overflow: hidden;
  animation: rowIn 320ms var(--spring);
  transition:
    background var(--dur-fast) ease,
    transform var(--dur) var(--spring);
}

.row:hover {
  background: var(--glass-row-hover);
  transform: translateX(2px);
}

/* Строка с незавершённым запросом. */
.rowMuted { opacity: 0.62; }

/* Соседние строки расступаются за счёт max-height, а не прыгают. */
@keyframes rowIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.995); max-height: 0; }
  to { opacity: 1; transform: none; max-height: 200px; }
}

.cell {
  min-width: 0;
  font-size: 14px;
  color: var(--ink);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.success { background: var(--success-tint); color: var(--success); }
.danger { background: var(--danger-tint); color: var(--danger); }
.brand { background: var(--brand-tint); color: var(--brand); }

/* ── Хром шапки: счётчик, чип фильтра, подпись несортируемой колонки ── */

.counter {
  font-weight: 400;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
}

.columnLabel {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

- [ ] **Step 3: InlineEdit**

Создать `app/(admin)/admin/components/ui/InlineEdit.tsx`.

```tsx
"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./InlineEdit.module.css";

/**
 * Клик по значению превращает его в поле. Enter и blur сохраняют,
 * Esc отменяет. validate отсекает недопустимый ввод на лету
 * (например, всё, кроме цифр, в цене).
 */
export default function InlineEdit({
    value,
    label,
    onCommit,
    validate,
    children,
}: {
    value: string;
    label: string;
    onCommit: (next: string) => void;
    validate?: (raw: string) => boolean;
    children: ReactNode;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    function commit() {
        setEditing(false);
        if (draft !== value) onCommit(draft);
    }

    function cancel() {
        setDraft(value);
        setEditing(false);
    }

    if (!editing) {
        return (
            <button
                type="button"
                className={styles.trigger}
                onClick={() => {
                    setDraft(value);
                    setEditing(true);
                }}
                aria-label={`${label}: изменить`}
            >
                {children}
            </button>
        );
    }

    return (
        <input
            ref={inputRef}
            className={styles.input}
            value={draft}
            aria-label={label}
            onChange={(e) => {
                const next = e.target.value;
                if (!validate || validate(next)) setDraft(next);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                }
                if (e.key === "Escape") {
                    // Esc здесь не должен закрывать sheet или палитру.
                    e.stopPropagation();
                    cancel();
                }
            }}
        />
    );
}
```

- [ ] **Step 4: Стили InlineEdit**

Создать `app/(admin)/admin/components/ui/InlineEdit.module.css`.

```css
/* Триггер выглядит обычным текстом: подсказка появляется на ховере. */
.trigger {
  display: block;
  width: 100%;
  padding: 4px 6px;
  margin-left: -6px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: text;
  transition: background var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.trigger:hover {
  background: var(--brand-tint);
  border-color: var(--glass-border);
}

.input {
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--brand);
  border-radius: var(--radius-xs);
  background: var(--surface);
  box-shadow: var(--ring-brand);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
}

.input:focus { outline: none; }
```

- [ ] **Step 5: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): data grid with sorting and inline edit"
```

---

### Task 10: Зона загрузки изображений

**Files:**
- Create: `app/(admin)/admin/components/ui/Dropzone.tsx`, `Dropzone.module.css`

**Interfaces:**
- Consumes: `actionUploadMedia` из `app/(admin)/admin/actions.ts`, `Button` из Task 4.
- Produces:
  - `<Dropzone label: string; value: string; onChange: (url: string) => void; onError: (message: string) => void>`
  - `const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]`, `const MAX_BYTES = 5 * 1024 * 1024`

- [ ] **Step 1: Dropzone**

Создать `app/(admin)/admin/components/ui/Dropzone.tsx`.

```tsx
"use client";

import Image from "next/image";
import { type DragEvent, useId, useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { actionUploadMedia } from "../../actions";
import Button from "./Button";
import styles from "./Dropzone.module.css";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 5 * 1024 * 1024;

export default function Dropzone({
    label,
    value,
    onChange,
    onError,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    onError: (message: string) => void;
}) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const [busy, setBusy] = useState(false);

    async function upload(file: File) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            onError("Подойдёт JPG, PNG или WebP");
            return;
        }
        if (file.size > MAX_BYTES) {
            onError("Файл тяжелее 5 МБ");
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const url = await actionUploadMedia(fd);
            if (!url) {
                onError("Не удалось загрузить изображение");
                return;
            }
            onChange(url);
        } finally {
            setBusy(false);
        }
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
    }

    return (
        <div className={styles.field}>
            <span className={styles.label} id={`${inputId}-label`}>{label}</span>
            <div
                className={`${styles.zone} ${over ? styles.over : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
            >
                {value ? (
                    <Image
                        src={value}
                        alt=""
                        width={118}
                        height={118}
                        className={styles.preview}
                        unoptimized
                    />
                ) : (
                    <span aria-hidden="true" className={styles.icon}><FiUploadCloud /></span>
                )}
                <div className={styles.copy}>
                    <p className={styles.hint}>
                        {busy ? "Загружаем…" : "Перетащите файл или выберите вручную"}
                    </p>
                    <p className={styles.meta}>JPG, PNG или WebP, до 5 МБ</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    busyLabel="Загружаем…"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={`${inputId}-label`}
                >
                    Выбрать файл
                </Button>
                {/* Настоящий input скрыт, но остаётся в потоке — им пользуется клавиатура. */}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    className={styles.input}
                    accept={ACCEPTED_TYPES.join(",")}
                    disabled={busy}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                        e.target.value = "";
                    }}
                />
                {busy ? <span aria-hidden="true" className={styles.progress} /> : null}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Стили Dropzone**

Создать `app/(admin)/admin/components/ui/Dropzone.module.css`.

```css
.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.zone {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 2px dashed var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  transition:
    border-color var(--dur-fast) ease,
    background var(--dur-fast) ease,
    transform var(--dur) var(--spring);
}

.over {
  border-color: var(--brand);
  background: var(--brand-tint);
  transform: scale(1.01);
}

.preview {
  flex: none;
  width: 118px;
  height: 118px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: var(--brand-tint);
  color: var(--brand);
  font-size: 22px;
}

.copy { flex: 1; min-width: 0; }

.hint {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--ink-soft);
}

/* Поле остаётся достижимым с клавиатуры: не display:none. */
.input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 8px;
  width: 40%;
  border-radius: 999px;
  background: var(--glass-primary);
  animation: slide 1.2s ease-in-out infinite;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(280%); }
}
```

- [ ] **Step 3: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add "app/(admin)/admin/components/ui"
git commit -m "feat(admin): drag-and-drop image upload with validation"
```

---

## Каркас (Tasks 11–13)

### Task 11: Провайдер данных админки

**Files:**
- Create: `app/(admin)/admin/components/data/AdminDataProvider.tsx`

**Interfaces:**
- Consumes: экшены из `app/(admin)/admin/actions.ts`; `applyOp`, `commitOp`, `nextTempId`, `Pending`, `CollectionOp` из `lib/admin/optimistic.ts` (Task 3); `useToast` из Task 8.
- Produces:
  - `<AdminDataProvider>{children}</AdminDataProvider>`
  - `useAdminData(): AdminData`
  - `type SaveState = "idle" | "draft" | "saving" | "saved" | "error"`
  - `type AdminData = { services: Pending<Service>[]; doctors: Pending<Doctor>[]; loading: boolean; save: SaveState; setSave: (s: SaveState) => void; refresh: () => Promise<void>; createService: (p: ServicePayload) => void; patchService: (id: number, p: Partial<ServicePayload>) => void; createDoctor: (p: DoctorPayload) => void; patchDoctor: (id: number, p: Partial<DoctorPayload>) => void }`

Один источник данных на всю админку: из него берут счётчики сайдбара, плитки Обзора, палитра ⌘K и обе таблицы. Иначе те же два запроса ушли бы четыре раза.

- [ ] **Step 1: Провайдер**

Создать `app/(admin)/admin/components/data/AdminDataProvider.tsx`.

```tsx
"use client";

import {
    type ReactNode,
    createContext,
    useContext,
    useEffect,
    useOptimistic,
    useState,
    useTransition,
} from "react";
import type { Doctor, DoctorPayload, Service, ServicePayload } from "@/lib/types";
import {
    type CollectionOp,
    type Pending,
    applyOp,
    commitOp,
    nextTempId,
} from "@/lib/admin/optimistic";
import {
    actionCreateDoctor,
    actionCreateService,
    actionListAllDoctors,
    actionListAllServices,
    actionPatchDoctor,
    actionPatchService,
} from "../../actions";
import { useToast } from "../ui/ToastProvider";

export type SaveState = "idle" | "draft" | "saving" | "saved" | "error";

export type AdminData = {
    services: Pending<Service>[];
    doctors: Pending<Doctor>[];
    loading: boolean;
    save: SaveState;
    setSave: (s: SaveState) => void;
    refresh: () => Promise<void>;
    createService: (p: ServicePayload) => void;
    patchService: (id: number, p: Partial<ServicePayload>) => void;
    createDoctor: (p: DoctorPayload) => void;
    patchDoctor: (id: number, p: Partial<DoctorPayload>) => void;
};

const AdminDataContext = createContext<AdminData | null>(null);

export function useAdminData(): AdminData {
    const ctx = useContext(AdminDataContext);
    if (!ctx) throw new Error("useAdminData вызван вне AdminDataProvider");
    return ctx;
}

export default function AdminDataProvider({ children }: { children: ReactNode }) {
    const { push } = useToast();
    const [baseServices, setBaseServices] = useState<Service[]>([]);
    const [baseDoctors, setBaseDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [save, setSave] = useState<SaveState>("idle");
    const [, startTransition] = useTransition();

    // При провале транзакции useOptimistic сам отбрасывает оптимистичное
    // значение — отдельный откат писать не нужно, нужен только тост.
    const [services, addServiceOp] = useOptimistic(
        baseServices as Pending<Service>[],
        applyOp<Service>,
    );
    const [doctors, addDoctorOp] = useOptimistic(
        baseDoctors as Pending<Doctor>[],
        applyOp<Doctor>,
    );

    async function refresh() {
        setLoading(true);
        try {
            const [nextServices, nextDoctors] = await Promise.all([
                actionListAllServices(),
                actionListAllDoctors(),
            ]);
            setBaseServices(nextServices);
            setBaseDoctors(nextDoctors);
        } catch {
            push({ tone: "error", title: "Не удалось загрузить данные", action: { label: "Повторить", onClick: () => void refresh() } });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
        // Загрузка один раз при монтировании каркаса.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function fail(title: string, retry: () => void) {
        setSave("error");
        push({ tone: "error", title, action: { label: "Повторить", onClick: retry } });
    }

    function createService(payload: ServicePayload) {
        const op: CollectionOp<Service> = {
            kind: "create",
            tempId: nextTempId(baseServices),
            draft: payload,
        };
        setSave("saving");
        startTransition(async () => {
            addServiceOp(op);
            const saved = await actionCreateService(payload);
            if (!saved) return fail("Не удалось создать услугу", () => createService(payload));
            setBaseServices((prev) => commitOp(prev, op, saved));
            setSave("saved");
        });
    }

    function patchService(id: number, patch: Partial<ServicePayload>) {
        const op: CollectionOp<Service> = { kind: "update", id, patch };
        setSave("saving");
        startTransition(async () => {
            addServiceOp(op);
            const saved = await actionPatchService(id, patch);
            if (!saved) return fail("Не удалось сохранить услугу", () => patchService(id, patch));
            setBaseServices((prev) => commitOp(prev, op, saved));
            setSave("saved");
        });
    }

    function createDoctor(payload: DoctorPayload) {
        const op: CollectionOp<Doctor> = {
            kind: "create",
            tempId: nextTempId(baseDoctors),
            draft: payload,
        };
        setSave("saving");
        startTransition(async () => {
            addDoctorOp(op);
            const saved = await actionCreateDoctor(payload);
            if (!saved) return fail("Не удалось добавить врача", () => createDoctor(payload));
            setBaseDoctors((prev) => commitOp(prev, op, saved));
            setSave("saved");
        });
    }

    function patchDoctor(id: number, patch: Partial<DoctorPayload>) {
        const op: CollectionOp<Doctor> = { kind: "update", id, patch };
        setSave("saving");
        startTransition(async () => {
            addDoctorOp(op);
            const saved = await actionPatchDoctor(id, patch);
            if (!saved) return fail("Не удалось сохранить врача", () => patchDoctor(id, patch));
            setBaseDoctors((prev) => commitOp(prev, op, saved));
            setSave("saved");
        });
    }

    // Значение пересоздаётся каждый рендер — потребителей единицы,
    // и ни один не завязан на идентичность функций.
    const value: AdminData = {
        services,
        doctors,
        loading,
        save,
        setSave,
        refresh,
        createService,
        patchService,
        createDoctor,
        patchDoctor,
    };

    return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок. Если `useOptimistic` ругается на сигнатуру редьюсера — проверить, что `applyOp` экспортирован как generic-функция и подставлен как `applyOp<Service>`, а не вызван.

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add "app/(admin)/admin/components/data"
git commit -m "feat(admin): data provider with optimistic mutations"
```

---

### Task 12: Сайдбар

**Files:**
- Create: `app/(admin)/admin/components/shell/Sidebar.tsx`, `Sidebar.module.css`

**Interfaces:**
- Consumes: `useAdminData` (Task 11), `Button` (Task 4).
- Produces: `<Sidebar />` — сам берёт активный маршрут из `usePathname()`, счётчики из контекста, состояние сворачивания из `localStorage` по ключу `admin:sidebar`.

Разделы: Обзор `/admin`, Услуги `/admin/services`, Врачи `/admin/doctors`. «Медиа» нет — см. решение 2 в Global Constraints.

- [ ] **Step 1: Сайдбар**

Создать `app/(admin)/admin/components/shell/Sidebar.tsx`.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { FiChevronLeft, FiGrid, FiLogOut, FiPackage, FiUsers } from "react-icons/fi";
import Button from "../ui/Button";
import { useAdminData } from "../data/AdminDataProvider";
import styles from "./Sidebar.module.css";

const COLLAPSE_KEY = "admin:sidebar";
/** Шаг пилюли = высота пункта (46) + зазор (6). */
const ITEM_STEP = 52;

const ITEMS = [
    { href: "/admin", label: "Обзор", Icon: FiGrid },
    { href: "/admin/services", label: "Услуги", Icon: FiPackage },
    { href: "/admin/doctors", label: "Врачи", Icon: FiUsers },
] as const;

const HOTKEYS = [
    ["⌘K", "поиск"],
    ["/", "фокус в поиск"],
    ["Esc", "закрыть"],
    ["⌘S", "сохранить"],
    ["⌘↵", "отправить"],
] as const;

export default function Sidebar() {
    const pathname = usePathname();
    const { services, doctors } = useAdminData();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    }, []);

    function toggle() {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    }

    const counts: Record<string, number | null> = {
        "/admin": null,
        "/admin/services": services.length,
        "/admin/doctors": doctors.length,
    };

    // Самый длинный совпадающий путь: /admin/services не должен подсвечивать «Обзор».
    const activeIndex = ITEMS.reduce((best, item, index) => {
        const match = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return match && item.href.length >= ITEMS[best].href.length ? index : best;
    }, 0);

    async function logout() {
        await fetch("/api/logout", { method: "POST", credentials: "include", cache: "no-store" });
        window.location.href = "/login";
    }

    return (
        <nav
            aria-label="Разделы админки"
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
        >
            <div className={styles.brand}>
                <span aria-hidden="true" className={styles.logo}>П</span>
                <span className={styles.brandText}>
                    <span className={styles.brandName}>Премиум</span>
                    <span className={styles.brandKicker}>CMS</span>
                </span>
                <button
                    type="button"
                    className={styles.collapseButton}
                    onClick={toggle}
                    aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
                    aria-expanded={!collapsed}
                >
                    <FiChevronLeft aria-hidden="true" className={styles.chevron} />
                </button>
            </div>

            <div className={styles.items}>
                {/* Пилюля перетекает между пунктами, а не перескакивает. */}
                <span
                    aria-hidden="true"
                    className={styles.pill}
                    style={{ "--pill-y": `${activeIndex * ITEM_STEP}px` } as CSSProperties}
                />
                {ITEMS.map(({ href, label, Icon }) => {
                    const active = ITEMS[activeIndex].href === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`${styles.item} ${active ? styles.itemActive : ""}`}
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon aria-hidden="true" className={styles.itemIcon} />
                            <span className={styles.itemLabel}>{label}</span>
                            {counts[href] !== null ? (
                                <span className={styles.count}>{counts[href]}</span>
                            ) : null}
                        </Link>
                    );
                })}
            </div>

            <div className={styles.hotkeys}>
                {HOTKEYS.map(([keys, what]) => (
                    <span key={keys} className={styles.hotkeyRow}>
                        <kbd className={styles.kbd}>{keys}</kbd>
                        <span className={styles.hotkeyWhat}>{what}</span>
                    </span>
                ))}
            </div>

            <div className={styles.user}>
                <span aria-hidden="true" className={styles.avatar}>А</span>
                <span className={styles.userText}>
                    <span className={styles.userName}>Администратор</span>
                    <span className={styles.userRole}>Управление контентом</span>
                </span>
                <Button
                    variant="quiet"
                    size="icon"
                    className={styles.logout}
                    onClick={() => void logout()}
                    aria-label="Выйти из админки"
                >
                    <FiLogOut aria-hidden="true" />
                </Button>
            </div>
        </nav>
    );
}
```

- [ ] **Step 2: Стили сайдбара**

Создать `app/(admin)/admin/components/shell/Sidebar.module.css`.

```css
.sidebar {
  flex: none;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: var(--sidebar-w);
  padding: 18px 12px;
  border-right: 1px solid var(--glass-dark-border);
  background: var(--glass-dark-bg-nav);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen);
  color: var(--on-dark);
  transition: width var(--dur-slow) var(--spring);
}

.collapsed { width: var(--sidebar-w-collapsed); }

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}

.logo {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: var(--glass-primary);
  box-shadow: var(--glass-sheen);
  color: var(--surface);
  font-family: var(--font-head);
  font-size: 17px;
}

.brandText {
  flex: 1;
  min-width: 0;
  display: grid;
}

.brandName {
  font-size: 15px;
  font-weight: 600;
  color: var(--on-dark);
}

.brandKicker {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--on-dark-soft);
}

.collapseButton {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--glass-dark-border);
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--on-dark-soft);
  cursor: pointer;
  transition: background var(--dur-fast) ease;
}

.collapseButton:hover { background: var(--pill-fill); }

.chevron {
  transition: transform var(--dur-slow) var(--spring);
  transform: rotate(-45deg);
}

.collapsed .chevron { transform: rotate(135deg); }

.items {
  position: relative;
  display: grid;
  gap: 6px;
  align-content: start;
}

/* Один абсолютный слой на весь список: перетекает по --pill-y. */
.pill {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 46px;
  border-radius: var(--radius-sm);
  background: var(--pill-fill);
  box-shadow: var(--glass-sheen);
  transform: translateY(var(--pill-y, 0));
  transition: transform var(--dur-slow) var(--spring);
}

.item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--on-dark-soft);
  font-size: 14px;
  text-decoration: none;
  transition: color var(--dur-fast) ease;
}

.item:hover { color: var(--on-dark); }

.itemActive {
  color: var(--on-dark);
  font-weight: 600;
}

.itemIcon { flex: none; font-size: 18px; }

.itemLabel { flex: 1; min-width: 0; }

.count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--on-dark-soft);
}

.hotkeys {
  display: grid;
  gap: 6px;
  padding: 0 8px;
}

.hotkeyRow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--on-dark-soft);
}

.kbd {
  min-width: 30px;
  padding: 2px 5px;
  border: 1px solid var(--glass-dark-border);
  border-radius: var(--radius-xs);
  font-family: var(--font-body);
  font-size: 10px;
  text-align: center;
}

.user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}

.avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--brand-deep);
  color: var(--brass-bright);
  font-weight: 600;
}

.userText { flex: 1; min-width: 0; display: grid; }

.userName {
  font-size: 13px;
  font-weight: 600;
  color: var(--on-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.userRole {
  font-size: 11px;
  color: var(--on-dark-soft);
}

.logout { color: var(--on-dark-soft); }
.logout:hover { background: var(--danger-soft); color: var(--on-dark); }

/* Свёрнутый вид: остаются только иконки и логотип. */
.collapsed .brandText,
.collapsed .itemLabel,
.collapsed .count,
.collapsed .hotkeys,
.collapsed .userText,
.collapsed .logout {
  display: none;
}

.collapsed .item { justify-content: center; padding: 0; }
.collapsed .brand { flex-direction: column; gap: 8px; }
```

- [ ] **Step 3: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Коммит**

```bash
git add "app/(admin)/admin/components/shell"
git commit -m "feat(admin): glass sidebar with flowing active pill"
```

---

### Task 13: Топбар, каркас и первый живой экран

Самая крупная задача плана: старый и новый каркас не могут сосуществовать. `admin/page.tsx` — единственный потребитель `ServiceManager` и `DoctorManager`, поэтому его переписывание и удаление старых файлов происходят здесь же.

**Files:**
- Create: `app/(admin)/admin/components/shell/AdminUiProvider.tsx`
- Create: `app/(admin)/admin/components/shell/SaveStatus.tsx`, `SaveStatus.module.css`
- Create: `app/(admin)/admin/components/shell/Topbar.tsx`, `Topbar.module.css`
- Create: `app/(admin)/admin/layout.tsx`, `app/(admin)/admin/layout.module.css`
- Create: `app/(admin)/admin/overview.module.css`
- Modify: `app/(admin)/layout.tsx` (весь файл)
- Modify: `app/(admin)/admin/page.tsx` (весь файл — становится Обзором)
- Delete: `app/(admin)/admin/components/header/AdminHeader.tsx`, `app/(admin)/admin/admin.module.css`, `app/(admin)/admin/components/ServiceManager.tsx`, `app/(admin)/admin/components/DoctorManager.tsx`

**Interfaces:**
- Consumes: `AdminDataProvider`/`useAdminData` (Task 11), `Sidebar` (Task 12), `ToastProvider` (Task 8), `GlassCard`/`Button` (Task 4), `countAttention`/`serviceBadge`/`doctorBadge` (Task 2), `A11yToggle` из `app/(site)/components/A11yToggle.tsx`.
- Produces:
  - `<AdminUiProvider>` и `useAdminUi(): AdminUi`, где
    `type AdminUi = { query: string; setQuery: (v: string) => void; paletteOpen: boolean; setPaletteOpen: (v: boolean) => void; sheetOpen: boolean; setSheetOpen: (v: boolean) => void; modalOpen: boolean; setModalOpen: (v: boolean) => void; searchRef: RefObject<HTMLInputElement | null>; formSubmit: (() => void) | null; setFormSubmit: (fn: (() => void) | null) => void }`
  - `<SaveStatus state: SaveState />`
  - `<Topbar />` — раздел для крошек и подписи поиска определяет сам из `usePathname()`, состояние сохранения берёт из `useAdminData()`.

- [ ] **Step 1: AdminUiProvider**

Создать `app/(admin)/admin/components/shell/AdminUiProvider.tsx`.

```tsx
"use client";

import {
    type ReactNode,
    type RefObject,
    createContext,
    useContext,
    useRef,
    useState,
} from "react";

export type AdminUi = {
    /** Строка фильтра текущего списка. */
    query: string;
    setQuery: (v: string) => void;
    paletteOpen: boolean;
    setPaletteOpen: (v: boolean) => void;
    /** Открыт ли sheet — по нему содержимое уходит в блюр. */
    sheetOpen: boolean;
    setSheetOpen: (v: boolean) => void;
    modalOpen: boolean;
    setModalOpen: (v: boolean) => void;
    /** Поле поиска в топбаре: на него ведёт «/». */
    searchRef: RefObject<HTMLInputElement | null>;
    /** Отправка открытой формы: на неё ведут ⌘S и ⌘↵. */
    formSubmit: (() => void) | null;
    setFormSubmit: (fn: (() => void) | null) => void;
};

const AdminUiContext = createContext<AdminUi | null>(null);

export function useAdminUi(): AdminUi {
    const ctx = useContext(AdminUiContext);
    if (!ctx) throw new Error("useAdminUi вызван вне AdminUiProvider");
    return ctx;
}

export default function AdminUiProvider({ children }: { children: ReactNode }) {
    const [query, setQuery] = useState("");
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [formSubmit, setFormSubmitState] = useState<(() => void) | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // setState с функцией трактует её как updater — обёртка обязательна.
    const setFormSubmit = (fn: (() => void) | null) => setFormSubmitState(() => fn);

    const value: AdminUi = {
        query,
        setQuery,
        paletteOpen,
        setPaletteOpen,
        sheetOpen,
        setSheetOpen,
        modalOpen,
        setModalOpen,
        searchRef,
        formSubmit,
        setFormSubmit,
    };

    return <AdminUiContext.Provider value={value}>{children}</AdminUiContext.Provider>;
}
```

- [ ] **Step 2: SaveStatus**

Создать `app/(admin)/admin/components/shell/SaveStatus.tsx`.

```tsx
import type { SaveState } from "../data/AdminDataProvider";
import styles from "./SaveStatus.module.css";

const COPY: Record<SaveState, string> = {
    idle: "Все изменения сохранены",
    draft: "Черновик сохранён",
    saving: "Сохраняем…",
    saved: "Сохранено",
    error: "Ошибка сохранения",
};

/** Живёт в топбаре и озвучивается вежливо: не перебивает ввод. */
export default function SaveStatus({ state }: { state: SaveState }) {
    return (
        <p role="status" aria-live="polite" className={`${styles.status} ${styles[state]}`}>
            <span aria-hidden="true" className={styles.dot} />
            {COPY[state]}
        </p>
    );
}
```

- [ ] **Step 3: Стили SaveStatus**

Создать `app/(admin)/admin/components/shell/SaveStatus.module.css`.

```css
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.idle { color: var(--ink-soft); }
.draft { color: var(--ink-soft); background: var(--brand-tint); }
.saving { color: var(--brand); background: var(--brand-tint); }
.saved { color: var(--success); background: var(--success-tint); }
.error { color: var(--danger); background: var(--danger-tint); }

/* Точка пульсирует только пока запрос в полёте. */
.saving .dot { animation: pulse 1.1s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.7); }
}
```

- [ ] **Step 4: Topbar**

Создать `app/(admin)/admin/components/shell/Topbar.tsx`.

```tsx
"use client";

import { usePathname } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import A11yToggle from "@/app/(site)/components/A11yToggle";
import { useAdminData } from "../data/AdminDataProvider";
import { useAdminUi } from "./AdminUiProvider";
import SaveStatus from "./SaveStatus";
import styles from "./Topbar.module.css";

const SECTIONS: { prefix: string; label: string }[] = [
    { prefix: "/admin/services", label: "Услуги" },
    { prefix: "/admin/doctors", label: "Врачи" },
    { prefix: "/admin", label: "Обзор" },
];

export default function Topbar() {
    const pathname = usePathname();
    const { save } = useAdminData();
    const { query, setQuery, searchRef, setPaletteOpen } = useAdminUi();

    const section = SECTIONS.find((s) => pathname.startsWith(s.prefix))?.label ?? "Обзор";

    return (
        <header className={styles.topbar}>
            <nav aria-label="Хлебные крошки" className={styles.crumbs}>
                <span className={styles.crumbRoot}>Админка</span>
                <span aria-hidden="true" className={styles.slash}>/</span>
                <span aria-current="page" className={styles.crumbLeaf}>{section}</span>
            </nav>

            <div className={styles.right}>
                {/* Геометрия — из Searchbar.module.css витрины: капсула расширяется пружиной. */}
                <div className={styles.search}>
                    <FiSearch aria-hidden="true" className={styles.searchIcon} />
                    <input
                        ref={searchRef}
                        type="search"
                        className={styles.searchInput}
                        placeholder={`Поиск в разделе «${section}»`}
                        aria-label={`Поиск в разделе «${section}»`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="button"
                        className={styles.paletteHint}
                        onClick={() => setPaletteOpen(true)}
                        aria-label="Открыть палитру команд"
                    >
                        <kbd className={styles.kbd}>⌘K</kbd>
                    </button>
                </div>

                <SaveStatus state={save} />

                <A11yToggle className={styles.a11y} />
            </div>
        </header>
    );
}
```

- [ ] **Step 5: Стили Topbar**

Создать `app/(admin)/admin/components/shell/Topbar.module.css`.

```css
/* Плотное стекло: под топбаром прокручивается список. */
.topbar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: var(--topbar-h);
  padding: 0 22px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), 0 10px 24px -20px rgba(var(--scrim), 0.5);
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  min-width: 0;
}

.crumbRoot { color: var(--ink-soft); }
.slash { color: var(--ink-soft); }
.crumbLeaf { font-weight: 600; color: var(--ink); }

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  height: 40px;
  padding: 0 8px 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  background: var(--glass-bg);
  box-shadow: var(--glass-sheen);
  transition:
    width var(--dur-slow) var(--spring),
    background var(--dur-fast) ease,
    box-shadow var(--dur) ease;
}

.search:focus-within {
  width: 340px;
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-sheen), var(--ring-brand);
}

.searchIcon {
  flex: none;
  color: var(--brand);
  font-size: 16px;
}

.searchInput {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: none;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
}

.searchInput:focus { outline: none; }

/* Убираем нативный крестик Safari — он ломает капсулу. */
.searchInput::-webkit-search-cancel-button { appearance: none; }

.paletteHint {
  flex: none;
  border: 0;
  padding: 0;
  background: none;
  cursor: pointer;
}

.kbd {
  padding: 3px 6px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--ink-soft);
  font-family: var(--font-body);
  font-size: 11px;
}

/* A11yToggle приходит с витрины без своих стилей — оформляем здесь. */
.a11y {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  background: var(--glass-bg);
  box-shadow: var(--glass-sheen);
  color: var(--brand);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--dur-fast) ease;
}

.a11y:hover { background: var(--glass-bg-strong); }
```

- [ ] **Step 6: Каркас `admin/layout.tsx`**

Создать `app/(admin)/admin/layout.tsx`. Порядок провайдеров важен: `ToastProvider` снаружи, потому что `AdminDataProvider` вызывает `useToast`.

```tsx
"use client";

import type { ReactNode } from "react";
import ToastProvider from "./components/ui/ToastProvider";
import AdminDataProvider from "./components/data/AdminDataProvider";
import AdminUiProvider, { useAdminUi } from "./components/shell/AdminUiProvider";
import Sidebar from "./components/shell/Sidebar";
import Topbar from "./components/shell/Topbar";
import styles from "./layout.module.css";

/** Уводит содержимое в глубину, когда открыт sheet. */
function Content({ children }: { children: ReactNode }) {
    const { sheetOpen } = useAdminUi();
    return (
        <div className={`${styles.column} ${sheetOpen ? styles.recessed : ""}`}>
            <Topbar />
            <main className={styles.main}>{children}</main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AdminDataProvider>
                <AdminUiProvider>
                    <div className={styles.shell}>
                        <Sidebar />
                        <Content>{children}</Content>
                    </div>
                </AdminUiProvider>
            </AdminDataProvider>
        </ToastProvider>
    );
}
```

- [ ] **Step 7: Стили каркаса**

Создать `app/(admin)/admin/layout.module.css`. Фон прозрачный — сквозь него видны глобальные обои `body::before`.

```css
.shell {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}

.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  transition: filter var(--dur-slow) var(--spring), transform var(--dur-slow) var(--spring);
}

/* Sheet открыт: содержимое отъезжает по глубине, а не пропадает. */
.recessed {
  filter: blur(3px);
  transform: scale(0.994);
}

.main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 22px 40px;
}
```

- [ ] **Step 8: Голая обёртка группы**

Заменить содержимое `app/(admin)/layout.tsx` целиком. Инлайн-стиль `paddingTop: 70` и `AdminHeader` уходят: `/admin` строит свой каркас, `/login` — свой центрированный экран.

```tsx
/**
 * Группа (admin) не добавляет ни шапки, ни отступов:
 * /admin рисует собственный каркас, /login — центрированную карточку.
 */
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
    return children;
}
```

- [ ] **Step 9: Экран «Обзор»**

Заменить содержимое `app/(admin)/admin/page.tsx` целиком. Метрики только настоящие: количество записей и сколько из них требуют внимания.

```tsx
"use client";

import Link from "next/link";
import { countAttention, doctorBadge, serviceBadge } from "@/lib/admin/badges";
import GlassCard from "./components/ui/GlassCard";
import { SkeletonBar } from "./components/ui/Skeleton";
import { useAdminData } from "./components/data/AdminDataProvider";
import styles from "./overview.module.css";

export default function OverviewPage() {
    const { services, doctors, loading } = useAdminData();

    const servicesAttention = countAttention(services, (s) => serviceBadge(s, false));
    const doctorsAttention = countAttention(doctors, (d) => doctorBadge(d, false));

    const tiles = [
        {
            href: "/admin/services",
            title: "Услуг на сайте",
            value: services.length,
            note: servicesAttention > 0
                ? `${servicesAttention} требуют внимания`
                : "Все заполнены",
        },
        {
            href: "/admin/doctors",
            title: "Врачей на сайте",
            value: doctors.length,
            note: doctorsAttention > 0 ? `${doctorsAttention} без фото` : "Все с фото",
        },
    ];

    return (
        <div className={styles.page}>
            <header className={styles.head}>
                <h1 className={styles.title}>Управление контентом</h1>
                <p className={styles.subtitle}>
                    Услуги и врачи клиники «Премиум». Изменения попадают на сайт
                    в течение часа — страницы обновляются по расписанию.
                </p>
            </header>

            <div className={styles.tiles}>
                {tiles.map((tile) => (
                    <GlassCard key={tile.href} glow className={styles.tile}>
                        <span className={styles.tileTitle}>{tile.title}</span>
                        {loading ? (
                            <span className={styles.tileLoading}><SkeletonBar width="88px" /></span>
                        ) : (
                            <span className={styles.tileValue}>{tile.value}</span>
                        )}
                        <span className={styles.tileNote}>{loading ? "Загружаем…" : tile.note}</span>
                        <Link href={tile.href} className={styles.tileLink}>Открыть раздел</Link>
                    </GlassCard>
                ))}
            </div>

            <div className={styles.actions}>
                {/* ?new=1 открывает sheet создания сразу на нужном маршруте. */}
                <Link href="/admin/services?new=1" className={styles.action}>
                    <span className={styles.actionTitle}>Создать услугу</span>
                    <span className={styles.actionNote}>Название, слаг, цена и фото</span>
                </Link>
                <Link href="/admin/doctors?new=1" className={styles.action}>
                    <span className={styles.actionTitle}>Добавить врача</span>
                    <span className={styles.actionNote}>Фото, имя, специализация</span>
                </Link>
            </div>

            <p className={styles.footer}>
                <a href="/" target="_blank" rel="noreferrer">Открыть сайт клиники</a>
            </p>
        </div>
    );
}
```

- [ ] **Step 10: Стили Обзора**

Создать `app/(admin)/admin/overview.module.css`.

```css
.page {
  display: grid;
  gap: 20px;
  max-width: 900px;
}

.head { display: grid; gap: 6px; }

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 30px;
  color: var(--ink);
}

.subtitle {
  margin: 0;
  max-width: 58ch;
  font-size: 14px;
  color: var(--ink-soft);
  text-wrap: pretty;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.tile {
  display: grid;
  gap: 2px;
  padding: 18px 20px 16px;
  transition: transform var(--dur) var(--spring), box-shadow var(--dur) ease;
}

.tile:hover {
  transform: translateY(-3px);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
}

.tileTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

/* Цифры табличные — не прыгают при обновлении. */
.tileValue {
  font-family: var(--font-head);
  font-size: 44px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.tileLoading { display: block; padding: 16px 0; }

.tileNote {
  font-size: 12px;
  color: var(--ink-soft);
}

.tileLink {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  text-decoration: none;
}

.tileLink:hover { text-decoration: underline; }

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action {
  display: grid;
  gap: 2px;
  padding: 16px 18px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  box-shadow: var(--glass-sheen);
  text-decoration: none;
  transition: background var(--dur-fast) ease, transform var(--dur) var(--spring);
}

.action:hover {
  background: var(--glass-bg-strong);
  transform: translateY(-2px);
}

.actionTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.actionNote {
  font-size: 12px;
  color: var(--ink-soft);
}

.footer {
  margin: 0;
  font-size: 13px;
}
```

- [ ] **Step 11: Удалить старый каркас**

```bash
git rm "app/(admin)/admin/components/header/AdminHeader.tsx" \
       "app/(admin)/admin/admin.module.css" \
       "app/(admin)/admin/components/ServiceManager.tsx" \
       "app/(admin)/admin/components/DoctorManager.tsx"
```

- [ ] **Step 12: Убедиться, что ссылок на удалённое не осталось**

Run: `grep -rn "AdminHeader\|admin.module.css\|ServiceManager\|DoctorManager" app/ lib/`
Expected: пустой вывод.

- [ ] **Step 13: Проверить типы, тесты и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: всё зелёное.

- [ ] **Step 14: Посмотреть в браузере**

Run: `npm run dev`, открыть `http://localhost:3000/admin`.

Что должно быть видно:
- Сайдбар слева, тёмное стекло, три пункта; пилюля стоит на «Обзор».
- Кнопка сворачивания сжимает сайдбар до 72px, шеврон разворачивается; после перезагрузки состояние сохраняется.
- Липкий топбар: крошки «Админка / Обзор», капсула поиска расширяется по фокусу, статус «Все изменения сохранены».
- Две плитки с настоящими числами; при наведении приподнимаются, блик идёт за курсором.
- Сквозь стекло видны голубые пятна обоев; интерфейс не выглядит серой плёнкой.
- Кнопка «Версия для слабовидящих» убирает стекло — всё остаётся читаемым, сайдбар становится сплошным.
- В консоли нет ошибок гидрации.

- [ ] **Step 15: Коммит**

```bash
git add -A "app/(admin)"
git commit -m "feat(admin): shell with sidebar, topbar and overview screen"
```

---

## Экраны (Tasks 14–16)

### Task 14: Раздел «Услуги»

**Files:**
- Create: `app/(admin)/admin/services/page.tsx`, `app/(admin)/admin/services/services.module.css`
- Create: `app/(admin)/admin/components/ServiceTable.tsx`, `ServiceTable.module.css`
- Create: `app/(admin)/admin/components/ServiceSheet.tsx`, `ServiceSheet.module.css`

**Interfaces:**
- Consumes: `useAdminData` (Task 11), `useAdminUi` (Task 13), `TableShell`/`TableHead`/`TableHeadCell`/`TableRow`/`TableCell`/`StatusBadge` (Task 9), `InlineEdit` (Task 9), `SkeletonRows` (Task 6), `EmptyState` (Task 6), `Sheet`/`Modal` (Task 7), `Input`/`Textarea` (Task 5), `Dropzone` (Task 10), `Button` (Task 4), `useToast` (Task 8), `validateService`/`firstErrorField`/`isPriceInput`/`SERVICE_FIELD_ORDER`/`DESCRIPTION_MAX` (Task 2), `sortRows`/`filterRows`/`toggleSort` (Task 2), `serviceBadge`/`isPending` (Tasks 2, 3), `saveDraft`/`loadDraft`/`clearDraft`/`isDirty` (Task 3).
- Produces:
  - `const SERVICE_COLS = "minmax(240px, 2fr) minmax(120px, 0.8fr) 150px 120px"`
  - `<ServiceTable services; loading; query; onOpen: (id: number) => void; onPatch: (id: number, patch: Partial<ServicePayload>) => void; onResetQuery: () => void; onCreate: () => void />`
  - `<ServiceSheet open; service: Service | null; onClose: () => void; onSubmit: (payload: ServicePayload) => void />`

- [ ] **Step 1: Таблица услуг**

Создать `app/(admin)/admin/components/ServiceTable.tsx`.

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { Service, ServicePayload } from "@/lib/types";
import { serviceBadge } from "@/lib/admin/badges";
import { type Pending, isPending } from "@/lib/admin/optimistic";
import { type SortState, filterRows, sortRows, toggleSort } from "@/lib/admin/sort";
import { isPriceInput } from "@/lib/admin/validation";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import InlineEdit from "./ui/InlineEdit";
import { SkeletonRows } from "./ui/Skeleton";
import {
    StatusBadge,
    TableCell,
    TableChip,
    TableColumnLabel,
    TableCounter,
    TableHead,
    TableHeadCell,
    TableRow,
    TableShell,
} from "./ui/Table";
import styles from "./ServiceTable.module.css";

export const SERVICE_COLS = "minmax(240px, 2fr) minmax(120px, 0.8fr) 150px 120px";

export default function ServiceTable({
    services,
    loading,
    query,
    onOpen,
    onPatch,
    onResetQuery,
    onCreate,
    onRefresh,
}: {
    services: Pending<Service>[];
    loading: boolean;
    query: string;
    onOpen: (id: number) => void;
    onPatch: (id: number, patch: Partial<ServicePayload>) => void;
    onResetQuery: () => void;
    onCreate: () => void;
    onRefresh: () => void;
}) {
    const [sort, setSort] = useState<SortState<string>>({ key: "serviceName", dir: "asc" });

    const filtered = filterRows(services, query, ["serviceName", "slug"]);
    const rows = sortRows(
        filtered,
        sort.key as keyof Pending<Service>,
        sort.dir,
        sort.key === "price" ? "number" : "text",
    );

    const title = (
        <>
            <span>Услуги</span>
            <TableCounter shown={filtered.length} total={services.length} />
            {query ? <TableChip>фильтр: {query}</TableChip> : null}
        </>
    );

    return (
        <TableShell
            title={title}
            actions={
                <>
                    <Button variant="ghost" size="sm" onClick={onRefresh} loading={loading} busyLabel="Обновляем…">
                        Обновить
                    </Button>
                    <Button variant="primary" size="sm" onClick={onCreate}>
                        Создать услугу
                    </Button>
                </>
            }
        >
            <TableHead cols={SERVICE_COLS}>
                <TableHeadCell sortKey="serviceName" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Услуга
                </TableHeadCell>
                <TableHeadCell sortKey="price" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Цена
                </TableHeadCell>
                <TableColumnLabel>Статус</TableColumnLabel>
                <TableColumnLabel>Действия</TableColumnLabel>
            </TableHead>

            {loading && services.length === 0 ? <SkeletonRows cols={SERVICE_COLS} /> : null}

            {!loading && rows.length === 0 ? (
                query ? (
                    <EmptyState
                        title="По фильтру ничего не найдено"
                        description="Проверьте написание или сбросьте фильтр — в разделе есть другие услуги."
                        action={<Button variant="ghost" onClick={onResetQuery}>Сбросить фильтр</Button>}
                    />
                ) : (
                    <EmptyState
                        title="Услуг пока нет"
                        description="Добавьте первую услугу: название, адрес страницы, цену и фотографию."
                        action={<Button variant="primary" onClick={onCreate}>Создать услугу</Button>}
                    />
                )
            ) : null}

            {rows.map((service) => {
                const pending = isPending(service);
                return (
                    <TableRow key={service.id} cols={SERVICE_COLS} muted={pending}>
                        <TableCell>
                            <div className={styles.nameCell}>
                                {service.imageSrc ? (
                                    <Image
                                        src={service.imageSrc}
                                        alt=""
                                        width={34}
                                        height={34}
                                        className={styles.thumb}
                                        unoptimized
                                    />
                                ) : (
                                    <span aria-hidden="true" className={styles.thumbEmpty}>нет</span>
                                )}
                                <div className={styles.nameText}>
                                    <InlineEdit
                                        value={service.serviceName}
                                        label={`Название услуги «${service.serviceName}»`}
                                        onCommit={(next) => onPatch(service.id, { serviceName: next })}
                                    >
                                        <span className={styles.name}>{service.serviceName}</span>
                                    </InlineEdit>
                                    <span className={styles.slug}>/services/{service.slug}</span>
                                </div>
                            </div>
                        </TableCell>

                        <TableCell>
                            <InlineEdit
                                value={String(service.price)}
                                label={`Цена услуги «${service.serviceName}»`}
                                validate={isPriceInput}
                                onCommit={(next) => onPatch(service.id, { price: Number(next || 0) })}
                            >
                                <span className={styles.price}>{service.price} ₽</span>
                            </InlineEdit>
                        </TableCell>

                        <TableCell>
                            <StatusBadge badge={serviceBadge(service, pending)} />
                        </TableCell>

                        <TableCell>
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={() => onOpen(service.id)}
                                aria-label={`Открыть услугу «${service.serviceName}»`}
                            >
                                <FiExternalLink aria-hidden="true" />
                                Открыть
                            </Button>
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableShell>
    );
}
```

- [ ] **Step 2: Стили таблицы услуг**

Создать `app/(admin)/admin/components/ServiceTable.module.css`. Счётчика, чипа и подписи колонки здесь нет — они приходят из `Table.tsx`.

```css
.nameCell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.thumb {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-xs);
  object-fit: cover;
}

.thumbEmpty {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-xs);
  background: var(--brand-tint);
  color: var(--ink-soft);
  font-size: 10px;
}

.nameText { min-width: 0; display: grid; }

.name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slug {
  padding-left: 6px;
  font-size: 12px;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
```

- [ ] **Step 3: Sheet услуги**

Создать `app/(admin)/admin/components/ServiceSheet.tsx`.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Service, ServicePayload } from "@/lib/types";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    DESCRIPTION_MAX,
    SERVICE_FIELD_ORDER,
    type FieldErrors,
    type ServiceField,
    firstErrorField,
    validateService,
} from "@/lib/admin/validation";
import Button from "./ui/Button";
import Dropzone from "./ui/Dropzone";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Sheet from "./ui/Sheet";
import Textarea from "./ui/Textarea";
import { useToast } from "./ui/ToastProvider";
import { useAdminData } from "./data/AdminDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import styles from "./ServiceSheet.module.css";

const EMPTY: ServicePayload = {
    serviceName: "",
    slug: "",
    price: 0,
    imageSrc: "",
    description: "",
    longDescription: "",
};

function toPayload(service: Service): ServicePayload {
    return {
        serviceName: service.serviceName ?? "",
        slug: service.slug ?? "",
        price: Number(service.price ?? 0),
        imageSrc: service.imageSrc ?? "",
        description: service.description ?? "",
        longDescription: service.longDescription ?? "",
    };
}

export default function ServiceSheet({
    open,
    service,
    onClose,
    onSubmit,
}: {
    open: boolean;
    service: Service | null;
    onClose: () => void;
    onSubmit: (payload: ServicePayload) => void;
}) {
    const { push } = useToast();
    const { setSave } = useAdminData();
    const { setFormSubmit, setModalOpen } = useAdminUi();
    const draftId = service ? service.id : "new";
    const initial = useMemo(() => (service ? toPayload(service) : EMPTY), [service]);

    const [form, setForm] = useState<ServicePayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<ServiceField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    // Открытие: подставляем данные записи, но восстановленный черновик важнее.
    useEffect(() => {
        if (!open) return;
        const draft = loadDraft<ServicePayload>("service", draftId);
        setForm(draft ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    // Автосохранение черновика: пользователь не теряет набранное.
    useEffect(() => {
        if (!open || !dirty) return;
        saveDraft("service", draftId, form);
        // Статус в топбаре: «Черновик сохранён» — единственное место,
        // которое выставляет состояние draft.
        setSave("draft");
    }, [open, dirty, form, draftId, setSave]);

    // Предупреждение при уходе со страницы с несохранёнными изменениями.
    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    function submit() {
        const found = validateService(form);
        setErrors(found);
        const first = firstErrorField(found, SERVICE_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            document.getElementById(`service-${first}`)?.focus();
            return;
        }
        clearDraft("service", draftId);
        onSubmit(form);
        onClose();
    }

    // ⌘S и ⌘↵ отправляют именно эту форму, пока sheet открыт.
    useEffect(() => {
        if (!open) return;
        setFormSubmit(submit);
        return () => setFormSubmit(null);
        // submit пересобирается на каждый рендер — важно значение, не идентичность
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("service", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    return (
        <>
            <Sheet
                open={open}
                title={service ? `Услуга: ${service.serviceName}` : "Новая услуга"}
                onClose={requestClose}
                footer={
                    <>
                        <span className={styles.draftHint}>
                            {dirty ? "Черновик сохраняется автоматически" : "Изменений нет"}
                        </span>
                        <Button variant="ghost" onClick={requestClose}>Отменить</Button>
                        <Button variant="primary" onClick={submit}>
                            Сохранить <kbd className={styles.kbd}>⌘S</kbd>
                        </Button>
                    </>
                }
            >
                <Input
                    id="service-serviceName"
                    label="Название"
                    required
                    value={form.serviceName}
                    error={errors.serviceName}
                    onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
                />
                <Input
                    id="service-slug"
                    label="Слаг"
                    required
                    value={form.slug}
                    error={errors.slug}
                    hint={`Адрес страницы: /services/${form.slug || "…"}`}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
                <Input
                    id="service-price"
                    label="Цена, ₽"
                    required
                    inputMode="numeric"
                    value={String(form.price)}
                    error={errors.price}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, price: Number(e.target.value.replace(/\D/g, "") || 0) }))
                    }
                />
                <Dropzone
                    label="Изображение"
                    value={form.imageSrc}
                    onChange={(url) => setForm((f) => ({ ...f, imageSrc: url }))}
                    onError={(title) => push({ tone: "error", title })}
                />
                <Textarea
                    id="service-description"
                    label="Краткое описание"
                    max={DESCRIPTION_MAX}
                    value={form.description}
                    error={errors.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <Textarea
                    id="service-longDescription"
                    label="Подробное описание"
                    value={form.longDescription}
                    onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                />
            </Sheet>

            <Modal
                open={confirmClose}
                title="Закрыть без сохранения?"
                description="Введённое останется в черновике и восстановится, когда вы вернётесь к этой записи."
                cancelLabel="Продолжить правку"
                confirmLabel="Закрыть"
                onCancel={() => {
                    setConfirmClose(false);
                    setModalOpen(false);
                }}
                onConfirm={discard}
            />
        </>
    );
}
```

- [ ] **Step 4: Стили sheet услуги**

Создать `app/(admin)/admin/components/ServiceSheet.module.css`.

```css
.draftHint {
  flex: 1;
  font-size: 12px;
  color: var(--ink-soft);
}

.kbd {
  margin-left: 6px;
  padding: 2px 5px;
  border: 1px solid var(--glass-dark-border);
  border-radius: var(--radius-xs);
  font-family: var(--font-body);
  font-size: 10px;
}
```

- [ ] **Step 5: Страница раздела**

Создать `app/(admin)/admin/services/page.tsx`.

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ServicePayload } from "@/lib/types";
import ServiceSheet from "../components/ServiceSheet";
import ServiceTable from "../components/ServiceTable";
import { useAdminData } from "../components/data/AdminDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import styles from "./services.module.css";

type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;

function ServicesScreen() {
    const { services, loading, refresh, createService, patchService } = useAdminData();
    const { query, setQuery, setSheetOpen } = useAdminUi();
    const params = useSearchParams();
    const [sheet, setSheet] = useState<SheetState>(null);

    // Обзор ведёт сюда со ?new=1 — сразу открываем форму создания.
    useEffect(() => {
        if (params.get("new") === "1") setSheet({ mode: "create" });
    }, [params]);

    // Каркас размывает содержимое, пока панель открыта.
    useEffect(() => {
        setSheetOpen(sheet !== null);
    }, [sheet, setSheetOpen]);

    // Фильтр принадлежит разделу: уходя, сбрасываем.
    useEffect(() => () => setQuery(""), [setQuery]);

    const editing =
        sheet?.mode === "edit" ? services.find((s) => s.id === sheet.id) ?? null : null;

    function submit(payload: ServicePayload) {
        if (sheet?.mode === "edit") patchService(sheet.id, payload);
        else createService(payload);
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Услуги</h1>
            <ServiceTable
                services={services}
                loading={loading}
                query={query}
                onOpen={(id) => setSheet({ mode: "edit", id })}
                onPatch={patchService}
                onResetQuery={() => setQuery("")}
                onCreate={() => setSheet({ mode: "create" })}
                onRefresh={() => void refresh()}
            />
            <ServiceSheet
                open={sheet !== null}
                service={editing}
                onClose={() => setSheet(null)}
                onSubmit={submit}
            />
        </div>
    );
}

export default function ServicesPage() {
    // useSearchParams требует границы Suspense при пререндере.
    return (
        <Suspense>
            <ServicesScreen />
        </Suspense>
    );
}
```

- [ ] **Step 6: Стили страницы**

Создать `app/(admin)/admin/services/services.module.css`.

```css
.page {
  display: grid;
  gap: 16px;
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 26px;
  color: var(--ink);
}
```

- [ ] **Step 7: Проверить типы, тесты и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: всё зелёное.

- [ ] **Step 8: Посмотреть в браузере**

Открыть `http://localhost:3000/admin/services`.

Что должно быть видно:
- Плотная таблица: миниатюра, название, слаг, цена, статус, «Открыть». Строки на белом, стекло только у контейнера.
- Ховер строки: голубая подложка и сдвиг на 2px, без рывков при быстром скролле.
- Клик по названию и по цене включает инлайн-поле; Enter сохраняет, Esc отменяет; в цену не вводятся буквы.
- Сортировка по «Услуга» и «Цена», стрелка меняется, `aria-sort` виден в инспекторе.
- Поиск в топбаре фильтрует список, счётчик «N из M» и чип фильтра обновляются; «Сбросить фильтр» работает.
- «Создать услугу» выезжает sheet справа, содержимое под ним уходит в блюр; список остаётся на месте.
- Пустая форма при «Сохранить»: тост «Проверьте форму», фокус на «Название», под полями ошибки.
- Правка с ⌘S сохраняет; строка на секунду показывает «Отправка» и приглушается; статус в топбаре проходит «Сохраняем…» → «Сохранено».
- Закрытие с несохранёнными изменениями показывает модалку; после «Продолжить правку» фокус возвращается в форму.
- Загрузка картинки перетаскиванием: рамка синеет, появляется превью.
- В `data-a11y="1"` таблица и sheet читаемы на сплошных поверхностях.

- [ ] **Step 9: Коммит**

```bash
git add "app/(admin)/admin/services" "app/(admin)/admin/components"
git commit -m "feat(admin): services section with data grid and edit sheet"
```

---

### Task 15: Раздел «Врачи»

Структурно повторяет Task 14, но колонки, поля и правила другие: специализация инлайн не правится (она открывает sheet), у врача нет цены и слага, биография ограничена 400 символами.

**Files:**
- Create: `app/(admin)/admin/doctors/page.tsx`, `app/(admin)/admin/doctors/doctors.module.css`
- Create: `app/(admin)/admin/components/DoctorTable.tsx`, `DoctorTable.module.css`
- Create: `app/(admin)/admin/components/DoctorSheet.tsx`

**Interfaces:**
- Consumes: то же, что Task 14, плюс `validateDoctor`, `DOCTOR_FIELD_ORDER`, `BIO_MAX`, `doctorBadge`.
- Produces:
  - `const DOCTOR_COLS = "minmax(240px, 2fr) minmax(180px, 1.2fr) 150px 120px"`
  - `<DoctorTable doctors; loading; query; onOpen; onPatch; onResetQuery; onCreate; onRefresh />`
  - `<DoctorSheet open; doctor: Doctor | null; onClose; onSubmit />`

`DoctorSheet.module.css` не создаётся: панель врача переиспользует `ServiceSheet.module.css` — там всего два класса (`draftHint`, `kbd`), и дублировать их незачем.

- [ ] **Step 1: Таблица врачей**

Создать `app/(admin)/admin/components/DoctorTable.tsx`.

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { Doctor, DoctorPayload } from "@/lib/types";
import { doctorBadge } from "@/lib/admin/badges";
import { type Pending, isPending } from "@/lib/admin/optimistic";
import { type SortState, filterRows, sortRows, toggleSort } from "@/lib/admin/sort";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import InlineEdit from "./ui/InlineEdit";
import { SkeletonRows } from "./ui/Skeleton";
import {
    StatusBadge,
    TableCell,
    TableChip,
    TableColumnLabel,
    TableCounter,
    TableHead,
    TableHeadCell,
    TableRow,
    TableShell,
} from "./ui/Table";
import styles from "./DoctorTable.module.css";

export const DOCTOR_COLS = "minmax(240px, 2fr) minmax(180px, 1.2fr) 150px 120px";

/** Первая буква фамилии для аватара-заглушки, когда фото нет. */
function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
}

export default function DoctorTable({
    doctors,
    loading,
    query,
    onOpen,
    onPatch,
    onResetQuery,
    onCreate,
    onRefresh,
}: {
    doctors: Pending<Doctor>[];
    loading: boolean;
    query: string;
    onOpen: (id: number) => void;
    onPatch: (id: number, patch: Partial<DoctorPayload>) => void;
    onResetQuery: () => void;
    onCreate: () => void;
    onRefresh: () => void;
}) {
    const [sort, setSort] = useState<SortState<string>>({ key: "name", dir: "asc" });

    const filtered = filterRows(doctors, query, ["name", "specialty"]);
    const rows = sortRows(filtered, sort.key as keyof Pending<Doctor>, sort.dir, "text");

    const title = (
        <>
            <span>Врачи</span>
            <TableCounter shown={filtered.length} total={doctors.length} />
            {query ? <TableChip>фильтр: {query}</TableChip> : null}
        </>
    );

    return (
        <TableShell
            title={title}
            actions={
                <>
                    <Button variant="ghost" size="sm" onClick={onRefresh} loading={loading} busyLabel="Обновляем…">
                        Обновить
                    </Button>
                    <Button variant="primary" size="sm" onClick={onCreate}>
                        Добавить врача
                    </Button>
                </>
            }
        >
            <TableHead cols={DOCTOR_COLS}>
                <TableHeadCell sortKey="name" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Врач
                </TableHeadCell>
                <TableHeadCell sortKey="specialty" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Специализация
                </TableHeadCell>
                <TableColumnLabel>Статус</TableColumnLabel>
                <TableColumnLabel>Действия</TableColumnLabel>
            </TableHead>

            {loading && doctors.length === 0 ? <SkeletonRows cols={DOCTOR_COLS} /> : null}

            {!loading && rows.length === 0 ? (
                query ? (
                    <EmptyState
                        title="По фильтру ничего не найдено"
                        description="Проверьте написание или сбросьте фильтр — в разделе есть другие врачи."
                        action={<Button variant="ghost" onClick={onResetQuery}>Сбросить фильтр</Button>}
                    />
                ) : (
                    <EmptyState
                        title="Врачей пока нет"
                        description="Добавьте первого врача: фотографию, полное имя и специализацию."
                        action={<Button variant="primary" onClick={onCreate}>Добавить врача</Button>}
                    />
                )
            ) : null}

            {rows.map((doctor) => {
                const pending = isPending(doctor);
                return (
                    <TableRow key={doctor.id} cols={DOCTOR_COLS} muted={pending}>
                        <TableCell>
                            <div className={styles.nameCell}>
                                {doctor.imgSrc ? (
                                    <Image
                                        src={doctor.imgSrc}
                                        alt=""
                                        width={34}
                                        height={34}
                                        className={styles.thumb}
                                        unoptimized
                                    />
                                ) : (
                                    <span aria-hidden="true" className={styles.thumbEmpty}>
                                        {initial(doctor.name)}
                                    </span>
                                )}
                                <div className={styles.nameText}>
                                    <InlineEdit
                                        value={doctor.name}
                                        label={`Имя врача «${doctor.name}»`}
                                        onCommit={(next) => onPatch(doctor.id, { name: next })}
                                    >
                                        <span className={styles.name}>{doctor.name}</span>
                                    </InlineEdit>
                                    <span className={styles.bio}>
                                        {doctor.bio ? doctor.bio.slice(0, 60) : "Биография не заполнена"}
                                    </span>
                                </div>
                            </div>
                        </TableCell>

                        {/* Специализация инлайн не правится: часто длинная, правится в панели. */}
                        <TableCell>
                            <button
                                type="button"
                                className={styles.specialty}
                                onClick={() => onOpen(doctor.id)}
                            >
                                {doctor.specialty}
                            </button>
                        </TableCell>

                        <TableCell>
                            <StatusBadge badge={doctorBadge(doctor, pending)} />
                        </TableCell>

                        <TableCell>
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={() => onOpen(doctor.id)}
                                aria-label={`Открыть карточку врача «${doctor.name}»`}
                            >
                                <FiExternalLink aria-hidden="true" />
                                Открыть
                            </Button>
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableShell>
    );
}
```

- [ ] **Step 2: Стили таблицы врачей**

Создать `app/(admin)/admin/components/DoctorTable.module.css`. Счётчика, чипа и подписи колонки здесь нет — они приходят из `Table.tsx`.

```css
.nameCell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.thumb {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  object-fit: cover;
}

/* Заглушка — круг с инициалом: лица врача нет, но строка не пустует. */
.thumbEmpty {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--brand-deep);
  color: var(--brass-bright);
  font-size: 13px;
  font-weight: 600;
}

.nameText { min-width: 0; display: grid; }

.name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bio {
  padding-left: 6px;
  font-size: 12px;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.specialty {
  display: block;
  width: 100%;
  padding: 4px 6px;
  margin-left: -6px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
}

.specialty:hover {
  background: var(--brand-tint);
  color: var(--brand);
}
```

- [ ] **Step 3: Sheet врача**

Создать `app/(admin)/admin/components/DoctorSheet.tsx`.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Doctor, DoctorPayload } from "@/lib/types";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    BIO_MAX,
    DOCTOR_FIELD_ORDER,
    type DoctorField,
    type FieldErrors,
    firstErrorField,
    validateDoctor,
} from "@/lib/admin/validation";
import Button from "./ui/Button";
import Dropzone from "./ui/Dropzone";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Sheet from "./ui/Sheet";
import Textarea from "./ui/Textarea";
import { useToast } from "./ui/ToastProvider";
import { useAdminData } from "./data/AdminDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import styles from "./ServiceSheet.module.css";

const EMPTY: DoctorPayload = { imgSrc: "", name: "", specialty: "", bio: "" };

function toPayload(doctor: Doctor): DoctorPayload {
    return {
        imgSrc: doctor.imgSrc ?? "",
        name: doctor.name ?? "",
        specialty: doctor.specialty ?? "",
        bio: doctor.bio ?? "",
    };
}

export default function DoctorSheet({
    open,
    doctor,
    onClose,
    onSubmit,
}: {
    open: boolean;
    doctor: Doctor | null;
    onClose: () => void;
    onSubmit: (payload: DoctorPayload) => void;
}) {
    const { push } = useToast();
    const { setSave } = useAdminData();
    const { setFormSubmit, setModalOpen } = useAdminUi();
    const draftId = doctor ? doctor.id : "new";
    const initial = useMemo(() => (doctor ? toPayload(doctor) : EMPTY), [doctor]);

    const [form, setForm] = useState<DoctorPayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<DoctorField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    useEffect(() => {
        if (!open) return;
        const draft = loadDraft<DoctorPayload>("doctor", draftId);
        setForm(draft ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    useEffect(() => {
        if (!open || !dirty) return;
        saveDraft("doctor", draftId, form);
        setSave("draft");
    }, [open, dirty, form, draftId, setSave]);

    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    function submit() {
        const found = validateDoctor(form);
        setErrors(found);
        const first = firstErrorField(found, DOCTOR_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            document.getElementById(`doctor-${first}`)?.focus();
            return;
        }
        clearDraft("doctor", draftId);
        onSubmit(form);
        onClose();
    }

    useEffect(() => {
        if (!open) return;
        setFormSubmit(submit);
        return () => setFormSubmit(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("doctor", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    return (
        <>
            <Sheet
                open={open}
                title={doctor ? `Врач: ${doctor.name}` : "Новый врач"}
                onClose={requestClose}
                footer={
                    <>
                        <span className={styles.draftHint}>
                            {dirty ? "Черновик сохраняется автоматически" : "Изменений нет"}
                        </span>
                        <Button variant="ghost" onClick={requestClose}>Отменить</Button>
                        <Button variant="primary" onClick={submit}>
                            Сохранить <kbd className={styles.kbd}>⌘S</kbd>
                        </Button>
                    </>
                }
            >
                <Dropzone
                    label="Фото"
                    value={form.imgSrc}
                    onChange={(url) => setForm((f) => ({ ...f, imgSrc: url }))}
                    onError={(title) => push({ tone: "error", title })}
                />
                <Input
                    id="doctor-name"
                    label="Полное имя"
                    required
                    value={form.name}
                    error={errors.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                    id="doctor-specialty"
                    label="Специализация"
                    required
                    value={form.specialty}
                    error={errors.specialty}
                    onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                />
                <Textarea
                    id="doctor-bio"
                    label="Биография"
                    max={BIO_MAX}
                    value={form.bio}
                    error={errors.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
            </Sheet>

            <Modal
                open={confirmClose}
                title="Закрыть без сохранения?"
                description="Введённое останется в черновике и восстановится, когда вы вернётесь к этой записи."
                cancelLabel="Продолжить правку"
                confirmLabel="Закрыть"
                onCancel={() => {
                    setConfirmClose(false);
                    setModalOpen(false);
                }}
                onConfirm={discard}
            />
        </>
    );
}
```

- [ ] **Step 4: Страница раздела**

Создать `app/(admin)/admin/doctors/page.tsx`.

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DoctorPayload } from "@/lib/types";
import DoctorSheet from "../components/DoctorSheet";
import DoctorTable from "../components/DoctorTable";
import { useAdminData } from "../components/data/AdminDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import styles from "./doctors.module.css";

type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;

function DoctorsScreen() {
    const { doctors, loading, refresh, createDoctor, patchDoctor } = useAdminData();
    const { query, setQuery, setSheetOpen } = useAdminUi();
    const params = useSearchParams();
    const [sheet, setSheet] = useState<SheetState>(null);

    useEffect(() => {
        if (params.get("new") === "1") setSheet({ mode: "create" });
    }, [params]);

    useEffect(() => {
        setSheetOpen(sheet !== null);
    }, [sheet, setSheetOpen]);

    useEffect(() => () => setQuery(""), [setQuery]);

    const editing =
        sheet?.mode === "edit" ? doctors.find((d) => d.id === sheet.id) ?? null : null;

    function submit(payload: DoctorPayload) {
        if (sheet?.mode === "edit") patchDoctor(sheet.id, payload);
        else createDoctor(payload);
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Врачи</h1>
            <DoctorTable
                doctors={doctors}
                loading={loading}
                query={query}
                onOpen={(id) => setSheet({ mode: "edit", id })}
                onPatch={patchDoctor}
                onResetQuery={() => setQuery("")}
                onCreate={() => setSheet({ mode: "create" })}
                onRefresh={() => void refresh()}
            />
            <DoctorSheet
                open={sheet !== null}
                doctor={editing}
                onClose={() => setSheet(null)}
                onSubmit={submit}
            />
        </div>
    );
}

export default function DoctorsPage() {
    return (
        <Suspense>
            <DoctorsScreen />
        </Suspense>
    );
}
```

- [ ] **Step 5: Стили страницы**

Создать `app/(admin)/admin/doctors/doctors.module.css`.

```css
.page {
  display: grid;
  gap: 16px;
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 26px;
  color: var(--ink);
}
```

- [ ] **Step 6: Проверить типы, тесты и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: всё зелёное.

- [ ] **Step 7: Посмотреть в браузере**

Открыть `http://localhost:3000/admin/doctors`.

Что должно быть видно:
- Круглые аватары; без фото — круг с инициалом на тёмно-синем.
- Инлайн-правка имени работает, клик по специализации открывает панель, а не поле.
- Пилюля в сайдбаре перетекла на «Врачи», счётчик совпадает с числом строк.
- Сортировка по имени и по специализации, обе по-русски.
- Добавление врача: строка появляется сверху с бейджем «Отправка», затем становится обычной.
- Биография больше 400 символов краснит счётчик и не даёт сохранить.

- [ ] **Step 8: Коммит**

```bash
git add "app/(admin)/admin/doctors" "app/(admin)/admin/components"
git commit -m "feat(admin): doctors section with data grid and edit sheet"
```

---

### Task 16: Палитра ⌘K и глобальные хоткеи

**Files:**
- Create: `app/(admin)/admin/components/ui/CommandPalette.tsx`, `CommandPalette.module.css`
- Create: `app/(admin)/admin/components/shell/HotkeyLayer.tsx`
- Modify: `app/(admin)/admin/layout.tsx` (добавить `<HotkeyLayer />` внутрь `AdminUiProvider`)

**Interfaces:**
- Consumes: `matchHotkey`, `isEditableTarget`, `nextOverlayToClose` (Task 3); `filterRows` (Task 2); `useAdminData` (Task 11); `useAdminUi` (Task 13); `useFocusTrap` (Task 7).
- Produces:
  - `<CommandPalette />` — сам берёт данные и состояние из контекстов
  - `<HotkeyLayer />` — вешает единственный глобальный `keydown` и рендерит палитру

Один слушатель на всю админку: если каждый компонент вешает свой, порядок закрытия слоёв по Esc становится случайным.

- [ ] **Step 1: Палитра**

Создать `app/(admin)/admin/components/ui/CommandPalette.tsx`.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { filterRows } from "@/lib/admin/sort";
import { useAdminData } from "../data/AdminDataProvider";
import { useAdminUi } from "../shell/AdminUiProvider";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./CommandPalette.module.css";

type Item = { key: string; tag: string; title: string; note: string; run: () => void };

export default function CommandPalette() {
    const router = useRouter();
    const { services, doctors } = useAdminData();
    const { paletteOpen, setPaletteOpen } = useAdminUi();
    const trapRef = useFocusTrap(paletteOpen);
    const [term, setTerm] = useState("");

    // Каждое открытие начинается с чистой строки.
    useEffect(() => {
        if (paletteOpen) setTerm("");
    }, [paletteOpen]);

    if (!paletteOpen) return null;

    function go(href: string) {
        setPaletteOpen(false);
        router.push(href);
    }

    const commands: Item[] = [
        { key: "cmd-service", tag: "Команда", title: "Создать услугу", note: "Открыть форму новой услуги", run: () => go("/admin/services?new=1") },
        { key: "cmd-doctor", tag: "Команда", title: "Добавить врача", note: "Открыть форму нового врача", run: () => go("/admin/doctors?new=1") },
        { key: "cmd-overview", tag: "Команда", title: "Обзор", note: "Сводка по разделам", run: () => go("/admin") },
    ];

    const serviceItems: Item[] = filterRows(services, term, ["serviceName", "slug"]).map((s) => ({
        key: `service-${s.id}`,
        tag: "Услуга",
        title: s.serviceName,
        note: `/services/${s.slug}`,
        run: () => go("/admin/services"),
    }));

    const doctorItems: Item[] = filterRows(doctors, term, ["name", "specialty"]).map((d) => ({
        key: `doctor-${d.id}`,
        tag: "Врач",
        title: d.name,
        note: d.specialty,
        run: () => go("/admin/doctors"),
    }));

    const commandItems = filterRows(commands, term, ["title", "note"]);
    const items = [...commandItems, ...serviceItems, ...doctorItems];

    return (
        <>
            <div className={styles.scrim} onClick={() => setPaletteOpen(false)} aria-hidden="true" />
            <div className={styles.wrap}>
                <div
                    ref={trapRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Палитра команд"
                    className={styles.palette}
                >
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Услуга, врач или команда"
                        aria-label="Поиск по услугам, врачам и командам"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                    />
                    <div className={styles.results}>
                        {items.length === 0 ? (
                            <p className={styles.nothing}>Ничего не найдено</p>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={styles.item}
                                    onClick={item.run}
                                >
                                    <span className={styles.tag}>{item.tag}</span>
                                    <span className={styles.itemText}>
                                        <span className={styles.itemTitle}>{item.title}</span>
                                        <span className={styles.itemNote}>{item.note}</span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
```

- [ ] **Step 2: Стили палитры**

Создать `app/(admin)/admin/components/ui/CommandPalette.module.css`.

```css
.scrim {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-overlay) + 4);
  background: rgba(var(--scrim), 0.32);
}

.wrap {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-overlay) + 5);
  display: flex;
  justify-content: center;
  padding: 120px 24px 24px;
  pointer-events: none;
}

.palette {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: 620px;
  max-width: 100%;
  max-height: 60vh;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
  animation: popIn var(--dur) var(--spring);
}

@keyframes popIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

.input {
  height: 56px;
  padding: 0 18px;
  border: 0;
  border-bottom: 1px solid var(--glass-border);
  background: none;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
}

.input:focus { outline: none; }

.results {
  overflow-y: auto;
  padding: 6px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-fast) ease;
}

.item:hover { background: var(--glass-row-hover); }

.tag {
  flex: none;
  display: grid;
  place-items: center;
  min-width: 64px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand);
  font-size: 11px;
  font-weight: 600;
}

.itemText { min-width: 0; display: grid; }

.itemTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itemNote {
  font-size: 12px;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nothing {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: 14px;
  color: var(--ink-soft);
}
```

- [ ] **Step 3: Слой хоткеев**

Создать `app/(admin)/admin/components/shell/HotkeyLayer.tsx`.

```tsx
"use client";

import { useEffect } from "react";
import { isEditableTarget, matchHotkey, nextOverlayToClose } from "@/lib/admin/hotkeys";
import CommandPalette from "../ui/CommandPalette";
import { useAdminUi } from "./AdminUiProvider";

/**
 * Единственный глобальный keydown админки. Один слушатель — один
 * предсказуемый порядок закрытия слоёв по Esc.
 */
export default function HotkeyLayer() {
    const ui = useAdminUi();

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const inEditable = isEditableTarget(e.target as HTMLElement | null);
            const action = matchHotkey(e, { inEditable });
            if (!action) return;

            if (action === "palette") {
                e.preventDefault();
                ui.setPaletteOpen(!ui.paletteOpen);
                return;
            }

            if (action === "focusSearch") {
                e.preventDefault();
                ui.searchRef.current?.focus();
                return;
            }

            if (action === "close") {
                const layer = nextOverlayToClose({
                    palette: ui.paletteOpen,
                    modal: ui.modalOpen,
                    sheet: ui.sheetOpen,
                });
                if (!layer) return;
                e.preventDefault();
                // Sheet закрывает себя сам через onClose — здесь только палитра
                // и модалка, которыми владеет UI-контекст.
                if (layer === "palette") ui.setPaletteOpen(false);
                if (layer === "modal") ui.setModalOpen(false);
                if (layer === "sheet") ui.setSheetOpen(false);
                return;
            }

            if ((action === "save" || action === "submit") && ui.formSubmit) {
                e.preventDefault();
                ui.formSubmit();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [ui]);

    return <CommandPalette />;
}
```

- [ ] **Step 4: Подключить слой к каркасу**

В `app/(admin)/admin/layout.tsx` добавить импорт и вставить `<HotkeyLayer />` последним ребёнком внутри `AdminUiProvider`:

```tsx
import HotkeyLayer from "./components/shell/HotkeyLayer";
```

```tsx
                <AdminUiProvider>
                    <div className={styles.shell}>
                        <Sidebar />
                        <Content>{children}</Content>
                    </div>
                    <HotkeyLayer />
                </AdminUiProvider>
```

- [ ] **Step 5: Закрывать sheet по Esc в разделах**

`HotkeyLayer` умеет только сбросить флаг `sheetOpen`, а состоянием панели владеет страница раздела. Подписать обе страницы на этот флаг.

В `app/(admin)/admin/services/page.tsx` заменить строку деструктуризации

```tsx
    const { query, setQuery, setSheetOpen } = useAdminUi();
```

на

```tsx
    const { query, setQuery, sheetOpen, setSheetOpen } = useAdminUi();
```

и сразу после эффекта, который выставляет `setSheetOpen`, добавить:

```tsx
    // Esc сбрасывает флаг в контексте — панель закрывается следом.
    useEffect(() => {
        if (!sheetOpen && sheet !== null) setSheet(null);
    }, [sheetOpen, sheet]);
```

То же самое дословно — в `app/(admin)/admin/doctors/page.tsx`.

- [ ] **Step 6: Проверить типы, тесты и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: всё зелёное.

- [ ] **Step 7: Посмотреть в браузере**

Что должно быть видно:
- ⌘K (и Ctrl+K) открывает палитру по центру сверху; повторное нажатие закрывает.
- В палитре ищутся услуги, врачи и три команды; «Создать услугу» ведёт на раздел и открывает панель.
- `/` вне поля ставит фокус в поиск топбара; внутри поля печатает обычный слэш.
- Esc закрывает сначала палитру, потом модалку, потом sheet.
- ⌘S и ⌘↵ при открытой панели сохраняют форму.
- Esc внутри инлайн-правки отменяет правку и не закрывает панель.

- [ ] **Step 8: Коммит**

```bash
git add "app/(admin)/admin"
git commit -m "feat(admin): command palette and global hotkeys"
```

---

### Task 17: Экран входа

**Files:**
- Modify: `app/(admin)/login/page.tsx` (весь файл)
- Create: `app/(admin)/login/login.module.css`

**Interfaces:**
- Consumes: `useCursorGlow` (Task 4). `Input` и `Button` из `admin/components/ui` **не используются**: они лежат под `/admin`, а логин — соседний маршрут; тянуть оттуда компоненты значит связывать две независимые части. Поля логина оформляются собственным модулем — их всего два.
- Produces: ничего для других задач.

Логика не меняется: `POST /api/login`, редирект по `?next=`, `Suspense` вокруг `useSearchParams`.

- [ ] **Step 1: Страница входа**

Заменить содержимое `app/(admin)/login/page.tsx` целиком.

```tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LoginRequest } from "@/lib/types";
import { useCursorGlow } from "../admin/components/ui/useCursorGlow";
import styles from "./login.module.css";

async function login(payload: LoginRequest): Promise<boolean> {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    return response.ok;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { ref, glowProps } = useCursorGlow<HTMLDivElement>();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;
        setErr("");
        setSubmitting(true);
        try {
            const ok = await login({ username, password });
            if (!ok) {
                setErr("Неверный логин или пароль");
                return;
            }
            // middleware кладёт исходный адрес в ?next=
            const next = searchParams.get("next");
            router.push(next && next.startsWith("/") ? next : "/admin");
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className={styles.screen}>
            <div
                ref={ref}
                className={`${styles.card} ${err ? styles.cardError : ""}`}
                {...glowProps}
            >
                <span aria-hidden="true" className={styles.glow} />

                <header className={styles.head}>
                    <span aria-hidden="true" className={styles.logo}>П</span>
                    <h1 className={styles.title}>Вход в админку</h1>
                    <p className={styles.subtitle}>Клиника неврологии «Премиум»</p>
                </header>

                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="username">Логин</label>
                        <input
                            id="username"
                            className={styles.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            aria-invalid={err ? true : undefined}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="password">Пароль</label>
                        <input
                            id="password"
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            aria-invalid={err ? true : undefined}
                            required
                        />
                    </div>

                    {err ? <p role="alert" className={styles.error}>{err}</p> : null}

                    <button type="submit" className={styles.submit} disabled={submitting}>
                        {submitting ? "Проверяем…" : "Войти"}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
```

- [ ] **Step 2: Стили входа**

Создать `app/(admin)/login/login.module.css`. Фон прозрачный — под карточкой работают глобальные обои `body::before`, иначе стекло выглядит серой плёнкой.

```css
.screen {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 24px;
  background: transparent;
}

.card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  gap: 22px;
  width: 420px;
  max-width: 100%;
  padding: 32px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
}

/* Статичный блик поверхности. */
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  background: var(--glass-gloss);
  pointer-events: none;
}

/* Подвижный блик: центр берётся из --mx/--my. */
.glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    260px circle at var(--mx, 50%) var(--my, 50%),
    var(--glow-soft),
    transparent 70%
  );
}

.cardError { animation: shake 340ms var(--spring); }

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  30%, 70% { transform: translateX(3px); }
  50% { transform: translateX(-4px); }
}

.head {
  position: relative;
  z-index: 4;
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;
}

.logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  border-radius: 13px;
  background: var(--glass-primary);
  box-shadow: var(--glass-sheen);
  color: var(--surface);
  font-family: var(--font-head);
  font-size: 20px;
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: 24px;
  color: var(--ink);
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--ink-soft);
}

.form {
  position: relative;
  z-index: 4;
  display: grid;
  gap: 14px;
}

.field { display: grid; gap: 6px; }

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.input {
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  box-shadow: var(--glass-sheen);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
  transition: border-color var(--dur-fast) ease, box-shadow var(--dur) ease;
}

.input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: var(--glass-sheen), var(--ring-brand);
}

.error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--danger-line);
  border-radius: var(--radius-sm);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
}

.submit {
  height: 48px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--glass-primary);
  box-shadow: var(--glass-sheen), var(--shadow-soft);
  color: var(--surface);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--dur) var(--spring), box-shadow var(--dur) ease;
}

.submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--glass-sheen), var(--shadow-lift);
}

.submit:active:not(:disabled) { transform: scale(0.97); }

.submit:disabled { opacity: 0.6; cursor: not-allowed; }
```

- [ ] **Step 3: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Посмотреть в браузере**

Открыть `http://localhost:3000/login` (в приватном окне — иначе middleware перебросит на `/admin`).

Что должно быть видно:
- Центрированная стеклянная карточка 420px на светлом фоне с голубыми пятнами.
- Блик на карточке следует за курсором.
- Неверный пароль: карточка вздрагивает, появляется блок ошибки, поля помечены `aria-invalid`.
- Кнопка во время отправки показывает «Проверяем…» и заблокирована.
- Правильный вход ведёт на `/admin` или на адрес из `?next=`.
- В `data-a11y="1"` карточка сплошная и читаемая.

- [ ] **Step 5: Коммит**

```bash
git add "app/(admin)/login"
git commit -m "feat(admin): glass login screen"
```

---

### Task 18: Адаптив и финальная зачистка

**Files:**
- Modify: `app/(admin)/admin/layout.module.css` (медиазапросы)
- Modify: `app/(admin)/admin/components/shell/Sidebar.module.css` (drawer)
- Modify: `app/(admin)/admin/components/shell/Sidebar.tsx` (кнопка drawer и скрим)
- Modify: `app/(admin)/admin/components/shell/Topbar.tsx`, `Topbar.module.css` (кнопка меню)
- Modify: `app/(admin)/admin/components/ServiceTable.module.css`, `DoctorTable.module.css` (карточный режим)
- Modify: `app/(admin)/admin/components/ui/Table.module.css` (карточный режим строки)
- Modify: `app/(admin)/admin/components/ui/Sheet.module.css` (полная ширина)
- Modify: `app/(admin)/admin/overview.module.css` (одна колонка)

**Interfaces:**
- Consumes: всё, что построено выше.
- Produces: ничего нового — только поведение на узких экранах.

- [ ] **Step 1: Drawer сайдбара ≤1100px**

В `Sidebar.module.css` добавить в конец:

```css
/* На узком экране сайдбар уходит из потока и выезжает поверх контента. */
@media (max-width: 1100px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: calc(var(--z-overlay) + 1);
    width: var(--sidebar-w);
    transform: translateX(-100%);
    transition: transform var(--dur-slow) var(--spring);
  }

  .drawerOpen { transform: none; }

  /* В drawer сворачивание бессмысленно. */
  .collapseButton { display: none; }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: rgba(var(--scrim), 0.32);
  }
}

@media (min-width: 1101px) {
  .scrim { display: none; }
}
```

- [ ] **Step 2: Управление drawer в Sidebar.tsx**

Добавить в компонент проп `drawerOpen: boolean` и `onCloseDrawer: () => void`, применить класс и отрисовать скрим:

```tsx
export default function Sidebar({
    drawerOpen,
    onCloseDrawer,
}: {
    drawerOpen: boolean;
    onCloseDrawer: () => void;
}) {
```

Класс корневого `<nav>`:

```tsx
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${drawerOpen ? styles.drawerOpen : ""}`}
```

Перед `<nav>` — скрим (виден только в drawer-режиме, скрыт медиазапросом на широких экранах):

```tsx
            {drawerOpen ? (
                <div className={styles.scrim} onClick={onCloseDrawer} aria-hidden="true" />
            ) : null}
```

Обернуть возвращаемое в фрагмент `<>…</>`. Переход по пункту меню закрывает drawer — добавить `onClick={onCloseDrawer}` на каждый `<Link>`.

- [ ] **Step 3: Кнопка меню в топбаре**

Добавить в `Topbar.tsx` проп `onOpenDrawer: () => void` и кнопку первым элементом:

```tsx
            <button
                type="button"
                className={styles.menu}
                onClick={onOpenDrawer}
                aria-label="Открыть меню разделов"
            >
                <FiMenu aria-hidden="true" />
            </button>
```

с импортом `FiMenu` из `react-icons/fi`, и в `Topbar.module.css`:

```css
.menu {
  display: none;
  width: 44px;
  height: 44px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  color: var(--brand);
  font-size: 18px;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .menu { display: grid; place-items: center; }
  /* Поиск отдаёт место крошкам и кнопке меню. */
  .search { width: 180px; }
  .search:focus-within { width: 220px; }
}

@media (max-width: 820px) {
  .topbar { padding: 0 12px; gap: 8px; }
  .search { display: none; }
}
```

- [ ] **Step 4: Прокинуть состояние drawer в каркасе**

В `app/(admin)/admin/layout.tsx` завести состояние и передать в оба компонента:

```tsx
    const [drawer, setDrawer] = useState(false);
```

```tsx
                        <Sidebar drawerOpen={drawer} onCloseDrawer={() => setDrawer(false)} />
```

и в `Content` пробросить `onOpenDrawer` до `<Topbar onOpenDrawer={() => setDrawer(true)} />`. `AdminLayout` уже клиентский — `useState` в нём допустим.

- [ ] **Step 5: Карточный режим таблицы ≤820px**

В `app/(admin)/admin/components/ui/Table.module.css` добавить в конец:

```css
/* На узком экране строка разбирается в карточку: колонки становятся строками. */
@media (max-width: 820px) {
  .head { display: none; }

  .row {
    grid-template-columns: 1fr;
    gap: 8px;
    min-height: auto;
    padding: 12px;
  }

  .row:hover { transform: none; }

  .cell { min-height: 44px; display: flex; align-items: center; }
}
```

- [ ] **Step 6: Sheet во всю ширину**

В `app/(admin)/admin/components/ui/Sheet.module.css` добавить:

```css
@media (max-width: 820px) {
  .sheet { width: 100%; border-left: 0; }
}
```

- [ ] **Step 7: Одна колонка на Обзоре**

В `app/(admin)/admin/overview.module.css` добавить:

```css
@media (max-width: 820px) {
  .tiles,
  .actions { grid-template-columns: 1fr; }
}
```

И в `layout.module.css`:

```css
@media (max-width: 820px) {
  .main { padding: 18px 12px 32px; }
}
```

- [ ] **Step 8: Проверить, что литеральных цветов и инлайн-стилей не осталось**

Run:
```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" "app/(admin)" --include=*.module.css | grep -v "rgba(var(--scrim)"
```
Expected: пустой вывод. Единственное разрешённое исключение — `rgba(var(--scrim), …)`: это композиция из токена, а не литерал.

Run:
```bash
grep -rn "style={{" "app/(admin)"
```
Expected: только строки, где передаются CSS-переменные `--cols`, `--pill-y`, `--bar-w`. Ничего другого.

- [ ] **Step 9: Проверить, что backdrop-filter не размножен по строкам**

Run:
```bash
grep -rn "backdrop-filter" "app/(admin)" --include=*.module.css
```
Expected: только контейнеры — `GlassCard.card`, `Table.shell`, `Sidebar.sidebar`, `Topbar.topbar`, `Topbar.a11y`, `Sheet.sheet`, `Modal.scrim`, `Modal.modal`, `CommandPalette.palette`, `Toast.toast`, `Input.input`, `Textarea.area`, `Button.ghost`, `login.card`. В `Table.row`, `Table.cell`, `InlineEdit.*`, `Skeleton.*` его быть не должно.

- [ ] **Step 10: Полная проверка**

Run: `npx tsc --noEmit && npm run build`
Expected: всё зелёное, новых warning-ов нет.

- [ ] **Step 11: Посмотреть в браузере**

Проверить на ширинах 1440, 1100, 820 и 380px:
- ≤1100px: сайдбар пропадает, в топбаре появляется кнопка меню; drawer выезжает поверх контента со скримом; переход по пункту его закрывает.
- ≤820px: строки таблицы стали карточками, sheet занимает всю ширину, плитки Обзора в одну колонку.
- На 380px ничего не выезжает за край — горизонтальной прокрутки нет.
- Все кнопки и строки не ниже 44px.
- Скролл длинного списка плавный: `backdrop-filter` только на контейнере.

- [ ] **Step 12: Коммит**

```bash
git add "app/(admin)"
git commit -m "feat(admin): responsive — drawer, card-mode table, full-width sheet"
```

---

## Покрытие спецификации

Сверка плана с `design_handoff_admin_redesign/README.md`, раздел за разделом.

| Раздел handoff | Где реализуется |
|---|---|
| §1 Токены | Task 1 (плюс `--glass-dark-bg-nav` из прототипа и токены колец/шиммера, которых в списке README нет, но без них не обойтись без литералов) |
| §2 Структура файлов | «File Structure» выше; `Wallpaper.tsx` не создаётся (решение 3), `media/page.tsx` не создаётся (решение 2) |
| §3.1 Сайдбар | Task 12 — пилюля, сворачивание с `localStorage`, хоткей-подсказки, блок пользователя |
| §3.1 Топбар | Task 13 — крошки, поиск-капсула, статус сохранения, переиспользованный `A11yToggle` |
| §3.1 Обои | Решение 3: глобальный `body::before`, новый слой не рисуется |
| §3.2 Обзор | Task 13 — две плитки (третья была про «Медиа»), быстрые действия, ссылка на витрину |
| §3.3 Услуги и Врачи | Tasks 9, 14, 15 — грид, сортировка `localeCompare("ru")`, инлайн-правка, скелетоны, два вида пустого состояния, `rowIn` |
| §3.4 Sheet | Tasks 7, 14, 15 — 520px, `sheetIn`, блюр содержимого, ловушка и возврат фокуса, лимиты полей |
| §3.5 Модалка | Task 7 — переориентирована на подтверждение ухода с несохранёнными изменениями (решение 1) |
| §3.6 Тосты | Task 8 — `aria-live`, автоскрытие успеха, «Повторить» у ошибки |
| §3.7 Палитра ⌘K | Task 16 |
| §3.8 Медиа | Решение 2: раздел не делается; `Dropzone` — Task 10 |
| §3.9 Логин | Task 17 |
| §4 Движение | Tasks 4 (блик, сжим), 7 (`sheetIn`, `popIn`), 8 (`toastIn`), 9 (`rowIn`), 12 (пилюля), 13 (`pulse`). GSAP не нужен — всё на CSS-транзишенах |
| §5 Состояние и данные | Tasks 11 (`useOptimistic`), 2 (валидация), 3 (черновики и `beforeunload`) |
| §6 Клавиатура и доступность | Tasks 3, 7, 16; `aria-sort` — Task 9; проверки a11y — в списках «посмотреть в браузере» |
| §7 Адаптив | Task 18 |
| §8 Требует бэкенда | Решения 1 и 2; `updatedAt` не используется — на Обзоре нет «что редактировали последним» |
| §9 Критерии готовности | Task 18, шаги 8–10 (grep на литералы, инлайн-стили и лишний `backdrop-filter`) |

**Осознанно не сделано** (и почему):
- `rowOut` — анимации удаления строки нет, потому что нет удаления.
- «Что редактировали последним» на Обзоре — API не отдаёт `updatedAt`, выдумывать метрику нельзя.
- Счётчик «Медиа» в сайдбаре и плитка «Файлов в медиа» — нет эндпоинта.

## Что понадобится от бэкенда, чтобы закрыть остаток

Отдельными задачами, когда появятся эндпоинты в `CMS-premium/`:
1. `DELETE /api/cms/service/{id}` и `DELETE /api/cms/doctors/{id}` → экшены `actionDeleteService`/`actionDeleteDoctor`, кнопка «Удалить» в строке, модалка подтверждения удаления, `rowOut`, тост с «Отменить», ширина колонки действий обратно на `196px`.
2. `GET /api/cms/media` → маршрут `/admin/media`, пункт в сайдбаре, третья плитка на Обзоре, сетка карточек `repeat(4, 1fr)`.
3. `updatedAt` у услуг и врачей → блок «что редактировали последним» на Обзоре.
