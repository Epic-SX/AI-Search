import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadCustomJapaneseFont } from './customFonts';

/**
 * Adds Japanese font support to a jsPDF document
 * @param doc The jsPDF document instance
 * @returns The same jsPDF document with Japanese font support
 */
export const addJapaneseFontSupport = (doc: jsPDF): jsPDF => {
  try {
    // Try to use built-in Japanese fonts first
    doc.setFont('HeiseiKakuGo-W5', 'normal', 'normal');
    return doc;
  } catch (e) {
    try {
      // Try another built-in Japanese font
      doc.setFont('kozgopromedium', 'normal', 'normal');
      return doc;
    } catch (err) {
      try {
        // Try another common Japanese font
        doc.setFont('kozminproregular', 'normal', 'normal');
        return doc;
      } catch (error) {
        console.warn('Japanese font not available, using default font');
        return doc;
      }
    }
  }
};

/**
 * Creates a new jsPDF document with Japanese font support
 * @returns A new jsPDF document with Japanese font support
 */
export const createJapanesePDF = (): jsPDF => {
  // Create a new PDF document with Japanese support
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ['px_scaling']
  });
  
  // Add Japanese font support
  return addJapaneseFontSupport(doc);
};

/**
 * Asynchronously creates a jsPDF document with custom Japanese font support
 * Use this when built-in fonts are not displaying correctly
 */
export const createJapanesePDFWithCustomFont = async (): Promise<jsPDF> => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ['px_scaling']
  });
  
  // Load and add custom Japanese font
  await loadCustomJapaneseFont(doc);
  return doc;
};

// Export the preloadJapaneseFont function for backward compatibility
export const preloadJapaneseFont = async (): Promise<void> => {
  // No need to preload since we're using built-in fonts
  console.log('Using built-in Japanese fonts');
};
