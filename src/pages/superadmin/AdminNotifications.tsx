import { Navigate } from "react-router-dom";
import { z } from "zod";

const nonEmptyString = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`);

const summaryRowSchema = z.object({
  label: nonEmptyString("Row label"),
  value: nonEmptyString("Row value"),
});

const TEMPLATE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "admin-new-submission": z.object({
    formType: nonEmptyString("Form type"),
    customerName: nonEmptyString("Customer name"),
    customerEmail: nonEmptyString("Customer email").email("Customer email must be a valid email"),
    submission: z.array(summaryRowSchema).min(1, "Submission must include at least one row"),
    adminUrl: z.string().trim().url("Admin URL must be a valid URL").optional().or(z.literal("")),
  }),
  "contact-confirmation": z.object({
    name: nonEmptyString("Recipient name"),
    formType: nonEmptyString("Form type"),
    summary: z.array(summaryRowSchema).min(1, "Summary must include at least one row"),
  }),
  "order-status-update": z.object({
    name: nonEmptyString("Recipient name"),
    status: z.enum(["received", "in_progress", "completed"], {
      errorMap: () => ({ message: "Status must be received, in_progress, or completed" }),
    }),
    invoiceNumber: nonEmptyString("Invoice number"),
    primaryService: nonEmptyString("Primary service"),
    total: nonEmptyString("Total"),
  }),
  "service-renewal-reminder": z.object({
    name: nonEmptyString("Recipient name"),
    serviceName: nonEmptyString("Service name"),
    renewalDate: nonEmptyString("Renewal date"),
    daysRemaining: z.number({ invalid_type_error: "Days remaining must be a number" }).int().nonnegative(),
    amount: nonEmptyString("Amount"),
    cycle: nonEmptyString("Billing cycle"),
  }),
};

const TEST_TEMPLATES: Record<string, { label: string; required: string[]; data: Record<string, any> }> = {
  "admin-new-submission": {
    label: "Admin alert — new submission",
    required: ["formType", "customerName", "customerEmail", "submission"],
    data: {
      formType: "quote request",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      submission: [
        { label: "Service", value: "Web Development" },
        { label: "Budget", value: "$2,000 – $5,000" },
        { label: "Message", value: "This is a test email from your admin panel." },
      ],
      adminUrl: "https://dynime.com/superadmin/submissions",
    },
  },
  "contact-confirmation": {
    label: "Customer — contact / quote confirmation",
    required: ["name", "formType", "summary"],
    data: {
      name: "Jane Doe",
      formType: "quote request",
      summary: [
        { label: "Service", value: "Web Development" },
        { label: "Budget", value: "$2,000 – $5,000" },
      ],
    },
  },
  "order-status-update": {
    label: "Customer — order status update",
    required: ["name", "status", "invoiceNumber", "primaryService", "total"],
    data: {
      name: "Jane Doe",
      status: "in_progress",
      invoiceNumber: "INV-2026-000123",
      primaryService: "Web Development",
      total: "$2,500.00",
    },
  },
  "service-renewal-reminder": {
    label: "Customer — service renewal reminder",
    required: ["name", "serviceName", "renewalDate", "daysRemaining", "amount", "cycle"],
    data: {
      name: "Alex",
      serviceName: "USA LLC Annual Compliance",
      renewalDate: "May 20, 2026",
      daysRemaining: 7,
      amount: "$199.00",
      cycle: "yearly",
    },
  },
};

export function validateTemplateData(
  templateName: string,
  data: Record<string, any>,
): { ok: true } | { ok: false; errors: string[] } {
  const schema = TEMPLATE_SCHEMAS[templateName];
  if (!schema) return { ok: false, errors: [`Unknown template "${templateName}"`] };
  const result = schema.safeParse(data);
  if (result.success) return { ok: true };
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { ok: false, errors };
}

/**
 * AdminNotifications — redirects to the unified Email Portal.
 * All SMTP settings, sender identities, notification preferences and email logs
 * are managed from /superadmin/email-portal.
 */
const AdminNotifications = () => {
  return <Navigate to="/superadmin/email-portal?tab=alerts" replace />;
};

export default AdminNotifications;
