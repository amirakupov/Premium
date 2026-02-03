import {ServiceInterfaceReq} from "@/app/interaface/ServiceInterfaceReq";

const BACKEND_URL = process.env.BACKEND_URL;
export const createService = async (serviceRequest: ServiceInterfaceReq)=> {
    const url = new URL(`${BACKEND_URL}/api/cms/service`);
    const body = JSON.stringify(serviceRequest);
    const response = await fetch(url,
        {
            method: "POST",
            headers:{
                "Content-Type": "application/json",
                accept: "application/json",
            },
            credentials: "include",
            body: body,
        });
    if (!response.ok){
        console.error(" Failed to create deal", response.statusText);
        return null;
    }
    const json = await response.json().catch((error) => {console.log("Failed to create deal", error);});
    return json;
}