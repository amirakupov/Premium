/** Доменные типы, общие для витрины и админки. */

export interface Service {
    id: number;
    slug: string;
    imageSrc: string;
    serviceName: string;
    price: number;
    description: string;
    longDescription: string;
    /** Флаг с бэкенда: показывать ли на странице услуги прайс-лист анализов. */
    analysesList?: boolean;
}

/** Payload создания/обновления услуги — id назначает бэкенд. */
export type ServicePayload = Omit<Service, "id" | "analysesList">;

export interface Doctor {
    id: number;
    imgSrc: string;
    name: string;
    specialty: string;
    bio: string;
}

export type DoctorPayload = Omit<Doctor, "id">;

export interface LoginRequest {
    username: string;
    password: string;
}

/**
 * Пост блога. Зеркало BlogPostResponseDto бекенда: поля sourceTopic в DTO
 * нет, поэтому тему статьи на фронте приходится выводить из title/keywords.
 */
export interface BlogPost {
    id: number;
    slug: string;
    title: string;
    /** Санитизированный на бекенде HTML: h2, h3, p, ul, ol, li, strong, em, a. */
    body: string;
    metaDescription: string | null;
    keywords: string | null;
    status: "DRAFT" | "PUBLISHED";
    aiGenerated: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Раздел раскрытия информации. Зеркало DTO бэкенда: строковые поля приходят
 * пустой строкой, а не null, — витрине не нужно проверять каждое поле.
 */
export type DocumentCategory =
    | "CONTRACT"
    | "PRICE_LIST"
    | "LICENSE"
    | "REGULATION"
    | "GUARANTEE_PROGRAM"
    | "OTHER"
    | "CERTIFICATE"
    | "DIPLOMA";

export type DocumentKind = "FILE" | "LINK";

export interface DisclosureDocument {
    id: number;
    title: string;
    category: DocumentCategory;
    kind: DocumentKind;
    /** `/uploads/<uuid>.pdf` для FILE, `https://…` для LINK. */
    url: string;
    note: string;
    sortOrder: number;
    /** null — документ клиники. */
    doctorId: number | null;
    /** ISO LocalDateTime без зоны, например `2026-09-30T12:00:00`. */
    updatedAt: string;
}

export interface DisclosureDocumentPayload {
    title: string;
    category: DocumentCategory;
    kind: DocumentKind;
    url: string;
    note: string;
    doctorId?: number | null;
}

export interface ClinicRequisites {
    legalName: string;
    shortName: string;
    inn: string;
    kpp: string;
    ogrn: string;
    /** `YYYY-MM-DD` или пустая строка. */
    registeredAt: string;
    legalAddress: string;
    actualAddress: string;
}

export interface DmsPartner {
    id: number;
    name: string;
    site: string;
    sortOrder: number;
}

export interface Regulator {
    id: number;
    name: string;
    address: string;
    phone: string;
    site: string;
    sortOrder: number;
}

export interface Disclosure {
    requisites: ClinicRequisites;
    documents: DisclosureDocument[];
    dmsPartners: DmsPartner[];
    regulators: Regulator[];
}
