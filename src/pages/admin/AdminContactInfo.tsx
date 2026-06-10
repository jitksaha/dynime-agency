import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAllContactInfo } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type ContactItem = {
  id?: string;
  label: string;
  type: string;
  value: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const AdminContactInfo = () => {
  const { data: contacts, isLoading } = useAllContactInfo();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (contacts && !initialized) {
    setItems(contacts.map((c) => ({ id: c.id, label: c.label, type: c.type, value: c.value, icon: c.icon || "", sort_order: c.sort_order, is_active: c.is_active })));
    setInitialized(true);
  }

  const addItem = () => {
    setItems([...items, { label: "", type: "email", value: "", icon: "Mail", sort_order: items.length + 1, is_active: true }]);
  };

  const updateItem = (index: number, field: keyof ContactItem, val: any) => {
    const copy = [...items];
    (copy[index] as any)[field] = val;
    setItems(copy);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      await supabase.from("contact_info").delete().eq("id", item.id);
    }
    setItems(items.filter((_, i) => i !== index));
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["contact-info"] });
  };

  const saveAll = async () => {
    setSaving(true);
    for (const item of items) {
      const payload = { label: item.label, type: item.type, value: item.value, icon: item.icon, sort_order: item.sort_order, is_active: item.is_active };
      if (item.id) {
        await supabase.from("contact_info").update(payload).eq("id", item.id);
      } else {
        await supabase.from("contact_info").insert(payload);
      }
    }
    setSaving(false);
    toast.success("Contact info saved! Changes are live on the website.");
    qc.invalidateQueries({ queryKey: ["contact-info"] });
    qc.invalidateQueries({ queryKey: ["contact-info-all"] });
    setInitialized(false);
  };

  if (isLoading) return <SuperAdminLayout><p className="text-muted-foreground">Loading...</p></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Contact Information</h1>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          <Button variant="hero" size="sm" onClick={saveAll} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Update contact details here — changes instantly reflect across the entire website.</p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="glass-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Label</label>
                <input value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select value={item.type} onChange={(e) => updateItem(i, "type", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="address">Address</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs text-muted-foreground">Value</label>
                <input value={item.value} onChange={(e) => updateItem(i, "value", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={item.is_active} onChange={(e) => updateItem(i, "is_active", e.target.checked)} className="rounded" />
                  Active
                </label>
                <button onClick={() => removeItem(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminContactInfo;
