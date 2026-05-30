import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useFormTemplates } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type FormField = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

const fieldTypes = ["text", "email", "tel", "textarea", "select", "number", "url"];

const AdminFormBuilder = () => {
  const { data: forms, isLoading } = useFormTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const loadForm = (id: string) => {
    const form = forms?.find((f) => f.id === id);
    if (!form) return;
    setSelectedId(form.id);
    setFormName(form.name);
    setFormSlug(form.slug);
    setFormDesc(form.description || "");
    setFields((form.fields as any) || []);
    setIsActive(form.is_active);
  };

  const newForm = () => {
    setSelectedId(null);
    setFormName("");
    setFormSlug("");
    setFormDesc("");
    setFields([]);
    setIsActive(true);
  };

  const addField = () => {
    setFields([...fields, { id: `field_${Date.now()}`, type: "text", label: "", required: false, placeholder: "" }]);
  };

  const updateField = (i: number, key: keyof FormField, val: any) => {
    const copy = [...fields];
    (copy[i] as any)[key] = val;
    setFields(copy);
  };

  const removeField = (i: number) => {
    setFields(fields.filter((_, idx) => idx !== i));
  };

  const saveForm = async () => {
    if (!formName || !formSlug) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    const payload = { name: formName, slug: formSlug, description: formDesc, fields: fields as any, is_active: isActive };
    if (selectedId) {
      const { error } = await supabase.from("form_templates").update(payload).eq("id", selectedId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("form_templates").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Form saved!");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["form-templates"] });
  };

  if (isLoading) return <SuperAdminLayout><p className="text-muted-foreground">Loading...</p></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Form Builder</h1>
        <Button variant="hero" size="sm" onClick={newForm}><Plus className="w-4 h-4 mr-1" /> New Form</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form list */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Forms</p>
          {forms?.map((f) => (
            <button key={f.id} onClick={() => loadForm(f.id)} className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${selectedId === f.id ? "bg-primary/10 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}>
              {f.name}
              <span className={`ml-2 text-xs ${f.is_active ? "text-primary" : "text-destructive"}`}>
                {f.is_active ? "Active" : "Inactive"}
              </span>
            </button>
          ))}
        </div>

        {/* Form editor */}
        <div className="lg:col-span-3">
          <div className="glass-card p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Form Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Slug</label>
                <input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-foreground">Fields</h3>
              <Button variant="glass" size="sm" onClick={addField}><Plus className="w-4 h-4 mr-1" /> Add Field</Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="bg-secondary/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground">Label</label>
                      <input value={field.label} onChange={(e) => updateField(i, "label", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <select value={field.type} onChange={(e) => updateField(i, "type", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground">
                        {fieldTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Placeholder</label>
                      <input value={field.placeholder || ""} onChange={(e) => updateField(i, "placeholder", e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, "required", e.target.checked)} /> Required
                      </label>
                      <button onClick={() => removeField(i)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {field.type === "select" && (
                    <div className="mt-3">
                      <label className="text-xs text-muted-foreground">Options (comma separated)</label>
                      <input value={(field.options || []).join(", ")} onChange={(e) => updateField(i, "options", e.target.value.split(",").map((s) => s.trim()))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
              </label>
              <Button variant="hero" onClick={saveForm} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Form"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminFormBuilder;
