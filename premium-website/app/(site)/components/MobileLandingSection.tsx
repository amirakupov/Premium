import MobileLanding from '@/app/(site)/components/MobileLanding';
import { listAllServices } from '@/app/api/listAllServices';
import { listAllDoctors } from '@/app/api/listAllDoctors';

export default async function MobileLandingSection() {
    const [services, doctors] = await Promise.all([
        listAllServices(),
        listAllDoctors(),
        ]);
    const uiServices = services.slice(0, 6).map((s: any) => ({
        ...s,
        price: String(s.price),
    }));
    return (
        <MobileLanding
            services={uiServices}
            doctors={doctors.slice(0, 4)}
        />
    );
}
