import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboardData, type DashEmailRaw, type DashCustomer } from "@/hooks/useDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot, Inbox, Mail, AlertTriangle, ShoppingCart, CreditCard,
  TrendingUp, Wifi, WifiOff, ArrowRight, Clock, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type Range = "today" | "7d" | "30d" | "all";

const RANGE_LABEL: Record<Range, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

const PIPELINE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--ring))",
];

function withinRange(ts: string, range: Range): boolean {
  if (range === "all") return true;
  const t = new Date(ts).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  if (range === "7d") return t >= now - 7 * day;
  if (range === "30d") return t >= now - 30 * day;
  return true;
}

const Dashboard = () => {
  const { emails, customers, isLoading, usingLiveData } = useDashboardData();
  const [range, setRange] = useState<Range>("7d");

  const filtered = useMemo(
    () => emails.filter((e) => withinRange(e.timestamp, range)),
    [emails, range]
  );

  // Pipeline counts
  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    let irrelevant = 0;
    for (const e of filtered) {
      if (e.is_relevant === false) { irrelevant++; continue; }
      const s = e.status || "New";
      counts[s] = (counts[s] || 0) + 1;
    }
    return { counts, archived: 0, irrelevant, total: filtered.length };
  }, [filtered]);

  const pipelineChart = useMemo(
    () => Object.entries(pipeline.counts).map(([name, value]) => ({ name, value })),
    [pipeline.counts]
  );

  // Order activity
  const orderEmails = useMemo(
    () => filtered.filter((e) => /order/i.test(e.intent || "")),
    [filtered]
  );
  const pendingOrders = useMemo(
    () => orderEmails.filter((e) => !["Approved", "Replied"].includes(e.status || "")),
    [orderEmails]
  );
  const approvedOrders = useMemo(
    () => orderEmails.filter((e) => ["Approved", "Replied"].includes(e.status || "")),
    [orderEmails]
  );
  const stockInProcess = useMemo(
    () => filtered.filter((e) => (e.status || "").toLowerCase().includes("stock")),
    [filtered]
  );

  // Volume over time (last 14 days, regardless of range, gives trend context)
  const volumeSeries = useMemo(() => {
    const days = 14;
    const buckets: { date: string; emails: number; orders: number }[] = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(start.getTime() - i * 86400000);
      buckets.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        emails: 0,
        orders: 0,
      });
    }
    for (const e of emails) {
      const t = new Date(e.timestamp).getTime();
      const idx = Math.floor((t - (start.getTime() - (days - 1) * 86400000)) / 86400000);
      if (idx >= 0 && idx < days) {
        buckets[idx].emails++;
        if (/order/i.test(e.intent || "")) buckets[idx].orders++;
      }
    }
    return buckets;
  }, [emails]);

  // Credit health
  const credit = useMemo(() => {
    let totalLimit = 0, totalUsed = 0;
    const atRisk: DashCustomer[] = [];
    const overLimit: DashCustomer[] = [];
    for (const c of customers) {
      const lim = c.credit_limit || 0;
      const used = c.credit_used || 0;
      totalLimit += lim;
      totalUsed += used;
      if (lim > 0) {
        const ratio = used / lim;
        if (ratio >= 1) overLimit.push(c);
        else if (ratio >= 0.8) atRisk.push(c);
      }
    }
    return { totalLimit, totalUsed, atRisk, overLimit };
  }, [customers]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Email Order Review</h1>
        </div>
        <nav className="ml-8 flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted text-foreground">
            Dashboard
          </Link>
          <Link to="/inbox" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Messages
          </Link>
          <Link to="/audit-logs" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Audit Logs
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {usingLiveData ? <Wifi className="w-3.5 h-3.5 text-green-600" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{usingLiveData ? "Live" : "Offline"}</span>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Title + range filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h2>
            <p className="text-sm text-muted-foreground">{RANGE_LABEL[range]} · {pipeline.total} emails in scope</p>
          </div>
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            {(["today", "7d", "30d", "all"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                  range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Mail}
            label="Total messages"
            value={pipeline.total}
            href="/inbox"
            tone="primary"
          />
          <KpiCard
            icon={Clock}
            label="Pending orders"
            value={pendingOrders.length}
            href="/inbox?tab=inbox&intent=order"
            tone="warning"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Credit alerts"
            value={credit.atRisk.length + credit.overLimit.length}
            sub={`${credit.overLimit.length} over · ${credit.atRisk.length} near`}
            tone="destructive"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Approved orders"
            value={approvedOrders.length}
            sub={`${stockInProcess.length} in stock review`}
            tone="success"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Email & order volume (14d)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="emails" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="w-4 h-4" /> Pipeline breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {pipelineChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No data in range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {pipelineChart.map((_, i) => (
                        <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drill-down section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pending emails */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Pending orders & emails
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/inbox">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {pendingOrders.length === 0 ? (
                <EmptyRow text="No pending orders" />
              ) : (
                <ul className="divide-y divide-border">
                  {pendingOrders.slice(0, 6).map((e) => (
                    <EmailRow key={e.id} email={e} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Credit alerts */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Credit health
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {fmt(credit.totalUsed)} / {fmt(credit.totalLimit)} exposure
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {credit.overLimit.length === 0 && credit.atRisk.length === 0 ? (
                <EmptyRow text="All customers within credit limits" />
              ) : (
                <ul className="divide-y divide-border">
                  {[...credit.overLimit, ...credit.atRisk].slice(0, 6).map((c) => {
                    const lim = c.credit_limit || 0;
                    const used = c.credit_used || 0;
                    const ratio = lim > 0 ? used / lim : 0;
                    const over = ratio >= 1;
                    return (
                      <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {fmt(used)} of {fmt(lim)} · {Math.round(ratio * 100)}%
                          </p>
                        </div>
                        <Badge variant={over ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {over ? "Over limit" : "Near limit"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Stock-in-process queue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Stock review queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stockInProcess.length === 0 ? (
                <EmptyRow text="No items awaiting stock review" />
              ) : (
                <ul className="divide-y divide-border">
                  {stockInProcess.slice(0, 6).map((e) => <EmailRow key={e.id} email={e} />)}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" /> Recent communications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyRow text="No recent activity" />
              ) : (
                <ul className="divide-y divide-border">
                  {[...filtered]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 6)
                    .map((e) => <EmailRow key={e.id} email={e} />)}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <p className="text-center text-xs text-muted-foreground">Loading dashboard…</p>
        )}
      </main>
    </div>
  );
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  tone = "primary",
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  tone?: "primary" | "warning" | "destructive" | "success";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  const inner = (
    <Card className={cn("transition-shadow", href && "hover:shadow-md cursor-pointer")}>
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", toneClasses[tone])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function EmailRow({ email }: { email: DashEmailRaw }) {
  return (
    <li>
      <Link
        to={`/inbox?email=${email.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{email.customer_name || email.email}</p>
            {!email.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px] font-normal">
            {email.status || "New"}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {new Date(email.timestamp).toLocaleDateString()}
          </span>
        </div>
      </Link>
    </li>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-4 py-8 text-sm text-muted-foreground text-center">{text}</p>;
}

export default Dashboard;
