import { FileText, Paperclip, X, File, Image, FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AttachmentsPanelProps {
  attachments: string[];
  onClose: () => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return <FileText className="w-5 h-5 text-red-500" />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <Image className="w-5 h-5 text-blue-500" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatFileExt(filename: string) {
  return filename.split(".").pop()?.toUpperCase() || "FILE";
}

export function AttachmentsPanel({ attachments, onClose }: AttachmentsPanelProps) {
  return (
    <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col animate-fade-in">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Attachments</span>
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {attachments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {attachments.map((filename, idx) => (
            <div
              key={`${filename}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-default"
            >
              {getFileIcon(filename)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{filename}</p>
                <p className="text-xs text-muted-foreground">{formatFileExt(filename)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
