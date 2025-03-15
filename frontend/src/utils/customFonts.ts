import { jsPDF } from 'jspdf';
import { NOTO_SANS_JP_BASE64 } from './fonts/noto-sans-jp-base64';

/**
 * Converts an ArrayBuffer to a Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Loads the custom Japanese font for PDF generation
 * Uses embedded base64 font data to avoid CSP issues
 * 
 * @param doc - The jsPDF document instance
 * @returns Promise that resolves when the font is loaded
 */
export async function loadCustomJapaneseFont(doc: jsPDF): Promise<void> {
  try {
    console.log('Loading embedded Noto Sans JP font...');
    
    // Use the embedded base64 font data
    if (NOTO_SANS_JP_BASE64) {
      doc.addFileToVFS('NotoSansJP-Regular.ttf', NOTO_SANS_JP_BASE64);
      doc.addFont('NotoSansJP-Regular.ttf', 'Noto Sans JP', 'normal');
      console.log('Embedded Noto Sans JP font loaded successfully');
      return;
    }
  } catch (error) {
    console.error('Error loading embedded font:', error);
    console.log('Falling back to built-in fonts');
  }
  
  // If we reach here, something went wrong with the embedded font
  // We'll just use the built-in fonts as a fallback
  console.warn('Using built-in fonts as fallback');
}

/**
 * Alternative method to load font from URL
 * Note: This won't work with CSP restrictions
 */
async function loadFontFromUrl(doc: jsPDF, fontUrl: string): Promise<void> {
  try {
    console.log(`Loading font from ${fontUrl}...`);
    const response = await fetch(fontUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status} ${response.statusText}`);
    }
    
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);
    
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'Noto Sans JP', 'normal');
    console.log('Font loaded successfully from URL');
  } catch (error) {
    console.error('Error loading font from URL:', error);
    throw error;
  }
} 