// Service to export notes to PDF format with full styling, images, and layout preservation

export async function exportNoteToPdf(noteTitle, element, options = {}) {
  const title = (noteTitle || "Revision_Note").replace(/[/\\?%*:|"<>]/g, "_");

  // 1. If direct download via html2pdf is requested
  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const opt = {
      margin: [12, 12, 12, 12],
      filename: `${title}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    return await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.warn("Direct html2pdf generation failed, falling back to print-to-pdf:", err);
    printNoteDocument(noteTitle, element);
  }
}

export function printNoteDocument(noteTitle, element) {
  const title = noteTitle || "Revision Note";
  const contentHtml = element ? element.innerHTML : "";

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1c2130;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            font-size: 11pt;
          }
          h1, h2, h3 {
            color: #14213d;
            page-break-after: avoid;
            break-after: avoid;
          }
          h1 { font-size: 20pt; margin-bottom: 4px; }
          h2 { font-size: 15pt; margin-top: 18px; margin-bottom: 6px; }
          h3 { font-size: 12pt; margin-top: 14px; margin-bottom: 4px; }
          p { margin: 0 0 10px 0; }
          ul, ol { padding-left: 20px; margin: 6px 0 12px 0; }
          li { margin-bottom: 4px; }
          blockquote {
            border-left: 3px solid #e8a33d;
            margin: 12px 0;
            padding: 4px 14px;
            color: #555;
            font-style: italic;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .image-node-row, [data-layout="row"] {
            display: inline-block !important;
            vertical-align: top !important;
            margin: 4px !important;
          }
          .pdf-header {
            border-bottom: 2px solid #e8a33d;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .pdf-badge {
            display: inline-block;
            font-size: 9pt;
            padding: 2px 8px;
            border-radius: 12px;
            background: #f4f2ec;
            color: #555;
            margin-right: 6px;
            margin-top: 6px;
          }
          .pdf-watermark {
            font-size: 8pt;
            color: #888;
            margin-top: 8px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; font-size: 10pt; color: #e8a33d; letter-spacing: 0.5px;">
              EXAMVAULT REVISION NOTES
            </div>
            <div style="font-size: 9pt; color: #888;">
              ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <h1 style="margin-top: 8px;">${title}</h1>
          <div class="pdf-watermark">Synced with Personal Study Vault</div>
        </div>
        <div class="pdf-content">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 450);
}
