/**
 * business-config.ts
 *
 * Centralized business configuration for Dynime LLC.
 * Provides fallback defaults and helpers to extract dynamic settings from the DB.
 */

export interface OfficeLocation {
  name: string;
  flag: string;
  type: string;
  address: string;
  mailReceiving: {
    available: boolean;
    details?: string;
  };
  purpose: string[];
  phone: string;
  whatsapp: string;
  whatsappPreFill: string;
  visit: string;
  notice?: string;
  isPlaceholder?: boolean;
  is_primary?: boolean;
}

// Fallback configuration if DB query is loading or empty
export const STATIC_BUSINESS_DEFAULTS = {
  companyName: "Dynime LLC",
  legalName: "Dynime LLC",
  email: "support@dynime.com",
  phone: "+1 (646) 884-0271",
  whatsapp: "+1 (646) 884-0271",
  
  socialLinks: {
    facebook: "https://facebook.com/dynime",
    twitter: "https://twitter.com/dynime",
    linkedin: "https://linkedin.com/company/dynime",
    instagram: "https://instagram.com/dynime",
    youtube: "https://youtube.com/dynime"
  },

  offices: [
    {
      name: "New York, USA (Headquarters)",
      flag: "🇺🇸",
      type: "Corporate Headquarters",
      address: "244 5th Ave, Suite #1964, New York, NY 10001, USA",
      mailReceiving: {
        available: false,
        details: "Mail Receiving Not Available"
      },
      purpose: ["Corporate Headquarters", "Client Meetings", "Sales", "Business Operations"],
      phone: "+1 (646) 884-0271",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI would like to schedule an appointment at your New York office.\n\nThank you.",
      visit: "Appointment Only",
      is_primary: true
    },
    {
      name: "New Mexico, USA",
      flag: "🇺🇸",
      type: "Registered Business Address",
      address: "Address will be updated soon.",
      mailReceiving: {
        available: true,
        details: "Receives Documents & Parcels"
      },
      purpose: ["Registered Agent Address"],
      phone: "+1 (646) 884-0271",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI have a question about your New Mexico entity.\n\nThank you.",
      visit: "Appointment Only",
      isPlaceholder: true
    },
    {
      name: "Florida, USA",
      flag: "🇺🇸",
      type: "Mail & Parcel Receiving Center",
      address: "4283 Express Lane, Suite BD1724, Sarasota, FL 34249, USA",
      mailReceiving: {
        available: true,
        details: "Receives Documents & Parcels"
      },
      purpose: ["Mail & Parcel Receiving", "Logistics"],
      phone: "+1 (941) 538-6941",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI have an inquiry regarding a parcel at the Florida Mail Center.\n\nThank you.",
      visit: "Appointment Only",
      notice: "Documents and parcels can be received at this location."
    },
    {
      name: "United Kingdom Office",
      flag: "🇬🇧",
      type: "UK Office",
      address: "Unit 9, Skyport Drive, Suite BD1724, West Drayton, Middlesex, UB7 0LB, United Kingdom",
      mailReceiving: {
        available: true,
        details: "Receives Documents & Parcels"
      },
      purpose: ["UK Office", "Mail & Parcel Receiving"],
      phone: "+44 0175 321 0551",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI would like to schedule an appointment at your United Kingdom office.\n\nThank you.",
      visit: "Appointment Only",
      notice: "Documents and parcels can be received at this location."
    },
    {
      name: "Bangladesh Office",
      flag: "🇧🇩",
      type: "Bangladesh Office",
      address: "Plot – 3 & 5, bti Celebration Point, Rd No 113/A, Gulshan, Dhaka-1212, Bangladesh",
      mailReceiving: {
        available: true,
        details: "Receives Documents & Parcels"
      },
      purpose: ["Bangladesh Office", "Client Support", "Development Operations"],
      phone: "+8809658003831",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI would like to schedule an appointment at your Bangladesh office.\n\nThank you.",
      visit: "Appointment Only"
    }
  ] as OfficeLocation[]
};

// Export static copy for legacy files that import it directly
export const BUSINESS_CONFIG = STATIC_BUSINESS_DEFAULTS;

/**
 * Parses a serialized address string from database value.
 */
export const parseDbAddress = (value: string, label: string): OfficeLocation => {
  try {
    const data = JSON.parse(value);
    if (data && typeof data === "object" && ("address" in data || "office_type" in data)) {
      return {
        name: label || "Office",
        flag: data.flag || "🇺🇸",
        type: data.office_type || "Office",
        address: data.address || "",
        mailReceiving: {
          available: data.receives_documents !== false || data.receives_parcels !== false,
          details: data.receives_documents !== false ? "Receives Documents & Parcels" : "Mail Receiving Not Available"
        },
        purpose: [data.office_type || "Office"],
        phone: data.phone || STATIC_BUSINESS_DEFAULTS.phone,
        whatsapp: data.whatsapp || STATIC_BUSINESS_DEFAULTS.whatsapp,
        whatsappPreFill: data.whatsappPreFill || `Hello Dynime,\n\nI would like to schedule an appointment at your ${label}.\n\nThank you.`,
        visit: data.visit_policy || "Appointment Only",
        notice: data.notice || undefined,
        isPlaceholder: data.address === "Address will be updated soon.",
        is_primary: !!data.is_primary
      };
    }
  } catch {}
  
  // Fallback to basic text parsing if it is not JSON
  return {
    name: label || "Office",
    flag: "🇺🇸",
    type: "Office",
    address: value || "",
    mailReceiving: { available: true, details: "Receives Documents & Parcels" },
    purpose: ["Office"],
    phone: STATIC_BUSINESS_DEFAULTS.phone,
    whatsapp: STATIC_BUSINESS_DEFAULTS.whatsapp,
    whatsappPreFill: `Hello Dynime,\n\nI would like to schedule an appointment at your ${label}.\n\nThank you.`,
    visit: "Appointment Only",
    isPlaceholder: value === "Address will be updated soon.",
    is_primary: false
  };
};

/**
 * Returns the list of parsed active office locations from database rows.
 * If empty, returns static defaults.
 */
export const getActiveOffices = (dbContacts: any[] | undefined): OfficeLocation[] => {
  if (!dbContacts || !dbContacts.length) {
    return STATIC_BUSINESS_DEFAULTS.offices;
  }
  const addrRows = dbContacts.filter((c) => c.type === "address" && c.is_active);
  if (!addrRows.length) {
    return STATIC_BUSINESS_DEFAULTS.offices;
  }
  return addrRows.map((r) => parseDbAddress(r.value, r.label));
};

/**
 * Finds the designated primary headquarters office address from database rows.
 * Falls back to first active address or static NY headquarters.
 */
export const getPrimaryOffice = (dbContacts: any[] | undefined): OfficeLocation => {
  const offices = getActiveOffices(dbContacts);
  const primary = offices.find((o) => o.is_primary);
  return primary || offices[0] || STATIC_BUSINESS_DEFAULTS.offices[0];
};
