'use client';

import Header from '../components/Header';
import TemplateCarousel from '../components/TemplateCarousel';
import AISection from '../components/AISection';
import Footer from '../components/Footer';
import BackgroundPoppers from '../components/BackgroundPoppers';

export default function SuccessPage() {
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
