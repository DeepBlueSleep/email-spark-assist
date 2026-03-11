import { useState } from "react";
import { FileText, Paperclip, X, File, Image, FileSpreadsheet, ArrowLeft, FileType, Table2, ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AttachmentsPanelProps {
  attachments: string[];
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
          <div className="h-2 bg-muted rounded-full w-5/6" />
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

export function AttachmentsPanel({ attachments, onClose }: AttachmentsPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedFile = selectedIndex !== null ? attachments[selectedIndex] : null;

  return (
    <div className="w-[340px] shrink-0 border-l border-border bg-card flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          {selectedFile ? (
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
            {selectedFile || "Attachments"}
          </span>
          {!selectedFile && (
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

      {selectedFile ? (
        /* Preview view */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-4 flex items-center justify-center bg-muted/20">
            <PreviewPlaceholder filename={selectedFile} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile}</p>
                <p className="text-xs text-muted-foreground">{formatFileExt(selectedFile)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {attachments.map((filename, idx) => (
              <button
                key={`${filename}-${idx}`}
                onClick={() => setSelectedIndex(idx)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-left"
              >
                {getFileIcon(filename)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{filename}</p>
                  <p className="text-xs text-muted-foreground">{formatFileExt(filename)}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}