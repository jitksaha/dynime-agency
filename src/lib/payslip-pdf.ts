import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PayslipData = {
  company?: { name: string; address?: string; logo?: string };
  payslip_number?: string;
  period: { year: number; month: number };
  employee: { name: string; designation?: string; department?: string; employee_code?: string };
  currency: string;
  base_salary: number;
  allowances: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  attendance?: { present: number; absent: number; late: number; leave_paid: number; leave_unpaid: number; overtime_hours: number };
  prorate_deduction?: number;
  tax: number;
  net_pay: number;
  paid_amount?: number;
  status?: string;
};

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function downloadPayslip(d: PayslipData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const m = 40;

  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text(d.company?.name || "Dynime", m, 50);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Payslip", m, 66);
  doc.setFontSize(9);
  doc.text(d.payslip_number || "", w - m, 50, { align: "right" });
  doc.text(`${months[d.period.month - 1]} ${d.period.year}`, w - m, 66, { align: "right" });

  doc.setDrawColor(220); doc.line(m, 80, w - m, 80);

  // Employee block
  doc.setFontSize(10);
  let y = 100;
  doc.setFont("helvetica","bold"); doc.text("Employee", m, y);
  doc.setFont("helvetica","normal");
  doc.text(d.employee.name, m, y + 14);
  doc.text(`${d.employee.designation ?? ""}${d.employee.department ? " · " + d.employee.department : ""}`, m, y + 28);
  if (d.employee.employee_code) doc.text(`ID: ${d.employee.employee_code}`, m, y + 42);

  doc.setFont("helvetica","bold"); doc.text("Status", w - m - 120, y);
  doc.setFont("helvetica","normal");
  doc.text((d.status ?? "—").toUpperCase(), w - m - 120, y + 14);
  doc.text(`Net: ${d.currency} ${d.net_pay.toFixed(2)}`, w - m - 120, y + 28);

  y += 60;

  // Earnings table
  const earnings: any[] = [["Base salary", d.base_salary.toFixed(2)]];
  d.allowances.forEach(a => earnings.push([a.label, a.amount.toFixed(2)]));
  autoTable(doc, {
    startY: y,
    head: [["Earnings", "Amount"]],
    body: earnings,
    foot: [["Total earnings", (d.base_salary + d.allowances.reduce((s,a)=>s+a.amount,0)).toFixed(2)]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59] },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: m, right: m },
  });

  const dedRows: any[] = d.deductions.map(x => [x.label, x.amount.toFixed(2)]);
  if (d.prorate_deduction && d.prorate_deduction > 0) dedRows.push(["Attendance prorate", d.prorate_deduction.toFixed(2)]);
  if (d.tax && d.tax > 0) dedRows.push(["Tax", d.tax.toFixed(2)]);

  const dedTotal = d.deductions.reduce((s,x)=>s+x.amount,0) + (d.prorate_deduction ?? 0) + (d.tax ?? 0);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 12,
    head: [["Deductions", "Amount"]],
    body: dedRows.length ? dedRows : [["—", "0.00"]],
    foot: [["Total deductions", dedTotal.toFixed(2)]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [185, 28, 28] },
    footStyles: { fillColor: [254, 226, 226], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: m, right: m },
  });

  if (d.attendance) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [["Attendance", "Value"]],
      body: [
        ["Present days", String(d.attendance.present)],
        ["Absent days", String(d.attendance.absent)],
        ["Late days", String(d.attendance.late)],
        ["Paid leave", String(d.attendance.leave_paid)],
        ["Unpaid leave", String(d.attendance.leave_unpaid)],
        ["Overtime (hrs)", String(d.attendance.overtime_hours)],
      ],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: m, right: m },
    });
  }

  const fy = (doc as any).lastAutoTable.finalY + 28;
  doc.setFontSize(12); doc.setFont("helvetica","bold");
  doc.text(`Net pay: ${d.currency} ${d.net_pay.toFixed(2)}`, w - m, fy, { align: "right" });
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("This is a system-generated payslip and does not require a signature.", m, doc.internal.pageSize.getHeight() - 30);

  const fname = `payslip-${d.employee.name.replace(/\s+/g,"_")}-${d.period.year}-${String(d.period.month).padStart(2,"0")}.pdf`;
  doc.save(fname);
}
