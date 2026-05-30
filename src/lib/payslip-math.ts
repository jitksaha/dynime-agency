// Pure helpers for HR payslip calculation + number-to-words formatting.

export interface PayLine {
  label: string;
  type: "fixed" | "percent";
  value: number;
  taxable?: boolean;
}

export interface PayslipBreakdown {
  basic: number;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross: number;
  totalDeductions: number;
  net: number;
  netInWords: string;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const computePayslip = (
  grossSalary: number,
  allowances: PayLine[] = [],
  deductions: PayLine[] = [],
  extraEarnings: { label: string; amount: number }[] = [],
  extraDeductions: { label: string; amount: number }[] = [],
): PayslipBreakdown => {
  const base = Number(grossSalary) || 0;
  const earnings = [
    { label: "Basic Salary", amount: round2(base) },
    ...allowances.map((a) => ({
      label: a.label,
      amount: round2(a.type === "percent" ? (base * (Number(a.value) || 0)) / 100 : Number(a.value) || 0),
    })),
    ...extraEarnings.map((e) => ({ label: e.label, amount: round2(e.amount) })),
  ];
  const gross = round2(earnings.reduce((s, e) => s + e.amount, 0));

  const ded = [
    ...deductions.map((d) => ({
      label: d.label,
      amount: round2(d.type === "percent" ? (gross * (Number(d.value) || 0)) / 100 : Number(d.value) || 0),
    })),
    ...extraDeductions.map((d) => ({ label: d.label, amount: round2(d.amount) })),
  ];
  const totalDeductions = round2(ded.reduce((s, d) => s + d.amount, 0));
  const net = round2(gross - totalDeductions);

  return {
    basic: round2(base),
    earnings,
    deductions: ded,
    gross,
    totalDeductions,
    net,
    netInWords: numberToWords(Math.floor(net)) + (net % 1 ? " and " + Math.round((net % 1) * 100) + "/100" : "") + " only",
  };
};

// Simple English number-to-words (works up to 999,999,999,999)
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below1000 = (n: number): string => {
  if (n === 0) return "";
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below1000(n % 100) : "");
};

export const numberToWords = (n: number): string => {
  if (!Number.isFinite(n)) return "Zero";
  if (n === 0) return "Zero";
  const sign = n < 0 ? "Minus " : "";
  let num = Math.abs(Math.floor(n));
  const parts: string[] = [];
  const scales = ["", "Thousand", "Million", "Billion"];
  let i = 0;
  while (num > 0 && i < scales.length) {
    const chunk = num % 1000;
    if (chunk) parts.unshift(below1000(chunk) + (scales[i] ? " " + scales[i] : ""));
    num = Math.floor(num / 1000);
    i++;
  }
  return sign + parts.join(" ").trim();
};
