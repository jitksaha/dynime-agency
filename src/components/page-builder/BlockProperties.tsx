import { Block, BLOCK_DEFINITIONS } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";

interface BlockPropertiesProps {
  block: Block;
  onChange: (block: Block) => void;
  onClose: () => void;
}

const BlockProperties = ({ block, onChange, onClose }: BlockPropertiesProps) => {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);

  const updateProp = (key: string, value: any) => {
    onChange({ ...block, props: { ...block.props, [key]: value } });
  };

  return (
    <div className="w-80 bg-card border-l border-border h-full overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">{def?.label || block.type} Settings</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Common text props */}
        {["heading", "paragraph"].includes(block.type) && (
          <>
            {block.type === "heading" && (
              <div>
                <Label className="text-xs">Level</Label>
                <Select value={block.props.level || "h2"} onValueChange={(v) => updateProp("level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["h1", "h2", "h3", "h4", "h5", "h6"].map((h) => (
                      <SelectItem key={h} value={h}>{h.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Text</Label>
              <Textarea
                value={block.props.text || ""}
                onChange={(e) => updateProp("text", e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Alignment</Label>
              <Select value={block.props.align || "left"} onValueChange={(v) => updateProp("align", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["left", "center", "right"].map((a) => (
                    <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Color (optional)</Label>
              <Input value={block.props.color || ""} onChange={(e) => updateProp("color", e.target.value)} placeholder="#ffffff or empty for default" />
            </div>
          </>
        )}

        {/* Image */}
        {block.type === "image" && (
          <>
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input value={block.props.src || ""} onChange={(e) => updateProp("src", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Alt Text</Label>
              <Input value={block.props.alt || ""} onChange={(e) => updateProp("alt", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Width</Label>
              <Input value={block.props.width || "100%"} onChange={(e) => updateProp("width", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Border Radius</Label>
              <Input value={block.props.borderRadius || "0.5rem"} onChange={(e) => updateProp("borderRadius", e.target.value)} />
            </div>
          </>
        )}

        {/* Video */}
        {block.type === "video" && (
          <>
            <div>
              <Label className="text-xs">Video URL (YouTube)</Label>
              <Input value={block.props.url || ""} onChange={(e) => updateProp("url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div>
              <Label className="text-xs">Aspect Ratio</Label>
              <Select value={block.props.aspectRatio || "16/9"} onValueChange={(v) => updateProp("aspectRatio", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="16/9">16:9</SelectItem>
                  <SelectItem value="4/3">4:3</SelectItem>
                  <SelectItem value="1/1">1:1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Button */}
        {block.type === "button" && (
          <>
            <div>
              <Label className="text-xs">Button Text</Label>
              <Input value={block.props.text || ""} onChange={(e) => updateProp("text", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Link URL</Label>
              <Input value={block.props.url || ""} onChange={(e) => updateProp("url", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Variant</Label>
              <Select value={block.props.variant || "primary"} onValueChange={(v) => updateProp("variant", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Size</Label>
              <Select value={block.props.size || "md"} onValueChange={(v) => updateProp("size", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Alignment</Label>
              <Select value={block.props.align || "left"} onValueChange={(v) => updateProp("align", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["left", "center", "right"].map((a) => (
                    <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Spacer */}
        {block.type === "spacer" && (
          <div>
            <Label className="text-xs">Height (px)</Label>
            <Input
              type="number"
              value={block.props.height || 40}
              onChange={(e) => updateProp("height", parseInt(e.target.value) || 40)}
            />
          </div>
        )}

        {/* Divider */}
        {block.type === "divider" && (
          <>
            <div>
              <Label className="text-xs">Style</Label>
              <Select value={block.props.style || "solid"} onValueChange={(v) => updateProp("style", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Width</Label>
              <Input value={block.props.width || "100%"} onChange={(e) => updateProp("width", e.target.value)} />
            </div>
          </>
        )}

        {/* CTA */}
        {block.type === "cta" && (
          <>
            <div>
              <Label className="text-xs">Heading</Label>
              <Input value={block.props.heading || ""} onChange={(e) => updateProp("heading", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Subtext</Label>
              <Textarea value={block.props.subtext || ""} onChange={(e) => updateProp("subtext", e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Button Text</Label>
              <Input value={block.props.buttonText || ""} onChange={(e) => updateProp("buttonText", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Button URL</Label>
              <Input value={block.props.buttonUrl || ""} onChange={(e) => updateProp("buttonUrl", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Background</Label>
              <Select value={block.props.bgColor || "primary"} onValueChange={(v) => updateProp("bgColor", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Hero */}
        {block.type === "hero" && (
          <>
            <div>
              <Label className="text-xs">Heading</Label>
              <Input value={block.props.heading || ""} onChange={(e) => updateProp("heading", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Subtext</Label>
              <Textarea value={block.props.subtext || ""} onChange={(e) => updateProp("subtext", e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs">Button Text</Label>
              <Input value={block.props.buttonText || ""} onChange={(e) => updateProp("buttonText", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Button URL</Label>
              <Input value={block.props.buttonUrl || ""} onChange={(e) => updateProp("buttonUrl", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Background Image URL</Label>
              <Input value={block.props.bgImage || ""} onChange={(e) => updateProp("bgImage", e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dark Overlay</Label>
              <Switch checked={block.props.overlay !== false} onCheckedChange={(v) => updateProp("overlay", v)} />
            </div>
          </>
        )}

        {/* List */}
        {block.type === "list" && (
          <>
            <div>
              <Label className="text-xs">Style</Label>
              <Select value={block.props.style || "bullet"} onValueChange={(v) => updateProp("style", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bullet">Bullet</SelectItem>
                  <SelectItem value="number">Numbered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Items</Label>
              {(block.props.items || []).map((item: string, i: number) => (
                <div key={i} className="flex gap-1 mb-1">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const items = [...(block.props.items || [])];
                      items[i] = e.target.value;
                      updateProp("items", items);
                    }}
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      const items = (block.props.items || []).filter((_: any, idx: number) => idx !== i);
                      updateProp("items", items);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1"
                onClick={() => updateProp("items", [...(block.props.items || []), "New item"])}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
          </>
        )}

        {/* Quote */}
        {block.type === "quote" && (
          <>
            <div>
              <Label className="text-xs">Quote Text</Label>
              <Textarea value={block.props.text || ""} onChange={(e) => updateProp("text", e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Author</Label>
              <Input value={block.props.author || ""} onChange={(e) => updateProp("author", e.target.value)} />
            </div>
          </>
        )}

        {/* Features Grid */}
        {block.type === "features" && (
          <>
            <div>
              <Label className="text-xs">Section Heading</Label>
              <Input value={block.props.heading || ""} onChange={(e) => updateProp("heading", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Columns</Label>
              <Select value={String(block.props.columns || 3)} onValueChange={(v) => updateProp("columns", parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Feature Items</Label>
              {(block.props.items || []).map((item: any, i: number) => (
                <div key={i} className="p-2 border border-border rounded mb-2 space-y-1">
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const items = [...(block.props.items || [])];
                      items[i] = { ...items[i], title: e.target.value };
                      updateProp("items", items);
                    }}
                    placeholder="Title"
                    className="text-xs"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => {
                      const items = [...(block.props.items || [])];
                      items[i] = { ...items[i], description: e.target.value };
                      updateProp("items", items);
                    }}
                    placeholder="Description"
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      const items = (block.props.items || []).filter((_: any, idx: number) => idx !== i);
                      updateProp("items", items);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  updateProp("items", [
                    ...(block.props.items || []),
                    { title: "New Feature", description: "Description", icon: "Zap" },
                  ])
                }
              >
                <Plus className="w-3 h-3 mr-1" /> Add Feature
              </Button>
            </div>
          </>
        )}

        {/* Testimonial */}
        {block.type === "testimonial" && (
          <>
            <div>
              <Label className="text-xs">Quote</Label>
              <Textarea value={block.props.quote || ""} onChange={(e) => updateProp("quote", e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Author</Label>
              <Input value={block.props.author || ""} onChange={(e) => updateProp("author", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Input value={block.props.role || ""} onChange={(e) => updateProp("role", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Avatar URL</Label>
              <Input value={block.props.avatar || ""} onChange={(e) => updateProp("avatar", e.target.value)} />
            </div>
          </>
        )}

        {/* Custom HTML */}
        {block.type === "html" && (
          <div>
            <Label className="text-xs">HTML Code</Label>
            <Textarea
              value={block.props.code || ""}
              onChange={(e) => updateProp("code", e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        )}

        {/* Columns */}
        {block.type === "columns" && (
          <div>
            <Label className="text-xs">Number of Columns</Label>
            <Select
              value={String(block.props.columns || 2)}
              onValueChange={(v) => {
                const num = parseInt(v);
                const content = [...(block.props.content || [])];
                while (content.length < num) content.push([]);
                updateProp("columns", num);
                updateProp("content", content.slice(0, num));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockProperties;
