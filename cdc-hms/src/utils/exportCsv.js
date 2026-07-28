// Builds a CSV from rows and triggers a browser download.
// The BOM prefix makes Excel open UTF-8 content correctly.
export const downloadCsv = (filename, headers, rows) => {
  const escapeCell = (value) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Builds ONE Excel workbook with several sheets, no library. Uses the
// SpreadsheetML/HTML format Excel understands: an <xml> block naming the
// worksheets, then one <table> per sheet in the same order. Opens in Excel
// (and Numbers/LibreOffice) with each report on its own tab. Excel may show a
// one-time "different format" prompt \u2014 the tradeoff for zero dependencies.
// sheets: [{ name, headers: [], rows: [[]] }]
export const downloadWorkbook = (filename, sheets) => {
  const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const worksheetNames = sheets
    .map((s, i) =>
      `<x:ExcelWorksheet><x:Name>${esc((s.name || `Sheet${i + 1}`).slice(0, 31))}</x:Name>` +
      `<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`)
    .join('');

  const table = (s) => {
    const head = `<tr>${(s.headers || []).map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
    const body = (s.rows || [])
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table border="1">${head}${body}</table>`;
  };

  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
    'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">' +
    `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>${worksheetNames}` +
    '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>' +
    sheets.map(table).join('<br style="page-break-before:always" />') +
    '</body></html>';

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};
