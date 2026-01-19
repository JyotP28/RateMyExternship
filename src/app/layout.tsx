import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Import the component
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

// --- 1. NEW VIEWPORT CONFIGURATION (Fixes Notch & Zoom) ---
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents input zoom
  viewportFit: "cover", // Extends content behind the notch
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
  },

  twitter: {
    card: "summary_large_image",
    title: "RateMyExternship",
    description: "Anonymous reviews for veterinary externships. Find the best mentorship and hands-on experience.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. Added h-full, w-full, and overscroll-none to lock the body
    <html lang="en" className="h-full w-full">
      <body className={`${inter.className} h-full w-full overscroll-none bg-slate-50 dark:bg-charcoal`}>
        {children}
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
    </html>
  );
}