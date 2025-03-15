/**
 * Cleans HTML tags from text and formats it properly
 * 
 * @param htmlText - The HTML text to clean
 * @returns The cleaned text with HTML tags removed and proper formatting
 */
export const cleanHtmlText = (htmlText: string | undefined): string => {
  if (!htmlText) return '';
  
  // Replace <br>, <br/>, <br /> with newlines
  let cleaned = htmlText.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all other HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Replace multiple newlines with a single newline
  cleaned = cleaned.replace(/\n+/g, '\n');
  
  // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Formats text for CSV export
 * 
 * @param text - The text to format for CSV
 * @returns The formatted text safe for CSV export
 */
export const formatForCSV = (text: string | undefined): string => {
  if (!text) return '';
  
  // First clean any HTML
  let cleaned = cleanHtmlText(text);
  
  // Replace commas with full-width commas for CSV compatibility
  cleaned = cleaned.replace(/,/g, '，');
  
  // Replace quotes with double quotes (CSV escaping)
  cleaned = cleaned.replace(/"/g, '""');
  
  // If the text contains commas, quotes, or newlines, wrap it in quotes
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    cleaned = `"${cleaned}"`;
  }
  
  return cleaned;
}; 