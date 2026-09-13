'use client';

import { createContext, useContext } from 'react';

/**
 * Состояние занавеса (прелоадера) для компонентов главной.
 *
 * Источник правды один — HomeShell: он знает про sessionStorage, про
 * inline-скрипт в <head>, который решает вопрос до первого пейнта, и про
 * `finish`. Внутри страницы состояние расходится контекстом, а не глобальным
 * событием: два независимых слушателя одного события — это два разных мнения о
 * том, убран занавес или нет. Событие `PRELOADER_DONE_EVENT` на window
 * остаётся только для обратной совместимости с кодом вне HomeShell.
 *
 * Значение по умолчанию `true`: там, где HomeShell нет (любая страница кроме
 * главной), занавеса нет и ждать нечего.
 */
const CurtainContext = createContext<boolean>(true);

export const CurtainProvider = CurtainContext.Provider;

/** `true` — занавес убран (или его не было), можно монтировать тяжёлое. */
export function useCurtainDone(): boolean {
    return useContext(CurtainContext);
}
