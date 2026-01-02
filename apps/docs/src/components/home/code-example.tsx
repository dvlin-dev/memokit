import { codeExample } from '../../lib/config'

export function CodeExample() {
  return (
    <div className="mt-16 max-w-2xl mx-auto text-left">
      <div className="bg-card border overflow-hidden shadow-lg">
        <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-sm text-muted-foreground">Terminal</span>
        </div>
        <pre className="p-4 text-sm overflow-x-auto">
          <code className="text-green-600 dark:text-green-400">{codeExample}</code>
        </pre>
      </div>
    </div>
  )
}
