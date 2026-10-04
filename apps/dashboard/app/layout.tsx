import type { Metadata } from 'next';

import { Providers } from '@/components/Providers';

import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';

export const metadata: Metadata = {
  title: 'Terading — Control Surface',
  description:
    'Read-mostly viewer and rule editor for the on-chain policy kernel. The kernel decides; this shows the receipts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
