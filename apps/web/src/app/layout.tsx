import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nexus ERP — Enterprise Business Platform',
    template: '%s | Nexus ERP',
  },
  description: 'AI-Powered Enterprise SaaS Platform for Sales, Inventory, Invoicing & Business Intelligence',
  keywords: ['ERP', 'POS', 'SaaS', 'Inventory', 'AI', 'Sales', 'Invoicing', 'CRM'],
  authors: [{ name: 'Nexus ERP' }],
  creator: 'Nexus ERP',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    title: 'Nexus ERP',
    description: 'AI-Powered Enterprise Business Platform',
    siteName: 'Nexus ERP',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica dark mode antes de la hidratación de React para evitar flash blanco */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexus-theme');var d=document.documentElement;d.classList.remove('light','dark');if(t==='light'){d.classList.add('light');d.style.colorScheme='light'}else{d.classList.add('dark');d.style.colorScheme='dark'}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: 'nexus-card border-border',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
