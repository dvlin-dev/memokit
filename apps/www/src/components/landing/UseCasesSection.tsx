import { Container } from '@/components/layout'
import { Share2, FileText, BarChart3, Link2 } from 'lucide-react'

const useCases = [
  {
    icon: Share2,
    title: 'Social Media Cards',
    description:
      'Generate beautiful Open Graph images for social sharing. Perfect for blogs, news sites, and marketing pages.',
  },
  {
    icon: FileText,
    title: 'PDF Generation',
    description:
      'Convert web pages to PDF documents with precise rendering. Ideal for invoices, reports, and documentation.',
  },
  {
    icon: BarChart3,
    title: 'Visual Monitoring',
    description:
      'Track visual changes and regressions automatically. Perfect for QA, compliance, and competitor analysis.',
  },
  {
    icon: Link2,
    title: 'Link Previews',
    description:
      'Generate rich link previews for chat apps, email clients, and content platforms.',
  },
]

export function UseCasesSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            USE CASES
          </h2>
          <p className="mt-4 text-muted-foreground">
            From social cards to visual monitoring, one API for all your screenshot needs
          </p>
        </div>

        {/* Use Case Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="group border border-border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-muted/50"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border border-border bg-background">
                <useCase.icon className="h-5 w-5" />
              </div>
              <h3 className="font-mono text-lg font-semibold">{useCase.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
