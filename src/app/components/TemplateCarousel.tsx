'use client';

import { useState, useEffect } from 'react';

const templates = [
  {
    id: 1,
    title: 'Wedding Invitation',
    description: 'Elegant wedding invitation template with floral design',
    color: 'from-gray-200 to-gray-300',
    icon: '💒',
    background: "url('/wedding.svg')",
  },
  {
    id: 2,
    title: 'Birthday Party',
    description: 'Fun and colorful birthday celebration template',
    color: 'from-gray-300 to-gray-400',
    icon: '🎉',
    background: "url('/birthday.svg')",
  },
  {
    id: 3,
    title: 'Corporate Event',
    description: 'Professional business event invitation template',
    color: 'from-gray-400 to-gray-500',
    icon: '🏢',
    background: "url('/corporate.svg')",
  },
  {
    id: 4,
    title: 'Baby Shower',
    description: 'Sweet and adorable baby shower invitation',
    color: 'from-gray-500 to-gray-600',
    icon: '👶',
    background: "url('/baby.svg')",
  },
];

export default function TemplateCarousel() {
  const [currentTemplate, setCurrentTemplate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTemplate((prev) => (prev + 1) % templates.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-2 sm:mb-4 leading-tight">
            Beautiful Invitation Templates
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Choose from our collection of professionally designed templates for any occasion
          </p>
        </div>
      </div>
      <div className="relative h-64 sm:h-80 md:h-96 w-[80vw] max-w-none mx-auto my-2 sm:my-4 md:my-6">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentTemplate
                ? 'opacity-100 scale-100 z-10'
                : 'opacity-0 scale-95 z-0'
            }`}
          >
            <div
              className={`h-full w-full rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-center items-center bg-gradient-to-br ${template.color}`}
            >
              {/* Content overlay */}
              <div className="relative z-20 flex flex-col items-center justify-center h-full w-full">
                <div className="text-6xl mb-6 drop-shadow-lg">{template.icon}</div>
                <h3 className="text-4xl font-bold mb-4 drop-shadow-lg text-black">{template.title}</h3>
                <p className="text-lg text-center max-w-md opacity-95 mb-6 drop-shadow-lg text-black leading-relaxed">
                  {template.description}
                </p>
                <button className="mt-2 bg-white/80 backdrop-blur-sm px-8 py-3 rounded-full font-semibold hover:bg-white/90 text-black text-base shadow-lg">
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Dots indicator */}
      <div className="flex justify-center mt-4 space-x-3">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentTemplate(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentTemplate
                ? 'bg-gray-600'
                : 'bg-gray-400 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </section>
  );
} 