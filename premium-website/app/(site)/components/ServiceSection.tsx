import Services from './Services';
import { listAllServices } from '@/app/api/listAllServices';

export default async function ServicesSection() {
    const services = await listAllServices();

    const preview = services.slice(0, 6);

    return <Services services={preview} />;
}