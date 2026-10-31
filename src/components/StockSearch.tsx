import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, X, Loader2, ArrowRight } from 'lucide-react';
import { StockBasic } from '../types/stock';
import { POPULAR_STOCKS, getMarketPrefix } from '../data/popularStocks';

interface StockSearchProps {
  currentCode: string;
  onSelectStock: (stock: StockBasic) => void;
  isLoading: boolean;
}

export const StockSearch: React.FC<StockSearchProps> = ({
  currentCode,
  onSelectStock,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<StockBasic[]>(POPULAR_STOCKS.slice(0, 8));
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search against live backend API
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSuggestions(POPULAR_STOCKS.slice(0, 8));
      setIsSearching(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setSuggestions(json.data);
            setSelectedIndex(0);
          } else {
            // If clean 6-digit code, construct direct entry
            const cleanDigits = trimmed.replace(/[^0-9]/g, '').slice(0, 6);
            if (cleanDigits.length === 6) {
              setSuggestions([
                {
                  code: cleanDigits,
                  name: `A股股票 ${cleanDigits}`,
                  market: getMarketPrefix(cleanDigits),
                  sector: '全市场查询'
                }
              ]);
              setSelectedIndex(0);
            } else {
              setSuggestions([]);
              setSelectedIndex(-1);
            }
          }
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelect = (stock: StockBasic) => {
    onSelectStock(stock);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Immediate Submit on Enter or clicking "搜索" button
  const handleSearchSubmit = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    // 1. If currently selected with arrow keys or top suggestion exists
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex]);
      return;
    }

    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
      return;
    }

    // 2. Direct 6-digit stock code check
    const cleanDigits = trimmed.replace(/[^0-9]/g, '').slice(0, 6);
    if (cleanDigits.length === 6) {
      setIsSearching(true);
      try {
        const quoteRes = await fetch(`/api/stock/quote?code=${cleanDigits}`);
        if (quoteRes.ok) {
          const qJson = await quoteRes.json();
          if (qJson.success && qJson.data) {
            handleSelect({
              code: cleanDigits,
              name: qJson.data.name || `股票${cleanDigits}`,
              market: qJson.data.market || getMarketPrefix(cleanDigits),
              sector: 'A股上市公司'
            });
            return;
          }
        }
      } catch (e) {
        // Fallback below
      } finally {
        setIsSearching(false);
      }

      handleSelect({
        code: cleanDigits,
        name: `股票${cleanDigits}`,
        market: getMarketPrefix(cleanDigits),
        sector: 'A股'
      });
      return;
    }

    // 3. Fallback: Search online and take top result
    setIsSearching(true);
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          handleSelect(json.data[0]);
        }
      }
    } catch (e) {
      console.warn('Direct search submit error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      {/* Search Bar Container */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="输入股票代码、公司名称或拼音（如 600519、万科A、000002、比亚迪、中船科技、NDSD）..."
            className="w-full pl-12 pr-32 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
          />

          {/* Action buttons inside search bar right */}
          <div className="absolute right-2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSuggestions(POPULAR_STOCKS.slice(0, 8));
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                title="清空"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSearchSubmit}
              disabled={isSearching}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer active:scale-95"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>搜索股票</span>
            </button>
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
            <div className="px-3.5 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <span>{searchTerm ? `搜索结果 (${suggestions.length} 条匹配)` : '热门核心标的推荐'}</span>
              <span className="text-[11px] text-slate-400">支持 ↑ ↓ 键选择，Enter 键确认</span>
            </div>

            {suggestions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-300">未找到 “{searchTerm}”</p>
                <p className="text-xs text-slate-400">
                  支持直接输入任意A股6位数字代码（如 600000、000002、688017）按回车即可加载。
                </p>
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((item, index) => {
                  const isCurrent = item.code === currentCode;
                  const isHighlighted = index === selectedIndex;

                  return (
                    <button
                      key={`${item.code}-${index}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-sm transition-colors ${
                        isHighlighted
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium'
                          : isCurrent
                          ? 'bg-slate-50 dark:bg-slate-800/40 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {item.code}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        {item.sector && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                            {item.sector}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">当前分析中</span>
                        )}
                        <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                          {item.market.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Select Trending Buttons */}
      <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          热门关注:
        </span>
        {POPULAR_STOCKS.slice(0, 7).map((stock) => {
          const isActive = stock.code === currentCode;
          return (
            <button
              key={stock.code}
              type="button"
              onClick={() => onSelectStock(stock)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors font-medium ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {stock.name} ({stock.code})
            </button>
          );
        })}
      </div>
    </div>
  );
};
