import { Link, useParams } from "react-router-dom";
import { Bot, LayoutDashboard, MessageCircle } from "lucide-react";

const WA_NUMBERS = ["93554832", "93537640"] as const;

export default function WhatsApp() {
  const { number = "" } = useParams<{ number: string }>();
  const label = `WA ${number}`;

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">AI Message Order Review</h1>
        </div>
        <nav className="ml-6 flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/inbox" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Emails
          </Link>
          {WA_NUMBERS.map((n) => (
            <Link
              key={n}
              to={`/wa/${n}`}
              className={
                n === number
                  ? "px-3 py-1.5 rounded-md text-sm font-medium bg-muted text-foreground"
                  : "px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              }
            >
              WA {n}
            </Link>
          ))}
          <Link to="/audit-logs" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Audit Logs
          </Link>
        </nav>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{label} — no messages yet</p>
          <p className="text-xs mt-1">WhatsApp integration coming soon.</p>
        </div>
      </div>
    </div>
  );
}
