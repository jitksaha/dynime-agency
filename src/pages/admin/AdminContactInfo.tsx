import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAllContactInfo } from "@/hooks/use-data";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Save, MapPin, Phone, Mail, MessageSquare } from "lucide-react";
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

interface OfficeDetails {
  address: string;
  flag: string;
  office_type: string;
  receives_documents: boolean;
  receives_parcels: boolean;
  visit_policy: string;
  notice: string;
  is_primary: boolean;
}

const parseAddressValue = (value: string): OfficeDetails => {
  try {
    const data = JSON.parse(value);
    if (data && typeof data === "object" && ("address" in data || "office_type" in data)) {
      return {
        address: data.address || "",
        flag: data.flag || "🇺🇸",
        office_type: data.office_type || "Office",
        receives_documents: data.receives_documents !== false,
        receives_parcels: data.receives_parcels !== false,
        visit_policy: data.visit_policy || "Appointment Only",
        notice: data.notice || "",
        is_primary: !!data.is_primary
      };
    }
  } catch {}
  return {
    address: value || "",
    flag: "🇺🇸",
    office_type: "Office",
    receives_documents: true,
    receives_parcels: true,
    visit_policy: "Appointment Only",
    notice: "",
    is_primary: false
  };
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

  // Update specific field inside serialized address JSON
  const updateAddressDetails = (index: number, detailsField: keyof OfficeDetails, val: any) => {
    const copy = [...items];
    const currentDetails = parseAddressValue(copy[index].value);
    
    // Mutual exclusivity for is_primary
    if (detailsField === "is_primary" && val === true) {
      items.forEach((item, idx) => {
        if (item.type === "address") {
          const itemDetails = parseAddressValue(item.value);
          if (itemDetails.is_primary && idx !== index) {
            itemDetails.is_primary = false;
            copy[idx].value = JSON.stringify(itemDetails);
          }
        }
      });
    }

    currentDetails[detailsField] = val as never;
    copy[index].value = JSON.stringify(currentDetails);
    setItems(copy);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      await db.from("contact_info").delete().eq("id", item.id);
    }
    setItems(items.filter((_, i) => i !== index));
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["contact-info"] });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        const payload = { label: item.label, type: item.type, value: item.value, icon: item.icon, sort_order: item.sort_order, is_active: item.is_active };
        if (item.id) {
          await db.from("contact_info").update(payload).eq("id", item.id);
        } else {
          await db.from("contact_info").insert(payload);
        }
      }
      toast.success("Contact info saved! Changes are live on the website.");
      qc.invalidateQueries({ queryKey: ["contact-info"] });
      qc.invalidateQueries({ queryKey: ["contact-info-all"] });
      setInitialized(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <SuperAdminLayout><p className="text-muted-foreground">Loading...</p></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contact & Office Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure email, phones, WhatsApp channels, and dynamic office location cards.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Channel</Button>
          <Button variant="hero" size="sm" onClick={saveAll} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => {
          const isAddress = item.type === "address";
          const addrDetails = isAddress ? parseAddressValue(item.value) : null;

          return (
            <div key={i} className={`glass-card p-4 border transition-all ${isAddress ? "border-primary/20 bg-primary/[0.01]" : "border-border/60"}`}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Left controls: Label + Type */}
                <div className="md:col-span-3 space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Label / Title</label>
                    <input 
                      value={item.label} 
                      onChange={(e) => updateItem(i, "label", e.target.value)} 
                      placeholder={isAddress ? "e.g. Bangladesh Office" : "Label"}
                      className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Channel Type</label>
                    <select 
                      value={item.type} 
                      onChange={(e) => {
                        const newType = e.target.value;
                        let newVal = item.value;
                        if (newType === "address" && !item.value.startsWith("{")) {
                          newVal = JSON.stringify({
                            address: item.value,
                            flag: "🇺🇸",
                            office_type: "Office",
                            receives_documents: true,
                            receives_parcels: true,
                            visit_policy: "Appointment Only",
                            notice: "",
                            is_primary: false
                          });
                        }
                        const copy = [...items];
                        copy[i].type = newType;
                        copy[i].value = newVal;
                        // Set standard icons automatically
                        if (newType === "email") copy[i].icon = "Mail";
                        if (newType === "phone") copy[i].icon = "Phone";
                        if (newType === "whatsapp") copy[i].icon = "MessageSquare";
                        if (newType === "address") copy[i].icon = "MapPin";
                        setItems(copy);
                      }} 
                      className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="address">Office Address Card</option>
                      <option value="social">Social Link</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={item.is_active} 
                        onChange={(e) => updateItem(i, "is_active", e.target.checked)} 
                        className="rounded accent-primary" 
                      />
                      Active
                    </label>
                    <button 
                      onClick={() => removeItem(i)} 
                      className="inline-flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {/* Right controls: Dynamic value inputs based on type */}
                <div className="md:col-span-9 border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-4">
                  {!isAddress ? (
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Value / Link</label>
                      <input 
                        value={item.value} 
                        onChange={(e) => updateItem(i, "value", e.target.value)} 
                        placeholder={item.type === "email" ? "support@dynime.com" : "Value"}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-mono text-foreground mt-1" 
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Address String */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Full Address</label>
                        <textarea 
                          value={addrDetails!.address} 
                          onChange={(e) => updateAddressDetails(i, "address", e.target.value)} 
                          placeholder="Plot - 3 & 5, BTI Celebration Point..."
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground mt-1 min-h-[50px]"
                        />
                      </div>

                      {/* Flag + Office Subtitle */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Country Flag Emoji</label>
                        <input 
                          value={addrDetails!.flag} 
                          onChange={(e) => updateAddressDetails(i, "flag", e.target.value)} 
                          placeholder="🇧🇩"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office Type / Subtitle</label>
                        <input 
                          value={addrDetails!.office_type} 
                          onChange={(e) => updateAddressDetails(i, "office_type", e.target.value)} 
                          placeholder="e.g. Bangladesh Office / Headquarters"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1" 
                        />
                      </div>

                      {/* Visit Policy + Notice */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visit Policy</label>
                        <input 
                          value={addrDetails!.visit_policy} 
                          onChange={(e) => updateAddressDetails(i, "visit_policy", e.target.value)} 
                          placeholder="Appointment Only"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notice (Optional)</label>
                        <input 
                          value={addrDetails!.notice} 
                          onChange={(e) => updateAddressDetails(i, "notice", e.target.value)} 
                          placeholder="Documents and parcels can be received..."
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1" 
                        />
                      </div>

                      {/* Mail Capabilities + Primary Selector */}
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-4 bg-muted/20 p-2.5 rounded-lg border border-border/40 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={addrDetails!.receives_documents} 
                            onChange={(e) => updateAddressDetails(i, "receives_documents", e.target.checked)} 
                            className="rounded accent-emerald-500" 
                          />
                          <span>Receives Documents</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={addrDetails!.receives_parcels} 
                            onChange={(e) => updateAddressDetails(i, "receives_parcels", e.target.checked)} 
                            className="rounded accent-emerald-500" 
                          />
                          <span>Receives Parcels</span>
                        </label>

                        {/* Primary Headquarters Selector */}
                        <label className="flex items-center gap-2 ml-auto cursor-pointer font-bold text-primary">
                          <input 
                            type="checkbox" 
                            checked={addrDetails!.is_primary} 
                            onChange={(e) => updateAddressDetails(i, "is_primary", e.target.checked)} 
                            className="rounded accent-primary h-4 w-4" 
                          />
                          <span>★ Set as Primary / Headquarters</span>
                        </label>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminContactInfo;
