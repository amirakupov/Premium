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