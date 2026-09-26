// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import LocaleSync from '@/components/ui/LocaleSync'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-sans' })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common')
  const appName = t('appName')
  return {
    title: { default: appName, template: `%s | ${appName}` },
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <LocaleSync />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
