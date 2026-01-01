/**
 * Embed 结果展示组件
 */
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from '@memory/ui/primitives'
import { Code, Eye } from 'lucide-react'
import type { EmbedResult } from '../types'

interface EmbedResultProps {
  result: EmbedResult
}

export function EmbedResultDisplay({ result }: EmbedResultProps) {
  const [activeTab, setActiveTab] = useState('preview')
  const { data, provider, cached } = result

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Result</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {provider}
            </Badge>
            {cached && (
              <Badge variant="secondary" className="text-xs">
                Cached
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 元信息 */}
        {(data.title || data.author_name) && (
          <div className="space-y-1 text-sm">
            {data.title && (
              <p className="font-medium line-clamp-2">{data.title}</p>
            )}
            {data.author_name && (
              <p className="text-muted-foreground">
                by{' '}
                {data.author_url ? (
                  <a
                    href={data.author_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {data.author_name}
                  </a>
                ) : (
                  data.author_name
                )}
              </p>
            )}
          </div>
        )}

        {/* 预览/代码 切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="html" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {data.html ? (
              <div
                className="embed-container rounded-lg overflow-hidden border"
                dangerouslySetInnerHTML={{ __html: data.html }}
              />
            ) : data.url ? (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={data.url}
                  alt={data.title || 'Embed preview'}
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No preview available
              </div>
            )}
          </TabsContent>

          <TabsContent value="html" className="mt-4">
            {data.html ? (
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>{data.html}</code>
              </pre>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No HTML content
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 详细信息 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">{data.type}</span>
          </div>
          {data.width && data.height && (
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">
                {data.width} x {data.height}
              </span>
            </div>
          )}
          {data.provider_name && (
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{data.provider_name}</span>
            </div>
          )}
          {data.cache_age !== undefined && (
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Cache Age</span>
              <span className="font-medium">{data.cache_age}s</span>
            </div>
          )}
        </div>

        {/* 缩略图 */}
        {data.thumbnail_url && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Thumbnail</p>
            <img
              src={data.thumbnail_url}
              alt="Thumbnail"
              className="rounded-lg max-h-32 object-cover"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
