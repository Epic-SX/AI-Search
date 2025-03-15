import { useState, useRef, useEffect } from 'react';
import { ComparisonResult, ProductInfo } from '../types';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Grid, Card, 
  CardContent, Tabs, Tab, Divider, Tooltip, IconButton
} from '@mui/material';
import { 
  FaDownload, FaFileCsv, FaFilePdf, FaClipboard, 
  FaExternalLinkAlt, FaInfoCircle, FaTable
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
  const [imageErrorA, setImageErrorA] = useState(false);
  const [imageErrorB, setImageErrorB] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

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

  // Function to copy all comparison data to clipboard
  const copyToClipboard = () => {
    try {
      let textContent = `商品比較: ${cleanHtmlText(result.product_a.title)} vs ${cleanHtmlText(result.product_b.title)}\n\n`;
      
      textContent += `商品A: ${cleanHtmlText(result.product_a.title)}\n`;
      textContent += `価格: ¥${(result.product_a.price || 0).toLocaleString()}\n`;
      textContent += `ストア: ${cleanHtmlText(result.product_a.store)}\n`;
      textContent += `URL: ${result.product_a.url || ''}\n\n`;
      
      textContent += `商品B: ${cleanHtmlText(result.product_b.title)}\n`;
      textContent += `価格: ¥${(result.product_b.price || 0).toLocaleString()}\n`;
      textContent += `ストア: ${cleanHtmlText(result.product_b.store)}\n`;
      textContent += `URL: ${result.product_b.url || ''}\n\n`;
      
      textContent += "主な違い:\n";
      result.differences.forEach(diff => {
        textContent += `${diff.category}: ${cleanHtmlText(diff.product_a_value)} vs ${cleanHtmlText(diff.product_b_value)} (重要度: ${diff.significance})\n`;
      });
      
      if (result.recommendation) {
        textContent += `\nおすすめ: ${cleanHtmlText(result.recommendation)}\n`;
      }
      
      navigator.clipboard.writeText(textContent)
        .then(() => {
          toast.success('比較データをクリップボードにコピーしました');
        })
        .catch(err => {
          console.error('クリップボードへのコピーに失敗しました:', err);
          toast.error('クリップボードへのコピーに失敗しました');
        });
    } catch (error) {
      console.error('クリップボードへのコピー中にエラーが発生しました:', error);
      toast.error('クリップボードへのコピーに失敗しました');
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
                ¥{(result.product_a.price || 0).toLocaleString()}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', whiteSpace: 'normal', p: 2, backgroundColor: '#f8f8f8' }}>
                ¥{(result.product_b.price || 0).toLocaleString()}
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
    <Box sx={{ mt: 4 }} ref={comparisonRef} id="comparison-section">
      {/* Action buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Tooltip title="CSVでダウンロード">
          <Button 
            variant="outlined" 
            startIcon={<FaFileCsv />}
            onClick={exportToCSV}
          >
            CSV出力
          </Button>
        </Tooltip>
        
        <Tooltip title="PDFでダウンロード（画像付き）">
          <Button 
            variant="outlined" 
            startIcon={<FaFilePdf />}
            onClick={downloadPDF}
          >
            PDF出力
          </Button>
        </Tooltip>
        
        <Tooltip title="一括PDFダウンロード（ページ番号付き）">
          <Button 
            variant="outlined" 
            startIcon={<FaDownload />}
            onClick={downloadBulkPDF}
            disabled={bulkDownloading}
          >
            一括PDF出力
          </Button>
        </Tooltip>
        
        <Tooltip title="すべてコピー">
          <Button 
            variant="outlined" 
            startIcon={<FaClipboard />}
            onClick={copyToClipboard}
          >
            一括コピー
          </Button>
        </Tooltip>
      </Box>
      
      {/* View toggle tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<FaTable />} label="テーブル表示" />
          <Tab icon={<FaInfoCircle />} label="詳細表示" />
        </Tabs>
      </Box>
      
      {/* Table view */}
      {activeTab === 0 && (
        <Box>
          {renderComparisonTable()}
          
          {result.recommendation && (
            <Card sx={{ mt: 3, border: '1px solid #4caf50', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
                  おすすめ
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {result.recommendation}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
      
      {/* Detailed view */}
      {activeTab === 1 && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              {renderProductCard(result.product_a, true)}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderProductCard(result.product_b, false)}
            </Grid>
          </Grid>
          
          <Card sx={{ mb: 4, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold' }}>
                主な違い
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell sx={{ width: '20%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>カテゴリ</TableCell>
                      <TableCell sx={{ width: '35%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>商品A</TableCell>
                      <TableCell sx={{ width: '35%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>商品B</TableCell>
                      <TableCell sx={{ width: '10%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>重要度</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.differences.map((diff, index) => (
                      <TableRow key={index} sx={{ 
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f8f8'
                      }}>
                        <TableCell sx={{ whiteSpace: 'normal', fontWeight: 'bold', borderLeft: '4px solid #e0e0e0' }}>{diff.category}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{cleanHtmlText(diff.product_a_value)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{cleanHtmlText(diff.product_b_value)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                          <Typography 
                            sx={{ 
                              color: diff.significance === 'high' ? 'error.main' : 
                                    diff.significance === 'medium' ? 'warning.main' : 'info.main',
                              fontWeight: diff.significance === 'high' ? 'bold' : 'normal'
                            }}
                          >
                            {diff.significance === 'high' && '高'}
                            {diff.significance === 'medium' && '中'}
                            {diff.significance === 'low' && '低'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          
          {result.recommendation && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  おすすめ
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {cleanHtmlText(result.recommendation)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
} 