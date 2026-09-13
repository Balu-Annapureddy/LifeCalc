import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdSlot } from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'LifeCalc — Your numbers. Your decisions.',
  description: 'Universal calculator and personal decision-support platform for loans, investments, salary, education, purchases, and everyday calculations.',
  keywords: ['calculator', 'emi calculator', 'sip calculator', 'salary calculator', 'cgpa to percentage', 'can i afford this', 'fuel cost'],
  authors: [{ name: 'LifeCalc Team' }],
  metadataBase: new URL('https://lifecalc.in'),
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://lifecalc.in',
    title: 'LifeCalc — Your numbers. Your decisions.',
    description: 'Accurate financial, student, and personal decision calculations.',
    siteName: 'LifeCalc',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
        <Header />

        {/* 3-Column Desktop Side-Rail Container */}
        <div className="flex-1 flex justify-center w-full max-w-[1680px] mx-auto px-2 sm:px-4">
          {/* Left Side Rail Ad */}
          <AdSlot slot="desktop_side_rail_left" />

          {/* Main Application Content Area */}
          <main className="flex-1 w-full max-w-5xl py-6 md:py-8 px-2 sm:px-6">
            {children}
          </main>

          {/* Right Side Rail Ad */}
          <AdSlot slot="desktop_side_rail_right" />
        </div>

        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
