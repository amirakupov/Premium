import {ServiceInterfaceRes} from "@/app/api/interaface/ServiceInterfaceRes";

const BACKEND_URL = process.env.BACKEND_URL;

export const listAllServices = async ():Promise<ServiceInterfaceRes[]>=>
{
    const url = `${BACKEND_URL}/api/cms/services`;
    const response = await fetch(url,
        {
            method: "GET",
            headers: {
                accept: "application/json",
            },
            cache: "no-store",
        });
    const json = await response.json().catch((error) => {console.log("Failed get request for services", error);});
    if (Array.isArray(json)) return json as ServiceInterfaceRes[];
    return [];
}