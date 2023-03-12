import type { AppProps } from "next/app"
import { Inter as FontSans } from "@next/font/google"
import { ThemeProvider } from "next-themes"

import "@/styles/globals.css"
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})



export default function App({ Component, pageProps }: AppProps) {
  // @ts-ignore
  const getLayout = Component.getLayout || ((page) => page)
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 60 * 24,
        retry: 1,
      },
    },
  }))
  return (
    <>
      <style jsx global>{`
				:root {
					--font-sans: ${fontSans.style.fontFamily};
				}
			}`}</style>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {getLayout(<Component {...pageProps} />)}
          </ThemeProvider>
        </Hydrate>
      </QueryClientProvider>
    </>
  )
}
