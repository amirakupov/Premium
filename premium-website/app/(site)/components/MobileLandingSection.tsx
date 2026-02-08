import MobileLanding from '@/app/(site)/components/MobileLanding';
import { listAllServices } from '@/app/api/listAllServices';
import { listAllDoctors } from '@/app/api/listAllDoctors';

export default async function MobileLandingSection() {
    const [services, doctors] = await Promise.all([
        listAllServices(),
        listAllDoctors(),
        ]);
    return (
        <MobileLanding
            services={services.slice(0, 6)}
            doctors={doctors.slice(0, 4)}
        />
    );
}
