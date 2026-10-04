import { CLINIC } from "./constants";
import type { DisclosureDocument, DocumentCategory } from "./types";

/**
 * Раскрытие информации по Постановлению Правительства РФ № 659.
 *
 * Данные раздела ведутся в админке и приходят с бэкенда (lib/cms.ts,
 * getDisclosure). Здесь — только правила показа: порядок категорий,
 * надпись про ОМС, формат дат.
 */

/**
 * Требование постановления — заявить отсутствие ОМС прямо и крупно.
 * Формулировка собирается из наименования, чтобы не разъезжаться с реквизитами.
 */
export function omsNotice(legalName: string): string {
    const org = legalName.trim() || CLINIC.name;
    return `Внимание: ${org} НЕ оказывает медицинские услуги в рамках программы обязательного медицинского страхования (ОМС).`;
}

/** Тег кеша данных раздела: админка сбрасывает его после каждого изменения. */
export const DISCLOSURE_TAG = "disclosure";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    CONTRACT: "Договор",
    PRICE_LIST: "Прейскурант",
    LICENSE: "Лицензия",
    REGULATION: "Нормативные акты",
    GUARANTEE_PROGRAM: "Программа госгарантий",
    OTHER: "Прочие документы",
    CERTIFICATE: "Сертификат",
    DIPLOMA: "Диплом",
};

/**
 * Категории списка «Документы» в порядке показа — тот же порядок, что у
 * перечисления на бэкенде. Программа госгарантий выводится в блоке ОМС.
 */
export const CLINIC_CATEGORIES: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "OTHER",
];

export function isDoctorCategory(category: DocumentCategory): boolean {
    return category === "CERTIFICATE" || category === "DIPLOMA";
}

export interface DocumentGroup {
    category: DocumentCategory;
    label: string;
    documents: DisclosureDocument[];
}

/** Непустые группы списка «Документы»; порядок внутри — по sortOrder. */
export function groupDocuments(documents: DisclosureDocument[]): DocumentGroup[] {
    return CLINIC_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        documents: documents
            .filter((d) => d.category === category && d.doctorId === null)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    })).filter((group) => group.documents.length > 0);
}

export function guaranteeProgram(documents: DisclosureDocument[]): DisclosureDocument | null {
    const found = documents
        .filter((d) => d.category === "GUARANTEE_PROGRAM" && d.doctorId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return found[0] ?? null;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Строковый разбор, а не Date: бэкенд отдаёт время без зоны, и new Date()
 * сдвинул бы дату у документа, обновлённого около полуночи.
 */
export function formatRuDate(iso: string): string {
    const match = ISO_DATE_RE.exec(iso);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}
