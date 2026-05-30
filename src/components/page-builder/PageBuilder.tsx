import { useState, useCallback } from "react";
import { Block, BlockType, BLOCK_DEFINITIONS } from "./types";
import BlockRenderer from "./BlockRenderer";
import BlockProperties from "./BlockProperties";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  GripVertical, Trash2, Copy, Plus, Eye, Pencil,
  Type, AlignLeft, ImageIcon, Play, MousePointerClick, MoveVertical,
  Minus, Columns3, Megaphone, LayoutTemplate, List, Quote,
  Grid3X3, MessageSquareQuote, Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap: Record<string, any> = {
  Type, AlignLeft, ImageIcon, Play, MousePointerClick, MoveVertical,
  Minus, Columns3, Megaphone, LayoutTemplate, List, Quote,
  Grid3X3, MessageSquareQuote, Code,
};

interface SortableBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const SortableBlock = ({ block, isSelected, onSelect, onDelete, onDuplicate }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border rounded-lg transition-all",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
      )}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Block toolbar */}
      <div className={cn(
        "absolute -top-3 left-2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-1 py-0.5 z-10 transition-opacity",
        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-muted-foreground font-medium px-1 uppercase">{block.type}</span>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-muted-foreground hover:text-foreground">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4">
        <BlockRenderer block={block} isPreview />
      </div>
    </div>
  );
};

interface PageBuilderProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

const PageBuilder = ({ blocks, onChange }: PageBuilderProps) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const addBlock = useCallback((type: BlockType) => {
    const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
    if (!def) return;
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      props: { ...def.defaultProps },
    };
    onChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowAddPanel(false);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, onChange, selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const newBlock = { ...block, id: crypto.randomUUID(), props: { ...block.props } };
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    onChange(newBlocks);
  }, [blocks, onChange]);

  const updateBlock = useCallback((updatedBlock: Block) => {
    onChange(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
  }, [blocks, onChange]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const categories = Array.from(new Set(BLOCK_DEFINITIONS.map((d) => d.category)));

  if (previewMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <span className="text-sm font-medium text-foreground">Preview Mode</span>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(false)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <p className="text-center text-muted-foreground py-14">No blocks added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
          <Button variant="outline" size="sm" onClick={() => setShowAddPanel(!showAddPanel)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Block
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(true)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Preview
          </Button>
          <span className="text-xs text-muted-foreground">{blocks.length} blocks</span>
        </div>

        {/* Add block panel */}
        {showAddPanel && (
          <div className="border-b border-border bg-card/50 p-4">
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_DEFINITIONS.filter((d) => d.category === cat).map((def) => {
                      const IconComp = iconMap[def.icon];
                      return (
                        <button
                          key={def.type}
                          onClick={() => addBlock(def.type)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm text-foreground border border-border/50 hover:border-border transition-colors"
                        >
                          {IconComp && <IconComp className="w-3.5 h-3.5 text-primary" />}
                          {def.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <ScrollArea className="flex-1">
          <div className="p-6" onClick={() => setSelectedBlockId(null)}>
            <div className="max-w-4xl mx-auto space-y-2">
              {blocks.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-muted-foreground mb-4">Start building your page</p>
                  <Button variant="outline" onClick={() => setShowAddPanel(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Block
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Properties panel */}
      {selectedBlock && (
        <BlockProperties
          block={selectedBlock}
          onChange={updateBlock}
          onClose={() => setSelectedBlockId(null)}
        />
      )}
    </div>
  );
};

export default PageBuilder;
