# План A — право и контент (Постановление № 659)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести витрину в соответствие с Постановлением № 659 в части
доступности, согласия на обработку персональных данных и раскрытия информации.

**Architecture:** Всё в `premium-website`, бэкенд не меняется. Настройки
доступности — одно значение в `localStorage`, разбираемое чистой функцией в
`lib/a11y.ts` и тем же по смыслу inline-скриптом до первого пейнта; вид задают
data-атрибуты на `<html>` и токены в `globals.css`. Согласие у форм — общий
компонент плюс чистый валидатор в `lib/forms/lead.ts`. Раскрытие информации —
справочник данных в `lib/disclosure.ts` и одна страница на существующем маршруте
`/documents`.

**Tech Stack:** Next.js 16 (App Router, `output: "standalone"`), React 19,
TypeScript, CSS Modules + `app/globals.css`, vitest (`environment: "node"`).

**Spec:** `docs/superpowers/specs/2026-09-17-659-compliance-design.md`

## Global Constraints

- Рабочая директория всех команд — `premium-website`. Пути в плане указаны от неё.
- Тесты живут только в `lib/**/*.test.ts` (`vitest.config.mts`) и исполняются в
  окружении `node`: DOM недоступен, testing-library в проекте нет. Логика,
  которую нужно покрыть тестом, должна лежать в `lib/`.
- Алиас `@` указывает на корень `premium-website` (`@/lib/...`, `@/app/...`).
- Язык интерфейса и комментариев — русский, как во всём проекте.
- Существующий атрибут `data-a11y` на `<html>` менять нельзя: на него завязаны
  `app/globals.css`, `Header.module.css`, `Footer.module.css` и MutationObserver
  в `app/(site)/components/neuron/pageTheme.ts:240`. Новые атрибуты добавляются
  рядом.
- Прежние версии писали в ключ `localStorage["a11y"]` строку `"1"`/`"0"` —
  разбор обязан её понимать, иначе у вернувшегося посетителя режим сбросится.
- Команда тестов: `npm test`. Команда сборки: `npm run build`.
- Коммиты — на русском, в стиле истории проекта (`feat(...)`, `fix(...)`).

## Prerequisites — данные от клиники

Задачи 5 и 6 отрисуют раздел с тем, что есть. Пустые поля страница не печатает.
Дособрать и внести отдельным коммитом, когда клиника предоставит:

1. Полное наименование ООО, ИНН, ОГРН, дата регистрации, юридический адрес.
2. `public/docs/license.pdf` — скан медицинской лицензии со всеми приложениями.
3. `public/docs/pp-659.pdf` — текст Постановления Правительства РФ № 659.
4. Ссылка или PDF Территориальной программы госгарантий по Республике
   Башкортостан на текущий год.
5. Список страховых компаний-партнёров по ДМС.
6. Адреса и телефоны Минздрава РБ, Роспотребнадзора по РБ и Росздравнадзора по
   РБ — сверить на официальных сайтах ведомств (URL уже в задаче 5).

Точные однострочные правки для каждого пункта приведены в конце плана,
в разделе «Дозаполнение после получения данных».

## File Structure

**Создаются:**
- `lib/a11y.ts` — модель настроек доступности: типы, разбор, сериализация,
  data-атрибуты и исходник inline-скрипта. Единственный источник правды.
- `lib/a11y.test.ts` — тесты разбора и проверка, что inline-скрипт и
  `parseA11ySettings` дают одинаковый результат.
- `lib/forms/lead.ts` — валидация заявки, включая обязательное согласие.
- `lib/forms/lead.test.ts` — тесты валидации.
- `lib/disclosure.ts` — справочник раскрытия информации.
- `lib/disclosure.test.ts` — проверка целостности справочника.
- `app/(site)/components/a11y/A11yTrigger.tsx` — кнопка, открывающая панель.
- `app/(site)/components/a11y/A11yPanel.tsx` — сама панель настроек.
- `app/(site)/components/a11y/A11yPanel.module.css` — стили панели.
- `app/(site)/components/ConsentCheckbox.tsx` — галочка согласия для всех форм.
- `app/(site)/documents/page.module.css` — стили раздела раскрытия информации.

**Изменяются:**
- `app/layout.tsx:60` — inline-скрипт берётся из `lib/a11y.ts`.
- `app/globals.css:178`, `:359` и `:436` — блок режима сводится к палитре
  схемы, добавляются схемы, шаги шрифта, межбуквенный интервал, режим без
  изображений и стили галочки согласия.
- `app/(site)/layout.tsx` — `A11yToggle` меняется на `A11yTrigger`, панель
  монтируется один раз.
- `app/(site)/components/Footer.tsx:65` — тот же обмен компонента.
- `app/(admin)/admin/components/shell/Topbar.tsx:67` — тот же обмен компонента.
- `app/(admin)/admin/layout.tsx` — панель монтируется в админке.
- `app/(site)/contacts/ContactForm.tsx` — валидация и галочка согласия.
- `app/(site)/documents/page.tsx` — раздел раскрытия информации целиком.
- `lib/constants.ts` — пункт меню.

**Удаляется:**
- `app/(site)/components/A11yToggle.tsx` — заменён на `A11yTrigger`.

---

### Task 1: Модель настроек доступности

Чистая логика режима для слабовидящих. Отдельной задачей, потому что от неё
зависят и разметка, и стили, и панель, а покрыть тестом можно только её.

**Files:**
- Create: `lib/a11y.ts`
- Test: `lib/a11y.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: `A11Y_KEY: string`, `A11Y_OPEN_EVENT: string`,
  типы `A11yScheme`, `A11yFont`, `A11yLetter`, `A11ySettings`,
  константы `A11Y_SCHEMES`, `A11Y_FONTS`, `A11Y_LETTERS`, `A11Y_DEFAULTS`,
  функции `parseA11ySettings(raw: string | null): A11ySettings`,
  `serializeA11ySettings(s: A11ySettings): string`,
  `a11yDataset(s: A11ySettings): Record<string, string>`,
  `readA11ySettings(): A11ySettings`, `writeA11ySettings(s: A11ySettings): void`,
  и строку `A11Y_INIT_SCRIPT`.

- [ ] **Step 1: Написать падающий тест**

Создать `lib/a11y.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
    A11Y_DEFAULTS,
    A11Y_INIT_SCRIPT,
    a11yDataset,
    parseA11ySettings,
    serializeA11ySettings,
} from "./a11y";

/**
 * Прогоняет inline-скрипт из <head> с подставными localStorage и document.
 * Ключи dataset — camelCase, как у настоящего DOMStringMap: там `a11yScheme`
 * соответствует атрибуту `data-a11y-scheme`.
 */
function runInitScript(raw: string | null): Record<string, string> {
    const dataset: Record<string, string> = {};
    const localStorage = { getItem: () => raw };
    const document = { documentElement: { dataset } };
    new Function("localStorage", "document", A11Y_INIT_SCRIPT)(localStorage, document);
    return dataset;
}

describe("parseA11ySettings", () => {
    it("без сохранённого значения даёт выключенный режим по умолчанию", () => {
        expect(parseA11ySettings(null)).toEqual(A11Y_DEFAULTS);
    });

    it('понимает "1" от прежней версии переключателя', () => {
        expect(parseA11ySettings("1")).toEqual({ ...A11Y_DEFAULTS, on: true });
    });

    it('понимает "0" от прежней версии переключателя', () => {
        expect(parseA11ySettings("0")).toEqual(A11Y_DEFAULTS);
    });

    it("читает полный набор настроек", () => {
        const raw = serializeA11ySettings({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        });
        expect(parseA11ySettings(raw)).toEqual({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        });
    });

    it("отбрасывает неизвестные значения полей, сохраняя понятные", () => {
        const raw = JSON.stringify({
            on: true,
            scheme: "neon",
            font: "huge",
            letter: "диагональный",
            images: false,
        });
        expect(parseA11ySettings(raw)).toEqual({
            on: true,
            scheme: "black-on-white",
            font: "huge",
            letter: "normal",
            images: false,
        });
    });

    it("на битом JSON не бросает, а возвращает значения по умолчанию", () => {
        expect(parseA11ySettings("{не json")).toEqual(A11Y_DEFAULTS);
    });
});

describe("a11yDataset", () => {
    it("выключенный режим оставляет data-a11y нулём", () => {
        expect(a11yDataset(A11Y_DEFAULTS).a11y).toBe("0");
    });

    it("включённый режим описан пятью атрибутами", () => {
        expect(a11yDataset({
            on: true,
            scheme: "brown-on-beige",
            font: "large",
            letter: "wide",
            images: false,
        })).toEqual({
            a11y: "1",
            a11yScheme: "brown-on-beige",
            a11yFont: "large",
            a11yLetter: "wide",
            a11yImages: "off",
        });
    });
});

describe("A11Y_INIT_SCRIPT", () => {
    const cases: (string | null)[] = [
        null,
        "1",
        "0",
        "{не json",
        serializeA11ySettings({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        }),
        JSON.stringify({ on: true, scheme: "neon", font: "large" }),
    ];

    it.each(cases)(
        "ставит ровно те же атрибуты, что и parseA11ySettings, на входе %s",
        (raw) => {
            expect(runInitScript(raw)).toEqual(a11yDataset(parseA11ySettings(raw)));
        },
    );
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- lib/a11y.test.ts`
Expected: FAIL — «Failed to resolve import "./a11y"».

- [ ] **Step 3: Написать минимальную реализацию**

Создать `lib/a11y.ts`:

```ts
/**
 * Режим для слабовидящих по ГОСТ Р 52872. Единственный источник правды:
 * отсюда берут значения и панель настроек, и inline-скрипт в <head>.
 */

/** Ключ в localStorage. Тот же, что у прежнего переключателя, — см. parseA11ySettings. */
export const A11Y_KEY = "a11y";
/** Кнопка просит открыть панель. Кнопок несколько, панель одна. */
export const A11Y_OPEN_EVENT = "a11y-open";

export type A11yScheme = "black-on-white" | "white-on-black" | "brown-on-beige";
export type A11yFont = "normal" | "large" | "huge";
export type A11yLetter = "normal" | "wide";

export interface A11ySettings {
    on: boolean;
    scheme: A11yScheme;
    font: A11yFont;
    letter: A11yLetter;
    images: boolean;
}

export const A11Y_SCHEMES: A11yScheme[] = [
    "black-on-white",
    "white-on-black",
    "brown-on-beige",
];
export const A11Y_FONTS: A11yFont[] = ["normal", "large", "huge"];
export const A11Y_LETTERS: A11yLetter[] = ["normal", "wide"];

export const A11Y_DEFAULTS: A11ySettings = {
    on: false,
    scheme: "black-on-white",
    font: "normal",
    letter: "normal",
    images: true,
};

/**
 * Прежняя версия писала в этот же ключ строку "1"/"0". Её нужно понимать:
 * иначе у посетителя, включившего режим до обновления сайта, он молча
 * выключится. Всё, что не разбирается, — настройки по умолчанию: сломанный
 * localStorage не должен оставлять страницу без стилей.
 */
export function parseA11ySettings(raw: string | null): A11ySettings {
    if (raw === "1") return { ...A11Y_DEFAULTS, on: true };
    if (!raw || raw[0] !== "{") return { ...A11Y_DEFAULTS };

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ...A11Y_DEFAULTS };
    }
    if (!parsed || typeof parsed !== "object") return { ...A11Y_DEFAULTS };

    const p = parsed as Partial<A11ySettings>;
    return {
        on: p.on === true,
        scheme: A11Y_SCHEMES.includes(p.scheme as A11yScheme)
            ? (p.scheme as A11yScheme)
            : A11Y_DEFAULTS.scheme,
        font: A11Y_FONTS.includes(p.font as A11yFont)
            ? (p.font as A11yFont)
            : A11Y_DEFAULTS.font,
        letter: A11Y_LETTERS.includes(p.letter as A11yLetter)
            ? (p.letter as A11yLetter)
            : A11Y_DEFAULTS.letter,
        images: p.images !== false,
    };
}

export function serializeA11ySettings(settings: A11ySettings): string {
    return JSON.stringify(settings);
}

/**
 * Атрибуты для <html>. Ключи в стиле DOMStringMap: `a11yScheme` — это
 * атрибут `data-a11y-scheme`, по которому и написаны селекторы в globals.css.
 */
export function a11yDataset(settings: A11ySettings): Record<string, string> {
    return {
        a11y: settings.on ? "1" : "0",
        a11yScheme: settings.scheme,
        a11yFont: settings.font,
        a11yLetter: settings.letter,
        a11yImages: settings.images ? "on" : "off",
    };
}

/** Чтение с диска браузера. В приватном режиме доступ к localStorage бросает. */
export function readA11ySettings(): A11ySettings {
    try {
        return parseA11ySettings(localStorage.getItem(A11Y_KEY));
    } catch {
        return { ...A11Y_DEFAULTS };
    }
}

/**
 * Запись настроек и атрибутов на <html>. Отдельного события об изменении нет:
 * кнопки состояния не держат (подпись выбирает CSS), а сцена нейрона следит за
 * data-a11y своим MutationObserver — см. neuron/pageTheme.ts.
 */
export function writeA11ySettings(settings: A11ySettings): void {
    try {
        localStorage.setItem(A11Y_KEY, serializeA11ySettings(settings));
    } catch {
        /* без localStorage выбор проживёт до перезагрузки */
    }
    const dataset = a11yDataset(settings);
    for (const [key, value] of Object.entries(dataset)) {
        document.documentElement.dataset[key] = value;
    }
}

/**
 * Тот же разбор, но строкой: скрипт выполняется в <head> до первого пейнта,
 * когда модулей ещё нет, — иначе страница мигает обычной версией (проверено
 * в perf-v3, см. комментарий в A11yTrigger). Расхождение с parseA11ySettings
 * ловит lib/a11y.test.ts: он прогоняет обе ветки на одних и тех же входах.
 */
export const A11Y_INIT_SCRIPT = `try{
var r=localStorage.getItem("a11y");
var s={on:false,scheme:"black-on-white",font:"normal",letter:"normal",images:true};
if(r==="1")s.on=true;
else if(r&&r.charAt(0)==="{"){
var p=JSON.parse(r);
if(p&&typeof p==="object"){
s.on=p.on===true;
if(["black-on-white","white-on-black","brown-on-beige"].indexOf(p.scheme)>=0)s.scheme=p.scheme;
if(["normal","large","huge"].indexOf(p.font)>=0)s.font=p.font;
if(["normal","wide"].indexOf(p.letter)>=0)s.letter=p.letter;
s.images=p.images!==false;}}
var d=document.documentElement.dataset;
d.a11y=s.on?"1":"0";d.a11yScheme=s.scheme;d.a11yFont=s.font;d.a11yLetter=s.letter;d.a11yImages=s.images?"on":"off";
}catch(e){
var f=document.documentElement.dataset;
f.a11y="0";f.a11yScheme="black-on-white";f.a11yFont="normal";f.a11yLetter="normal";f.a11yImages="on";
}`;
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npm test -- lib/a11y.test.ts`
Expected: PASS, все блоки зелёные.

- [ ] **Step 5: Коммит**

```bash
git add lib/a11y.ts lib/a11y.test.ts
git commit -m "feat(a11y): модель настроек режима для слабовидящих"
```

---

### Task 2: Применение настроек — атрибуты до пейнта и стили схем

Разметка и CSS, дающие видимый эффект. Панели ещё нет: проверка — руками из
консоли.

**Files:**
- Modify: `app/layout.tsx:60` и `app/layout.tsx:94`
- Modify: `app/globals.css:178-242` (блок режима), `app/globals.css:359`
  (скин админки), `app/globals.css:436-438` (размер шрифта у body)

**Interfaces:**
- Consumes: `A11Y_INIT_SCRIPT` из задачи 1.
- Produces: атрибуты `data-a11y`, `data-a11y-scheme`, `data-a11y-font`,
  `data-a11y-letter`, `data-a11y-images` на `<html>` и соответствующие им
  правила в `globals.css`.

- [ ] **Step 1: Перевести inline-скрипт на общий исходник**

В `app/layout.tsx` удалить объявление `a11yInitScript` (строки 56–60 вместе с
комментарием) и добавить импорт рядом с остальными:

```ts
import { A11Y_INIT_SCRIPT } from "@/lib/a11y";
```

В `<head>` заменить использование:

```tsx
            <script
                dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT + curtainInitScript + cookieInitScript }}
            />
```

- [ ] **Step 2: Свести цвета режима к палитре схемы**

Блок `html[data-a11y="1"]` в `app/globals.css` (строки 178–242) задаёт не
только цвета: он же выключает стекло и размытие, гасит сцену, расширяет кольцо
фокуса и переводит плашки в сплошные. Переписывать его под каждую схему —
значит трижды продублировать полсотни токенов и трижды же забыть один из них.
Поэтому блок остаётся один, а схема задаёт четырнадцать величин, из которых он
собран.

Заменить блок `html[data-a11y="1"] { ... }` целиком (от строки 178 до
закрывающей скобки перед комментарием «Низкий тир сцены») на:

```css
/* ── Режим для слабовидящих (ГОСТ Р 52872) ──────────────────────────────
   Один блок режима на все схемы: стекло, сцена, фокус и плотность
   поверхностей от схемы не зависят. Схема задаёт только палитру — набор
   --a11y-*, объявленный здесь значениями схемы «чёрным по белому» и
   переопределяемый блоками ниже.

   Все объявления сидят на одном элементе <html>, поэтому переопределение
   --a11y-bg в более специфичном блоке доходит и до --paper: var()
   подставляется после каскада, на том же элементе. Оговорка про
   `--brass: var(--accent)` ниже — про потомков, там правило другое. */
html[data-a11y="1"] {
  --a11y-bg: #ffffff;
  --a11y-fg: #000000;
  --a11y-fg-soft: #1f2937;
  --a11y-accent: #0b3fb0;
  --a11y-accent-deep: #08183a;
  --a11y-accent-bright: #9cc4ff;
  --a11y-on-deep: #ffffff;
  --a11y-on-deep-soft: #e8f0fb;
  --a11y-on-deep-line: rgba(255, 255, 255, 0.5);
  --a11y-line: rgba(0, 0, 0, 0.35);
  --a11y-danger: #8c1d16;
  --a11y-success: #0a5c3d;
  --a11y-row-hover: #eef4fd;
  --a11y-shimmer: linear-gradient(90deg, #e8eef8 0%, #d6e2f4 40%, #e8eef8 80%);

  --font-scale: 1.25;
  --line: 1.7;
  --letter: 0.02em;
  --paper: var(--a11y-bg);
  --surface: var(--a11y-bg);
  --ink: var(--a11y-fg);
  --ink-soft: var(--a11y-fg-soft);
  --brand: var(--a11y-accent);
  --brand-deep: var(--a11y-accent-deep);
  --brand-line: var(--a11y-accent-deep);
  --brand-tint: var(--a11y-bg);
  --on-dark: var(--a11y-on-deep);
  --on-dark-soft: var(--a11y-on-deep-soft);
  /* Псевдонимы переобъявляются в каждом блоке: `--brass: var(--accent)`
     подставляется там, где объявлено, а не у потомка, — переопределения
     одного `--accent` было бы недостаточно. */
  --accent: var(--a11y-accent);
  --accent-fill: var(--a11y-accent);
  --accent-bright: var(--a11y-accent-bright);
  --brass: var(--accent);
  --brass-fill: var(--accent-fill);
  --brass-bright: var(--accent-bright);
  /* Режим доступности: страница не темнеет вообще, плашки сплошные.
     Инлайновые переменные сцены снимаются в pageTheme при включении режима,
     поэтому этот блок не приходится защищать от них !important-ом. */
  --page-bg: var(--a11y-bg);
  --scene-dark: 0;
  --plate-a: var(--a11y-bg);
  --plate-b: var(--a11y-bg);
  --panel-bg: transparent;
  --panel-filter: none;
  --scrim: 8, 24, 58;
  --border: var(--a11y-line);
  --focus: 5px;

  /* доступность: убираем прозрачность и размытие — только сплошные поверхности */
  --glass-blur: none;
  --glass-bg: var(--a11y-bg);
  --glass-bg-strong: var(--a11y-bg);
  --glass-border: var(--a11y-line);
  --glass-tint: var(--a11y-bg);
  --glass-dark-bg: var(--a11y-accent-deep);
  --glass-dark-border: var(--a11y-on-deep-line);
  --glass-sheen: none;
  --glass-gloss: none;
  --glass-shadow: none;
  --glass-primary: var(--a11y-accent);

  /* админка: сплошные поверхности, максимальный контраст */
  --danger: var(--a11y-danger);
  --danger-tint: var(--a11y-bg);
  --danger-line: var(--a11y-danger);
  --danger-soft: var(--a11y-danger);
  --success: var(--a11y-success);
  --success-tint: var(--a11y-bg);
  --glass-row-hover: var(--a11y-row-hover);
  --glass-dark-bg-nav: var(--a11y-accent-deep);
  --pill-fill: var(--a11y-accent);
  --ring-brand: 0 0 0 3px var(--a11y-accent);
  --ring-danger: 0 0 0 3px var(--a11y-danger);
  --row-line: 0 1px 0 var(--a11y-line);
  --shimmer: var(--a11y-shimmer);
  --glow-soft: transparent;
}

/* Шаг шрифта и разрядка: ГОСТ требует выбор, а не одно фиксированное
   увеличение. Множитель едет в html { font-size: calc(16px * --font-scale) }. */
html[data-a11y="1"][data-a11y-font="large"] { --font-scale: 1.5; }
html[data-a11y="1"][data-a11y-font="huge"] { --font-scale: 1.85; }
html[data-a11y="1"][data-a11y-letter="wide"] { --letter: 0.12em; }

/* Белым по чёрному. Акцент жёлтый: 14:1 на чёрном, тогда как фирменный синий
   на нём не читается вовсе. */
html[data-a11y="1"][data-a11y-scheme="white-on-black"] {
  --a11y-bg: #000000;
  --a11y-fg: #ffffff;
  --a11y-fg-soft: #e6e6e6;
  --a11y-accent: #ffd60a;
  --a11y-accent-deep: #000000;
  --a11y-accent-bright: #fff3b0;
  --a11y-on-deep: #ffffff;
  --a11y-on-deep-soft: #e6e6e6;
  --a11y-on-deep-line: rgba(255, 255, 255, 0.7);
  --a11y-line: rgba(255, 255, 255, 0.7);
  --a11y-danger: #ff8a80;
  --a11y-success: #7ee2b8;
  --a11y-row-hover: #1a1a1a;
  --a11y-shimmer: linear-gradient(90deg, #1a1a1a 0%, #333333 40%, #1a1a1a 80%);
}

/* Коричневым по бежевому — третья схема ГОСТа, самая мягкая по яркости. */
html[data-a11y="1"][data-a11y-scheme="brown-on-beige"] {
  --a11y-bg: #f7f3d6;
  --a11y-fg: #3b2a12;
  --a11y-fg-soft: #4d3a1d;
  --a11y-accent: #6b3f10;
  --a11y-accent-deep: #3b2a12;
  --a11y-accent-bright: #a8742c;
  --a11y-on-deep: #f7f3d6;
  --a11y-on-deep-soft: #efe9c8;
  --a11y-on-deep-line: rgba(247, 243, 214, 0.6);
  --a11y-line: rgba(59, 42, 18, 0.55);
  --a11y-danger: #7a1c14;
  --a11y-success: #2f5d2a;
  --a11y-row-hover: #efe9c8;
  --a11y-shimmer: linear-gradient(90deg, #efe9c8 0%, #e2dab4 40%, #efe9c8 80%);
}

/* Изображения выключены. display:none, а не visibility: скрытый через
   visibility элемент продолжает занимать место и оставляет дыры в сетке.
   Альтернативный текст при этом пропадает и для скринридеров — режим
   рассчитан на увеличение, а не на озвучивание. Сцена нейрона (canvas)
   уходит вместе с картинками: это самый тяжёлый декоративный слой. */
html[data-a11y-images="off"] img,
html[data-a11y-images="off"] picture,
html[data-a11y-images="off"] video,
html[data-a11y-images="off"] canvas,
html[data-a11y-images="off"] iframe {
  display: none !important;
}

html[data-a11y-images="off"] .page-ground::before {
  display: none;
}
```

- [ ] **Step 2a: Ограничить розовый скин админки схемой по умолчанию**

Блок `html[data-a11y="1"] .admin-skin` (строка ~359) перекрашивает админку в
розовое и перебивает общий блок режима — иначе она синела бы. С появлением
схем он должен работать только для схемы по умолчанию, иначе «белым по
чёрному» в админке останется розовым. Заменить селектор:

```css
html[data-a11y="1"][data-a11y-scheme="black-on-white"] .admin-skin {
```

Селектор `.admin-skin::before { display: none }` строкой ниже не трогаем: гасить
розовые обои правильно в любой схеме.

- [ ] **Step 3: Починить размер шрифта у body**

В `app/globals.css` правило на строке 436 фиксирует `font-size: 20px` и
перебивает шаги шрифта. Заменить:

```css
html[data-a11y="1"] body {
  font-size: 20px;
}
```

на:

```css
/* В rem, а не в px: иначе шаг шрифта из панели (--font-scale на <html>)
   до текста не доходит. */
html[data-a11y="1"] body {
  font-size: 1.25rem;
}
```

- [ ] **Step 4: Убедиться, что сборка и тесты проходят**

Run: `npm test && npm run build`
Expected: тесты PASS, сборка без ошибок.

- [ ] **Step 5: Проверить схемы вживую**

Run: `npm run dev`, открыть `http://localhost:3000`, в консоли браузера:

```js
localStorage.setItem("a11y", JSON.stringify({on:true,scheme:"white-on-black",font:"huge",letter:"wide",images:false}));
location.reload();
```

Expected: страница чёрная с белым текстом и жёлтыми ссылками, шрифт крупнее
обычного, буквы разрежены, картинок и сцены нет. Повторить со схемами
`black-on-white` и `brown-on-beige`. Убедиться, что при перезагрузке нет кадра
обычной версии.

- [ ] **Step 6: Коммит**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(a11y): схемы, шаги шрифта, разрядка и режим без изображений"
```

---

### Task 3: Панель настроек отображения

Кнопка с иконкой «глаз» открывает панель с контролами ГОСТа. Кнопок на сайте
три (витрина, футер, топбар админки), панель одна: кнопка только просит её
открыть событием — иначе на странице оказалось бы три независимых панели со
своим состоянием.

**Files:**
- Create: `app/(site)/components/a11y/A11yTrigger.tsx`
- Create: `app/(site)/components/a11y/A11yPanel.tsx`
- Create: `app/(site)/components/a11y/A11yPanel.module.css`
- Delete: `app/(site)/components/A11yToggle.tsx`
- Modify: `app/(site)/layout.tsx`
- Modify: `app/(site)/components/Footer.tsx:3` и `:65`
- Modify: `app/(admin)/admin/components/shell/Topbar.tsx:67` и импорт
- Modify: `app/(admin)/admin/layout.tsx`

**Interfaces:**
- Consumes: `A11Y_OPEN_EVENT`, `A11Y_DEFAULTS`, `A11ySettings`, `A11yScheme`,
  `A11yFont`, `A11yLetter`, `readA11ySettings`, `writeA11ySettings` из задачи 1;
  `Portal` из `@/app/(admin)/admin/components/ui/Portal`; `useFocusTrap` из
  `@/app/(admin)/admin/components/ui/useFocusTrap`.
- Produces: компоненты `A11yTrigger` (принимает `className?: string`) и
  `A11yPanel` (без пропсов).

- [ ] **Step 1: Написать кнопку**

Создать `app/(site)/components/a11y/A11yTrigger.tsx`:

```tsx
"use client";

import { FiEye } from "react-icons/fi";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";

/**
 * Кнопок на сайте три (витрина, футер, топбар админки), панель одна: кнопка
 * только просит её открыть событием.
 *
 * Подпись выбирает CSS, а не состояние. Режим включается inline-скриптом в
 * <head> ещё до первого пейнта (html[data-a11y]), а сервер про него не знает и
 * всегда рендерит «Версия для слабовидящих». Ленивый useState из атрибута не
 * спасает: при расхождении текста React с suppressHydrationWarning оставляет
 * серверный текст, а эффект ставит то же значение состояния и перерисовки не
 * даёт — подпись остаётся неверной, пока кнопку не нажмут (проверено в
 * perf-v3). Поэтому в разметке обе подписи, а нужную показывает правило по
 * атрибуту на <html> (globals.css, .a11y-label-on/.a11y-label-off).
 */
export default function A11yTrigger({ className = "" }: { className?: string }) {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(A11Y_OPEN_EVENT))}
            aria-haspopup="dialog"
            className={className}
        >
            <FiEye aria-hidden="true" />
            <span className="a11y-label-off">Версия для слабовидящих</span>
            <span className="a11y-label-on">Настройки отображения</span>
        </button>
    );
}
```

- [ ] **Step 2: Написать панель**

Создать `app/(site)/components/a11y/A11yPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Portal from "@/app/(admin)/admin/components/ui/Portal";
import { useFocusTrap } from "@/app/(admin)/admin/components/ui/useFocusTrap";
import {
    A11Y_DEFAULTS,
    A11Y_OPEN_EVENT,
    type A11yFont,
    type A11yLetter,
    type A11yScheme,
    type A11ySettings,
    readA11ySettings,
    writeA11ySettings,
} from "@/lib/a11y";
import styles from "./A11yPanel.module.css";

const SCHEMES: { value: A11yScheme; label: string }[] = [
    { value: "black-on-white", label: "Чёрным по белому" },
    { value: "white-on-black", label: "Белым по чёрному" },
    { value: "brown-on-beige", label: "Коричневым по бежевому" },
];

const FONTS: { value: A11yFont; label: string }[] = [
    { value: "normal", label: "Обычный" },
    { value: "large", label: "Крупный" },
    { value: "huge", label: "Очень крупный" },
];

const LETTERS: { value: A11yLetter; label: string }[] = [
    { value: "normal", label: "Обычный" },
    { value: "wide", label: "Увеличенный" },
];

/**
 * Панель настроек отображения по ГОСТ Р 52872. Монтируется один раз на макет,
 * открывается событием от любой кнопки A11yTrigger.
 *
 * Слой уходит в портал по той же причине, что и слои админки: содержимое под
 * ним может быть размыто фильтром родителя, а панель обязана остаться резкой.
 * Настройки применяются сразу при выборе — «Применить» тут лишняя ступень:
 * человек должен видеть результат, а не угадывать его.
 */
export default function A11yPanel() {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<A11ySettings>(A11Y_DEFAULTS);
    const ref = useFocusTrap(open);

    // Сервер про localStorage не знает, поэтому стартуем с умолчаний
    // и выравниваемся в эффекте — иначе расхождение гидрации.
    useEffect(() => {
        setSettings(readA11ySettings());
        const openPanel = () => setOpen(true);
        window.addEventListener(A11Y_OPEN_EVENT, openPanel);
        return () => window.removeEventListener(A11Y_OPEN_EVENT, openPanel);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    const apply = (patch: Partial<A11ySettings>) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        writeA11ySettings(next);
    };

    if (!open) return null;

    return (
        <Portal>
            <div className={styles.backdrop} onClick={() => setOpen(false)}>
                <div
                    ref={ref}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Настройки отображения"
                    className={styles.panel}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.head}>
                        <h2 className={styles.title}>Настройки отображения</h2>
                        <button
                            type="button"
                            className={styles.close}
                            onClick={() => setOpen(false)}
                        >
                            Закрыть
                        </button>
                    </div>

                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={settings.on}
                            onChange={(e) => apply({ on: e.target.checked })}
                        />
                        <span>Версия для слабовидящих</span>
                    </label>

                    {/* disabled на fieldset выключает вложенные поля и убирает
                        их из обхода табом — выключенный режим не должен
                        подсовывать клавиатуре мёртвые контролы. */}
                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Размер шрифта</legend>
                        <div className={styles.options}>
                            {FONTS.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-font"
                                        checked={settings.font === item.value}
                                        onChange={() => apply({ font: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Цветовая схема</legend>
                        <div className={styles.options}>
                            {SCHEMES.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-scheme"
                                        checked={settings.scheme === item.value}
                                        onChange={() => apply({ scheme: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Интервал между буквами</legend>
                        <div className={styles.options}>
                            {LETTERS.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-letter"
                                        checked={settings.letter === item.value}
                                        onChange={() => apply({ letter: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Изображения</legend>
                        <div className={styles.options}>
                            <label className={styles.option}>
                                <input
                                    type="radio"
                                    name="a11y-images"
                                    checked={settings.images}
                                    onChange={() => apply({ images: true })}
                                />
                                <span>Показывать</span>
                            </label>
                            <label className={styles.option}>
                                <input
                                    type="radio"
                                    name="a11y-images"
                                    checked={!settings.images}
                                    onChange={() => apply({ images: false })}
                                />
                                <span>Скрыть</span>
                            </label>
                        </div>
                    </fieldset>

                    <button
                        type="button"
                        className={styles.reset}
                        onClick={() => apply(A11Y_DEFAULTS)}
                    >
                        Вернуть обычную версию
                    </button>
                </div>
            </div>
        </Portal>
    );
}
```

- [ ] **Step 3: Написать стили панели**

Создать `app/(site)/components/a11y/A11yPanel.module.css`:

```css
/* Подложка перехватывает клик мимо панели и затемняет страницу. */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 16px;
  background: rgba(8, 24, 58, 0.45);
}

/* Панель непрозрачная и без стекла: в режиме для слабовидящих размытие и
   полупрозрачность — ровно то, от чего человек сюда и пришёл. */
.panel {
  width: min(380px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 20px;
  border: 2px solid var(--ink);
  border-radius: var(--radius);
  background: var(--paper);
  color: var(--ink);
  display: grid;
  gap: 16px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 1.25rem;
}

.close {
  border: 1px solid var(--ink);
  border-radius: 999px;
  padding: 4px 12px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}

.switch {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  cursor: pointer;
}

.group {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

/* Выключенная группа остаётся читаемой, но видно, что она неактивна. */
.group:disabled {
  opacity: 0.5;
}

.legend {
  padding: 0 6px;
  font-weight: 600;
}

.options {
  display: grid;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.reset {
  border: 1px solid var(--ink);
  border-radius: var(--radius);
  padding: 10px 14px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}

.close:focus-visible,
.reset:focus-visible,
.option input:focus-visible,
.switch input:focus-visible {
  outline: var(--focus) solid currentColor;
  outline-offset: 3px;
}
```

- [ ] **Step 4: Подключить кнопку и панель вместо прежнего переключателя**

В `app/(site)/layout.tsx` заменить импорт `A11yToggle` на:

```tsx
import A11yTrigger from "@/app/(site)/components/a11y/A11yTrigger";
import A11yPanel from "@/app/(site)/components/a11y/A11yPanel";
```

Внутри `.a11y-row` использовать `<A11yTrigger />`, а панель смонтировать один
раз рядом с `<CookieBanner />`:

```tsx
            <Footer />
            <CookieBanner />
            <A11yPanel />
```

В `app/(site)/components/Footer.tsx` заменить импорт и использование:

```tsx
import A11yTrigger from "@/app/(site)/components/a11y/A11yTrigger";
```

```tsx
          <A11yTrigger className={styles.a11yBtn} />
```

В `app/(admin)/admin/components/shell/Topbar.tsx` — то же самое:

```tsx
import A11yTrigger from "@/app/(site)/components/a11y/A11yTrigger";
```

```tsx
                <A11yTrigger className={styles.a11y} />
```

В `app/(admin)/admin/layout.tsx` смонтировать панель рядом с `<HotkeyLayer />`:

```tsx
                    <HotkeyLayer />
                    <A11yPanel />
```

с импортом:

```tsx
import A11yPanel from "@/app/(site)/components/a11y/A11yPanel";
```

- [ ] **Step 5: Удалить прежний компонент**

```bash
git rm "app/(site)/components/A11yToggle.tsx"
```

- [ ] **Step 6: Проверить, что ничего не осталось от старого имени**

Run: `grep -rn "A11yToggle" app lib`
Expected: пусто.

- [ ] **Step 7: Собрать и проверить вживую**

Run: `npm test && npm run build`
Expected: тесты PASS, сборка без ошибок.

Run: `npm run dev`, открыть `http://localhost:3000`:
- кнопка «Версия для слабовидящих» открывает панель;
- каждый контрол меняет вид страницы сразу;
- Escape и клик мимо закрывают панель, фокус возвращается на кнопку;
- Tab не выходит за пределы панели;
- «Вернуть обычную версию» возвращает исходный вид;
- после перезагрузки выбранные настройки сохраняются и применяются без
  промежуточного кадра обычной версии;
- то же самое на `/admin` (панель там тоже открывается из топбара).

- [ ] **Step 8: Коммит**

```bash
git add "app/(site)/components/a11y" "app/(site)/layout.tsx" "app/(site)/components/Footer.tsx" "app/(admin)/admin/components/shell/Topbar.tsx" "app/(admin)/admin/layout.tsx"
git commit -m "feat(a11y): панель настроек отображения вместо одной кнопки"
```

---

### Task 4: Согласие на обработку персональных данных

Галочка и ссылка на политику под каждой формой сбора данных. Сейчас такая
форма на витрине одна — контактная; компонент и валидатор общие, чтобы формы
отзыва и обращений из плана C получили то же поведение без копирования.

**Files:**
- Create: `lib/forms/lead.ts`
- Create: `lib/forms/lead.test.ts`
- Create: `app/(site)/components/ConsentCheckbox.tsx`
- Modify: `app/globals.css` (в конец файла)
- Modify: `app/(site)/contacts/ContactForm.tsx`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: тип `LeadDraft { name: string; email: string; phone: string;
  message: string; consent: boolean }`, тип `LeadErrors =
  Partial<Record<keyof LeadDraft, string>>`, константу `CONSENT_ERROR: string`,
  функцию `validateLead(draft: LeadDraft): LeadErrors`, компонент
  `ConsentCheckbox` с пропсами `{ id?: string; checked: boolean; onChange:
  (next: boolean) => void; error?: string; className?: string }`.

- [ ] **Step 1: Написать падающий тест**

Создать `lib/forms/lead.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CONSENT_ERROR, type LeadDraft, validateLead } from "./lead";

const valid: LeadDraft = {
    name: "Иван",
    email: "ivan@example.com",
    phone: "+7 917 000-00-00",
    message: "Хочу записаться на приём",
    consent: true,
};

describe("validateLead", () => {
    it("на заполненной форме с согласием ошибок нет", () => {
        expect(validateLead(valid)).toEqual({});
    });

    it("без согласия отправка запрещена", () => {
        expect(validateLead({ ...valid, consent: false })).toEqual({
            consent: CONSENT_ERROR,
        });
    });

    it("имя из одних пробелов не считается заполненным", () => {
        expect(validateLead({ ...valid, name: "   " }).name).toBe("Укажите имя");
    });

    it("требует правдоподобный e-mail", () => {
        expect(validateLead({ ...valid, email: "ivan@" }).email).toBeDefined();
        expect(validateLead({ ...valid, email: "" }).email).toBeDefined();
    });

    it("телефон необязателен, но недописанный отвергает", () => {
        expect(validateLead({ ...valid, phone: "" }).phone).toBeUndefined();
        expect(validateLead({ ...valid, phone: "+7 917 12" }).phone).toBeDefined();
    });

    it("требует текст сообщения", () => {
        expect(validateLead({ ...valid, message: " " }).message).toBeDefined();
    });

    it("сообщает обо всех ошибках сразу, а не об одной", () => {
        const errors = validateLead({
            name: "",
            email: "",
            phone: "",
            message: "",
            consent: false,
        });
        expect(Object.keys(errors).sort()).toEqual([
            "consent",
            "email",
            "message",
            "name",
        ]);
    });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- lib/forms/lead.test.ts`
Expected: FAIL — «Failed to resolve import "./lead"».

- [ ] **Step 3: Написать минимальную реализацию**

Создать `lib/forms/lead.ts`:

```ts
/** Черновик заявки из формы на витрине. */
export interface LeadDraft {
    name: string;
    email: string;
    phone: string;
    message: string;
    consent: boolean;
}

export type LeadErrors = Partial<Record<keyof LeadDraft, string>>;

/**
 * Согласие на обработку персональных данных обязательно: без него отправка
 * формы — обработка данных без основания (ст. 9 152-ФЗ, требование
 * Постановления № 659).
 */
export const CONSENT_ERROR =
    "Без согласия на обработку персональных данных отправить заявку нельзя";

/** Не полноценная проверка по RFC, а отсев опечаток вроде «ivan@». */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Пустой объект — форму можно отправлять. Возвращаем сразу все ошибки:
 * форма, которая показывает их по одной, заставляет отправлять вслепую.
 */
export function validateLead(draft: LeadDraft): LeadErrors {
    const errors: LeadErrors = {};

    if (!draft.name.trim()) errors.name = "Укажите имя";
    if (!EMAIL.test(draft.email.trim())) errors.email = "Укажите корректный e-mail";

    // Телефон необязателен, но если введён — это должен быть телефон целиком.
    const digits = draft.phone.replace(/\D/g, "");
    if (digits && digits.length < 10) errors.phone = "Укажите телефон полностью";

    if (!draft.message.trim()) errors.message = "Напишите сообщение";
    if (!draft.consent) errors.consent = CONSENT_ERROR;

    return errors;
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npm test -- lib/forms/lead.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать компонент галочки**

Создать `app/(site)/components/ConsentCheckbox.tsx`:

```tsx
"use client";

import Link from "next/link";

/**
 * Галочка согласия под формой сбора персональных данных. Ссылка на политику
 * открывается в новой вкладке: уводить человека со страницы, когда форма уже
 * заполнена, значит потерять заполненное.
 */
export default function ConsentCheckbox({
    id = "consent",
    checked,
    onChange,
    error,
    className = "",
}: {
    id?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    error?: string;
    className?: string;
}) {
    const errorId = `${id}-error`;

    return (
        <div className={className}>
            <label htmlFor={id} className="consent">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                />
                <span>
                    Я даю согласие на обработку персональных данных и принимаю{" "}
                    <Link href="/privacy" target="_blank" rel="noreferrer">
                        Политику обработки персональных данных
                    </Link>
                </span>
            </label>
            {error ? (
                <p id={errorId} role="alert" className="consent-error">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 6: Добавить стили галочки**

В конец `app/globals.css`:

```css
/* ── Согласие на обработку персональных данных ─────────────────────────
   Общий стиль для всех форм сбора данных: контактной, отзыва, обращения. */
.consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-soft);
  cursor: pointer;
}

/* Галочка не должна сжиматься при длинной подписи в две-три строки. */
.consent input {
  flex: none;
  margin-top: 0.2em;
  width: 18px;
  height: 18px;
}

.consent a {
  color: var(--brand);
}

.consent-error {
  margin: 6px 0 0;
  color: #b3261e;
  font-size: 0.9rem;
}
```

- [ ] **Step 7: Подключить проверку и галочку к контактной форме**

В `app/(site)/contacts/ContactForm.tsx`:

добавить импорты

```tsx
import ConsentCheckbox from '@/app/(site)/components/ConsentCheckbox';
import { type LeadErrors, validateLead } from '@/lib/forms/lead';
```

заменить начальное состояние и добавить состояния согласия и ошибок

```tsx
const initialForm = { name: '', email: '', phone: '', message: '' };

export default function ContactForm() {
  const [formData, setFormData] = useState(initialForm);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>('idle');
```

в начале `handleSubmit`, сразу после `setStatus` убрать преждевременный
перевод в `sending` и поставить проверку:

```tsx
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;

    // Проверяем до отправки: без согласия данные уходить не должны вовсе.
    const found = validateLead({ ...formData, consent });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus('sending');
```

в конце удачной отправки сбросить и согласие:

```tsx
      setStatus('success');
      setFormData(initialForm);
      setConsent(false);
```

и перед кнопкой отправки добавить галочку:

```tsx
        <ConsentCheckbox
          checked={consent}
          onChange={(next) => {
            setConsent(next);
            // Убираем ошибку сразу, как её исправили: висящий красный текст
            // под уже поставленной галочкой читается как «всё ещё не так».
            setErrors((prev) => ({ ...prev, consent: undefined }));
          }}
          error={errors.consent}
        />

        <button
```

- [ ] **Step 8: Проверить форму вживую**

Run: `npm test && npm run build`, затем `npm run dev` и открыть
`http://localhost:3000/contacts`.

Expected:
- отправка без галочки не уходит, под галочкой появляется красное объяснение;
- ссылка «Политику обработки персональных данных» открывает `/privacy`
  в новой вкладке, заполненная форма при этом не теряется;
- после установки галочки ошибка исчезает, форма отправляется;
- в режиме для слабовидящих галочка и текст читаются во всех трёх схемах.

- [ ] **Step 9: Коммит**

```bash
git add lib/forms "app/(site)/components/ConsentCheckbox.tsx" app/globals.css "app/(site)/contacts/ContactForm.tsx"
git commit -m "feat(forms): согласие на обработку персональных данных у формы заявки"
```

---

### Task 5: Справочник раскрытия информации

Данные раздела — отдельным модулем, а не внутри страницы: их правят люди, не
знающие React, и на них стоит тест. Тест сторожит главное, что ломается молча,
— ссылку на несуществующий PDF.

**Files:**
- Create: `lib/disclosure.ts`
- Test: `lib/disclosure.test.ts`

**Interfaces:**
- Consumes: `CLINIC` из `@/lib/constants`.
- Produces: типы `Requisites`, `DisclosureDoc`, `Regulator`; константы
  `REQUISITES: Requisites`, `DISCLOSURE_DOCS: DisclosureDoc[]`,
  `GUARANTEE_PROGRAM: { title: string; href: string }`,
  `DMS_PARTNERS: string[]`, `REGULATORS: Regulator[]`;
  функцию `omsNotice(legalName: string): string`.

- [ ] **Step 1: Написать падающий тест**

Создать `lib/disclosure.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    DISCLOSURE_DOCS,
    REGULATORS,
    omsNotice,
} from "./disclosure";

describe("DISCLOSURE_DOCS", () => {
    it("на каждый объявленный документ есть файл в public/", () => {
        for (const doc of DISCLOSURE_DOCS) {
            const path = join(process.cwd(), "public", doc.href);
            expect(existsSync(path), `нет файла для «${doc.title}»: ${doc.href}`).toBe(true);
        }
    });

    it("у каждого документа есть заголовок и ссылка", () => {
        for (const doc of DISCLOSURE_DOCS) {
            expect(doc.title.trim().length).toBeGreaterThan(0);
            expect(doc.href.startsWith("/")).toBe(true);
        }
    });

    it("ссылки не повторяются", () => {
        const hrefs = DISCLOSURE_DOCS.map((doc) => doc.href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });
});

describe("omsNotice", () => {
    it("подставляет наименование организации", () => {
        expect(omsNotice('ООО «Премиум»')).toBe(
            'Внимание: ООО «Премиум» НЕ оказывает медицинские услуги в рамках программы обязательного медицинского страхования (ОМС).',
        );
    });

    it("пока наименование не заполнено, подставляет название клиники", () => {
        expect(omsNotice("")).toContain("Клиника «Премиум»");
        expect(omsNotice("   ")).toContain("Клиника «Премиум»");
    });
});

describe("REGULATORS", () => {
    it("у каждого ведомства есть название и сайт по https", () => {
        expect(REGULATORS.length).toBeGreaterThanOrEqual(3);
        for (const org of REGULATORS) {
            expect(org.name.trim().length).toBeGreaterThan(0);
            expect(org.site.startsWith("https://")).toBe(true);
        }
    });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- lib/disclosure.test.ts`
Expected: FAIL — «Failed to resolve import "./disclosure"».

- [ ] **Step 3: Написать минимальную реализацию**

Создать `lib/disclosure.ts`:

```ts
import { CLINIC } from "./constants";

/**
 * Раскрытие информации по Постановлению Правительства РФ № 659.
 *
 * Поля, которые обязана предоставить клиника, оставлены пустыми строками:
 * страница пустое поле не печатает, а придуманный ИНН хуже отсутствующего.
 * Список документов сторожит lib/disclosure.test.ts — объявить ссылку на
 * файл, которого нет в public/, не получится.
 */

export interface Requisites {
    legalName: string;
    inn: string;
    ogrn: string;
    registeredAt: string;
    legalAddress: string;
    actualAddress: string;
}

export const REQUISITES: Requisites = {
    legalName: "",
    inn: "",
    ogrn: "",
    registeredAt: "",
    legalAddress: "",
    actualAddress: CLINIC.addressFull,
};

export interface DisclosureDoc {
    title: string;
    href: string;
    note?: string;
}

/**
 * Порядок важен: договор и прейскурант проверяют первыми. Лицензия и текст
 * Постановления № 659 добавляются, когда клиника пришлёт файлы, — см. раздел
 * «Дозаполнение после получения данных» в плане.
 */
export const DISCLOSURE_DOCS: DisclosureDoc[] = [
    {
        title: "Образец договора на оказание платных медицинских услуг",
        href: "/docs/contract.pdf",
    },
    {
        title: "Прейскурант цен",
        href: "/docs/price.pdf",
        note: "Действующий; цены совпадают с кассой клиники",
    },
    {
        title: "Выписка из реестра лицензий",
        href: "/docs/reestr.pdf",
    },
    {
        title: "Свидетельство о постановке на налоговый учёт (ИНН/КПП)",
        href: "/docs/nalog.pdf",
    },
];

/** Территориальная программа госгарантий. href пустой — блок не печатается. */
export const GUARANTEE_PROGRAM = {
    title:
        "Территориальная программа государственных гарантий бесплатного оказания гражданам медицинской помощи в Республике Башкортостан",
    href: "",
};

/** Страховые компании-партнёры по ДМС. */
export const DMS_PARTNERS: string[] = [];

/**
 * Требование постановления — заявить отсутствие ОМС прямо и крупно.
 * Формулировка собирается из наименования, чтобы не разъезжаться с реквизитами.
 */
export function omsNotice(legalName: string): string {
    const org = legalName.trim() || CLINIC.name;
    return `Внимание: ${org} НЕ оказывает медицинские услуги в рамках программы обязательного медицинского страхования (ОМС).`;
}

export interface Regulator {
    name: string;
    address: string;
    phone: string;
    site: string;
}

/**
 * Адреса и телефоны сверяются на официальных сайтах ведомств: они меняются
 * чаще, чем сами сайты. Пустые поля страница не печатает.
 */
export const REGULATORS: Regulator[] = [
    {
        name: "Министерство здравоохранения Республики Башкортостан",
        address: "",
        phone: "",
        site: "https://health.bashkortostan.ru",
    },
    {
        name: "Управление Роспотребнадзора по Республике Башкортостан",
        address: "",
        phone: "",
        site: "https://02.rospotrebnadzor.ru",
    },
    {
        name: "Территориальный орган Росздравнадзора по Республике Башкортостан",
        address: "",
        phone: "",
        site: "https://roszdravnadzor.gov.ru",
    },
];
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npm test -- lib/disclosure.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add lib/disclosure.ts lib/disclosure.test.ts
git commit -m "feat(disclosure): справочник данных раскрытия информации"
```

---

### Task 6: Раздел «Раскрытие информации»

Страница собирается из справочника задачи 5 на существующем маршруте
`/documents`: он уже в `sitemap.ts` и в футере, менять адрес — ломать внешние
ссылки без выигрыша. В меню пункт называется «Документы» (ТЗ допускает это
наименование): «Раскрытие информации» в один ряд с шестью существующими
ссылками не помещается, а заголовок страницы и ссылка в футере несут полное
название.

**Files:**
- Modify: `app/(site)/documents/page.tsx` (заменяется целиком)
- Create: `app/(site)/documents/page.module.css`
- Modify: `lib/constants.ts` (`NAV_LINKS`)
- Modify: `app/(site)/components/Footer.tsx` (подпись ссылки)

**Interfaces:**
- Consumes: `REQUISITES`, `DISCLOSURE_DOCS`, `GUARANTEE_PROGRAM`,
  `DMS_PARTNERS`, `REGULATORS`, `omsNotice` из задачи 5; `CLINIC` из
  `@/lib/constants`; общие классы `page`, `link-list`, `link-item` из
  `app/globals.css`.
- Produces: маршрут `/documents` с якорями `#requisites`, `#docs`, `#oms`,
  `#regulators`.

- [ ] **Step 1: Переписать страницу**

Заменить содержимое `app/(site)/documents/page.tsx` целиком:

```tsx
import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";
import {
    DISCLOSURE_DOCS,
    DMS_PARTNERS,
    GUARANTEE_PROGRAM,
    REGULATORS,
    REQUISITES,
    omsNotice,
} from "@/lib/disclosure";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Раскрытие информации",
    description:
        "Реквизиты, лицензия, прейскурант, образец договора, сведения об ОМС и ДМС и контакты контролирующих органов клиники «Премиум» в Уфе.",
};

/** Строка реквизита печатается, только если значение заполнено. */
function Requisite({ label, value }: { label: string; value: string }) {
    if (!value.trim()) return null;
    return (
        <div className={styles.requisite}>
            <dt className={styles.requisiteLabel}>{label}</dt>
            <dd className={styles.requisiteValue}>{value}</dd>
        </div>
    );
}

export default function DisclosurePage() {
    return (
        <div className="page">
            <h1>Раскрытие информации</h1>
            <p className={styles.lead}>
                Сведения, которые медицинская организация обязана публиковать в
                соответствии с Постановлением Правительства РФ № 659.
            </p>

            <nav className={styles.toc} aria-label="Разделы страницы">
                <a href="#requisites">Реквизиты</a>
                <a href="#docs">Документы</a>
                <a href="#oms">ОМС и ДМС</a>
                <a href="#regulators">Контролирующие органы</a>
            </nav>

            <section id="requisites" className={styles.section}>
                <h2>Реквизиты организации</h2>
                <dl className={styles.requisites}>
                    <Requisite label="Полное наименование" value={REQUISITES.legalName} />
                    <Requisite label="ИНН" value={REQUISITES.inn} />
                    <Requisite label="ОГРН" value={REQUISITES.ogrn} />
                    <Requisite label="Дата регистрации" value={REQUISITES.registeredAt} />
                    <Requisite label="Юридический адрес" value={REQUISITES.legalAddress} />
                    <Requisite label="Фактический адрес" value={REQUISITES.actualAddress} />
                    <Requisite label="Телефон" value={CLINIC.phone} />
                    <Requisite label="Электронная почта" value={CLINIC.email} />
                    <Requisite
                        label="Режим работы"
                        value={`${CLINIC.hoursWeekdays}; ${CLINIC.hoursWeekend}`}
                    />
                </dl>
            </section>

            <section id="docs" className={styles.section}>
                <h2>Документы</h2>
                <p>Файлы открываются в новой вкладке.</p>
                <ul className="link-list">
                    {DISCLOSURE_DOCS.map((doc) => (
                        <li key={doc.href} className="link-item">
                            <span className={styles.docTitle}>
                                <a href={doc.href} target="_blank" rel="noreferrer">
                                    {doc.title}
                                </a>
                                {doc.note ? <span className={styles.note}>{doc.note}</span> : null}
                            </span>
                            <span>PDF</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section id="oms" className={styles.section}>
                <h2>Обязательное и добровольное медицинское страхование</h2>

                <p className={styles.omsNotice}>{omsNotice(REQUISITES.legalName)}</p>

                {GUARANTEE_PROGRAM.href ? (
                    <p>
                        <a href={GUARANTEE_PROGRAM.href} target="_blank" rel="noreferrer">
                            {GUARANTEE_PROGRAM.title}
                        </a>
                    </p>
                ) : null}

                <h3>Страховые компании-партнёры по ДМС</h3>
                {DMS_PARTNERS.length > 0 ? (
                    <ul className={styles.partners}>
                        {DMS_PARTNERS.map((name) => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        Список партнёров уточняйте по телефону{" "}
                        <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
                    </p>
                )}
            </section>

            <section id="regulators" className={styles.section}>
                <h2>Контролирующие органы</h2>
                <ul className={styles.regulators}>
                    {REGULATORS.map((org) => (
                        <li key={org.site} className={styles.regulator}>
                            <h3 className={styles.regulatorName}>{org.name}</h3>
                            {org.address ? <p className={styles.regulatorLine}>{org.address}</p> : null}
                            {org.phone ? (
                                <p className={styles.regulatorLine}>
                                    <a href={`tel:${org.phone.replace(/[^\d+]/g, "")}`}>{org.phone}</a>
                                </p>
                            ) : null}
                            <p className={styles.regulatorLine}>
                                <a href={org.site} target="_blank" rel="noreferrer">
                                    {org.site}
                                </a>
                            </p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
```

- [ ] **Step 2: Написать стили страницы**

Создать `app/(site)/documents/page.module.css`:

```css
.lead {
  margin: 0 0 24px;
  color: var(--ink-soft);
  max-width: 62ch;
}

.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.section {
  margin-bottom: 48px;
  /* Якорь из оглавления не должен уезжать под фиксированную шапку. */
  scroll-margin-top: calc(var(--header-h) + 24px);
}

.requisites {
  display: grid;
  gap: 10px;
  margin: 0;
}

.requisite {
  display: grid;
  grid-template-columns: minmax(180px, 32%) 1fr;
  gap: 8px 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

/* На узком экране подпись встаёт над значением: две колонки в 360px
   превращают каждое значение в столбик по одному слову. */
@media (max-width: 560px) {
  .requisite {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

.requisiteLabel {
  color: var(--ink-soft);
}

.requisiteValue {
  margin: 0;
  font-weight: 600;
}

.docTitle {
  display: grid;
  gap: 2px;
}

.note {
  color: var(--ink-soft);
  font-size: 0.88rem;
}

/* Требование постановления — заявить отсутствие ОМС заметно, а не сноской. */
.omsNotice {
  margin: 0 0 20px;
  padding: 16px 18px;
  border: 2px solid var(--brand);
  border-radius: var(--radius);
  font-size: clamp(1.05rem, 2.2vw, 1.35rem);
  font-weight: 600;
  line-height: 1.4;
}

.partners {
  margin: 0;
  padding-left: 1.2em;
  display: grid;
  gap: 6px;
}

.regulators {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 20px;
}

.regulator {
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.regulatorName {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.regulatorLine {
  margin: 0 0 4px;
  color: var(--ink-soft);
}
```

- [ ] **Step 3: Добавить пункт меню**

В `lib/constants.ts` в `NAV_LINKS` вставить пункт перед «Контакты»:

```ts
export const NAV_LINKS = [
    { href: "/services", label: "Услуги" },
    { href: "/doctors", label: "Врачи" },
    { href: "/blog", label: "Блог" },
    { href: "/eeg", label: "ЭЭГ" },
    { href: "/documents", label: "Документы" },
    { href: "/contacts", label: "Контакты" },
    { href: "/#address", label: "Адрес" },
] as const;
```

- [ ] **Step 4: Переименовать ссылку в футере**

В `app/(site)/components/Footer.tsx` заменить подпись:

```tsx
              <Link href="/documents" className={styles.link}>Раскрытие информации</Link>
```

- [ ] **Step 5: Проверить сборку и тесты**

Run: `npm test && npm run build`
Expected: тесты PASS, сборка без ошибок.

- [ ] **Step 6: Проверить страницу вживую**

Run: `npm run dev`, открыть `http://localhost:3000/documents`.

Expected:
- четыре раздела с работающим оглавлением, якорь не уезжает под шапку;
- незаполненные реквизиты не печатаются пустыми строками;
- все четыре ссылки на PDF открываются;
- надпись об отсутствии ОМС видна сразу, без прокрутки внутри раздела;
- пункт «Документы» есть в шапке и в мобильном меню, шапка не переносится
  на вторую строку при ширине 1280 и 1024;
- страница читается в трёх схемах режима для слабовидящих и при ширине 360.

- [ ] **Step 7: Коммит**

```bash
git add "app/(site)/documents" lib/constants.ts "app/(site)/components/Footer.tsx"
git commit -m "feat(disclosure): раздел «Раскрытие информации» и пункт меню"
```

---

## Дозаполнение после получения данных

Отдельные однострочные правки. Каждая — свой коммит; тесты после каждой
обязаны оставаться зелёными.

**Реквизиты** — заполнить в `lib/disclosure.ts`:

```ts
export const REQUISITES: Requisites = {
    legalName: 'ООО «…»',
    inn: "0000000000",
    ogrn: "0000000000000",
    registeredAt: "00.00.0000",
    legalAddress: "…",
    actualAddress: CLINIC.addressFull,
};
```

**Лицензия и текст постановления** — положить файлы в `public/docs/` и
добавить в `DISCLOSURE_DOCS`:

```ts
    {
        title: "Медицинская лицензия (все страницы с приложениями)",
        href: "/docs/license.pdf",
    },
    {
        title: "Постановление Правительства РФ от 22.04.2025 № 659",
        href: "/docs/pp-659.pdf",
    },
```

**Территориальная программа госгарантий** — положить PDF в `public/docs/` и
заполнить `href`:

```ts
export const GUARANTEE_PROGRAM = {
    title:
        "Территориальная программа государственных гарантий бесплатного оказания гражданам медицинской помощи в Республике Башкортостан",
    href: "/docs/tpgg-rb.pdf",
};
```

**Партнёры по ДМС**:

```ts
export const DMS_PARTNERS: string[] = ["…", "…"];
```

**Адреса и телефоны ведомств** — сверить на их сайтах и заполнить `address`
и `phone` в `REGULATORS`.

## Self-Review

Проверено после написания плана:

1. **Покрытие ТЗ планом A.** Версия для слабовидящих — задачи 1–3; галочка
   согласия и ссылка на политику под формой — задача 4; раздел «Раскрытие
   информации» с реквизитами, документами, блоком ОМС/ДМС и контролирующими
   органами — задачи 5–6. Пункты ТЗ про сведения о врачах и про интерактивные
   блоки в план A не входят намеренно — они вынесены в планы B и C.
2. **Заглушки.** Пустые строки в `REQUISITES`, `GUARANTEE_PROGRAM.href`,
   `DMS_PARTNERS` и полях `REGULATORS` — не заглушки плана, а отсутствующие у
   нас данные клиники: страница их не печатает, а точные правки для каждого
   случая даны выше.
3. **Согласованность имён.** `A11Y_OPEN_EVENT`, `readA11ySettings`,
   `writeA11ySettings`, `a11yDataset`, `A11Y_INIT_SCRIPT` из задачи 1
   используются задачами 2 и 3 под теми же именами; `validateLead`/`LeadErrors`
   из задачи 4 — в контактной форме; `omsNotice`, `REQUISITES`,
   `DISCLOSURE_DOCS`, `GUARANTEE_PROGRAM`, `DMS_PARTNERS`, `REGULATORS` из
   задачи 5 — на странице задачи 6. Расхождений нет.
4. **Порядок задач.** Задачи 1→2→3 связаны по данным; 4 независима; 5→6
   связаны. Любая задача заканчивается зелёными тестами и сборкой.
5. **Исправлено при самопроверке.** Первая редакция задачи 2 предлагала
   заменить блок `html[data-a11y="1"]` коротким набором цветов — он на 65
   строк и выключает ещё стекло, сцену и кольцо фокуса, так что исполнитель
   снёс бы работающее поведение. Шаг переписан: блок остаётся один, схема
   задаёт только палитру `--a11y-*`; добавлен шаг 2a про розовый скин
   админки, который иначе пережил бы переключение схемы. Из задачи 1 убрано
   событие `A11Y_EVENT`: после того как кнопки стали без состояния, его никто
   не слушает.
