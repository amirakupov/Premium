# Витрина блога: показ AI-статей из CMS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать на витрине статьи, которые бекенд уже генерирует и публикует, в типографике сайта — с выраженной иерархией шрифтов и кеглей и с картинками.

**Architecture:** Четыре независимых слоя. `lib/cms.ts` тянет `BlogPost` из существующего Spring-бекенда через уже написанный `fetchCms` (ISR 3600 c). `lib/blog/article.ts` — чистая функция, разбирающая модельный HTML в структуру блоков по закрытому белому списку тегов. `lib/blog/images.ts` — чистый детерминированный подбор картинок из уже лежащих в `/public` ассетов. Страницы и компоненты в `app/(site)/blog/**` рендерят эту структуру React-элементами; `dangerouslySetInnerHTML` для содержимого статьи не используется нигде.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, CSS Modules, `node-html-parser@9`, `vitest@4`.

**Spec:** `docs/superpowers/specs/2026-08-25-blog-frontend-design.md`

## Global Constraints

- Node `>=22 <23` (`package.json` → `engines`). Пакетный менеджер — npm.
- Новые зависимости — ровно две: `node-html-parser` (prod), `vitest` (dev). Больше ничего не добавлять.
- Комментарии в коде — по-русски, как во всём проекте. Комментарий объясняет **почему**, а не пересказывает код.
- Сообщения коммитов — по-русски, с conventional-префиксом (`feat(blog):`, `test(blog):`, `chore:`). **Никакого `Co-Authored-By`.**
- Только CSS Modules и существующие токены из `app/globals.css` (`--font-head`, `--font-body`, `--ink`, `--ink-soft`, `--brand`, `--container`, `--gutter`, `--section-y`, `--radius`, `--radius-lg`, `--glass-*`, `--spring`). Новых глобальных токенов не вводить.
- `dangerouslySetInnerHTML` запрещён для содержимого статьи. Единственное исключение — блок JSON-LD (см. Task 9), там он стандартен и содержимое экранируется.
- Никакого `Math.random()` и `Date.now()` в подборе картинок: при ISR страница рендерится многократно, и случайный выбор дал бы разную картинку в разных копиях кеша.
- Страницы блога **не рендерят свой `<main>`** — `app/(site)/layout.tsx:14` уже оборачивает `children` в `<main className="site-main">`, вложенный `main` невалиден.
- `data-reveal`-атрибуты не ставить: `SectionMotion` смонтирован только на главной (`app/(site)/page.tsx:39`), на блоге они ничего не делают.
- После каждой задачи: `npx tsc --noEmit` проходит чисто.

## Отклонения от спеки

Одно, осознанное. Спека говорит: при пустом или неразбираемом `body` собрать `lead` «из первых предложений `plainText`». Любое правило обрезки здесь теряет текст, поэтому вместо этого весь извлечённый текст кладётся **целиком** одним абзацем в `intro`, а `lead` остаётся `null` (в коде — флаг `degenerate` в `parseArticle`). Причина ровно эта: лидовый кегль 1.35rem предназначен для двух-трёх предложений, и набирать им всю статью нельзя, а обрезка теряла бы контент. Цель спеки — не падать и не терять текст — достигнута.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `vitest.config.ts` | создать: конфиг раннера, явный `include` |
| `lib/format.ts` | изменить: добавить `formatArticleDate`, `articleDateIso` |
| `lib/format.test.ts` | создать: тесты форматтера даты |
| `lib/types.ts` | изменить: добавить `BlogPost` |
| `lib/cms.ts` | изменить: добавить `listBlogPosts`, `getBlogPostBySlug` |
| `lib/blog/article.ts` | создать: HTML → `Article` |
| `lib/blog/article.test.ts` | создать: тесты парсера |
| `lib/blog/images.ts` | создать: `pickArt` |
| `lib/blog/images.test.ts` | создать: тесты подбора |
| `lib/constants.ts` | изменить: пункт «Блог» в `NAV_LINKS` |
| `app/sitemap.ts` | изменить: `/blog` и статьи |
| `app/(site)/blog/page.tsx` + `.module.css` | создать: индекс |
| `app/(site)/components/blog/BlogCard.tsx` + `.module.css` | создать: карточка списка |
| `app/(site)/components/blog/ArticleBody.tsx` + `.module.css` | создать: рендер блоков и типографика статьи |
| `app/(site)/components/blog/ArticleFaq.tsx` + `.module.css` | создать: FAQ на `<details>` |
| `app/(site)/components/blog/ArticleToc.tsx` + `.module.css` | создать: sticky-оглавление |
| `app/(site)/blog/[slug]/page.tsx` + `.module.css` | создать: страница статьи, метаданные, JSON-LD |

---

### Task 1: Тест-раннер и форматтер даты

Первый тест-раннер в проекте. Ставится здесь, а не отдельной задачей, потому что первый же тестируемый модуль — форматтер даты — нужен и индексу, и статье.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `lib/format.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: `formatArticleDate(value: unknown): string` — «25 августа 2026» или `""`. `articleDateIso(value: unknown): string` — `"2026-08-25T09:34:56.000Z"` или `""`.

- [ ] **Step 1: Поставить vitest**

```bash
npm install --save-dev vitest@4
```

- [ ] **Step 2: Добавить скрипт `test`**

В `package.json`, в `scripts`, после `"lint"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Создать `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

/**
 * Явный include обязателен: дефолтный шаблон vitest не исключает .next,
 * и раннер подхватывал бы собранные копии тестов из кеша сборки.
 */
export default defineConfig({
    test: {
        environment: "node",
        include: ["lib/**/*.test.ts"],
    },
});
```

- [ ] **Step 4: Написать падающий тест**

Создать `lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { articleDateIso, formatArticleDate } from "./format";

describe("formatArticleDate", () => {
    it("форматирует ISO-строку от Jackson по-русски", () => {
        expect(formatArticleDate("2026-08-25T12:34:56")).toBe("25 августа 2026 г.");
    });

    it("принимает массив чисел — вторую возможную форму LocalDateTime", () => {
        expect(formatArticleDate([2026, 8, 25, 12, 34, 56])).toBe("25 августа 2026 г.");
    });

    it("на мусоре возвращает пустую строку, а не Invalid Date", () => {
        expect(formatArticleDate("не дата")).toBe("");
        expect(formatArticleDate(null)).toBe("");
        expect(formatArticleDate(undefined)).toBe("");
        expect(formatArticleDate([])).toBe("");
    });
});

describe("articleDateIso", () => {
    it("отдаёт машинную дату для <time> и JSON-LD", () => {
        expect(articleDateIso("2026-08-25T12:34:56")).toMatch(/^2026-08-25T/);
    });

    it("на мусоре возвращает пустую строку", () => {
        expect(articleDateIso("нет")).toBe("");
    });
});
```

- [ ] **Step 5: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `formatArticleDate`/`articleDateIso` не экспортируются из `./format`.

- [ ] **Step 6: Реализовать форматтер**

Дописать в конец `lib/format.ts`:

```ts
/**
 * Дата поста из CMS. Бекенд отдаёт Java LocalDateTime; Spring Boot по
 * умолчанию сериализует его ISO-строкой, но конфигурация Jackson может
 * переключить это на массив чисел. Терпим оба варианта: неверно понятая
 * дата не должна давать «Invalid Date» на странице статьи.
 */
function toDate(value: unknown): Date | null {
    if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (Array.isArray(value) && value.length >= 3 && value.every((n) => typeof n === "number")) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
        const parsed = new Date(year, month - 1, day, hour, minute, second);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

/** «2026-08-25T12:34:56» → «25 августа 2026 г.»; на мусоре — пустая строка. */
export function formatArticleDate(value: unknown): string {
    const date = toDate(value);
    if (!date) return "";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Машинная дата для атрибута datetime и JSON-LD; на мусоре — пустая строка. */
export function articleDateIso(value: unknown): string {
    const date = toDate(value);
    return date ? date.toISOString() : "";
}
```

- [ ] **Step 7: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS, 5 тестов.

Если первый тест упал на «25 августа 2026» против «25 августа 2026 г.» — привести ожидание в тесте к фактическому выводу `Intl` для `ru-RU`, а не подгонять форматтер опциями.

- [ ] **Step 8: Проверить типы и закоммитить**

```bash
npx tsc --noEmit
git add package.json package-lock.json vitest.config.ts lib/format.ts lib/format.test.ts
git commit -m "feat(blog): форматтер даты статьи и тест-раннер vitest"
```

---

### Task 2: Тип `BlogPost` и функции CMS

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/cms.ts`

**Interfaces:**
- Consumes: `fetchCms` (приватная функция в `lib/cms.ts:9`, ISR 3600 c, при ошибке возвращает `null`).
- Produces: `BlogPost`; `listBlogPosts(): Promise<BlogPost[]>`; `getBlogPostBySlug(slug: string): Promise<BlogPost | null>`.

Тестов нет: обе функции — сетевой ввод-вывод без логики. Вместо теста — проверка живым запросом на шаге 4.

- [ ] **Step 1: Добавить тип**

Дописать в конец `lib/types.ts`:

```ts
/**
 * Пост блога. Зеркало BlogPostResponseDto бекенда: поля sourceTopic в DTO
 * нет, поэтому тему статьи на фронте приходится выводить из title/keywords.
 */
export interface BlogPost {
    id: number;
    slug: string;
    title: string;
    /** Санитизированный на бекенде HTML: h2, h3, p, ul, ol, li, strong, em, a. */
    body: string;
    metaDescription: string | null;
    keywords: string | null;
    status: "DRAFT" | "PUBLISHED";
    aiGenerated: boolean;
    createdAt: string;
    updatedAt: string;
}
```

- [ ] **Step 2: Добавить функции CMS**

В `lib/cms.ts` поправить импорт типов и дописать функции в конец файла:

```ts
import type { BlogPost, Doctor, Service } from "./types";
```

```ts
/** Опубликованные посты, свежие сверху. Черновики бекенд анонимам не отдаёт. */
export async function listBlogPosts(): Promise<BlogPost[]> {
    const json = await fetchCms("/api/cms/blog");
    if (!Array.isArray(json)) return [];
    return (json as BlogPost[])
        .filter((post) => post.status === "PUBLISHED")
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    const json = await fetchCms(`/api/cms/blog/${encodeURIComponent(slug)}`);
    if (!json || typeof json !== "object") return null;
    return json as BlogPost;
}
```

`filter` по `PUBLISHED` дублирует бекенд намеренно: это страховка на нашей стороне, если права на эндпоинте когда-нибудь ослабят.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: чисто.

- [ ] **Step 4: Проверить формат `createdAt` на живом бекенде**

Спека помечает это как факт, требующий проверки, а не догадки.

```bash
grep -n "BACKEND_URL" .env* 2>/dev/null
curl -s "$BACKEND_URL/api/cms/blog" | head -c 600
```

Ожидание: `createdAt` — ISO-строка вида `"2026-08-25T12:34:56"`. Если пришёл массив `[2026,8,25,...]` — код уже готов (Task 1), но тип `createdAt: string` соврёт; тогда поменять на `createdAt: string | number[]` и обновить `sort` на сравнение через `articleDateIso`.

Если бекенд недоступен или список пуст — записать это в вывод задачи и идти дальше: слой отказов спроектирован ровно на этот случай, а проверка формата повторится в Task 10.

- [ ] **Step 5: Закоммитить**

```bash
git add lib/types.ts lib/cms.ts
git commit -m "feat(blog): тип BlogPost и запросы к блогу в CMS"
```

---

### Task 3: Парсер, часть 1 — инлайн, белый список, ссылки

Половина парсера, отвечающая за безопасность. Отделена от разбора структуры документа (Task 4), потому что проверяется независимо: здесь речь только о том, какие теги и атрибуты вообще способны дойти до браузера.

**Files:**
- Modify: `package.json`
- Create: `lib/blog/article.ts`
- Test: `lib/blog/article.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: типы `Inline`, `Block`, `Section`, `FaqItem`, `Article`; функция `parseArticle(bodyHtml: string): Article`. В этой задаче `parseArticle` возвращает только `intro` и `plainText`; `lead`, `sections`, `faq`, `readingMinutes` появляются в Task 4.

- [ ] **Step 1: Поставить парсер**

```bash
npm install node-html-parser@9
```

- [ ] **Step 2: Написать падающие тесты**

Создать `lib/blog/article.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseArticle, type Block, type Inline } from "./article";

/** Плоский текст блока — чтобы тесты не зависели от формы дерева Inline. */
function text(nodes: Inline[]): string {
    return nodes
        .map((node) => {
            if (node.kind === "text") return node.text;
            if (node.kind === "br") return " ";
            return text(node.children);
        })
        .join("");
}

function firstParagraph(blocks: Block[]): Block & { kind: "p" } {
    const block = blocks.find((b) => b.kind === "p");
    if (!block || block.kind !== "p") throw new Error("абзац не найден");
    return block;
}

describe("parseArticle: инлайн и белый список", () => {
    it("оставляет strong и em, приводя b и i к ним", () => {
        const { intro } = parseArticle("<p><b>Жирный</b> и <i>курсив</i></p>");
        const kinds = firstParagraph(intro).content.map((n) => n.kind);
        expect(kinds).toContain("strong");
        expect(kinds).toContain("em");
    });

    it("разворачивает неизвестный инлайновый тег в его текст", () => {
        const { intro } = parseArticle("<p>до <mark>внутри</mark> после</p>");
        expect(text(firstParagraph(intro).content)).toBe("до внутри после");
    });

    it("выбрасывает script целиком, а не разворачивает в текст", () => {
        const { intro, plainText } = parseArticle("<p>текст</p><script>alert(1)</script>");
        expect(plainText).not.toContain("alert");
        expect(intro).toHaveLength(1);
    });

    it("выбрасывает img и не переносит ни одного атрибута", () => {
        const { intro } = parseArticle('<p>подпись<img src="/x.png" onerror="alert(1)"></p>');
        const content = firstParagraph(intro).content;
        expect(text(content)).toBe("подпись");
        expect(JSON.stringify(content)).not.toContain("onerror");
        expect(JSON.stringify(content)).not.toContain("x.png");
    });

    it("превращает javascript:-ссылку в обычный текст", () => {
        const { intro } = parseArticle('<p><a href="javascript:alert(1)">клик</a></p>');
        const content = firstParagraph(intro).content;
        expect(content.every((n) => n.kind !== "link")).toBe(true);
        expect(text(content)).toBe("клик");
    });

    it("помечает внешнюю ссылку external, а внутреннюю — нет", () => {
        const external = parseArticle('<p><a href="https://ya.ru">там</a></p>');
        const internal = parseArticle('<p><a href="/contacts">тут</a></p>');
        const mail = parseArticle('<p><a href="mailto:a@b.ru">почта</a></p>');
        const linkOf = (blocks: Block[]) => {
            const node = firstParagraph(blocks).content.find((n) => n.kind === "link");
            if (!node || node.kind !== "link") throw new Error("ссылка не найдена");
            return node;
        };
        expect(linkOf(external.intro).external).toBe(true);
        expect(linkOf(internal.intro).external).toBe(false);
        expect(linkOf(mail.intro).external).toBe(false);
    });

    it("сплющивает вложенный список, не теряя пунктов", () => {
        const { intro } = parseArticle(
            "<ul><li>первый<ul><li>вложенный</li></ul></li><li>второй</li></ul>",
        );
        const list = intro.find((b) => b.kind === "list");
        if (!list || list.kind !== "list") throw new Error("список не найден");
        expect(list.items.map(text)).toEqual(["первый", "вложенный", "второй"]);
    });

    it("берёт из таблицы только текст, оборачивая его в абзац", () => {
        const { intro } = parseArticle("<table><tr><td>ячейка</td></tr></table>");
        expect(text(firstParagraph(intro).content)).toBe("ячейка");
    });

    it("не бросает исключение на пустой строке", () => {
        const article = parseArticle("");
        expect(article.intro).toEqual([]);
        expect(article.plainText).toBe("");
    });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL — модуль `./article` не существует.

- [ ] **Step 4: Реализовать инлайновый слой и токенизацию**

Создать `lib/blog/article.ts`:

```ts
import { NodeType, parse, type HTMLElement, type Node } from "node-html-parser";

/** Инлайновый узел статьи. Список закрыт: что не здесь — в браузер не попадёт. */
export type Inline =
    | { kind: "text"; text: string }
    | { kind: "strong"; children: Inline[] }
    | { kind: "em"; children: Inline[] }
    | { kind: "code"; children: Inline[] }
    | { kind: "br" }
    | { kind: "link"; href: string; external: boolean; children: Inline[] };

export type Block =
    | { kind: "p"; content: Inline[] }
    | { kind: "h3"; content: Inline[] }
    | { kind: "quote"; content: Inline[] }
    | { kind: "list"; ordered: boolean; items: Inline[][] };

export interface Section {
    id: string;
    heading: string;
    blocks: Block[];
}

export interface FaqItem {
    question: string;
    answer: Block[];
}

export interface Article {
    /** Первый абзац до первого h2 — по промпту бекенда это прямой ответ на вопрос темы. */
    lead: Inline[] | null;
    /** Остальные блоки до первого h2. */
    intro: Block[];
    sections: Section[];
    faq: FaqItem[];
    plainText: string;
    readingMinutes: number;
}

const BLOCK_TAGS = new Set(["h2", "h3", "p", "ul", "ol", "blockquote"]);

/**
 * h1 понижается: на странице h1 уже занят заголовком поста, вторая первая
 * сущность сломала бы иерархию для скринридеров и разметки. h4–h6 поднимаются
 * до h3 — глубже статья не структурируется.
 */
const TAG_ALIAS: Record<string, string> = { h1: "h2", h4: "h3", h5: "h3", h6: "h3" };

/** Контейнеры, которые Safelist.relaxed пропускает; разворачиваем в детей. */
const UNWRAP_TAGS = new Set(["div", "span", "section", "article", "main", "header", "footer"]);

/** Выбрасываются целиком вместе с содержимым, а не разворачиваются в текст. */
const DROP_TAGS = new Set([
    "script", "style", "img", "picture", "source", "iframe", "object",
    "embed", "svg", "video", "audio", "template", "noscript", "form", "input",
]);

const INLINE_ALIAS: Record<string, "strong" | "em" | "code"> = {
    strong: "strong", b: "strong", em: "em", i: "em", code: "code",
};

const SAFE_SCHEMES = ["https:", "http:", "mailto:", "tel:"];

function isElement(node: Node): node is HTMLElement {
    return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagOf(node: HTMLElement): string {
    return (node.rawTagName ?? "").toLowerCase();
}

function collapse(value: string): string {
    return value.replace(/\s+/g, " ");
}

/**
 * Модельные ссылки не должны ни исполнять код, ни передавать вес сайта.
 * Всё, что не разобралось в безопасную схему, вызывающий код превращает в текст.
 */
function safeHref(raw: string | undefined): { href: string; external: boolean } | null {
    const value = (raw ?? "").trim();
    if (!value) return null;
    if (value.startsWith("/") || value.startsWith("#")) return { href: value, external: false };
    if (value.startsWith("//")) return null;
    try {
        const url = new URL(value);
        if (!SAFE_SCHEMES.includes(url.protocol)) return null;
        const external = url.protocol === "http:" || url.protocol === "https:";
        return { href: value, external };
    } catch {
        return null;
    }
}

/** Склеивает соседние текстовые узлы — иначе одно слово даёт три элемента React. */
function mergeText(nodes: Inline[]): Inline[] {
    const out: Inline[] = [];
    for (const node of nodes) {
        const prev = out[out.length - 1];
        if (node.kind === "text" && prev && prev.kind === "text") {
            out[out.length - 1] = { kind: "text", text: prev.text + node.text };
            continue;
        }
        out.push(node);
    }
    return out;
}

function trimInline(nodes: Inline[]): Inline[] {
    const merged = mergeText(nodes);
    const first = merged[0];
    if (first && first.kind === "text") merged[0] = { kind: "text", text: first.text.replace(/^\s+/, "") };
    const last = merged[merged.length - 1];
    if (last && last.kind === "text") {
        merged[merged.length - 1] = { kind: "text", text: last.text.replace(/\s+$/, "") };
    }
    return merged.filter((node) => node.kind !== "text" || node.text !== "");
}

function parseInline(nodes: Node[]): Inline[] {
    const out: Inline[] = [];
    for (const node of nodes) {
        if (node.nodeType === NodeType.TEXT_NODE) {
            const value = collapse(node.text);
            if (value) out.push({ kind: "text", text: value });
            continue;
        }
        if (!isElement(node)) continue;

        const tag = tagOf(node);
        if (DROP_TAGS.has(tag)) continue;
        if (tag === "br") {
            out.push({ kind: "br" });
            continue;
        }
        const alias = INLINE_ALIAS[tag];
        if (alias) {
            out.push({ kind: alias, children: parseInline(node.childNodes) } as Inline);
            continue;
        }
        if (tag === "a") {
            const children = parseInline(node.childNodes);
            const link = safeHref(node.getAttribute("href"));
            if (link) out.push({ kind: "link", href: link.href, external: link.external, children });
            else out.push(...children);
            continue;
        }
        out.push(...parseInline(node.childNodes));
    }
    return mergeText(out);
}

/** Вложенные списки сплющиваются в родительский: терять пункты нельзя. */
function collectItems(list: HTMLElement): Inline[][] {
    const items: Inline[][] = [];
    for (const child of list.childNodes) {
        if (!isElement(child)) continue;
        const tag = tagOf(child);
        if (tag === "ul" || tag === "ol") {
            items.push(...collectItems(child));
            continue;
        }
        if (tag !== "li") continue;

        const own: Node[] = [];
        const nested: HTMLElement[] = [];
        for (const node of child.childNodes) {
            if (isElement(node) && (tagOf(node) === "ul" || tagOf(node) === "ol")) nested.push(node);
            else own.push(node);
        }
        const content = trimInline(parseInline(own));
        if (content.length) items.push(content);
        for (const sublist of nested) items.push(...collectItems(sublist));
    }
    return items;
}

function parseBlock(element: HTMLElement, tag: string): Block | null {
    if (tag === "ul" || tag === "ol") {
        const items = collectItems(element);
        return items.length ? { kind: "list", ordered: tag === "ol", items } : null;
    }
    const content = trimInline(parseInline(element.childNodes));
    if (!content.length) return null;
    if (tag === "h3") return { kind: "h3", content };
    if (tag === "blockquote") return { kind: "quote", content };
    return { kind: "p", content };
}

type Token = { kind: "h2"; heading: string } | { kind: "block"; block: Block };

function tokenize(nodes: Node[]): Token[] {
    const out: Token[] = [];
    for (const node of nodes) {
        if (node.nodeType === NodeType.TEXT_NODE) {
            const value = collapse(node.text).trim();
            if (value) out.push({ kind: "block", block: { kind: "p", content: [{ kind: "text", text: value }] } });
            continue;
        }
        if (!isElement(node)) continue;

        const raw = tagOf(node);
        if (DROP_TAGS.has(raw)) continue;

        const tag = TAG_ALIAS[raw] ?? raw;
        if (tag === "h2") {
            const heading = collapse(node.text).trim();
            if (heading) out.push({ kind: "h2", heading });
            continue;
        }
        if (BLOCK_TAGS.has(tag)) {
            const block = parseBlock(node, tag);
            if (block) out.push({ kind: "block", block });
            continue;
        }
        if (UNWRAP_TAGS.has(raw)) {
            out.push(...tokenize(node.childNodes));
            continue;
        }
        // table, pre и прочее вне списка: берём только текст, вёрстку не ломаем
        const value = collapse(node.text).trim();
        if (value) out.push({ kind: "block", block: { kind: "p", content: [{ kind: "text", text: value }] } });
    }
    return out;
}

/** Экспортируется: страница статьи собирает из этого текст ответов для FAQPage. */
export function inlineToText(nodes: Inline[]): string {
    return nodes
        .map((node) => {
            if (node.kind === "text") return node.text;
            if (node.kind === "br") return " ";
            return inlineToText(node.children);
        })
        .join("");
}

function blockText(block: Block): string {
    if (block.kind === "list") return block.items.map(inlineToText).join(" ");
    return inlineToText(block.content);
}

export function parseArticle(bodyHtml: string): Article {
    const tokens = tokenize(parse(bodyHtml ?? "").childNodes);
    const intro = tokens.filter((t): t is Extract<Token, { kind: "block" }> => t.kind === "block")
        .map((t) => t.block);
    const plainText = intro.map(blockText).join(" ").trim();

    return { lead: null, intro, sections: [], faq: [], plainText, readingMinutes: 1 };
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS — 9 тестов Task 3 плюс 5 из Task 1.

- [ ] **Step 6: Проверить типы и закоммитить**

```bash
npx tsc --noEmit
git add package.json package-lock.json lib/blog/article.ts lib/blog/article.test.ts
git commit -m "feat(blog): парсер статейного HTML — инлайн и белый список тегов"
```

---

### Task 4: Парсер, часть 2 — лид, секции, FAQ, время чтения

**Files:**
- Modify: `lib/blog/article.ts`
- Modify: `lib/blog/article.test.ts`

**Interfaces:**
- Consumes: всё из Task 3.
- Produces: `parseArticle` заполняет `lead`, `sections` (с `id` вида `s1…sN`), `faq`, `readingMinutes`.

- [ ] **Step 1: Дописать падающие тесты**

Добавить в конец `lib/blog/article.test.ts`:

```ts
const FULL = `
<p>Прямой ответ на вопрос темы в двух предложениях. Второе предложение.</p>
<p>Второй абзац вступления.</p>
<h2>Как отличить мигрень?</h2>
<p>Первый абзац раздела.</p>
<ul><li>признак раз</li><li>признак два</li></ul>
<h2>Когда идти к врачу?</h2>
<p>Второй раздел.</p>
<h2>Частые вопросы</h2>
<h3>Это опасно?</h3>
<p>Ответ на первый вопрос.</p>
<h3>Нужны ли обследования?</h3>
<p>Ответ на второй вопрос.</p>
<p>Второй абзац второго ответа.</p>
`;

describe("parseArticle: структура документа", () => {
    it("лид — первый абзац до первого h2, остальное уходит в intro", () => {
        const article = parseArticle(FULL);
        expect(text(article.lead ?? [])).toContain("Прямой ответ");
        expect(article.intro).toHaveLength(1);
        expect(text(firstParagraph(article.intro).content)).toBe("Второй абзац вступления.");
    });

    it("каждый h2 открывает секцию и собирает блоки до следующего", () => {
        const article = parseArticle(FULL);
        expect(article.sections.map((s) => s.heading)).toEqual([
            "Как отличить мигрень?",
            "Когда идти к врачу?",
        ]);
        expect(article.sections[0].blocks.map((b) => b.kind)).toEqual(["p", "list"]);
    });

    it("нумерует секции подряд после выемки FAQ", () => {
        const article = parseArticle(FULL);
        expect(article.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
    });

    it("вынимает FAQ из секций и разбирает его в пары вопрос/ответ", () => {
        const article = parseArticle(FULL);
        expect(article.sections.some((s) => s.heading === "Частые вопросы")).toBe(false);
        expect(article.faq).toHaveLength(2);
        expect(article.faq[0].question).toBe("Это опасно?");
        expect(article.faq[1].answer).toHaveLength(2);
    });

    it("без раздела FAQ оставляет faq пустым, а секции целыми", () => {
        const article = parseArticle("<h2>Раздел</h2><p>текст</p>");
        expect(article.faq).toEqual([]);
        expect(article.sections).toHaveLength(1);
    });

    it("понижает h1 до h2 и поднимает h4 до h3", () => {
        const article = parseArticle("<h1>Заголовок</h1><p>текст</p><h4>Подзаголовок</h4>");
        expect(article.sections[0].heading).toBe("Заголовок");
        expect(article.sections[0].blocks.map((b) => b.kind)).toEqual(["p", "h3"]);
    });

    it("текст без блочных тегов кладёт одним абзацем в intro, ничего не теряя", () => {
        const article = parseArticle("просто текст без разметки");
        expect(article.lead).toBeNull();
        expect(text(firstParagraph(article.intro).content)).toBe("просто текст без разметки");
    });

    it("время чтения — минимум одна минута", () => {
        expect(parseArticle("<p>Три слова тут</p>").readingMinutes).toBe(1);
        const long = `<p>${"слово ".repeat(900)}</p>`;
        expect(parseArticle(long).readingMinutes).toBe(5);
    });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL — `lead` всегда `null`, `sections` и `faq` пусты, `readingMinutes` всегда 1.

- [ ] **Step 3: Заменить сборку статьи**

В `lib/blog/article.ts` добавить константу рядом с остальными:

```ts
/** Заголовок блока вопросов — по промпту бекенда это всегда «Частые вопросы». */
const FAQ_HEADING = /частые\s+вопросы|вопросы\s+и\s+ответы|^faq$/i;

const WORDS_PER_MINUTE = 180;
```

И целиком заменить `parseArticle` на:

```ts
/** Пары «h3 + блоки до следующего h3» из раздела вопросов. */
function toFaq(blocks: Block[]): FaqItem[] {
    const items: FaqItem[] = [];
    for (const block of blocks) {
        if (block.kind === "h3") {
            items.push({ question: inlineToText(block.content), answer: [] });
            continue;
        }
        const current = items[items.length - 1];
        if (current) current.answer.push(block);
    }
    return items.filter((item) => item.question);
}

export function parseArticle(bodyHtml: string): Article {
    const tokens = tokenize(parse(bodyHtml ?? "").childNodes);

    const before: Block[] = [];
    const raw: { heading: string; blocks: Block[] }[] = [];
    for (const token of tokens) {
        if (token.kind === "h2") {
            raw.push({ heading: token.heading, blocks: [] });
            continue;
        }
        if (raw.length) raw[raw.length - 1].blocks.push(token.block);
        else before.push(token.block);
    }

    // Лид — первый абзац вступления: по промпту бекенда это прямой ответ на
    // вопрос темы, и на странице он идёт крупным кеглем.
    //
    // Исключение — вырожденный body без единого h2 и с единственным блоком:
    // это не лид, а весь текст статьи, и набирать его лидовым кеглем нельзя.
    const degenerate = before.length === 1 && raw.length === 0;
    const leadIndex = degenerate ? -1 : before.findIndex((block) => block.kind === "p");
    const leadBlock = leadIndex >= 0 ? before[leadIndex] : null;
    const lead = leadBlock && leadBlock.kind === "p" ? leadBlock.content : null;
    const intro = leadIndex >= 0 ? before.filter((_, i) => i !== leadIndex) : before;

    const faqIndex = raw.findIndex((section) => FAQ_HEADING.test(section.heading));
    const faq = faqIndex >= 0 ? toFaq(raw[faqIndex].blocks) : [];
    // Нумерация после выемки FAQ, иначе id в оглавлении разъедутся с якорями.
    const sections: Section[] = raw
        .filter((_, index) => index !== faqIndex)
        .map((section, index) => ({ id: `s${index + 1}`, heading: section.heading, blocks: section.blocks }));

    const parts: string[] = [];
    if (lead) parts.push(inlineToText(lead));
    intro.forEach((block) => parts.push(blockText(block)));
    sections.forEach((section) => {
        parts.push(section.heading);
        section.blocks.forEach((block) => parts.push(blockText(block)));
    });
    faq.forEach((item) => {
        parts.push(item.question);
        item.answer.forEach((block) => parts.push(blockText(block)));
    });

    const plainText = collapse(parts.join(" ")).trim();
    const words = plainText ? plainText.split(" ").length : 0;
    const readingMinutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

    return { lead, intro, sections, faq, plainText, readingMinutes };
}
```

- [ ] **Step 4: Убедиться, что все тесты проходят**

Run: `npm test`
Expected: PASS — 22 теста.

Тест «выбрасывает script» из Task 3 проверяет `plainText`: `script` отсекается в `tokenize`, поэтому в `parts` не попадает. Если он вдруг падает — искать причину в `DROP_TAGS`, а не ослаблять тест.

- [ ] **Step 5: Проверить типы и закоммитить**

```bash
npx tsc --noEmit
git add lib/blog/article.ts lib/blog/article.test.ts
git commit -m "feat(blog): разбор статьи на лид, секции, FAQ и время чтения"
```

---

### Task 5: Детерминированный подбор картинок

**Files:**
- Create: `lib/blog/images.ts`
- Test: `lib/blog/images.test.ts`

**Interfaces:**
- Consumes: `BlogPost` из `lib/types.ts`.
- Produces: `pickArt(post: BlogPost, sectionCount: number): { cover: string; coverAlt: string; inline: string[] }`.

- [ ] **Step 1: Проверить, что ассеты на месте**

```bash
ls public/services/eeg.png public/services/blocade.png public/services/elektro.png \
   public/services/capelnic.png public/services/uzi2.png public/services/massage.png \
   public/services/anal.png
ls public/clinic
```

Ожидание: все семь файлов услуг есть; в `clinic/` — `clinic4.jpg` (портрет 853×1280, в пул не идёт) и девять остальных.

- [ ] **Step 2: Написать падающие тесты**

Создать `lib/blog/images.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickArt } from "./images";
import type { BlogPost } from "@/lib/types";

function post(fields: Partial<BlogPost>): BlogPost {
    return {
        id: 1,
        slug: "test-post",
        title: "Заголовок",
        body: "",
        metaDescription: null,
        keywords: null,
        status: "PUBLISHED",
        aiGenerated: true,
        createdAt: "2026-08-25T12:00:00",
        updatedAt: "2026-08-25T12:00:00",
        ...fields,
    };
}

describe("pickArt", () => {
    it("подбирает ассет по теме из заголовка", () => {
        expect(pickArt(post({ title: "Бессонница: причины" }), 3).cover).toBe("/services/eeg.png");
        expect(pickArt(post({ title: "Грыжа межпозвонкового диска" }), 3).cover)
            .toBe("/services/blocade.png");
        expect(pickArt(post({ title: "Тремор рук" }), 3).cover).toBe("/services/elektro.png");
        expect(pickArt(post({ title: "Восстановление после инсульта" }), 3).cover)
            .toBe("/services/capelnic.png");
        expect(pickArt(post({ title: "Головокружение" }), 3).cover).toBe("/services/uzi2.png");
        expect(pickArt(post({ title: "Мигрень и головная боль" }), 3).cover)
            .toBe("/services/massage.png");
    });

    it("ищет тему и в keywords, и в slug, не только в заголовке", () => {
        expect(pickArt(post({ title: "Что важно знать", keywords: "инсульт, реабилитация" }), 3).cover)
            .toBe("/services/capelnic.png");
        expect(pickArt(post({ title: "Что важно знать", slug: "golovokruzhenie-prichiny" }), 3).cover)
            .not.toBe("/services/uzi2.png"); // латинский slug под правило не попадает
    });

    it("без совпадений отдаёт фото клиники", () => {
        const art = pickArt(post({ title: "Что-то совсем другое" }), 3);
        expect(art.cover.startsWith("/clinic/")).toBe(true);
        expect(art.coverAlt).not.toBe("");
    });

    it("никогда не берёт портретное clinic4 — оно рвёт обложку 21:9", () => {
        const covers = Array.from({ length: 40 }, (_, i) =>
            pickArt(post({ title: "нейтральная тема", slug: `post-${i}` }), 6),
        );
        const used = covers.flatMap((art) => [art.cover, ...art.inline]);
        expect(used).not.toContain("/clinic/clinic4.jpg");
    });

    it("детерминирован: один slug — один и тот же результат", () => {
        const a = pickArt(post({ title: "нейтрально", slug: "same-slug" }), 6);
        const b = pickArt(post({ title: "нейтрально", slug: "same-slug" }), 6);
        expect(a).toEqual(b);
    });

    it("разводит фолбэки по пулу, а не сажает все посты на одно фото", () => {
        // Не «два slug дают разное»: два произвольных slug законно могут попасть
        // в один бакет хеша, и такой тест падал бы без причины.
        const covers = new Set(
            Array.from({ length: 30 }, (_, i) =>
                pickArt(post({ title: "нейтрально", slug: `post-${i}` }), 3).cover,
            ),
        );
        expect(covers.size).toBeGreaterThan(3);
    });

    it("число врезок зависит от количества секций", () => {
        expect(pickArt(post({}), 2).inline).toHaveLength(0);
        expect(pickArt(post({}), 3).inline).toHaveLength(1);
        expect(pickArt(post({}), 6).inline).toHaveLength(2);
    });

    it("врезка не повторяет обложку и не повторяет саму себя", () => {
        const art = pickArt(post({ title: "нейтрально", slug: "unique" }), 6);
        expect(art.inline).not.toContain(art.cover);
        expect(new Set(art.inline).size).toBe(art.inline.length);
    });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL — модуль `./images` не существует.

- [ ] **Step 4: Реализовать подбор**

Создать `lib/blog/images.ts`:

```ts
import type { BlogPost } from "@/lib/types";

/**
 * Картинок в данных нет: на бекенде img намеренно вырезан из Safelist, а поля
 * обложки у поста не существует. Поэтому иллюстрацию подбирает витрина — из
 * уже снятых фото клиники и услуг, по теме статьи.
 *
 * Альт описывает то, что НА ФОТО, а не заголовок статьи: снимок процедурного
 * кабинета не является изображением мигрени, и подпись заголовком была бы
 * ложью для скринридера.
 */
interface Rule {
    test: RegExp;
    asset: string;
    alt: string;
}

const RULES: Rule[] = [
    {
        test: /эпилепс|приступ|ээг|память|концентрац|сон|бессонниц/,
        asset: "/services/eeg.png",
        alt: "Кабинет электроэнцефалографии клиники «Премиум»",
    },
    {
        test: /поясниц|спин|грыж|диск|седалищн|защемлен/,
        asset: "/services/blocade.png",
        alt: "Процедурный кабинет клиники «Премиум»",
    },
    {
        test: /онемен|покалыван|невропат|тремор|лицев/,
        asset: "/services/elektro.png",
        alt: "Аппарат физиотерапии в клинике «Премиум»",
    },
    {
        test: /инсульт|восстановлен|реабилитац/,
        asset: "/services/capelnic.png",
        alt: "Внутривенная инфузия в клинике «Премиум»",
    },
    {
        test: /головокружен/,
        asset: "/services/uzi2.png",
        alt: "Ультразвуковое исследование в клинике «Премиум»",
    },
    {
        test: /мигрен|головн|напряжен/,
        asset: "/services/massage.png",
        alt: "Лечебный массаж в клинике «Премиум»",
    },
    {
        test: /приём|прием|обследован|анализ/,
        asset: "/services/anal.png",
        alt: "Лабораторные анализы в клинике «Премиум»",
    },
];

/** Портретный clinic4.jpg (853×1280) исключён: он рвёт обложку 21:9. */
const CLINIC_POOL = [
    "/clinic/clinic5.jpg",
    "/clinic/clinic6.jpg",
    "/clinic/clinic7.jpg",
    "/clinic/clinic9.jpg",
    "/clinic/clinic10.jpg",
    "/clinic/clinic11.jpg",
    "/clinic/clinic12.jpg",
    "/clinic/clinic13.png",
    "/clinic/clinic14.jpg",
];

const CLINIC_ALT = "Интерьер клиники неврологии «Премиум» в Уфе";

/**
 * FNV-1a. Именно хеш, а не Math.random: при ISR страница рендерится
 * многократно, и случайный выбор давал бы разную картинку в разных копиях кеша.
 */
function hash(value: string): number {
    let result = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        result ^= value.charCodeAt(i);
        result = Math.imul(result, 0x01000193) >>> 0;
    }
    return result >>> 0;
}

export interface ArticleArt {
    cover: string;
    coverAlt: string;
    /** Врезки по ходу текста: первая после 2-й секции, вторая после 5-й. */
    inline: string[];
}

export function pickArt(post: BlogPost, sectionCount: number): ArticleArt {
    const haystack = `${post.title} ${post.keywords ?? ""} ${post.slug}`.toLowerCase();
    const rule = RULES.find((item) => item.test.test(haystack));
    const seed = hash(post.slug);

    const cover = rule ? rule.asset : CLINIC_POOL[seed % CLINIC_POOL.length];
    const coverAlt = rule ? rule.alt : CLINIC_ALT;

    const pool = CLINIC_POOL.filter((asset) => asset !== cover);
    const count = sectionCount >= 6 ? 2 : sectionCount >= 3 ? 1 : 0;
    const inline: string[] = [];
    for (let i = 0; i < count; i++) {
        inline.push(pool[(seed + i * 7) % pool.length]);
    }

    return { cover, coverAlt, inline };
}

export const INLINE_ALT = CLINIC_ALT;
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS — 30 тестов.

- [ ] **Step 6: Проверить типы и закоммитить**

```bash
npx tsc --noEmit
git add lib/blog/images.ts lib/blog/images.test.ts
git commit -m "feat(blog): детерминированный подбор картинок по теме статьи"
```

---

### Task 6: Индекс `/blog` и вход в навигацию

**Files:**
- Create: `app/(site)/components/blog/BlogCard.tsx`
- Create: `app/(site)/components/blog/BlogCard.module.css`
- Create: `app/(site)/blog/page.tsx`
- Create: `app/(site)/blog/page.module.css`
- Modify: `lib/constants.ts:18-24`
- Modify: `app/sitemap.ts:7-15`

**Interfaces:**
- Consumes: `listBlogPosts()`, `BlogPost`, `pickArt`, `formatArticleDate`, `articleDateIso`.
- Produces: маршрут `/blog`; компонент `BlogCard({ post, featured }: { post: BlogPost; featured?: boolean })`.

- [ ] **Step 1: Создать карточку**

`app/(site)/components/blog/BlogCard.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { pickArt } from "@/lib/blog/images";
import { articleDateIso, formatArticleDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";
import styles from "./BlogCard.module.css";

/**
 * Ведущая карточка (featured) кладёт фото и текст в две колонки — на индексе
 * она первая и на всю ширину, иначе сетка из одинаковых плиток читается
 * как каталог, а не как блог.
 */
export default function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
    const art = pickArt(post, 0);
    const date = formatArticleDate(post.createdAt);

    return (
        <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
            <div className={styles.imageContainer}>
                <Image
                    src={art.cover}
                    alt={art.coverAlt}
                    fill
                    sizes={featured ? "(max-width: 860px) 92vw, 620px" : "(max-width: 860px) 92vw, 380px"}
                    className={styles.image}
                />
            </div>

            <div className={styles.text}>
                {date ? (
                    <time className={styles.date} dateTime={articleDateIso(post.createdAt)}>
                        {date}
                    </time>
                ) : null}
                <h2 className={styles.title}>
                    <Link href={`/blog/${post.slug}`} className={styles.titleLink}>
                        {post.title}
                    </Link>
                </h2>
                {post.metaDescription ? <p className={styles.excerpt}>{post.metaDescription}</p> : null}
                <span className={styles.more} aria-hidden="true">Читать →</span>
            </div>
        </article>
    );
}
```

- [ ] **Step 2: Стили карточки**

`app/(site)/components/blog/BlogCard.module.css`:

```css
/* Стеклянный островок с полем по краю — тот же материал, что у ServiceCard:
   если фото упереть в кромку, от стекла остаётся полоска снизу. */
.card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-sheen), var(--glass-shadow);
  transition: background 0.3s ease, box-shadow 0.35s ease, transform 0.5s var(--spring);
}

.card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  background: var(--glass-gloss);
  pointer-events: none;
}

.card:hover {
  background: var(--glass-bg-strong);
  transform: translateY(-6px) scale(1.012);
}

.imageContainer {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: calc(var(--radius-lg) - 11px);
  background: var(--brand-tint);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5), 0 8px 20px -12px rgba(18, 42, 77, 0.5);
}

.image {
  object-fit: cover;
  transition: transform 0.6s var(--spring);
}

.card:hover .image { transform: scale(1.05); }

.text {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 12px 12px;
}

.date {
  font-family: var(--font-body);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  line-height: 1.22;
  color: var(--ink);
}

/* Ссылка растянута на всю карточку: цель нажатия — плитка, а не строка текста. */
.titleLink {
  color: inherit;
  text-decoration: none;
}

.titleLink::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 4;
}

.excerpt {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.more {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--brand);
}

@media (min-width: 861px) {
  .featured {
    flex-direction: row;
    align-items: stretch;
    grid-column: 1 / -1;
  }
  .featured .imageContainer { flex: 1 1 56%; aspect-ratio: 16 / 10; }
  .featured .text { flex: 1 1 44%; justify-content: center; padding: 24px 28px; }
  .featured .title { font-size: clamp(1.6rem, 2.6vw, 2.1rem); }
  .featured .excerpt { -webkit-line-clamp: 4; }
}
```

- [ ] **Step 3: Создать страницу индекса**

`app/(site)/blog/page.tsx`. Своего `<main>` не рендерит — layout уже дал `<main className="site-main">`.

```tsx
import type { Metadata } from "next";
import { listBlogPosts } from "@/lib/cms";
import { CLINIC } from "@/lib/constants";
import BlogCard from "@/app/(site)/components/blog/BlogCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Блог",
    description: `Статьи о неврологии от врачей ${CLINIC.name}: симптомы, обследования и лечение.`,
};

export default async function BlogIndexPage() {
    const posts = await listBlogPosts();

    return (
        <div className={styles.container}>
            <header className={styles.head}>
                <h1 className={styles.title}>Блог</h1>
                <p className={styles.subtitle}>
                    Разбираем симптомы и обследования простым языком. Статьи не заменяют приём врача.
                </p>
            </header>

            {posts.length === 0 ? (
                <p className={styles.empty}>Статей пока нет. Заглядывайте позже.</p>
            ) : (
                <div className={styles.grid}>
                    {posts.map((post, index) => (
                        <BlogCard key={post.slug} post={post} featured={index === 0} />
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Стили индекса**

`app/(site)/blog/page.module.css`:

```css
.container {
  max-width: var(--container);
  margin: 0 auto;
  padding: clamp(28px, 5vw, 56px) var(--gutter) var(--section-y);
  color: var(--ink);
}

.head {
  max-width: 62ch;
  margin-bottom: clamp(28px, 5vw, 48px);
}

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: clamp(2rem, 4.4vw, 3rem);
  line-height: 1.1;
}

.subtitle {
  margin: 0.75rem 0 0;
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--ink-soft);
}

.grid {
  display: grid;
  gap: clamp(16px, 2.4vw, 26px);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.empty {
  padding: clamp(28px, 6vw, 56px) 0;
  font-size: 1.15rem;
  color: var(--ink-soft);
}
```

- [ ] **Step 5: Добавить пункт в навигацию**

В `lib/constants.ts`, в `NAV_LINKS`, между «Врачи» и «ЭЭГ»:

```ts
    { href: "/blog", label: "Блог" },
```

`Header` и мобильное меню мапят этот массив, поэтому больше нигде править не нужно.

- [ ] **Step 6: Добавить `/blog` в sitemap**

В `app/sitemap.ts`, в массив путей `staticPages`, после `"/doctors"`:

```ts
        "/blog",
```

- [ ] **Step 7: Проверить сборку и страницу**

```bash
npx tsc --noEmit
npm run build
```

Ожидание: сборка проходит, в выводе есть маршрут `/blog`.

```bash
npm start &
sleep 4
curl -s localhost:3000/blog | grep -c "<h1"
curl -s localhost:3000/blog | grep -o "Блог" | head -2
kill %1
```

Ожидание: `<h1` найден; если бекенд недоступен — на странице пустое состояние «Статей пока нет», а не ошибка.

- [ ] **Step 8: Закоммитить**

```bash
git add "app/(site)/blog/page.tsx" "app/(site)/blog/page.module.css" \
  "app/(site)/components/blog/BlogCard.tsx" "app/(site)/components/blog/BlogCard.module.css" \
  lib/constants.ts app/sitemap.ts
git commit -m "feat(blog): страница списка статей и пункт «Блог» в навигации"
```

---

### Task 7: Рендер тела статьи и FAQ

**Files:**
- Create: `app/(site)/components/blog/ArticleBody.tsx`
- Create: `app/(site)/components/blog/ArticleBody.module.css`
- Create: `app/(site)/components/blog/ArticleFaq.tsx`
- Create: `app/(site)/components/blog/ArticleFaq.module.css`

**Interfaces:**
- Consumes: `Article`, `Block`, `Inline`, `FaqItem` из `lib/blog/article.ts`; `INLINE_ALT` из `lib/blog/images.ts`; компонент `EegLine` из `app/(site)/components/EegLine` (принимает `className`).
- Produces: `ArticleBody({ article, inlineImages }: { article: Article; inlineImages: string[] })`; `ArticleFaq({ items }: { items: FaqItem[] })`.

- [ ] **Step 1: Создать рендер блоков**

`app/(site)/components/blog/ArticleBody.tsx`:

```tsx
import Image from "next/image";
import EegLine from "@/app/(site)/components/EegLine";
import { INLINE_ALT } from "@/lib/blog/images";
import type { Article, Block, Inline } from "@/lib/blog/article";
import ArticleFaq from "./ArticleFaq";
import styles from "./ArticleBody.module.css";

/**
 * Модельный HTML уже разобран парсером в структуру, поэтому здесь нет
 * dangerouslySetInnerHTML: в браузер уходит только то, чьи теги перечислены
 * в типе Inline. Это второй слой защиты, независимый от Jsoup на бекенде.
 */
function InlineNodes({ nodes }: { nodes: Inline[] }) {
    return (
        <>
            {nodes.map((node, index) => (
                <InlineNode key={index} node={node} />
            ))}
        </>
    );
}

function InlineNode({ node }: { node: Inline }) {
    switch (node.kind) {
        case "text":
            return <>{node.text}</>;
        case "br":
            return <br />;
        case "strong":
            return <strong><InlineNodes nodes={node.children} /></strong>;
        case "em":
            return <em><InlineNodes nodes={node.children} /></em>;
        case "code":
            return <code className={styles.code}><InlineNodes nodes={node.children} /></code>;
        case "link":
            return node.external ? (
                <a className={styles.link} href={node.href} target="_blank" rel="nofollow noopener">
                    <InlineNodes nodes={node.children} />
                </a>
            ) : (
                <a className={styles.link} href={node.href}>
                    <InlineNodes nodes={node.children} />
                </a>
            );
    }
}

function Blocks({ blocks }: { blocks: Block[] }) {
    return (
        <>
            {blocks.map((block, index) => {
                if (block.kind === "p") {
                    return <p key={index} className={styles.paragraph}><InlineNodes nodes={block.content} /></p>;
                }
                if (block.kind === "h3") {
                    return <h3 key={index} className={styles.subheading}><InlineNodes nodes={block.content} /></h3>;
                }
                if (block.kind === "quote") {
                    return (
                        <blockquote key={index} className={styles.quote}>
                            <InlineNodes nodes={block.content} />
                        </blockquote>
                    );
                }
                const List = block.ordered ? "ol" : "ul";
                return (
                    <List key={index} className={block.ordered ? styles.orderedList : styles.list}>
                        {block.items.map((item, itemIndex) => (
                            <li key={itemIndex} className={styles.listItem}>
                                <InlineNodes nodes={item} />
                            </li>
                        ))}
                    </List>
                );
            })}
        </>
    );
}

/** Врезка после 2-й секции, вторая — после 5-й: индексы 1 и 4 при счёте с нуля. */
const INLINE_AFTER = [1, 4];

export default function ArticleBody({
    article,
    inlineImages,
}: {
    article: Article;
    inlineImages: string[];
}) {
    return (
        <div className={styles.prose}>
            {article.lead ? (
                <p className={styles.lead}><InlineNodes nodes={article.lead} /></p>
            ) : null}

            <Blocks blocks={article.intro} />

            {article.sections.map((section, index) => {
                const imageIndex = INLINE_AFTER.indexOf(index);
                const image = imageIndex >= 0 ? inlineImages[imageIndex] : undefined;
                return (
                    <section key={section.id} className={styles.section}>
                        <EegLine className={styles.divider} />
                        <h2 id={section.id} className={styles.heading}>{section.heading}</h2>
                        <Blocks blocks={section.blocks} />
                        {image ? (
                            <figure className={styles.figure}>
                                <Image
                                    src={image}
                                    alt={INLINE_ALT}
                                    width={1280}
                                    height={853}
                                    sizes="(max-width: 900px) 92vw, 720px"
                                    className={styles.figureImage}
                                />
                            </figure>
                        ) : null}
                    </section>
                );
            })}

            <ArticleFaq items={article.faq} />
        </div>
    );
}
```

- [ ] **Step 2: Типографика тела статьи**

`app/(site)/components/blog/ArticleBody.module.css`:

```css
/* Мера 68ch — не украшение: на строке длиннее глаз теряет начало следующей. */
.prose {
  max-width: 68ch;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: clamp(1.0625rem, 1.3vw, 1.125rem);
  line-height: 1.75;
}

/* Лид набран основным цветом, а не --ink-soft: по промпту бекенда это прямой
   ответ на вопрос темы, то есть главное предложение статьи. Гасить нельзя. */
.lead {
  margin: 0 0 1.6em;
  font-size: clamp(1.15rem, 1.9vw, 1.35rem);
  line-height: 1.6;
  color: var(--ink);
}

.paragraph { margin: 0 0 1.15em; }

.section { margin-top: clamp(36px, 5vw, 60px); }

.divider {
  display: block;
  width: 140px;
  height: 22px;
  margin-bottom: 14px;
  color: var(--brand);
  opacity: 0.55;
}

.heading {
  margin: 0 0 0.6em;
  font-family: var(--font-head);
  font-size: clamp(1.6rem, 3vw, 2.15rem);
  line-height: 1.2;
  /* Якорь оглавления не должен уезжать под липкую шапку. */
  scroll-margin-top: 96px;
}

.subheading {
  margin: 1.6em 0 0.5em;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1.15rem;
  line-height: 1.4;
}

.list,
.orderedList {
  margin: 0 0 1.15em;
  padding: 0;
  list-style: none;
  counter-reset: item;
}

.listItem {
  position: relative;
  padding-left: 1.6em;
  margin-bottom: 0.5em;
}

.list .listItem::before {
  content: "";
  position: absolute;
  left: 0.45em;
  top: 0.72em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
}

.orderedList .listItem {
  counter-increment: item;
}

.orderedList .listItem::before {
  content: counter(item);
  position: absolute;
  left: 0;
  top: 0;
  font-family: var(--font-head);
  color: var(--brand);
}

.quote {
  margin: 1.5em 0;
  padding-left: 1.2em;
  border-left: 2px solid var(--brand);
  font-size: 1.1rem;
  color: var(--ink-soft);
}

.link {
  color: var(--brand);
  text-underline-offset: 3px;
}

.code {
  padding: 0.1em 0.35em;
  border-radius: var(--radius-xs);
  background: var(--brand-tint);
  font-size: 0.95em;
}

/* Врезка выходит за меру текста: иначе фото на 68ch читается как марка. */
.figure {
  margin: clamp(24px, 4vw, 40px) 0;
  width: 100%;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.figureImage {
  display: block;
  width: 100%;
  height: auto;
}

@media (min-width: 1000px) {
  .figure {
    width: calc(100% + 8vw);
    margin-left: -4vw;
  }
}
```

- [ ] **Step 3: Создать FAQ**

`app/(site)/components/blog/ArticleFaq.tsx`:

```tsx
import type { Block, FaqItem, Inline } from "@/lib/blog/article";
import styles from "./ArticleFaq.module.css";

/**
 * Нативные details/summary: аккордеон работает с клавиатуры, попадает в поиск
 * по странице и не тянет ни строчки клиентского JS.
 */
function Text({ nodes }: { nodes: Inline[] }) {
    return (
        <>
            {nodes.map((node, index) => {
                if (node.kind === "text") return <span key={index}>{node.text}</span>;
                if (node.kind === "br") return <br key={index} />;
                if (node.kind === "link") {
                    return node.external ? (
                        <a key={index} href={node.href} target="_blank" rel="nofollow noopener">
                            <Text nodes={node.children} />
                        </a>
                    ) : (
                        <a key={index} href={node.href}><Text nodes={node.children} /></a>
                    );
                }
                const Tag = node.kind === "strong" ? "strong" : node.kind === "em" ? "em" : "code";
                return <Tag key={index}><Text nodes={node.children} /></Tag>;
            })}
        </>
    );
}

function Answer({ blocks }: { blocks: Block[] }) {
    return (
        <>
            {blocks.map((block, index) => {
                if (block.kind === "list") {
                    const List = block.ordered ? "ol" : "ul";
                    return (
                        <List key={index} className={styles.list}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}><Text nodes={item} /></li>
                            ))}
                        </List>
                    );
                }
                return <p key={index} className={styles.answer}><Text nodes={block.content} /></p>;
            })}
        </>
    );
}

export default function ArticleFaq({ items }: { items: FaqItem[] }) {
    if (items.length === 0) return null;

    return (
        <section className={styles.faq}>
            <h2 id="faq" className={styles.heading}>Частые вопросы</h2>
            {items.map((item, index) => (
                <details key={index} className={styles.item}>
                    <summary className={styles.question}>{item.question}</summary>
                    <div className={styles.body}>
                        <Answer blocks={item.answer} />
                    </div>
                </details>
            ))}
        </section>
    );
}
```

- [ ] **Step 4: Стили FAQ**

`app/(site)/components/blog/ArticleFaq.module.css`:

```css
.faq { margin-top: clamp(40px, 6vw, 72px); }

.heading {
  margin: 0 0 0.8em;
  font-family: var(--font-head);
  font-size: clamp(1.6rem, 3vw, 2.15rem);
  line-height: 1.2;
  scroll-margin-top: 96px;
}

.item {
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-sheen);
}

.question {
  padding: 16px 18px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1.45;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
}

/* Своя стрелка вместо системного треугольника — он ломает выравнивание. */
.question::-webkit-details-marker { display: none; }

.question::after {
  content: "＋";
  float: right;
  margin-left: 12px;
  color: var(--brand);
  transition: transform 0.25s var(--spring);
}

.item[open] .question::after { content: "－"; }

.body {
  padding: 0 18px 16px;
  color: var(--ink-soft);
}

.answer {
  margin: 0 0 0.8em;
  font-size: 1rem;
  line-height: 1.7;
}

.list {
  margin: 0 0 0.8em;
  padding-left: 1.2em;
  font-size: 1rem;
  line-height: 1.7;
}
```

- [ ] **Step 5: Проверить типы**

Run: `npx tsc --noEmit`
Expected: чисто. Компоненты пока никем не импортируются — это нормально, страница появится в Task 8.

- [ ] **Step 6: Закоммитить**

```bash
git add "app/(site)/components/blog/ArticleBody.tsx" "app/(site)/components/blog/ArticleBody.module.css" \
  "app/(site)/components/blog/ArticleFaq.tsx" "app/(site)/components/blog/ArticleFaq.module.css"
git commit -m "feat(blog): типографика тела статьи и FAQ на нативных details"
```

---

### Task 8: Оглавление

**Files:**
- Create: `app/(site)/components/blog/ArticleToc.tsx`
- Create: `app/(site)/components/blog/ArticleToc.module.css`

**Interfaces:**
- Consumes: `Section` из `lib/blog/article.ts`.
- Produces: `ArticleToc({ sections, hasFaq }: { sections: Section[]; hasFaq: boolean })`.

- [ ] **Step 1: Создать компонент**

`app/(site)/components/blog/ArticleToc.tsx`:

```tsx
import type { Section } from "@/lib/blog/article";
import styles from "./ArticleToc.module.css";

/**
 * Обычные якорные ссылки, ноль клиентского JS. Подсветка активного пункта при
 * скролле потребовала бы клиентского компонента и осталась вне охвата.
 * На коротких статьях оглавление скрыто: три пункта только шумят.
 */
export default function ArticleToc({ sections, hasFaq }: { sections: Section[]; hasFaq: boolean }) {
    if (sections.length < 3) return null;

    return (
        <nav className={styles.toc} aria-label="Содержание статьи">
            <p className={styles.label}>На странице</p>
            <ol className={styles.list}>
                {sections.map((section) => (
                    <li key={section.id} className={styles.item}>
                        <a href={`#${section.id}`} className={styles.link}>{section.heading}</a>
                    </li>
                ))}
                {hasFaq ? (
                    <li className={styles.item}>
                        <a href="#faq" className={styles.link}>Частые вопросы</a>
                    </li>
                ) : null}
            </ol>
        </nav>
    );
}
```

- [ ] **Step 2: Стили оглавления**

`app/(site)/components/blog/ArticleToc.module.css`:

```css
/* До 1100px колонки для оглавления просто нет — страница остаётся одноколонкой. */
.toc { display: none; }

@media (min-width: 1100px) {
  .toc {
    display: block;
    position: sticky;
    top: 108px;
    align-self: start;
    padding-left: 20px;
    border-left: 1px solid var(--border);
  }
}

.label {
  margin: 0 0 12px;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: toc;
}

.item {
  counter-increment: toc;
  margin-bottom: 10px;
}

.link {
  display: block;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.2s ease;
}

.link:hover,
.link:focus-visible { color: var(--brand); }
```

- [ ] **Step 3: Проверить типы и закоммитить**

```bash
npx tsc --noEmit
git add "app/(site)/components/blog/ArticleToc.tsx" "app/(site)/components/blog/ArticleToc.module.css"
git commit -m "feat(blog): sticky-оглавление статьи на якорях без JS"
```

---

### Task 9: Страница статьи, метаданные и JSON-LD

**Files:**
- Create: `app/(site)/blog/[slug]/page.tsx`
- Create: `app/(site)/blog/[slug]/page.module.css`
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: `getBlogPostBySlug`, `listBlogPosts`, `parseArticle`, `pickArt`, `formatArticleDate`, `articleDateIso`, `ArticleBody`, `ArticleToc`, `SITE_URL`, `CLINIC`.
- Produces: маршрут `/blog/[slug]`.

- [ ] **Step 1: Создать страницу**

`app/(site)/blog/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inlineToText, parseArticle } from "@/lib/blog/article";
import { pickArt } from "@/lib/blog/images";
import { getBlogPostBySlug, listBlogPosts } from "@/lib/cms";
import { CLINIC, SITE_URL } from "@/lib/constants";
import { articleDateIso, formatArticleDate } from "@/lib/format";
import ArticleBody from "@/app/(site)/components/blog/ArticleBody";
import ArticleToc from "@/app/(site)/components/blog/ArticleToc";
import styles from "./page.module.css";

type Params = { params: Promise<{ slug: string }> };

const DESCRIPTION_LIMIT = 160;

/**
 * Черновик отсекаем и на своей стороне: бекенд анонимам его не отдаёт, но
 * страховка стоит одну строку, а цена ошибки — неотрецензированный
 * медицинский текст в открытом доступе.
 */
async function loadPublished(slug: string) {
    const post = await getBlogPostBySlug(slug);
    if (!post || post.status !== "PUBLISHED") return null;
    return post;
}

export async function generateStaticParams() {
    const posts = await listBlogPosts();
    return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    const post = await loadPublished(slug);
    if (!post) return { title: "Статья не найдена" };

    const article = parseArticle(post.body);
    const description =
        post.metaDescription?.trim() || article.plainText.slice(0, DESCRIPTION_LIMIT);
    const art = pickArt(post, article.sections.length);

    return {
        title: post.title,
        description,
        alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
        openGraph: {
            type: "article",
            title: post.title,
            description,
            url: `${SITE_URL}/blog/${post.slug}`,
            images: [{ url: `${SITE_URL}${art.cover}` }],
            publishedTime: articleDateIso(post.createdAt) || undefined,
            modifiedTime: articleDateIso(post.updatedAt) || undefined,
        },
    };
}

export default async function BlogPostPage({ params }: Params) {
    const { slug } = await params;
    const post = await loadPublished(slug);
    if (!post) notFound();

    const article = parseArticle(post.body);
    const art = pickArt(post, article.sections.length);
    const date = formatArticleDate(post.createdAt);
    const url = `${SITE_URL}/blog/${post.slug}`;

    const schema: unknown[] = [
        {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.metaDescription ?? article.plainText.slice(0, DESCRIPTION_LIMIT),
            image: `${SITE_URL}${art.cover}`,
            datePublished: articleDateIso(post.createdAt) || undefined,
            dateModified: articleDateIso(post.updatedAt) || undefined,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            author: { "@type": "Organization", name: CLINIC.fullName },
            publisher: { "@type": "Organization", name: CLINIC.fullName },
        },
    ];

    if (article.faq.length > 0) {
        schema.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer
                        .map((block) => (block.kind === "list"
                            ? block.items.map(inlineToText).join(" ")
                            : inlineToText(block.content)))
                        .join(" "),
                },
            })),
        });
    }

    return (
        <article className={styles.container}>
            <header className={styles.hero}>
                <div className={styles.cover}>
                    <Image
                        src={art.cover}
                        alt={art.coverAlt}
                        fill
                        priority
                        sizes="100vw"
                        className={styles.coverImage}
                    />
                </div>
                {/* На узком экране заголовок уходит под фото: текст поверх
                    снимка при 360px нечитаем, сколько бы затемнения ни лить. */}
                <div className={styles.heroText}>
                    <h1 className={styles.title}>{post.title}</h1>
                    <p className={styles.meta}>
                        {date ? <time dateTime={articleDateIso(post.createdAt)}>{date}</time> : null}
                        {date ? <span aria-hidden="true"> · </span> : null}
                        <span>{article.readingMinutes} мин чтения</span>
                    </p>
                </div>
            </header>

            <div className={styles.layout}>
                <ArticleBody article={article} inlineImages={art.inline} />
                <ArticleToc sections={article.sections} hasFaq={article.faq.length > 0} />
            </div>

            <footer className={styles.foot}>
                <p className={styles.disclaimer}>
                    Статья носит справочный характер и не заменяет консультацию врача.
                </p>
                <Link href="/contacts" className="btn btn--primary">Записаться на приём</Link>
            </footer>

            {/* Единственное место с dangerouslySetInnerHTML: JSON-LD не может быть
                текстовым потомком script — React экранировал бы кавычки. `<`
                заменяем на <, чтобы содержимое не могло закрыть тег. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
                }}
            />
        </article>
    );
}
```

- [ ] **Step 2: Стили страницы**

`app/(site)/blog/[slug]/page.module.css`:

```css
.container {
  max-width: var(--container);
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px) var(--gutter) var(--section-y);
  color: var(--ink);
}

.hero { margin-bottom: clamp(28px, 5vw, 48px); }

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--brand-tint);
  box-shadow: var(--shadow-lift);
}

.coverImage { object-fit: cover; }

.heroText { padding: 20px 4px 0; }

.title {
  margin: 0;
  font-family: var(--font-head);
  font-size: clamp(2.1rem, 4.6vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.01em;
  max-width: 22ch;
}

.meta {
  margin: 14px 0 0;
  font-family: var(--font-body);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* От 900px заголовок ложится на фото: там места хватает и снимок работает
   подложкой. Ниже — фото сверху, текст под ним. */
@media (min-width: 900px) {
  .hero { position: relative; isolation: isolate; }
  .cover { aspect-ratio: 21 / 9; }
  .cover::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(8, 24, 58, 0.82) 0%,
      rgba(8, 24, 58, 0.45) 42%,
      rgba(8, 24, 58, 0) 78%
    );
  }
  .heroText {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 2;
    padding: 0 clamp(24px, 4vw, 48px) clamp(24px, 4vw, 44px);
  }
  .title { color: var(--on-dark); max-width: 26ch; }
  .meta { color: var(--on-dark-soft); }
}

.layout { display: block; }

@media (min-width: 1100px) {
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    gap: clamp(32px, 5vw, 72px);
    align-items: start;
  }
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  max-width: 68ch;
  margin-top: clamp(40px, 6vw, 72px);
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.disclaimer {
  flex: 1 1 280px;
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ink-soft);
}
```

- [ ] **Step 3: Добавить статьи в sitemap**

В `app/sitemap.ts` добавить импорт и блок перед `return`:

```ts
import { listAllServices, listBlogPosts } from "@/lib/cms";
```

```ts
    const posts = await listBlogPosts();
    const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    return [...staticPages, ...servicePages, ...blogPages];
```

- [ ] **Step 4: Проверить сборку**

```bash
npx tsc --noEmit
npm run build
```

Ожидание: сборка проходит, в выводе есть маршруты `/blog` и `/blog/[slug]`.

- [ ] **Step 5: Закоммитить**

```bash
git add "app/(site)/blog/[slug]/page.tsx" "app/(site)/blog/[slug]/page.module.css" \
  lib/blog/article.ts app/sitemap.ts
git commit -m "feat(blog): страница статьи с метаданными, JSON-LD и оглавлением"
```

---

### Task 10: Приёмка

Ничего не создаёт — проверяет шесть критериев спеки на живой сборке. Всё, что не сошлось, правится здесь же.

**Files:**
- Modify: по результатам проверок.

- [ ] **Step 1: Тесты и типы**

```bash
npx tsc --noEmit && npm test
```
Ожидание: чисто, 30 тестов PASS.

- [ ] **Step 2: Собрать и поднять**

```bash
npm run build && npm start &
sleep 5
```

- [ ] **Step 3: Проверить серверный HTML статьи**

```bash
SLUG=$(curl -s "$BACKEND_URL/api/cms/blog" | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "slug: $SLUG"
curl -s "localhost:3000/blog/$SLUG" > /tmp/article.html
grep -c "<h1" /tmp/article.html
grep -c "application/ld+json" /tmp/article.html
```
Ожидание: `<h1` есть (текст в серверном HTML, не только на клиенте), JSON-LD есть.

Если список постов пуст — опубликовать один через Telegram-ревью или временно поднять статус в БД, иначе критерии 2, 3 и 5 не проверить.

- [ ] **Step 4: Проверить, что из тела статьи не просочилась разметка**

```bash
grep -o 'href="javascript:' /tmp/article.html | wc -l
grep -oE ' on[a-z]+="' /tmp/article.html | wc -l
```
Ожидание: обе цифры — 0.

- [ ] **Step 5: Проверить FAQPage**

```bash
grep -o '"@type":"FAQPage"' /tmp/article.html
grep -o '"@type":"Question"' /tmp/article.html | wc -l
```
Ожидание: `FAQPage` найден, вопросов 3–5 — столько, сколько требует промпт бекенда. Если `FAQPage` нет, проверить регэксп `FAQ_HEADING` против фактического заголовка раздела в `body` поста.

- [ ] **Step 6: Проверить навигацию и sitemap**

```bash
curl -s localhost:3000/blog | grep -c "Статей пока нет\|<h1"
curl -s localhost:3000/sitemap.xml | grep -c "/blog"
curl -s localhost:3000/ | grep -o 'href="/blog"' | head -1
kill %1
```
Ожидание: `/blog` в sitemap встречается минимум дважды (индекс + статья), ссылка на блог есть в шапке главной.

- [ ] **Step 7: Проверить пустое состояние**

```bash
BACKEND_URL= npm run build 2>&1 | tail -5
```
Ожидание: сборка не падает; `fetchCms` пишет в лог, что переменная не задана, и `/blog` собирается с пустым состоянием.

Вернуть окружение обратно и пересобрать.

- [ ] **Step 8: Закоммитить правки, если были**

```bash
git status --short
git add -A && git commit -m "fix(blog): правки по итогам приёмки"
```

Если правок не было — коммита нет.

---

## Что осталось за рамками

Эти вещи спека вынесла из охвата сознательно; они не забыты:

- Раздел блога в админке (список черновиков, публикация, правка).
- Блок «Последние статьи» на главной — он затрагивает `HomeShell`/`NarrativeActs` и отлаженный скролл-сценарий сцены нейрона.
- Подсветка активного пункта оглавления при скролле.
- Теги и поиск по статьям.
- Обложка как поле в бекенде вместо подбора на фронте.
