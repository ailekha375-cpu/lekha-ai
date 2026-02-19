'use client';

import { useState, useEffect } from 'react';

const pastelColors = [
  'rgba(211, 211, 211, 0.55)',
  'rgba(210, 180, 140, 0.55)',
  'rgba(229, 228, 226, 0.55)',
  'rgba(200, 200, 200, 0.55)',
  'rgba(220, 200, 160, 0.55)',
  'rgba(240, 240, 240, 0.55)',
  'rgba(190, 170, 130, 0.55)',
  'rgba(235, 235, 235, 0.55)',
];

function getPopperProps(i: number) {
  const isBubble = i % 2 === 0;
  const size = isBubble ? 32 + Math.random() * 32 : 18 + Math.random() * 18;
  const left = Math.random() * 100;
  const delay = Math.random() * 5;
  const duration = 8 + Math.random() * 6;
  const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
  const rotate = isBubble ? 0 : Math.random() * 360;
  const drift = isBubble ? 0 : (Math.random() - 0.5) * 30;
  return { isBubble, size, left, delay, duration, color, rotate, drift };
}

export default function ChatPanelPoppers() {
  const [poppers, setPoppers] = useState<Array<ReturnType<typeof getPopperProps>>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setPoppers([...Array(24)].map((_, i) => getPopperProps(i)));
  }, []);

  if (!isClient || poppers.length === 0) return null;

  const bubbleKeyframes = `@keyframes chat-popper-bubble {
    0% { transform: translateY(0) scale(1); opacity: 0.8; }
    80% { opacity: 0.8; }
    100% { transform: translateY(-100vh) scale(1.15); opacity: 0; }
  }`;
  const confettiKeyframes = poppers
    .map((popper, i) => {
      const { drift, rotate } = popper;
      return `@keyframes chat-popper-confetti-${i} {
        0% { transform: translateY(0) translateX(0) rotate(${rotate}deg) scale(1); opacity: 0.75; }
        80% { opacity: 0.75; }
        100% { transform: translateY(-100vh) translateX(${drift}px) rotate(${rotate + 90}deg) scale(1.1); opacity: 0; }
      }`;
    })
    .join('\n');

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
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
                bottom: '-40px',
                background: color,
                filter: 'blur(0.5px)',
                animation: `chat-popper-bubble ${duration}s linear ${delay}s infinite`,
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
                bottom: '-30px',
                background: color,
                borderRadius: '6px',
                transform: `rotate(${rotate}deg)`,
                animation: `chat-popper-confetti-${i} ${duration}s linear ${delay}s infinite`,
                opacity: 0.75,
              }}
            />
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: bubbleKeyframes + '\n' + confettiKeyframes }} />
    </>
  );
}
