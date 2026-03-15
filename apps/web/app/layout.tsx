import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skillcoin — npm for AI Agent Skills",
  description:
    "Decentralized marketplace for AI Agent Skills. Publish, discover, and install reusable AI workflows stored permanently on Filecoin.",
  keywords: ["AI", "skills", "marketplace", "Filecoin", "decentralized", "npm", "agents"],
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
