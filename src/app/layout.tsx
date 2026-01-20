import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

// --- VIEWPORT CONFIGURATION ---
// We lock scaling to prevent zoom, and use 'cover' to fill the notch area.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  title: {
    default: "RateMyExternship | Veterinary Externship Reviews & Salaries",
    template: "%s | RateMyExternship",
  },
  description: "The largest database of veterinary externship reviews, housing stipends, and mentorship ratings. Written by DVM students, for DVM students.",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  keywords: [
    "veterinary externship", 
    "vet student reviews", 
    "DVM clinical rotations", 
    "veterinary internship ratings", 
    "NAVLE prep", 
    "veterinary salary transparency"
  ],
  openGraph: {
    title: "RateMyExternship",
    description: "Find your perfect veterinary externship. Read anonymous reviews on mentorship, housing, and culture from real DVM students.",
    url: "https://ratemyexternship.com",
    siteName: "RateMyExternship",
    locale: "en_US",
    type: "website",
    images: [{ url: '/logo.png', width: 800, height: 600 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RateMyExternship",
    description: "Anonymous reviews for veterinary externships. Find the best mentorship and hands-on experience.",
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 1. ADDED 'overflow-hidden' to html to stop scrollbars
    <html lang="en" className="h-full w-full overflow-hidden">
      {/* 2. CRITICAL MOBILE FIXES on <body>:
            - 'fixed': Pins the body to the viewport (stops bounce/rubber-banding).
            - 'inset-0': Ensures it stretches to all 4 corners.
            - 'overflow-hidden': Stops the body itself from scrolling.
            - 'overscroll-none': Tells browser not to chain scroll gestures to the parent.
      */}
      <body className={`${inter.className} h-full w-full fixed inset-0 overflow-hidden overscroll-none bg-slate-50 dark:bg-charcoal touch-none`}>
        {children}
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
    </html>
  );
}