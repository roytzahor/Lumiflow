"use client";

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsCollapsibleSection({
  open,
  onToggle,
  title,
  headerStart,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  headerStart?: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="rounded-3xl shadow-card bg-ios-card dark:bg-ios-dark-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'sticky top-0 z-[2] flex w-full items-center gap-2.5 px-5 pt-5 pb-3 text-end',
          'bg-ios-card/95 dark:bg-ios-dark-card/95 backdrop-blur-md',
          'transition-[border-radius] duration-300 ease-out',
          open ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl',
        )}
      >
        {headerStart}
        <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text flex-1 min-w-0">{title}</h2>
        <ChevronDown
          className={cn(
            'w-5 h-5 shrink-0 text-ios-subtle dark:text-ios-dark-subtle transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      {reduceMotion ? (
        open ? <div className="px-5 pb-5 pt-1 rounded-b-3xl">{children}</div> : null
      ) : (
        <div className="overflow-hidden">
          <motion.div
            initial={false}
            animate={{
              height: open ? 'auto' : 0,
              opacity: open ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 rounded-b-3xl">{children}</div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
