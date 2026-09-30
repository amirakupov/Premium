"use client";

import { useEffect, useState } from "react";
import type { ClinicRequisites } from "@/lib/types";
import { isDirty } from "@/lib/admin/draft";
import {
    type FieldErrors,
    REQUISITES_FIELD_ORDER,
    type RequisitesField,
    firstErrorField,
    validateRequisites,
} from "@/lib/admin/validation";
import { actionPatchRequisites } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { useToast } from "./ui/ToastProvider";
import styles from "./Disclosure.module.css";

const FIELDS: { key: RequisitesField; label: string; hint?: string; inputMode?: "numeric" }[] = [
    { key: "legalName", label: "Полное наименование", hint: "Как в ЕГРЮЛ, дословно" },
    { key: "shortName", label: "Сокращённое наименование", hint: "Подставляется в надпись про ОМС" },
    { key: "inn", label: "ИНН", inputMode: "numeric" },
    { key: "kpp", label: "КПП", inputMode: "numeric" },
    { key: "ogrn", label: "ОГРН", inputMode: "numeric" },
    { key: "registeredAt", label: "Дата регистрации" },
    { key: "legalAddress", label: "Юридический адрес" },
    { key: "actualAddress", label: "Фактический адрес" },
];

const EMPTY: ClinicRequisites = {
    legalName: "",
    shortName: "",
    inn: "",
    kpp: "",
    ogrn: "",
    registeredAt: "",
    legalAddress: "",
    actualAddress: "",
};

/** Поле, к которому относится ошибка бэкенда: у кодов она начинается с их названия. */
function fieldOfBackendError(message: string): RequisitesField | null {
    if (message.startsWith("ИНН")) return "inn";
    if (message.startsWith("КПП")) return "kpp";
    if (message.startsWith("ОГРН")) return "ogrn";
    if (message.includes("дата")) return "registeredAt";
    return null;
}

export default function RequisitesForm() {
    const { push } = useToast();
    const { data, run, busy } = useDisclosureData();
    const saved = data?.requisites ?? EMPTY;
    const [form, setForm] = useState<ClinicRequisites>(saved);
    const [errors, setErrors] = useState<FieldErrors<RequisitesField>>({});

    // Сервер — источник правды: после сохранения и перечитывания форма
    // показывает то, что записалось (обрезанные пробелы, очищенные поля).
    useEffect(() => {
        setForm(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.requisites]);

    const dirty = isDirty(form, saved);

    async function submit() {
        const found = validateRequisites(form);
        setErrors(found);
        const first = firstErrorField(found, REQUISITES_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте реквизиты" });
            document.getElementById(`requisites-${first}`)?.focus();
            return;
        }
        const result = await run(() => actionPatchRequisites(form), "Реквизиты сохранены");
        if (!result.ok) {
            const field = fieldOfBackendError(result.error);
            if (field) setErrors({ [field]: result.error });
        }
    }

    return (
        <form
            className={styles.form}
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
        >
            {FIELDS.map(({ key, label, hint, inputMode }) => (
                <Input
                    key={key}
                    id={`requisites-${key}`}
                    label={label}
                    hint={key === "registeredAt" ? "ГГГГ-ММ-ДД, например 2022-09-06" : hint}
                    inputMode={inputMode}
                    value={form[key]}
                    error={errors[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
            ))}
            <div className={styles.formActions}>
                <Button variant="ghost" disabled={!dirty || busy} onClick={() => setForm(saved)}>
                    Отменить изменения
                </Button>
                <Button type="submit" variant="primary" disabled={!dirty} loading={busy} busyLabel="Сохраняем…">
                    Сохранить
                </Button>
            </div>
        </form>
    );
}
