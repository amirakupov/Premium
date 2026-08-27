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
