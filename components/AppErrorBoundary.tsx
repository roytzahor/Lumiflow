"use client";

import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected application error",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App runtime error boundary caught error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg flex items-center justify-center px-5 transition-colors">
        <section className="w-full max-w-md bg-ios-card dark:bg-ios-dark-card rounded-2xl shadow-card p-6 space-y-3">
          <h1 className="text-xl font-bold text-ios-text dark:text-ios-dark-text">אירעה תקלה לא צפויה</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle">
            טענו מחדש את המסך וננסה לשחזר אוטומטית את מצב העבודה.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="text-xs text-ios-subtle dark:text-ios-dark-subtle break-all">{this.state.message}</p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="w-full py-3 rounded-xl bg-ios-blue text-white font-semibold"
          >
            טען מחדש
          </button>
        </section>
      </main>
    );
  }
}
