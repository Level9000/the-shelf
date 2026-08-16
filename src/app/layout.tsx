import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AvatarProvider } from "@/lib/avatar-context";

// Without this, mobile browsers fall back to a desktop-width layout viewport
// (Safari defaults to 980px) and scale the whole page to fit, which is why
// every screen needed a manual pinch-zoom to look right.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Social scrapers need absolute URLs. Without a metadataBase, Next emits the
  // relative path and LinkedIn, iMessage and Slack all drop the image.
  metadataBase: new URL("https://www.authoredby.app"),
  title: "Authored By",
  description: "AI-guided storytelling for your work, one chapter at a time.",
  openGraph: {
    type: "website",
    siteName: "Authored By",
    title: "Authored By",
    description: "AI-guided storytelling for your work, one chapter at a time.",
    // A JPEG at 1200x630, not the square app icon: the icon rendered as a
    // small thumbnail rather than a card, and several scrapers still don't
    // handle WebP.
    images: [
      {
        url: "/marketing/og-card.jpg",
        width: 1200,
        height: 630,
        alt: "Two iPhones on a desk showing the Goals screen and a finished chapter.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Authored By",
    description: "AI-guided storytelling for your work, one chapter at a time.",
    images: ["/marketing/og-card.jpg"],
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
