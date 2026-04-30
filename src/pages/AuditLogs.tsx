import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction } from "@/lib/api";
import { Bot, LayoutDashboard, RefreshCw, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  created_at: string;
  category: string;
  action: string;
  actor: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string | null;
  source: string | null;
  ip: string | null;
  user_agent: string | null;
  request: any;
  response: any;
  metadata: any;
  error: string | null;
  duration_ms: number | null;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "user_action", label: "User Actions" },
  { value: "http_in", label: "Inbound HTTP" },
  { value: "http_out", label: "Outbound HTTP" },
  { value: "webhook", label: "Webhooks" },
  { value: "system", label: "System" },
  { value: "db", label: "Database" },
];

function categoryBadge(c: string) {
  const map: Record<string, string> = {
    user_action: "bg-primary/10 text-primary border-primary/20",
    http_in: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    http_out: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    webhook: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    system: "bg-muted text-muted-foreground border-border",
    db: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  };
  return map[c] || "bg-muted text-muted-foreground border-border";
}

function statusBadge(s: string | null) {
  if (!s) return "bg-muted text-muted-foreground";
  if (s === "success" || s.startsWith("2")) return "bg-sentiment-positive/10 text-sentiment-positive";
  if (s === "error" || s.startsWith("5") || s.startsWith("4")) return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "1000" };
      if (category) params.category = category;
      if (search) params.search = search;
      const data = await invokeFunction("api-audit-logs", { params });
      setLogs(data.logs || []);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filtered = useMemo(() => {
    if (!errorsOnly) return logs;
    return logs.filter((l) => !!l.error || (l.status && (l.status === "error" || l.status.startsWith("4") || l.status.startsWith("5"))));
  }, [logs, errorsOnly]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Email Order Review</h1>
        </div>
        <nav className="ml-6 flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/inbox" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Messages
          </Link>
          <Link to="/audit-logs" className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted text-foreground">
            Audit Logs
          </Link>
        </nav>
      </header>

      <div className="p-6 border-b border-border bg-card/40 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md bg-background border border-border rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            placeholder="Search action, actor, error…"
            className="bg-transparent flex-1 outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setErrorsOnly((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
            errorsOnly
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "border-border hover:bg-accent"
          )}
        >
          Errors only
        </button>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {logs.length} entr{logs.length === 1 ? "y" : "ies"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted-foreground z-10">
            <tr>
              <th className="text-left px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2 w-44">Time</th>
              <th className="text-left px-3 py-2 w-28">Category</th>
              <th className="text-left px-3 py-2 w-44">Action</th>
              <th className="text-left px-3 py-2 w-36">Source</th>
              <th className="text-left px-3 py-2 w-40">Actor</th>
              <th className="text-left px-3 py-2 w-44">Target</th>
              <th className="text-left px-3 py-2 w-20">Status</th>
              <th className="text-left px-3 py-2 w-16">ms</th>
              <th className="text-left px-3 py-2">Summary / Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const open = expandedId === log.id;
              const isError = !!log.error || (log.status ? (log.status === "error" || log.status.startsWith("4") || log.status.startsWith("5")) : false);
              const summary = log.error
                ? log.error
                : (log.request?.method && log.request?.path)
                  ? `${log.request.method} ${log.request.path}`
                  : log.metadata
                    ? JSON.stringify(log.metadata).slice(0, 140)
                    : "—";
              return (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(open ? null : log.id)}
                    className={cn(
                      "border-b border-border hover:bg-muted/30 cursor-pointer",
                      isError && "bg-destructive/5"
                    )}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", categoryBadge(log.category))}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[180px]" title={log.action}>{log.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]" title={log.source || ""}>{log.source || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[160px]" title={log.actor || ""}>{log.actor || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[180px]" title={log.target_id || ""}>
                      {log.target_type ? <span className="font-medium">{log.target_type}</span> : "—"}
                      {log.target_id && <span className="font-mono ml-1 opacity-70">{log.target_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusBadge(log.status))}>
                        {log.status || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{log.duration_ms ?? "—"}</td>
                    <td className={cn("px-3 py-2 text-xs truncate max-w-[400px]", isError ? "text-destructive" : "text-muted-foreground")} title={summary}>
                      {summary}
                    </td>
                  </tr>
                  {open && (
                    <tr key={log.id + "-detail"} className="bg-muted/20 border-b border-border">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          {log.error && (
                            <div className="col-span-2">
                              <div className="text-xs font-semibold mb-1 text-destructive">Error</div>
                              <pre className="text-xs bg-destructive/5 border border-destructive/20 rounded p-2 overflow-auto whitespace-pre-wrap">{log.error}</pre>
                            </div>
                          )}
                          <DetailBlock title="Request" data={log.request} />
                          <DetailBlock title="Response" data={log.response} />
                          {log.metadata && <DetailBlock title="Metadata" data={log.metadata} />}
                          <div className="col-span-2 text-[11px] text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
                            <div><span className="font-semibold">ID:</span> <span className="font-mono">{log.id}</span></div>
                            <div><span className="font-semibold">Source:</span> {log.source || "—"}</div>
                            <div><span className="font-semibold">Target:</span> {log.target_type || "—"} {log.target_id ? `· ${log.target_id}` : ""}</div>
                            <div><span className="font-semibold">IP:</span> {log.ip || "—"}</div>
                            <div className="col-span-2 md:col-span-4"><span className="font-semibold">User Agent:</span> <span className="font-mono break-all">{log.user_agent || "—"}</span></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No audit logs yet. Actions and HTTP requests will appear here as they occur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailBlock({ title, data }: { title: string; data: any }) {
  if (data == null) return null;
  return (
    <div>
      <div className="text-xs font-semibold mb-1 text-muted-foreground">{title}</div>
      <pre className="text-[11px] bg-card border border-border rounded p-2 overflow-auto max-h-64 whitespace-pre-wrap">
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
