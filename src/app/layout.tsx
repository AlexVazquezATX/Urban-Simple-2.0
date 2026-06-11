import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
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
        className={`${instrumentSans.variable} ${bricolage.variable} ${splineSansMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
