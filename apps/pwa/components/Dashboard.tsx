'use client';

import { useState } from 'react';
import {
  ShieldCheck, Search, Bell, User, Home, Radio, CheckSquare, Settings,
  TrendingUp, TrendingDown, AlertTriangle, AlertOctagon, Info, Smartphone,
  FileText, Zap, CheckCircle2, XCircle, ChevronRight, MessageSquare,
  Clock, MapPin, Eye, Wifi, BarChart3, Activity, Camera, CameraOff,
  RefreshCw, ClipboardList, History, ToggleLeft, ToggleRight, Save,
  UserCircle, Server, Plus, Trash2, Shield, ArrowLeft, LogOut,
  Lock, AtSign, AlertCircle, CheckCheck, Info as InfoIcon,
} from 'lucide-react';

// ─── Brand palette ────────────────────────────────────────────────────────────
// Peachy Orange  #FF7360  rgb(255,115,96)   → critical / hazard / error
// Turquoise      #5ACDD9  rgb(90,205,217)   → info / light-blue
// Royal Blue     #3E6AE0  rgb(62,106,224)   → primary blue category
// Safety Orange  #f97316                    → CTA / warning (unchanged)
// Emerald        #10b981                    → safe / success  (unchanged)
// Amber Gold     #d4a853                    → financial metric (unchanged)

const C = {
  critical:      '#FF7360',
  criticalDark:  '#d95c4a',
  criticalLight: '#FF9E91',
  criticalBg:    'rgba(255,115,96,0.06)',
  criticalBg2:   'rgba(255,115,96,0.10)',
  criticalBorder:'rgba(255,115,96,0.22)',
  criticalRing:  'rgba(255,115,96,0.25)',
  turquoise:     '#5ACDD9',
  turquoiseBg:   'rgba(90,205,217,0.08)',
  turquoiseBorder:'rgba(90,205,217,0.20)',
  royalBlue:     '#3E6AE0',
  royalBlueBg:   'rgba(62,106,224,0.08)',
  royalBlueBorder:'rgba(62,106,224,0.20)',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type NavTab     = 'home' | 'live' | 'tasks' | 'settings';
type UserRole   = 'Supervisor' | 'Manager';
type AlertSeverity = 'critical' | 'warning' | 'caution';
type ActiveView = NavTab | 'notifications';

interface UserSession {
  username: string; role: UserRole; displayName: string; badgeId: string;
}
interface Alert {
  id: string; severity: AlertSeverity; title: string; location: string;
  time: string; detail: string; riskPoints?: number;
  acknowledged: boolean; resolved: boolean; resolveNote: string; countdown?: string;
}
interface NotificationItem {
  id: string; type: 'critical' | 'warning' | 'info' | 'success';
  title: string; body: string; time: string; read: boolean;
}

// ─── Credentials ──────────────────────────────────────────────────────────────
const USERS: Record<string, { password: string; session: UserSession }> = {
  supervisor1: { password: 'sup@123', session: { username: 'supervisor1', role: 'Supervisor', displayName: 'Rajesh Kumar', badgeId: 'OP-012' } },
  manager1:    { password: 'man@123', session: { username: 'manager1',    role: 'Manager',    displayName: 'Priya Sharma',  badgeId: 'MGR-003' } },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const w = 64, h = 24, step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── QR SVG ───────────────────────────────────────────────────────────────────
function QRCodeSVG() {
  const cells = [
    {x:0,y:0,w:3,h:3},{x:1,y:1,w:1,h:1},{x:8,y:0,w:3,h:3},{x:9,y:1,w:1,h:1},
    {x:0,y:8,w:3,h:3},{x:1,y:9,w:1,h:1},{x:4,y:0,w:1,h:1},{x:6,y:0,w:1,h:1},
    {x:3,y:1,w:1,h:1},{x:5,y:1,w:1,h:1},{x:4,y:2,w:2,h:1},{x:7,y:2,w:1,h:1},
    {x:3,y:3,w:1,h:1},{x:5,y:3,w:2,h:1},{x:9,y:3,w:1,h:1},{x:0,y:4,w:1,h:1},
    {x:2,y:4,w:2,h:1},{x:6,y:4,w:1,h:1},{x:10,y:4,w:1,h:1},{x:1,y:5,w:1,h:1},
    {x:4,y:5,w:1,h:1},{x:7,y:5,w:2,h:1},{x:0,y:6,w:2,h:1},{x:3,y:6,w:1,h:1},
    {x:5,y:6,w:1,h:1},{x:8,y:6,w:1,h:1},{x:10,y:6,w:1,h:1},{x:3,y:7,w:2,h:1},
    {x:6,y:7,w:1,h:1},{x:9,y:7,w:2,h:1},{x:4,y:8,w:1,h:1},{x:6,y:8,w:1,h:1},
    {x:8,y:8,w:3,h:3},{x:3,y:9,w:2,h:1},{x:7,y:9,w:1,h:1},{x:4,y:10,w:3,h:1},{x:9,y:10,w:1,h:1},
  ];
  const cell = 8, size = 11 * cell;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto" aria-label="QR Code">
      <rect width={size} height={size} fill="#fafafa" rx="4" />
      {cells.map((c, i) => <rect key={i} x={c.x*cell+1} y={c.y*cell+1} width={c.w*cell-2} height={c.h*cell-2} fill="#09090b" rx="1" />)}
      <rect x={cell+1}   y={cell+1}   width={cell-2} height={cell-2} fill="#fafafa" rx="1" />
      <rect x={9*cell+1} y={cell+1}   width={cell-2} height={cell-2} fill="#fafafa" rx="1" />
      <rect x={cell+1}   y={9*cell+1} width={cell-2} height={cell-2} fill="#fafafa" rx="1" />
    </svg>
  );
}

// ─── Severity config ──────────────────────────────────────────────────────────
const severityConfig = {
  critical: {
    borderClass: 'blink-border border-2',
    borderColor:  C.critical,
    bgStyle:  { background: C.criticalBg },
    badgeStyle: { background: C.criticalBg2, color: C.critical, border: `1px solid ${C.criticalBorder}` },
    icon: AlertOctagon, iconColor: C.critical, label: 'CRITICAL',
  },
  warning: {
    borderClass: 'border-2',
    borderColor:  'rgba(249,115,22,0.6)',
    bgStyle:  { background: 'rgba(249,115,22,0.05)' },
    badgeStyle: { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' },
    icon: AlertTriangle, iconColor: '#f97316', label: 'WARNING',
  },
  caution: {
    borderClass: 'border',
    borderColor:  'rgba(63,63,70,0.7)',
    bgStyle:  { background: 'rgba(255,255,255,0.012)' },
    badgeStyle: { background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' },
    icon: Info, iconColor: 'var(--text-muted)', label: 'CAUTION',
  },
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (s: UserSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = USERS[username.trim()];
    if (user && user.password === password) onLogin(user.session);
    else setError('Invalid credentials. Please verify your username and password.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--canvas)' }}>
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249,115,22,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-[360px] relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', boxShadow: '0 0 40px rgba(249,115,22,0.18), 0 8px 32px rgba(0,0,0,0.5)' }}>
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-[0.2em] uppercase" style={{ color: 'var(--text-primary)', letterSpacing: '0.18em' }}>Suraksha AI</h1>
          <p className="text-xs mt-1.5 font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>Industrial Safety Platform</p>
          <div className="flex items-center gap-2 mt-4">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full block" style={{ background: '#10b981' }} />
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#10b981' }}>System Online</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #141416 0%, #111113 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.6)' }}>
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)' }} />
          <div className="p-7">
            <h2 className="text-sm font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.14em' }}>Secure Access</h2>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Enter your plant credentials to continue.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="text-[11px] font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Username</label>
                <div className="relative">
                  <AtSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input id="login-username" type="text" autoComplete="username"
                    value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="e.g. supervisor1"
                    className="w-full h-11 pl-10 pr-4 text-sm rounded-xl transition-all outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', caretColor: '#f97316' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.5)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)')}
                    onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',  e.target.style.boxShadow = 'none')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-[11px] font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input id="login-password" type="password" autoComplete="current-password"
                    value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter password"
                    className="w-full h-11 pl-10 pr-4 text-sm rounded-xl transition-all outline-none"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', caretColor: '#f97316' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.5)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)')}
                    onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',  e.target.style.boxShadow = 'none')}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{ background: C.criticalBg, border: `1px solid ${C.criticalBorder}` }}>
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: C.critical }} />
                  <p className="text-xs" style={{ color: C.criticalLight }}>{error}</p>
                </div>
              )}

              <button id="login-btn" type="submit" disabled={loading}
                className="touch-target w-full h-12 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 btn-primary-glow mt-2"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.2)' }}>
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {loading ? 'Authenticating…' : 'Sign In Securely'}
              </button>
            </form>

            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-faint)' }}>
              <p className="text-center text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                supervisor1 / sup@123 &nbsp;·&nbsp; manager1 / man@123
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] mt-6 tracking-wider uppercase" style={{ color: '#3f3f46', letterSpacing: '0.08em' }}>
          TATA Innovent · Suraksha AI v2.0
        </p>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS VIEW ───────────────────────────────────────────────────────
function NotificationsView({ onBack, notifications, onMarkAllRead }: {
  onBack: () => void; notifications: NotificationItem[]; onMarkAllRead: () => void;
}) {
  // critical → Peachy Orange | info → Turquoise | warning → safety orange | success → emerald
  const typeConfig = {
    critical: { icon: AlertOctagon, color: C.critical,      bg: C.criticalBg,   border: C.criticalBorder,   dot: C.critical       },
    warning:  { icon: AlertTriangle, color: '#f97316',      bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  dot: '#f97316'   },
    info:     { icon: InfoIcon,       color: C.turquoise,   bg: C.turquoiseBg,  border: C.turquoiseBorder,  dot: C.turquoise      },
    success:  { icon: CheckCheck,     color: '#10b981',     bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', dot: '#10b981'   },
  };
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button id="notif-back-btn" onClick={onBack}
            className="touch-target w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={17} />
          </button>
          <div>
            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: '#f97316' }}>
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
            <Bell size={32} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications yet</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border-faint)' }}>
            {notifications.map((notif, idx) => {
              const cfg = typeConfig[notif.type];
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors"
                  style={{ background: !notif.read ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug"
                        style={{ color: !notif.read ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{notif.title}</p>
                      {!notif.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: cfg.dot }} />}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{notif.body}</p>
                    <p className="text-[10px] font-medium mt-1.5 flex items-center gap-1" style={{ color: '#3f3f46' }}>
                      <Clock size={9} /> {notif.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, sparkData, sparkColor, badge, pulse }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down';
  sparkData: number[]; sparkColor: string; badge?: React.ReactNode; pulse?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2 min-w-0 transition-all"
      style={{ background: 'linear-gradient(160deg, #141416 0%, #111113 100%)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 20px rgba(0,0,0,0.35)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{label}</span>
        {badge}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black leading-none metric-num" style={{ color: 'var(--text-primary)' }}>{value}</span>
        {trend === 'up'   && <span className="flex items-center gap-0.5 text-xs font-semibold mb-1" style={{ color: '#10b981' }}><TrendingUp size={11} /> +4%</span>}
        {trend === 'down' && <span className="flex items-center gap-0.5 text-xs font-semibold mb-1" style={{ color: C.critical }}><TrendingDown size={11} /> -2%</span>}
      </div>
      {sub && <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      <div className="mt-auto pt-1"><Sparkline data={sparkData} color={sparkColor} /></div>
      {pulse && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="pulse-dot w-1.5 h-1.5 rounded-full block" style={{ background: '#10b981' }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#10b981' }}>Live</span>
        </div>
      )}
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onAcknowledge, onNoteChange, onResolve }: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onResolve: (id: string) => void;
}) {
  const cfg = severityConfig[alert.severity];
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(alert.severity === 'critical');

  if (alert.resolved) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <CheckCircle2 size={16} style={{ color: '#10b981' }} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#6ee7b7' }}>{alert.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(16,185,129,0.5)' }}>{alert.location} · Resolved</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl ${cfg.borderClass} overflow-hidden`}
      style={{ ...cfg.bgStyle, borderColor: cfg.borderColor }}>
      <button className="w-full text-left px-4 pt-4 pb-3 flex items-start gap-3 touch-target"
        onClick={() => setExpanded(!expanded)} aria-expanded={expanded} id={`alert-toggle-${alert.id}`}>
        <Icon size={18} className="flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
              style={{ ...cfg.badgeStyle, letterSpacing: '0.12em' }}>{cfg.label}</span>
            {alert.countdown && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                style={{ color: C.critical, background: C.criticalBg, border: `1px solid ${C.criticalBorder}` }}>
                ⏱ Entry in {alert.countdown}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold mt-1.5 leading-snug" style={{ color: 'var(--text-primary)' }}>{alert.title}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}><MapPin size={9} /> {alert.location}</span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}><Clock size={9} /> {alert.time}</span>
            {alert.riskPoints && <span className="text-[11px] font-bold" style={{ color: '#f97316' }}>+{alert.riskPoints} risk pts</span>}
          </div>
        </div>
        <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          style={{ color: 'var(--text-muted)' }} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <Eye size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{alert.detail}</p>
          </div>
          <div className="relative rounded-xl overflow-hidden h-16 flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
              style={{ backdropFilter: 'blur(12px)', background: 'rgba(9,9,11,0.7)' }}>
              <ShieldCheck size={15} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>Face Blurred · Privacy Protected</span>
            </div>
          </div>
          {alert.severity === 'warning' && (
            <div className="space-y-1.5">
              <label htmlFor={`note-${alert.id}`} className="text-[11px] font-semibold flex items-center gap-1"
                style={{ color: 'var(--text-secondary)' }}>
                <MessageSquare size={11} /> Resolution Notes
              </label>
              <textarea id={`note-${alert.id}`} rows={2} value={alert.resolveNote}
                onChange={e => onNoteChange(alert.id, e.target.value)}
                placeholder="Describe corrective action taken…"
                className="w-full text-xs rounded-xl px-3 py-2 resize-none outline-none transition-all"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.4)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.06)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',  e.target.style.boxShadow = 'none')}
              />
            </div>
          )}
          <div className="flex gap-2">
            {alert.severity === 'critical' && !alert.acknowledged && (
              <button id={`ack-btn-${alert.id}`} onClick={() => onAcknowledge(alert.id)}
                className="flex-1 touch-target min-h-[44px] text-white text-sm font-black tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${C.critical}, ${C.criticalDark})`, boxShadow: `0 4px 16px ${C.criticalRing}` }}>
                <Zap size={14} /> ACKNOWLEDGE
              </button>
            )}
            {alert.severity === 'critical' && alert.acknowledged && (
              <div className="flex-1 touch-target min-h-[44px] text-sm font-bold rounded-xl flex items-center justify-center gap-2"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                <CheckCircle2 size={14} /> Acknowledged
              </div>
            )}
            {alert.severity === 'warning' && (
              <button id={`resolve-btn-${alert.id}`} onClick={() => onResolve(alert.id)}
                className="flex-1 touch-target min-h-[44px] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.2)' }}>
                <CheckSquare size={14} /> Resolve
              </button>
            )}
            {alert.severity === 'caution' && (
              <button id={`clear-btn-${alert.id}`} onClick={() => onResolve(alert.id)}
                className="flex-1 touch-target min-h-[44px] text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <XCircle size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Camera Panel ─────────────────────────────────────────────────────────────
function CameraPanel({ id, zone, status }: { id: string; zone: string; status: 'live' | 'calibrating' | 'offline' }) {
  return (
    <div className="rounded-2xl overflow-hidden aspect-video flex flex-col"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-faint)' }}>
        <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>{id}</span>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
          style={
            status === 'live'        ? { background: 'rgba(16,185,129,0.12)',  color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'  } :
            status === 'calibrating' ? { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' } :
                                       { background: 'var(--surface-3)',       color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
          }>{status}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 relative" style={{ background: 'var(--canvas)' }}>
        {status === 'live' && (
          <>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 20px,#27272a 20px,#27272a 21px),repeating-linear-gradient(90deg,transparent,transparent 20px,#27272a 20px,#27272a 21px)' }} />
            <Camera size={22} style={{ color: '#10b981', opacity: 0.8 }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{zone}</span>
            <div className="flex items-center gap-1.5">
              {/* REC uses Peachy Orange */}
              <span className="pulse-dot w-1.5 h-1.5 rounded-full block" style={{ background: C.critical }} />
              <span className="text-[9px] font-bold tracking-widest" style={{ color: C.critical }}>REC</span>
            </div>
          </>
        )}
        {status === 'calibrating' && (
          <>
            <RefreshCw size={20} className="animate-spin" style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold" style={{ color: '#f97316' }}>Calibrating…</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{zone}</span>
          </>
        )}
        {status === 'offline' && (
          <>
            <CameraOff size={20} style={{ color: '#3f3f46' }} />
            <span className="text-xs font-semibold" style={{ color: '#3f3f46' }}>Node Offline</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section heading helper ───────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, right }: { icon: React.ElementType; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-faint)' }}>
      <div className="flex items-center gap-2.5">
        <Icon size={14} style={{ color: '#f97316' }} />
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)', letterSpacing: '0.12em' }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(160deg,#141416 0%,#111113 100%)', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 0 rgba(255,255,255,0.025) inset, 0 8px 32px rgba(0,0,0,0.35)' }}>
      {children}
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ alerts, onAcknowledge, onNoteChange, onResolve, role }: {
  alerts: Alert[]; onAcknowledge: (id: string) => void;
  onNoteChange: (id: string, note: string) => void; onResolve: (id: string) => void; role: UserRole;
}) {
  const isManager = role === 'Manager';
  return (
    <div className="space-y-6">
      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest"
          style={isManager
            ? { background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }
            : { background: 'rgba(249,115,22,0.1)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}>
          <Shield size={9} />
          {isManager ? 'Manager · Executive Dashboard' : 'Supervisor · Tactical Operations'}
        </span>
      </div>

      {/* KPI Row */}
      <section aria-label="Key Performance Indicators">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isManager && (
            <KPICard label="Site Score" value="78/100" sub="This week · Good" trend="up"
              sparkData={[68,70,72,69,74,76,78]} sparkColor="#10b981"
              badge={<span className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>Good</span>} />
          )}
          <KPICard label="Intercepts" value="42" sub="Near-misses today" trend="up"
            sparkData={[28,31,35,29,38,40,42]} sparkColor="#f97316"
            badge={<span className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>Today</span>} />
          {isManager && (
            <KPICard label="Loss Avoided" value="₹8.4L" sub="Estimated from industry avg."
              sparkData={[5.1,5.8,6.4,7.0,7.5,8.0,8.4]} sparkColor="#d4a853"
              badge={<span className="text-[9px] font-medium px-2 py-0.5 rounded-full tracking-widest uppercase font-mono"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>ESTIMATE</span>} />
          )}
          <KPICard label="Active Nodes" value="12" sub="Camera edge nodes"
            sparkData={[10,11,10,12,11,12,12]} sparkColor="#10b981" pulse
            badge={<Wifi size={13} style={{ color: '#10b981', opacity: 0.8 }} />} />
        </div>
      </section>

      {/* Bento Grid */}
      <section aria-label="Operations" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Alert Feed */}
        <Card className="md:col-span-2">
          <SectionHead icon={Activity} title="Live Alert Feed"
            right={
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                  {alerts.filter(a => !a.resolved).length} Active
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Peachy Orange live indicator */}
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full block" style={{ background: C.critical }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Real-time</span>
                </div>
              </div>
            } />
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert}
                onAcknowledge={onAcknowledge} onNoteChange={onNoteChange} onResolve={onResolve} />
            ))}
            {alerts.every(a => a.resolved) && (
              <div className="text-center py-12">
                <ShieldCheck size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#10b981' }} />
                <p className="text-sm font-semibold" style={{ color: '#10b981' }}>All Clear — No Active Hazards</p>
              </div>
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <Card>
            <SectionHead icon={Zap} title="Quick Actions" />
            <div className="p-4 space-y-2.5">
              <button id="add-device-btn"
                className="touch-target w-full min-h-[48px] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 btn-primary-glow"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 16px rgba(249,115,22,0.18)' }}>
                <Smartphone size={15} /> Add New Device
              </button>
              <button id="generate-report-btn"
                className="touch-target w-full min-h-[48px] text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-95"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <FileText size={15} style={{ opacity: 0.6 }} /> Generate Shift Report
              </button>
              {/* Log Incident uses Peachy Orange */}
              <button id="log-incident-btn"
                className="touch-target w-full min-h-[48px] text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-95"
                style={{ background: C.criticalBg, border: `1px solid ${C.criticalBorder}`, color: C.critical }}>
                <AlertTriangle size={15} /> Log Manual Incident
              </button>
            </div>
          </Card>

          {/* QR Node */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)' }} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <Shield size={14} style={{ color: '#f97316' }} />
                <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)', letterSpacing: '0.12em' }}>Launch Target Node</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Scan this QR on any smartphone to deploy it as a live safety camera node.
              </p>
              <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: '#fafafa' }}>
                <QRCodeSVG />
              </div>
              <ol className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {['Scan the QR matrix above', 'Tap "Add to Home Screen" when prompted', 'Open the app & allow camera access'].map((step, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black flex-shrink-0"
                      style={{ background: '#f97316' }}>{i + 1}</span>
                    {step}
                  </li>
                ))}
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{ background: '#10b981' }}>✓</span>
                  Auto-launches as a live safety node
                </li>
              </ol>
            </div>
          </div>

          {/* Analytics — Manager only */}
          {isManager && (
            <Card>
              <SectionHead icon={BarChart3} title="Site Analytics"
                right={<button className="flex items-center gap-1 text-[11px] font-semibold transition-colors" style={{ color: '#f97316' }}>View All <ChevronRight size={11} /></button>} />
              <div className="p-4">
                <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--border-faint)' }}>
                  <div className="grid grid-cols-6 gap-0.5 p-1.5" style={{ background: 'var(--surface-2)' }}>
                    {/* Chart cells: peachy orange replaces red, turquoise replaces light blue */}
                    {[
                      C.critical, '#f97316', '#10b981', '#10b981', '#f97316', C.critical,
                      '#f97316',  '#d4a853', '#10b981', '#10b981', '#f97316', '#f97316',
                      C.critical, '#f97316', '#d4a853', '#10b981', '#10b981', '#f97316',
                      '#10b981',  '#10b981', '#f97316', '#f97316', C.critical,'#f97316',
                    ].map((col, i) => (
                      <div key={i} className="h-4 rounded-sm" style={{ background: col, opacity: 0.65 }} />
                    ))}
                  </div>
                  <div className="flex justify-between px-2 py-1 text-[9px] font-medium"
                    style={{ background: 'var(--canvas)', color: 'var(--text-muted)' }}>
                    <span>Zone 1</span><span>Zone 3</span><span>Zone 6</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                    <p className="text-lg font-black metric-num" style={{ color: 'var(--accent-amber)' }}>₹2L</p>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Cost Prevented</p>
                    <p className="text-[9px] italic mt-0.5" style={{ color: '#3f3f46' }}>estimate</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
                    <p className="text-lg font-black metric-num" style={{ color: 'var(--text-primary)' }}>98.2%</p>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Uptime Today</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── LIVE VIEW ────────────────────────────────────────────────────────────────
function LiveView() {
  const cameras = [
    { id:'CAM-01', zone:'Zone 1 · Press Area',       status:'live'        as const },
    { id:'CAM-02', zone:'Zone 2 · Loading Bay 4',    status:'live'        as const },
    { id:'CAM-03', zone:'Zone 3 · Conveyor Line C',  status:'calibrating' as const },
    { id:'CAM-04', zone:'Zone 4 · Forklift Aisle G', status:'live'        as const },
    { id:'CAM-05', zone:'Zone 5 · Assembly Floor',   status:'calibrating' as const },
    { id:'CAM-06', zone:'Zone 6 · Exit Gate',        status:'offline'     as const },
    { id:'CAM-07', zone:'Zone 2 · Press_A Close-up', status:'live'        as const },
    { id:'CAM-08', zone:'Zone 1 · Overhead Wide',    status:'live'        as const },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Live Camera Streams</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>8 edge nodes · 5 active · 2 calibrating · 1 offline</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
            {/* LIVE indicator — Peachy Orange */}
            <span className="pulse-dot w-1.5 h-1.5 rounded-full block" style={{ background: C.critical }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: C.critical }}>LIVE</span>
          </div>
          <button className="touch-target flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.18)' }}>
            <Plus size={13} /> Add Node
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Streaming',   val:5, color:'#10b981',     bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.15)'  },
          { label:'Calibrating', val:2, color:'#f97316',     bg:'rgba(249,115,22,0.08)',  border:'rgba(249,115,22,0.15)'  },
          { label:'Offline',     val:1, color:'var(--text-muted)', bg:'var(--surface-2)',  border:'var(--border-subtle)'   },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className="text-2xl font-black metric-num" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[9px] uppercase tracking-widest font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cameras.map(cam => <CameraPanel key={cam.id} {...cam} />)}
      </div>

      <Card>
        <SectionHead icon={Shield} title="Active Detection Classes" />
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[
            // Person → Royal Blue #3E6AE0
            { label:'Person',    count:14, color: C.royalBlue,  bg: C.royalBlueBg,   border: C.royalBlueBorder  },
            // No Helmet → Peachy Orange #FF7360
            { label:'No Helmet', count:1,  color: C.critical,   bg: C.criticalBg,    border: C.criticalBorder   },
            // No Vest → muted neutral
            { label:'No Vest',   count:0,  color:'var(--text-muted)', bg:'var(--surface-2)', border:'var(--border-subtle)' },
            // Helmet → Emerald (success, unchanged)
            { label:'Helmet',    count:13, color:'#10b981',     bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.18)' },
            // Excavator → Safety Orange (unchanged)
            { label:'Excavator', count:2,  color:'#f97316',     bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.18)' },
          ].map(cls => (
            <div key={cls.label} className="rounded-xl p-3 text-center"
              style={{ background: cls.bg, border: `1px solid ${cls.border}` }}>
              <p className="text-xl font-black metric-num" style={{ color: cls.color }}>{cls.count}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{cls.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TASKS VIEW ───────────────────────────────────────────────────────────────
function TasksView({ alerts }: { alerts: Alert[] }) {
  const [checklist, setChecklist] = useState([
    { id:'t1', label:'Verify PPE at Zone 2 entry gate',           done:false, priority:'high'   },
    { id:'t2', label:'Recalibrate CAM-03 on Conveyor Line C',     done:false, priority:'medium' },
    { id:'t3', label:'Submit end-of-shift safety report',         done:true,  priority:'low'    },
    { id:'t4', label:'Audit forklift proximity sensors — Aisle G',done:false, priority:'high'   },
    { id:'t5', label:'Restock first-aid cabinet at Loading Bay 4',done:false, priority:'medium' },
    { id:'t6', label:'Update Zone 5 danger boundary markers',     done:true,  priority:'low'    },
    { id:'t7', label:'Operator fatigue check — Night shift crew', done:false, priority:'high'   },
  ]);
  const toggle = (id: string) =>
    setChecklist(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  // High priority uses Peachy Orange (was red)
  const priorityStyle: Record<string, React.CSSProperties> = {
    high:   { background: C.criticalBg,  color: C.critical, border: `1px solid ${C.criticalBorder}` },
    medium: { background: 'rgba(249,115,22,0.1)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' },
    low:    { background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' },
  };
  const pending = alerts.filter(a => a.severity === 'warning' && !a.resolved);
  const acknowledged = alerts.filter(a => a.acknowledged || a.resolved);
  const pct = Math.round((checklist.filter(t => t.done).length / checklist.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Safety Task Board</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{checklist.filter(t => t.done).length}/{checklist.length} tasks complete</p>
        </div>
        <button className="touch-target flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.18)' }}>
          <Plus size={13} /> Add Task
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Shift Progress</span>
          <span className="text-xs font-black metric-num" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f97316,#10b981)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-2">
          <SectionHead icon={ClipboardList} title="Safety Checklist" />
          <div style={{ borderTop: '1px solid var(--border-faint)' }}>
            {checklist.map((task, idx) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                style={{ borderBottom: idx < checklist.length - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                <button onClick={() => toggle(task.id)}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={task.done ? { background: '#10b981', border: '2px solid #10b981' } : { background: 'transparent', border: '1px solid var(--border-subtle)' }}>
                  {task.done && <CheckCircle2 size={11} className="text-white" />}
                </button>
                <span className="flex-1 text-sm"
                  style={{ color: task.done ? '#3f3f46' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
                  {task.label}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                  style={priorityStyle[task.priority]}>{task.priority}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionHead icon={AlertTriangle} title="Pending PPE" />
            <div className="p-4 space-y-2">
              {(pending.length > 0 ? pending : [{ id:'demo', title:'Missing PPE: Helmet at Loading Bay 4', location:'Loading Bay 4', time:'21:31:18' }]).map(a => (
                <div key={a.id} className="rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <p className="text-xs font-semibold leading-snug" style={{ color: '#fb923c' }}>{a.title}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{a.location} · {a.time}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <SectionHead icon={History} title="Ack. Log" />
            <div className="p-4 space-y-3">
              {[
                { title:'Machine Proximity – Press_A', time:'21:34:11', by:'Supervisor · OP-012' },
                { title:'Bent Posture – Conveyor C',   time:'21:15:04', by:'Auto-cleared'        },
                { title:'Forklift Aisle Traversal',    time:'20:58:33', by:'Supervisor · OP-007' },
                { title:'No Vest Violation – Zone 1',  time:'20:41:17', by:'Operator · OP-031'   },
              ].concat(acknowledged.map(a => ({ title: a.title, time: a.time, by: 'Current session' }))).slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-snug truncate" style={{ color: 'var(--text-secondary)' }}>{log.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{log.time} · {log.by}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({ session, onLogout }: { session: UserSession; onLogout: () => void }) {
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifWarning,  setNotifWarning]  = useState(true);
  const [notifCaution,  setNotifCaution]  = useState(false);
  const [voiceAlerts,   setVoiceAlerts]   = useState(true);
  const [autoResolve,   setAutoResolve]   = useState(false);

  const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
    <button onClick={toggle} className="transition-all duration-200"
      style={{ color: on ? '#f97316' : 'var(--text-muted)' }}>
      {on ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
    </button>
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure app parameters, nodes, and notifications</p>
      </div>

      {/* Profile */}
      <Card>
        <SectionHead icon={UserCircle} title="User Profile" />
        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f97316,#c2410c)', boxShadow: '0 4px 20px rgba(249,115,22,0.2)' }}>
              <User size={22} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{session.displayName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{session.username}@tata-innovent.in</p>
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-widest"
                style={session.role === 'Manager'
                  ? { background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }
                  : { background: 'rgba(249,115,22,0.1)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}>
                <Shield size={8} /> {session.role} · {session.badgeId}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {[
              { label:'Full Name',  val: session.displayName,       id:'name'  },
              { label:'Badge ID',   val: session.badgeId,           id:'badge' },
              { label:'Department', val:'Safety & Operations',      id:'dept'  },
              { label:'Shift',      val:'Evening (18:00–22:00)',    id:'shift' },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{f.label}</label>
                <input id={f.id} defaultValue={f.val}
                  className="w-full h-9 px-3 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.4)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.06)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',  e.target.style.boxShadow = 'none')}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button className="touch-target flex items-center gap-2 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.18)' }}>
              <Save size={12} /> Save Profile
            </button>
            {/* Logout — Peachy Orange */}
            <button id="settings-logout-btn" onClick={onLogout}
              className="touch-target flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
              style={{ background: C.criticalBg, border: `1px solid ${C.criticalBorder}`, color: C.critical }}>
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionHead icon={Bell} title="Notification Alerts" />
        <div className="px-5 pb-2">
          {[
            { label:'Critical Hazard Alerts',     sub:'Machine proximity, zone breaches',    on:notifCritical, toggle:()=>setNotifCritical(p=>!p) },
            { label:'Warning Alerts',              sub:'PPE violations, fatigue detection',   on:notifWarning,  toggle:()=>setNotifWarning(p=>!p)  },
            { label:'Caution Alerts',              sub:'Posture, lane traversal events',      on:notifCaution,  toggle:()=>setNotifCaution(p=>!p)  },
            { label:'Hindi Voice Alerts',          sub:'Plays from nearest phone speaker',    on:voiceAlerts,   toggle:()=>setVoiceAlerts(p=>!p)   },
            { label:'Auto-Resolve Caution Alerts', sub:'Clear after 5 min if no escalation', on:autoResolve,   toggle:()=>setAutoResolve(p=>!p)   },
          ].map((item, idx, arr) => (
            <div key={item.label} className="flex items-center justify-between py-3.5"
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-faint)' : 'none' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
              </div>
              <Toggle on={item.on} toggle={item.toggle} />
            </div>
          ))}
        </div>
      </Card>

      {/* Edge Nodes */}
      <Card>
        <SectionHead icon={Server} title="Edge Node Registry"
          right={<button className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
            <Plus size={11} /> Register
          </button>} />
        <div className="p-4 space-y-2">
          {[
            { id:'NODE-01', zone:'Zone 1 · Press Area',  ip:'192.168.1.101', status:'online'      },
            { id:'NODE-02', zone:'Zone 2 · Loading Bay',  ip:'192.168.1.102', status:'online'      },
            { id:'NODE-03', zone:'Zone 3 · Conveyor C',   ip:'192.168.1.103', status:'calibrating' },
            { id:'NODE-04', zone:'Zone 6 · Exit Gate',    ip:'192.168.1.106', status:'offline'     },
          ].map(node => (
            <div key={node.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-faint)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: node.status === 'online' ? '#10b981' : node.status === 'calibrating' ? '#f97316' : '#3f3f46' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{node.id} · {node.zone}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{node.ip}</p>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                style={node.status === 'online'
                  ? { background: 'rgba(16,185,129,0.1)',  color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'  }
                  : node.status === 'calibrating'
                  ? { background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }
                  : { background: 'var(--surface-3)',      color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                {node.status}
              </span>
              <button className="ml-1 transition-colors" style={{ color: '#3f3f46' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.critical)}
                onMouseLeave={e => (e.currentTarget.style.color = '#3f3f46')}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* App Parameters */}
      <Card>
        <SectionHead icon={Settings} title="App Parameters" />
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label:'Detection Confidence Threshold', val:'0.20',                    id:'conf' },
              { label:'Frame Buffer Size',              val:'5',                        id:'buf'  },
              { label:'Risk Score Alert Threshold',     val:'75',                       id:'risk' },
              { label:'WebSocket Endpoint',             val:'wss://api.suraksha.ai/ws', id:'ws'   },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={`param-${f.id}`} className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{f.label}</label>
                <input id={`param-${f.id}`} defaultValue={f.val}
                  className="w-full h-9 px-3 text-sm rounded-xl outline-none transition-all font-mono"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.4)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.06)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',  e.target.style.boxShadow = 'none')}
                />
              </div>
            ))}
          </div>
          <button className="mt-4 touch-target flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <Save size={12} /> Apply Configuration
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [session,    setSession]    = useState<UserSession | null>(null);
  const [activeNav,  setActiveNav]  = useState<NavTab>('home');
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [prevView,   setPrevView]   = useState<ActiveView>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id:'n1', type:'critical', title:'Machine Proximity Violation — Press_A',  body:'Operator #OP-047 trajectory predicted machine entry in 1.6s.',         time:'21:34:02', read:false },
    { id:'n2', type:'warning',  title:'PPE Violation: Missing Helmet',          body:'no_helmet detected at Loading Bay 4 with confidence 0.87.',             time:'21:31:18', read:false },
    { id:'n3', type:'info',     title:'CAM-03 Calibration Started',             body:'Conveyor Line C camera node entered recalibration mode. ETA: 2 min.',   time:'21:28:00', read:true  },
    { id:'n4', type:'success',  title:'Shift Report Generated',                 body:'Evening shift safety report compiled and sent to plant manager.',        time:'21:00:00', read:true  },
    { id:'n5', type:'warning',  title:'Bent Posture Detected',                  body:'Sustained bent-spine posture near Conveyor Belt C for 40s.',            time:'21:28:45', read:false },
    { id:'n6', type:'info',     title:'New Node Registered',                    body:'Edge node NODE-05 (Zone 5 · Assembly Floor) streaming.',                time:'20:45:00', read:true  },
    { id:'n7', type:'success',  title:'All Clear — Zone 4',                     body:'Forklift proximity alert at Aisle G cleared by Supervisor OP-007.',     time:'20:58:45', read:true  },
    { id:'n8', type:'critical', title:'No-Vest Violation — Zone 1',             body:'Operator detected without safety vest near Press Area.',                time:'20:41:00', read:true  },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    { id:'a1', severity:'critical', title:'Machine Proximity Violation at Press_A',          location:'Zone 2 · Press_A',        time:'21:34:02', detail:'Operator ID #OP-047 trajectory predicts machine entry at Press_A in 1.6 seconds. Velocity: 1.4 m/s.',         countdown:'1.6s', acknowledged:false, resolved:false, resolveNote:'' },
    { id:'a2', severity:'warning',  title:'Missing PPE: Helmet at Loading Bay 4',            location:'Loading Bay 4',            time:'21:31:18', detail:'no_helmet class detected with confidence 0.87. Audio alert played. +25 risk points added.',  riskPoints:25, acknowledged:false, resolved:false, resolveNote:'' },
    { id:'a3', severity:'caution',  title:'Bent Posture Detected Near Conveyor Belt C',      location:'Line C · Conveyor',        time:'21:28:45', detail:'MediaPipe PoseLandmarker reports sustained bent-spine posture for 40 s.',                              acknowledged:false, resolved:false, resolveNote:'' },
    { id:'a4', severity:'caution',  title:'Forklift Lane Traversal – Pedestrian Intersection',location:'Aisle G · Intersection 3',time:'21:22:11', detail:'Forklift trajectory intersects pedestrian lane at Intersection 3. Speed within limits.',               acknowledged:false, resolved:false, resolveNote:'' },
  ]);

  const handleAcknowledge = (id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  const handleNoteChange = (id: string, note: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolveNote: note } : a));
  const handleResolve = (id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));

  const handleLogin  = (s: UserSession) => { setSession(s); setActiveNav('home'); setActiveView('home'); };
  const handleLogout = () => { setSession(null); setActiveNav('home'); setActiveView('home'); setSearchQuery(''); };
  const handleBellClick  = () => { setPrevView(activeView === 'notifications' ? 'home' : activeView); setActiveView('notifications'); };
  const handleNotifBack  = () => { setActiveView(prevView === 'notifications' ? 'home' : prevView); };
  const handleMarkAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const handleNavChange  = (tab: NavTab) => { setActiveNav(tab); setActiveView(tab); };

  const unreadCount   = notifications.filter(n => !n.read).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;

  const navItems: { id: NavTab; icon: React.ElementType; label: string }[] = [
    { id:'home',     icon: Home,        label:'Home'     },
    { id:'live',     icon: Radio,       label:'Live'     },
    { id:'tasks',    icon: CheckSquare, label:'Tasks'    },
    { id:'settings', icon: Settings,    label:'Settings' },
  ];
  const viewTitles: Record<ActiveView, string> = {
    home:'Operations', live:'Live Streams', tasks:'Task Board',
    settings:'Settings', notifications:'Notifications',
  };

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--canvas)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 header-glass">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f97316,#c2410c)', boxShadow: '0 2px 12px rgba(249,115,22,0.25)' }}>
              <ShieldCheck size={17} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-primary)', letterSpacing: '0.14em' }}>Suraksha AI</span>
              <span className="text-[9px] block -mt-0.5 uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{viewTitles[activeView]}</span>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative max-w-sm mx-auto">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input id="global-search" type="search" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search alerts, zones, operators…"
              className="w-full h-9 pl-10 pr-4 text-xs rounded-full outline-none transition-all"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', caretColor: '#f97316' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(249,115,22,0.35)', e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.06)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border-subtle)',   e.target.style.boxShadow = 'none')}
            />
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-0.5 flex-shrink-0">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button key={id} id={`desktop-nav-${id}`} onClick={() => handleNavChange(id)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={activeNav === id && activeView !== 'notifications'
                  ? { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }}>
                <Icon size={13} />
                {label}
                {/* Critical badge — Peachy Orange */}
                {id === 'live' && criticalCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full absolute top-1 right-1" style={{ background: C.critical }} />
                )}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bell — badge uses Peachy Orange */}
            <button id="notif-bell" onClick={handleBellClick}
              className="relative touch-target w-9 h-9 flex items-center justify-center rounded-full transition-all"
              style={activeView === 'notifications'
                ? { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }}
              aria-label="Notifications">
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none"
                  style={{ background: C.critical }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Avatar dropdown */}
            <div className="relative group">
              <button id="avatar-btn"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'linear-gradient(135deg,#f97316,#c2410c)', boxShadow: '0 2px 10px rgba(249,115,22,0.2)' }}>
                <User size={14} className="text-white" />
              </button>
              <div className="absolute right-0 top-10 w-52 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{session.displayName}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{session.role} · {session.badgeId}</p>
                </div>
                {/* Logout — Peachy Orange */}
                <button id="avatar-logout-btn" onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors"
                  style={{ color: C.critical }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.criticalBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Critical banner — Peachy Orange gradient */}
        {criticalCount > 0 && activeView !== 'notifications' && (
          <div className="text-white text-[11px] font-black text-center py-1.5 tracking-widest uppercase"
            style={{ background: `linear-gradient(90deg, ${C.criticalDark}, ${C.critical}, ${C.criticalDark})`, animation: 'pulse 2s ease-in-out infinite' }}>
            🚨 {criticalCount} Critical Hazard{criticalCount > 1 ? 's' : ''} — Immediate Action Required
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {activeView === 'notifications' && <NotificationsView onBack={handleNotifBack} notifications={notifications} onMarkAllRead={handleMarkAllRead} />}
        {activeView === 'home'          && <HomeView alerts={alerts} onAcknowledge={handleAcknowledge} onNoteChange={handleNoteChange} onResolve={handleResolve} role={session.role} />}
        {activeView === 'live'          && <LiveView />}
        {activeView === 'tasks'         && <TasksView alerts={alerts} />}
        {activeView === 'settings'      && <SettingsView session={session} onLogout={handleLogout} />}
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      {activeView !== 'notifications' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom"
          style={{ background: 'rgba(9,9,11,0.95)', borderTop: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}
          aria-label="Mobile navigation">
          <div className="grid grid-cols-4">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button key={id} id={`nav-${id}`} onClick={() => handleNavChange(id)}
                className="touch-target relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-150"
                style={{ color: activeNav === id ? '#f97316' : 'var(--text-muted)' }}
                aria-label={label} aria-current={activeNav === id ? 'page' : undefined}>
                {activeNav === id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                    style={{ background: '#f97316' }} />
                )}
                <div className="relative">
                  <Icon size={19} />
                  {/* Critical nav badge — Peachy Orange */}
                  {id === 'live' && criticalCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: C.critical }} />
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ letterSpacing: '0.08em' }}>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
