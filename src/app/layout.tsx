import type { Metadata } from 'next';
import './globals.css';
import { ModalProvider } from './components/ModalContext';
import ClientModals from './components/ClientModals';

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
      <body className="antialiased">
        <ModalProvider>
          <div className="relative z-10">
            {children}
          </div>
          <ClientModals />
        </ModalProvider>
      </body>
    </html>
  );
}
