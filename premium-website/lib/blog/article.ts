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

/** Заголовок блока вопросов — по промпту бекенда это всегда «Частые вопросы». */
const FAQ_HEADING = /частые\s+вопросы|вопросы\s+и\s+ответы|^faq$/i;

const WORDS_PER_MINUTE = 180;

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
