'use client';

import { useCallback, useEffect, useState } from 'react';
import Preloader, { PRELOADER_DONE_EVENT, PRELOADER_SEEN_KEY } from './Preloader';
import { CurtainProvider } from './curtain';

/**
 * Оболочка главной: прелоадер играет один раз за сессию браузера, и пока он
 * идёт, тяжёлые клиентские части страницы (сцена) не монтируются — см.
 * useCurtainDone.
 *
 * Почему занавес всегда есть в серверном HTML и в первом клиентском рендере:
 * иначе разметка сервера расходилась бы с клиентской, и React перерисовал бы
 * всю главную на клиенте. Вопрос «показывать ли» решён раньше и дешевле —
 * inline-скриптом в <head> (app/layout.tsx), который ставит
 * `html[data-curtain]` до первого пейнта; CSS по этому атрибуту прячет занавес
 * и блокирует скролл. Здесь мы лишь снимаем его из дерева, когда он отыграл.
 */
export default function HomeShell({ children }: { children: React.ReactNode }) {
    const [showPreloader, setShowPreloader] = useState(true);

    const finish = useCallback(() => {
        const root = document.documentElement;
        try {
            sessionStorage.setItem(PRELOADER_SEEN_KEY, '1');
        } catch {
            /* без sessionStorage занавес просто сыграет и в следующий раз */
        }
        root.dataset.curtain = '0';
        root.removeAttribute('aria-busy');
        // обратная совместимость: слушатели вне HomeShell
        window.dispatchEvent(new Event(PRELOADER_DONE_EVENT));
        setShowPreloader(false);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (root.dataset.curtain === '1') root.setAttribute('aria-busy', 'true');
    }, []);

    return (
        <CurtainProvider value={!showPreloader}>
            {showPreloader && <Preloader onComplete={finish} />}
            {children}
        </CurtainProvider>
    );
}
