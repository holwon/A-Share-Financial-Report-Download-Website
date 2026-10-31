import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  ExternalLink,
  PackageCheck,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  ChevronDown
} from 'lucide-react';
import { ReportItem, ReportCategory } from '../types/stock';

interface ReportsTabProps {
  reports: ReportItem[];
  isLoading: boolean;
  onPreviewPdf: (report: ReportItem) => void;
  onBatchDownload: (selectedReports: ReportItem[]) => void;
  stockCode: string;
  stockName: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  reports,
  isLoading,
  onPreviewPdf,
  onBatchDownload,
  stockCode,
  stockName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
  const [selectedYearRange, setSelectedYearRange] = useState<'all' | '3y' | '5y' | '10y'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState<number>(30);

  // Dynamic counts for each category
  const categoryCounts = useMemo(() => {
    return {
      all: reports.length,
      periodic: reports.filter((r) => ['annual', 'semi', 'q1', 'q3'].includes(r.category)).length,
      annual: reports.filter((r) => r.category === 'annual').length,
      semi: reports.filter((r) => r.category === 'semi').length,
      q1: reports.filter((r) => r.category === 'q1').length,
      q3: reports.filter((r) => r.category === 'q3').length,
      announcement: reports.filter((r) => r.category === 'announcement').length,
      ir: reports.filter((r) => r.category === 'ir').length,
    };
  }, [reports]);

  // Filter reports
  const filteredReports = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const keyword = searchKeyword.trim().toLowerCase();

    return reports.filter((rep) => {
      // Category filter
      if (selectedCategory === 'periodic') {
        if (!['annual', 'semi', 'q1', 'q3'].includes(rep.category)) return false;
      } else if (selectedCategory !== 'all' && rep.category !== selectedCategory) {
        return false;
      }
      // Year range filter
      if (selectedYearRange === '3y' && rep.year < currentYear - 3) {
        return false;
      }
      if (selectedYearRange === '5y' && rep.year < currentYear - 5) {
        return false;
      }
      if (selectedYearRange === '10y' && rep.year < currentYear - 10) {
        return false;
      }
      // Keyword search within title or year
      if (keyword && !rep.title.toLowerCase().includes(keyword) && !String(rep.year).includes(keyword)) {
        return false;
      }
      return true;
    });
  }, [reports, selectedCategory, selectedYearRange, searchKeyword]);

  // Paginated/clipped view
  const visibleReports = useMemo(() => {
    return filteredReports.slice(0, displayCount);
  }, [filteredReports, displayCount]);

  // Handle single toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible filtered
  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredReports.map((r) => r.id)));
  };

  // Select all annual reports
  const selectAllAnnual = () => {
    const annuals = reports.filter((r) => r.category === 'annual').map((r) => r.id);
    setSelectedIds(new Set(annuals));
  };

  // Select recent 3 years
  const selectRecent3Years = () => {
    const currentYear = new Date().getFullYear();
    const recent = reports.filter((r) => r.year >= currentYear - 3).map((r) => r.id);
    setSelectedIds(new Set(recent));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Get selected objects
  const selectedReports = useMemo(() => {
    return reports.filter((r) => selectedIds.has(r.id));
  }, [reports, selectedIds]);

  // Single PDF download helper
  const handleSingleDownload = (report: ReportItem) => {
    const safeTitle = `${report.year}年_${report.categoryLabel}_${stockName}(${stockCode}).pdf`;
    const downloadUrl = `/api/download/pdf?url=${encodeURIComponent(report.pdfUrl)}&filename=${encodeURIComponent(safeTitle)}`;
    window.location.href = downloadUrl;
  };

  const earliestYear = useMemo(() => {
    if (reports.length === 0) return 2024;
    return Math.min(...reports.map((r) => r.year));
  }, [reports]);

  const latestYear = useMemo(() => {
    if (reports.length === 0) return 2026;
    return Math.max(...reports.map((r) => r.year));
  }, [reports]);

  return (
    <div className="space-y-4">
      {/* Filters & Actions Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3.5 transition-colors">
        {/* Row 1: Report Categories with Live Counts */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              报告分类:
            </span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
              {(
                [
                  { id: 'all', label: '全部披露文件', count: categoryCounts.all },
                  { id: 'periodic', label: '定期报告', count: categoryCounts.periodic },
                  { id: 'announcement', label: '公司重大公告', count: categoryCounts.announcement },
                  { id: 'ir', label: '投资者关系记录', count: categoryCounts.ir },
                  { id: 'annual', label: '年度报告', count: categoryCounts.annual },
                  { id: 'semi', label: '半年度报告', count: categoryCounts.semi },
                  { id: 'q1', label: '一季度报告', count: categoryCounts.q1 },
                  { id: 'q3', label: '三季度报告', count: categoryCounts.q3 },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setDisplayCount(30);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      selectedCategory === cat.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                        : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Year Range & Keyword Search */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                时间跨度:
              </span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: '全部年份' },
                    { id: '3y', label: '近3年' },
                    { id: '5y', label: '近5年' },
                    { id: '10y', label: '近10年' },
                  ] as const
                ).map((yr) => (
                  <button
                    key={yr.id}
                    onClick={() => {
                      setSelectedYearRange(yr.id);
                      setDisplayCount(30);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                      selectedYearRange === yr.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {yr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyword Search within current reports */}
            <div className="relative w-40 sm:w-48">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="筛选年份或关键词..."
                className="w-full pl-7 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Batch Selection & Action Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2.5 text-slate-600 dark:text-slate-400">
            <button
              onClick={selectAllFiltered}
              className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              全选当前筛选 ({filteredReports.length})
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={selectAllAnnual}
              className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              全选历年年报 ({categoryCounts.annual})
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={selectRecent3Years}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              全选近3年报告
            </button>
            {selectedIds.size > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  onClick={clearSelection}
                  className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  清除勾选
                </button>
              </>
            )}
          </div>

          {/* Batch Download Button */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              已选 <strong className="font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedIds.size}</strong> 份报告
            </span>
            <button
              onClick={() => onBatchDownload(selectedReports)}
              disabled={selectedIds.size === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all whitespace-nowrap ${
                selectedIds.size > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>批量直接下载 PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports Header Info Banner */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <span>共收录 </span>
          <strong className="font-mono font-bold text-slate-900 dark:text-white">{reports.length}</strong>
          <span> 份官方披露原件 </span>
          <span className="text-slate-400">(时间跨度: {earliestYear} ~ {latestYear}年)</span>
        </div>
        <div>
          当前筛选展示: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{filteredReports.length}</span> 份
        </div>
      </div>

      {/* Reports Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">正在检索 {stockName} ({stockCode}) 巨潮官方披露财报库...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">未检索到符合条件的定期报告</p>
            <p className="text-xs text-slate-400">请尝试切换报告类型为“全部”或扩大年份跨度</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <button
                        onClick={() => {
                          if (selectedIds.size === filteredReports.length) {
                            clearSelection();
                          } else {
                            selectAllFiltered();
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="全选/反选"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredReports.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-32">报告期</th>
                    <th className="py-3 px-3">公告报告全称</th>
                    <th className="py-3 px-3 w-32">披露日期</th>
                    <th className="py-3 px-3 w-28">审计状态</th>
                    <th className="py-3 px-4 w-52 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {visibleReports.map((report) => {
                    const isChecked = selectedIds.has(report.id);
                    const isAnnual = report.category === 'annual';

                    return (
                      <tr
                        key={report.id}
                        className={`group hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${
                          isChecked ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleSelect(report.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Period & Category */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="font-mono tabular-nums">{report.year}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-normal ${
                                isAnnual
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {report.categoryLabel}
                            </span>
                          </div>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {report.title}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 ml-6 flex items-center gap-2">
                            <span>巨潮资讯官方披露原件</span>
                            <span aria-hidden="true">·</span>
                            <span>PDF 正本</span>
                          </div>
                        </td>

                        {/* Publish Date */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {report.publishDate || '-'}
                          </div>
                        </td>

                        {/* Audited Status */}
                        <td className="py-3 px-3 whitespace-nowrap text-xs">
                          {isAnnual ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              经审计标准报告
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">未经审计</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Preview Online */}
                            <button
                              onClick={() => onPreviewPdf(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>在线速览</span>
                            </button>

                            {/* Direct Download */}
                            <button
                              onClick={() => handleSingleDownload(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md shadow-xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>下载PDF</span>
                            </button>

                            {/* External View */}
                            {report.pdfUrl && (
                              <a
                                href={report.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="在官方源新窗口打开"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination / Show More Button */}
            {filteredReports.length > displayCount && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 30)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>加载更多历史报告 (已显示 {displayCount} / {filteredReports.length} 份)</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
