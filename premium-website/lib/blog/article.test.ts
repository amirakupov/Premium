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
