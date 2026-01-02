import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useParams,
} from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { i18n, translations, getLocaleDisplayName } from '../lib/i18n'
import { getLocale, LOCALES } from '../lib/types'
import '../styles/app.css'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Memokit Documentation',
      },
      {
        name: 'description',
        content:
          'Memory as a Service for AI Applications - Store, search, and manage memories with a simple REST API',
      },
      // Open Graph
      {
        property: 'og:title',
        content: 'Memokit - Memory as a Service for AI',
      },
      {
        property: 'og:description',
        content:
          'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://docs.memokit.dev',
      },
      {
        property: 'og:site_name',
        content: 'Memokit',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Memokit - Memory as a Service for AI',
      },
      {
        name: 'twitter:description',
        content: 'Build persistent memory layers for your AI applications.',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
      // Hreflang for i18n SEO
      {
        rel: 'alternate',
        hrefLang: 'en',
        href: 'https://docs.memokit.dev/docs',
      },
      {
        rel: 'alternate',
        hrefLang: 'zh',
        href: 'https://docs.memokit.dev/zh/docs',
      },
      {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: 'https://docs.memokit.dev/docs',
      },
    ],
  }),
})

function RootComponent() {
  const params = useParams({ strict: false }) as { lang?: string }
  const locale = getLocale(params.lang)

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          i18n={{
            locale,
            locales: LOCALES.map((lang) => ({
              name: getLocaleDisplayName(lang),
              locale: lang,
            })),
            translations: translations[locale],
          }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
