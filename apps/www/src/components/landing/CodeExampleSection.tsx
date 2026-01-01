import { useState } from 'react'
import { Container } from '@/components/layout'
import { cn } from '@memory/ui/lib'

const languages = ['curl', 'javascript', 'python', 'go'] as const
type Language = (typeof languages)[number]

const codeExamples: Record<Language, string> = {
  curl: `curl -X POST https://api.memory.dev/v1/screenshot \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "format": "png",
    "width": 1280,
    "height": 720
  }'`,
  javascript: `import { Memory } from '@memory/sdk';

const client = new Memory('YOUR_API_KEY');

const screenshot = await client.capture({
  url: 'https://example.com',
  format: 'png',
  width: 1280,
  height: 720,
});

console.log(screenshot.url);`,
  python: `from memory import Memory

client = Memory('YOUR_API_KEY')

screenshot = client.capture(
    url='https://example.com',
    format='png',
    width=1280,
    height=720
)

print(screenshot.url)`,
  go: `package main

import (
    "fmt"
    "github.com/memory/memory-go"
)

func main() {
    client := memory.New("YOUR_API_KEY")

    screenshot, err := client.Capture(&memory.CaptureOptions{
        URL:    "https://example.com",
        Format: "png",
        Width:  1280,
        Height: 720,
    })

    fmt.Println(screenshot.URL)
}`,
}

export function CodeExampleSection() {
  const [activeLanguage, setActiveLanguage] = useState<Language>('curl')

  return (
    <section className="border-b border-border bg-muted/30 py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            SIMPLE API
          </h2>
          <p className="mt-4 text-muted-foreground">
            One API call to capture any webpage. SDKs for every major language.
          </p>
        </div>

        {/* Code Block */}
        <div className="mx-auto max-w-3xl overflow-hidden border border-border bg-background">
          {/* Language Tabs */}
          <div className="flex border-b border-border">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={cn(
                  'px-4 py-2 font-mono text-sm transition-colors',
                  activeLanguage === lang
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Code Content */}
          <div className="overflow-x-auto p-4">
            <pre className="font-mono text-sm leading-relaxed">
              <code>{codeExamples[activeLanguage]}</code>
            </pre>
          </div>
        </div>
      </Container>
    </section>
  )
}
