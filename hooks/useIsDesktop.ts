"use client";

import { useEffect, useState } from "react";

/**
 * True at the lg breakpoint (1024px+), where sheets present as centered modals.
 * Defaults to false pre-hydration so SSR output stays mobile-identical; sheets
 * only open post-hydration, so consumers never see a wrong value while visible.
 */
export function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        setIsDesktop(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return isDesktop;
}
