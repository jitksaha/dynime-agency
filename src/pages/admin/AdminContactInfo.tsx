import { useState } from "react";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { useAllContactInfo } from "@/hooks/use-data";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Save, MapPin, Phone, Mail, MessageSquare, Star, StarOff, Globe2, Network, ShieldCheck } from "lucide-react";
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
  phone: string;
  whatsapp: string;
  whatsappPreFill: string;
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
        is_primary: !!data.is_primary,
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        whatsappPreFill: data.whatsappPreFill || ""
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
    is_primary: false,
    phone: "",
    whatsapp: "",
    whatsappPreFill: ""
  };
};

const AdminContactInfo = () => {
  const { data: contacts, isLoading } = useAllContactInfo();
  
  // Structured form states
  const [emailRecord, setEmailRecord] = useState<ContactItem | null>(null);
  const [phoneRecord, setPhoneRecord] = useState<ContactItem | null>(null);
  const [whatsappRecord, setWhatsappRecord] = useState<ContactItem | null>(null);
  const [offices, setOffices] = useState<ContactItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (contacts && !initialized) {
    const email = contacts.find((c) => c.type === "email") || { label: "Email", type: "email", value: "", icon: "Mail", sort_order: 1, is_active: true };
    const phone = contacts.find((c) => c.type === "phone" && !/whatsapp/i.test(c.label || "")) || { label: "Phone", type: "phone", value: "", icon: "Phone", sort_order: 2, is_active: true };
    const whatsapp = contacts.find((c) => c.type === "whatsapp" || (c.type === "phone" && /whatsapp/i.test(c.label || ""))) || { label: "WhatsApp", type: "whatsapp", value: "", icon: "MessageSquare", sort_order: 3, is_active: true };
    const listOffices = contacts.filter((c) => c.type === "address").map(o => ({...o}));

    setEmailRecord(email);
    setPhoneRecord(phone);
    setWhatsappRecord(whatsapp);
    setOffices(listOffices);
    setDeletedIds([]);
    setInitialized(true);
  }

  // Office handlers
  const addOffice = () => {
    const newOffice: ContactItem = {
      label: "New Office",
      type: "address",
      value: JSON.stringify({
        address: "",
        flag: "🇺🇸",
        office_type: "Branch Office",
        receives_documents: true,
        receives_parcels: true,
        visit_policy: "Appointment Only",
        notice: "",
        is_primary: false,
        phone: "",
        whatsapp: "",
        whatsappPreFill: ""
      }),
      icon: "MapPin",
      sort_order: offices.length + 1,
      is_active: true
    };
    setOffices([...offices, newOffice]);
  };

  const updateOfficeField = (index: number, field: keyof ContactItem, val: any) => {
    const copy = [...offices];
    (copy[index] as any)[field] = val;
    setOffices(copy);
  };

  const updateOfficeDetails = (index: number, detailsField: keyof OfficeDetails, val: any) => {
    const copy = [...offices];
    const details = parseAddressValue(copy[index].value);

    // Mutual exclusivity for headquarters primary flag
    if (detailsField === "is_primary" && val === true) {
      offices.forEach((item, idx) => {
        const itemDetails = parseAddressValue(item.value);
        if (itemDetails.is_primary && idx !== index) {
          itemDetails.is_primary = false;
          copy[idx].value = JSON.stringify(itemDetails);
        }
      });
      copy[index].is_active = true; // HQ must be active
    }

    details[detailsField] = val as never;
    copy[index].value = JSON.stringify(details);
    setOffices(copy);
  };

  const removeOffice = (index: number) => {
    const target = offices[index];
    if (target.id) {
      setDeletedIds([...deletedIds, target.id]);
    }
    setOffices(offices.filter((_, idx) => idx !== index));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // 1. Delete removed offices
      for (const delId of deletedIds) {
        await db.from("contact_info").delete().eq("id", delId);
      }

      // 2. Save email, phone, whatsapp
      const channels = [emailRecord, phoneRecord, whatsappRecord].filter(Boolean) as ContactItem[];
      for (const ch of channels) {
        const payload = { label: ch.label, type: ch.type, value: ch.value, icon: ch.icon, sort_order: ch.sort_order, is_active: ch.is_active };
        if (ch.id) {
          await db.from("contact_info").update(payload).eq("id", ch.id);
        } else {
          await db.from("contact_info").insert(payload);
        }
      }

      // 3. Save offices
      for (const o of offices) {
        const payload = { label: o.label, type: "address", value: o.value, icon: o.icon, sort_order: o.sort_order, is_active: o.is_active };
        if (o.id) {
          await db.from("contact_info").update(payload).eq("id", o.id);
        } else {
          await db.from("contact_info").insert(payload);
        }
      }

      toast.success("Business information saved live!");
      qc.invalidateQueries({ queryKey: ["contact-info"] });
      qc.invalidateQueries({ queryKey: ["contact-info-all"] });
      setInitialized(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !initialized) return <SuperAdminLayout><p className="text-muted-foreground">Loading...</p></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" /> Centralized Business Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure global contact credentials and manage active office locations from one unified dashboard.</p>
        </div>
        <Button variant="hero" size="sm" onClick={saveAll} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save All Configuration"}
        </Button>
      </div>

      <div className="space-y-6">
        
        {/* Section 1: Global Contact Channels */}
        <div className="glass-card p-6 border border-border/60 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">Global Contact Channels</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Primary Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" /> Primary Business Email
              </label>
              <input 
                value={emailRecord?.value || ""} 
                onChange={(e) => setEmailRecord({ ...emailRecord!, value: e.target.value })} 
                placeholder="support@dynime.com"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
              />
            </div>

            {/* Primary Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary" /> Primary Phone
              </label>
              <input 
                value={phoneRecord?.value || ""} 
                onChange={(e) => setPhoneRecord({ ...phoneRecord!, value: e.target.value })} 
                placeholder="+1 (646) 884-0271"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
              />
            </div>

            {/* Primary WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-primary" /> Primary WhatsApp
              </label>
              <input 
                value={whatsappRecord?.value || ""} 
                onChange={(e) => setWhatsappRecord({ ...whatsappRecord!, value: e.target.value })} 
                placeholder="+1 (646) 884-0271"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Global Office Locations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">Global Office Locations</h2>
            </div>
            <Button variant="glass" size="xs" onClick={addOffice}><Plus className="w-3.5 h-3.5 mr-1" /> Add Location Card</Button>
          </div>

          <div className="space-y-5">
            {offices.map((office, i) => {
              const details = parseAddressValue(office.value);
              const isHq = !!details.is_primary;

              return (
                <div 
                  key={i} 
                  className={`glass-card p-5 border transition-all duration-300 relative rounded-2xl ${
                    isHq 
                      ? "border-amber-500/30 bg-amber-500/[0.015] shadow-md" 
                      : office.is_active 
                        ? "border-border/60 hover:border-primary/30" 
                        : "border-border/30 bg-secondary/10 opacity-70"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    {/* Left Column: Office Meta & Active Switch */}
                    <div className="md:col-span-3 space-y-3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border/45 pb-3 md:pb-0 md:pr-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office Label</label>
                          <input 
                            value={office.label} 
                            onChange={(e) => updateOfficeField(i, "label", e.target.value)} 
                            placeholder="e.g. United Kingdom Office"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground outline-none" 
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              office.is_active 
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}>
                              {office.is_active ? "Active" : "Paused"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isHq) {
                                  toast.error("Primary Headquarters address cannot be paused!");
                                  return;
                                }
                                updateOfficeField(i, "is_active", !office.is_active);
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                office.is_active ? "bg-emerald-500" : "bg-muted"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                  office.is_active ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <button 
                          type="button"
                          onClick={() => removeOffice(i)} 
                          className="inline-flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Office
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Detailed parameters */}
                    <div className="md:col-span-9 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        
                        {/* Address String */}
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Full Address</label>
                            {isHq ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Headquarters (HQ)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateOfficeDetails(i, "is_primary", true)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-amber-500 transition-colors"
                              >
                                <StarOff className="w-3 h-3 text-muted-foreground/60" /> Mark as Headquarters
                              </button>
                            )}
                          </div>
                          <textarea 
                            value={details.address} 
                            onChange={(e) => updateOfficeDetails(i, "address", e.target.value)} 
                            placeholder="Full single-line comma separated address..."
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-sans text-foreground mt-1 min-h-[50px] outline-none"
                          />
                        </div>

                        {/* Country Flag + Subtitle */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Country Flag Emoji / Code</label>
                          <input 
                            value={details.flag} 
                            onChange={(e) => updateOfficeDetails(i, "flag", e.target.value)} 
                            placeholder="e.g. 🇺🇸"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office Type / Subtitle</label>
                          <input 
                            value={details.office_type} 
                            onChange={(e) => updateOfficeDetails(i, "office_type", e.target.value)} 
                            placeholder="e.g. Corporate Headquarters"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>

                        {/* Phone + WhatsApp override for this office */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office Phone (Optional)</label>
                          <input 
                            value={details.phone} 
                            onChange={(e) => updateOfficeDetails(i, "phone", e.target.value)} 
                            placeholder="e.g. +1 (646) 884-0271"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Office WhatsApp (Optional)</label>
                          <input 
                            value={details.whatsapp} 
                            onChange={(e) => updateOfficeDetails(i, "whatsapp", e.target.value)} 
                            placeholder="e.g. +1 (646) 884-0271"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>

                        {/* Visit Policy + Notice */}
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visit Policy</label>
                          <input 
                            value={details.visit_policy} 
                            onChange={(e) => updateOfficeDetails(i, "visit_policy", e.target.value)} 
                            placeholder="e.g. Appointment Only"
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notice (Optional)</label>
                          <input 
                            value={details.notice} 
                            onChange={(e) => updateOfficeDetails(i, "notice", e.target.value)} 
                            placeholder="Documents and parcels can be received..."
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>

                        {/* WhatsApp Pre-fill */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">WhatsApp Pre-fill Text</label>
                          <input 
                            value={details.whatsappPreFill} 
                            onChange={(e) => updateOfficeDetails(i, "whatsappPreFill", e.target.value)} 
                            placeholder="Hello Dynime, I would like to schedule an appointment..."
                            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground mt-1 outline-none" 
                          />
                        </div>

                        {/* Capabilities */}
                        <div className="sm:col-span-2 flex flex-wrap items-center gap-4 bg-muted/20 p-2.5 rounded-lg border border-border/40 mt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={details.receives_documents} 
                              onChange={(e) => updateOfficeDetails(i, "receives_documents", e.target.checked)} 
                              className="rounded accent-emerald-500 h-3.5 w-3.5" 
                            />
                            <span>Receives Documents</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={details.receives_parcels} 
                              onChange={(e) => updateOfficeDetails(i, "receives_parcels", e.target.checked)} 
                              className="rounded accent-emerald-500 h-3.5 w-3.5" 
                            />
                            <span>Receives Parcels</span>
                          </label>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default AdminContactInfo;
