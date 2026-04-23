import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shelf",
  description: "Voice-first AI kanban for spoken thoughts and clean execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
