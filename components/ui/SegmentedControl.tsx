"use client";

export type SegmentedControlOption = {
    value: string;
    label: string;
};

interface SegmentedControlProps {
    options: SegmentedControlOption[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    className?: string;
}

export default function SegmentedControl({ options, value, onChange, ariaLabel, className }: SegmentedControlProps) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className={`segmented-control ${className ?? ""}`}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                            if (!active) onChange(option.value);
                        }}
                        className={`segmented-control-item min-w-0 active:scale-[0.96] ${
                            active ? "segmented-control-item-active" : "segmented-control-item-inactive"
                        }`}
                    >
                        <span className="truncate">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
