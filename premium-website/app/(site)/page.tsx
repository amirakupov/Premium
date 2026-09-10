import NeuronCanvasMount from '@/app/(site)/components/neuron/NeuronCanvasMount';
import NeuronHero from '@/app/(site)/components/NeuronHero';
import { SymptomAct, DiagnosticsAct, ExitStage } from '@/app/(site)/components/NarrativeActs';
import Quote from '@/app/(site)/components/Quote';
import Services from '@/app/(site)/components/Services';
import ClinicFotos from '@/app/(site)/components/ClinicFotos';
import Doctors from '@/app/(site)/components/Doctors';
import HomeShell from '@/app/(site)/components/HomeShell';
import SectionMotion from '@/app/(site)/components/SectionMotion';
import { listAllDoctors, listAllServices } from '@/lib/cms';

// Блоки услуг и врачей на главной приходят из CMS — на билде бэкенда нет,
// пререндер дал бы пустые секции. Подробнее: app/(site)/doctors/page.tsx.
export const dynamic = 'force-dynamic';

/**
 * Порядок секций здесь — это порядок глав сцены. Каждая глава привязана к
 * DOM-якорю секции (см. components/neuron/sceneScript.ts):
 *
 *   #hero           → Пробуждение
 *   #symptom        → Симптом
 *   #diagnostics    → Диагностика
 *   #quote          → Сеть
 *   #services       → Терапия
 *   #clinic-photos  → Кульминация: сбор
 *   #doctors        → Кульминация: вспышка
 *   #outro          → Выход (линия ЭЭГ)
 *
 * Переставили секции — перестановьте и главы: сцена читает таблицу сверху вниз
 * и требует, чтобы якоря шли в том же порядке, что и в разметке.
 */
export default async function HomePage() {
    const [services, doctors] = await Promise.all([
        listAllServices(),
        listAllDoctors(),
    ]);

    return (
        <HomeShell>
            {/* Единственный Canvas на страницу: фиксированный слой за всем контентом. */}
            <NeuronCanvasMount />
            {/* Анимации секций: один клиентский модуль, секции остаются серверными. */}
            <SectionMotion />
            <NeuronHero />
            <SymptomAct />
            <DiagnosticsAct />
            <Quote />
            <Services services={services.slice(0, 9)} />
            <ClinicFotos />
            <Doctors doctors={doctors.slice(0, 4)} />
            <ExitStage />
        </HomeShell>
    );
}