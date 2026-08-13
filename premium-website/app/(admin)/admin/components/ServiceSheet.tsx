"use client";

import { useEffect, useMemo, useState } from "react";
import type { Service, ServicePayload } from "@/lib/types";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    DESCRIPTION_MAX,
    SERVICE_FIELD_ORDER,
    type FieldErrors,
    type ServiceField,
    firstErrorField,
    validateService,
} from "@/lib/admin/validation";
import Button from "./ui/Button";
import Dropzone from "./ui/Dropzone";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Sheet from "./ui/Sheet";
import Textarea from "./ui/Textarea";
import { useToast } from "./ui/ToastProvider";
import { useAdminData } from "./data/AdminDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import styles from "./ServiceSheet.module.css";

const EMPTY: ServicePayload = {
    serviceName: "",
    slug: "",
    price: 0,
    imageSrc: "",
    description: "",
    longDescription: "",
};

function toPayload(service: Service): ServicePayload {
    return {
        serviceName: service.serviceName ?? "",
        slug: service.slug ?? "",
        price: Number(service.price ?? 0),
        imageSrc: service.imageSrc ?? "",
        description: service.description ?? "",
        longDescription: service.longDescription ?? "",
    };
}

export default function ServiceSheet({
    open,
    service,
    onClose,
    onSubmit,
}: {
    open: boolean;
    service: Service | null;
    onClose: () => void;
    onSubmit: (payload: ServicePayload) => void;
}) {
    const { push } = useToast();
    const { setSave } = useAdminData();
    const { setFormSubmit, setModalOpen } = useAdminUi();
    const draftId = service ? service.id : "new";
    const initial = useMemo(() => (service ? toPayload(service) : EMPTY), [service]);

    const [form, setForm] = useState<ServicePayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<ServiceField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    // Открытие: подставляем данные записи, но восстановленный черновик важнее.
    useEffect(() => {
        if (!open) return;
        const draft = loadDraft<ServicePayload>("service", draftId);
        setForm(draft ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    // Автосохранение черновика: пользователь не теряет набранное.
    useEffect(() => {
        if (!open || !dirty) return;
        saveDraft("service", draftId, form);
        // Статус в топбаре: «Черновик сохранён» — единственное место,
        // которое выставляет состояние draft.
        setSave("draft");
    }, [open, dirty, form, draftId, setSave]);

    // Предупреждение при уходе со страницы с несохранёнными изменениями.
    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    function submit() {
        const found = validateService(form);
        setErrors(found);
        const first = firstErrorField(found, SERVICE_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            document.getElementById(`service-${first}`)?.focus();
            return;
        }
        clearDraft("service", draftId);
        onSubmit(form);
        onClose();
    }

    // ⌘S и ⌘↵ отправляют именно эту форму, пока sheet открыт.
    useEffect(() => {
        if (!open) return;
        setFormSubmit(submit);
        return () => setFormSubmit(null);
        // submit пересобирается на каждый рендер — важно значение, не идентичность
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("service", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    return (
        <>
            <Sheet
                open={open}
                title={service ? `Услуга: ${service.serviceName}` : "Новая услуга"}
                onClose={requestClose}
                footer={
                    <>
                        <span className={styles.draftHint}>
                            {dirty ? "Черновик сохраняется автоматически" : "Изменений нет"}
                        </span>
                        <Button variant="ghost" onClick={requestClose}>Отменить</Button>
                        <Button variant="primary" onClick={submit}>
                            Сохранить <kbd className={styles.kbd}>⌘S</kbd>
                        </Button>
                    </>
                }
            >
                <Input
                    id="service-serviceName"
                    label="Название"
                    required
                    value={form.serviceName}
                    error={errors.serviceName}
                    onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
                />
                <Input
                    id="service-slug"
                    label="Слаг"
                    required
                    value={form.slug}
                    error={errors.slug}
                    hint={`Адрес страницы: /services/${form.slug || "…"}`}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
                <Input
                    id="service-price"
                    label="Цена, ₽"
                    required
                    inputMode="numeric"
                    value={String(form.price)}
                    error={errors.price}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, price: Number(e.target.value.replace(/\D/g, "") || 0) }))
                    }
                />
                <Dropzone
                    label="Изображение"
                    value={form.imageSrc}
                    onChange={(url) => setForm((f) => ({ ...f, imageSrc: url }))}
                    onError={(title) => push({ tone: "error", title })}
                />
                <Textarea
                    id="service-description"
                    label="Краткое описание"
                    max={DESCRIPTION_MAX}
                    value={form.description}
                    error={errors.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <Textarea
                    id="service-longDescription"
                    label="Подробное описание"
                    value={form.longDescription}
                    onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                />
            </Sheet>

            <Modal
                open={confirmClose}
                title="Закрыть без сохранения?"
                description="Введённое останется в черновике и восстановится, когда вы вернётесь к этой записи."
                cancelLabel="Продолжить правку"
                confirmLabel="Закрыть"
                onCancel={() => {
                    setConfirmClose(false);
                    setModalOpen(false);
                }}
                onConfirm={discard}
            />
        </>
    );
}
