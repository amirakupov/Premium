import {DoctorInterfaceReq} from "@/app/api/interaface/DoctorInterfaceReq";


export const createDoctor = async (doctorRequest: DoctorInterfaceReq)=> {

    const url = `/api/doctor`;
    const body = JSON.stringify(doctorRequest);
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
        console.error("Failed to create doctor", response.statusText);
        return null;
    }
    const json = await response.json().catch((error) => {console.log("Failed to create doctor", error);});
    return json;
}