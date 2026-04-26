'use client';

import { markWelcomeTourCompleted } from '@/app/actions';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/welcome-tour.css';
import { useEffect, useRef } from 'react';

type WelcomeTourProps = {
  welcomeTourCompletedAt: Date | string | null | undefined;
};

export default function WelcomeTour({ welcomeTourCompletedAt }: WelcomeTourProps) {
  const persistedRef = useRef(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (welcomeTourCompletedAt != null) return;
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Cypress?: unknown };
    if (w.Cypress || (typeof navigator !== 'undefined' && Boolean(navigator.webdriver))) return;

    const timer = window.setTimeout(() => {
      const selectors = ['[data-testid="dashboard-month-selector"]', '[data-testid="fab-add-button"]', '[data-testid="bottom-nav-settings"]'];
      for (const sel of selectors) {
        if (!document.querySelector(sel)) return;
      }

      const driverObj = driver({
        showProgress: true,
        animate: true,
        popoverClass: 'lumiflow-welcome-tour-popover',
        overlayColor: '#0C121B',
        overlayOpacity: 0.42,
        stagePadding: 10,
        stageRadius: 16,
        nextBtnText: 'הבא',
        prevBtnText: 'חזרה',
        doneBtnText: 'סיום',
        progressText: '{{current}} מתוך {{total}}',
        allowClose: true,
        overlayClickBehavior: 'close',
        steps: [
          {
            element: '[data-testid="dashboard-month-selector"]',
            popover: {
              title: 'חודש המבט',
              description: 'בוחרים את החודש לסקירה. החצים משנים שנה.',
            },
          },
          {
            element: '[data-testid="fab-add-button"]',
            popover: {
              title: 'הוספת הוצאה',
              description: 'לחיצה קצרה — הוצאה מהירה. לחיצה ארוכה — גם הוצאה קבועה.',
            },
          },
          {
            element: '[data-testid="bottom-nav-settings"]',
            popover: {
              title: 'הגדרות',
              description: 'חשבונות משותפים, הזמנות, קטגוריות והוצאות קבועות — כאן ממשיכים להגדיר את LumiFlow.',
            },
          },
        ],
        onDestroyed: () => {
          if (persistedRef.current) return;
          persistedRef.current = true;
          void markWelcomeTourCompleted();
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [welcomeTourCompletedAt]);

  return null;
}
