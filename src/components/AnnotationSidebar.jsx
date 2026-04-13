import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

/**
 * Props:
 *   aiAnnotations: Array<{ comment }>
 *   humanAnnotations: Array<{ id, comment }>
 *   activeTab: 'all' | 'ai' | 'human'
 *   onTabChange: (tab: 'all' | 'ai' | 'human') => void
 *   onAddAnnotation: () => void
 */
export default function AnnotationSidebar({ aiAnnotations, humanAnnotations, activeTab, onTabChange, onAddAnnotation }) {
  const total = aiAnnotations.length + humanAnnotations.length

  const aiVisible    = activeTab !== 'human' ? aiAnnotations    : []
  const humanVisible = activeTab !== 'ai'    ? humanAnnotations : []
  let counter = 0

  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 gap-0">
          <TabsTrigger
            value="all"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs font-semibold"
          >
            All ({total})
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs font-semibold"
          >
            AI ({aiAnnotations.length})
          </TabsTrigger>
          <TabsTrigger
            value="human"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs font-semibold"
          >
            Human ({humanAnnotations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full p-3">
            <div className="flex flex-col gap-2.5">
              {aiVisible.map((ann, i) => {
                counter++
                const n = counter
                return (
                  <div key={`ai-${i}`} className="bg-muted rounded-xl p-3 border-l-[3px] border-primary">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-primary">AI</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">#{n}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ann.comment}</p>
                  </div>
                )
              })}
              {humanVisible.map((ann, i) => {
                counter++
                const n = counter
                return (
                  <div key={ann.id ?? `human-${i}`} className="bg-muted rounded-xl p-3 border-l-[3px] border-emerald-500">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Human</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">#{n}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ann.comment}</p>
                  </div>
                )
              })}
              {total === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">No annotations yet.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="p-3 border-t border-border">
        <Button
          onClick={onAddAnnotation}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
        >
          ✏️ Add annotation
        </Button>
        <p className="text-center text-[10px] text-muted-foreground mt-2">Switch to Annotate mode, then drag on the image</p>
      </div>
    </div>
  )
}
