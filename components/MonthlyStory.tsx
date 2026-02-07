"use client";

// MonthlyStory has been replaced by inline summary in Dashboard.
// This component is kept as a no-op for backwards compatibility.

interface MonthlyStoryProps {
    monthlyIncome: number;
    savedSoFar: number;
    savingsPercent: number;
    totalSpent: number;
    topCategoryName?: string;
    topCategoryAmount?: number;
}

export default function MonthlyStory(_props: MonthlyStoryProps) {
    return null;
}
