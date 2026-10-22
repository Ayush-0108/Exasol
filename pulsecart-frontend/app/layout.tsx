import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

export const metadata: Metadata = {
  title: 'PulseCart — B2B Quick-Commerce Operator Intelligence',
  description: 'Unify identity, inventory, churn risk, and returns protection into one real-time operator dashboard powered by Exasol.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100 min-h-[100dvh] flex flex-col selection:bg-emerald-950 selection:text-emerald-300">
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" richColors theme="dark" />
        </TooltipProvider>
      </body>
    </html>
  )
}
