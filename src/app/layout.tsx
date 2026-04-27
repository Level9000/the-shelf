import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const futura = localFont({
  src: "../../public/fonts/Futura.ttf",
  display: "swap",
  variable: "--font-body",
  fallback: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

const literata = localFont({
  src: "../../public/fonts/Literata.ttf",
  display: "swap",
  variable: "--font-heading",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${futura.variable} ${literata.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
