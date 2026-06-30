import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAllContactInfo } from "@/hooks/use-data";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Save, MapPin, Phone, Mail, MessageSquare, Star, StarOff, Power, ShieldAlert } from "lucide-react";
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
      // A primary office must always be active
      copy[index].is_active = true;
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

      <div className="space-y-5">
        {items.map((item, i) => {
          const isAddress = item.type === "address";
          const addrDetails = isAddress ? parseAddressValue(item.value) : null;
          const isPrimaryHq = isAddress && !!addrDetails?.is_primary;

          return (
            <div 
              key={i} 
              className={`glass-card p-5 border transition-all duration-300 relative overflow-hidden rounded-2xl ${
                isPrimaryHq 
                  ? "border-amber-500/30 bg-amber-500/[0.015] shadow-md shadow-amber-500/5" 
                  : item.is_active 
                    ? "border-border/60 hover:border-primary/30" 
                    : "border-border/30 bg-secondary/20 opacity-75"
              }`}
            >
              {/* Star Background Indicator for HQ */}
              {isPrimaryHq && (
                <div className="absolute right-0 top-0 -mr-6 -mt-6 h-20 w-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Left controls: Label + Type + Premium Toggle Switch */}
                <div className="md:col-span-3 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Label / Title</label>
                      <input 
                        value={item.label} 
                        onChange={(e) => updateItem(i, "label", e.target.value)} 
                        placeholder={isAddress ? "e.g. Bangladesh Office" : "Label"}
                        className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none" 
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
                          if (newType === "email") copy[i].icon = "Mail";
                          if (newType === "phone") copy[i].icon = "Phone";
                          if (newType === "whatsapp") copy[i].icon = "MessageSquare";
                          if (newType === "address") copy[i].icon = "MapPin";
                          setItems(copy);
                        }} 
                        className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground outline-none"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="address">Office Address Card</option>
                        <option value="social">Social Link</option>
                      </select>
                    </div>
                  </div>

                  {/* Active/Pause Premium Switcher & Delete */}
                  <div className="pt-3 border-t border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</span>
                      <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          item.is_active 
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          {item.is_active ? "Active" : "Paused"}
                        </span>
                        
                        {/* Switch button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isPrimaryHq) {
                              toast.error("Primary Headquarters address cannot be paused!");
                              return;
                            }
                            updateItem(i, "is_active", !item.is_active);
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.is_active ? "bg-emerald-500" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              item.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button 
                        type="button"
                        onClick={() => removeItem(i)} 
                        className="inline-flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Channel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right controls: Dynamic value inputs based on type */}
                <div className="md:col-span-9 border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-5">
                  {!isAddress ? (
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Value / Link</label>
                      <input 
                        value={item.value} 
                        onChange={(e) => updateItem(i, "value", e.target.value)} 
                        placeholder={item.type === "email" ? "support@dynime.com" : "Value"}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-mono text-foreground mt-1 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Address String */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Full Address</label>
                          {/* Headquarters Badge Selector */}
                          {isPrimaryHq ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary Headquarters
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateAddressDetails(i, "is_primary", true)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-amber-500 transition-colors"
                            >
                              <StarOff className="w-3 h-3 text-muted-foreground/60" /> Mark as Headquarters
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={addrDetails!.address} 
                          onChange={(e) => updateAddressDetails(i, "address", e.target.value)} 
                          placeholder="Plot - 3 & 5, BTI Celebration Point..."
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground mt-1 min-h-[50px] focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none"
                        />
                      </div>

                      {/* Flag + Office Subtitle */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Country Flag Emoji</label>
                        <input 
                          value={addrDetails!.flag} 
                          onChange={(e) => updateAddressDetails(i, "flag", e.target.value)} 
                          placeholder="🇧🇩"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office Type / Subtitle</label>
                        <input 
                          value={addrDetails!.office_type} 
                          onChange={(e) => updateAddressDetails(i, "office_type", e.target.value)} 
                          placeholder="e.g. Bangladesh Office / Headquarters"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
                        />
                      </div>

                      {/* Visit Policy + Notice */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visit Policy</label>
                        <input 
                          value={addrDetails!.visit_policy} 
                          onChange={(e) => updateAddressDetails(i, "visit_policy", e.target.value)} 
                          placeholder="Appointment Only"
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notice (Optional)</label>
                        <input 
                          value={addrDetails!.notice} 
                          onChange={(e) => updateAddressDetails(i, "notice", e.target.value)} 
                          placeholder="Documents and parcels can be received..."
                          className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
                        />
                      </div>

                      {/* Mail Capabilities */}
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-4 bg-muted/20 p-2.5 rounded-lg border border-border/40 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={addrDetails!.receives_documents} 
                            onChange={(e) => updateAddressDetails(i, "receives_documents", e.target.checked)} 
                            className="rounded accent-emerald-500 h-3.5 w-3.5" 
                          />
                          <span>Receives Documents</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={addrDetails!.receives_parcels} 
                            onChange={(e) => updateAddressDetails(i, "receives_parcels", e.target.checked)} 
                            className="rounded accent-emerald-500 h-3.5 w-3.5" 
                          />
                          <span>Receives Parcels</span>
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
