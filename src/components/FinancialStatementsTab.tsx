import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  ArrowUpDown,
  Layers,
  HelpCircle
} from 'lucide-react';
import { FinancialStatementsData, StatementRow } from '../types/stock';

interface FinancialStatementsTabProps {
  data: FinancialStatementsData | null;
  isLoading: boolean;
  onExportExcel: () => void;
  stockCode: string;
  stockName: string;
}

export const FinancialStatementsTab: React.FC<FinancialStatementsTabProps> = ({
  data,
  isLoading,
  onExportExcel,
  stockCode,
  stockName,
}) => {
  const [statementType, setStatementType] = useState<'lrb' | 'fzb' | 'llb'>('lrb');
  const [filterQuery, setFilterQuery] = useState('');
  const [unitMode, setUnitMode] = useState<'yi' | 'raw'>('yi');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">正在拉取并解析 {stockName} ({stockCode}) 结构化财务三表数据...</p>
      </div>
    );
  }

  if (!data || !data.periods || data.periods.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
        <p className="text-sm font-medium">暂无结构化三表数据</p>
      </div>
    );
  }

  const activeRows: StatementRow[] =
    statementType === 'lrb'
      ? data.incomeStatement
      : statementType === 'fzb'
      ? data.balanceSheet
      : data.cashFlowStatement;

  const filteredRows = activeRows.filter((r) =>
    r.title.toLowerCase().includes(filterQuery.trim().toLowerCase())
  );

  // Format cell value
  const formatValue = (val: string | number) => {
    if (val === undefined || val === null || val === '-') return '-';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return String(val);

    if (unitMode === 'yi') {
      const yi = num / 100000000;
      return yi.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' 亿';
    }
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Table Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        {/* Left: 3-Table Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setStatementType('lrb')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                statementType === 'lrb'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              利润表 (损益表)
            </button>
            <button
              onClick={() => setStatementType('fzb')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                statementType === 'fzb'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              资产负债表
            </button>
            <button
              onClick={() => setStatementType('llb')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                statementType === 'llb'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              现金流量表
            </button>
          </div>

          {/* Unit Toggle */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setUnitMode('yi')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                unitMode === 'yi'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              亿元
            </button>
            <button
              onClick={() => setUnitMode('raw')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                unitMode === 'raw'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              元 (原值)
            </button>
          </div>
        </div>

        {/* Right: Search Line Item + One-Click Excel Export */}
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="搜索会计科目..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出标准Excel (4 Sheets)</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-4 w-60 min-w-48 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 shadow-xs">
                  会计科目
                </th>
                {data.periods.map((period) => (
                  <th key={period} className="py-3 px-4 text-right min-w-36 font-mono tabular-nums whitespace-nowrap">
                    {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={data.periods.length + 1} className="py-12 text-center text-slate-400">
                    未查找到匹配的科目行，请尝试其他关键词
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isPrimary = /营业收入|营业总收入|净利润|归属于母公司|资产总计|负债合计|所有者权益合计|经营活动产生的现金流量净额/.test(
                    row.title
                  );

                  return (
                    <tr
                      key={row.title}
                      className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                        isPrimary ? 'bg-slate-50/50 dark:bg-slate-800/20 font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {/* Left sticky title */}
                      <td className="py-2.5 px-4 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/30 dark:group-hover:bg-slate-800/40 border-r border-slate-200/80 dark:border-slate-800 shadow-xs whitespace-nowrap">
                        <span className={isPrimary ? 'text-blue-700 dark:text-blue-400' : ''}>
                          {row.title}
                        </span>
                      </td>

                      {/* Values for each period */}
                      {data.periods.map((p) => {
                        const val = row.values[p];
                        const formatted = formatValue(val);
                        const isNegative = String(val).startsWith('-');

                        return (
                          <td
                            key={p}
                            className={`py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                              isNegative ? 'text-red-600 dark:text-red-400' : ''
                            }`}
                          >
                            {formatted}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
