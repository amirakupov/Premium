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
        expect(pickArt(post({ title: "Мигрень и головная боль" }), 3).cover).toBe("/services/massage.png");
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
