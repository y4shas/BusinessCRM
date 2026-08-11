import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface ChallanPDFData {
  challanNumber: string;
  status: string;
  createdAt: Date;
  createdBy: { name: string };
  customer: {
    name: string;
    mobile: string;
    email?: string | null;
    businessName?: string | null;
    gstNumber?: string | null;
    address?: string | null;
  };
  items: {
    productNameSnap: string;
    skuSnap: string;
    unitPriceSnap: number | string;
    quantity: number;
    lineTotal: number | string;
  }[];
  totalQuantity: number;
}

// ── Colour palette ─────────────────────────────────────────────────────────────
const BRAND_DARK  = '#111827';
const BRAND_BLUE  = '#2563eb';
const BRAND_LIGHT = '#f3f4f6';
const MUTED       = '#6b7280';
const BORDER_CLR  = '#d1d5db';
const WHITE       = '#ffffff';
const GREEN       = '#10b981';
const AMBER       = '#f59e0b';
const RED         = '#ef4444';

function statusColor(status: string): string {
  if (status === 'CONFIRMED') return GREEN;
  if (status === 'CANCELLED') return RED;
  return AMBER; // DRAFT
}

export function generateChallanPDF(data: ChallanPDFData, res: Response): void {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Challan ${data.challanNumber}`,
      Author: 'BusinessCRM',
      Subject: 'Sales Challan',
    },
  });

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Stream to response ──────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${data.challanNumber}.pdf"`
  );
  doc.pipe(res);

  // ── Background ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(WHITE);

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 110).fill(BRAND_LIGHT);

  // Logo box
  doc
    .roundedRect(MARGIN, 24, 44, 44, 8)
    .fill(BRAND_BLUE);
  doc
    .fontSize(22)
    .fillColor(WHITE)
    .font('Helvetica-Bold')
    .text('B', MARGIN, 35, { width: 44, align: 'center' });

  // Company name
  doc
    .fontSize(18)
    .fillColor(BRAND_DARK)
    .font('Helvetica-Bold')
    .text('BusinessCRM', MARGIN + 54, 28);
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica')
    .text('ERP + Operations Portal', MARGIN + 54, 50);

  // "SALES CHALLAN" label (right side)
  doc
    .fontSize(20)
    .fillColor(BRAND_DARK)
    .font('Helvetica-Bold')
    .text('SALES CHALLAN', 0, 28, { width: PAGE_W - MARGIN, align: 'right' });

  // Challan number & status pill
  doc
    .fontSize(10)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(data.challanNumber, 0, 54, { width: PAGE_W - MARGIN, align: 'right' });

  const pillColor = statusColor(data.status);
  const pillX = PAGE_W - MARGIN - 70;
  // doc.roundedRect(pillX, 68, 70, 18, 4).fill(pillColor + '33');
  doc
    .fontSize(8)
    .fillColor(pillColor)
    .font('Helvetica-Bold')
    .text(data.status, pillX, 73, { width: 70, align: 'center' });

  // Divider line under header
  doc.moveTo(MARGIN, 110).lineTo(PAGE_W - MARGIN, 110).strokeColor(BORDER_CLR).lineWidth(1).stroke();

  // ── Meta row (Date + Created by) ─────────────────────────────────────────────
  let y = 125;
  doc
    .fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('DATE', MARGIN, y)
    .text('CREATED BY', MARGIN + 160, y);

  y += 14;
  doc
    .fontSize(10).fillColor(BRAND_DARK).font('Helvetica-Bold')
    .text(new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), MARGIN, y)
    .text(data.createdBy.name, MARGIN + 160, y);

  // ── Customer section ─────────────────────────────────────────────────────────
  y += 30;
  // Card background
  doc.roundedRect(MARGIN, y, CONTENT_W, 95, 8).fill('#f9fafb');
  doc.roundedRect(MARGIN, y, 3, 95, 2).fill(BRAND_BLUE); // left accent

  y += 14;
  doc
    .fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('BILL TO', MARGIN + 14, y);

  y += 14;
  doc
    .fontSize(13).fillColor(BRAND_DARK).font('Helvetica-Bold')
    .text(data.customer.name, MARGIN + 14, y);

  if (data.customer.businessName) {
    y += 17;
    doc.fontSize(10).fillColor(BRAND_DARK).font('Helvetica').text(data.customer.businessName, MARGIN + 14, y);
  }

  y += 16;
  const contactParts: string[] = [];
  if (data.customer.mobile) contactParts.push(`Phone: ${data.customer.mobile}`);
  if (data.customer.email)  contactParts.push(`Email: ${data.customer.email}`);
  doc.fontSize(9).fillColor(MUTED).font('Helvetica').text(contactParts.join('   '), MARGIN + 14, y);

  if (data.customer.address) {
    y += 14;
    doc.fontSize(9).fillColor(MUTED).text(`Address: ${data.customer.address}`, MARGIN + 14, y, { width: CONTENT_W - 28 });
  }

  if (data.customer.gstNumber) {
    y += 14;
    doc.fontSize(9).fillColor(MUTED).text(`GST: ${data.customer.gstNumber}`, MARGIN + 14, y);
  }

  // ── Items table ───────────────────────────────────────────────────────────────
  y = Math.max(y + 30, 310);

  // Table header
  doc.rect(MARGIN, y, CONTENT_W, 26).fill(BRAND_LIGHT);

  const cols = {
    no:    { x: MARGIN + 10,              w: 24 },
    name:  { x: MARGIN + 40,              w: 180 },
    sku:   { x: MARGIN + 228,             w: 90 },
    price: { x: MARGIN + 326,             w: 70 },
    qty:   { x: MARGIN + 402,             w: 40 },
    total: { x: MARGIN + 449,             w: 66 },
  };

  const hdrY = y + 8;
  doc.fontSize(8).fillColor(BRAND_DARK).font('Helvetica-Bold');
  doc.text('#',           cols.no.x,    hdrY);
  doc.text('PRODUCT',     cols.name.x,  hdrY);
  doc.text('SKU',         cols.sku.x,   hdrY);
  doc.text('UNIT PRICE',  cols.price.x, hdrY, { width: cols.price.w, align: 'right' });
  doc.text('QTY',         cols.qty.x,   hdrY, { width: cols.qty.w, align: 'right' });
  doc.text('TOTAL',       cols.total.x, hdrY, { width: cols.total.w, align: 'right' });

  y += 26;

  // Table rows
  data.items.forEach((item, i) => {
    const rowH = 30;
    const bg = i % 2 === 0 ? WHITE : '#f8fafc';
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(bg);

    const rowY = y + 9;
    doc.fontSize(9).fillColor(BRAND_DARK).font('Helvetica');
    doc.text(String(i + 1),           cols.no.x,    rowY);
    doc.text(item.productNameSnap,    cols.name.x,  rowY, { width: cols.name.w - 4, ellipsis: true });
    doc.fillColor(MUTED).text(item.skuSnap, cols.sku.x, rowY, { width: cols.sku.w - 4 });
    doc.fillColor(BRAND_DARK).text(
      `Rs ${Number(item.unitPriceSnap).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      cols.price.x, rowY, { width: cols.price.w, align: 'right' }
    );
    doc.text(String(item.quantity), cols.qty.x, rowY, { width: cols.qty.w, align: 'right' });
    doc
      .fillColor(GREEN)
      .font('Helvetica-Bold')
      .text(
        `Rs ${Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        cols.total.x, rowY, { width: cols.total.w, align: 'right' }
      );

    y += rowH;
  });

  // ── Totals footer bar ─────────────────────────────────────────────────────────
  y += 4;
  doc.rect(MARGIN, y, CONTENT_W, 46).fill(BRAND_LIGHT);
  doc.roundedRect(MARGIN, y, 3, 46, 2).fill(BRAND_BLUE);

  // Grand total
  const grandTotal = data.items.reduce((s, i) => s + Number(i.lineTotal), 0);

  doc
    .fontSize(9).fillColor(MUTED).font('Helvetica')
    .text('TOTAL QUANTITY', MARGIN + 14, y + 10)
    .text('GRAND TOTAL', PAGE_W - MARGIN - 160, y + 10, { width: 160, align: 'right' });

  doc
    .fontSize(16).fillColor(BRAND_DARK).font('Helvetica-Bold')
    .text(String(data.totalQuantity), MARGIN + 14, y + 24)
    .fillColor(GREEN)
    .text(
      `Rs ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      PAGE_W - MARGIN - 160, y + 24, { width: 160, align: 'right' }
    );

  // ── Footer ────────────────────────────────────────────────────────────────────
  y = PAGE_H - 52;
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(BORDER_CLR).lineWidth(1).stroke();
  y += 12;
  doc
    .fontSize(8).fillColor(MUTED).font('Helvetica')
    .text(
      `Generated by BusinessCRM · ${new Date().toLocaleString('en-IN')} · This is a computer-generated document`,
      MARGIN, y, { width: CONTENT_W, align: 'center' }
    );

  doc.end();
}
