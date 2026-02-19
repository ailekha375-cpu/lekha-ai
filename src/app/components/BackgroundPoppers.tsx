import React, { useState, useEffect } from 'react';

const pastelColors = [
  'rgba(211, 211, 211, 0.55)', // light gray
  'rgba(210, 180, 140, 0.55)', // timberwolf
  'rgba(229, 228, 226, 0.55)', // platinum
  'rgba(200, 200, 200, 0.55)', // medium light gray
  'rgba(220, 200, 160, 0.55)', // light timberwolf
  'rgba(240, 240, 240, 0.55)', // very light gray
  'rgba(190, 170, 130, 0.55)', // darker timberwolf
  'rgba(235, 235, 235, 0.55)', // light platinum
];

function getPopperProps(i: number) {
  const isBubble = i % 2 === 0;
  const size = isBubble ? 40 + Math.random() * 40 : 24 + Math.random() * 24;
  const left = Math.random() * 100;
  const delay = Math.random() * 6;
  const duration = 10 + Math.random() * 8;
  const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
  const rotate = isBubble ? 0 : Math.random() * 360;
  const drift = isBubble ? 0 : (Math.random() - 0.5) * 40; // horizontal drift for confetti
  return { isBubble, size, left, delay, duration, color, rotate, drift };
}

export default function BackgroundPoppers() {
  const [poppers, setPoppers] = useState<Array<ReturnType<typeof getPopperProps>>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const generatedPoppers = [...Array(32)].map((_, i) => getPopperProps(i));
    setPoppers(generatedPoppers);
  }, []);

  if (!isClient) {
    return null; // Don't render anything on server side
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {poppers.map((popper, i) => {
        const { isBubble, size, left, delay, duration, color, rotate } = popper;
        return isBubble ? (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: '-60px',
              background: color,
              filter: 'blur(0.5px)',
              animation: `popper-bubble ${duration}s linear ${delay}s infinite`,
              opacity: 0.8,
            }}
          />
        ) : (
          <span
            key={i}
            className="absolute"
            style={{
              width: size * 1.8,
              height: size * 0.6,
              left: `${left}%`,
              bottom: '-40px',
              background: color,
              borderRadius: '6px',
              transform: `rotate(${rotate}deg)`,
              animation: `popper-confetti-${i} ${duration}s linear ${delay}s infinite`,
              opacity: 0.75,
            }}
          />
        );
      })}
      <style jsx global>{`
        @keyframes popper-bubble {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          80% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-90vh) scale(1.15);
            opacity: 0;
          }
        }
        ${poppers.map((popper, i) => {
          // Each confetti gets its own keyframes for unique drift/rotation
          const { drift, rotate } = popper;
          return `@keyframes popper-confetti-${i} {
            0% {
              transform: translateY(0) translateX(0) rotate(${rotate}deg) scale(1);
              opacity: 0.75;
            }
            80% {
              opacity: 0.75;
            }
            100% {
              transform: translateY(-100vh) translateX(${drift}px) rotate(${rotate + 90}deg) scale(1.1);
              opacity: 0;
            }
          }`;
        }).join('\n')}
      `}</style>
    </div>
  );
} 