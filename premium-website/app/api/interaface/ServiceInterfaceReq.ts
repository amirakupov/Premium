export interface ServiceInterfaceReq {
    id: number,
    slug: string,
    imageSrc: string,
    serviceName: string,
    price: bigint,
    description: string,
    longDescription: string
}