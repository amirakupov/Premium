import {ServiceInterface} from "@/app/interaface/ServiceInterface";

const BACKEND_URL = process.env.BACKEND_URL;

export const listAllServices = async ():Promise<ServiceInterface[]>=>
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
    return json?.data;
}