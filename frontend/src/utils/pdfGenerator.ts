import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ComparisonResult } from '../types';
import { cleanHtmlText } from './textUtils';
import { addJapaneseFontSupport } from './pdfFonts';
import { loadCustomJapaneseFont } from './customFonts';

/**
 * Generates a PDF document for product comparison
 * @param result The comparison result object
 * @returns A jsPDF document instance
 */
export const generateComparisonPDF = (result: ComparisonResult): jsPDF => {
  // Create a new PDF document with CJK language support
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ['px_scaling']
  });

  // Add Japanese font support with built-in fonts
  addJapaneseFontSupport(doc);
  
  // Set encoding for better Japanese character support
  try {
    (doc as any).setLanguage('ja');
  } catch (e) {
    console.warn('Could not set language to Japanese');
  }

  // Helper function to safely add text with Japanese characters
  const safeAddText = (text: string, x: number, y: number, options?: any) => {
    try {
      doc.text(text, x, y, options);
    } catch (error) {
      console.warn(`Error adding text: ${text}`, error);
      // Try to add text character by character as fallback
      try {
        const chars = text.split('');
        let currentX = x;
        for (const char of chars) {
          const charWidth = doc.getTextWidth(char);
          doc.text(char, currentX, y);
          currentX += charWidth + 0.5; // Add a small space between characters
        }
      } catch (fallbackError) {
        console.error('Fallback text rendering failed', fallbackError);
      }
    }
  };

  // Set title
  doc.setFontSize(18);
  safeAddText('商品比較レポート', 105, 15, { align: 'center' });
  
  // Add product titles
  doc.setFontSize(14);
  safeAddText('商品A: ' + cleanHtmlText(result.product_a.title || ''), 15, 25);
  safeAddText('商品B: ' + cleanHtmlText(result.product_b.title || ''), 15, 35);
  
  // Add price comparison
  doc.setFontSize(12);
  safeAddText(`価格 A: ¥${(result.product_a.price || 0).toLocaleString()}`, 15, 45);
  safeAddText(`価格 B: ¥${(result.product_b.price || 0).toLocaleString()}`, 15, 52);
  
  // Add price difference
  const priceDiff = (result.product_a.price || 0) - (result.product_b.price || 0);
  safeAddText(`価格差: ¥${Math.abs(priceDiff).toLocaleString()} (${priceDiff > 0 ? 'Aが高い' : 'Bが高い'})`, 15, 59);
  
  // Add load capacity if available
  let yPos = 66;
  
  // Find load capacity difference
  const loadCapacityDiff = result.differences.find(diff => 
    diff.category.includes('耐荷重') || 
    diff.category.includes('最大荷重') || 
    diff.category.includes('荷重')
  );
  
  if (loadCapacityDiff) {
    // Extract numeric values if possible
    const extractNumber = (text: string): number | null => {
      const match = text.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    };
    
    const loadCapacityA = extractNumber(loadCapacityDiff.product_a_value);
    const loadCapacityB = extractNumber(loadCapacityDiff.product_b_value);
    
    safeAddText(`積載量 A: ${loadCapacityDiff.product_a_value}`, 15, yPos);
    yPos += 7;
    safeAddText(`積載量 B: ${loadCapacityDiff.product_b_value}`, 15, yPos);
    yPos += 7;
    
    if (loadCapacityA !== null && loadCapacityB !== null) {
      const loadDiff = loadCapacityA - loadCapacityB;
      safeAddText(`積載量差: ${Math.abs(loadDiff)}kg (${loadDiff > 0 ? 'Aが大きい' : 'Bが大きい'})`, 15, yPos);
    }
    yPos += 10;
  }
  
  // Add differences table
  doc.setFontSize(14);
  safeAddText('主な違い', 15, yPos);
  yPos += 7;
  
  // Helper function to add multiline text
  const addMultilineText = (text: string, x: number, y: number, maxWidth: number): number => {
    if (!text) return y;
    
    // Clean the text
    const cleanedText = cleanHtmlText(text);
    
    // Split text into lines
    const lines = doc.splitTextToSize(cleanedText, maxWidth);
    
    // Add each line
    safeAddText(lines, x, y);
    
    // Return the new Y position
    return y + (lines.length * 7);
  };
  
  // Filter differences by significance
  const highDiffs = result.differences.filter(d => d.significance === 'high');
  const mediumDiffs = result.differences.filter(d => d.significance === 'medium');
  const lowDiffs = result.differences.filter(d => d.significance === 'low');
  
  // Add high significance differences
  if (highDiffs.length > 0) {
    doc.setFontSize(12);
    safeAddText('重要な違い:', 15, yPos);
    yPos += 7;
    
    highDiffs.forEach(diff => {
      doc.setFontSize(11);
      safeAddText(`${diff.category}:`, 20, yPos);
      yPos += 7;
      
      safeAddText('商品A: ', 25, yPos);
      yPos = addMultilineText(diff.product_a_value || '', 45, yPos, 140);
      
      safeAddText('商品B: ', 25, yPos);
      yPos = addMultilineText(diff.product_b_value || '', 45, yPos, 140);
      
      yPos += 5;
    });
  }
  
  // Add medium significance differences
  if (mediumDiffs.length > 0) {
    doc.setFontSize(12);
    safeAddText('中程度の違い:', 15, yPos);
    yPos += 7;
    
    mediumDiffs.forEach(diff => {
      doc.setFontSize(11);
      safeAddText(`${diff.category}:`, 20, yPos);
      yPos += 7;
      
      safeAddText('商品A: ', 25, yPos);
      yPos = addMultilineText(diff.product_a_value || '', 45, yPos, 140);
      
      safeAddText('商品B: ', 25, yPos);
      yPos = addMultilineText(diff.product_b_value || '', 45, yPos, 140);
      
      yPos += 5;
    });
  }
  
  // Check if we need a new page for low significance differences
  if (yPos > 250 && lowDiffs.length > 0) {
    doc.addPage();
    yPos = 20;
  }
  
  // Add low significance differences
  if (lowDiffs.length > 0) {
    doc.setFontSize(12);
    safeAddText('軽微な違い:', 15, yPos);
    yPos += 7;
    
    lowDiffs.forEach(diff => {
      doc.setFontSize(11);
      safeAddText(`${diff.category}:`, 20, yPos);
      yPos += 7;
      
      safeAddText('商品A: ', 25, yPos);
      yPos = addMultilineText(diff.product_a_value || '', 45, yPos, 140);
      
      safeAddText('商品B: ', 25, yPos);
      yPos = addMultilineText(diff.product_b_value || '', 45, yPos, 140);
      
      yPos += 5;
      
      // Add a new page if needed
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
  }
  
  // Check if we need a new page for recommendation
  if (yPos > 250 && result.recommendation) {
    doc.addPage();
    yPos = 20;
  }
  
  // Add recommendation if available
  if (result.recommendation) {
    doc.setFontSize(14);
    safeAddText('おすすめ', 15, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    yPos = addMultilineText(result.recommendation, 15, yPos, 180);
  }
  
  // Add footer with date
  const today = new Date();
  const dateStr = today.toLocaleDateString('ja-JP');
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    safeAddText(`作成日: ${dateStr}`, 15, 287);
    safeAddText(`ページ ${i} / ${pageCount}`, 180, 287);
  }
  
  return doc;
};

/**
 * Generates a PDF with comparison results
 * Uses embedded custom font for proper Japanese character rendering
 */
export async function generateComparisonPDFWithCustomFont(
  title: string,
  headers: string[],
  data: string[][],
  filename: string = 'comparison-results.pdf'
): Promise<void> {
  try {
    // Create PDF document with Japanese language support
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true,
      hotfixes: ['px_scaling'] // Important for proper text rendering
    });

    // Load the embedded custom Japanese font
    await loadCustomJapaneseFont(doc);
    
    // Set font for the document - explicitly set to Noto Sans JP
    doc.setFont('Noto Sans JP');
    
    // Set language to Japanese if possible
    try {
      (doc as any).setLanguage('ja');
    } catch (e) {
      console.warn('Could not set language to Japanese');
    }
    
    // Helper function to safely add text with Japanese characters
    const safeAddText = (text: string, x: number, y: number, options?: any) => {
      try {
        doc.text(text, x, y, options);
      } catch (error) {
        console.warn(`Error adding text: ${text}`, error);
        // Try to add text character by character as fallback
        try {
          const chars = text.split('');
          let currentX = x;
          for (const char of chars) {
            try {
              const charWidth = doc.getTextWidth(char);
              doc.text(char, currentX, y);
              currentX += charWidth + 0.5; // Add a small space between characters
            } catch (e) {
              // If we can't get text width, use a fixed width
              doc.text(char, currentX, y);
              currentX += 5; // Fixed width fallback
            }
          }
        } catch (fallbackError) {
          console.error('Fallback text rendering failed', fallbackError);
        }
      }
    };
    
    // Helper function to wrap text and calculate required height
    const wrapTextAndGetHeight = (text: string, maxWidth: number, fontSize: number): { lines: string[], height: number } => {
      if (!text) return { lines: [''], height: 0 };
      
      doc.setFontSize(fontSize);
      
      // For Japanese text, we need to handle wrapping differently
      // We'll split by characters and build lines character by character
      const characters = text.split('');
      const lines: string[] = [];
      let currentLine = '';
      
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        // Handle special case for newlines in the text
        if (char === '\n') {
          lines.push(currentLine);
          currentLine = '';
          continue;
        }
        
        const testLine = currentLine + char;
        const testWidth = doc.getTextWidth(testLine);
        
        if (testWidth > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine !== '') {
        lines.push(currentLine);
      }
      
      // If no lines were created, add an empty line
      if (lines.length === 0) {
        lines.push('');
      }
      
      // Calculate height (line height is roughly 1.2 times font size)
      const lineHeight = fontSize * 0.352778 * 1.5; // Increased line spacing for better readability
      const height = lines.length * lineHeight;
      
      return { lines, height };
    };
    
    // Get page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15; // Increased margin for better aesthetics
    
    // Add title with safe text function
    doc.setFontSize(16);
    
    // Wrap the title text to prevent it from being cut off
    const titleMaxWidth = pageWidth - (margin * 2); // Leave margins on both sides
    const wrappedTitle = wrapTextAndGetHeight(title, titleMaxWidth, 16);
    
    // Draw each line of the title
    let yPos = 20;
    wrappedTitle.lines.forEach(line => {
      safeAddText(line, margin, yPos);
      yPos += 8; // Spacing between title lines
    });
    
    // Add timestamp with safe text function
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString('ja-JP');
    safeAddText(`作成日時: ${timestamp}`, margin, yPos + 2);
    yPos += 10;
    
    // Draw a separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    // Define column widths for better readability
    const availableWidth = pageWidth - (margin * 2);
    
    // Ensure exact equal widths for product columns
    const categoryWidth = Math.floor(availableWidth * 0.15); // Category
    const productWidth = Math.floor(availableWidth * 0.375); // Same width for both products
    const significanceWidth = Math.floor(availableWidth * 0.10); // Significance
    
    // Adjust to ensure total width matches available width
    const totalCalculatedWidth = categoryWidth + (productWidth * 2) + significanceWidth;
    const adjustment = availableWidth - totalCalculatedWidth;
    
    // Apply adjustment to product columns to ensure they're exactly equal
    const adjustedProductWidth = productWidth + Math.floor(adjustment / 2);
    
    const colWidths = [
      categoryWidth,
      adjustedProductWidth,
      adjustedProductWidth,
      significanceWidth
    ];
    
    // Draw header row with rounded corners and better styling
    doc.setFillColor(66, 139, 202);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    
    // Draw header background
    const headerHeight = 10;
    doc.setDrawColor(66, 139, 202);
    
    // Draw header cells
    let xPos = margin;
    headers.forEach((header, index) => {
      // Draw cell background
      doc.setFillColor(66, 139, 202);
      doc.rect(xPos, yPos, colWidths[index], headerHeight, 'F');
      
      // Draw header text - center align
      doc.setTextColor(255, 255, 255);
      const textWidth = doc.getTextWidth(header);
      const centerX = xPos + (colWidths[index] - textWidth) / 2;
      safeAddText(header, centerX, yPos + 7);
      
      xPos += colWidths[index];
    });
    
    yPos += headerHeight;
    
    // Process each row
    doc.setTextColor(0, 0, 0);
    let rowCount = 0;
    
    // Find the product name row and price row for special formatting
    const productNameRowIndex = data.findIndex(row => row[0] === '商品名');
    const priceRowIndex = data.findIndex(row => row[0] === '価格');
    const featureRowIndex = data.findIndex(row => row[0] === '特徴' || row[0].includes('特徴'));
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const isProductNameRow = rowIndex === productNameRowIndex;
      const isPriceRow = rowIndex === priceRowIndex;
      const isFeatureRow = rowIndex === featureRowIndex;
      
      // Calculate the maximum height needed for this row
      let maxRowHeight = 0;
      const cellContents: { lines: string[], height: number }[] = [];
      
      // Calculate wrapped text for each cell
      row.forEach((cell, cellIndex) => {
        // Use larger font for product names and prices
        let fontSize = 10;
        if (isProductNameRow && cellIndex > 0) fontSize = 11;
        if (isPriceRow && cellIndex > 0) fontSize = 11;
        
        doc.setFontSize(fontSize);
        
        // Get available width for text (subtract padding)
        const availableWidth = colWidths[cellIndex] - 10; // Increased padding for better text wrapping
        
        // Wrap text and get height
        const wrapped = wrapTextAndGetHeight(cell, availableWidth, fontSize);
        cellContents.push(wrapped);
        
        // Update max height if needed
        if (wrapped.height > maxRowHeight) {
          maxRowHeight = wrapped.height;
        }
      });
      
      // Ensure minimum row height and add padding
      // Give more space for feature rows which typically have more content
      const rowPadding = isFeatureRow ? 12 : 8;
      maxRowHeight = Math.max(maxRowHeight + rowPadding, 14);
      
      // Check if we need to add a new page
      if (yPos + maxRowHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      // Draw row background with alternating colors
      if (rowCount % 2 === 1) {
        doc.setFillColor(245, 245, 245); // Lighter gray for better contrast
      } else {
        doc.setFillColor(255, 255, 255); // White for even rows
      }
      
      // Draw the row background
      doc.rect(margin, yPos, availableWidth, maxRowHeight, 'F');
      
      // Draw cell borders
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      
      // Draw horizontal lines
      doc.line(margin, yPos, margin + availableWidth, yPos);
      doc.line(margin, yPos + maxRowHeight, margin + availableWidth, yPos + maxRowHeight);
      
      // Draw cell content
      xPos = margin;
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        const cellContent = cellContents[cellIndex];
        const cellWidth = colWidths[cellIndex];
        
        // Draw vertical cell borders
        doc.line(xPos, yPos, xPos, yPos + maxRowHeight);
        
        // Special formatting for different cell types
        if (isPriceRow && cellIndex > 0 && cellIndex < 3) {
          doc.setTextColor(66, 139, 202); // Blue for prices
          doc.setFontSize(11); // Larger font for prices
          
          // Center align prices
          const centerX = xPos + cellWidth/2;
          const textWidth = doc.getTextWidth(row[cellIndex]);
          safeAddText(row[cellIndex], centerX - textWidth/2, yPos + maxRowHeight/2 + 2);
        } else if (isProductNameRow && cellIndex > 0 && cellIndex < 3) {
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11); // Larger font for product names
          
          // Draw each line of text - centered vertically in the cell
          let lineYPos = yPos + maxRowHeight/2 - ((cellContent.lines.length * 4.5) / 2) + 4;
          const lineHeight = 4.5;
          
          cellContent.lines.forEach(line => {
            safeAddText(line, xPos + 5, lineYPos);
            lineYPos += lineHeight;
          });
        } else if (cellIndex === 0) {
          // Category column - center align vertically
          doc.setFillColor(250, 250, 250);
          doc.rect(xPos, yPos, cellWidth, maxRowHeight, 'F');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(10);
          
          // For category column, handle special case for "カテゴリ" which might be displayed vertically
          const categoryText = row[cellIndex];
          
          // Check if the text is a single character per line (vertical text)
          const isVerticalText = categoryText === "カテゴリ" || 
                                categoryText.split('').join('\n') === categoryText;
          
          if (isVerticalText) {
            // Convert vertical text to horizontal
            const horizontalText = categoryText.split('').join('');
            
            // Center text vertically and horizontally
            const textWidth = doc.getTextWidth(horizontalText);
            const centerX = xPos + (cellWidth - textWidth) / 2;
            safeAddText(horizontalText, centerX, yPos + maxRowHeight/2 + 2);
          } else {
            // Center text vertically and horizontally
            const textWidth = doc.getTextWidth(categoryText);
            const centerX = xPos + (cellWidth - textWidth) / 2;
            safeAddText(categoryText, centerX, yPos + maxRowHeight/2 + 2);
          }
        } else if (cellIndex === 3 && row[3]) {
          // Significance column - center align
          if (row[3] === '高') {
            doc.setTextColor(220, 53, 69); // Red for high significance
          } else if (row[3] === '中') {
            doc.setTextColor(255, 193, 7); // Yellow for medium
          } else {
            doc.setTextColor(40, 167, 69); // Green for low
          }
          doc.setFontSize(10);
          
          // Center text
          const textWidth = doc.getTextWidth(row[cellIndex]);
          const centerX = xPos + (cellWidth - textWidth) / 2;
          safeAddText(row[cellIndex], centerX, yPos + maxRowHeight/2 + 2);
        } else {
          // Regular cell content
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          
          // Draw each line of text - centered vertically in the cell
          let lineYPos = yPos + maxRowHeight/2 - ((cellContent.lines.length * 4.5) / 2) + 4;
          if (cellContent.lines.length === 1) lineYPos = yPos + maxRowHeight/2 + 2;
          
          const lineHeight = 4.5;
          
          cellContent.lines.forEach(line => {
            safeAddText(line, xPos + 5, lineYPos);
            lineYPos += lineHeight;
          });
        }
        
        // Draw the right border of the last cell
        if (cellIndex === row.length - 1) {
          doc.line(xPos + cellWidth, yPos, xPos + cellWidth, yPos + maxRowHeight);
        }
        
        xPos += cellWidth;
      }
      
      // Move to next row
      yPos += maxRowHeight;
      rowCount++;
    }
    
    // Add a footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      // Add page numbers
      safeAddText(`ページ ${i} / ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      
      // Add a footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    }
    
    // Save the PDF
    doc.save(filename);
    
    console.log(`PDF generated successfully: ${filename}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Character-by-character fallback rendering method for problematic text
 * This is a backup approach if the custom font doesn't work properly
 */
export function renderJapaneseTextCharByChar(
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  options: any = {}
): void {
  const fontSize = options.fontSize || doc.getFontSize();
  const charSpacing = fontSize * 0.6; // Adjust spacing as needed
  
  let currentX = x;
  
  // Render each character individually
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    doc.text(char, currentX, y);
    currentX += charSpacing;
  }
} 