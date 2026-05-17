import { Toaster } from "sonner";
import "./globals.css";
import DesktopDownloadBanner from '@/components/DesktopDownloadBanner'

export const metadata = {
  title: "Boutik",
  description: "Gestion comptable & commerciale",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">
        <DesktopDownloadBanner />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
