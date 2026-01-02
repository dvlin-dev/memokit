import type { Locale } from '../../lib/types'
import { getDocsPath } from '../../lib/config'
import type { TranslationKeys } from '../../lib/i18n'

interface HeroProps {
  locale: Locale
  t: Record<TranslationKeys, string>
}

export function Hero({ locale, t }: HeroProps) {
  const docsPath = getDocsPath(locale)

  return (
    <>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        {t.heroTitle1}
        <br />
        <span className="text-primary">{t.heroTitle2}</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
        {t.heroDescription}
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <a
          href={docsPath}
          className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
        >
          {t.getStarted}
        </a>
        <a
          href={`${docsPath}/api-reference`}
          className="border px-6 py-3 font-medium hover:bg-muted transition-colors"
        >
          {t.viewApi}
        </a>
      </div>
    </>
  )
}
