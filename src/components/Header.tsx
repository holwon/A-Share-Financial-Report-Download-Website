import React from 'react';
import { Download, FileSpreadsheet, ShieldCheck, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  activeTab: 'reports' | 'financials' | 'dupont';
  setActiveTab: (tab: 'reports' | 'financials' | 'dupont') => void;
  onExportExcel: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onExportExcel,
  isDark,
  toggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            财
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            A股财报下载网
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-normal">
            <span aria-hidden="true">·</span>
            <span>官方披露源</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              验真保质
            </span>
          </span>
        </div>

        {/* Zone 2: 4-5 Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('reports')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
              activeTab === 'reports'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            定期报告下载 (PDF)
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
              activeTab === 'financials'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            财务三表数据 (Excel)
          </button>
          <button
            onClick={() => setActiveTab('dupont')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
              activeTab === 'dupont'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            指标走势与杜邦分析
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>导出三表Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
};
