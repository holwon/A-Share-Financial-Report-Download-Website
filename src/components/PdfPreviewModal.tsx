import React from 'react';
import { X, Download, ExternalLink, FileText, Maximize2 } from 'lucide-react';
import { ReportItem } from '../types/stock';

interface PdfPreviewModalProps {
  report: ReportItem | null;
  onClose: () => void;
  stockCode: string;
  stockName: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  report,
  onClose,
  stockCode,
  stockName,
}) => {
  if (!report) return null;

  const safeTitle = `${report.year}年_${report.categoryLabel}_${stockName}(${stockCode}).pdf`;
  const streamUrl = `/api/download/pdf?url=${encodeURIComponent(report.pdfUrl)}&filename=${encodeURIComponent(safeTitle)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
      {/* Slide-over Drawer Container */}
      <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {report.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                <span>{report.publishDate} 披露</span>
                <span aria-hidden="true">·</span>
                <span>{report.categoryLabel}</span>
                <span aria-hidden="true">·</span>
                <span>巨潮资讯官方披露</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={streamUrl}
              download={safeTitle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载PDF</span>
            </a>

            {report.pdfUrl && (
              <a
                href={report.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="新窗口全屏浏览"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="关闭预览"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame Viewer */}
        <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 relative">
          <iframe
            src={`${streamUrl}#toolbar=1&navpanes=0`}
            title={report.title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
