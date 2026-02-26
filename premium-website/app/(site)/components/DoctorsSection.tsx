import {listAllDoctors} from "@/app/api/listAllDoctors";
import Doctors from "@/app/(site)/components/Doctors";

export default async function DoctorsSection(){
    const doctors = await listAllDoctors();
    const preview = doctors.slice(0, 4);
    return <Doctors doctors={preview} />;
}