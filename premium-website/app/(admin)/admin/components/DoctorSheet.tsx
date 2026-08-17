"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Doctor, DoctorPayload } from "@/lib/types";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    BIO_MAX,
    DOCTOR_FIELD_ORDER,
    type DoctorField,
    type FieldErrors,
    firstErrorField,
    validateDoctor,
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

const EMPTY: DoctorPayload = { imgSrc: "", name: "", specialty: "", bio: "" };

function toPayload(doctor: Doctor): DoctorPayload {
    return {
        imgSrc: doctor.imgSrc ?? "",
        name: doctor.name ?? "",
        specialty: doctor.specialty ?? "",
        bio: doctor.bio ?? "",
    };
}

export default function DoctorSheet({
    open,
    doctor,
    onClose,
    onSubmit,
}: {
    open: boolean;
    doctor: Doctor | null;
    onClose: () => void;
    onSubmit: (payload: DoctorPayload) => void;
}) {
    const { push } = useToast();
    const { setSave } = useAdminData();
    const { setFormSubmit, modalOpen, setModalOpen } = useAdminUi();
    const draftId = doctor ? doctor.id : "new";
    const initial = useMemo(() => (doctor ? toPayload(doctor) : EMPTY), [doctor]);

    const [form, setForm] = useState<DoctorPayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<DoctorField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    useEffect(() => {
        if (!open) return;
        const draft = loadDraft<DoctorPayload>("doctor", draftId);
        setForm(draft ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    useEffect(() => {
        if (!open || !dirty) return;
        saveDraft("doctor", draftId, form);
        setSave("draft");
    }, [open, dirty, form, draftId, setSave]);

    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    function submit() {
        const found = validateDoctor(form);
        setErrors(found);
        const first = firstErrorField(found, DOCTOR_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            document.getElementById(`doctor-${first}`)?.focus();
            return;
        }
        clearDraft("doctor", draftId);
        onSubmit(form);
        onClose();
    }

    useEffect(() => {
        if (!open) return;
        setFormSubmit(submit);
        return () => setFormSubmit(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    // Esc гасит флаг в контексте — модалка закрывается следом. Реагируем
    // на переход true → false: в коммите, где модалка открылась, флаг
    // контекста ещё false, и сравнение «просто по флагу» закрыло бы её
    // сразу после открытия.
    const modalWasOpen = useRef(false);
    useEffect(() => {
        if (modalWasOpen.current && !modalOpen) setConfirmClose(false);
        modalWasOpen.current = modalOpen;
    }, [modalOpen]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("doctor", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    return (
        <>
            <Sheet
                open={open}
                title={doctor ? `Врач: ${doctor.name}` : "Новый врач"}
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
                <Dropzone
                    label="Фото"
                    value={form.imgSrc}
                    onChange={(url) => setForm((f) => ({ ...f, imgSrc: url }))}
                    onError={(title) => push({ tone: "error", title })}
                />
                <Input
                    id="doctor-name"
                    label="Полное имя"
                    required
                    value={form.name}
                    error={errors.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                    id="doctor-specialty"
                    label="Специализация"
                    required
                    value={form.specialty}
                    error={errors.specialty}
                    onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                />
                <Textarea
                    id="doctor-bio"
                    label="Биография"
                    max={BIO_MAX}
                    value={form.bio}
                    error={errors.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
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
