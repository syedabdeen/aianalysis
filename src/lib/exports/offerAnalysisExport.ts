import jsPDF from 'jspdf';

export interface ExportSettings {
  companyName: string;
  companyAddress?: string;
  logoUrl?: string;
}

export interface ItemComparisonEntry {
  item: string;
  quantity: number;
  unit: string;
  suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
  lowestSupplier: string;
  lowestTotal: number;
  averageTotal: number;
}

export interface AnalysisResult {
  technicalComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; score?: number }> }>;
  commercialComparison: Array<{ criteria: string; suppliers: Record<string, { value: string; isLowest?: boolean; isFastest?: boolean }> }>;
  itemComparison?: Array<{ item: string; suppliers: Record<string, { unitPrice?: number; total?: number; quantity?: number }>; lowestSupplier?: string }>;
  ranking: Array<{ supplierName: string; technicalScore: number; commercialScore: number; overallScore: number; recommendation: string; risks: string[] }>;
  summary: { lowestEvaluated: string; bestValue: string; recommendation: string; notes: string[] };
}

// Get canonical supplier list from extracted quotations FIRST (most reliable)
export function getSupplierColumns(analysisResult: AnalysisResult, extractedQuotations?: any[]): string[] {
  // Priority 1: Use extractedQuotations (has full names that match itemComparisonMatrix)
  if (extractedQuotations && extractedQuotations.length > 0) {
    const names = extractedQuotations
      .map(q => q.supplier?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) return names;
  }
  
  // Priority 2: Get from itemComparisonMatrix suppliers (full names)
  if ((analysisResult as any).itemComparisonMatrix && (analysisResult as any).itemComparisonMatrix.length > 0) {
    const firstItem = (analysisResult as any).itemComparisonMatrix[0];
    if (firstItem.suppliers) {
      const supplierNames = Object.keys(firstItem.suppliers);
      if (supplierNames.length > 0) return supplierNames;
    }
  }
  
  // Priority 3: Try commercial comparison (may be truncated)
  if (analysisResult.commercialComparison) {
    const commercialSuppliers = Object.keys(analysisResult.commercialComparison?.[0]?.suppliers || {});
    if (commercialSuppliers.length > 0) return commercialSuppliers;
  }
  
  // Priority 4: Try technical comparison
  if (analysisResult.technicalComparison) {
    const technicalSuppliers = Object.keys(analysisResult.technicalComparison?.[0]?.suppliers || {});
    if (technicalSuppliers.length > 0) return technicalSuppliers;
  }
  
  return [];
}

// Normalize string for fuzzy comparison
function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Find supplier data with fuzzy matching (handles truncated/mismatched names)
export function findSupplierData(
  suppliers: Record<string, any>,
  supplierName: string,
  extractedQuotations?: any[]
): any | undefined {
  if (!suppliers) return undefined;
  
  // Exact match first
  if (suppliers[supplierName]) return suppliers[supplierName];
  
  const normalizedTarget = normalizeForMatch(supplierName);
  
  // Try prefix match (truncated name vs full name)
  for (const key of Object.keys(suppliers)) {
    if (key.startsWith(supplierName) || supplierName.startsWith(key)) {
      return suppliers[key];
    }
    // Normalized prefix match
    const normalizedKey = normalizeForMatch(key);
    if (normalizedKey.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedKey)) {
      return suppliers[key];
    }
  }
  
  // Try substring match for partial names
  for (const key of Object.keys(suppliers)) {
    const normalizedKey = normalizeForMatch(key);
    if (normalizedKey.includes(normalizedTarget) || normalizedTarget.includes(normalizedKey)) {
      return suppliers[key];
    }
  }
  
  // Try matching against extracted quotations
  if (extractedQuotations) {
    for (const quotation of extractedQuotations) {
      const fullName = quotation.supplier?.name;
      if (fullName) {
        const normalizedFull = normalizeForMatch(fullName);
        if (normalizedFull.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedFull) ||
            normalizedFull.includes(normalizedTarget) || normalizedTarget.includes(normalizedFull)) {
          // Found the match, now try to find it in suppliers
          if (suppliers[fullName]) return suppliers[fullName];
          for (const key of Object.keys(suppliers)) {
            if (normalizeForMatch(key) === normalizedFull) {
              return suppliers[key];
            }
          }
        }
      }
    }
  }
  
  return undefined;
}

// Find extracted quotation by supplier name with fuzzy matching
function findQuotationBySupplier(extractedQuotations: any[], supplierName: string): any | undefined {
  if (!extractedQuotations) return undefined;
  
  // Exact match first
  const exactMatch = extractedQuotations.find(q => q.supplier?.name === supplierName);
  if (exactMatch) return exactMatch;
  
  // Fuzzy match
  const normalizedTarget = normalizeForMatch(supplierName);
  for (const q of extractedQuotations) {
    const fullName = q.supplier?.name || '';
    const normalizedFull = normalizeForMatch(fullName);
    if (normalizedFull.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedFull) ||
        normalizedFull.includes(normalizedTarget) || normalizedTarget.includes(normalizedFull)) {
      return q;
    }
  }
  
  return undefined;
}

// Load image for PDF
export async function loadImageForPDF(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Generate Offer Analysis PDF
export async function generateOfferAnalysisPDF(
  analysisResult: AnalysisResult,
  itemComparisonMatrix: ItemComparisonEntry[],
  extractedQuotations: any[],
  reportRef: string,
  settings: ExportSettings
): Promise<void> {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 15;
  
  // Get canonical supplier columns from extractedQuotations (most reliable)
  const suppliers = getSupplierColumns(analysisResult, extractedQuotations);
  
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 15;
      return true;
    }
    return false;
  };
  
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const rowHeight = 8;
  
  // ===== HEADER SECTION WITH LOGO =====
  let logoOffset = 0;
  if (settings.logoUrl) {
    try {
      const logoImg = await loadImageForPDF(settings.logoUrl);
      if (logoImg) {
        doc.addImage(logoImg, 'JPEG', margin, yPos - 5, 25, 15);
        logoOffset = 30;
      }
    } catch (error) {
      console.warn('Failed to load logo:', error);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName || 'Company Name', margin + logoOffset, yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Time: ${timeStr}`, pageWidth - margin, yPos, { align: 'right' });
  
  if (settings.companyAddress) {
    doc.setFontSize(9);
    doc.text(settings.companyAddress, margin + logoOffset, yPos);
  }
  yPos += 8;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Reference: ${reportRef}`, margin, yPos);
  yPos += 10;
  
  // ===== TITLE =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION COMPARATIVE STATEMENT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // ===== SUPPLIER SUMMARY BLOCK (Phase 5) =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier Summary', margin, yPos);
  yPos += 6;
  
  const summaryColWidths = {
    name: 70,
    reference: 40,
    items: 30,
    total: 50
  };
  const summaryTableWidth = summaryColWidths.name + summaryColWidths.reference + summaryColWidths.items + summaryColWidths.total;
  
  // Header row
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPos - 5, summaryTableWidth, rowHeight, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let headerX = margin + 2;
  doc.text('Supplier Name', headerX, yPos);
  headerX += summaryColWidths.name;
  doc.text('Quote Ref', headerX, yPos);
  headerX += summaryColWidths.reference;
  doc.text('Items', headerX, yPos);
  headerX += summaryColWidths.items;
  doc.text('Total Amount', headerX, yPos);
  yPos += rowHeight;
  
  // Supplier rows
  doc.setFont('helvetica', 'normal');
  suppliers.forEach((supplier, idx) => {
    const q = findQuotationBySupplier(extractedQuotations, supplier);
    const itemsExtracted = q?.itemsExtracted || q?.items?.length || 0;
    const pricedItems = q?.pricedItemsCount || (q?.items?.filter((i: any) => i.unitPrice > 0)?.length || 0);
    const total = q?.commercial?.total || 0;
    const currency = q?.commercial?.currency || 'AED';
    const quoteRef = q?.quotation?.reference || '—';
    const hasExtractionIssue = q?._extractionIssue;
    
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 5, summaryTableWidth, rowHeight, 'F');
    }
    
    if (hasExtractionIssue || itemsExtracted === 0) {
      doc.setFillColor(255, 245, 238);
      doc.rect(margin, yPos - 5, summaryTableWidth, rowHeight, 'F');
    }
    
    let cellX = margin + 2;
    doc.text(supplier.substring(0, 35), cellX, yPos, { maxWidth: summaryColWidths.name - 4 });
    cellX += summaryColWidths.name;
    doc.text(quoteRef.substring(0, 15), cellX, yPos);
    cellX += summaryColWidths.reference;
    doc.text(`${pricedItems}/${itemsExtracted}`, cellX, yPos);
    cellX += summaryColWidths.items;
    doc.text(total > 0 ? `${currency} ${total.toLocaleString()}` : (hasExtractionIssue ? 'Extraction failed' : '—'), cellX, yPos);
    
    yPos += rowHeight;
  });
  
  yPos += 8;
  
  // ===== 1. EXECUTIVE SUMMARY =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Executive Summary', margin, yPos);
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryText = analysisResult.summary?.recommendation || 'No summary available.';
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
  doc.text(summaryLines.slice(0, 4), margin, yPos);
  yPos += Math.min(summaryLines.length, 4) * 4 + 8;
  
  // ===== 2. COMMERCIAL AND TECHNICAL TERMS =====
  checkNewPage(60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Commercial and Technical Terms', margin, yPos);
  yPos += 8;
  
  const paramColWidth = 50;
  const vendorColWidth = (pageWidth - margin * 2 - paramColWidth) / suppliers.length;
  
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Parameter', margin + 2, yPos);
  
  // Render supplier headers in canonical order
  suppliers.forEach((supplier, i) => {
    const xPos = margin + paramColWidth + (i * vendorColWidth);
    doc.text(supplier.substring(0, 20), xPos + 2, yPos, { maxWidth: vendorColWidth - 4 });
  });
  yPos += rowHeight;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
  
  const allTerms = [
    ...analysisResult.commercialComparison.map(row => ({ ...row, type: 'commercial' })),
    ...analysisResult.technicalComparison.slice(0, 4).map(row => ({ ...row, type: 'technical' }))
  ];
  
  doc.setFont('helvetica', 'normal');
  allTerms.forEach((row, idx) => {
    checkNewPage(rowHeight + 5);
    
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
    }
    
    doc.setFontSize(8);
    doc.text(row.criteria, margin + 2, yPos, { maxWidth: paramColWidth - 4 });
    
    // Render cells in canonical supplier order using fuzzy matching
    suppliers.forEach((supplier, i) => {
      const val = findSupplierData(row.suppliers || {}, supplier, extractedQuotations);
      const xPos = margin + paramColWidth + (i * vendorColWidth);
      
      if ((val as any)?.isLowest) {
        doc.setFillColor(198, 246, 213);
        doc.rect(xPos, yPos - 5, vendorColWidth, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
      }
      
      const displayVal = val?.value || ((val as any)?.score ? `${(val as any).score}/100` : '—');
      doc.text(String(displayVal).substring(0, 25), xPos + 2, yPos, { maxWidth: vendorColWidth - 4 });
      doc.setFont('helvetica', 'normal');
    });
    
    yPos += rowHeight;
  });
  
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.1);
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
  yPos += 12;
  
  // ===== 3. ITEM-WISE PRICE COMPARISON (ALL ITEMS with pagination) =====
  if (itemComparisonMatrix && itemComparisonMatrix.length > 0) {
    checkNewPage(60);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. Item-wise Price Comparison (${itemComparisonMatrix.length} items)`, margin, yPos);
    yPos += 8;
    
    const colNo = 8;
    const colItem = 38;
    const colQty = 12;
    const colUnit = 10;
    const colLowest = 20;
    const colAvg = 20;
    const fixedColsWidth = colNo + colItem + colQty + colUnit + colLowest + colAvg;
    const availableForVendors = pageWidth - margin * 2 - fixedColsWidth;
    const colVendorWidth = availableForVendors / suppliers.length;
    const colRate = colVendorWidth * 0.45;
    
    // Function to render table headers
    const renderTableHeaders = () => {
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      let hdrX = margin + 1;
      doc.text('#', hdrX, yPos);
      hdrX += colNo;
      doc.text('Item Description', hdrX, yPos);
      hdrX += colItem;
      doc.text('Qty', hdrX, yPos);
      hdrX += colQty;
      doc.text('Unit', hdrX, yPos);
      hdrX += colUnit;
      
      // Supplier headers in canonical order
      suppliers.forEach((supplier, i) => {
        const vendorX = margin + colNo + colItem + colQty + colUnit + (i * colVendorWidth);
        doc.text(supplier.substring(0, 14), vendorX + 1, yPos, { maxWidth: colVendorWidth - 2 });
      });
      
      const lowestX = margin + colNo + colItem + colQty + colUnit + (suppliers.length * colVendorWidth);
      doc.setFillColor(255, 255, 200);
      doc.rect(lowestX, yPos - 5, colLowest, rowHeight, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Lowest', lowestX + 1, yPos);
      
      const avgX = lowestX + colLowest;
      doc.setFillColor(200, 220, 255);
      doc.rect(avgX, yPos - 5, colAvg, rowHeight, 'F');
      doc.text('Avg', avgX + 1, yPos);
      
      yPos += rowHeight;
      
      // Sub-header row
      doc.setFillColor(235, 235, 235);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight - 1, 'F');
      doc.setFontSize(5);
      
      hdrX = margin + colNo + colItem + colQty + colUnit;
      suppliers.forEach(() => {
        doc.text('Rate', hdrX + 1, yPos);
        doc.text('Amount', hdrX + colRate + 1, yPos);
        hdrX += colVendorWidth;
      });
      
      doc.setFillColor(255, 255, 200);
      doc.rect(lowestX, yPos - 5, colLowest, rowHeight - 1, 'F');
      doc.text('(Total)', lowestX + 1, yPos);
      doc.setFillColor(200, 220, 255);
      doc.rect(avgX, yPos - 5, colAvg, rowHeight - 1, 'F');
      doc.text('(Total)', avgX + 1, yPos);
      
      yPos += rowHeight;
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);
    };
    
    // Render initial headers
    renderTableHeaders();
    
    const lowestX = margin + colNo + colItem + colQty + colUnit + (suppliers.length * colVendorWidth);
    const avgX = lowestX + colLowest;
    
    // Render ALL items with pagination
    doc.setFont('helvetica', 'normal');
    const baseRowHeight = 7;
    const lineHeightMm = 2.5; // Height per line of text
    
    itemComparisonMatrix.forEach((item, idx) => {
      const descText = String(item.item || '');
      doc.setFontSize(6);
      const descLines = doc.splitTextToSize(descText, colItem - 2);
      const numLines = descLines.length;
      const dynamicRowHeight = Math.max(baseRowHeight, numLines * lineHeightMm + 3);
      
      // Check if we need a new page (with space for headers + this row)
      if (yPos + dynamicRowHeight > pageHeight - 25) {
        doc.addPage();
        yPos = 15;
        // Re-render headers on new page
        renderTableHeaders();
      }
      
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, dynamicRowHeight, 'F');
      }
      
      const qty = item.quantity || 1;
      const unit = item.unit || 'EA';
      
      let xPos = margin + 1;
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(String(idx + 1), xPos, yPos);
      xPos += colNo;
      
      // Render wrapped description text
      descLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, xPos, yPos + (lineIdx * lineHeightMm));
      });
      xPos += colItem;
      
      doc.text(String(qty), xPos, yPos);
      xPos += colQty;
      doc.text(unit, xPos, yPos);
      xPos += colUnit;
      
      // Render supplier data in canonical order using fuzzy matching
      suppliers.forEach((supplier) => {
        const supplierData = findSupplierData(item.suppliers || {}, supplier, extractedQuotations);
        const unitPrice = supplierData?.unitPrice || 0;
        const amount = supplierData?.total || (qty * unitPrice);
        const isLowest = item.lowestSupplier === supplier && unitPrice > 0;
        
        if (isLowest) {
          doc.setFillColor(198, 246, 213);
          doc.rect(xPos, yPos - 5, colVendorWidth, dynamicRowHeight, 'F');
          doc.setFont('helvetica', 'bold');
        }
        
        doc.text(unitPrice > 0 ? unitPrice.toLocaleString() : '—', xPos + 1, yPos);
        doc.text(amount > 0 ? amount.toLocaleString() : '—', xPos + colRate + 1, yPos);
        doc.setFont('helvetica', 'normal');
        xPos += colVendorWidth;
      });
      
      doc.setFillColor(255, 255, 200);
      doc.rect(lowestX, yPos - 5, colLowest, dynamicRowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text((item.lowestTotal || 0) > 0 ? (item.lowestTotal || 0).toLocaleString() : '—', lowestX + 1, yPos);
      
      doc.setFillColor(200, 220, 255);
      doc.rect(avgX, yPos - 5, colAvg, dynamicRowHeight, 'F');
      doc.setFont('helvetica', 'normal');
      doc.text((item.averageTotal || 0) > 0 ? Math.round(item.averageTotal || 0).toLocaleString() : '—', avgX + 1, yPos);
      
      yPos += dynamicRowHeight;
    });
    
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    
    yPos += 12;
  }
  
  // ===== 3B. SUBTOTAL / VAT / TOTAL SUMMARY =====
  if (extractedQuotations && extractedQuotations.length > 0) {
    checkNewPage(40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Price Summary (Subtotal, Tax, Total)', margin, yPos);
    yPos += 6;
    
    const priceSummaryRows = ['Subtotal', 'Tax/VAT', 'Grand Total'];
    const summaryParamWidth = 35;
    const summaryVendorWidth = (pageWidth - margin * 2 - summaryParamWidth) / suppliers.length;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('', margin + 2, yPos);
    suppliers.forEach((supplier, i) => {
      const xPos = margin + summaryParamWidth + (i * summaryVendorWidth);
      doc.text(supplier.substring(0, 15), xPos + 2, yPos, { maxWidth: summaryVendorWidth - 4 });
    });
    yPos += rowHeight;
    
    doc.setFont('helvetica', 'normal');
    priceSummaryRows.forEach((rowLabel, rowIdx) => {
      checkNewPage(rowHeight + 5);
      
      const isTotal = rowLabel === 'Grand Total';
      if (isTotal) {
        doc.setFillColor(230, 245, 230);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
      } else if (rowIdx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, rowHeight, 'F');
      }
      
      doc.setFontSize(7);
      doc.text(rowLabel, margin + 2, yPos);
      
      const totals = extractedQuotations.map(q => q.commercial?.total || 0);
      const minTotal = Math.min(...totals.filter(t => t > 0));
      
      // Render in canonical supplier order using fuzzy matching
      suppliers.forEach((supplier, i) => {
        const q = findQuotationBySupplier(extractedQuotations, supplier);
        const xPos = margin + summaryParamWidth + (i * summaryVendorWidth);
        let value = 0;
        
        if (rowLabel === 'Subtotal') {
          value = q?.commercial?.subtotal || 0;
        } else if (rowLabel === 'Tax/VAT') {
          value = q?.commercial?.tax || 0;
        } else if (rowLabel === 'Grand Total') {
          value = q?.commercial?.total || 0;
        }
        
        if (isTotal && value > 0 && value === minTotal) {
          doc.setFillColor(198, 246, 213);
          doc.rect(xPos, yPos - 5, summaryVendorWidth, rowHeight, 'F');
        }
        
        const currency = q?.commercial?.currency || 'AED';
        doc.text(value > 0 ? `${currency} ${value.toLocaleString()}` : '—', xPos + 2, yPos);
      });
      
      doc.setFont('helvetica', 'normal');
      yPos += rowHeight;
    });
    
    yPos += 10;
  }
  
  // ===== 4. FINAL RECOMMENDATION =====
  checkNewPage(50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Final Recommendation', margin, yPos);
  yPos += 8;
  
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(49, 130, 206);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos - 3, pageWidth - margin * 2, 35, 'FD');
  
  doc.setFontSize(9);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Best Value Vendor:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(analysisResult.summary?.bestValue || 'N/A', margin + 50, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Lowest Price Vendor:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(analysisResult.summary?.lowestEvaluated || 'N/A', margin + 50, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Justification:', margin + 5, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const justificationLines = doc.splitTextToSize(
    analysisResult.summary?.recommendation || 'Manual review recommended.',
    pageWidth - margin * 2 - 15
  );
  doc.text(justificationLines.slice(0, 2), margin + 5, yPos);
  
  yPos += 20;
  
  // ===== SIGNATURE BLOCK =====
  checkNewPage(40);
  yPos += 10;
  
  const sigBoxWidth = (pageWidth - margin * 2 - 20) / 3;
  const sigBoxHeight = 25;
  
  doc.setFontSize(8);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  
  doc.rect(margin, yPos, sigBoxWidth, sigBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared By:', margin + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: _______________', margin + 3, yPos + 12);
  doc.text('Date: _______________', margin + 3, yPos + 18);
  doc.text('Sign: _______________', margin + 3, yPos + 23);
  
  const verifyX = margin + sigBoxWidth + 10;
  doc.rect(verifyX, yPos, sigBoxWidth, sigBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Verified By:', verifyX + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: _______________', verifyX + 3, yPos + 12);
  doc.text('Date: _______________', verifyX + 3, yPos + 18);
  doc.text('Sign: _______________', verifyX + 3, yPos + 23);
  
  const approveX = margin + (sigBoxWidth + 10) * 2;
  doc.rect(approveX, yPos, sigBoxWidth, sigBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By:', approveX + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: _______________', approveX + 3, yPos + 12);
  doc.text('Date: _______________', approveX + 3, yPos + 18);
  doc.text('Sign: _______________', approveX + 3, yPos + 23);
  
  doc.save(`quotation-analysis-${reportRef}-${dateStr.replace(/\//g, '-')}.pdf`);
}

// Generate Offer Analysis Excel/CSV
export function generateOfferAnalysisExcel(
  analysisResult: AnalysisResult,
  itemComparisonMatrix: ItemComparisonEntry[],
  extractedQuotations: any[],
  reportRef: string
): void {
  // Get canonical supplier columns from extractedQuotations (full names)
  const suppliers = getSupplierColumns(analysisResult, extractedQuotations);
  
  let csv = 'QUOTATION COMPARATIVE STATEMENT\n';
  csv += `Report Reference,${reportRef}\n`;
  csv += `Generated,${new Date().toLocaleString()}\n\n`;
  
  // Supplier summary section
  csv += 'SUPPLIER SUMMARY\n';
  csv += 'Supplier Name,Quote Reference,Items Extracted,Priced Items,Total Amount\n';
  suppliers.forEach(supplier => {
    const q = findQuotationBySupplier(extractedQuotations, supplier);
    const itemsExtracted = q?.itemsExtracted || q?.items?.length || 0;
    const pricedItems = q?.pricedItemsCount || (q?.items?.filter((i: any) => i.unitPrice > 0)?.length || 0);
    const total = q?.commercial?.total || 0;
    const currency = q?.commercial?.currency || 'AED';
    const quoteRef = q?.quotation?.reference || '—';
    csv += `"${supplier}","${quoteRef}",${itemsExtracted},${pricedItems},"${total > 0 ? `${currency} ${total}` : '—'}"\n`;
  });
  csv += '\n';
  
  csv += 'COMMERCIAL COMPARISON\n';
  csv += `Criteria,${suppliers.join(',')}\n`;
  analysisResult.commercialComparison.forEach(row => {
    csv += `"${row.criteria}",${suppliers.map(s => {
      const data = findSupplierData(row.suppliers || {}, s, extractedQuotations);
      return `"${data?.value || '—'}"`;
    }).join(',')}\n`;
  });
  
  csv += '\nTECHNICAL COMPARISON\n';
  csv += `Criteria,${suppliers.join(',')}\n`;
  analysisResult.technicalComparison.forEach(row => {
    csv += `"${row.criteria}",${suppliers.map(s => {
      const data = findSupplierData(row.suppliers || {}, s, extractedQuotations);
      return `"${data?.value || '—'} (${data?.score || 0})"`;
    }).join(',')}\n`;
  });
  
  if (itemComparisonMatrix && itemComparisonMatrix.length > 0) {
    csv += '\nITEM-WISE PRICE COMPARISON\n';
    csv += `#,Item Description,Qty,Unit,${suppliers.flatMap(s => [`${s} Rate`, `${s} Amount`]).join(',')},Lowest Total,Average Total\n`;
    itemComparisonMatrix.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const unit = item.unit || 'EA';
      // Use fuzzy matching for supplier data
      const vendorData = suppliers.flatMap(s => {
        const supplierData = findSupplierData(item.suppliers || {}, s, extractedQuotations);
        const rate = supplierData?.unitPrice || 0;
        const amount = supplierData?.total || (qty * rate);
        return [rate > 0 ? rate : '—', amount > 0 ? amount : '—'];
      }).join(',');
      csv += `${idx + 1},"${(item.item || '').replace(/"/g, "'")}",${qty},${unit},${vendorData},${(item.lowestTotal || 0) > 0 ? item.lowestTotal : '—'},${(item.averageTotal || 0) > 0 ? Math.round(item.averageTotal || 0) : '—'}\n`;
    });
  }
  
  if (extractedQuotations && extractedQuotations.length > 0) {
    csv += '\nPRICE SUMMARY\n';
    csv += `Parameter,${suppliers.join(',')}\n`;
    ['Subtotal', 'Tax/VAT', 'Grand Total'].forEach(label => {
      const values = suppliers.map(s => {
        const q = findQuotationBySupplier(extractedQuotations, s);
        let val = 0;
        if (label === 'Subtotal') val = q?.commercial?.subtotal || 0;
        else if (label === 'Tax/VAT') val = q?.commercial?.tax || 0;
        else val = q?.commercial?.total || 0;
        return val > 0 ? val : '—';
      }).join(',');
      csv += `"${label}",${values}\n`;
    });
  }
  
  csv += '\nRECOMMENDATION\n';
  csv += `Best Value,"${analysisResult.summary.bestValue}"\n`;
  csv += `Lowest Price,"${analysisResult.summary.lowestEvaluated}"\n`;
  csv += `Recommendation,"${analysisResult.summary.recommendation?.replace(/"/g, "'") || ''}"\n`;
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `quotation-analysis-${reportRef}.csv`;
  link.click();
}
