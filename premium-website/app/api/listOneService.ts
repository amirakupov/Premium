import {ServiceInterfaceRes} from "@/app/api/interaface/ServiceInterfaceRes";

const BACKEND_URL = process.env.BACKEND_URL;

export const listOneServices = async (serviceId: number): Promise<ServiceInterfaceRes | null>=>
{
    const url = new URL(`${BACKEND_URL}/api/cms/service`);
    url.searchParams.set("id", String(serviceId));
    const response = await fetch(url.toString(),
        {
            method: "GET",
            headers: {
                accept: "application/json",
            },
            cache: "no-store",
        });
    const json = await response.json().catch((error) => {console.log("Failed get request for services", error);});
    if (!response.ok) {
        console.log("Failed get request for services", response.status, json);
        return null;
    }
    return json as ServiceInterfaceRes;
}