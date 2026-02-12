import type { Metadata } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BackHaus — AI Creative Studio for Restaurants",
    template: "%s — BackHaus",
  },
  description:
    "Create stunning food photography and branded content with AI. Built for restaurants and hospitality.",
  metadataBase: new URL("https://backhaus.ai"),
  openGraph: {
    type: "website",
    siteName: "BackHaus",
    title: "BackHaus — AI Creative Studio for Restaurants",
    description:
      "Create stunning food photography and branded content with AI. Built for restaurants and hospitality.",
    url: "https://backhaus.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "BackHaus — AI Creative Studio for Restaurants",
    description:
      "Create stunning food photography and branded content with AI. Built for restaurants and hospitality.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
