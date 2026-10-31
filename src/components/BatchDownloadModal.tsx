import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, X, Loader2, FileText, Sparkles } from 'lucide-react';
import { ReportItem } from '../types/stock';

interface BatchDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReports: ReportItem[];
  stockCode: string;
  stockName: string;
}

interface ItemStatus {
  id: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

export const BatchDownloadModal: React.FC<BatchDownloadModalProps> = ({
  isOpen,
  onClose,
  selectedReports,
  stockCode,
  stockName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});

  useEffect(() => {
    if (isOpen && selectedReports.length > 0 && !isDownloading && !isFinished) {
      startSequentialDownload();
    }
    if (!isOpen) {
      setIsDownloading(false);
      setIsFinished(false);
      setCurrentIndex(0);
      setCompletedCount(0);
      setFailedCount(0);
      setItemStatuses({});
    }
  }, [isOpen]);

  const startSequentialDownload = async () => {
    setIsDownloading(true);
    setIsFinished(false);
    setCompletedCount(0);
    setFailedCount(0);

    // Initialize item statuses
    const initialStatuses: Record<string, ItemStatus> = {};
    for (const r of selectedReports) {
      initialStatuses[r.id] = { id: r.id, status: 'pending' };
    }
    setItemStatuses(initialStatuses);

    let comp = 0;
    let fail = 0;

    for (let i = 0; i < selectedReports.length; i++) {
      const rep = selectedReports[i];
      setCurrentIndex(i);

      // Update current item to downloading
      setItemStatuses((prev) => ({
        ...prev,
        [rep.id]: { id: rep.id, status: 'downloading' },
      }));

      const safeTitle = `${rep.year}年_${rep.categoryLabel}_${stockName}(${stockCode})_${rep.title.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
      const downloadUrl = `/api/download/pdf?url=${encodeURIComponent(rep.pdfUrl)}&filename=${encodeURIComponent(safeTitle)}`;

      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const blob = await res.blob();
        if (blob.size < 512) {
          throw new Error('下载文件校验失败');
        }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = safeTitle;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        comp++;
        setCompletedCount(comp);
        setItemStatuses((prev) => ({
          ...prev,
          [rep.id]: { id: rep.id, status: 'completed' },
        }));
      } catch (err: any) {
        console.warn(`Download failed for ${rep.title}:`, err);
        fail++;
        setFailedCount(fail);
        setItemStatuses((prev) => ({
          ...prev,
          [rep.id]: { id: rep.id, status: 'failed', error: err.message || '网络错误' },
        }));
      }

      // Small pacing delay between downloads so browser doesn't throttle downloads
      if (i < selectedReports.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    setIsDownloading(false);
    setIsFinished(true);
  };

  if (!isOpen) return null;

  const total = selectedReports.length;
  const processedCount = completedCount + failedCount;
  const progressPercent = total > 0 ? Math.round((processedCount / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                批量直接下载 PDF 报告
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stockName} ({stockCode}) · 共选定 {total} 份定期报告
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Status Display */}
        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>
                    正在下载第 {currentIndex + 1} / {total} 份报告...
                  </span>
                </>
              ) : isFinished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>全部下载流程处理完毕！</span>
                </>
              ) : (
                <span>准备开始下载...</span>
              )}
            </span>

            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar Frame */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFinished && failedCount === 0
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stats Badges */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-3 font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">
                已下载: <strong>{completedCount}</strong>
              </span>
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  失败: <strong>{failedCount}</strong>
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              文件将直接保存至浏览器默认下载文件夹
            </span>
          </div>
        </div>

        {/* Selected Reports List with Realtime Status */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>下载清单明细 ({total} 份):</span>
            <span className="text-[11px] text-slate-400">按年限倒序执行</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {selectedReports.map((r, i) => {
              const st = itemStatuses[r.id]?.status || 'pending';

              return (
                <div
                  key={r.id}
                  className={`py-2 px-3 rounded-lg flex items-center justify-between transition-colors border ${
                    st === 'downloading'
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 font-medium'
                      : st === 'completed'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'
                      : st === 'failed'
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText
                      className={`w-3.5 h-3.5 shrink-0 ${
                        st === 'completed'
                          ? 'text-emerald-500'
                          : st === 'downloading'
                          ? 'text-blue-600 animate-bounce'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">
                      {r.year}年 {r.categoryLabel} - {r.title}
                    </span>
                  </div>

                  <div className="shrink-0 font-mono text-[11px] flex items-center gap-1">
                    {st === 'pending' && (
                      <span className="text-slate-400">等待中</span>
                    )}
                    {st === 'downloading' && (
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        下载中...
                      </span>
                    )}
                    {st === 'completed' && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        已完成
                      </span>
                    )}
                    {st === 'failed' && (
                      <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        失败
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {isFinished && failedCount > 0 ? (
            <button
              onClick={startSequentialDownload}
              className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 rounded-lg transition-colors"
            >
              重新下载未完成的文件
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            {isFinished ? '完成并关闭' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
};
