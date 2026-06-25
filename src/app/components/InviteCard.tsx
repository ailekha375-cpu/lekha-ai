'use client';

import Image from 'next/image';

import type { InvitePosition, InviteSample } from '../lib/inviteSamples';

const positionClasses: Record<InvitePosition, string> = {
  top: 'items-start justify-center text-center pt-[8%]',
  center: 'items-center justify-center text-center',
  left: 'items-center justify-start text-left pl-[8%]',
  right: 'items-center justify-end text-right pr-[8%]',
  bottom: 'items-end justify-center text-center pb-[10%]',
};

const boxWidth: Record<InvitePosition, string> = {
  top: 'max-w-[82%]',
  center: 'max-w-[80%]',
  left: 'max-w-[56%]',
  right: 'max-w-[56%]',
  bottom: 'max-w-[82%]',
};

export default function InviteCard({
  sample,
  priority = false,
}: {
  sample: InviteSample;
  priority?: boolean;
}) {
  const panelStyle =
    sample.panel === 'light'
      ? 'rounded-[8%] bg-white/65 px-[7%] py-[8%] backdrop-blur-[2px]'
      : sample.panel === 'dark'
        ? 'rounded-[8%] bg-black/35 px-[7%] py-[8%] backdrop-blur-[2px]'
        : '';

  return (
    <div className="@container relative aspect-[2/3] w-full overflow-hidden rounded-[20px] border border-[#eadfd2] bg-[#fffdf9] shadow-[0_24px_70px_rgba(45,24,16,0.18)]">
      <Image
        src={sample.src}
        alt={sample.alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
        className="object-cover"
      />

      <div className={`absolute inset-0 flex ${positionClasses[sample.position]}`}>
        <div className={`${boxWidth[sample.position]} ${panelStyle}`} style={{ color: sample.textColor }}>
          <p
            className="font-semibold uppercase"
            style={{ fontSize: '3.1cqw', letterSpacing: '0.3em', color: sample.eyebrowColor }}
          >
            {sample.eyebrow}
          </p>
          <h3
            className="mt-[3%]"
            style={{ fontFamily: 'Kaivalya, serif', fontSize: '9cqw', lineHeight: 1.05 }}
          >
            {sample.title}
          </h3>
          <p className="mt-[3%] italic" style={{ fontSize: '3.4cqw', lineHeight: 1.4 }}>
            {sample.subtitle}
          </p>
          <div className="mt-[6%]" style={{ fontSize: '3.2cqw', lineHeight: 1.6 }}>
            <p>{sample.line1}</p>
            <p>{sample.line2}</p>
          </div>
          <p className="mt-[6%] uppercase" style={{ fontSize: '2.7cqw', letterSpacing: '0.2em' }}>
            {sample.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
