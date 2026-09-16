"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card p-8">
        <h1 className="mb-2 text-xl font-bold text-foreground">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary text-sm">
            Try again
          </button>
          <Link href="/skills" className="btn-secondary text-sm">
            Back to skills
          </Link>
        </div>
      </div>
    </div>
  );
}
