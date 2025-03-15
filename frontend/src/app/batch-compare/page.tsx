'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { compareProducts } from '@/api';
import { ComparisonResult } from '@/types';
import BatchCompareForm from '@/components/BatchCompareForm';
import EnhancedComparisonResults from '@/components/EnhancedComparisonResults';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Container, Typography, Box, Divider, Button, Tabs, Tab, Paper } from '@mui/material';
import { FaFilePdf, FaFileCsv, FaTable } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { loadCustomJapaneseFont } from '@/utils/customFonts';

export default function BatchComparePage() {
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [activeResultTab, setActiveResultTab] = useState(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveResultTab(newValue);
  };

  // Handle batch comparison
  const handleBatchCompare = async (productPairs: Array<{ productA: string, productB: string }>) => {
    setLoading(true);
    setComparisonResults([]);
    setCurrentIndex(0);
    setTotalPairs(productPairs.length);
    setActiveResultTab(0);
    
    const results: ComparisonResult[] = [];
    
    try {
      for (let i = 0; i < productPairs.length; i++) {
        const { productA, productB } = productPairs[i];
        setCurrentIndex(i + 1);
        
        // Try up to 3 times with a delay between retries
        let retryCount = 0;
        let success = false;
        
        while (retryCount < 3 && !success) {
          try {
            // Add a small delay before retrying
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              toast.info(`リトライ中... (${retryCount}/3)`);
            }
            
            const result = await compareProducts(productA, productB);
            results.push(result);
            success = true;
          } catch (error: any) {
            retryCount++;
            console.error(`商品比較エラー (${productA} vs ${productB}) - 試行 ${retryCount}/3:`, error);
            
            // If we've exhausted all retries, show an error
            if (retryCount >= 3) {
              // Extract more detailed error message if available
              let errorMessage = '不明なエラー';
              
              if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              // Show a more user-friendly error message
              if (errorMessage.includes('Could not find information for product')) {
                errorMessage = `商品情報が見つかりませんでした: ${errorMessage.includes(productA) ? productA : productB}`;
              } else if (errorMessage.includes('Price information not available')) {
                errorMessage = `価格情報が利用できません: ${errorMessage.includes(productA) ? productA : productB}`;
              }
              
              toast.error(`${productA} と ${productB} の比較中にエラーが発生しました: ${errorMessage}`);
            }
          }
        }
      }
      
      if (results.length > 0) {
        setComparisonResults(results);
        toast.success(`${results.length}件の商品比較が完了しました`);
      } else {
        toast.error('商品比較に失敗しました。商品情報を確認して再試行してください。');
      }
    } catch (error) {
      console.error('一括比較中にエラーが発生しました:', error);
      toast.error('一括比較中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Function to export all comparisons to a single PDF
  const exportAllToPDF = async () => {
    if (comparisonResults.length === 0) {
      toast.error('エクスポートする比較結果がありません');
      return;
    }
    
    try {
      // Create a new PDF document with custom Japanese font support
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true,
        hotfixes: ['px_scaling']
      });
      
      // Load custom Japanese font
      await loadCustomJapaneseFont(doc);
      
      // Set font to Noto Sans JP
      doc.setFont('Noto Sans JP');
      
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
      
      // Add title
      doc.setFontSize(18);
      safeAddText('商品比較一括レポート', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      
      let yPosition = 30;
      
      // Add each comparison to the PDF
      for (let i = 0; i < comparisonResults.length; i++) {
        const result = comparisonResults[i];
        
        // Add comparison header
        doc.setFontSize(14);
        safeAddText(`比較 ${i + 1}: ${result.product_a.title} vs ${result.product_b.title}`, 14, yPosition);
        doc.setFontSize(12);
        yPosition += 10;
        
        // Add product information
        safeAddText(`商品A: ${result.product_a.title}`, 20, yPosition);
        yPosition += 7;
        safeAddText(`価格: ¥${(result.product_a.price || 0).toLocaleString()}`, 25, yPosition);
        yPosition += 7;
        safeAddText(`ストア: ${result.product_a.store || ''}`, 25, yPosition);
        yPosition += 10;
        
        safeAddText(`商品B: ${result.product_b.title}`, 20, yPosition);
        yPosition += 7;
        safeAddText(`価格: ¥${(result.product_b.price || 0).toLocaleString()}`, 25, yPosition);
        yPosition += 7;
        safeAddText(`ストア: ${result.product_b.store || ''}`, 25, yPosition);
        yPosition += 15;
        
        // Add differences table
        const tableData = result.differences.map(diff => [
          diff.category,
          diff.product_a_value,
          diff.product_b_value,
          diff.significance === 'high' ? '高' : diff.significance === 'medium' ? '中' : '低'
        ]);
        
        // Add table to PDF using autoTable with font configuration
        autoTable(doc, {
          startY: yPosition,
          head: [['カテゴリ', '商品A', '商品B', '重要度']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], font: 'Noto Sans JP' },
          bodyStyles: { font: 'Noto Sans JP' },
          styles: { font: 'Noto Sans JP' }
        });
        
        // Get the final Y position after the table
        yPosition = (doc as any).lastAutoTable.finalY + 15;
        
        // Add recommendation if available
        if (result.recommendation) {
          safeAddText('おすすめ:', 14, yPosition);
          yPosition += 7;
          
          // Split recommendation text to fit page width
          const splitText = doc.splitTextToSize(result.recommendation, 180);
          for (let j = 0; j < splitText.length; j++) {
            safeAddText(splitText[j], 20, yPosition + (j * 7));
          }
          yPosition += splitText.length * 7 + 15;
        }
        
        // Add page break if not the last comparison
        if (i < comparisonResults.length - 1) {
          doc.addPage();
          yPosition = 30;
        }
      }
      
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        safeAddText(`ページ ${i} / ${pageCount}`, 195, 285, { align: 'right' });
      }
      
      // Save the PDF
      doc.save('商品比較一括レポート.pdf');
      toast.success('PDFのエクスポートが完了しました');
    } catch (error) {
      console.error('PDF生成中にエラーが発生しました:', error);
      toast.error('PDF生成中にエラーが発生しました');
    }
  };

  // Function to export all comparisons to CSV
  const exportAllToCSV = () => {
    if (comparisonResults.length === 0) {
      toast.error('エクスポートする比較結果がありません');
      return;
    }
    
    try {
      // Add BOM (Byte Order Mark) for UTF-8
      const BOM = '\uFEFF';
      
      // Create CSV content
      let csvContent = BOM + "比較番号,カテゴリ,商品A,商品B\n";
      
      // Add each comparison to the CSV
      for (let i = 0; i < comparisonResults.length; i++) {
        const result = comparisonResults[i];
        
        // Add basic product info
        csvContent += `${i + 1},商品名,${result.product_a.title?.replace(/,/g, '，') || ''},${result.product_b.title?.replace(/,/g, '，') || ''}\n`;
        csvContent += `${i + 1},価格,${result.product_a.price || ''},${result.product_b.price || ''}\n`;
        csvContent += `${i + 1},ストア,${result.product_a.store?.replace(/,/g, '，') || ''},${result.product_b.store?.replace(/,/g, '，') || ''}\n`;
        
        // Add differences
        result.differences.forEach(diff => {
          const category = diff.category.replace(/,/g, '，');
          const valueA = diff.product_a_value.replace(/,/g, '，');
          const valueB = diff.product_b_value.replace(/,/g, '，');
          csvContent += `${i + 1},${category},${valueA},${valueB}\n`;
        });
        
        // Add empty line between comparisons
        if (i < comparisonResults.length - 1) {
          csvContent += "\n";
        }
      }
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', '商品比較一括.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSVのエクスポートが完了しました');
    } catch (error) {
      console.error('CSV生成中にエラーが発生しました:', error);
      toast.error('CSV生成中にエラーが発生しました');
    }
  };

  // Function to get tab label
  const getTabLabel = (index: number) => {
    const result = comparisonResults[index];
    if (!result) return `比較 ${index + 1}`;
    
    // Get shortened product names
    const productAName = result.product_a.title || '';
    const productBName = result.product_b.title || '';
    
    // Extract model numbers if possible
    const modelA = productAName.match(/[A-Z0-9]+-[A-Z0-9]+/) || productAName.substring(0, 10);
    const modelB = productBName.match(/[A-Z0-9]+-[A-Z0-9]+/) || productBName.substring(0, 10);
    
    return `比較 ${index + 1}: ${modelA} vs ${modelB}`;
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        一括比較
      </Typography>
      
      <BatchCompareForm onBatchCompare={handleBatchCompare} />
      
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <LoadingSpinner />
          <Typography variant="body1" sx={{ mt: 2 }}>
            商品比較中... ({currentIndex}/{totalPairs})
          </Typography>
        </Box>
      ) : (
        <>
          {comparisonResults.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<FaFilePdf />}
                  onClick={exportAllToPDF}
                >
                  すべてPDF出力
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FaFileCsv />}
                  onClick={exportAllToCSV}
                >
                  すべてCSV出力
                </Button>
              </Box>
              
              <Paper sx={{ mb: 4 }}>
                <Tabs 
                  value={activeResultTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                      minWidth: 120,
                      py: 1.5
                    }
                  }}
                >
                  {comparisonResults.map((_, index) => (
                    <Tab 
                      key={index} 
                      label={getTabLabel(index)}
                      icon={<FaTable />}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
                
                {comparisonResults.map((result, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: activeResultTab === index ? 'block' : 'none',
                      p: 2
                    }}
                  >
                    <EnhancedComparisonResults result={result} />
                  </Box>
                ))}
              </Paper>
            </Box>
          )}
        </>
      )}
    </Container>
  );
} 