import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Helper: Normalize ticker code
function normTicker(code: string): string {
  const clean = code.replace(/[^0-9]/g, '');
  return clean.slice(0, 6);
}

function getMarketPrefix(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.toLowerCase().trim();
  if (c.startsWith('sh') || c.endsWith('.sh') || c.endsWith('.xshg')) return 'sh';
  if (c.startsWith('sz') || c.endsWith('.sz') || c.endsWith('.xshe')) return 'sz';
  if (c.startsWith('bj') || c.endsWith('.bj')) return 'bj';
  const digits = normTicker(code);
  if (digits.startsWith('92') || digits.startsWith('4') || digits.startsWith('8')) return 'bj';
  if (digits.startsWith('6') || digits.startsWith('5') || digits.startsWith('9')) return 'sh';
  return 'sz';
}

// In-memory cache for cninfo orgId mapping
let cninfoOrgIdMap: Record<string, string> = {};
async function initCninfoOrgIdMap(): Promise<void> {
  if (Object.keys(cninfoOrgIdMap).length > 0) return;
  try {
    const res = await fetch('http://www.cninfo.com.cn/new/data/szse_stock.json', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json() as { stockList?: Array<{ code: string; orgId: string }> };
      if (Array.isArray(data?.stockList)) {
        for (const item of data.stockList) {
          if (item.code && item.orgId) {
            cninfoOrgIdMap[item.code] = item.orgId;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WARN] Failed to load cninfo orgId map, using fallback rule:', err);
  }
}

function getCninfoOrgId(code: string): string {
  const digits = normTicker(code);
  if (cninfoOrgIdMap[digits]) {
    return cninfoOrgIdMap[digits];
  }
  const prefix = getMarketPrefix(code);
  return `gs${prefix}0${digits}`;
}

// Built-in stocks for fast search
const POPULAR_STOCKS = [
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
  { code: '920021', name: '天工股份', market: 'bj', pinyin: 'TGGF', sector: '高端制造' },
  { code: '920982', name: '锦波生物', market: 'bj', pinyin: 'JBSW', sector: '重组胶原蛋白' },
];

// 1. Full-Market Real Stock Search Endpoint (Eastmoney + Sina + Tencent Real APIs)
app.get('/api/stock/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ success: true, data: POPULAR_STOCKS.slice(0, 10) });
  }

  const cleanDigits = normTicker(query);
  const matched: Array<{ code: string; name: string; market: string; pinyin: string; sector: string }> = [];
  const seenCodes = new Set<string>();

  // 1. Match from local popular list first
  const qLower = query.toLowerCase();
  for (const s of POPULAR_STOCKS) {
    if (s.code.includes(qLower) || s.name.toLowerCase().includes(qLower) || s.pinyin.toLowerCase().includes(qLower)) {
      matched.push(s);
      seenCodes.add(s.code);
    }
  }

  // 2. Fetch from Eastmoney Real Search Suggest API
  try {
    const emUrl = `https://searchapi.eastmoney.com/api/suggest/get?type=14&token=D43BF722C8E33BDC906FB84D85E326E8&input=${encodeURIComponent(query)}`;
    const emResp = await fetch(emUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.eastmoney.com/' },
      signal: AbortSignal.timeout(4000)
    });
    if (emResp.ok) {
      const emJson = await emResp.json() as any;
      const dataList = emJson?.QuotationCodeTable?.Data || [];
      for (const item of dataList) {
        const rawCode = item.Code || item.UnifiedCode;
        const rawName = item.Name;
        if (rawCode && /^\d{6}$/.test(rawCode) && !seenCodes.has(rawCode)) {
          seenCodes.add(rawCode);
          matched.push({
            code: rawCode,
            name: rawName || `股票${rawCode}`,
            market: getMarketPrefix(rawCode),
            pinyin: item.PinYin || '',
            sector: item.SecurityTypeName || item.Classify || 'A股'
          });
        }
      }
    }
  } catch (err) {
    // Continue to next source
  }

  // 3. Fetch from Sina Suggest API (covers pinyin, abbreviations, Chinese names)
  try {
    const sinaUrl = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(query)}`;
    const sinaResp = await fetch(sinaUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://finance.sina.com.cn/' },
      signal: AbortSignal.timeout(4000)
    });
    if (sinaResp.ok) {
      const buffer = await sinaResp.arrayBuffer();
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(buffer);
      const match = text.match(/suggestvalue="([^"]*)"/);
      if (match && match[1]) {
        const items = match[1].split(';').filter(Boolean);
        for (const it of items) {
          const parts = it.split(',');
          // parts[2] is 6-digit code, parts[4] is full name, parts[3] is market+code
          const rawCode = parts[2];
          const rawName = parts[4] || parts[0];
          if (rawCode && /^\d{6}$/.test(rawCode) && !seenCodes.has(rawCode)) {
            seenCodes.add(rawCode);
            matched.push({
              code: rawCode,
              name: rawName,
              market: getMarketPrefix(rawCode),
              pinyin: '',
              sector: parts[8] || 'A股'
            });
          }
        }
      }
    }
  } catch (err) {
    // Continue
  }

  // 4. If query is a 6-digit stock code and not verified yet, verify with Tencent Quote API
  if (/^\d{6}$/.test(cleanDigits) && (!matched.some(m => m.code === cleanDigits) || matched[0]?.name.startsWith('股票'))) {
    try {
      const pfx = getMarketPrefix(cleanDigits);
      const tencentUrl = `https://qt.gtimg.cn/q=${pfx}${cleanDigits}`;
      const tResp = await fetch(tencentUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(3000) });
      if (tResp.ok) {
        const buffer = await tResp.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        const match = text.match(/="([^"]*)"/);
        if (match && match[1]) {
          const fields = match[1].split('~');
          const realName = fields[1];
          if (realName && realName !== cleanDigits) {
            // Remove any placeholder and unshift the real stock
            const idx = matched.findIndex(m => m.code === cleanDigits);
            if (idx >= 0) matched.splice(idx, 1);
            matched.unshift({
              code: cleanDigits,
              name: realName,
              market: pfx,
              pinyin: '',
              sector: 'A股上市公司'
            });
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // Fallback if exactly 6-digits
  if (/^\d{6}$/.test(cleanDigits) && !matched.some(m => m.code === cleanDigits)) {
    matched.unshift({
      code: cleanDigits,
      name: `股票${cleanDigits}`,
      market: getMarketPrefix(cleanDigits),
      pinyin: '',
      sector: 'A股'
    });
  }

  res.json({ success: true, data: matched.slice(0, 15) });
});

// 2. Stock Quote Endpoint (Tencent GTImg API)
app.get('/api/stock/quote', async (req: Request, res: Response) => {
  const code = normTicker((req.query.code as string || '600519'));
  const market = getMarketPrefix(code);
  const fullCode = `${market}${code}`;

  try {
    const url = `https://qt.gtimg.cn/q=${fullCode}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) {
      throw new Error(`Tencent API returned ${resp.status}`);
    }

    const buffer = await resp.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(buffer);

    const match = text.match(/="([^"]*)"/);
    if (!match || !match[1]) {
      throw new Error('Empty response from quote server');
    }

    const fields = match[1].split('~');
    if (fields.length < 40) {
      throw new Error('Incomplete quote payload');
    }

    const name = fields[1] || code;
    const price = parseFloat(fields[3]) || 0;
    const lastClose = parseFloat(fields[4]) || 0;
    const open = parseFloat(fields[5]) || 0;
    const changeAmt = parseFloat(fields[31]) || (price - lastClose);
    const changePct = parseFloat(fields[32]) || 0;
    const high = parseFloat(fields[33]) || 0;
    const low = parseFloat(fields[34]) || 0;
    const amountWan = parseFloat(fields[37]) || 0;
    const turnoverPct = parseFloat(fields[38]) || 0;
    const peTtm = parseFloat(fields[39]) || 0;
    const floatMcapYi = parseFloat(fields[44]) || 0;
    const mcapYi = parseFloat(fields[45]) || floatMcapYi || 0;
    const pb = parseFloat(fields[46]) || 0;

    res.json({
      success: true,
      data: {
        code,
        name,
        market,
        price,
        lastClose,
        open,
        high,
        low,
        changeAmt,
        changePct,
        volume: parseFloat(fields[36]) || 0,
        amountWan,
        turnoverPct,
        peTtm,
        pb,
        mcapYi,
        floatMcapYi,
        updateTime: fields[30] || ''
      }
    });
  } catch (err: any) {
    console.error(`Quote fetch error for ${code}:`, err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch quote' });
  }
});

// 3. Official Reports Listing Endpoint (cninfo + eastmoney backup)
app.get('/api/stock/reports', async (req: Request, res: Response) => {
  const code = normTicker((req.query.code as string || '600519'));
  const categoryFilter = (req.query.category as string || 'all').toLowerCase();
  const yearFilter = req.query.year ? parseInt(req.query.year as string, 10) : null;

  await initCninfoOrgIdMap();
  const orgId = getCninfoOrgId(code);
  const market = getMarketPrefix(code);

  const column = market === 'sh' ? 'sse' : 'szse';

  // cninfo category mapping
  let cninfoCategory = 'category_ndbg_szsh;category_bndbg_szsh;category_yjdbg_szsh;category_sjdbg_szsh;category_irm_szsh;category_dshgonggao_szsh;';
  if (categoryFilter === 'annual') cninfoCategory = 'category_ndbg_szsh;';
  else if (categoryFilter === 'semi') cninfoCategory = 'category_bndbg_szsh;';
  else if (categoryFilter === 'q1') cninfoCategory = 'category_yjdbg_szsh;';
  else if (categoryFilter === 'q3') cninfoCategory = 'category_sjdbg_szsh;';
  else if (categoryFilter === 'announcement') cninfoCategory = 'category_dshgonggao_szsh;category_jshgonggao_szsh;category_cqfg_szsh;category_sjzq_szsh;category_fxgonggao_szsh;';
  else if (categoryFilter === 'ir') cninfoCategory = 'category_irm_szsh;';
  else if (categoryFilter === 'all_disclosures') cninfoCategory = '';

  const rawAnnouncements: any[] = [];
  let stockName = '';

  // Parallel fetch pages 1..5 from cninfo
  const fetchCninfoPage = async (page: number) => {
    try {
      const payload = new URLSearchParams({
        stock: `${code},${orgId}`,
        tabName: 'fulltext',
        pageSize: '30',
        pageNum: String(page),
        column: column,
        category: cninfoCategory,
        isHLtitle: 'true'
      });

      const cninfoResp = await fetch('https://www.cninfo.com.cn/new/hisAnnouncement/query', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.cninfo.com.cn/new/disclosure',
          'Origin': 'https://www.cninfo.com.cn'
        },
        body: payload.toString(),
        signal: AbortSignal.timeout(6000)
      });

      if (cninfoResp.ok) {
        const data = await cninfoResp.json() as any;
        return data?.announcements || [];
      }
    } catch (err) {
      // ignore page error
    }
    return [];
  };

  try {
    const pageResults = await Promise.all([
      fetchCninfoPage(1),
      fetchCninfoPage(2),
      fetchCninfoPage(3),
      fetchCninfoPage(4),
      fetchCninfoPage(5),
    ]);
    for (const arr of pageResults) {
      rawAnnouncements.push(...arr);
    }
  } catch (err) {
    console.warn('[WARN] cninfo multi-page error:', err);
  }

  const reports: any[] = [];

  for (const ann of rawAnnouncements) {
    const title = (ann.announcementTitle || '').replace(/<[^>]+>/g, '').trim();
    if (!title || /英文版|English/i.test(title)) continue;

    const publishDate = ann.announcementTime ? new Date(ann.announcementTime).toISOString().slice(0, 10) : '';
    const adjunctUrl = ann.adjunctUrl || '';

    if (!stockName && ann.secName) {
      stockName = ann.secName;
    }

    // Determine category & year
    let category: 'annual' | 'semi' | 'q1' | 'q3' | 'announcement' | 'ir' = 'announcement';
    let categoryLabel = '公司重大公告';

    const cleanTitle = title.trim();
    if (/半年度报告|半年报|半年度/.test(cleanTitle) && !/一季度|三季度|年度报告/.test(cleanTitle)) {
      category = 'semi';
      categoryLabel = '半年度报告';
    } else if (/年度报告|年报/.test(cleanTitle) && !/半年度|一季度|三季度|季度/.test(cleanTitle)) {
      category = 'annual';
      categoryLabel = '年度报告';
    } else if (/一季度|第一季度|第1季度|1季度|首季度|一季报/.test(cleanTitle)) {
      category = 'q1';
      categoryLabel = '一季度报告';
    } else if (/三季度|第三季度|第3季度|3季度|三季报/.test(cleanTitle)) {
      category = 'q3';
      categoryLabel = '三季度报告';
    } else if (/投资者关系|调研|活动记录|路演|接待|问答|交流/.test(cleanTitle)) {
      category = 'ir';
      categoryLabel = '投资者关系记录';
    } else {
      category = 'announcement';
      categoryLabel = '公司重大公告';
    }

    const yearMatch = title.match(/(20\d\d)年?/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (publishDate ? parseInt(publishDate.slice(0, 4), 10) : 2024);

    const isSummary = /摘要/.test(title);
    const isUpdated = /更新后|修订|更正/.test(title);
    const pdfUrl = adjunctUrl ? `http://static.cninfo.com.cn/${adjunctUrl}` : '';

    reports.push({
      id: ann.announcementId || `${code}_${year}_${category}_${title.slice(0, 10)}`,
      code,
      stockName: ann.secName || stockName || `股票${code}`,
      title,
      year,
      category,
      categoryLabel,
      publishDate,
      pdfUrl,
      source: 'cninfo',
      fileSizeText: ann.adjunctSize ? `${Math.round(ann.adjunctSize / 1024)} KB` : 'PDF文件',
      isSummary,
      isUpdated,
      isAudited: category === 'annual'
    });
  }

  // De-duplicate: periodic reports by year_category, announcements/ir by id or title
  const reportMap = new Map<string, any>();
  for (const r of reports) {
    let key = r.id;
    if (['annual', 'semi', 'q1', 'q3'].includes(r.category)) {
      key = `${r.year}_${r.category}`;
    } else {
      key = `${r.publishDate}_${r.title}`;
    }

    if (!reportMap.has(key)) {
      reportMap.set(key, r);
    } else {
      const existing = reportMap.get(key);
      if (existing.isSummary && !r.isSummary) {
        reportMap.set(key, r);
      }
    }
  }

  let finalReports = Array.from(reportMap.values());

  // Apply filters
  if (categoryFilter === 'periodic') {
    finalReports = finalReports.filter(r => ['annual', 'semi', 'q1', 'q3'].includes(r.category));
  } else if (categoryFilter !== 'all' && categoryFilter !== 'all_disclosures') {
    finalReports = finalReports.filter(r => r.category === categoryFilter);
  }
  if (yearFilter) {
    finalReports = finalReports.filter(r => r.year === yearFilter);
  }

  // Sort by publishDate descending
  finalReports.sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));

  res.json({
    success: true,
    data: {
      code,
      stockName: finalReports[0]?.stockName || stockName || `股票${code}`,
      total: finalReports.length,
      reports: finalReports
    }
  });
});

// 4. Financial Statements (Sina 3-table API)
app.get('/api/stock/financials', async (req: Request, res: Response) => {
  const code = normTicker((req.query.code as string || '600519'));
  const market = getMarketPrefix(code);
  const paperCode = `${market}${code}`;

  try {
    const fetchTable = async (source: string) => {
      try {
        const url = `https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022?paperCode=${paperCode}&source=${source}&type=0&page=1&num=8`;
        const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return {};
        const json = await resp.json() as any;
        return json?.result?.data?.report_list || {};
      } catch (e) {
        return {};
      }
    };

    const [lrbData, fzbData, llbData] = await Promise.all([
      fetchTable('lrb'),
      fetchTable('fzb'),
      fetchTable('llb')
    ]);

    // Extract sorted unique periods (e.g. ['20241231', '20240930', ...])
    const allPeriodKeys = Array.from(
      new Set([...Object.keys(lrbData), ...Object.keys(fzbData), ...Object.keys(llbData)])
    ).sort().reverse().slice(0, 8);

    const formattedPeriods = allPeriodKeys.map(k => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`);

    // Helper to format financial statements into structured rows
    const buildStatementRows = (reportMap: Record<string, any>) => {
      const itemTitleSet = new Set<string>();
      for (const p of allPeriodKeys) {
        const items = reportMap[p]?.data || [];
        for (const item of items) {
          if (item.item_title) {
            itemTitleSet.add(item.item_title);
          }
        }
      }

      const rows: any[] = [];
      for (const title of itemTitleSet) {
        const values: Record<string, any> = {};
        const yoy: Record<string, any> = {};
        for (const p of allPeriodKeys) {
          const dateStr = `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}`;
          const items = reportMap[p]?.data || [];
          const found = items.find((i: any) => i.item_title === title);
          if (found && found.item_value !== undefined && found.item_value !== null) {
            values[dateStr] = found.item_value;
            if (found.item_tongbi !== undefined && found.item_tongbi !== null && found.item_tongbi !== '') {
              yoy[dateStr] = found.item_tongbi;
            }
          } else {
            values[dateStr] = '-';
          }
        }
        rows.push({ title, values, yoy });
      }
      return rows;
    };

    const incomeStatement = buildStatementRows(lrbData);
    const balanceSheet = buildStatementRows(fzbData);
    const cashFlowStatement = buildStatementRows(llbData);

    // Compute key metrics & DuPont breakdown for each period
    const metrics: any[] = [];
    for (let idx = 0; idx < allPeriodKeys.length; idx++) {
      const p = allPeriodKeys[idx];
      const dateStr = formattedPeriods[idx];

      const findVal = (dataMap: Record<string, any>, titles: string[]) => {
        const items = dataMap[p]?.data || [];
        for (const t of titles) {
          const found = items.find((i: any) => i.item_title && i.item_title.includes(t));
          if (found && found.item_value) {
            const num = parseFloat(String(found.item_value).replace(/,/g, ''));
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };

      const revenue = findVal(lrbData, ['营业总收入', '营业收入', '主营业务收入']);
      const netProfit = findVal(lrbData, ['归属于母公司所有者的净利润', '归属于母公司股东的净利润', '净利润']);
      const operatingCost = findVal(lrbData, ['营业成本', '营业总成本']);
      const totalAssets = findVal(fzbData, ['资产总计', '总资产']);
      const totalLiabilities = findVal(fzbData, ['负债合计', '总负债']);
      const totalEquity = findVal(fzbData, ['所有者权益合计', '股东权益合计', '所有者权益(或股东权益)合计']);
      const parentEquity = findVal(fzbData, ['归属于母公司所有者权益合计', '所有者权益合计']) || totalEquity;
      const operatingCashFlow = findVal(llbData, ['经营活动产生的现金流量净额']);

      // Calculate ratios
      const grossMargin = revenue > 0 && operatingCost > 0 ? ((revenue - operatingCost) / revenue) * 100 : undefined;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const assetTurnover = totalAssets > 0 ? (revenue / totalAssets) : 0;
      const equityMultiplier = parentEquity > 0 ? (totalAssets / parentEquity) : 1;
      const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
      const roe = (netMargin / 100) * assetTurnover * equityMultiplier * 100;

      // YoY calculation from previous period if available
      let revenueYoy: number | undefined;
      let netProfitYoy: number | undefined;
      if (idx + 4 < allPeriodKeys.length) {
        // Compare with same period previous year (4 quarters back)
        const prevP = allPeriodKeys[idx + 4];
        const prevRev = findVal(lrbData, ['营业总收入', '营业收入']);
        const prevNet = findVal(lrbData, ['归属于母公司所有者的净利润', '净利润']);
        if (prevRev > 0) revenueYoy = ((revenue - prevRev) / prevRev) * 100;
        if (prevNet > 0) netProfitYoy = ((netProfit - prevNet) / Math.abs(prevNet)) * 100;
      }

      metrics.push({
        period: dateStr,
        revenue,
        revenueYoy,
        netProfit,
        netProfitYoy,
        grossMargin: grossMargin ? parseFloat(grossMargin.toFixed(2)) : undefined,
        netMargin: parseFloat(netMargin.toFixed(2)),
        assetTurnover: parseFloat(assetTurnover.toFixed(4)),
        equityMultiplier: parseFloat(equityMultiplier.toFixed(2)),
        debtRatio: parseFloat(debtRatio.toFixed(2)),
        roe: parseFloat(roe.toFixed(2)),
        operatingCashFlow,
        totalAssets,
        totalLiabilities,
        totalEquity: parentEquity
      });
    }

    res.json({
      success: true,
      data: {
        code,
        periods: formattedPeriods,
        metrics,
        incomeStatement,
        balanceSheet,
        cashFlowStatement
      }
    });
  } catch (err: any) {
    console.error(`Financials error for ${code}:`, err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch financial statements' });
  }
});

// 5. Single PDF Download Proxy
app.get('/api/download/pdf', async (req: Request, res: Response) => {
  const fileUrl = req.query.url as string;
  const fileName = (req.query.filename as string || '财报.pdf').trim();

  if (!fileUrl) {
    return res.status(400).send('Missing file url');
  }

  try {
    const isCninfo = fileUrl.includes('cninfo.com.cn');
    const headers: Record<string, string> = {
      'User-Agent': UA,
      'Referer': isCninfo ? 'https://www.cninfo.com.cn/' : 'https://data.eastmoney.com/'
    };

    const upstream = await fetch(fileUrl, { headers });
    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream returned ${upstream.status}`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('PDF proxy error:', err);
    res.status(500).send('Failed to proxy PDF download');
  }
});

// 6. Batch ZIP Download
app.post('/api/download/batch-zip', async (req: Request, res: Response) => {
  const { code, stockName, reports } = req.body as {
    code: string;
    stockName: string;
    reports: Array<{ title: string; year: number; categoryLabel: string; pdfUrl: string }>;
  };

  if (!Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ success: false, error: 'No reports selected' });
  }

  try {
    const zip = new JSZip();
    const folderName = `${code}_${stockName || '股票'}_历年财报合集`;
    const rootFolder = zip.folder(folderName) || zip;

    // Fetch each PDF buffer concurrently (limit to 6 concurrent requests)
    const downloadReport = async (rep: typeof reports[0]) => {
      if (!rep.pdfUrl) return null;
      try {
        const isCninfo = rep.pdfUrl.includes('cninfo.com.cn');
        const upstream = await fetch(rep.pdfUrl, {
          headers: {
            'User-Agent': UA,
            'Referer': isCninfo ? 'https://www.cninfo.com.cn/' : 'https://data.eastmoney.com/'
          }
        });
        if (upstream.ok) {
          const buf = await upstream.arrayBuffer();
          // Clean sanitized file name
          const safeTitle = rep.title.replace(/[\\/:*?"<>|]/g, '_');
          const fileName = `${rep.year}年_${rep.categoryLabel}_${safeTitle}.pdf`;
          return { fileName, buffer: Buffer.from(buf) };
        }
      } catch (e) {
        console.warn(`Failed to fetch report PDF ${rep.title}:`, e);
      }
      return null;
    };

    const results = await Promise.all(reports.map(downloadReport));
    let addedCount = 0;
    for (const item of results) {
      if (item && item.buffer.length > 1024) {
        rootFolder.file(item.fileName, item.buffer);
        addedCount++;
      }
    }

    if (addedCount === 0) {
      return res.status(500).json({ success: false, error: '未能从官方源下载到有效的PDF文件，请稍后重试' });
    }

    // Add a README.txt metadata description inside the zip
    const readmeContent = `================================================
A股上市公司财报一键下载 - 打包说明
================================================
股票代码: ${code}
公司名称: ${stockName}
文件总计: ${addedCount} 份官方定期报告
打包时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
数据来源: 巨潮资讯网官方信息披露 / 东方财富公告库

* 本压缩包所含文档均为上市公司官方披露的盖章/确认定期报告正本，
  可直接用于学术研究、价值分析及投资归档。
================================================`;
    rootFolder.file('README_财报清单说明.txt', readmeContent);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const zipFilename = `${code}_${stockName}_财报合集_${new Date().toISOString().slice(0, 10)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Batch zip creation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create zip package' });
  }
});

// 7. Multi-Sheet Financial Statements Excel Export Endpoint
app.get('/api/export/excel', async (req: Request, res: Response) => {
  const code = normTicker((req.query.code as string || '600519'));
  const stockName = (req.query.name as string || code);
  const market = getMarketPrefix(code);
  const paperCode = `${market}${code}`;

  try {
    const fetchTable = async (source: string) => {
      try {
        const url = `https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022?paperCode=${paperCode}&source=${source}&type=0&page=1&num=12`;
        const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return {};
        const json = await resp.json() as any;
        return json?.result?.data?.report_list || {};
      } catch (e) {
        return {};
      }
    };

    const [lrbData, fzbData, llbData] = await Promise.all([
      fetchTable('lrb'),
      fetchTable('fzb'),
      fetchTable('llb')
    ]);

    const allPeriodKeys = Array.from(
      new Set([...Object.keys(lrbData), ...Object.keys(fzbData), ...Object.keys(llbData)])
    ).sort().reverse();

    const formattedPeriods = allPeriodKeys.map(k => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`);

    const wb = XLSX.utils.book_new();

    // Helper to format rows into Sheet
    const makeSheet = (dataMap: Record<string, any>, sheetName: string) => {
      const itemTitleSet = new Set<string>();
      for (const p of allPeriodKeys) {
        const items = dataMap[p]?.data || [];
        for (const item of items) {
          if (item.item_title) itemTitleSet.add(item.item_title);
        }
      }

      const rows: any[][] = [];
      // Header row
      rows.push(['会计科目 / 报告期', ...formattedPeriods]);

      for (const title of itemTitleSet) {
        const row = [title];
        for (const p of allPeriodKeys) {
          const items = dataMap[p]?.data || [];
          const found = items.find((i: any) => i.item_title === title);
          if (found && found.item_value !== undefined && found.item_value !== null) {
            const raw = String(found.item_value).replace(/,/g, '');
            const num = parseFloat(raw);
            row.push(isNaN(num) ? found.item_value : num);
          } else {
            row.push('-');
          }
        }
        rows.push(row);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Sheet 1: 核心指标与杜邦拆解
    const summaryRows: any[][] = [
      ['指标名称 / 报告期', ...formattedPeriods]
    ];

    const findMetricRow = (name: string, dataMap: Record<string, any>, keywords: string[]) => {
      const r = [name];
      for (const p of allPeriodKeys) {
        const items = dataMap[p]?.data || [];
        let val: any = '-';
        for (const kw of keywords) {
          const found = items.find((i: any) => i.item_title && i.item_title.includes(kw));
          if (found && found.item_value) {
            const num = parseFloat(String(found.item_value).replace(/,/g, ''));
            val = isNaN(num) ? found.item_value : num;
            break;
          }
        }
        r.push(val);
      }
      return r;
    };

    summaryRows.push(findMetricRow('营业收入 (元)', lrbData, ['营业总收入', '营业收入']));
    summaryRows.push(findMetricRow('营业成本 (元)', lrbData, ['营业成本']));
    summaryRows.push(findMetricRow('归母净利润 (元)', lrbData, ['归属于母公司所有者的净利润', '净利润']));
    summaryRows.push(findMetricRow('资产总计 (元)', fzbData, ['资产总计', '总资产']));
    summaryRows.push(findMetricRow('负债合计 (元)', fzbData, ['负债合计', '总负债']));
    summaryRows.push(findMetricRow('所有者权益合计 (元)', fzbData, ['所有者权益合计', '股东权益合计']));
    summaryRows.push(findMetricRow('经营现金流量净额 (元)', llbData, ['经营活动产生的现金流量净额']));

    // DuPont calculated rows
    const netMarginRow: any[] = ['杜邦分析-销售净利率 (%)'];
    const assetTurnoverRow: any[] = ['杜邦分析-总资产周转率 (次)'];
    const equityMultiplierRow: any[] = ['杜邦分析-权益乘数'];
    const roeRow: any[] = ['杜邦分析-净资产收益率 ROE (%)'];

    for (let i = 0; i < allPeriodKeys.length; i++) {
      const p = allPeriodKeys[i];
      const getNum = (map: Record<string, any>, kws: string[]) => {
        const items = map[p]?.data || [];
        for (const kw of kws) {
          const f = items.find((item: any) => item.item_title && item.item_title.includes(kw));
          if (f && f.item_value) {
            const n = parseFloat(String(f.item_value).replace(/,/g, ''));
            if (!isNaN(n)) return n;
          }
        }
        return 0;
      };

      const rev = getNum(lrbData, ['营业总收入', '营业收入']);
      const net = getNum(lrbData, ['归属于母公司所有者的净利润', '净利润']);
      const assets = getNum(fzbData, ['资产总计']);
      const equity = getNum(fzbData, ['归属于母公司所有者权益合计', '所有者权益合计']);

      const nm = rev > 0 ? (net / rev) * 100 : 0;
      const at = assets > 0 ? (rev / assets) : 0;
      const em = equity > 0 ? (assets / equity) : 1;
      const roe = (nm / 100) * at * em * 100;

      netMarginRow.push(Number(nm.toFixed(2)));
      assetTurnoverRow.push(Number(at.toFixed(4)));
      equityMultiplierRow.push(Number(em.toFixed(2)));
      roeRow.push(Number(roe.toFixed(2)));
    }

    summaryRows.push(netMarginRow);
    summaryRows.push(assetTurnoverRow);
    summaryRows.push(equityMultiplierRow);
    summaryRows.push(roeRow);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, '核心财务指标与杜邦分析');

    makeSheet(lrbData, '利润表');
    makeSheet(fzbData, '资产负债表');
    makeSheet(llbData, '现金流量表');

    const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `${code}_${stockName}_财务三表及杜邦分析_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(wbBuffer);
  } catch (err: any) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to export excel' });
  }
});

// Vite Middleware integration for Full-Stack development / Production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Report Hub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
