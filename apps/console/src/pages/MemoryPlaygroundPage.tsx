/**
 * Memory Playground Page
 * Interactive Memory API testing interface
 */
import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@memokit/ui/composed'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Alert,
  AlertDescription,
  Button,
  Textarea,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memokit/ui/primitives'
import { AlertTriangle, Send, Search, Plus, Key, List, Trash2, Copy, Check, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { useApiKeys, getStoredApiKeys, syncStoredApiKeys } from '@/features/api-keys'

interface Memory {
  id: string
  content: string
  userId: string
  agentId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  createdAt: string
}

interface SearchResult extends Memory {
  similarity: number
}

export default function MemoryPlaygroundPage() {
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys()
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')

  // Add Memory state
  const [addContent, setAddContent] = useState('')
  const [addUserId, setAddUserId] = useState('test-user')
  const [addAgentId, setAddAgentId] = useState('')
  const [addTags, setAddTags] = useState('')
  const [addResult, setAddResult] = useState<Memory | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUserId, setSearchUserId] = useState('test-user')
  const [searchLimit, setSearchLimit] = useState('10')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // List state
  const [listUserId, setListUserId] = useState('test-user')
  const [listLimit, setListLimit] = useState('10')
  const [listOffset, setListOffset] = useState('0')
  const [listResults, setListResults] = useState<Memory[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)

  // Get/Delete state
  const [memoryId, setMemoryId] = useState('')
  const [getResult, setGetResult] = useState<Memory | null>(null)
  const [getError, setGetError] = useState<string | null>(null)
  const [getLoading, setGetLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // cURL state
  const [copiedCurl, setCopiedCurl] = useState(false)

  // 获取本地存储的 API Keys，并与服务器列表同步
  const storedKeys = useMemo(() => {
    if (apiKeys?.length) {
      // 清理已删除的 keys
      syncStoredApiKeys(apiKeys.map((k) => k.id))
    }
    return getStoredApiKeys()
  }, [apiKeys])

  // 可用的 API Keys（只显示本地存储了完整 key 的）
  const availableKeys = useMemo(() => {
    if (!apiKeys) return []
    return apiKeys.filter((apiKey) =>
      apiKey.isActive && storedKeys.some((stored) => stored.id === apiKey.id)
    )
  }, [apiKeys, storedKeys])

  // Auto-select first available API key
  useEffect(() => {
    if (availableKeys.length && !selectedKeyId) {
      setSelectedKeyId(availableKeys[0].id)
    }
  }, [availableKeys, selectedKeyId])

  const getApiKey = () => {
    const stored = storedKeys.find((k) => k.id === selectedKeyId)
    return stored?.key || ''
  }

  const handleAddMemory = async () => {
    if (!addContent.trim() || !getApiKey()) return

    setAddLoading(true)
    setAddError(null)
    setAddResult(null)

    try {
      const response = await fetch('/api/v1/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          content: addContent,
          userId: addUserId,
          agentId: addAgentId || undefined,
          tags: addTags ? addTags.split(',').map(t => t.trim()) : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add memory')
      }

      setAddResult(data.data)
      setAddContent('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add memory')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !getApiKey()) return

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const response = await fetch('/api/v1/memories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: searchUserId,
          limit: parseInt(searchLimit),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to search memories')
      }

      setSearchResults(data.data || [])
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search memories')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleList = async () => {
    if (!getApiKey()) return

    setListLoading(true)
    setListError(null)
    setListResults([])

    try {
      const params = new URLSearchParams({
        userId: listUserId,
        limit: listLimit,
        offset: listOffset,
      })

      const response = await fetch(`/api/v1/memories?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to list memories')
      }

      setListResults(data.data || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to list memories')
    } finally {
      setListLoading(false)
    }
  }

  const handleGetMemory = async () => {
    if (!memoryId.trim() || !getApiKey()) return

    setGetLoading(true)
    setGetError(null)
    setGetResult(null)

    try {
      const response = await fetch(`/api/v1/memories/${memoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get memory')
      }

      setGetResult(data.data)
    } catch (err) {
      setGetError(err instanceof Error ? err.message : 'Failed to get memory')
    } finally {
      setGetLoading(false)
    }
  }

  const handleDeleteMemory = async () => {
    if (!memoryId.trim() || !getApiKey()) return

    setDeleteLoading(true)
    setGetError(null)

    try {
      const response = await fetch(`/api/v1/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete memory')
      }

      setGetResult(null)
      setMemoryId('')
      toast.success('Memory deleted successfully')
    } catch (err) {
      setGetError(err instanceof Error ? err.message : 'Failed to delete memory')
    } finally {
      setDeleteLoading(false)
    }
  }

  const generateCurl = (method: string, endpoint: string, body?: object) => {
    const apiKey = getApiKey()
    const baseUrl = window.location.origin
    const headers = [
      `-H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`,
      body ? `-H "Content-Type: application/json"` : '',
    ].filter(Boolean).join(' \\\n  ')

    const bodyStr = body ? `\\\n  -d '${JSON.stringify(body)}'` : ''

    return `curl -X ${method} "${baseUrl}${endpoint}" \\\n  ${headers}${bodyStr}`
  }

  const handleCopyCurl = async (curl: string) => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopiedCurl(true)
      setTimeout(() => setCopiedCurl(false), 2000)
      toast.success('cURL copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  if (keysLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!apiKeys?.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            你还没有创建任何 API Key。请先在{' '}
            <a
              href="/api-keys"
              className="underline font-medium text-primary"
            >
              API Keys 页面
            </a>{' '}
            创建一个。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!availableKeys.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Memory Playground"
          description="Interactive Memory API testing"
        />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            没有可用的 API Key。API Key 只在创建时显示一次，请在{' '}
            <a
              href="/api-keys"
              className="underline font-medium text-primary"
            >
              API Keys 页面
            </a>{' '}
            创建一个新的 Key，创建后即可在此选择使用。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Playground"
        description="Test the Memory API interactively - add, search, and manage semantic memories"
      />

      {/* API Key Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">
                <Key className="h-4 w-4 inline mr-2" />
                API Key
              </Label>
              <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择 API Key" />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <span className="font-medium">{key.name}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {key.keyPrefix}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              如需新 Key，请在{' '}
              <a href="/api-keys" className="underline text-primary">API Keys 页面</a> 创建。
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
          <TabsTrigger value="get-delete">
            <Terminal className="h-4 w-4 mr-2" />
            Get/Delete
          </TabsTrigger>
        </TabsList>

        {/* Add Memory Tab */}
        <TabsContent value="add">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Memory Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the memory content..."
                    value={addContent}
                    onChange={(e) => setAddContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="user-123"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent ID (optional)</Label>
                    <Input
                      id="agentId"
                      placeholder="agent-1"
                      value={addAgentId}
                      onChange={(e) => setAddAgentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="work, project, idea"
                    value={addTags}
                    onChange={(e) => setAddTags(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddMemory}
                  disabled={addLoading || !addContent.trim() || !selectedKeyId}
                  className="w-full"
                >
                  {addLoading ? 'Adding...' : 'Add Memory'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">cURL Command</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCurl(generateCurl('POST', '/api/v1/memories', {
                        content: addContent || 'Your memory content',
                        userId: addUserId,
                        ...(addAgentId && { agentId: addAgentId }),
                        ...(addTags && { tags: addTags.split(',').map(t => t.trim()) }),
                      }))}
                    >
                      {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[120px] font-mono">
                    {generateCurl('POST', '/api/v1/memories', {
                      content: addContent || 'Your memory content',
                      userId: addUserId,
                      ...(addAgentId && { agentId: addAgentId }),
                      ...(addTags && { tags: addTags.split(',').map(t => t.trim()) }),
                    })}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {addError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{addError}</AlertDescription>
                  </Alert>
                ) : addResult ? (
                  <div className="space-y-2">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-2">Memory Created</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        ID: {addResult.id}
                      </p>
                      <p className="text-sm">{addResult.content}</p>
                      {addResult.tags && addResult.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {addResult.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <pre className="text-xs p-4 rounded-lg bg-muted overflow-auto max-h-[300px]">
                      {JSON.stringify(addResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Add a memory to see the result here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Memories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchQuery">Search Query</Label>
                  <Textarea
                    id="searchQuery"
                    placeholder="What are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchUserId">User ID</Label>
                    <Input
                      id="searchUserId"
                      placeholder="user-123"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchLimit">Limit</Label>
                    <Input
                      id="searchLimit"
                      type="number"
                      placeholder="10"
                      value={searchLimit}
                      onChange={(e) => setSearchLimit(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim() || !selectedKeyId}
                  className="w-full"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">cURL Command</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCurl(generateCurl('POST', '/api/v1/memories/search', {
                        query: searchQuery || 'Your search query',
                        userId: searchUserId,
                        limit: parseInt(searchLimit),
                      }))}
                    >
                      {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[120px] font-mono">
                    {generateCurl('POST', '/api/v1/memories/search', {
                      query: searchQuery || 'Your search query',
                      userId: searchUserId,
                      limit: parseInt(searchLimit),
                    })}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results ({searchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {searchError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground">
                            {result.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs font-medium text-primary">
                            {(result.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-sm">{result.content}</p>
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {result.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Search for memories to see results here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>List Memories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listUserId">User ID</Label>
                  <Input
                    id="listUserId"
                    placeholder="user-123"
                    value={listUserId}
                    onChange={(e) => setListUserId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listLimit">Limit</Label>
                    <Input
                      id="listLimit"
                      type="number"
                      placeholder="10"
                      value={listLimit}
                      onChange={(e) => setListLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listOffset">Offset</Label>
                    <Input
                      id="listOffset"
                      type="number"
                      placeholder="0"
                      value={listOffset}
                      onChange={(e) => setListOffset(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleList}
                  disabled={listLoading || !selectedKeyId}
                  className="w-full"
                >
                  {listLoading ? 'Loading...' : 'List Memories'}
                  <List className="h-4 w-4 ml-2" />
                </Button>

                {/* cURL */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">cURL Command</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCurl(generateCurl('GET', `/api/v1/memories?userId=${listUserId}&limit=${listLimit}&offset=${listOffset}`))}
                    >
                      {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[120px] font-mono">
                    {generateCurl('GET', `/api/v1/memories?userId=${listUserId}&limit=${listLimit}&offset=${listOffset}`)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results ({listResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {listError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{listError}</AlertDescription>
                  </Alert>
                ) : listResults.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {listResults.map((memory) => (
                      <div
                        key={memory.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {memory.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(memory.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{memory.content}</p>
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {memory.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Click "List Memories" to see results
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Get/Delete Tab */}
        <TabsContent value="get-delete">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Get or Delete Memory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memoryId">Memory ID</Label>
                  <Input
                    id="memoryId"
                    placeholder="Enter memory ID (UUID)"
                    value={memoryId}
                    onChange={(e) => setMemoryId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleGetMemory}
                    disabled={getLoading || !memoryId.trim() || !selectedKeyId}
                    className="w-full"
                  >
                    {getLoading ? 'Loading...' : 'Get Memory'}
                    <Search className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteMemory}
                    disabled={deleteLoading || !memoryId.trim() || !selectedKeyId}
                    className="w-full"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                    <Trash2 className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* cURL for GET */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">cURL - GET</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCurl(generateCurl('GET', `/api/v1/memories/${memoryId || '{id}'}`))}
                    >
                      {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[80px] font-mono">
                    {generateCurl('GET', `/api/v1/memories/${memoryId || '{id}'}`)}
                  </pre>
                </div>

                {/* cURL for DELETE */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">cURL - DELETE</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCurl(generateCurl('DELETE', `/api/v1/memories/${memoryId || '{id}'}`))}
                    >
                      {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded-lg bg-muted overflow-auto max-h-[80px] font-mono">
                    {generateCurl('DELETE', `/api/v1/memories/${memoryId || '{id}'}`)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {getError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{getError}</AlertDescription>
                  </Alert>
                ) : getResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {getResult.id}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{getResult.content}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>User: {getResult.userId}</p>
                        {getResult.agentId && <p>Agent: {getResult.agentId}</p>}
                        <p>Created: {new Date(getResult.createdAt).toLocaleString()}</p>
                      </div>
                      {getResult.tags && getResult.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {getResult.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <pre className="text-xs p-4 rounded-lg bg-muted overflow-auto max-h-[200px] font-mono">
                      {JSON.stringify(getResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Enter a memory ID and click "Get Memory" to view details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
