export type Market = 'sh' | 'sz' | 'bj';

export interface StockBasic {
  code: string;
  name: string;
  market: Market;
  pinyin?: string;
  sector?: string;
}

export interface StockQuote {
  code: string;
  name: string;
  market: Market;
  price: number;
  lastClose: number;
  open: number;
  high: number;
  low: number;
  changeAmt: number;
  changePct: number;
  volume: number;
  amountWan: number;
  turnoverPct: number;
  peTtm: number;
  pb: number;
  mcapYi: number;
  floatMcapYi: number;
  industry?: string;
  updateTime?: string;
}

export type ReportCategory = 'all' | 'periodic' | 'annual' | 'semi' | 'q1' | 'q3' | 'announcement' | 'ir' | 'all_disclosures';

export interface ReportItem {
  id: string;
  code: string;
  stockName: string;
  title: string;
  year: number;
  category: 'annual' | 'semi' | 'q1' | 'q3' | 'announcement' | 'ir';
  categoryLabel: string;
  publishDate: string;
  pdfUrl: string;
  source: 'cninfo' | 'eastmoney' | 'szse' | 'sse';
  fileSizeText?: string;
  isAudited?: boolean;
}

export interface FinancialMetricPeriod {
  period: string; // e.g., '2024-12-31'
  revenue: number; // 营业收入 (元)
  revenueYoy?: number; // 营收同比 (%)
  netProfit: number; // 归母净利润 (元)
  netProfitYoy?: number; // 净利润同比 (%)
  grossMargin?: number; // 毛利率 (%)
  netMargin?: number; // 销售净利率 (%)
  roe?: number; // 净资产收益率 (%)
  assetTurnover?: number; // 总资产周转率 (次)
  equityMultiplier?: number; // 权益乘数
  debtRatio?: number; // 资产负债率 (%)
  operatingCashFlow?: number; // 经营活动现金流净额 (元)
  totalAssets?: number; // 资产总计 (元)
  totalLiabilities?: number; // 负债合计 (元)
  totalEquity?: number; // 所有者权益合计 (元)
}

export interface StatementRow {
  title: string;
  values: Record<string, string | number>; // period -> value
  yoy?: Record<string, string | number>; // period -> yoy %
}

export interface FinancialStatementsData {
  code: string;
  stockName: string;
  periods: string[];
  metrics: FinancialMetricPeriod[];
  incomeStatement: StatementRow[];
  balanceSheet: StatementRow[];
  cashFlowStatement: StatementRow[];
}
