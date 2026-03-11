import { useState, useCallback } from "react";
import { FileText, Paperclip, X, File, Image, FileSpreadsheet, ArrowLeft, FileType, Table2, ImageIcon, Loader2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { invokeFunction } from "@/lib/api";
import { AttachmentMeta } from "@/data/mockData";

interface AttachmentsPanelProps {
  attachments: string[];
  attachmentsMeta?: AttachmentMeta[];
  onClose: () => void;
}

type FileCategory = "pdf" | "image" | "spreadsheet" | "document" | "other";

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff"].includes(ext)) return "image";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "spreadsheet";
  if (["doc", "docx", "txt", "rtf", "odt", "md"].includes(ext)) return "document";
  return "other";
}

function getFileIcon(filename: string) {
  const cat = getFileCategory(filename);
  if (cat === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (cat === "image") return <Image className="w-5 h-5 text-blue-500" />;
  if (cat === "spreadsheet") return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (cat === "document") return <FileType className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatFileExt(filename: string) {
  return filename.split(".").pop()?.toUpperCase() || "FILE";
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewPlaceholder({ filename }: { filename: string }) {
  const cat = getFileCategory(filename);
  const ext = formatFileExt(filename);

  if (cat === "pdf") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <FileText className="w-16 h-16 text-red-400/60" />
        <div className="space-y-2 w-3/4">
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-2 bg-muted rounded-full w-5/6" />
          <div className="h-2 bg-muted rounded-full w-4/6" />
          <div className="h-2 bg-muted rounded-full w-full mt-4" />
          <div className="h-2 bg-muted rounded-full w-3/4" />
        </div>
        <p className="text-xs mt-2">{ext} Document</p>
      </div>
    );
  }
  if (cat === "image") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-32 h-24 rounded-lg border-2 border-dashed border-blue-300/40 flex items-center justify-center bg-blue-50/30">
          <ImageIcon className="w-12 h-12 text-blue-400/50" />
        </div>
        <p className="text-xs">{ext} Image</p>
      </div>
    );
  }
  if (cat === "spreadsheet") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="border border-green-300/40 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-muted/50">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-10 h-5 bg-card" />
            ))}
          </div>
        </div>
        <Table2 className="w-8 h-8 text-green-500/50" />
        <p className="text-xs">{ext} Spreadsheet</p>
      </div>
    );
  }
  if (cat === "document") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <FileType className="w-16 h-16 text-orange-400/50" />
        <div className="space-y-2 w-3/4">
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-2 bg-muted rounded-full w-4/6" />
          <div className="h-2 bg-muted rounded-full w-5/6" />
        </div>
        <p className="text-xs mt-2">{ext} Document</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <File className="w-16 h-16 opacity-30" />
      <p className="text-xs">{ext} File</p>
      <p className="text-[10px]">No preview available</p>
    </div>
  );
}

function Base64Preview({ base64, mimeType, filename }: { base64: string; mimeType: string; filename: string }) {
  const cat = getFileCategory(filename);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  if (cat === "image") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <img src={dataUrl} alt={filename} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
      </div>
    );
  }

  if (cat === "pdf") {
    return (
      <iframe
        src={dataUrl}
        title={filename}
        className="w-full h-full border-0 rounded-lg"
      />
    );
  }

  // For other types, show a download option
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      {getFileIcon(filename)}
      <p className="text-sm font-medium">{filename}</p>
      <a
        href={dataUrl}
        download={filename}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}

export function AttachmentsPanel({ attachments, attachmentsMeta, onClose }: AttachmentsPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentCache, setContentCache] = useState<Record<string, { base64: string; mime_type: string }>>({});

  const selectedFilename = selectedIndex !== null ? attachments[selectedIndex] : null;

  // Find matching meta for the selected attachment
  const getMetaForIndex = (idx: number): AttachmentMeta | undefined => {
    if (!attachmentsMeta?.length) return undefined;
    const filename = attachments[idx];
    return attachmentsMeta.find(m => m.filename === filename);
  };

  const handleSelect = useCallback(async (idx: number) => {
    setSelectedIndex(idx);
    const meta = getMetaForIndex(idx);
    if (!meta) return; // No stored data, will show placeholder

    // Check cache
    if (contentCache[meta.id]) return;

    setLoadingContent(true);
    try {
      const data = await invokeFunction("api-attachment", { params: { id: meta.id } });
      if (data.content_base64) {
        setContentCache(prev => ({
          ...prev,
          [meta.id]: { base64: data.content_base64, mime_type: data.mime_type },
        }));
      }
    } catch (err) {
      console.error("Failed to load attachment content:", err);
    } finally {
      setLoadingContent(false);
    }
  }, [attachments, attachmentsMeta, contentCache]);

  const selectedMeta = selectedIndex !== null ? getMetaForIndex(selectedIndex) : undefined;
  const cachedContent = selectedMeta ? contentCache[selectedMeta.id] : undefined;

  return (
    <div className="w-[340px] shrink-0 border-l border-border bg-card flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          {selectedFilename ? (
            <button
              onClick={() => setSelectedIndex(null)}
              className="p-1 rounded-md hover:bg-muted transition-colors -ml-1"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold truncate max-w-[180px]">
            {selectedFilename || "Attachments"}
          </span>
          {!selectedFilename && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {selectedFilename ? (
        /* Preview view */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-2 flex items-center justify-center bg-muted/20 min-h-[200px]">
            {loadingContent ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs">Loading preview…</p>
              </div>
            ) : cachedContent?.base64 ? (
              <Base64Preview
                base64={cachedContent.base64}
                mimeType={cachedContent.mime_type}
                filename={selectedFilename}
              />
            ) : (
              <PreviewPlaceholder filename={selectedFilename} />
            )}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFilename)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFilename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileExt(selectedFilename)}
                  {selectedMeta && selectedMeta.size_bytes > 0 && ` · ${formatFileSize(selectedMeta.size_bytes)}`}
                </p>
              </div>
              {cachedContent?.base64 && (
                <a
                  href={`data:${cachedContent.mime_type};base64,${cachedContent.base64}`}
                  download={selectedFilename}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {attachments.map((filename, idx) => {
              const meta = getMetaForIndex(idx);
              return (
                <button
                  key={`${filename}-${idx}`}
                  onClick={() => handleSelect(idx)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-left"
                >
                  {getFileIcon(filename)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileExt(filename)}
                      {meta && meta.size_bytes > 0 && ` · ${formatFileSize(meta.size_bytes)}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}