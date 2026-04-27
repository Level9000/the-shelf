import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shelf",
  description: "Voice-first AI kanban for spoken thoughts and clean execution.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/authored_by_icon_512.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/authored_by_icon_512.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full">
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
