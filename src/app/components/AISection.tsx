'use client';

import { useRouter } from 'next/navigation';
import { useModal } from './ModalContext';
import { useAuth } from '../lib/useAuth';

export default function AISection() {
  const router = useRouter();
  const { setShowModal } = useModal();
  const user = useAuth();

  const handleTryAI = () => {
    if (user) {
      router.push('/chat');
    } else {
      setShowModal(true);
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold text-gray-800 leading-tight">
                AI-Powered Invitation Creation
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Experience the future of invitation design with our intelligent AI assistant. 
                Simply describe your event, and watch as our AI creates stunning, personalized 
                invitations in seconds.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-black mb-1">
                    Describe Your Event
                  </h3>
                  <p className="text-black leading-relaxed">
                    Tell our AI about your event type, theme, and preferences in natural language.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-black mb-1">
                    AI Generates Design
                  </h3>
                  <p className="text-black leading-relaxed">
                    Our advanced AI creates multiple design options tailored to your specifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-black mb-1">
                    Customize & Send
                  </h3>
                  <p className="text-black leading-relaxed">
                    Fine-tune the design and send beautiful invitations to your guests instantly.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTryAI}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-gray-300 to-gray-400 text-black font-semibold rounded-full hover:from-gray-400 hover:to-gray-500 transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
              >
                Try AI Now
                <svg
                  className="ml-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-black text-lg">🤖</span>
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-xs">
                    <p className="text-black text-sm">
                      {`"I'd like to create a wedding invitation with a rustic theme..."`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 justify-end">
                  <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl px-4 py-3 max-w-xs">
                    <p className="text-black text-sm">
                      {`"Perfect! I've created 3 rustic wedding invitation designs for you to choose from."`}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-black text-lg">✨</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl mb-2">💒</div>
                    <h4 className="font-semibold text-black mb-1">Rustic Wedding Invitation</h4>
                    <p className="text-sm text-black">Elegant design with natural elements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
} 