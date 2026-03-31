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
    default: "Urban Simple | Commercial Cleaning Services in Austin, TX",
    template: "%s | Urban Simple",
  },
  description:
    "Premier commercial kitchen cleaning and hospitality cleaning services in Austin, TX. Hotels, restaurants, and event venues. Trusted by 500+ hospitality brands.",
  metadataBase: new URL("https://urbansimple.net"),
  openGraph: {
    type: "website",
    siteName: "Urban Simple",
    title: "Urban Simple | Commercial Cleaning Services in Austin, TX",
    description:
      "Premier commercial kitchen cleaning and hospitality cleaning services in Austin, TX. Hotels, restaurants, and event venues. Trusted by 500+ hospitality brands.",
    url: "https://urbansimple.net",
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Simple | Commercial Cleaning Services in Austin, TX",
    description:
      "Premier commercial kitchen cleaning and hospitality cleaning services in Austin, TX. Hotels, restaurants, and event venues. Trusted by 500+ hospitality brands.",
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
