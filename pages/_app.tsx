import type { AppProps } from "next/app"
import { Inter as FontSans } from "@next/font/google"
import { ThemeProvider } from "next-themes"

import "@/styles/globals.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  // @ts-ignore
  const getLayout = Component.getLayout || ((page) => page)
  return (
    <>
      <style jsx global>{`
				:root {
					--font-sans: ${fontSans.style.fontFamily};
				}
			}`}</style>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {getLayout(<Component {...pageProps} />)}
        </ThemeProvider>
      </QueryClientProvider>
    </>
  )
}
