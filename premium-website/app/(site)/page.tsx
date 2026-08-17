import NeuronHero from '@/app/(site)/components/NeuronHero';
import Quote from '@/app/(site)/components/Quote';
import Services from '@/app/(site)/components/Services';
import ClinicFotos from '@/app/(site)/components/ClinicFotos';
import Doctors from '@/app/(site)/components/Doctors';
import HomeShell from '@/app/(site)/components/HomeShell';
import { listAllDoctors, listAllServices } from '@/lib/cms';

export default async function HomePage() {
    const [services, doctors] = await Promise.all([
        listAllServices(),
        listAllDoctors(),
    ]);

    return (
        <HomeShell>
            <NeuronHero />
            <Quote />
            <Services services={services.slice(0, 9)} />
            <ClinicFotos />
            <Doctors doctors={doctors.slice(0, 4)} />
        </HomeShell>
    );
}
