"use client";

import {
  getInsightsAdvancedAnalysis,
  getInsightsBasicAnalysis,
  getPremiumMockStatus,
  setPremiumMockStatus,
} from "@/app/actions";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InsightSection = {
  title: string;
  lines: string[];
};

function parseInsightSections(raw: string): InsightSection[] {
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;

  lines.forEach((line) => {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace("## ", ""), lines: [] };
      return;
    }
    if (!current) current = { title: "תובנות", lines: [] };
    current.lines.push(line);
  });

  if (current) sections.push(current);
  return sections;
}

function AnalysisCard({ title, text }: { title: string; text: string }) {
  const sections = parseInsightSections(text);
  return (
    <article className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl p-4">
      <h3 className="text-sm font-bold mb-3 text-ios-text dark:text-ios-dark-text">{title}</h3>
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <section key={`${section.title}-${idx}`} className="space-y-1">
            <h4 className="text-xs font-semibold text-ios-indigo dark:text-ios-blue">{section.title}</h4>
            <div className="space-y-1">
              {section.lines.map((line, lineIdx) => (
                <p key={`${line}-${lineIdx}`} className="text-sm leading-relaxed text-ios-text dark:text-ios-dark-text">
                  {line.startsWith("-") ? `• ${line.replace(/^-+\s*/, "")}` : line}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export default function InsightsAI() {
  const [isPremiumMock, setIsPremiumMock] = useState(false);
  const [loadingPremiumStatus, setLoadingPremiumStatus] = useState(true);
  const [updatingPremiumStatus, setUpdatingPremiumStatus] = useState(false);
  const [loadingBasic, setLoadingBasic] = useState(false);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [basicAnalysis, setBasicAnalysis] = useState("");
  const [advancedAnalysis, setAdvancedAnalysis] = useState("");

  useEffect(() => {
    getPremiumMockStatus().then((res) => {
      setLoadingPremiumStatus(false);
      if (!res.success) {
        toast.error("טעינת סטטוס פרימיום נכשלה");
        return;
      }
      setIsPremiumMock(res.isPremiumMock);
    });
  }, []);

  const runBasic = async () => {
    setLoadingBasic(true);
    const res = await getInsightsBasicAnalysis();
    setLoadingBasic(false);
    if (!res.success) {
      toast.error(res.error ?? "ניתוח בסיסי נכשל");
      return;
    }
    setBasicAnalysis(res.analysis ?? "");
  };

  const runAdvanced = async () => {
    if (!isPremiumMock) return;
    setLoadingAdvanced(true);
    const res = await getInsightsAdvancedAnalysis();
    setLoadingAdvanced(false);
    if (!res.success) {
      toast.error(res.error ?? "ניתוח מתקדם נכשל");
      return;
    }
    setAdvancedAnalysis(res.analysis ?? "");
  };

  const togglePremiumMock = async (enabled: boolean) => {
    if (updatingPremiumStatus) return;
    const previous = isPremiumMock;
    setIsPremiumMock(enabled);
    setUpdatingPremiumStatus(true);
    const res = await setPremiumMockStatus(enabled);
    setUpdatingPremiumStatus(false);
    if (!res.success) {
      setIsPremiumMock(previous);
      toast.error(res.error ?? "עדכון מצב פרימיום נכשל");
      return;
    }
    toast.success(enabled ? "פרימיום דמו הופעל לחשבון" : "פרימיום דמו כובה לחשבון");
  };

  return (
    <section className="bg-ios-card dark:bg-ios-dark-card rounded-3xl p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ios-text dark:text-ios-dark-text">ניתוח AI</h2>
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mt-1">
            Gemini מנתח את הנתונים ומציע תובנות מעשיות.
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-ios-indigo shrink-0 mt-0.5" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={runBasic}
          disabled={loadingBasic}
          className="w-full py-2.5 rounded-xl bg-ios-blue text-white text-sm font-semibold disabled:opacity-60"
        >
          {loadingBasic ? "מנתח..." : "ניתוח בסיסי (חודשי)"}
        </button>

        <button
          onClick={runAdvanced}
          disabled={!isPremiumMock || loadingAdvanced}
          className="w-full py-2.5 rounded-xl bg-ios-indigo text-white text-sm font-semibold disabled:opacity-40"
        >
          {loadingAdvanced ? "מנתח עומק..." : "ניתוח מתקדם (פרימיום)"}
        </button>
      </div>

      {!isPremiumMock && (
        <div className="bg-ios-gray-6 dark:bg-ios-dark-fill rounded-xl p-3">
          <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle mb-2">
            {loadingPremiumStatus
              ? "טוען סטטוס פרימיום..."
              : "מצב פרימיום מדומה לא פעיל. לצורך הפיתוח ניתן להפעיל אותו ידנית."}
          </p>
          <button
            onClick={() => togglePremiumMock(true)}
            disabled={loadingPremiumStatus || updatingPremiumStatus}
            className="w-full py-2 rounded-lg bg-white dark:bg-ios-dark-card text-sm font-semibold text-ios-text dark:text-ios-dark-text disabled:opacity-50"
          >
            {updatingPremiumStatus ? "שומר..." : "הפעל פרימיום דמו"}
          </button>
        </div>
      )}

      {isPremiumMock && (
        <button
          onClick={() => togglePremiumMock(false)}
          disabled={updatingPremiumStatus}
          className="w-full py-2 rounded-xl bg-ios-gray-6 dark:bg-ios-dark-fill text-sm text-ios-text dark:text-ios-dark-text disabled:opacity-50"
        >
          {updatingPremiumStatus ? "שומר..." : "כבה פרימיום דמו"}
        </button>
      )}

      {basicAnalysis && (
        <AnalysisCard title="תוצאות בסיסיות" text={basicAnalysis} />
      )}

      {advancedAnalysis && (
        <AnalysisCard title="תוצאות מתקדמות (פרימיום)" text={advancedAnalysis} />
      )}
    </section>
  );
}
