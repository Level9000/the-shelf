import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";

export const metadata: Metadata = {
  title: "Authored By",
  description: "AI-guided storytelling for your work, one track at a time.",
  icons: {
    icon: "/icons/authored_by_icon_512.jpg",
    shortcut: "/icons/authored_by_icon_512.jpg",
    apple: "/icons/authored_by_icon_512.jpg",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/authored_by_icon_512.jpg",
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
          href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
