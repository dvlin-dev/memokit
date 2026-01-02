import { siteConfig } from '../../lib/config'
import type { TranslationKeys } from '../../lib/i18n'

interface FooterProps {
  t: Record<TranslationKeys, string>
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="border-t py-8 mt-24">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. {t.footerCopyright}
      </div>
    </footer>
  )
}
