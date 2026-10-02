import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID = {
    requisites: {
        legalName: "Общество",
        shortName: "ООО «ПРЕМИУМ»",
        inn: "0276970983",
        kpp: "",
        ogrn: "",
        registeredAt: "",
        legalAddress: "",
        actualAddress: "",
    },
    documents: [],
    dmsPartners: [],
    regulators: [],
};

describe("getDisclosure", () => {
    beforeEach(() => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("запрашивает раздел с тегом кеша и возвращает данные", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(VALID), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const { getDisclosure } = await import("./cms");

        await expect(getDisclosure()).resolves.toEqual(VALID);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("http://backend.test/api/cms/disclosure");
        expect(init.next).toEqual({ tags: ["disclosure"], revalidate: 3600 });
    });

    it("бросает, а не отдаёт пустой раздел, если бэкенд недоступен", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow();
    });

    it("бросает на ответ не-2xx", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 502 })));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow("502");
    });

    it("бросает на ответ неверной формы", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: "x" }), { status: 200 })));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow();
    });
});
