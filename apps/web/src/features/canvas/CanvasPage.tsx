import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PipelineCanvas, usePipelineStore } from '@ai-ide/canvas-engine'
import { nodeRegistry } from '@ai-ide/node-registry'
import type { PipelineType } from '@ai-ide/types'
import { NodePalette } from '../palette/NodePalette'
import { NodeInspector } from '../inspector/NodeInspector'
import { CodeGenPanel } from '../codegen/CodeGenPanel'
import { CanvasToolbar } from './CanvasToolbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ai-ide/ui'

export function CanvasPage() {
  const { type = 'ml' } = useParams<{ type: string }>()
  const pipelineType = (type === 'llm' ? 'llm' : 'ml') as PipelineType
  const { resetPipeline, dag } = usePipelineStore()

  // Switch pipeline mode when URL changes
  React.useEffect(() => {
    if (dag.pipeline !== pipelineType) {
      resetPipeline(pipelineType)
    }
  }, [pipelineType])

  const definitionMap = useMemo(() => nodeRegistry.toMap(), [])

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: Node Palette */}
      <NodePalette pipeline={pipelineType} />

      {/* Center: Canvas + Code Gen */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CanvasToolbar />
        <Tabs defaultValue="canvas" className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center border-b border-border bg-card px-3">
            <TabsList className="h-7 bg-transparent p-0 gap-1">
              <TabsTrigger value="canvas" className="h-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3">
                Canvas
              </TabsTrigger>
              <TabsTrigger value="code" className="h-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3">
                Code
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="canvas" className="m-0 flex-1 overflow-hidden data-[state=active]:flex">
            <PipelineCanvas definitionMap={definitionMap} />
          </TabsContent>
          <TabsContent value="code" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
            <CodeGenPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: Inspector */}
      <NodeInspector />
    </div>
  )
}
