import { createFileRoute } from '@tanstack/react-router'
import { getTranslation } from '../../lib/i18n'
import { getLocale } from '../../lib/types'
import { HomePage } from '../../components/home'

export const Route = createFileRoute('/$lang/')({
  head: ({ params }: { params: { lang: string } }) => {
    const t = getTranslation(params.lang)
    return {
      meta: [
        { title: t.siteTitle },
        { name: 'description', content: t.siteDescription },
      ],
    }
  },
  component: LangHomePage,
})

function LangHomePage() {
  const { lang } = Route.useParams()
  const locale = getLocale(lang)
  return <HomePage locale={locale} />
}
