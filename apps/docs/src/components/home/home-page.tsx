import type { Locale } from '../../lib/types'
import { getTranslation } from '../../lib/i18n'
import { Header } from './header'
import { Hero } from './hero'
import { CodeExample } from './code-example'
import { Features } from './features'
import { Footer } from './footer'

interface HomePageProps {
  locale: Locale
}

export function HomePage({ locale }: HomePageProps) {
  const t = getTranslation(locale)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header locale={locale} t={t} />
      <main className="container mx-auto px-4 py-24 text-center">
        <Hero locale={locale} t={t} />
        <CodeExample />
        <Features t={t} />
      </main>
      <Footer t={t} />
    </div>
  )
}
