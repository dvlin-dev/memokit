import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { i18n, getTranslation } from './i18n'
import { siteConfig, getDocsPath } from './config'
import type { Locale } from './types'

export function baseOptions(locale?: Locale): BaseLayoutProps {
  const t = getTranslation(locale ?? 'en')

  return {
    i18n,
    nav: {
      title: siteConfig.name,
    },
    links: [
      {
        text: t.navConsole,
        url: siteConfig.console,
        external: true,
      },
      {
        text: t.navApiReference,
        url: `${getDocsPath(locale ?? 'en')}/api-reference`,
      },
      {
        text: t.navStatus,
        url: siteConfig.status,
        external: true,
      },
      {
        text: 'GitHub',
        url: siteConfig.github,
        external: true,
      },
    ],
  }
}
