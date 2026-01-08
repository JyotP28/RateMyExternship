import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Import the component
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  // The 'template' allows sub-pages to have titles like "Banfield Reviews | RateMyExternship" automatically
  title: {
    default: "RateMyExternship | Veterinary Externship Reviews & Salaries",
    template: "%s | RateMyExternship",
  },
  description: "The largest database of veterinary externship reviews, housing stipends, and mentorship ratings. Written by DVM students, for DVM students.",
  
  // These keywords help Google match your site to student searches
  keywords: [
    "veterinary externship", 
    "vet student reviews", 
    "DVM clinical rotations", 
    "veterinary internship ratings", 
    "NAVLE prep", 
    "veterinary salary transparency"
  ],

  // This controls how the link looks when shared on Social Media (Facebook, Discord, LinkedIn)
  openGraph: {
    title: "RateMyExternship",
    description: "Find your perfect veterinary externship. Read anonymous reviews on mentorship, housing, and culture from real DVM students.",
    url: "https://ratemyexternship.com", // ⚠️ Update this when you buy your domain
    siteName: "RateMyExternship",
    locale: "en_US",
    type: "website",
  },

  // Twitter/X specific card data
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
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
      {/* 2. Add the component at the bottom, passing your Measurement ID */}
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
    </html>
  );
}