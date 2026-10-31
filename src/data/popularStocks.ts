import { StockBasic, Market } from '../types/stock';

export const POPULAR_STOCKS: StockBasic[] = [
  { code: '600519', name: '贵州茅台', market: 'sh', pinyin: 'GZMT', sector: '白酒饮料' },
  { code: '300750', name: '宁德时代', market: 'sz', pinyin: 'NDSD', sector: '动力电池' },
  { code: '002594', name: '比亚迪', market: 'sz', pinyin: 'BYD', sector: '新能源汽车' },
  { code: '600036', name: '招商银行', market: 'sh', pinyin: 'ZSYH', sector: '银行业' },
  { code: '601318', name: '中国平安', market: 'sh', pinyin: 'ZGPA', sector: '保险金融' },
  { code: '000858', name: '五粮液', market: 'sz', pinyin: 'WLY', sector: '白酒饮料' },
  { code: '688981', name: '中芯国际', market: 'sh', pinyin: 'ZXGJ', sector: '半导体芯片' },
  { code: '002415', name: '海康威视', market: 'sz', pinyin: 'HKWS', sector: '安防AI' },
  { code: '601888', name: '中国中免', market: 'sh', pinyin: 'ZGZM', sector: '免税旅游' },
  { code: '300059', name: '东方财富', market: 'sz', pinyin: 'DFCF', sector: '互联网金融' },
  { code: '601166', name: '兴业银行', market: 'sh', pinyin: 'XYYH', sector: '银行业' },
  { code: '600900', name: '长江电力', market: 'sh', pinyin: 'CJDL', sector: '公用事业' },
  { code: '601012', name: '隆基绿能', market: 'sh', pinyin: 'LJLN', sector: '光伏设备' },
  { code: '000333', name: '美的集团', market: 'sz', pinyin: 'MDJT', sector: '家用电器' },
  { code: '000651', name: '格力电器', market: 'sz', pinyin: 'GLDQ', sector: '家用电器' },
  { code: '600276', name: '恒瑞医药', market: 'sh', pinyin: 'HRYY', sector: '创新医药' },
  { code: '300760', name: '迈瑞医疗', market: 'sz', pinyin: 'MRYL', sector: '医疗器械' },
  { code: '601398', name: '工商银行', market: 'sh', pinyin: 'GSYH', sector: '银行业' },
  { code: '601857', name: '中国石油', market: 'sh', pinyin: 'ZGSY', sector: '石油石化' },
  { code: '600030', name: '中信证券', market: 'sh', pinyin: 'ZXZQ', sector: '证券经纪' },
  { code: '688012', name: '中微公司', market: 'sh', pinyin: 'ZWGS', sector: '半导体设备' },
  { code: '688017', name: '绿的谐波', market: 'sh', pinyin: 'LDXB', sector: '机器人核心件' },
  { code: '002475', name: '立讯精密', market: 'sz', pinyin: 'LXJM', sector: '消费电子' },
  { code: '000001', name: '平安银行', market: 'sz', pinyin: 'PAYH', sector: '银行业' },
  { code: '920021', name: '天工股份', market: 'bj', pinyin: 'TGGF', sector: '北交所高端装备' },
  { code: '920982', name: '锦波生物', market: 'bj', pinyin: 'JBSW', sector: '北交所重组胶原' },
];

export function getMarketPrefix(code: string): Market {
  const c = code.trim().toLowerCase();
  if (c.startsWith('sh') || c.endsWith('.sh') || c.endsWith('.xshg')) return 'sh';
  if (c.startsWith('sz') || c.endsWith('.sz') || c.endsWith('.xshe')) return 'sz';
  if (c.startsWith('bj') || c.endsWith('.bj')) return 'bj';

  const clean = code.replace(/[^0-9]/g, '');
  if (clean.startsWith('92') || clean.startsWith('4') || clean.startsWith('8')) return 'bj';
  if (clean.startsWith('6') || clean.startsWith('5') || clean.startsWith('9')) return 'sh';
  return 'sz';
}

export function formatStockCode(code: string): string {
  return code.replace(/[^0-9]/g, '').slice(0, 6);
}
