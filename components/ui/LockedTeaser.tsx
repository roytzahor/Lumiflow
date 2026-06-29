"use client";

import React from "react";
import { Lock } from "lucide-react";

interface LockedTeaserProps {
    /** The content rendered blurred / desaturated behind the overlay */
    children: React.ReactNode;
    /**
     * Overlay heading. Rendered with `text-balance`.
     * When `body` is also provided, styled as a bold semibold heading;
     * otherwise styled as small body-size text (matching the single-block lock cards).
     */
    title: React.ReactNode;
    /** Optional sub-copy rendered below the title. Styled with `text-pretty leading-relaxed`. */
    body?: React.ReactNode;
    /** Optional action element (e.g. a Link or button) rendered below the body / title. */
    cta?: React.ReactNode;
    /**
     * Icon node rendered inside the blue circular chip.
     * Pass `null` to suppress the chip entirely (e.g. spending-teaser variant).
     * Defaults to `<Lock className="w-4 h-4" />`.
     */
    icon?: React.ReactNode;
    /** CSS blur value applied to the children layer. Default: `"2.5px"` */
    blurAmount?: string;
    /** Tailwind width class for the glass overlay card. Default: `"w-[235px]"` */
    overlayWidthClass?: string;
    /** Extra Tailwind classes for the outermost wrapper (e.g. rounding, min-height). */
    className?: string;
}

/**
 * LockedTeaser
 *
 * Renders a "blurred content + glass overlay" teaser pattern used across the
 * Dashboard to gate features behind an action (add income, add transactions, etc.).
 *
 * Structure:
 *   <outer wrapper: relative overflow-hidden>
 *     <blurred children layer>
 *     <absolutely-centred glass card>
 *       [blue lock-icon chip]
 *       title
 *       [body]
 *       [cta]
 */
export default function LockedTeaser({
    children,
    title,
    body,
    cta,
    icon,
    blurAmount = "2.5px",
    overlayWidthClass = "w-[235px]",
    className,
}: LockedTeaserProps) {
    // Resolve the icon: undefined → default Lock; null → no chip; anything else → as-is
    const resolvedIcon: React.ReactNode =
        icon !== undefined ? icon : <Lock className="w-4 h-4" />;

    const showChip = resolvedIcon !== null && resolvedIcon !== undefined && resolvedIcon !== false;

    return (
        <div className={`relative overflow-hidden${className ? ` ${className}` : ""}`}>
            {/* Blurred / desaturated content layer */}
            <div
                className="pointer-events-none select-none opacity-90"
                style={{ filter: `blur(${blurAmount})` }}
            >
                {children}
            </div>

            {/* Glass overlay — pointer-events-none so the blurred area isn't accidentally tappable;
                the inner card re-enables pointer-events so any CTA remains interactive. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                <div
                    className={`pointer-events-auto ${overlayWidthClass} rounded-xl border border-white/20 bg-white/28 px-3 py-3 text-center shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-ios-dark-card/42`}
                >
                    {showChip && (
                        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue/15 text-ios-blue">
                            {resolvedIcon}
                        </div>
                    )}

                    {body ? (
                        <>
                            <p className="mb-1 text-sm font-semibold text-balance text-ios-text dark:text-ios-dark-text">
                                {title}
                            </p>
                            <p className="text-xs leading-relaxed text-pretty text-ios-subtle dark:text-ios-dark-subtle">
                                {body}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs leading-relaxed text-pretty text-balance text-ios-text dark:text-ios-dark-text">
                            {title}
                        </p>
                    )}

                    {cta ? <div className="mt-3">{cta}</div> : null}
                </div>
            </div>
        </div>
    );
}
