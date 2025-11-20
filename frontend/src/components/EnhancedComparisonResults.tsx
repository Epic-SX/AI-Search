import { useState, useRef, useEffect } from 'react';
import { ComparisonResult, ProductInfo } from '../types';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Grid, Card, 
  CardContent, Tabs, Tab, Divider, Tooltip, IconButton, CardHeader, Chip,
  CircularProgress
} from '@mui/material';
import { 
  FaDownload, FaFileCsv, FaFilePdf, FaClipboard, 
  FaExternalLinkAlt, FaInfoCircle, FaTable, FaStar, FaCheck, FaCopy
} from 'react-icons/fa';
import SimpleRakutenImage from './SimpleRakutenImage';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

// Import utilities
import { createJapanesePDF, createJapanesePDFWithCustomFont, preloadJapaneseFont } from '../utils/pdfFonts';
import { generateComparisonPDF, generateComparisonPDFWithCustomFont } from '../utils/pdfGenerator';
import { cleanHtmlText, formatForCSV } from '../utils/textUtils';
import { loadCustomJapaneseFont } from '../utils/customFonts';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";

// Helper function to convert image URL to base64 data
const getImageAsBase64 = async (url: string): Promise<string> => {
  try {
    // Create a new image element
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Try to avoid CORS issues
    
    // Create a promise that resolves when the image loads
    const imageLoadPromise = new Promise<string>((resolve, reject) => {
      img.onload = () => {
        try {
          // Create a canvas to draw the image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Get the base64 data
          const dataUrl = canvas.toDataURL('image/jpeg');
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image from ${url}`));
      };
    });
    
    // Set the source to start loading
    img.src = url;
    
    // Add a timeout to avoid hanging
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Image loading timed out')), 5000);
    });
    
    // Return the result of whichever promise resolves/rejects first
    return Promise.race([imageLoadPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

interface EnhancedComparisonResultsProps {
  result: ComparisonResult;
}

export default function EnhancedComparisonResults({ result }: EnhancedComparisonResultsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [comparisonCopied, setComparisonCopied] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrorA, setImageErrorA] = useState(false);
  const [imageErrorB, setImageErrorB] = useState(false);
  const [selectedProductA, setSelectedProductA] = useState<ProductInfo | null>(null);
  const [selectedProductB, setSelectedProductB] = useState<ProductInfo | null>(null);

  // Preload Japanese font when component mounts
  useEffect(() => {
    // Preload Japanese font
    const loadFont = async () => {
      try {
        await preloadJapaneseFont();
      } catch (error) {
        console.warn('Failed to preload Japanese font:', error);
      }
    };
    
    loadFont();
  }, []);

  // Check if a product is from Rakuten
  const isRakutenProduct = (store?: string) => {
    if (!store) return false;
    return store.toLowerCase().includes('rakuten') || store.toLowerCase().includes('楽天');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Function to export comparison data to CSV
  const exportToCSV = () => {
    try {
      // Add BOM (Byte Order Mark) for UTF-8
      // This is crucial for Japanese character support in Excel and other CSV readers
      const BOM = '\uFEFF';
      
      // Create CSV header
      let csvContent = BOM + "カテゴリ,商品A,商品B\n";
      
      // Add basic product info
      csvContent += `商品名,${formatForCSV(result.product_a.title)},${formatForCSV(result.product_b.title)}\n`;
      csvContent += `価格,${result.product_a.price || ''},${result.product_b.price || ''}\n`;
      csvContent += `ストア,${formatForCSV(result.product_a.store)},${formatForCSV(result.product_b.store)}\n`;
      
      // Add differences
      result.differences.forEach(diff => {
        const category = formatForCSV(diff.category);
        const valueA = formatForCSV(diff.product_a_value);
        const valueB = formatForCSV(diff.product_b_value);
        csvContent += `${category},${valueA},${valueB}\n`;
      });
      
      // Create a blob with UTF-8 encoding
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', '商品比較.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSVのエクスポートが完了しました');
    } catch (error) {
      console.error('CSVエクスポート中にエラーが発生しました:', error);
      toast.error('CSVエクスポート中にエラーが発生しました');
    }
  };

  // Copy all comparison data to clipboard
  const copyComparisonToClipboard = () => {
    try {
      // Format the comparison data for clipboard
      let clipboardText = `商品比較: ${result.product_a.title} vs ${result.product_b.title}\n\n`;
      
      // Basic product info
      clipboardText += `商品A: ${result.product_a.title}\n`;
      clipboardText += `価格: ¥${(result.product_a.price || 0).toLocaleString()}\n`;
      clipboardText += `ストア: ${result.product_a.store || ''}\n\n`;
      
      clipboardText += `商品B: ${result.product_b.title}\n`;
      clipboardText += `価格: ¥${(result.product_b.price || 0).toLocaleString()}\n`;
      clipboardText += `ストア: ${result.product_b.store || ''}\n\n`;
      
      // Differences by significance
      const highDiffs = result.differences.filter(d => d.significance === 'high');
      const mediumDiffs = result.differences.filter(d => d.significance === 'medium');
      const lowDiffs = result.differences.filter(d => d.significance === 'low');
      
      if (highDiffs.length > 0) {
        clipboardText += `【重要な違い】\n`;
        highDiffs.forEach(diff => {
          clipboardText += `${diff.category}:\n`;
          clipboardText += `  商品A: ${cleanHtmlText(diff.product_a_value)}\n`;
          clipboardText += `  商品B: ${cleanHtmlText(diff.product_b_value)}\n\n`;
        });
      }
      
      if (mediumDiffs.length > 0) {
        clipboardText += `【中程度の違い】\n`;
        mediumDiffs.forEach(diff => {
          clipboardText += `${diff.category}:\n`;
          clipboardText += `  商品A: ${cleanHtmlText(diff.product_a_value)}\n`;
          clipboardText += `  商品B: ${cleanHtmlText(diff.product_b_value)}\n\n`;
        });
      }
      
      if (lowDiffs.length > 0) {
        clipboardText += `【その他の違い】\n`;
        lowDiffs.forEach(diff => {
          clipboardText += `${diff.category}:\n`;
          clipboardText += `  商品A: ${cleanHtmlText(diff.product_a_value)}\n`;
          clipboardText += `  商品B: ${cleanHtmlText(diff.product_b_value)}\n\n`;
        });
      }
      
      // Add recommendation
      if (result.recommendation) {
        clipboardText += `【おすすめ】\n${result.recommendation}\n`;
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(clipboardText);
      setComparisonCopied(true);
      
      // Reset copy status after 2 seconds
      setTimeout(() => {
        setComparisonCopied(false);
      }, 2000);
      
      toast.success('比較データをクリップボードにコピーしました');
    } catch (error) {
      console.error('Error copying comparison data:', error);
      toast.error('データのコピーに失敗しました');
    }
  };

  // Function to generate and download PDF with images and page numbers
  const downloadPDF = async () => {
    try {
      // Create data for the PDF
      const title = `商品比較: ${cleanHtmlText(result.product_a.title)} vs ${cleanHtmlText(result.product_b.title)}`;
      
      // Create headers and data for the table
      const headers = ['カテゴリ', '商品A', '商品B', '重要度'];
      
      // Prepare data rows
      const data = [
        // Basic product info
        ['商品名', cleanHtmlText(result.product_a.title), cleanHtmlText(result.product_b.title), ''],
        ['価格', `¥${(result.product_a.price || 0).toLocaleString()}`, `¥${(result.product_b.price || 0).toLocaleString()}`, ''],
        ['ストア', cleanHtmlText(result.product_a.store), cleanHtmlText(result.product_b.store), ''],
      ];
      
      // Add differences
      result.differences.forEach(diff => {
        data.push([
          diff.category,
          cleanHtmlText(diff.product_a_value),
          cleanHtmlText(diff.product_b_value),
          diff.significance === 'high' ? '高' : diff.significance === 'medium' ? '中' : '低'
        ]);
      });
      
      // Generate PDF with custom font
      await generateComparisonPDFWithCustomFont(
        title,
        headers,
        data,
        'product-comparison.pdf'
      );
      
      // Show success notification
      toast.success('PDFのエクスポートが完了しました');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF生成中にエラーが発生しました');
    }
  };

  // Download bulk PDF with entire comparison section
  const downloadBulkPDF = async () => {
    try {
      setBulkDownloading(true);
      let captureSuccessful = false;
      let canvas;
      
      try {
        // Try to capture the entire comparison section
        const comparisonElement = document.getElementById('comparison-section');
        if (!comparisonElement) {
          throw new Error('Comparison section element not found');
        }
        
        canvas = await html2canvas(comparisonElement, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        captureSuccessful = true;
      } catch (captureError) {
        console.error('Error capturing comparison section:', captureError);
        // We'll continue with text-based PDF if capture fails
      }
      
      if (captureSuccessful && canvas) {
        // Use the text-based approach that works correctly
        const title = `商品比較: ${cleanHtmlText(result.product_a.title)} vs ${cleanHtmlText(result.product_b.title)}`;
        const headers = ['カテゴリ', '商品A', '商品B', '重要度'];
        
        // Prepare data rows
        const data = [
          // Basic product info
          ['商品名', cleanHtmlText(result.product_a.title), cleanHtmlText(result.product_b.title), ''],
          ['価格', `¥${(result.product_a.price || 0).toLocaleString()}`, `¥${(result.product_b.price || 0).toLocaleString()}`, ''],
          ['ストア', cleanHtmlText(result.product_a.store), cleanHtmlText(result.product_b.store), ''],
        ];
        
        // Add differences
        result.differences.forEach(diff => {
          data.push([
            diff.category,
            cleanHtmlText(diff.product_a_value),
            cleanHtmlText(diff.product_b_value),
            diff.significance === 'high' ? '高' : diff.significance === 'medium' ? '中' : '低'
          ]);
        });
        
        // Generate PDF with custom font - this function already works correctly
        await generateComparisonPDFWithCustomFont(
          title,
          headers,
          data,
          'product-comparison-full.pdf'
        );
      } else {
        // Fallback to text-based PDF if capture fails
        // Generate the PDF using our custom font utility function
        const title = `商品比較: ${cleanHtmlText(result.product_a.title)} vs ${cleanHtmlText(result.product_b.title)}`;
        const headers = ['カテゴリ', '商品A', '商品B', '重要度'];
        
        // Prepare data rows
        const data = [
          // Basic product info
          ['商品名', cleanHtmlText(result.product_a.title), cleanHtmlText(result.product_b.title), ''],
          ['価格', `¥${(result.product_a.price || 0).toLocaleString()}`, `¥${(result.product_b.price || 0).toLocaleString()}`, ''],
          ['ストア', cleanHtmlText(result.product_a.store), cleanHtmlText(result.product_b.store), ''],
        ];
        
        // Add differences
        result.differences.forEach(diff => {
          data.push([
            diff.category,
            cleanHtmlText(diff.product_a_value),
            cleanHtmlText(diff.product_b_value),
            diff.significance === 'high' ? '高' : diff.significance === 'medium' ? '中' : '低'
          ]);
        });
        
        // Generate PDF with custom font - this function already works correctly
        await generateComparisonPDFWithCustomFont(title, headers, data, 'product-comparison-full.pdf');
      }
      
      // Show success notification
      toast.success('PDFのエクスポートが完了しました');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF生成中にエラーが発生しました');
    } finally {
      setBulkDownloading(false);
    }
  };

  // Render product card
  const renderProductCard = (product: ProductInfo, isProductA: boolean) => {
    const imageError = isProductA ? imageErrorA : imageErrorB;
    const setImageError = isProductA ? setImageErrorA : setImageErrorB;
    const imageId = isProductA ? 'product-a-image' : 'product-b-image';
    
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold' }}>
            {isProductA ? '商品A' : '商品B'}
          </Typography>
          <Box 
            id={imageId} 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 200, 
              mb: 2,
              backgroundColor: '#f9f9f9',
              borderRadius: 1,
              p: 1
            }}
          >
            {isRakutenProduct(product.store) ? (
              <SimpleRakutenImage
                imageUrl={product.image_url || ''}
                title={product.title || ''}
                height={180}
              />
            ) : (
              <Box 
                component="img"
                height={180}
                src={imageError ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                alt={product.title || ''}
                onError={() => setImageError(true)}
                sx={{ objectFit: 'contain', maxWidth: '100%' }}
              />
            )}
          </Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', lineHeight: 1.3, minHeight: '3.9em' }}>
            {product.title}
          </Typography>
          <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
            ¥{(product.price || 0).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
            {product.store}
          </Typography>
          
          {product.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line', maxHeight: '100px', overflow: 'auto' }}>
              {cleanHtmlText(product.description)}
            </Typography>
          )}
          
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button
              component="a"
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              fullWidth
              startIcon={<FaExternalLinkAlt />}
              sx={{ borderRadius: '4px', py: 1 }}
            >
              商品ページへ
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render comparison table
  const renderComparisonTable = () => {
    // Find specific differences for the new columns
    const loadCapacityDiff = result.differences.find(diff => 
      diff.category.includes('耐荷重') || 
      diff.category.includes('最大荷重') || 
      diff.category.includes('荷重')
    );
    
    const featuresDiff = result.differences.find(diff => 
      diff.category.includes('特徴') || 
      diff.category.includes('機能') || 
      diff.category.includes('特性')
    );
    
    // Filter out the differences that are already shown in the main columns
    const otherDifferences = result.differences.filter(diff => 
      diff.category !== '価格' && 
      diff.category !== '送料' && 
      diff !== loadCapacityDiff && 
      diff !== featuresDiff
    );
    
    // Helper function to format multiline text for display
    const formatMultilineText = (text: string) => {
      if (!text) return '';
      
      // Clean the text first
      const cleanedText = cleanHtmlText(text);
      
      // Split by newlines and map each line to a paragraph
      return cleanedText.split('\n').map((line, index) => (
        <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
          {line}
        </Typography>
      ));
    };
    
    return (
      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ fontWeight: 'bold', color: 'white', width: '20%', whiteSpace: 'normal', fontSize: '1rem' }}>カテゴリ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white', width: '40%', whiteSpace: 'normal', fontSize: '1rem' }}>商品A</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white', width: '40%', whiteSpace: 'normal', fontSize: '1rem' }}>商品B</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Basic product info rows */}
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>商品名</TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{result.product_a.title}</TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>{result.product_b.title}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>価格</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', whiteSpace: 'normal', p: 2 }}>
                ¥{(result.product_a.price || 0).toLocaleString()} <Typography component="span" variant="caption" color="text.secondary">(税込)</Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                ¥{(result.product_b.price || 0).toLocaleString()} <Typography component="span" variant="caption" color="text.secondary">(税込)</Typography>
              </TableCell>
            </TableRow>
            
            {/* Load capacity row if available */}
            {loadCapacityDiff && (
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>耐荷重</TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{loadCapacityDiff.product_a_value}</TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>{loadCapacityDiff.product_b_value}</TableCell>
              </TableRow>
            )}
            
            {/* Features row if available */}
            {featuresDiff && (
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>特徴</TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                  {formatMultilineText(featuresDiff.product_a_value)}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                  {formatMultilineText(featuresDiff.product_b_value)}
                </TableCell>
              </TableRow>
            )}
            
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>ストア</TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{result.product_a.store}</TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>{result.product_b.store}</TableCell>
            </TableRow>
            
            {/* Product URL row */}
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>商品ページ</TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                <Button
                  component="a"
                  href={result.product_a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  startIcon={<FaExternalLinkAlt />}
                >
                  商品ページへ
                </Button>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                <Button
                  component="a"
                  href={result.product_b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  startIcon={<FaExternalLinkAlt />}
                >
                  商品ページへ
                </Button>
              </TableCell>
            </TableRow>
            
            {/* Description row if available */}
            {(result.product_a.description || result.product_b.description) && (
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>説明</TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                  {formatMultilineText(result.product_a.description || '-')}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                  {formatMultilineText(result.product_b.description || '-')}
                </TableCell>
              </TableRow>
            )}
            
            {/* Only show the differences section if there are other differences */}
            {otherDifferences.length > 0 && (
              <>
                {/* Divider row */}
                <TableRow>
                  <TableCell colSpan={3} sx={{ backgroundColor: 'primary.light', py: 1, whiteSpace: 'normal' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center', whiteSpace: 'normal' }}>
                      その他の違い
                    </Typography>
                  </TableCell>
                </TableRow>
                
                {/* Other differences rows */}
                {otherDifferences.map((diff, index) => (
                  <TableRow key={index} sx={{ 
                    backgroundColor: diff.significance === 'high' ? 'rgba(255, 235, 235, 0.5)' : 
                                      diff.significance === 'medium' ? 'rgba(255, 248, 225, 0.5)' : 
                                      'transparent',
                    whiteSpace: 'normal'
                  }}>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', whiteSpace: 'normal', borderLeft: '4px solid #e0e0e0' }}>
                      {diff.category}
                      {diff.significance === 'high' && (
                        <Typography component="span" sx={{ ml: 1, color: 'error.main', fontSize: '0.8rem', whiteSpace: 'normal' }}>
                          (重要)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                      {formatMultilineText(diff.product_a_value)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                      {formatMultilineText(diff.product_b_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box id="comparison-section" sx={{ position: 'relative' }}>
      {/* Action buttons */}
      <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10, display: 'flex', gap: 1 }}>
        <Tooltip title="PDFダウンロード">
          <IconButton 
            onClick={downloadPDF} 
            color="primary"
          >
            <FaFilePdf />
          </IconButton>
        </Tooltip>
        <Tooltip title="一括PDFダウンロード">
          <IconButton 
            onClick={downloadBulkPDF} 
            color="primary"
            disabled={bulkDownloading}
          >
            {bulkDownloading ? <CircularProgress size={24} /> : <FaDownload />}
          </IconButton>
        </Tooltip>
        <Tooltip title={comparisonCopied ? "コピー完了" : "すべてコピー"}>
          <IconButton 
            onClick={copyComparisonToClipboard} 
            color={comparisonCopied ? "success" : "primary"}
          >
            {comparisonCopied ? <FaCheck /> : <FaCopy />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Replace the tab view with a combined view */}
      <Box sx={{ 
        mt: 4,
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3
      }}>
        {/* Product comparison section */}
        <Box sx={{ 
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          gap: 2 
        }}>
          <Paper elevation={2} sx={{ p: 2, position: 'relative' }}>
            <Typography variant="h6" gutterBottom>
              商品基本情報
            </Typography>
            
            <Grid container spacing={3}>
              {/* Product A info */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader 
                    title="商品 A"
                    titleTypographyProps={{ variant: 'subtitle1' }}
                    sx={{ bgcolor: 'primary.light', color: 'white', py: 1 }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    {result.product_a.image_url && (
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <img
                          src={result.product_a.image_url}
                          alt={result.product_a.title || '商品A'}
                          style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain' }}
                        />
                      </Box>
                    )}
                    <Typography variant="body2" gutterBottom noWrap title={result.product_a.title}>
                      <strong>{result.product_a.title}</strong>
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      ¥{(result.product_a.price || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {result.product_a.store}
                    </Typography>
                    {result.product_a.url && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        href={result.product_a.url} 
                        target="_blank"
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        商品を見る
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Product B info */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader 
                    title="商品 B"
                    titleTypographyProps={{ variant: 'subtitle1' }}
                    sx={{ bgcolor: 'secondary.light', color: 'white', py: 1 }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    {result.product_b.image_url && (
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <img
                          src={result.product_b.image_url}
                          alt={result.product_b.title || '商品B'}
                          style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain' }}
                        />
                      </Box>
                    )}
                    <Typography variant="body2" gutterBottom noWrap title={result.product_b.title}>
                      <strong>{result.product_b.title}</strong>
                    </Typography>
                    <Typography variant="body2" color="secondary" fontWeight="bold">
                      ¥{(result.product_b.price || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {result.product_b.store}
                    </Typography>
                    {result.product_b.url && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        href={result.product_b.url} 
                        target="_blank"
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        商品を見る
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Recommendation section */}
          {result.recommendation && (
            <Paper elevation={2} sx={{ p: 2, bgcolor: 'rgba(255, 252, 220, 0.3)' }}>
              <Typography variant="subtitle1" gutterBottom>
                <FaStar style={{ color: '#F9A825', marginRight: '8px', verticalAlign: 'middle' }} />
                おすすめ
              </Typography>
              <Typography variant="body2">{result.recommendation}</Typography>
            </Paper>
          )}
        </Box>
        
        {/* Differences table section */}
        <Box sx={{ width: { xs: '100%', md: '50%' } }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              違いの比較
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="30%">項目</TableCell>
                    <TableCell width="30%">商品 A</TableCell>
                    <TableCell width="30%">商品 B</TableCell>
                    <TableCell width="10%" align="center">重要度</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Group differences by significance */}
                  {/* High significance differences */}
                  <TableRow>
                    <TableCell 
                      colSpan={4} 
                      sx={{ bgcolor: 'error.light', color: 'white', fontWeight: 'bold' }}
                    >
                      重要な違い
                    </TableCell>
                  </TableRow>
                  {result.differences
                    .filter(diff => diff.significance === 'high')
                    .map((diff, idx) => (
                      <TableRow key={`high-${idx}`}>
                        <TableCell><Typography variant="body2">{diff.category}</Typography></TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_a_value }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_b_value }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label="高" 
                            size="small" 
                            color="error" 
                            sx={{ minWidth: '40px' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    
                  {/* Medium significance differences */}
                  <TableRow>
                    <TableCell 
                      colSpan={4} 
                      sx={{ bgcolor: 'warning.light', color: 'white', fontWeight: 'bold' }}
                    >
                      中程度の違い
                    </TableCell>
                  </TableRow>
                  {result.differences
                    .filter(diff => diff.significance === 'medium')
                    .map((diff, idx) => (
                      <TableRow key={`medium-${idx}`}>
                        <TableCell><Typography variant="body2">{diff.category}</Typography></TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_a_value }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_b_value }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label="中" 
                            size="small" 
                            color="warning" 
                            sx={{ minWidth: '40px' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    
                  {/* Low significance differences */}
                  <TableRow>
                    <TableCell 
                      colSpan={4} 
                      sx={{ bgcolor: 'info.light', color: 'white', fontWeight: 'bold' }}
                    >
                      その他の違い
                    </TableCell>
                  </TableRow>
                  {result.differences
                    .filter(diff => diff.significance === 'low')
                    .map((diff, idx) => (
                      <TableRow key={`low-${idx}`}>
                        <TableCell><Typography variant="body2">{diff.category}</Typography></TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_a_value }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            dangerouslySetInnerHTML={{ __html: diff.product_b_value }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label="低" 
                            size="small" 
                            color="info" 
                            sx={{ minWidth: '40px' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
} 