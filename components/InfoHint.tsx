'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export type InfoHintProps = {
  children: ReactNode;
  /** Accessible name for the trigger */
  ariaLabel?: string;
  className?: string;
};

const PANEL_WIDTH = 304;
const VIEWPORT_PAD = 10;

export default function InfoHint({ children, ariaLabel = 'הסבר', className }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPanelStyle(null);
      return;
    }
    const el = rootRef.current;
    const rect = el.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.right - PANEL_WIDTH),
      vw - PANEL_WIDTH - VIEWPORT_PAD
    );
    const top = rect.bottom + 6;
    setPanelStyle({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onResize = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const left = Math.min(
        Math.max(VIEWPORT_PAD, rect.right - PANEL_WIDTH),
        vw - PANEL_WIDTH - VIEWPORT_PAD
      );
      setPanelStyle({ top: rect.bottom + 6, left });
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, close]);

  const panel =
    open && panelStyle && typeof document !== 'undefined' ? (
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: panelStyle.top,
          left: panelStyle.left,
          width: PANEL_WIDTH,
          zIndex: 200,
        }}
        className="rounded-2xl border border-gray-200/90 bg-white p-3 text-start shadow-lg dark:border-white/10 dark:bg-ios-dark-card"
      >
        <div className="text-xs leading-relaxed text-ios-text dark:text-ios-dark-text">{children}</div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative inline-flex shrink-0 ${className ?? ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-ios-subtle/30 bg-ios-gray-6/80 text-ios-subtle transition-colors hover:bg-ios-gray-6 hover:text-ios-text dark:border-white/20 dark:bg-ios-dark-fill dark:text-ios-dark-subtle dark:hover:text-ios-dark-text"
      >
        <Info className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
