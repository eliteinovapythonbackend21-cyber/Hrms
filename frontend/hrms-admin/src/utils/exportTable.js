import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// exportColumns: [{ header: string, accessor: (row) => string|number }]

function cellText(exportColumns, row) {
  return exportColumns.map((col) => {
    const value = col.accessor(row);

    return value === null ||
      value === undefined ||
      value === ""
      ? "-"
      : String(value);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// CSV opens natively in Excel/Sheets/Numbers with full fidelity for tabular
// data — no extra dependency.
function toCsvValue(value) {
  const str = String(value);

  return /[",\n]/.test(str)
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function exportToExcel(
  filename,
  exportColumns,
  rows
) {
  const header =
    exportColumns.map(
      (c) => c.header
    );

  const lines = [
    header,
    ...rows.map((row) =>
      cellText(
        exportColumns,
        row
      )
    ),
  ].map((line) =>
    line
      .map(toCsvValue)
      .join(",")
  );

  // Leading BOM so Excel detects UTF-8.
  const blob = new Blob(
    ["﻿" + lines.join("\r\n")],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  downloadBlob(
    blob,
    `${filename}.csv`
  );
}

export function exportToPDF(
  filename,
  title,
  exportColumns,
  rows
) {
  const landscape =
    exportColumns.length > 6;

  const doc = new jsPDF({
    orientation: landscape
      ? "landscape"
      : "portrait",
  });

  doc.setFontSize(14);

  doc.text(
    title,
    14,
    15
  );

  doc.setFontSize(9);

  doc.setTextColor(120);

  doc.text(
    `Generated ${new Date().toLocaleString()}`,
    14,
    21
  );

  autoTable(doc, {
    head: [
      exportColumns.map(
        (c) => c.header
      ),
    ],

    body: rows.map((row) =>
      cellText(
        exportColumns,
        row
      )
    ),

    startY: 26,

    styles: {
      fontSize: 8,
      cellPadding: 3,
    },

    headStyles: {
      fillColor: [212, 148, 31],
      textColor: 255,
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save(
    `${filename}.pdf`
  );
}