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
