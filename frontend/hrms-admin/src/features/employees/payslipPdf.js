import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)}`;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COMPANY_NAME = "HRMS";
const HEADER_COLOR = [143, 168, 150];
const LINE_COLOR = [90, 110, 96];

export function downloadPayslipPdf(payslip) {
  const { employee, period, earnings, deductions, net_pay } = payslip;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  const issueDate = new Date().toLocaleDateString();

  // Header band
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("PAYROLL SLIP", pageWidth / 2, 16, { align: "center" });
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(COMPANY_NAME, pageWidth / 2, 24, { align: "center" });

  doc.setTextColor(20, 20, 20);

  // Employee information
  let y = 42;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("Employee Information", 14, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  y += 6;
  const infoLines = [
    `Employee Name: ${employeeName || "-"}`,
    `Employee Code: ${employee.employee_code || "-"}`,
    `Designation: ${employee.designation || "-"}`,
    `Department: ${employee.department || "-"}`,
    `Bank Account: ${employee.account_number || "-"}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  doc.setFontSize(9);
  doc.text(`Payroll Period: ${periodLabel}`, pageWidth - 14, 48, { align: "right" });
  doc.text(`Issue Date: ${issueDate}`, pageWidth - 14, 53, { align: "right" });

  y += 4;
  doc.setDrawColor(...LINE_COLOR);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("Salary Breakdown", pageWidth / 2, y, { align: "center" });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Description", "Amount"]],
    body: [
      ["Basic Salary", formatCurrency(earnings.basic_salary)],
      ["Allowance", formatCurrency(earnings.allowance)],
      ["Gross Earnings", formatCurrency(earnings.gross_earnings)],
      ["Provident Fund (PF)", `-${formatCurrency(deductions.pf)}`],
      ["ESI", `-${formatCurrency(deductions.esi)}`],
      ["Total Deductions", `-${formatCurrency(deductions.total_deductions)}`],
    ],
    foot: [["Net Pay", formatCurrency(net_pay)]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200] },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [235, 235, 228], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  const afterTableY = doc.lastAutoTable.finalY + 20;
  const signatureY = afterTableY + 12;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setDrawColor(120, 120, 120);
  doc.line(14, signatureY, 90, signatureY);
  doc.text("Received by", 14, signatureY + 5);
  doc.line(pageWidth - 90, signatureY, pageWidth - 14, signatureY);
  doc.text("Authorized by", pageWidth - 90, signatureY + 5);

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.getHeight() - 10);

  doc.save(`Payslip_${employee.employee_code || employee.id}_${periodLabel.replace(" ", "_")}.pdf`);
}
