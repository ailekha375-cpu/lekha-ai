import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "./components/ModalContext";
import ClientModals from "./components/ClientModals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lekha - Beautiful AI-Powered Invitations",
  description: "Create stunning invitations with our AI-powered platform. Choose from beautiful templates or let our AI design custom invitations for your special events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ModalProvider>
          <ClientModals />
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
