import { createFileRoute } from '@tanstack/react-router'
import { DocsPageLayout, getDocsPageMeta } from '../../components/docs'

export const Route = createFileRoute('/docs/$')({
  head: ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    return getDocsPageMeta(slugs, 'en')
  },
  component: DocsPageComponent,
})

function DocsPageComponent() {
  const { _splat } = Route.useParams()
  const slugs = _splat?.split('/').filter(Boolean) ?? []
  return <DocsPageLayout slugs={slugs} locale="en" />
}
