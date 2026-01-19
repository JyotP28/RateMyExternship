import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

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

export const metadata: Metadata = {
  title: {
    default: "RateMyExternship | Veterinary Externship Reviews & Salaries",
    template: "%s | RateMyExternship",
  },
  description: "The largest database of veterinary externship reviews, housing stipends, and mentorship ratings. Written by DVM students, for DVM students.",
  
  // UPDATED: This tells the browser to use your logo
  icons: {
    icon: '/logo.png', // Points to public/logo.png
    shortcut: '/logo.png',
    apple: '/logo.png', // Optional: for iPhone home screen
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
    images: [
      {
        url: '/logo.png', // Uses your logo for link previews too
        width: 800,
        height: 600,
      },
    ],
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
    <html lang="en" className="h-full w-full">
      <body className={`${inter.className} h-full w-full overscroll-none bg-slate-50 dark:bg-charcoal`}>
        {children}
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
    </html>
  );
}