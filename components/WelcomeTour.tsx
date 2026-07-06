'use client';

import { markWelcomeTourCompleted } from '@/app/actions/onboarding';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/welcome-tour.css';
import { useEffect, useRef } from 'react';

type WelcomeTourProps = {
  welcomeTourCompletedAt: Date | string | null | undefined;
};

type TourStep = {
  element: string;
  popover: { title: string; description: string };
};

const ALL_STEPS: TourStep[] = [
  {
    element: '[data-testid="dashboard-month-selector"]',
    popover: { title: 'חודש המבט', description: 'בוחרים את החודש לסקירה. החצים משנים שנה.' },
  },
  {
    element: '[data-testid="dashboard-scope-selector"]',
    popover: {
      title: 'תצוגת חשבון',
      description: 'מחליפים כאן תצוגה בלחיצה: "הכסף שלי" (החלק שמיוחס לכם בלבד), חשבון ספציפי, או הכל יחד.',
    },
  },
  {
    element: '[data-testid="dashboard-daily-snapshot"]',
    popover: { title: 'תמונת מצב יומית', description: 'עדכון קצר על קצב ההוצאות שלכם החודש, מתעדכן כל יום.' },
  },
  {
    element: '[data-testid="dashboard-personal-income"]',
    popover: {
      title: 'ההכנסה האישית שלי',
      description: 'ההכנסה הנטו שלכם, התרומות לחשבונות משותפים, וכמה נשאר לשימוש חופשי.',
    },
  },
  {
    element: '[data-testid="dashboard-shared-split"]',
    popover: {
      title: 'חלוקת הוצאות',
      description: 'פירוט לפי קטגוריה — כמה כל אחד מבני הזוג מיוחס לו מתוך ההוצאות בחשבון המשותף.',
    },
  },
  {
    element: '[data-testid="fab-add-button"]',
    popover: { title: 'הוספת הוצאה', description: 'לחיצה קצרה — הוצאה מהירה. לחיצה ארוכה — גם הוצאה קבועה.' },
  },
  {
    element: '[data-testid="bottom-nav-settings"]',
    popover: {
      title: 'הגדרות',
      description: 'חשבונות משותפים, הזמנות, קטגוריות והוצאות קבועות — כאן ממשיכים להגדיר את LumiFlow.',
    },
  },
];

export default function WelcomeTour({ welcomeTourCompletedAt }: WelcomeTourProps) {
  const persistedRef = useRef(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (welcomeTourCompletedAt != null) return;
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Cypress?: unknown };
    if (w.Cypress || (typeof navigator !== 'undefined' && Boolean(navigator.webdriver))) return;

    const timer = window.setTimeout(() => {
      const availableSteps = ALL_STEPS.filter((step) => document.querySelector(step.element));
      if (availableSteps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        animate: true,
        popoverClass: 'lumiflow-welcome-tour-popover',
        overlayColor: 'var(--background)',
        overlayOpacity: 0.42,
        stagePadding: 10,
        stageRadius: 16,
        nextBtnText: 'הבא',
        prevBtnText: 'חזרה',
        doneBtnText: 'סיום',
        progressText: '{{current}} מתוך {{total}}',
        allowClose: true,
        overlayClickBehavior: 'close',
        steps: availableSteps,
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
