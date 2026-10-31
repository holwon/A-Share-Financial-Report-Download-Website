import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StockSearch } from './components/StockSearch';
import { StockSummary } from './components/StockSummary';
import { ReportsTab } from './components/ReportsTab';
import { FinancialStatementsTab } from './components/FinancialStatementsTab';
import { DuPontAnalysisTab } from './components/DuPontAnalysisTab';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { BatchDownloadModal } from './components/BatchDownloadModal';
import {
  StockBasic,
  StockQuote,
  ReportItem,
  FinancialStatementsData,
} from './types/stock';
import { POPULAR_STOCKS } from './data/popularStocks';
import {
  FileText,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
  Download,
  Database,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'reports' | 'financials' | 'dupont'>('reports');
  const [currentStock, setCurrentStock] = useState<StockBasic>(POPULAR_STOCKS[0]); // Default 贵州茅台 (600519)
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [financials, setFinancials] = useState<FinancialStatementsData | null>(null);

  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);

  // Modals state
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);
  const [batchReportsToDownload, setBatchReportsToDownload] = useState<ReportItem[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Theme mode
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Fetch Stock Quote
  const fetchQuote = useCallback(async (code: string) => {
    setIsLoadingQuote(true);
    try {
      const res = await fetch(`/api/stock/quote?code=${code}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setQuote(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch quote:', err);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  // Fetch Reports
  const fetchReports = useCallback(async (code: string) => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/stock/reports?code=${code}&category=all`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.reports) {
          setReports(json.data.reports);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  // Fetch Financials
  const fetchFinancials = useCallback(async (code: string) => {
    setIsLoadingFinancials(true);
    try {
      const res = await fetch(`/api/stock/financials?code=${code}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setFinancials({
            ...json.data,
            stockName: currentStock.name,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch financials:', err);
    } finally {
      setIsLoadingFinancials(false);
    }
  }, [currentStock.name]);

  // Load all data on stock change
  useEffect(() => {
    if (currentStock?.code) {
      fetchQuote(currentStock.code);
      fetchReports(currentStock.code);
      fetchFinancials(currentStock.code);
    }
  }, [currentStock.code, fetchQuote, fetchReports, fetchFinancials]);

  // Handle Stock Selection
  const handleSelectStock = (stock: StockBasic) => {
    setCurrentStock(stock);
  };

  // One-Click Excel Export Trigger
  const handleExportExcel = () => {
    const code = currentStock.code;
    const name = quote?.name || currentStock.name;
    window.location.href = `/api/export/excel?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}`;
  };

  // Open Batch Download Modal
  const handleBatchDownload = (selected: ReportItem[]) => {
    if (selected.length === 0) return;
    setBatchReportsToDownload(selected);
    setIsBatchModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportExcel={handleExportExcel}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Stock Selector */}
        <section>
          <StockSearch
            currentCode={currentStock.code}
            onSelectStock={handleSelectStock}
            isLoading={isLoadingQuote}
          />
        </section>

        {/* Stock Real-Time Summary Banner */}
        <section>
          <StockSummary
            quote={quote}
            isLoading={isLoadingQuote}
            onRefresh={() => fetchQuote(currentStock.code)}
          />
        </section>

        {/* Primary Viewport Tabs */}
        <section className="space-y-4">
          {/* View Tab Buttons on Mobile */}
          <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-3 border-b-2 font-semibold ${
                activeTab === 'reports'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500'
              }`}
            >
              定期报告 (PDF)
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`py-2 px-3 border-b-2 font-semibold ${
                activeTab === 'financials'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500'
              }`}
            >
              财务三表 (Excel)
            </button>
            <button
              onClick={() => setActiveTab('dupont')}
              className={`py-2 px-3 border-b-2 font-semibold ${
                activeTab === 'dupont'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500'
              }`}
            >
              指标趋势与杜邦
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === 'reports' && (
            <ReportsTab
              reports={reports}
              isLoading={isLoadingReports}
              onPreviewPdf={(rep) => setPreviewReport(rep)}
              onBatchDownload={handleBatchDownload}
              stockCode={currentStock.code}
              stockName={quote?.name || currentStock.name}
            />
          )}

          {activeTab === 'financials' && (
            <FinancialStatementsTab
              data={financials}
              isLoading={isLoadingFinancials}
              onExportExcel={handleExportExcel}
              stockCode={currentStock.code}
              stockName={quote?.name || currentStock.name}
            />
          )}

          {activeTab === 'dupont' && (
            <DuPontAnalysisTab
              data={financials}
              stockCode={currentStock.code}
              stockName={quote?.name || currentStock.name}
            />
          )}
        </section>

        {/* Informative Guidance & Data Integrity Note */}
        <footer className="pt-6 pb-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>披露声明: 本平台定期报告PDF源自巨潮资讯网官方披露库，财务报表经标准化清洗对齐。</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono">A股全市场直连 · 零鉴权高速下载</span>
            <span aria-hidden="true">·</span>
            <span>沪深北交易所全覆盖</span>
          </div>
        </footer>
      </main>

      {/* Online PDF Preview Drawer Modal */}
      <PdfPreviewModal
        report={previewReport}
        onClose={() => setPreviewReport(null)}
        stockCode={currentStock.code}
        stockName={quote?.name || currentStock.name}
      />

      {/* Multi-Year Batch ZIP Download Modal */}
      <BatchDownloadModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedReports={batchReportsToDownload}
        stockCode={currentStock.code}
        stockName={quote?.name || currentStock.name}
      />
    </div>
  );
}
