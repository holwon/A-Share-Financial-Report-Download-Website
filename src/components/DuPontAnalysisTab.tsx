import React, { useState } from 'react';
import {
  TrendingUp,
  Percent,
  Calculator,
  Layers,
  ArrowRight,
  Info,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { FinancialStatementsData, FinancialMetricPeriod } from '../types/stock';

interface DuPontAnalysisTabProps {
  data: FinancialStatementsData | null;
  stockName: string;
  stockCode: string;
}

export const DuPontAnalysisTab: React.FC<DuPontAnalysisTabProps> = ({
  data,
  stockName,
  stockCode,
}) => {
  const metrics = data?.metrics || [];
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);

  if (metrics.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
        暂无财务分析指标数据
      </div>
    );
  }

  const current = metrics[selectedPeriodIndex] || metrics[0];
  const roe = current.roe ?? 0;
  const netMargin = current.netMargin ?? 0;
  const assetTurnover = current.assetTurnover ?? 0;
  const equityMultiplier = current.equityMultiplier ?? 1;
  const debtRatio = current.debtRatio ?? 0;

  // Helper formatting in 亿元
  const toYi = (val: number) => {
    return (val / 100000000).toFixed(2);
  };

  // Find max values for visual bars
  const maxRev = Math.max(...metrics.map((m) => m.revenue), 1);
  const maxNet = Math.max(...metrics.map((m) => Math.max(m.netProfit, 0)), 1);

  return (
    <div className="space-y-6">
      {/* 1. Period Selector Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span>杜邦分析体系与核心财务驱动力拆解</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            杜邦分析将净资产收益率 (ROE) 分解为三大驱动要素：盈利能力、营运效率与资本杠杆。
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">分析基准期:</span>
          <select
            value={selectedPeriodIndex}
            onChange={(e) => setSelectedPeriodIndex(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            {metrics.map((m, idx) => (
              <option key={m.period} value={idx}>
                {m.period} 报告期
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Interactive DuPont Analysis Tree Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            DuPont Analysis Architecture · {current.period}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            ROE = 销售净利率 × 总资产周转率 × 权益乘数
          </span>
        </div>

        {/* Tree Root & Primary Branches */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
          {/* Level 0: ROE Result Box */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border-2 border-blue-600/30 dark:border-blue-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
                <span>净资产收益率 (ROE)</span>
                <span className="text-xs font-normal">核心回报率</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold font-mono tabular-nums text-blue-700 dark:text-blue-300">
                  {roe.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
              归属于母公司股东的净利润与所有者权益的年化收益率。
            </div>
          </div>

          {/* Level 1 Component A: Net Margin */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>1. 销售净利率</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">盈利能力</span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {netMargin.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>归母净利润:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{toYi(current.netProfit)} 亿</span>
              </div>
              <div className="flex justify-between">
                <span>营业总收入:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{toYi(current.revenue)} 亿</span>
              </div>
            </div>
          </div>

          {/* Level 1 Component B: Asset Turnover */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>2. 总资产周转率</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">营运效率</span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {assetTurnover.toFixed(4)} 次
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>营业总收入:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{toYi(current.revenue)} 亿</span>
              </div>
              <div className="flex justify-between">
                <span>资产总计:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{toYi(current.totalAssets || 0)} 亿</span>
              </div>
            </div>
          </div>

          {/* Level 1 Component C: Equity Multiplier */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>3. 权益乘数</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">财务杠杆</span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {equityMultiplier.toFixed(2)}x
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>资产负债率:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{debtRatio.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>股东权益:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{toYi(current.totalEquity || 0)} 亿</span>
              </div>
            </div>
          </div>
        </div>

        {/* DuPont Insight Footer */}
        <div className="p-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 dark:text-white font-semibold">
              {stockName} ({stockCode}) 财报驱动特征洞察：
            </strong>{' '}
            当前ROE为 <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{roe}%</span>，
            销售净利率 <span className="font-mono">{netMargin}%</span>，
            总资产周转率 <span className="font-mono">{assetTurnover}次</span>，
            权益乘数 <span className="font-mono">{equityMultiplier}倍</span>。
            {netMargin > 30 ? (
              <span> 呈现典型的高护城河、高利润率驱动型优质商业模式。</span>
            ) : assetTurnover > 1 ? (
              <span> 呈现周转驱动型高效率运营模式。</span>
            ) : equityMultiplier > 3 ? (
              <span> 财务杠杆偏高，需密切注意负债结构与利息偿付能力。</span>
            ) : (
              <span> 资产负债结构健康平稳。</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Multi-Period Key Metrics Trend Comparison */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>历期核心财务指标连续对比表</span>
          </h3>
          <span className="text-xs text-slate-400">单位：亿元 / 百分比</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 px-3">报告期</th>
                <th className="py-2.5 px-3 text-right">营业收入 (亿元)</th>
                <th className="py-2.5 px-3 text-right">归母净利润 (亿元)</th>
                <th className="py-2.5 px-3 text-right">销售净利率 (%)</th>
                <th className="py-2.5 px-3 text-right">总资产周转率 (次)</th>
                <th className="py-2.5 px-3 text-right">权益乘数</th>
                <th className="py-2.5 px-3 text-right">资产负债率 (%)</th>
                <th className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">杜邦 ROE (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.map((m, idx) => {
                const isSelected = idx === selectedPeriodIndex;
                return (
                  <tr
                    key={m.period}
                    onClick={() => setSelectedPeriodIndex(idx)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/40 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900 dark:text-white flex items-center gap-1.5">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                      <span>{m.period}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {toYi(m.revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {toYi(m.netProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {m.netMargin}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {m.assetTurnover}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {m.equityMultiplier}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {m.debtRatio}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {m.roe}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
