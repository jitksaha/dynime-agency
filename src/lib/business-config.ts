/**
 * business-config.ts
 *
 * Centralized business information configuration for Dynime LLC.
 * All pages, documents, footer, contact page, and PDFs must dynamically
 * load business coordinates from this single source of truth.
 */

export interface OfficeLocation {
  name: string;
  flag: string;
  type: string;
  address: string;
  mailReceiving: {
    available: boolean;
    details?: string; // e.g. "Receives Documents & Parcels"
  };
  purpose: string[];
  phone: string;
  whatsapp: string;
  whatsappPreFill: string;
  visit: string; // e.g. "Appointment Only"
  notice?: string;
  isPlaceholder?: boolean;
}

export const BUSINESS_CONFIG = {
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
      address: "244 5th Ave\nSuite #1964\nNew York, NY 10001\nUSA",
      mailReceiving: {
        available: false,
        details: "Mail Receiving Not Available"
      },
      purpose: ["Corporate Headquarters", "Client Meetings", "Sales", "Business Operations"],
      phone: "+1 (646) 884-0271",
      whatsapp: "+1 (646) 884-0271",
      whatsappPreFill: "Hello Dynime,\n\nI would like to schedule an appointment at your New York office.\n\nThank you.",
      visit: "Appointment Only"
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
      address: "4283 Express Lane\nSuite BD1724\nSarasota, FL 34249\nUSA",
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
      address: "Unit 9\nSkyport Drive\nSuite BD1724\nWest Drayton\nMiddlesex\nUB7 0LB\nUnited Kingdom",
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
