import {DoctorInterfaceRes} from "@/app/api/interaface/DoctorInterfaceRes";

const BACKEND_URL = process.env.BACKEND_URL;

export const listAllDoctors = async ():Promise<DoctorInterfaceRes[]>=>
{
    const url = `${BACKEND_URL}/api/cms/doctors`;
    const response = await fetch(url,
        {
            method: "GET",
            headers: {
                accept: "application/json",
            },
            cache: "no-store",
        });
    const json = await response.json().catch((error) => {console.log("Failed get request for doctors", error);});
    if (Array.isArray(json)) return json as DoctorInterfaceRes[];
    return [];
}