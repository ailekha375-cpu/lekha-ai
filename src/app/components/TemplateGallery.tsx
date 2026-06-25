'use client';

import { motion } from 'framer-motion';

import InviteCard from './InviteCard';
import { galleryInvites } from '../lib/inviteSamples';

export default function TemplateGallery() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3">
      {galleryInvites.map((sample, index) => (
        <motion.div
          key={sample.id}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: (index % 3) * 0.08 }}
          whileHover={{ y: -6 }}
          className="group"
        >
          <InviteCard sample={sample} />
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7a56]">
            {sample.occasion}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
