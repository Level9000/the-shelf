import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AvatarProvider } from "@/lib/avatar-context";

export const metadata: Metadata = {
  title: "Authored By",
  description: "AI-guided storytelling for your work, one chapter at a time.",
  openGraph: {
    title: "Authored By",
    description: "AI-guided storytelling for your work, one chapter at a time.",
    images: [{ url: "/icons/authored_by_app_icon_square.png" }],
  },
  icons: {
    icon: [
      { url: "/icons/authored_by_app_icon_square.png", type: "image/png" },
    ],
    shortcut: "/icons/authored_by_app_icon_square.png",
    apple: "/icons/authored_by_app_icon_square.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/authored_by_app_icon_square.png",
      },
    ],
  },
  other: {
    "msapplication-TileImage": "/icons/authored_by_app_icon_square.png",
    "msapplication-TileColor": "#1a0e00",
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
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('shelf-theme')||'dark';document.documentElement.setAttribute('data-theme',t);if(!localStorage.getItem('shelf-theme'))localStorage.setItem('shelf-theme','dark');}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Lora:ital,wght@0,400;0,500;1,400&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--ink)] antialiased">
        <ThemeProvider>
          <AvatarProvider>{children}</AvatarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
