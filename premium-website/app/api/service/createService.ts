import {ServiceInterfaceReq} from "@/app/api/interaface/ServiceInterfaceReq";

export const createService = async (serviceRequest: ServiceInterfaceReq)=> {
    const url = `/api/service`;
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