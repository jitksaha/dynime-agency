import SiteLogo from "@/components/shared/SiteLogo";
import { useSiteSettings } from "@/hooks/use-data";
import type { PayslipBreakdown } from "@/lib/payslip-math";
import { SIGNATURE_FONTS } from "@/components/admin/AgreementPreview";

const sigHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// Most professional auto-signature form: "First Last" when possible.
const buildSignatureName = (fullName: string) => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const EmployeeAcceptanceBlock = ({
  fullName,
  joiningDate,
  seed,
}: {
  fullName: string;
  joiningDate?: string | null;
  seed: string;
}) => {
  const signatureName = buildSignatureName(fullName);
  const fontKey =
    SIGNATURE_FONTS[sigHash(seed || fullName) % SIGNATURE_FONTS.length].key;
  const signatureSize =
    fontKey === "Allison" || fontKey === "Great Vibes" ? "text-5xl" : "text-4xl";
  const dateLabel = joiningDate
    ? new Date(joiningDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  return (
    <div>
      {/* Off-screen preloader so signature fonts are decoded before print */}
      <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
        {SIGNATURE_FONTS.map((f) => (
          <span key={f.key} style={{ fontFamily: `'${f.key}', cursive`, fontSize: 48 }}>
            Signature
          </span>
        ))}
      </div>
      <div className="h-12 mb-2 relative">
        {signatureName && (
          <span
            className={`absolute left-1 bottom-0 ${signatureSize} text-neutral-900 select-none pointer-events-none`}
            style={{ fontFamily: `'${fontKey}', cursive`, lineHeight: 1 }}
          >
            {signatureName}
          </span>
        )}
      </div>
      <div className="border-t border-neutral-400 pt-2">
        <div className="text-xs font-semibold">{fullName}</div>
        <div className="text-[11px] text-neutral-500">Employee Acceptance</div>
        <div className="text-[11px] text-neutral-500">Date: {dateLabel}</div>
      </div>
    </div>
  );
};

export type HRDocKind = "offer" | "agreement" | "payslip" | "experience" | "relieving" | "promotion" | "termination";

export interface HRDocPreviewProps {
  kind: HRDocKind;
  docNumber?: string;
  issueDate: string; // ISO date
  effectiveDate?: string;
  periodMonth?: string; // YYYY-MM for payslip
  employee: {
    full_name: string;
    employee_code?: string | null;
    designation?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    joining_date?: string | null;
    last_working_day?: string | null;
    employment_type?: string | null;
    job_type?: string | null;
    work_location?: string | null;
    reporting_to?: string | null;
    currency?: string | null;
    gross_salary?: number | null;
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    allowances?: { label: string; type: "fixed" | "percent"; value: number }[] | null;
    deductions?: { label: string; type: "fixed" | "percent"; value: number }[] | null;
  };
  // Offer / Agreement
  bodyText?: string;
  clauses?: { title: string; body: string }[];
  signatoryName?: string;
  signatoryTitle?: string;
  validityDate?: string;
  // Authorised-signatory signature: typed name (rendered in a handwriting
  // font) or an uploaded signature image (PNG/JPG data URL). When either is
  // provided, it replaces the "System generated" placeholder.
  signatureTypedName?: string;
  signatureImageUrl?: string;
  // Payslip
  payslip?: PayslipBreakdown;
  // Promotion / Termination Details
  revisedDesignation?: string;
  revisedGrossSalary?: number;
  noticePeriodDays?: number;
  severanceAmount?: number;
  reason?: string;
}

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return s; }
};

const fmtMoney = (n: number, c = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n || 0);
  } catch { return `${c} ${(n || 0).toFixed(2)}`; }
};

const TITLES: Record<HRDocKind, string> = {
  offer: "Letter of Offer",
  agreement: "Employment Agreement",
  payslip: "Payslip",
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  promotion: "Promotion Letter",
  termination: "Termination Letter",
};

const computeTenure = (joining?: string | null, last?: string | null) => {
  if (!joining) return "—";
  const start = new Date(joining);
  const end = last ? new Date(last) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} year${y > 1 ? "s" : ""}` : "", m ? `${m} month${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ") || "less than a month";
};

const HRDocumentPreview = ({
  kind,
  docNumber,
  issueDate,
  effectiveDate,
  periodMonth,
  employee,
  bodyText,
  clauses = [],
  signatoryName = "Authorised Signatory",
  signatoryTitle = "Director, Dynime Inc.",
  validityDate,
  signatureTypedName,
  signatureImageUrl,
  payslip,
  revisedDesignation,
  revisedGrossSalary,
  noticePeriodDays,
  severanceAmount,
  reason,
}: HRDocPreviewProps) => {
  const { data: settings } = useSiteSettings();
  const companyName = settings?.company_name || "Dynime Inc.";
  const companyAddress = settings?.company_address || "";
  const rawEmail = settings?.contact_email || "support@dynime.com";
  const companyEmail = /hello@dynime\.com/i.test(rawEmail) ? "support@dynime.com" : rawEmail;
  const companyWeb = settings?.site_url || "https://dynime.com";
  const currency = employee.currency || "USD";
  const base = Number(employee.gross_salary || 0);
  const allowanceRows = (employee.allowances || []).map((a) => ({
    label: a.label,
    detail: a.type === "percent" ? `${a.value}% of basic` : "Fixed",
    amount: a.type === "percent" ? (base * (Number(a.value) || 0)) / 100 : Number(a.value) || 0,
  }));
  const deductionRows = (employee.deductions || []).map((d) => {
    const grossWithAllowances = base + allowanceRows.reduce((s, r) => s + r.amount, 0);
    return {
      label: d.label,
      detail: d.type === "percent" ? `${d.value}% of gross` : "Fixed",
      amount: d.type === "percent" ? (grossWithAllowances * (Number(d.value) || 0)) / 100 : Number(d.value) || 0,
    };
  });
  const totalAllowances = allowanceRows.reduce((s, r) => s + r.amount, 0);
  const totalDeductions = deductionRows.reduce((s, r) => s + r.amount, 0);
  const ctc = base + totalAllowances;
  const netMonthly = ctc - totalDeductions;

  const CompensationBreakdown = () => (
    <div className="mb-4 grid grid-cols-2 gap-4">
      <div className="border border-neutral-200 rounded-md overflow-hidden">
        <div className="bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">Earnings (Monthly)</div>
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-t border-neutral-100">
              <td className="px-3 py-1.5">Basic salary</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(base, currency)}</td>
            </tr>
            {allowanceRows.length === 0 ? (
              <tr className="border-t border-neutral-100">
                <td className="px-3 py-1.5 text-neutral-400 italic" colSpan={2}>N/A — no allowances configured</td>
              </tr>
            ) : (
              allowanceRows.map((r, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">
                    {r.label}
                    <span className="ml-1 text-[10px] text-neutral-400">({r.detail})</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(r.amount, currency)}</td>
                </tr>
              ))
            )}
            <tr className="border-t border-neutral-300 font-semibold bg-neutral-50">
              <td className="px-3 py-1.5">Gross (CTC)</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(ctc, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border border-neutral-200 rounded-md overflow-hidden">
        <div className="bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">Deductions (Monthly)</div>
        <table className="w-full text-xs">
          <tbody>
            {deductionRows.length === 0 ? (
              <tr className="border-t border-neutral-100">
                <td className="px-3 py-1.5 text-neutral-400 italic" colSpan={2}>N/A — no deductions configured</td>
              </tr>
            ) : (
              deductionRows.map((r, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">
                    {r.label}
                    <span className="ml-1 text-[10px] text-neutral-400">({r.detail})</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(r.amount, currency)}</td>
                </tr>
              ))
            )}
            <tr className="border-t border-neutral-300 font-semibold bg-neutral-50">
              <td className="px-3 py-1.5">Net take-home</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(netMonthly, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="hr-doc bg-white text-neutral-900 p-10 print:p-10 mx-auto" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* Branded header */}
      <header className="flex items-start justify-between border-b border-neutral-200 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <SiteLogo variant="light" className="h-12 w-auto" />
          <div>
            <div className="text-base font-bold tracking-tight">{companyName}</div>
            {companyAddress && <div className="text-[11px] text-neutral-500 max-w-[60ch]">{companyAddress}</div>}
            <div className="text-[11px] text-neutral-500">{companyEmail} · {companyWeb}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">{TITLES[kind]}</div>
          {docNumber && <div className="text-sm font-mono font-semibold mt-1">{docNumber}</div>}
          {(kind === "offer" || kind === "agreement") && employee.joining_date ? (
            <div className="text-[11px] text-neutral-500 mt-0.5">Joining Date: {fmtDate(employee.joining_date)}</div>
          ) : (
            <div className="text-[11px] text-neutral-500 mt-0.5">Issued: {fmtDate(issueDate)}</div>
          )}
          {periodMonth && <div className="text-[11px] text-neutral-500">Period: {fmtDate(periodMonth + "-01")}</div>}
        </div>
      </header>

      {/* Greeting / addressee */}
      {kind !== "payslip" && (
        <section className="mb-5">
          <div className="text-sm font-semibold">{employee.full_name}</div>
          {employee.designation && <div className="text-xs text-neutral-600">{employee.designation}</div>}
          {employee.email && <div className="text-xs text-neutral-500">{employee.email}</div>}
          {employee.address && <div className="text-xs text-neutral-500 max-w-[60ch] whitespace-pre-line">{employee.address}</div>}
        </section>
      )}

      {/* === OFFER === */}
      {kind === "offer" && (
        <>
          <h1 className="text-xl font-bold mb-3">Dear {employee.full_name.split(" ")[0]},</h1>
          <p className="text-sm leading-relaxed mb-4">
            We are delighted to offer you the position of <strong>{employee.designation || "—"}</strong>
            {employee.department ? ` in the ${employee.department} department` : ""} at {companyName}.
            This letter sets out the principal terms of your employment.
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
            <div><span className="text-neutral-500">Designation:</span> <strong>{employee.designation || "—"}</strong></div>
            <div><span className="text-neutral-500">Department:</span> <strong>{employee.department || "—"}</strong></div>
            <div><span className="text-neutral-500">Employment type:</span> <strong className="capitalize">{employee.employment_type || "—"}</strong></div>
            <div><span className="text-neutral-500">Job type:</span> <strong>{employee.job_type || "—"}</strong></div>
            <div><span className="text-neutral-500">Work location:</span> <strong>{employee.work_location || "—"}</strong></div>
            <div><span className="text-neutral-500">Joining date:</span> <strong>{fmtDate(employee.joining_date)}</strong></div>
            <div><span className="text-neutral-500">Reporting to:</span> <strong>{employee.reporting_to || "—"}</strong></div>
            <div className="col-span-2"><span className="text-neutral-500">Gross compensation:</span> <strong>{fmtMoney(Number(employee.gross_salary || 0), currency)} / month</strong></div>
          </div>
          <CompensationBreakdown />
          {bodyText && <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{bodyText}</p>}
          {validityDate && (
            <p className="text-xs text-neutral-600 italic mb-4">This offer is valid until {fmtDate(validityDate)}. To accept, please sign and return a copy to {companyEmail}.</p>
          )}
        </>
      )}

      {/* === EMPLOYMENT AGREEMENT === */}
      {kind === "agreement" && (
        <>
          <p className="text-sm leading-relaxed mb-4">
            This Employment Agreement (the &quot;Agreement&quot;) is entered into on {fmtDate(effectiveDate || issueDate)} between
            {" "}<strong>{companyName}</strong> (the &quot;Company&quot;) and <strong>{employee.full_name}</strong> (the &quot;Employee&quot;).
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
            <div><span className="text-neutral-500">Designation:</span> <strong>{employee.designation || "—"}</strong></div>
            <div><span className="text-neutral-500">Joining date:</span> <strong>{fmtDate(employee.joining_date)}</strong></div>
            <div><span className="text-neutral-500">Employment type:</span> <strong className="capitalize">{employee.employment_type || "—"}</strong></div>
            <div><span className="text-neutral-500">Job type:</span> <strong>{employee.job_type || "—"}</strong></div>
            <div><span className="text-neutral-500">Work location:</span> <strong>{employee.work_location || "—"}</strong></div>
            <div><span className="text-neutral-500">Gross salary:</span> <strong>{fmtMoney(Number(employee.gross_salary || 0), currency)} / month</strong></div>
          </div>
          <CompensationBreakdown />
          {bodyText && <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{bodyText}</p>}
          <ol className="text-sm space-y-3 mb-4">
            {clauses.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold shrink-0 min-w-[1.25rem]">{i + 1}.</span>
                <div className="flex-1">
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-neutral-700 whitespace-pre-line">{c.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* === EXPERIENCE / RELIEVING === */}
      {(kind === "experience" || kind === "relieving") && (
        <>
          <h1 className="text-base font-bold mb-3 text-center uppercase tracking-wider">To Whom It May Concern</h1>
          <p className="text-sm leading-relaxed mb-4">
            This is to certify that <strong>{employee.full_name}</strong>
            {employee.employee_code ? ` (Employee Code: ${employee.employee_code})` : ""} was employed with {companyName} as
            {" "}<strong>{employee.designation || "—"}</strong>
            {employee.department ? ` in the ${employee.department} department` : ""} from
            {" "}<strong>{fmtDate(employee.joining_date)}</strong> to <strong>{fmtDate(employee.last_working_day || issueDate)}</strong>,
            a total tenure of <strong>{computeTenure(employee.joining_date, employee.last_working_day)}</strong>.
          </p>
          <p className="text-sm leading-relaxed mb-4">
            During their tenure, we found them to be sincere, hardworking and professional. Their conduct and performance throughout the period of service were satisfactory.
          </p>
          {kind === "relieving" && (
            <p className="text-sm leading-relaxed mb-4">
              They have been duly relieved of all their duties and responsibilities with effect from <strong>{fmtDate(employee.last_working_day || issueDate)}</strong>. All company dues have been settled.
            </p>
          )}
          {bodyText && <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{bodyText}</p>}
          <p className="text-sm leading-relaxed mb-4">We wish them the very best in their future endeavours.</p>
        </>
      )}

      {/* === PROMOTION === */}
      {kind === "promotion" && (
        <>
          <h1 className="text-xl font-bold mb-3">Dear {employee.full_name.split(" ")[0]},</h1>
          <p className="text-sm leading-relaxed mb-4">
            We are pleased to inform you that you have been promoted to the position of <strong>{revisedDesignation || "—"}</strong>
            {employee.department ? ` in the ${employee.department} department` : ""} at {companyName}.
            This promotion is effective from <strong>{fmtDate(effectiveDate || issueDate)}</strong>.
          </p>
          <p className="text-sm leading-relaxed mb-4">
            With this promotion, your revised gross compensation will be <strong>{fmtMoney(Number(revisedGrossSalary || 0), currency)} / month</strong>.
            All other terms and conditions of your employment contract remain in full force and effect.
          </p>
          {bodyText && <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{bodyText}</p>}
          <p className="text-sm leading-relaxed mb-4">
            We would like to take this opportunity to thank you for your hard work, dedication, and valuable contributions to the company, and we look forward to your continued success in your new role.
          </p>
        </>
      )}

      {/* === TERMINATION === */}
      {kind === "termination" && (
        <>
          <h1 className="text-xl font-bold mb-3">Dear {employee.full_name.split(" ")[0]},</h1>
          <p className="text-sm leading-relaxed mb-4">
            This letter is to formally notify you that your employment with {companyName} is terminated,
            effective from <strong>{fmtDate(effectiveDate || issueDate)}</strong>. Your final working day will be <strong>{fmtDate(employee.last_working_day || effectiveDate || issueDate)}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
            <div><span className="text-neutral-500">Effective Date:</span> <strong>{fmtDate(effectiveDate || issueDate)}</strong></div>
            <div><span className="text-neutral-500">Last Working Day:</span> <strong>{fmtDate(employee.last_working_day || effectiveDate || issueDate)}</strong></div>
            <div><span className="text-neutral-500">Notice Period:</span> <strong>{noticePeriodDays ? `${noticePeriodDays} days` : "—"}</strong></div>
            <div><span className="text-neutral-500">Severance Pay:</span> <strong>{severanceAmount ? fmtMoney(Number(severanceAmount), currency) : "N/A"}</strong></div>
            {reason && <div className="col-span-2"><span className="text-neutral-500">Reason for Termination:</span> <strong className="capitalize">{reason.replace(/_/g, " ")}</strong></div>}
          </div>
          {bodyText && <p className="text-sm leading-relaxed whitespace-pre-line mb-4">{bodyText}</p>}
          <p className="text-sm leading-relaxed mb-4">
            Please ensure that all company property, including keys, access cards, and devices, are returned to the HR department on or before your last working day.
            Your final settlement, including any accrued benefits and severance pay, will be processed and disbursed in accordance with company policy and legal regulations.
          </p>
          <p className="text-sm leading-relaxed mb-4">We thank you for your service and wish you the best in your future career.</p>
        </>
      )}

      {/* === PAYSLIP === */}
      {kind === "payslip" && payslip && (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-4">
            <div><span className="text-neutral-500">Employee:</span> <strong>{employee.full_name}</strong></div>
            <div><span className="text-neutral-500">Employee Code:</span> <strong>{employee.employee_code || "—"}</strong></div>
            <div><span className="text-neutral-500">Designation:</span> <strong>{employee.designation || "—"}</strong></div>
            <div><span className="text-neutral-500">Department:</span> <strong>{employee.department || "—"}</strong></div>
            <div><span className="text-neutral-500">Job type:</span> <strong>{employee.job_type || "—"}</strong></div>
            <div><span className="text-neutral-500">Joining date:</span> <strong>{fmtDate(employee.joining_date)}</strong></div>
            <div><span className="text-neutral-500">Pay period:</span> <strong>{periodMonth ? fmtDate(periodMonth + "-01").replace(/\s\d+,\s/, " ") : fmtDate(issueDate)}</strong></div>
            {employee.bank_name && <div><span className="text-neutral-500">Bank:</span> <strong>{employee.bank_name}</strong></div>}
            {employee.bank_account_number && <div><span className="text-neutral-500">A/C No:</span> <strong>{employee.bank_account_number}</strong></div>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-neutral-200 rounded-md overflow-hidden">
              <div className="bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">Earnings</div>
              <table className="w-full text-sm">
                <tbody>
                  {payslip.earnings.map((e, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className="px-3 py-1.5">{e.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(e.amount, currency)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-neutral-300 font-semibold bg-neutral-50">
                    <td className="px-3 py-2">Gross Earnings</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(payslip.gross, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="border border-neutral-200 rounded-md overflow-hidden">
              <div className="bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">Deductions</div>
              <table className="w-full text-sm">
                <tbody>
                  {payslip.deductions.length === 0 && (
                    <tr><td className="px-3 py-1.5 text-neutral-400 italic" colSpan={2}>No deductions</td></tr>
                  )}
                  {payslip.deductions.map((d, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className="px-3 py-1.5">{d.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(d.amount, currency)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-neutral-300 font-semibold bg-neutral-50">
                    <td className="px-3 py-2">Total Deductions</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(payslip.totalDeductions, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-2 border-neutral-900 rounded-md p-4 flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Net Pay</div>
              <div className="text-xs text-neutral-600 italic mt-1">{payslip.netInWords}</div>
            </div>
            <div className="text-3xl font-bold tabular-nums">{fmtMoney(payslip.net, currency)}</div>
          </div>
          <p className="text-[10px] text-neutral-500 italic">This is a computer-generated payslip and does not require a signature.</p>
        </>
      )}

      {/* Signatures (non-payslip) */}
      {kind !== "payslip" && (
        <section className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="h-12 mb-2 flex items-end">
              {signatureImageUrl ? (
                <img
                  src={signatureImageUrl}
                  alt="Authorised signature"
                  className="max-h-12 max-w-[200px] object-contain object-left-bottom"
                  crossOrigin="anonymous"
                />
              ) : signatureTypedName ? (
                <span
                  className="text-4xl text-neutral-900 select-none pointer-events-none"
                  style={{ fontFamily: `'Allison', 'Great Vibes', cursive`, lineHeight: 1 }}
                >
                  {signatureTypedName}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 italic">
                  System generated — no signature required
                </span>
              )}
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <div className="text-xs font-semibold">{signatoryName}</div>
              <div className="text-[11px] text-neutral-500">{signatoryTitle}</div>
              <div className="text-[11px] text-neutral-500">Date: {fmtDate(employee.joining_date || issueDate)}</div>
            </div>
          </div>
          {kind === "offer" || kind === "agreement" ? (
            <EmployeeAcceptanceBlock
              fullName={employee.full_name}
              joiningDate={employee.joining_date}
              seed={`${kind}|${employee.employee_code || employee.full_name}`}
            />
          ) : null}
        </section>
      )}

      {/* Footer — three-column branded strip with accent bar */}
      <footer className="mt-10">
        <div className="h-[3px] w-full bg-gradient-to-r from-neutral-900 via-neutral-600 to-neutral-900 rounded-full" />
        <div className="mt-3 grid grid-cols-3 gap-4 items-start text-[10px] text-neutral-500">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-400">Issued by</span>
            <span className="text-[11px] font-semibold text-neutral-700 leading-tight">{companyName}</span>
            {companyAddress && (
              <span className="text-[9.5px] text-neutral-500 leading-snug line-clamp-2">{companyAddress}</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 items-center text-center">
            <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-400">Contact</span>
            <a href={`mailto:${companyEmail}`} className="text-[11px] font-medium text-neutral-700 no-underline">
              {companyEmail}
            </a>
            <span className="text-[9.5px] text-neutral-500">{companyWeb.replace(/^https?:\/\//, "")}</span>
          </div>
          <div className="flex flex-col gap-0.5 items-end text-right">
            <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-400">Reference</span>
            {docNumber && (
              <span className="text-[11px] font-mono font-semibold text-neutral-800 tracking-wide">{docNumber}</span>
            )}
            <span className="text-[9.5px] text-neutral-500">
              {TITLES[kind]}{issueDate ? ` · ${fmtDate(issueDate)}` : ""}
            </span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-[9px] text-neutral-400">
          <span>This is an electronically generated document and is valid without a physical signature.</span>
          <span>© {new Date().getFullYear()} {companyName}. Confidential.</span>
        </div>
      </footer>
    </div>
  );
};

export default HRDocumentPreview;
