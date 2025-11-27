import Script from "next/script";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Website Scraper - Real-Time Transparency Dashboard",
  description: "Monitor scraping jobs with live progress, logs, and cost tracking",
};

const themeInitScript = `(() => {
  try {
    const storageKey = 'theme';
    const defaultTheme = 'dark';
    const stored = localStorage.getItem(storageKey);
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || defaultTheme;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    const root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  } catch (error) {
    // If anything fails (e.g., localStorage is unavailable), fall back to light to avoid blocking render
    document.documentElement.classList.remove('dark');
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <QueryProvider>
          <ThemeProvider defaultTheme="dark" storageKey="theme">
            <AppShell>
              {children}
            </AppShell>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
