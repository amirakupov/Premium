"use client";

import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { createLatestGate } from "@/lib/admin/disclosure";
import type { Disclosure } from "@/lib/types";
import { type ActionResult, actionLoadDisclosure } from "../../disclosure/actions";
import { useToast } from "../ui/ToastProvider";

export type DisclosureData = {
    data: Disclosure | null;
    loading: boolean;
    busy: boolean;
    reload: () => Promise<void>;
    run: <T>(action: () => Promise<ActionResult<T>>, success: string) => Promise<ActionResult<T>>;
};

const DisclosureContext = createContext<DisclosureData | null>(null);

export function useDisclosureData(): DisclosureData {
    const ctx = useContext(DisclosureContext);
    if (!ctx) throw new Error("useDisclosureData вызван вне DisclosureDataProvider");
    return ctx;
}

/**
 * Состояние раздела раскрытия. Без оптимистичных операций, в отличие от
 * AdminDataProvider: записей десятки, а ошибка здесь — это юридически
 * неверная страница, поэтому экран показывает только подтверждённое сервером.
 */
export default function DisclosureDataProvider({ children }: { children: ReactNode }) {
    const { push } = useToast();
    const [data, setData] = useState<Disclosure | null>(null);
    const [loading, setLoading] = useState(true);
    // Счётчик, а не флаг: две правки подряд, и первая завершившаяся не должна
    // разблокировать кнопки, пока вторая ещё в полёте.
    const [inFlight, setInFlight] = useState(0);
    const gate = useRef(createLatestGate()).current;

    async function reload() {
        const request = gate.begin();
        setLoading(true);
        const result = await actionLoadDisclosure().catch(() => null);
        if (!gate.isLatest(request)) return;
        setLoading(false);
        if (result?.ok) return setData(result.data);
        push({
            tone: "error",
            title: result?.error ?? "Не удалось загрузить раздел",
            action: { label: "Повторить", onClick: () => void reload() },
        });
    }

    useEffect(() => {
        void reload();
        // Загрузка один раз при монтировании каркаса.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function run<T>(action: () => Promise<ActionResult<T>>, success: string) {
        setInFlight((n) => n + 1);
        let result: ActionResult<T>;
        try {
            result = await action();
        } catch {
            result = { ok: false, error: "Сеть недоступна — изменения не сохранены" };
        }
        setInFlight((n) => n - 1);
        if (result.ok) {
            push({ tone: "success", title: success });
            await reload();
        } else {
            push({ tone: "error", title: result.error });
            if (result.error.includes("устарел")) await reload();
        }
        return result;
    }

    const value: DisclosureData = { data, loading, busy: inFlight > 0, reload, run };
    return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>;
}
