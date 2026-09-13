import { Suspense } from 'react';
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
// Кэш запросов при этом работает: `next: { revalidate }` в lib/cms.ts даёт час
// ISR на уровне fetch и при force-dynamic — проверено логом фикстурного
// бэкенда в perf-v3 (39 просмотров → 4 запроса, см. docs/perf-v3/report.md, D1).
export const dynamic = 'force-dynamic';

/* Секции из CMS — за границами Suspense: первый экран, нарративные экраны и
   цитата не зависят от бэкенда и отдаются сразу, а сетки услуг и врачей
   приезжают стримом со скелетонами вместо себя. */
async function ServicesFromCms() {
    const services = await listAllServices();
    return <Services services={services.slice(0, 9)} />;
}

async function DoctorsFromCms() {
    const doctors = await listAllDoctors();
    return <Doctors doctors={doctors.slice(0, 4)} />;
}

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
export default function HomePage() {
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
            <Suspense fallback={<Services services={null} />}>
                <ServicesFromCms />
            </Suspense>
            <ClinicFotos />
            <Suspense fallback={<Doctors doctors={null} />}>
                <DoctorsFromCms />
            </Suspense>
            <ExitStage />
        </HomeShell>
    );
}