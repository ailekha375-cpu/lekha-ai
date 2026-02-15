'use client';

import Header from './components/Header';
import TemplateCarousel from './components/TemplateCarousel';
import AISection from './components/AISection';
import Footer from './components/Footer';
import BackgroundPoppers from './components/BackgroundPoppers';
import { useAuth } from './lib/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/success');
    }
  }, [user, router]);

  if (user) {
    // Optionally render nothing or a loading spinner while redirecting
    return null;
  }

  return (
    <>
      <BackgroundPoppers />
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col justify-center items-center w-full px-2 sm:px-6 lg:px-8">
          <TemplateCarousel />
        </div>
      </main>
      <AISection />
      <Footer />
    </>
  );
}
