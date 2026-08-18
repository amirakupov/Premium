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
