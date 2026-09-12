import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

import SmoothScroll from "@/components/providers/SmoothScroll";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://monecoleenligne.vercel.app"),
  title: {
    default: "Mon École en Live — École en ligne gratuite et interactive",
    template: "%s | Mon École en Live",
  },
  description:
    "Plateforme éducative française en direct : visioconférences interactives, devoirs en ligne, suivi des présences et espace parents-élèves.",
  keywords: [
    "école en ligne",
    "cours en direct",
    "soutien scolaire",
    "visioconférence jitsi",
    "collège en ligne",
    "lycée en ligne",
    "Mon École en Live",
  ],
  authors: [{ name: "Mon École en Live" }],
  creator: "Mon École en Live",
  publisher: "Mon École en Live",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://monecoleenligne.vercel.app",
    title: "Mon École en Live — École en ligne gratuite et interactive",
    description:
      "Plateforme éducative française en direct avec visioconférences, devoirs et suivi des présences.",
    siteName: "Mon École en Live",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Mon École en Live Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mon École en Live",
    description:
      "Plateforme scolaire en direct avec visioconférences interactives, devoirs et suivi des notes.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${nunito.variable} antialiased scroll-smooth`}>
      <body className="min-h-screen flex flex-col font-sans bg-blue-vlight text-navy relative overflow-x-hidden">
        <div className="noise-overlay"></div>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
