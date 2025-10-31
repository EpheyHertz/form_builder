import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "./components/SiteHeader";
import { ThemeProvider } from "./components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow Studio | Intelligent Form Builder",
  description:
    "Design, customize, and collect stunning form responses with adaptive themes, instant previews, and deep insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
  <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="relative min-h-screen overflow-hidden theme-text-primary">
            <div className="pointer-events-none absolute inset-0 theme-gradient-background" />
            <div
              className="pointer-events-none absolute inset-x-0 top-32 h-[420px] blur-3xl"
              style={{ backgroundImage: "var(--gradient-focal)", opacity: 0.85 }}
            />
            <div className="relative z-10 flex min-h-screen flex-col">
              <SiteHeader />
              <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-8 lg:px-10">
                {children}
              </main>
              <footer className="theme-footer-surface theme-text-muted border-t theme-border-subtle py-6 text-center text-xs uppercase tracking-[0.32em]">
                Crafted for immersive form experiences • Flow Studio © {new Date().getFullYear()}
              </footer>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
