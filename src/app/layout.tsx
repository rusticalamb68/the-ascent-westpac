import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import '@fontsource-variable/raleway';
import './globals.css';
import { Header, HeaderBar } from '@/components/Header';
import { ORG_NAME } from '@/content/org';

export const metadata: Metadata = {
  title: { default: `The Ascent: ${ORG_NAME} edition`, template: '%s | The Ascent' },
  description: `A SQL climbing challenge for ${ORG_NAME} Snowflake analysts. Six camps, 27 challenges, one summit.`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <body>
        <Suspense fallback={<HeaderBar />}>
          <Header />
        </Suspense>
        <main>{children}</main>
        <footer className="foot">
          <div className="foot-in">
            <span>The Ascent is run by SnowCap APAC for {ORG_NAME} staff. Not affiliated with Snowflake Inc.</span>
            <span><Link href="/rules">Rules, scoring and privacy</Link></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
