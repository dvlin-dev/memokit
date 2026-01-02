import { createFileRoute } from '@tanstack/react-router'
import { DocsPageLayout, getDocsPageMeta } from '../../../components/docs'
import { getLocale } from '../../../lib/types'

export const Route = createFileRoute('/$lang/docs/$')({
  head: ({ params }: { params: { lang: string; _splat?: string } }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    return getDocsPageMeta(slugs, getLocale(params.lang))
  },
  component: DocsPageComponent,
})

function DocsPageComponent() {
  const params = Route.useParams()
  const slugs = params._splat?.split('/').filter(Boolean) ?? []
  const locale = getLocale(params.lang)
  return <DocsPageLayout slugs={slugs} locale={locale} />
}
