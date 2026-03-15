"use client";

import { useEffect } from "react";

/**
 * FE-03: Root error boundary for the Next.js app.
 * Catches unhandled React errors and shows a friendly fallback UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Skillcoin] Unhandled error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#0a0a12",
            color: "#e0e0ff",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              padding: "2rem",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p
              style={{
                color: "rgba(224,224,255,0.6)",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              An unexpected error occurred. Please try again.
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre
                style={{
                  fontSize: "0.75rem",
                  color: "#ff6b6b",
                  background: "rgba(255,100,100,0.08)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  textAlign: "left",
                  overflowX: "auto",
                  marginBottom: "1.5rem",
                  maxHeight: "200px",
                }}
              >
                {error.message}
              </pre>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
