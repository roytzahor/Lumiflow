"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const AUTO_RECOVERY_KEY = "lumiflow:auto-recovery-once";

function shouldAutoRecover(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("module_not_found") ||
    normalized.includes("cannot find module") ||
    normalized.includes("failed to fetch dynamically imported module")
  );
}

export default function AppRuntimeGuard() {
  useEffect(() => {
    const recoverOnce = () => {
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem(AUTO_RECOVERY_KEY) === "1") {
        toast.error("זוהתה תקלה טכנית. נסו לרענן ידנית אם זה נמשך.");
        return;
      }
      sessionStorage.setItem(AUTO_RECOVERY_KEY, "1");
      toast.info("זוהתה תקלה זמנית, מרעננים אוטומטית...");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || String(event.error || "");
      if (shouldAutoRecover(message)) {
        event.preventDefault();
        recoverOnce();
      } else {
        console.error("Unhandled window error", { message, error: event.error });
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || JSON.stringify(reason ?? "unknown rejection");

      if (shouldAutoRecover(message)) {
        event.preventDefault();
        recoverOnce();
      } else {
        console.error("Unhandled promise rejection", { reason });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
