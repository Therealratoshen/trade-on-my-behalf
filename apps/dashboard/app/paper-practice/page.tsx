import type { Metadata } from 'next';

import { PaperPractice } from '@/components/PaperPractice';
import '@/components/paper-practice.css';

export const metadata: Metadata = {
  title: 'Terading — Paper Practice',
  description: 'A local-only paper-practice concept with fictional market fixtures. No wallet signatures, venue orders, saved positions, or PnL.',
  openGraph: {
    title: 'Terading — Paper Practice',
    description: 'Fictional sample fixtures and local-only scenario calculations. No wallet signatures or venue orders.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Terading — Paper Practice',
    description: 'Fictional sample fixtures and local-only scenario calculations.',
  },
};

export default function PaperPracticePage() {
  return <PaperPractice />;
}
