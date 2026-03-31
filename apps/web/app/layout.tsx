import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skillcoin - Infrastructure for Agentic Coding",
  description:
    "Skillcoin generates IDE-native context filesystems for Cursor, Claude Code, and agentic coding workflows, with reusable skills stored on Filecoin.",
  keywords: [
    "AI",
    "skills",
    "marketplace",
    "Filecoin",
    "decentralized",
    "npm",
    "agents",
    "cursor",
    "claude code",
    "agentic coding",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-white antialiased">
        {children}
      </body>
    </html>
  );
}
