import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Building2 } from 'lucide-react';
import { StockQuote } from '../types/stock';

interface StockSummaryProps {
  quote: StockQuote | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const StockSummary: React.FC<StockSummaryProps> = ({
  quote,
  isLoading,
  onRefresh,
}) => {
  if (!quote) return null;

  const isUp = quote.changeAmt > 0;
  const isDown = quote.changeAmt < 0;
  const colorClass = isUp
    ? 'text-red-600 dark:text-red-400'
    : isDown
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-slate-600 dark:text-slate-400';

  const marketText =
    quote.market === 'sh'
      ? '上海主板 / 科创板'
      : quote.market === 'sz'
      ? '深圳主板 / 创业板'
      : '北京证券交易所 (北交所)';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Stock Identity & Price */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {quote.name}
              </h1>
              <span className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {quote.code}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                · {marketText}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                A股上市公司官方披露
              </span>
              <span aria-hidden="true">·</span>
              <span>更新时间: {quote.updateTime || '今日收盘'}</span>
            </div>
          </div>

          {/* Real-time Price */}
          <div className="flex items-baseline gap-3 pl-0 lg:pl-6 lg:border-l lg:border-slate-200 dark:lg:border-slate-800">
            <span className={`text-3xl font-bold font-mono tracking-tight tabular-nums ${colorClass}`}>
              ¥{quote.price > 0 ? quote.price.toFixed(2) : quote.lastClose.toFixed(2)}
            </span>
            <div className={`flex items-center text-sm font-semibold font-mono tabular-nums ${colorClass}`}>
              {isUp && <ArrowUpRight className="w-4 h-4 mr-0.5" />}
              {isDown && <ArrowDownRight className="w-4 h-4 mr-0.5" />}
              <span>{quote.changeAmt >= 0 ? `+${quote.changeAmt.toFixed(2)}` : quote.changeAmt.toFixed(2)}</span>
              <span className="ml-1.5">({quote.changePct >= 0 ? `+${quote.changePct.toFixed(2)}%` : `${quote.changePct.toFixed(2)}%`})</span>
            </div>
          </div>
        </div>

        {/* Right: Key Valuation & Trading Metrics */}
        <div className="flex items-center gap-6 overflow-x-auto pb-1 lg:pb-0">
          <div className="shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500">市盈率 (TTM)</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {quote.peTtm > 0 ? `${quote.peTtm.toFixed(2)}x` : '亏损'}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500">市净率 (PB)</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {quote.pb > 0 ? `${quote.pb.toFixed(2)}x` : '-'}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500">总市值</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {quote.mcapYi > 0 ? `${quote.mcapYi.toFixed(1)} 亿元` : '-'}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500">换手率</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {quote.turnoverPct > 0 ? `${quote.turnoverPct.toFixed(2)}%` : '-'}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500">成交额</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {quote.amountWan > 10000 ? `${(quote.amountWan / 10000).toFixed(2)} 亿元` : `${quote.amountWan.toFixed(0)} 万元`}
            </div>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="刷新行情数据"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
