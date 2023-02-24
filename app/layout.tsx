import { Inter as FontSans } from "@next/font/google"
import type { Metadata } from 'next';

import "@/styles/globals.css"
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import ReactQueryWrapper from "./reactQueryWrapper"
import { siteConfig } from '@/config/site';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head ><title></title></head>
      <body
        className={cn(
          "min-h-screen bg-white font-sans font-semibold text-sm text-slate-600 antialiased dark:bg-slate-900 dark:text-slate-50",
          fontSans.variable
        )}
      >
        <ReactQueryWrapper>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <div className="container flex-1">{children}</div>
            </div>
            <TailwindIndicator />
          </ThemeProvider>
        </ReactQueryWrapper>
      </body>
    </html>
  )
}
