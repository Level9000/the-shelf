import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";

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
    <html lang="en" data-scroll-behavior="smooth" className="h-full" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('shelf-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
