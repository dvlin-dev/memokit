import type { Locale } from '../../lib/types'
import { siteConfig, getDocsPath } from '../../lib/config'
import type { TranslationKeys } from '../../lib/i18n'

interface HeaderProps {
  locale: Locale
  t: Record<TranslationKeys, string>
}

export function Header({ locale, t }: HeaderProps) {
  const isZh = locale === 'zh'
  const docsPath = getDocsPath(locale)

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="font-semibold text-xl">
          {siteConfig.name}
        </a>
        <nav className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a
              href="/"
              className={`hover:text-foreground transition-colors ${!isZh ? 'text-foreground font-medium' : ''}`}
            >
              EN
            </a>
            <a
              href="/zh"
              className={`hover:text-foreground transition-colors ${isZh ? 'text-foreground font-medium' : ''}`}
            >
              中文
            </a>
          </div>
          <a
            href={docsPath}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.navDocs}
          </a>
          <a
            href={siteConfig.console}
            className="text-sm bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            {t.navConsole}
          </a>
        </nav>
      </div>
    </header>
  )
}
