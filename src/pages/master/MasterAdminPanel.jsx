/**
 * MasterAdminPanel.jsx — Painel Master do UpBarber SaaS
 * Conectado ao backend via master.service.js
 */

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Store, CreditCard, Package, BarChart2,
  Headphones, Settings, LogOut, LogIn, Ban, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Users, DollarSign,
  RefreshCw, Download, Plus, Edit2, Trash2, Search,
  ChevronDown, X, Eye, Mail, Menu,
  Shield, Star, Bell, Clock,
  FileText, ToggleLeft, ToggleRight, Send, MessageSquare,
  Check,
} from "lucide-react";
import { unwrap } from "../../services/api";
import { localDateInputValue } from "../../utils/date";
import {
  getMasterBarbershopStats,
  getMasterBarbershops,
  createMasterBarbershop,
  inviteBarbershopOwner, getPendingRegistrations, approveRegistration, rejectRegistration, sendMasterNotice,
  suspendBarbershop,
  reactivateBarbershop,
  impersonateBarbershop,
  getBarbershopModules,
  updateBarbershopModules,
  updatePlanModality,
  getMasterInvoiceSummary,
  getMasterInvoices,
  chargeInvoice,
  getMasterPlans,
  createMasterPlan,
  updateMasterPlan,
  deleteMasterPlan,
  getMasterBarbershopById,
  getMasterMrrHistory,
  getMasterRevenueByPlan,
  getMasterChurn,
  getMasterReportSummary,
  getMasterTickets,
  getMasterSupportStats,
  replyMasterTicket,
  updateMasterTicket,
  getMasterConfig,
  updateMasterConfig,
  getMasterFlags,
  updateMasterFlag,
  exportMasterReport,
  masterMe,
  requestMasterEmailChange,
  confirmMasterEmailChange,
  requestMasterPasswordChange,
  confirmMasterPasswordChange,
} from "../../services/master.service";
import { COMPANY } from "../../constants/company";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const P = {
  bg: "#0D0D0D",
  surface: "#141414",
  card: "#1A1A1A",
  border: "#2A2A2A",
  purple: "#7C3AED",
  purpleLight: "#8B5CF6",
  purpleDim: "#4C1D95",
  green: "#10B981",
  red: "#EF4444",
  yellow: "#F59E0B",
  blue: "#3B82F6",
  text: "#F5F5F5",
  muted: "#9CA3AF",
};

const PLAN_COLORS = ["#6B7280", "#8B5CF6", "#F59E0B", "#3B82F6", "#10B981"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const fmtK = (n) => n >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n}`;
const safeUnwrap = (res) => {
  const d = unwrap(res.data);
  return d?.rows ?? d?.data ?? d ?? [];
};

function Spinner() {
  return <div style={{ textAlign: "center", padding: 60, color: P.muted, fontSize: 14 }}>Carregando...</div>;
}

function ErrMsg({ msg, onRetry }) {
  return (
    <div style={{ textAlign: "center", padding: 60, color: P.red }}>
      <AlertTriangle size={24} style={{ marginBottom: 8 }} />
      <div>{msg || "Erro ao carregar dados"}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ marginTop: 12, background: P.border, border: "none", borderRadius: 8, padding: "8px 18px", color: P.text, cursor: "pointer" }}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    active:      { label: "Ativo",        bg: "#064E3B", color: P.green },
    trial:       { label: "Trial",        bg: "#1E3A5F", color: P.blue },
    overdue:     { label: "Inadimpl.",    bg: "#7C2D12", color: P.yellow },
    suspended:   { label: "Suspenso",     bg: "#1F2937", color: P.muted },
    cancelled:   { label: "Cancelado",    bg: "#1F2937", color: P.muted },
    paid:        { label: "Pago",         bg: "#064E3B", color: P.green },
    pending:     { label: "Pendente",     bg: "#78350F", color: P.yellow },
    open:        { label: "Aberto",       bg: "#7C2D12", color: P.red },
    answered:    { label: "Respondido",   bg: "#1E3A5F", color: P.blue },
    in_progress: { label: "Em andamento", bg: "#4C1D95", color: P.purpleLight },
    closed:      { label: "Fechado",      bg: "#1F2937", color: P.muted },
    urgent:      { label: "Urgente",      bg: "#7C2D12", color: P.red },
    high:        { label: "Alta",         bg: "#78350F", color: P.yellow },
    medium:      { label: "Média",        bg: "#1E3A5F", color: P.blue },
    low:         { label: "Baixa",        bg: "#1F2937", color: P.muted },
  };
  const s = map[status] || { label: status, bg: "#1F2937", color: P.muted };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
};

const Stat = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ color: P.muted, fontSize: 13 }}>{label}</span>
      {Icon && <span style={{ background: color + "22", borderRadius: 8, padding: 6, display: "flex" }}><Icon size={16} color={color} /></span>}
    </div>
    <div style={{ color: P.text, fontSize: 26, fontWeight: 700 }}>{value ?? "—"}</div>
    {sub && (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        {trend === "up" ? <TrendingUp size={12} color={P.green} /> : trend === "down" ? <TrendingDown size={12} color={P.red} /> : null}
        <span style={{ color: trend === "up" ? P.green : trend === "down" ? P.red : P.muted }}>{sub}</span>
      </div>
    )}
  </div>
);

const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${P.border}` }}>
          <span style={{ color: P.text, fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: P.muted, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ color: P.muted, fontSize: 13 }}>{label}</label>}
    <input {...props} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", ...props.style }} />
  </div>
);

const Btn = ({ children, variant = "primary", onClick, style: s, icon: Icon, small, disabled }) => {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: small ? 12 : 14, padding: small ? "6px 12px" : "10px 18px", transition: "opacity .15s", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary:   { background: P.purple, color: "#fff" },
    secondary: { background: P.border, color: P.text },
    danger:    { background: "#7C2D12", color: P.red },
    success:   { background: "#064E3B", color: P.green },
    ghost:     { background: "transparent", color: P.muted, border: `1px solid ${P.border}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...s }}>
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",     Icon: LayoutDashboard },
  { id: "barbearias", label: "Barbearias",    Icon: Store },
  { id: "cobrancas",  label: "Cobranças",     Icon: CreditCard },
  { id: "planos",     label: "Planos SaaS",   Icon: Package },
  { id: "relatorios", label: "Relatórios",    Icon: BarChart2 },
  { id: "suporte",    label: "Suporte",       Icon: Headphones },
  { id: "config",     label: "Configurações", Icon: Settings },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function AlertBanner({ icon: Icon, color, bg, text }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <Icon size={15} color={color} />
      <span style={{ color, fontSize: 13, flex: 1 }}>{text}</span>
      <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color, cursor: "pointer", padding: 0 }}><X size={14} /></button>
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState(null);
  const [mrrHistory, setMrrHistory] = useState([]);
  const [planDist, setPlanDist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, mrrRes, revRes] = await Promise.all([
        getMasterBarbershopStats(),
        getMasterMrrHistory({ months: 6 }),
        getMasterRevenueByPlan(),
      ]);
      setStats(unwrap(statsRes.data));
      const mrrRaw = unwrap(mrrRes.data);
      setMrrHistory((Array.isArray(mrrRaw) ? mrrRaw : []).map((row, i) => ({
        mes: row.month ? row.month.slice(5, 7) + "/" + row.month.slice(0, 4) : `M${i + 1}`,
        mrr: Number(row.mrr ?? 0),
        novos: Number(row.newSubscribers ?? 0),
        cancelados: Number(row.cancelled ?? 0),
      })));
      const revRaw = unwrap(revRes.data);
      setPlanDist((Array.isArray(revRaw) ? revRaw : []).map((row, i) => ({
        name: row.planName,
        value: Number(row.subscribers ?? 0),
        color: PLAN_COLORS[i % PLAN_COLORS.length],
      })));
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  const s = stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {s.overdue > 0 && <AlertBanner icon={AlertTriangle} color={P.red} bg="#7C2D12" text={`${s.overdue} barbearia(s) inadimplentes`} />}
        {s.trial > 0 && <AlertBanner icon={Clock} color={P.yellow} bg="#78350F" text={`${s.trial} barbearia(s) em período trial`} />}
        {s.suspended > 0 && <AlertBanner icon={Ban} color={P.muted} bg="#1F2937" text={`${s.suspended} barbearia(s) suspensa(s)`} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 }}>
        <Stat label="Barbearias Ativas"   value={s.active}       icon={Store}       color={P.green}       sub={`+${s.newThisMonth ?? 0} este mês`} trend="up" />
        <Stat label="Trials"              value={s.trial}        icon={Clock}       color={P.blue} />
        <Stat label="Suspensas"           value={s.suspended}    icon={Ban}         color={P.red} />
        <Stat label="Total Barbearias"    value={s.total}        icon={Users}       color={P.muted} />
      </div>

      {mrrHistory.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: P.text, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Evolução do MRR</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mrrHistory}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={P.purple} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={P.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="mes" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }} formatter={v => [fmt(v), "MRR"]} />
                <Area type="monotone" dataKey="mrr" stroke={P.purple} fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {planDist.length > 0 && (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: P.text, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Distribuição por Plano</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {planDist.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {planDist.map(d => (
                  <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                      <span style={{ color: P.muted, fontSize: 13 }}>{d.name}</span>
                    </div>
                    <span style={{ color: P.text, fontWeight: 600, fontSize: 13 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mrrHistory.length > 0 && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: P.text, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Novas vs. Cancelamentos</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mrrHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="mes" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }} />
              <Legend wrapperStyle={{ color: P.muted, fontSize: 12 }} />
              <Bar dataKey="novos" fill={P.green} radius={[4, 4, 0, 0]} name="Novas barbearias" />
              <Bar dataKey="cancelados" fill={P.red} radius={[4, 4, 0, 0]} name="Cancelamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Componente: Gerenciador de Módulos por Barbearia ─────────────────────────
const ALL_MODULES_CONFIG = [
  { key: "agenda",                label: "Agenda",              group: "Atendimento" },
  { key: "clientes",              label: "Clientes",            group: "Atendimento" },
  { key: "barbeiros",             label: "Barbeiros",           group: "Atendimento" },
  { key: "servicos",              label: "Serviços",            group: "Atendimento" },
  { key: "planos",                label: "Planos de Assinatura",group: "Clube" },
  { key: "assinantes",            label: "Assinantes",          group: "Clube" },
  { key: "assinaturas",           label: "Controle de Assinaturas", group: "Clube" },
  { key: "pagamentos-assinatura", label: "Pagamentos",          group: "Clube" },
  { key: "produtos",              label: "Produtos",            group: "Loja" },
  { key: "estoque",               label: "Estoque",             group: "Loja" },
  { key: "comandas",              label: "Comandas",            group: "Loja" },
  { key: "financeiro",            label: "Financeiro",          group: "Financeiro" },
  { key: "caixa",                 label: "Caixa do Dia",        group: "Financeiro" },
  { key: "relatorios",            label: "Relatórios",          group: "Relatórios" },
  { key: "whatsapp",              label: "WhatsApp",            group: "Automação" },
  { key: "campanhas",             label: "Campanhas",           group: "Automação" },
];
const MODULE_GROUPS = [...new Set(ALL_MODULES_CONFIG.map(m => m.group))];

function ModulesEditor({ barbershopId, P }) {
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!barbershopId) return;
    let cancelled = false;
    getBarbershopModules(barbershopId).then(r => {
      if (cancelled) return;
      const d = r.data?.data ?? r.data;
      setData(d);
      const mods = Array.isArray(d?.enabledModules) && d.enabledModules.length > 0
        ? d.enabledModules
        : ALL_MODULES_CONFIG.map(m => m.key);
      setEnabled(mods);
    }).catch(() => { if (!cancelled) setEnabled(ALL_MODULES_CONFIG.map(m => m.key)); });
    return () => { cancelled = true; };
  }, [barbershopId]);

  const toggle = (key) => setEnabled(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const save = async () => {
    setSaving(true);
    try {
      await updateBarbershopModules(barbershopId, { enabledModules: enabled });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>Módulos habilitados</div>
          <div style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
            {data?.masterSaasPlan ? `Plano: ${data.masterSaasPlan.name} (${data.masterSaasPlan.modality})` : "Configure quais funcionalidades esta barbearia pode acessar"}
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ background: saved ? "#064E3B" : P.purple, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {saved ? <><Check size={12} /> Salvo</> : saving ? "Salvando..." : "Salvar módulos"}
        </button>
      </div>
      {MODULE_GROUPS.map(group => (
        <div key={group} style={{ marginBottom: 12 }}>
          <div style={{ color: P.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{group}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_MODULES_CONFIG.filter(m => m.group === group).map(m => {
              const on = enabled.includes(m.key);
              return (
                <button key={m.key} onClick={() => toggle(m.key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: `1px solid ${on ? P.purple : P.border}`, background: on ? P.purple + "22" : "transparent", color: on ? P.purpleLight : P.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
                  {on ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: BARBEARIAS
// ═══════════════════════════════════════════════════════════════════════════════
function BarbeariasSection() {
  const [barbershops, setBarbershops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detailShop, setDetailShop] = useState(null);
  const [detailBranchId, setDetailBranchId] = useState("all");
  const [modal, setModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [chargeMethod, setChargeMethod] = useState("Pix");
  const [chargeObs, setChargeObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [newShop, setNewShop] = useState({
    barbershopName: "", ownerName: "", ownerEmail: "", ownerPassword: "",
    planId: "", dueDate: localDateInputValue(new Date(Date.now() + 30 * 86400000)),
    paymentMethod: "pix", invoiceStatus: "pending", trialDays: "", phone: "", city: "", state: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [pending, setPending] = useState([]);
  const [notice, setNotice] = useState({ title: "", message: "", sendEmail: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterPlan !== "all") params.plan = filterPlan;
      const res = await getMasterBarbershops(params);
      const data = unwrap(res.data);
      setBarbershops(data.rows ?? data ?? []);
      setTotal(data.total ?? (data.rows ?? data ?? []).length);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPlan]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    getMasterPlans().then(res => {
      if (cancelled) return;
      const rows = unwrap(res.data) ?? [];
      setPlans(rows);
      setNewShop(current => ({ ...current, planId: current.planId || rows[0]?.id || "" }));
    }).catch(() => { if (!cancelled) setPlans([]); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createMasterBarbershop({ ...newShop, trialDays: newShop.trialDays ? Number(newShop.trialDays) : undefined });
      setModal(null);
      setNewShop(current => ({
        ...current, barbershopName: "", ownerName: "", ownerEmail: "", ownerPassword: "",
        phone: "", city: "", state: "",
      }));
      await load();
    } catch (e) {
      alert("Erro ao criar barbearia: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };
  const loadPending = () => getPendingRegistrations().then(r=>setPending(unwrap(r.data)||[]));
  useEffect(()=>{loadPending()},[]);
  const sendInvite = async () => {
    try {
      await inviteBarbershopOwner({ email: inviteEmail, expiresInDays: 7 });
      setInviteEmail("");
      alert("Convite enviado por email");
    } catch (e) {
      alert("Erro ao enviar convite: " + (e.response?.data?.error?.message || e.message));
    }
  };
  const approve = async (shop) => {
    const planId = plans[0]?.id;
    if (!planId) return;
    try {
      await approveRegistration(shop.id, { planId, dueDate: localDateInputValue(new Date(Date.now() + 30 * 86400000)) });
      await loadPending();
      await load();
    } catch (e) {
      alert("Erro ao aprovar: " + (e.response?.data?.error?.message || e.message));
    }
  };
  const sendNotice = async () => {
    try {
      await sendMasterNotice(notice);
      setNotice({ title: "", message: "", sendEmail: true });
      alert("Aviso enviado");
    } catch (e) {
      alert("Erro ao enviar aviso: " + (e.response?.data?.error?.message || e.message));
    }
  };

  const handleSuspend = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await suspendBarbershop(selected.id, { reason: suspendReason });
      setModal(null);
      setSuspendReason("");
      await load();
    } catch (e) {
      alert("Erro ao suspender: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (b) => {
    if (!window.confirm(`Reativar ${b.name}?`)) return;
    try {
      await reactivateBarbershop(b.id);
      await load();
    } catch (e) {
      alert("Erro ao reativar: " + (e.response?.data?.error?.message || e.message));
    }
  };

  const handleImpersonate = async (b) => {
    if (!window.confirm(`Entrar como administrador de "${b.name}"?\nVocê será redirecionado ao painel da barbearia.`)) return;
    try {
      const res = await impersonateBarbershop(b.id);
      const data = unwrap(res.data);
      localStorage.setItem("upbarber:token", data?.impersonateToken);
      window.location.href = "/dashboard";
    } catch (e) {
      alert("Erro ao impersonar: " + (e.response?.data?.error?.message || e.message));
    }
  };

  const handleCharge = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Busca a fatura em aberto dessa barbearia
      const res = await getMasterInvoices({ barbershopId: selected.id, status: "overdue", limit: 1 });
      const data = unwrap(res.data);
      const invoices = data.rows ?? data ?? [];
      if (invoices.length === 0) {
        alert("Nenhuma fatura em aberto encontrada para esta barbearia.");
        setSaving(false);
        return;
      }
      await chargeInvoice(invoices[0].id, { method: chargeMethod.toLowerCase() });
      setModal(null);
      alert("Cobrança realizada com sucesso!");
      await load();
    } catch (e) {
      alert("Erro ao cobrar: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const openModal = async (b, type) => {
    setSelected(b);
    setModal(type);
    setSuspendReason("");
    setChargeObs("");
    if (type !== "detail") {
      setDetailShop(null);
      setDetailBranchId("all");
      return;
    }
    setDetailShop(null);
    setDetailBranchId("all");
    try {
      const res = await getMasterBarbershopById(b.id);
      const data = unwrap(res.data);
      setDetailShop(data);
      const mainBranch = Array.isArray(data?.branches) ? data.branches.find(branch => branch.isMain) : null;
      setDetailBranchId(mainBranch?.id || data?.branches?.[0]?.id || "all");
    } catch {
      setDetailShop(b);
      setDetailBranchId("all");
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} color={P.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar barbearia ou proprietário..."
            style={{ width: "100%", background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px 10px 36px", color: P.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14, cursor: "pointer" }}>
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="overdue">Inadimplente</option>
          <option value="suspended">Suspenso</option>
        </select>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14, cursor: "pointer" }}>
          <option value="all">Todos os planos</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <span style={{ color: P.muted, fontSize: 13 }}>{total} barbearia(s)</span>
        <Btn icon={Plus} small onClick={() => setModal("create")}>Nova barbearia</Btn>
        <Btn icon={RefreshCw} variant="ghost" small onClick={load}>Atualizar</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
        <div style={{background:P.card,border:`1px solid ${P.border}`,padding:16,borderRadius:8}}>
          <div style={{color:P.text,fontWeight:600,marginBottom:10}}>Convidar proprietário</div>
          <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@proprietario.com" style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${P.border}`,color:P.text,padding:10,borderRadius:6}}/>
          <Btn icon={Mail} small style={{marginTop:10}} onClick={sendInvite}>Enviar convite</Btn>
        </div>
        <div style={{background:P.card,border:`1px solid ${P.border}`,padding:16,borderRadius:8}}>
          <div style={{color:P.text,fontWeight:600,marginBottom:10}}>Enviar aviso</div>
          <input value={notice.title} onChange={e=>setNotice({...notice,title:e.target.value})} placeholder="Título" style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${P.border}`,color:P.text,padding:10,borderRadius:6,marginBottom:8}}/>
          <textarea value={notice.message} onChange={e=>setNotice({...notice,message:e.target.value})} placeholder="Mensagem" style={{width:"100%",boxSizing:"border-box",background:P.surface,border:`1px solid ${P.border}`,color:P.text,padding:10,borderRadius:6}}/>
          <Btn icon={Send} small style={{marginTop:10}} onClick={sendNotice}>Enviar no sistema e email</Btn>
        </div>
      </div>
      {pending.length>0&&<div style={{background:P.card,border:`1px solid ${P.border}`,padding:16,borderRadius:8}}>
        <div style={{color:P.text,fontWeight:600,marginBottom:10}}>Cadastros aguardando análise</div>
        {pending.map(shop=><div key={shop.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderTop:`1px solid ${P.border}`}}><span style={{color:P.text,flex:1}}>{shop.name} · {shop.users?.[0]?.email}</span><Btn small onClick={()=>approve(shop)}>Aprovar</Btn><Btn small variant="ghost" onClick={async()=>{await rejectRegistration(shop.id);await loadPending()}}>Rejeitar</Btn></div>)}
      </div>}

      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: P.surface }}>
              {["Barbearia", "Plano", "Status", "MRR", "Filiais", "Clientes", "Próx. Cobrança", "Ações"].map(h => (
                <th key={h} style={{ color: P.muted, fontSize: 12, fontWeight: 600, padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {barbershops.map((b, i) => (
              <tr key={b.id} style={{ borderTop: `1px solid ${P.border}`, background: i % 2 === 0 ? "transparent" : P.surface + "44" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ color: P.text, fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                  <div style={{ color: P.muted, fontSize: 12 }}>{b.ownerName} · {b.email}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ color: P.purpleLight, fontWeight: 600, fontSize: 13 }}>{b.plan}</span>
                </td>
                <td style={{ padding: "14px 16px" }}><StatusBadge status={b.saasStatus} /></td>
                <td style={{ padding: "14px 16px", color: P.text, fontSize: 14, fontWeight: 600 }}>
                  {b.mrr > 0 ? fmt(b.mrr) : <span style={{ color: P.muted }}>—</span>}
                </td>
                <td style={{ padding: "14px 16px", color: P.text, fontSize: 14, textAlign: "center" }}>{b.filiais ?? 1}</td>
                <td style={{ padding: "14px 16px", color: P.text, fontSize: 14 }}>{(b.clientsCount ?? 0).toLocaleString("pt-BR")}</td>
                <td style={{ padding: "14px 16px", color: P.muted, fontSize: 13 }}>{b.nextBillingDate ?? "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openModal(b, "detail")} title="Ver detalhes" style={{ background: P.border, border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: P.text, display: "flex" }}><Eye size={13} /></button>
                    <button title="Impersonar" onClick={() => handleImpersonate(b)} style={{ background: "#1E3A5F", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: P.blue, display: "flex" }}><LogIn size={13} /></button>
                    {b.saasStatus === "overdue" && (
                      <button onClick={() => openModal(b, "charge")} title="Cobrar" style={{ background: "#78350F", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: P.yellow, display: "flex" }}><CreditCard size={13} /></button>
                    )}
                    {b.saasStatus === "active" && (
                      <button onClick={() => openModal(b, "suspend")} title="Suspender" style={{ background: "#7C2D12", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: P.red, display: "flex" }}><Ban size={13} /></button>
                    )}
                    {b.saasStatus === "suspended" && (
                      <button onClick={() => handleReactivate(b)} title="Reativar" style={{ background: "#064E3B", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: P.green, display: "flex" }}><CheckCircle size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {barbershops.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: P.muted }}>Nenhuma barbearia encontrada</div>
        )}
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Nova barbearia" width={680}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {[
            ["barbershopName", "Nome da barbearia", "text"],
            ["ownerName", "Nome do proprietário", "text"],
            ["ownerEmail", "Email de acesso", "email"],
            ["ownerPassword", "Senha inicial", "password"],
            ["phone", "Telefone", "text"],
            ["city", "Cidade", "text"],
            ["state", "Estado", "text"],
            ["dueDate", "Data de vencimento", "date"],
            ["trialDays", "Duração do teste em dias (opcional)", "number"],
          ].map(([key, label, type]) => (
            <label key={key} style={{ color: P.muted, fontSize: 12 }}>
              {label}
              <input type={type} value={newShop[key]} onChange={e => setNewShop({ ...newShop, [key]: e.target.value })}
                style={{ width: "100%", marginTop: 5, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 7, padding: "10px 12px", color: P.text, boxSizing: "border-box" }} />
            </label>
          ))}
          <label style={{ color: P.muted, fontSize: 12 }}>Plano
            <select value={newShop.planId} onChange={e => setNewShop({ ...newShop, planId: e.target.value })}
              style={{ width: "100%", marginTop: 5, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 7, padding: "10px 12px", color: P.text }}>
              {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {fmt(plan.price)}</option>)}
            </select>
          </label>
          <label style={{ color: P.muted, fontSize: 12 }}>Forma de pagamento<input value={`Pix · ${COMPANY.bank} · CNPJ ${COMPANY.cnpj} · ${COMPANY.developer}`} disabled style={{ width: "100%", marginTop: 5, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 7, padding: "10px 12px", color: P.muted, boxSizing:"border-box" }}/></label>
          <label style={{ color: P.muted, fontSize: 12 }}>Situação da primeira fatura
            <select value={newShop.invoiceStatus} onChange={e => setNewShop({ ...newShop, invoiceStatus: e.target.value })}
              style={{ width: "100%", marginTop: 5, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 7, padding: "10px 12px", color: P.text }}>
              <option value="pending">Pendente</option><option value="paid">Paga</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
          <Btn icon={Plus} disabled={saving || !newShop.planId} onClick={handleCreate}>{saving ? "Criando..." : "Criar e liberar acesso"}</Btn>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={modal === "detail" && !!selected} onClose={() => setModal(null)} title={selected?.name} width={760}>
        {(detailShop || selected) && (
          (() => {
            const shop = detailShop || selected;
            const branches = Array.isArray(shop?.branches) ? shop.branches : [];
            const activeBranch = detailBranchId === "all"
              ? null
              : branches.find(branch => branch.id === detailBranchId) || branches.find(branch => branch.isMain) || branches[0] || null;
            const branchStats = activeBranch?._count || {};
            return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {[
                ["Proprietário", shop.ownerName],
                ["Email", shop.email],
                ["Telefone", shop.phone ?? "—"],
                ["Plano", shop.plan],
                ["Status", <StatusBadge key="s" status={shop.saasStatus} />],
                ["MRR", shop.mrr > 0 ? fmt(shop.mrr) : "—"],
                ["Filiais", shop.filiais ?? 1],
                ["Clientes", (shop.clientsCount ?? 0).toLocaleString("pt-BR")],
                ["Cliente desde", shop.since ? new Date(shop.since).toLocaleDateString("pt-BR") : "—"],
                ["Próx. cobrança", shop.nextBillingDate ?? "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: P.muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
                  <div style={{ color: P.text, fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            {branches.length > 0 && (
              <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>Filiais da barbearia</div>
                    <div style={{ color: P.muted, fontSize: 12, marginTop: 3 }}>Selecione uma unidade para ver os números dela no master</div>
                  </div>
                  <select
                    value={detailBranchId}
                    onChange={e => setDetailBranchId(e.target.value)}
                    style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.text, fontSize: 13 }}
                  >
                    <option value="all">Todas as filiais</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? " · Matriz" : ""}</option>
                    ))}
                  </select>
                </div>
                {activeBranch ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                    {[
                      ["Barbeiros", branchStats.barbers ?? 0],
                      ["Agendamentos", branchStats.appointments ?? 0],
                      ["Pedidos", branchStats.orders ?? 0],
                      ["Produtos", branchStats.products ?? 0],
                      ["Financeiro", branchStats.financialTransactions ?? 0],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ color: P.muted, fontSize: 11 }}>{label}</div>
                        <div style={{ color: P.text, fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
                      </div>
                    ))}
                    <div style={{ gridColumn: "1 / -1", color: P.muted, fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
                      {activeBranch.address}{activeBranch.city ? ` · ${activeBranch.city}/${activeBranch.state}` : ""}{activeBranch.phone ? ` · ${activeBranch.phone}` : ""}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: P.muted, fontSize: 12 }}>Nenhuma filial específica selecionada no momento.</div>
                )}
              </div>
            )}
            <ModulesEditor barbershopId={shop?.id} P={P} />
            <div style={{ display: "flex", gap: 10, paddingTop: 8, borderTop: `1px solid ${P.border}` }}>
              <Btn icon={LogIn} onClick={() => { setModal(null); handleImpersonate(shop); }} small>Impersonar</Btn>
              {shop.email && (
                <Btn icon={Mail} variant="ghost" small onClick={() => window.open(`mailto:${shop.email}`)}>Enviar Email</Btn>
              )}
            </div>
          </div>
            );
          })()
        )}
      </Modal>

      {/* Suspend Modal */}
      <Modal open={modal === "suspend" && !!selected} onClose={() => setModal(null)} title="Suspender barbearia">
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#7C2D1244", border: `1px solid ${P.red}33`, borderRadius: 8, padding: 16, color: P.red, fontSize: 13 }}>
              ⚠️ Ao suspender, a barbearia perderá acesso ao sistema imediatamente.
            </div>
            <Input label="Motivo da suspensão" placeholder="Ex: Inadimplência — fatura vencida há 15 dias" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Ban} onClick={handleSuspend} disabled={saving}>{saving ? "Suspendendo..." : "Confirmar Suspensão"}</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Charge Modal */}
      <Modal open={modal === "charge" && !!selected} onClose={() => setModal(null)} title="Realizar Cobrança Manual">
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              <Input label="Valor (R$)" value={selected.mrr} readOnly />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: P.muted, fontSize: 13 }}>Método</label>
                <select value={chargeMethod} onChange={e => setChargeMethod(e.target.value)} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14 }}>
                  <option>Pix</option>
                </select>
              </div>
            </div>
            <Input label="Observação" placeholder="Ex: Cobrança retroativa" value={chargeObs} onChange={e => setChargeObs(e.target.value)} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={CreditCard} onClick={handleCharge} disabled={saving}>{saving ? "Cobrando..." : "Cobrar Agora"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: COBRANÇAS
// ═══════════════════════════════════════════════════════════════════════════════
function CobrancasSection() {
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter !== "all") params.status = filter;
      const [summaryRes, invRes] = await Promise.all([
        getMasterInvoiceSummary(),
        getMasterInvoices({ ...params, limit: 100 }),
      ]);
      setSummary(unwrap(summaryRes.data));
      const data = unwrap(invRes.data);
      setInvoices(data.rows ?? data ?? []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCharge = async (inv) => {
    if (!window.confirm(`Cobrar ${fmt(inv.amount)} de ${inv.barbershopName}?`)) return;
    try {
      await chargeInvoice(inv.id, { method: "credit" });
      alert("Cobrança realizada!");
      await load();
    } catch (e) {
      alert("Erro: " + (e.response?.data?.error?.message || e.message));
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportMasterReport({ type: "invoices" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cobrancas.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erro ao exportar: " + (e.response?.data?.error?.message || e.message));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  const s = summary || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 }}>
        <Stat label="Recebido"       value={fmt(s.totalPaid ?? 0)}    icon={CheckCircle}  color={P.green} />
        <Stat label="Em aberto"      value={fmt(s.totalOverdue ?? 0)} icon={AlertTriangle} color={P.red} sub="Cobrar agora" />
        <Stat label="MRR Projetado"  value={fmtK(s.mrr ?? 0)}        icon={TrendingUp}   color={P.purple} />
        <Stat label="ARR Projetado"  value={fmtK(s.arr ?? 0)}        icon={TrendingUp}   color={P.purpleLight} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {["all", "paid", "overdue", "pending", "suspended"].map(st => (
          <button key={st} onClick={() => setFilter(st)} style={{ background: filter === st ? P.purple : P.card, border: `1px solid ${filter === st ? P.purple : P.border}`, borderRadius: 20, padding: "6px 16px", color: filter === st ? "#fff" : P.muted, fontSize: 13, cursor: "pointer" }}>
            {{ all: "Todos", paid: "Pagos", overdue: "Vencidos", pending: "Pendentes", suspended: "Suspensos" }[st]}
          </button>
        ))}
        <button onClick={handleExportCSV} style={{ marginLeft: "auto", background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "6px 14px", color: P.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={13} /> Exportar CSV
        </button>
        <Btn icon={RefreshCw} variant="ghost" small onClick={load}>Atualizar</Btn>
      </div>

      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: P.surface }}>
              {["Barbearia", "Plano", "Valor", "Status", "Vencimento", "Método", "Ações"].map(h => (
                <th key={h} style={{ color: P.muted, fontSize: 12, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.id} style={{ borderTop: `1px solid ${P.border}`, background: i % 2 === 0 ? "transparent" : P.surface + "44" }}>
                <td style={{ padding: "12px 16px", color: P.text, fontSize: 14 }}>{inv.barbershopName ?? inv.barbershop?.name}</td>
                <td style={{ padding: "12px 16px", color: P.muted, fontSize: 13 }}>{inv.planName ?? inv.barbershop?.masterSaasPlan?.name ?? "—"}</td>
                <td style={{ padding: "12px 16px", color: P.text, fontWeight: 600, fontSize: 14 }}>{inv.amount > 0 ? fmt(inv.amount) : "—"}</td>
                <td style={{ padding: "12px 16px" }}><StatusBadge status={inv.status} /></td>
                <td style={{ padding: "12px 16px", color: P.muted, fontSize: 13 }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("pt-BR") : "—"}</td>
                <td style={{ padding: "12px 16px", color: P.muted, fontSize: 13 }}>{inv.paymentMethod ?? "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  {inv.status === "overdue" && (
                    <Btn icon={CreditCard} small onClick={() => handleCharge(inv)}>Cobrar</Btn>
                  )}
                  {inv.status === "paid" && (
                    <Btn icon={FileText} variant="ghost" small>Recibo</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: P.muted }}>Nenhuma cobrança encontrada</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: PLANOS SAAS
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_PLAN = { name: "", slug: "", price: "", annualPrice: "", features: [], maxFiliais: 1, maxBarbers: "", maxClients: "", storageGb: 1, color: "#8B5CF6", icon: "🚀", isActive: true };

function PlanosSection() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(EMPTY_PLAN);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMasterPlans();
      const data = unwrap(res.data);
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (plan) => {
    setEditData({ ...plan, features: Array.isArray(plan.features) ? plan.features : [] });
    setIsNew(false);
    setEditModal(true);
  };

  const openNew = () => {
    setEditData({ ...EMPTY_PLAN });
    setIsNew(true);
    setEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editData,
        price: Number(editData.price),
        annualPrice: Number(editData.annualPrice || 0),
        maxBarbers: editData.maxBarbers ? Number(editData.maxBarbers) : null,
        maxClients: editData.maxClients ? Number(editData.maxClients) : null,
        storageGb: Number(editData.storageGb || 1),
        maxFiliais: Number(editData.maxFiliais || 1),
      };
      if (isNew) {
        await createMasterPlan(payload);
      } else {
        await updateMasterPlan(editData.id, payload);
      }
      setEditModal(false);
      await load();
    } catch (e) {
      alert("Erro ao salvar: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Excluir plano "${plan.name}"? Esta ação não pode ser desfeita.\nPlanos com assinantes ativos não podem ser excluídos.`)) return;
    try {
      await deleteMasterPlan(plan.id);
      await load();
    } catch (e) {
      alert("Erro: " + (e.response?.data?.error?.message || e.message));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn icon={RefreshCw} variant="ghost" small onClick={load}>Atualizar</Btn>
        <Btn icon={Plus} onClick={openNew}>Novo Plano</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{ background: P.card, border: `2px solid ${plan.color ?? P.purple}44`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 28 }}>{plan.icon ?? "⚡"}</div>
                <div style={{ color: plan.color ?? P.purpleLight, fontWeight: 800, fontSize: 20, marginTop: 4 }}>{plan.name}</div>
                <div style={{ color: P.muted, fontSize: 12 }}>{plan.subscribersCount ?? plan._count?.barbershopSubscriptions ?? 0} assinantes</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: P.text, fontWeight: 700, fontSize: 22 }}>R$ {plan.price}<span style={{ fontSize: 12, color: P.muted }}>/mês</span></div>
                {plan.annualPrice > 0 && <div style={{ color: P.muted, fontSize: 12 }}>R$ {plan.annualPrice}/mês anual</div>}
              </div>
            </div>

            <div style={{ background: P.surface, borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
              {[
                ["Filiais", plan.maxFiliais ?? "∞"],
                ["Barbeiros", plan.maxBarbers ?? "∞"],
                ["Clientes", plan.maxClients ?? "∞"],
                ["Storage", `${plan.storageGb ?? 1}GB`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: P.muted, fontSize: 11 }}>{k}</div>
                  <div style={{ color: P.text, fontWeight: 600, fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>

            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.slice(0, 6).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={13} color={plan.color ?? P.purpleLight} />
                    <span style={{ color: P.muted, fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <Btn icon={Edit2} variant="ghost" small onClick={() => openEdit(plan)} style={{ flex: 1 }}>Editar</Btn>
              <Btn icon={Trash2} variant="danger" small onClick={() => handleDelete(plan)}>Excluir</Btn>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div style={{ color: P.muted, padding: 40 }}>Nenhum plano cadastrado. Clique em "Novo Plano" para criar.</div>
        )}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title={isNew ? "Novo Plano" : `Editar Plano — ${editData.name}`} width={620}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            <Input label="Nome do plano" value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Ex: Pro" />
            <Input label="Slug (URL)" value={editData.slug || ""} onChange={e => setEditData({ ...editData, slug: e.target.value })} placeholder="ex: pro" />
            <Input label="Preço mensal (R$)" type="number" value={editData.price || ""} onChange={e => setEditData({ ...editData, price: e.target.value })} />
            <Input label="Preço anual (R$/mês)" type="number" value={editData.annualPrice || ""} onChange={e => setEditData({ ...editData, annualPrice: e.target.value })} />
            <Input label="Máx. Filiais" type="number" value={editData.maxFiliais || ""} onChange={e => setEditData({ ...editData, maxFiliais: e.target.value })} placeholder="Ex: 3" />
            <Input label="Máx. Barbeiros (vazio = ilimitado)" type="number" value={editData.maxBarbers || ""} onChange={e => setEditData({ ...editData, maxBarbers: e.target.value })} />
            <Input label="Máx. Clientes (vazio = ilimitado)" type="number" value={editData.maxClients || ""} onChange={e => setEditData({ ...editData, maxClients: e.target.value })} />
            <Input label="Storage (GB)" type="number" value={editData.storageGb || ""} onChange={e => setEditData({ ...editData, storageGb: e.target.value })} />
            <Input label="Cor (hex)" value={editData.color || ""} onChange={e => setEditData({ ...editData, color: e.target.value })} placeholder="#8B5CF6" />
            <Input label="Ícone (emoji)" value={editData.icon || ""} onChange={e => setEditData({ ...editData, icon: e.target.value })} placeholder="🚀" />
          </div>
          <div>
            <label style={{ color: P.muted, fontSize: 13 }}>Features (uma por linha)</label>
            <textarea
              value={(editData.features || []).join("\n")}
              onChange={e => setEditData({ ...editData, features: e.target.value.split("\n").filter(Boolean) })}
              style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14, minHeight: 100, boxSizing: "border-box", marginTop: 6, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditModal(false)}>Cancelar</Btn>
            <Btn icon={Check} onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Plano"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════════
function RelatoriosSection() {
  const [summary, setSummary] = useState(null);
  const [churnData, setChurnData] = useState([]);
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, churnRes, revRes] = await Promise.all([
        getMasterReportSummary(),
        getMasterChurn({ months: 6 }),
        getMasterRevenueByPlan(),
      ]);
      setSummary(unwrap(sumRes.data));
      const chRaw = unwrap(churnRes.data);
      setChurnData((Array.isArray(chRaw) ? chRaw : []).map((row, i) => ({
        mes: row.month ? row.month.slice(5, 7) + "/" + row.month.slice(2, 4) : `M${i + 1}`,
        churn: Number(row.churnRate ?? 0),
        retencao: Number(row.retentionRate ?? 100),
      })));
      const revRaw = unwrap(revRes.data);
      setRevenueByPlan(Array.isArray(revRaw) ? revRaw : []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (type) => {
    try {
      const res = await exportMasterReport({ type });
      const ext = type === "pdf" ? "pdf" : "csv";
      const mime = type === "pdf" ? "application/pdf" : "text/csv";
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erro ao exportar: " + (e.response?.data?.error?.message || e.message));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  const s = summary || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 }}>
        <Stat label="MRR"              value={fmtK(s.mrr ?? 0)}           icon={DollarSign} color={P.purple} />
        <Stat label="ARR"              value={fmtK(s.arr ?? 0)}           icon={TrendingUp}  color={P.purpleLight} />
        <Stat label="Barbearias Ativas" value={s.active ?? 0}             icon={Store}       color={P.green} />
        <Stat label="Receita Total"    value={fmtK(s.totalRevenue ?? 0)}  icon={DollarSign} color={P.yellow} />
      </div>

      {(churnData.length > 0 || revenueByPlan.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {churnData.length > 0 && (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: P.text, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Churn Rate Mensal (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={churnData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="mes" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }} formatter={v => [`${v}%`]} />
                  <Line type="monotone" dataKey="churn" stroke={P.red} strokeWidth={2} dot={{ fill: P.red }} name="Churn" />
                  <Line type="monotone" dataKey="retencao" stroke={P.green} strokeWidth={2} dot={{ fill: P.green }} name="Retenção" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {revenueByPlan.length > 0 && (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: P.text, fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Receita por Plano</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueByPlan} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="planName" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8 }} formatter={v => [fmt(v), "Receita"]} />
                  <Bar dataKey="mrr" fill={P.purple} radius={[0, 6, 6, 0]} name="MRR" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {revenueByPlan.length > 0 && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: P.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Resumo por Plano</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn icon={Download} variant="ghost" small onClick={() => handleExport("summary")}>CSV</Btn>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: P.surface }}>
                {["Plano", "Assinantes", "MRR", "Ticket Médio", "LTV Estimado"].map(h => (
                  <th key={h} style={{ color: P.muted, fontSize: 12, fontWeight: 600, padding: "12px 20px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revenueByPlan.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${P.border}` }}>
                  <td style={{ padding: "14px 20px", color: PLAN_COLORS[i % PLAN_COLORS.length], fontWeight: 700 }}>{r.planName}</td>
                  <td style={{ padding: "14px 20px", color: P.text }}>{r.subscribers}</td>
                  <td style={{ padding: "14px 20px", color: P.text, fontWeight: 600 }}>{fmt(r.mrr ?? 0)}</td>
                  <td style={{ padding: "14px 20px", color: P.text }}>{fmt(r.avgTicket ?? 0)}</td>
                  <td style={{ padding: "14px 20px", color: P.green, fontWeight: 600 }}>{fmt(r.ltv ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: SUPORTE
// ═══════════════════════════════════════════════════════════════════════════════
function SuporteSection() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100 };
      if (filter !== "all") params.status = filter;
      const [tickRes, statsRes] = await Promise.all([
        getMasterTickets(params),
        getMasterSupportStats(),
      ]);
      const data = unwrap(tickRes.data);
      setTickets(data.rows ?? data ?? []);
      setStats(unwrap(statsRes.data));
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await replyMasterTicket(selected.id, { body: reply });
      setReply("");
      setSelected(null);
      alert("Resposta enviada!");
      await load();
    } catch (e) {
      alert("Erro: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    if (!window.confirm("Fechar este ticket?")) return;
    setSaving(true);
    try {
      await updateMasterTicket(selected.id, { status: "closed" });
      setSelected(null);
      await load();
    } catch (e) {
      alert("Erro: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  const s = stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
        <Stat label="Abertos"       value={s.open ?? 0}       icon={MessageSquare} color={P.red} />
        <Stat label="Em andamento"  value={s.inProgress ?? 0} icon={RefreshCw}     color={P.yellow} />
        <Stat label="Respondidos"   value={s.answered ?? 0}   icon={Check}         color={P.blue} />
        <Stat label="Fechados"      value={s.closed ?? 0}     icon={CheckCircle}   color={P.muted} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["all", "open", "in_progress", "answered", "closed"].map(st => (
          <button key={st} onClick={() => setFilter(st)} style={{ background: filter === st ? P.purple : P.card, border: `1px solid ${filter === st ? P.purple : P.border}`, borderRadius: 20, padding: "6px 16px", color: filter === st ? "#fff" : P.muted, fontSize: 13, cursor: "pointer" }}>
            {{ all: "Todos", open: "Abertos", in_progress: "Em andamento", answered: "Respondidos", closed: "Fechados" }[st]}
          </button>
        ))}
        <Btn icon={RefreshCw} variant="ghost" small onClick={load} style={{ marginLeft: "auto" }}>Atualizar</Btn>
      </div>

      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: P.surface }}>
              {["ID", "Barbearia", "Assunto", "Prioridade", "Status", "Criado em", "Atendente", ""].map(h => (
                <th key={h} style={{ color: P.muted, fontSize: 12, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t, i) => (
              <tr key={t.id} style={{ borderTop: `1px solid ${P.border}`, background: i % 2 === 0 ? "transparent" : P.surface + "44" }}>
                <td style={{ padding: "12px 16px", color: P.purple, fontWeight: 700, fontSize: 13 }}>{t.id?.slice(0, 8)}</td>
                <td style={{ padding: "12px 16px", color: P.text, fontSize: 14 }}>{t.barbershopName ?? t.barbershop?.name}</td>
                <td style={{ padding: "12px 16px", color: P.text, fontSize: 13, maxWidth: 220 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                </td>
                <td style={{ padding: "12px 16px" }}><StatusBadge status={t.priority} /></td>
                <td style={{ padding: "12px 16px" }}><StatusBadge status={t.status} /></td>
                <td style={{ padding: "12px 16px", color: P.muted, fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleString("pt-BR") : "—"}</td>
                <td style={{ padding: "12px 16px", color: P.muted, fontSize: 13 }}>{t.assigneeName ?? t.assignee?.name ?? <span style={{ color: P.red }}>Sem atendente</span>}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Btn small icon={MessageSquare} variant="ghost" onClick={() => { setSelected(t); setReply(""); }}>Responder</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: P.muted }}>Nenhum ticket encontrado</div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket — ${selected?.barbershopName ?? selected?.barbershop?.name}`} width={600}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: P.surface, borderRadius: 8, padding: 14 }}>
              <div style={{ color: P.muted, fontSize: 12, marginBottom: 6 }}>Assunto</div>
              <div style={{ color: P.text, fontSize: 14 }}>{selected.subject}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <div><div style={{ color: P.muted, fontSize: 12 }}>Prioridade</div><StatusBadge status={selected.priority} /></div>
              <div><div style={{ color: P.muted, fontSize: 12 }}>Status</div><StatusBadge status={selected.status} /></div>
              <div><div style={{ color: P.muted, fontSize: 12 }}>Atendente</div><div style={{ color: P.text, fontSize: 13, marginTop: 4 }}>{selected.assigneeName ?? "—"}</div></div>
            </div>
            <div>
              <label style={{ color: P.muted, fontSize: 13 }}>Resposta</label>
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Digite sua resposta..." rows={4}
                style={{ width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14, boxSizing: "border-box", marginTop: 6, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setSelected(null)}>Cancelar</Btn>
              {selected.status !== "closed" && (
                <Btn icon={Check} variant="ghost" small onClick={handleClose} disabled={saving}>Fechar Ticket</Btn>
              )}
              <Btn icon={Send} onClick={handleReply} disabled={saving || !reply.trim()}>{saving ? "Enviando..." : "Enviar Resposta"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO: CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════
function ConfigSection() {
  const [config, setConfig] = useState({});
  const [flags, setFlags] = useState([]);
  const [plans, setPlans] = useState([]);
  const [masterProfile, setMasterProfile] = useState(null);
  const [masterTab, setMasterTab] = useState("email");
  const [masterForm, setMasterForm] = useState({
    currentPassword: "",
    newEmail: "",
    emailCode: "",
    newPassword: "",
    confirmPassword: "",
    passwordCode: ""
  });
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterInfo, setMasterInfo] = useState("");
  const [masterError, setMasterError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, flagRes, planRes, meRes] = await Promise.all([
        getMasterConfig(),
        getMasterFlags(),
        getMasterPlans(),
        masterMe()
      ]);
      setConfig(unwrap(cfgRes.data) ?? {});
      const flagRaw = unwrap(flagRes.data);
      setFlags(Array.isArray(flagRaw) ? flagRaw : []);
      const planRaw = unwrap(planRes.data);
      setPlans(Array.isArray(planRaw) ? planRaw : []);
      setMasterProfile(unwrap(meRes.data) ?? null);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const masterMfaEnabled = config.master_mfa_enabled !== "false";

  const saveSection = async (keys) => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(keys.map(k => [k, config[k] ?? ""]));
      await updateMasterConfig(payload);
      alert("Configurações salvas!");
    } catch (e) {
      alert("Erro ao salvar: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = async (flag, planId, currentEnabled) => {
    try {
      await updateMasterFlag(flag.id, planId, { enabled: !currentEnabled });
      await load();
    } catch (e) {
      alert("Erro: " + (e.response?.data?.error?.message || e.message));
    }
  };

  const upd = (key, value) => setConfig(c => ({ ...c, [key]: value }));

  const updMaster = (key, value) => setMasterForm(c => ({ ...c, [key]: value }));

  const sendEmailCode = async () => {
    setMasterLoading(true);
    setMasterError("");
    setMasterInfo("");
    try {
      if (!masterForm.currentPassword || !masterForm.newEmail) throw new Error("Preencha a senha atual e o novo e-mail.");
      await requestMasterEmailChange({ currentPassword: masterForm.currentPassword, newEmail: masterForm.newEmail });
      setMasterInfo("Código enviado para o e-mail atual do master.");
    } catch (e) {
      setMasterError(e.response?.data?.error?.message || e.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const confirmEmailChange = async () => {
    setMasterLoading(true);
    setMasterError("");
    setMasterInfo("");
    try {
      await confirmMasterEmailChange({ code: masterForm.emailCode });
      setMasterInfo("E-mail do master atualizado com sucesso.");
      await load();
    } catch (e) {
      setMasterError(e.response?.data?.error?.message || e.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const sendPasswordCode = async () => {
    setMasterLoading(true);
    setMasterError("");
    setMasterInfo("");
    try {
      if (!masterForm.currentPassword || !masterForm.newPassword) throw new Error("Preencha a senha atual e a nova senha.");
      if (masterForm.newPassword !== masterForm.confirmPassword) throw new Error("A confirmação da nova senha não confere.");
      await requestMasterPasswordChange({ currentPassword: masterForm.currentPassword, newPassword: masterForm.newPassword });
      setMasterInfo("Código enviado para confirmar a nova senha.");
    } catch (e) {
      setMasterError(e.response?.data?.error?.message || e.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const confirmPasswordChange = async () => {
    setMasterLoading(true);
    setMasterError("");
    setMasterInfo("");
    try {
      await confirmMasterPasswordChange({ code: masterForm.passwordCode });
      setMasterInfo("Senha do master atualizada com sucesso.");
      setMasterForm(c => ({ ...c, currentPassword: "", newPassword: "", confirmPassword: "", passwordCode: "" }));
    } catch (e) {
      setMasterError(e.response?.data?.error?.message || e.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const saveMasterSecurity = async () => {
    setSaving(true);
    try {
      await updateMasterConfig({ master_mfa_enabled: String(!masterMfaEnabled) });
      await load();
    } catch (e) {
      alert("Erro ao salvar: " + (e.response?.data?.error?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrMsg msg={error} onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Section title="Conta Master">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginBottom: 14 }}>
          <Input label="E-mail atual" value={masterProfile?.email ?? ""} disabled />
          <Input label="Nome do acesso" value={masterProfile?.name ?? "Admin Master"} disabled />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn variant={masterTab === "email" ? "primary" : "secondary"} onClick={() => setMasterTab("email")}>Trocar e-mail</Btn>
          <Btn variant={masterTab === "password" ? "primary" : "secondary"} onClick={() => setMasterTab("password")}>Trocar senha</Btn>
        </div>

        {masterTab === "email" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            <Input label="Senha atual" type="password" value={masterForm.currentPassword} onChange={e => updMaster("currentPassword", e.target.value)} placeholder="Digite sua senha atual" />
            <Input label="Novo e-mail" type="email" value={masterForm.newEmail} onChange={e => updMaster("newEmail", e.target.value)} placeholder="novo@email.com" />
            <Input label="Código de confirmação" value={masterForm.emailCode} onChange={e => updMaster("emailCode", e.target.value)} placeholder="6 dígitos" />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <Btn icon={Send} onClick={sendEmailCode} disabled={masterLoading}>Enviar código</Btn>
              <Btn icon={Check} variant="secondary" onClick={confirmEmailChange} disabled={masterLoading || !masterForm.emailCode}>Confirmar</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            <Input label="Senha atual" type="password" value={masterForm.currentPassword} onChange={e => updMaster("currentPassword", e.target.value)} placeholder="Digite sua senha atual" />
            <Input label="Nova senha" type="password" value={masterForm.newPassword} onChange={e => updMaster("newPassword", e.target.value)} placeholder="Digite a nova senha" />
            <Input label="Confirmar nova senha" type="password" value={masterForm.confirmPassword} onChange={e => updMaster("confirmPassword", e.target.value)} placeholder="Repita a nova senha" />
            <Input label="Código de confirmação" value={masterForm.passwordCode} onChange={e => updMaster("passwordCode", e.target.value)} placeholder="6 dígitos" />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn icon={Send} onClick={sendPasswordCode} disabled={masterLoading}>Enviar código</Btn>
              <Btn icon={Check} variant="secondary" onClick={confirmPasswordChange} disabled={masterLoading || !masterForm.passwordCode}>Confirmar</Btn>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, padding: 16, border: `1px solid ${P.border}`, borderRadius: 10, background: P.surface }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>Verificação em 2 etapas do master</div>
              <div style={{ color: P.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                Quando ativa, o login master exige um código enviado por email antes de liberar o painel.
              </div>
            </div>
            <Btn variant={masterMfaEnabled ? "success" : "secondary"} onClick={saveMasterSecurity} disabled={saving}>
              {masterMfaEnabled ? "Desativar 2FA" : "Ativar 2FA"}
            </Btn>
          </div>
        </div>

        {masterInfo && <p style={{ marginTop: 12, color: P.green, fontSize: 13 }}>{masterInfo}</p>}
        {masterError && <p style={{ marginTop: 12, color: P.red, fontSize: 13 }}>{masterError}</p>}
        <p style={{ marginTop: 12, color: P.muted, fontSize: 12, lineHeight: 1.6 }}>
          O código de confirmação é enviado para o e-mail atual do master e expira em 15 minutos.
        </p>
      </Section>

      {/* SMTP */}
      <Section title="Configurações de Email (SMTP)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          <Input label="Host SMTP" value={config.smtp_host ?? ""} onChange={e => upd("smtp_host", e.target.value)} placeholder="smtp.sendgrid.net" />
          <Input label="Porta" value={config.smtp_port ?? ""} onChange={e => upd("smtp_port", e.target.value)} placeholder="587" />
          <Input label="Usuário" value={config.smtp_user ?? ""} onChange={e => upd("smtp_user", e.target.value)} placeholder="apikey" />
          <Input label="Senha / API Key" type="password" value={config.smtp_pass ?? ""} onChange={e => upd("smtp_pass", e.target.value)} placeholder="••••••••" />
          <Input label="Email remetente" value={config.smtp_from_email ?? ""} onChange={e => upd("smtp_from_email", e.target.value)} placeholder="noreply@upbarber.com.br" />
          <Input label="Nome remetente" value={config.smtp_from_name ?? ""} onChange={e => upd("smtp_from_name", e.target.value)} placeholder="UpBarber" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn icon={Check} onClick={() => saveSection(["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name"])} disabled={saving}>Salvar SMTP</Btn>
        </div>
      </Section>

      {/* Gateway */}
      <Section title="Gateway de Pagamento">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: P.muted, fontSize: 13 }}>Provedor</label>
            <select value={config.payment_gateway ?? "stripe"} onChange={e => upd("payment_gateway", e.target.value)} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px", color: P.text, fontSize: 14 }}>
              <option value="stripe">Stripe</option>
              <option value="asaas">Asaas</option>
              <option value="pagseguro">PagSeguro</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
          <Input label="Chave Pública" value={config.stripe_public_key ?? ""} onChange={e => upd("stripe_public_key", e.target.value)} placeholder="pk_live_..." />
          <Input label="Chave Secreta" type="password" value={config.stripe_secret_key ?? ""} onChange={e => upd("stripe_secret_key", e.target.value)} placeholder="sk_live_..." />
          <Input label="Webhook Secret" type="password" value={config.stripe_webhook_secret ?? ""} onChange={e => upd("stripe_webhook_secret", e.target.value)} placeholder="whsec_..." />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn icon={Check} onClick={() => saveSection(["payment_gateway", "stripe_public_key", "stripe_secret_key", "stripe_webhook_secret"])} disabled={saving}>Salvar Gateway</Btn>
        </div>
      </Section>

      {/* Feature Flags */}
      {flags.length > 0 && (
        <Section title="Feature Flags">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {flags.map(flag => (
              <div key={flag.id ?? flag.key} style={{ background: P.surface, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: P.text, fontWeight: 600, fontSize: 14 }}>{flag.label ?? flag.key}</div>
                    {flag.description && <div style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>{flag.description}</div>}
                  </div>
                </div>
                {flag.plans && flag.plans.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {flag.plans.map((pf, pi) => (
                      <button
                        key={pf.planId}
                        onClick={() => handleToggleFlag(flag, pf.planId, pf.enabled)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: pf.enabled ? "#064E3B" : P.border, border: "none", borderRadius: 20, padding: "4px 12px", cursor: "pointer", color: pf.enabled ? P.green : P.muted, fontSize: 12, fontWeight: 600 }}
                      >
                        {pf.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {pf.planName}
                      </button>
                    ))}
                  </div>
                )}
                {(!flag.plans || flag.plans.length === 0) && (
                  <button
                    onClick={() => {}}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", marginTop: 8, color: flag.enabled ? P.green : P.muted }}
                  >
                    {flag.enabled ? <ToggleRight size={24} color={P.green} /> : <ToggleLeft size={24} color={P.muted} />}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{flag.enabled ? "Ativo" : "Inativo"}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Platform Info */}
      <Section title="Informações da Plataforma">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          <Input label="Nome da plataforma" value={config.platform_name ?? ""} onChange={e => upd("platform_name", e.target.value)} placeholder="UpBarber" />
          <Input label="Domínio principal" value={config.platform_domain ?? ""} onChange={e => upd("platform_domain", e.target.value)} placeholder="upbarber.com.br" />
          <Input label="Email de suporte" value={config.support_email ?? ""} onChange={e => upd("support_email", e.target.value)} placeholder="suporte@upbarber.com.br" />
          <Input label="WhatsApp de suporte" value={config.support_whatsapp ?? ""} onChange={e => upd("support_whatsapp", e.target.value)} placeholder="+55 11 9 0000-0000" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn icon={Check} onClick={() => saveSection(["platform_name", "platform_domain", "support_email", "support_whatsapp"])} disabled={saving}>Salvar Informações</Btn>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: P.text, fontWeight: 700, fontSize: 15, margin: 0, paddingBottom: 14, borderBottom: `1px solid ${P.border}` }}>{title}</h3>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const SECTION_COMPONENTS = {
  dashboard:  DashboardSection,
  barbearias: BarbeariasSection,
  cobrancas:  CobrancasSection,
  planos:     PlanosSection,
  relatorios: RelatoriosSection,
  suporte:    SuporteSection,
  config:     ConfigSection,
};

const SECTION_TITLES = {
  dashboard:  "Dashboard da Plataforma",
  barbearias: "Gerenciar Barbearias",
  cobrancas:  "Cobranças e Pagamentos",
  planos:     "Planos SaaS",
  relatorios: "Relatórios da Plataforma",
  suporte:    "Central de Suporte",
  config:     "Configurações do Sistema",
};

export default function MasterAdminPanel() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 980 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 980);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  const SectionComponent = SECTION_COMPONENTS[active];
  const sidebarExpanded = isMobile ? true : sidebarOpen;
  const desktopSidebarWidth = sidebarExpanded ? 240 : 64;
  const openMobileMenu = () => setMobileMenuOpen(true);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const navigate = (id) => {
    setActive(id);
    if (isMobile) closeMobileMenu();
  };
  const SidebarBody = () => (
    <>
      <div style={{ padding: "20px 16px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, background: P.purple, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Shield size={18} color="#fff" />
        </div>
        {sidebarExpanded && (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: P.text, fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{COMPANY.product}</div>
            <div style={{ color: P.muted, fontSize: 10, marginTop: 2 }}>{COMPANY.developer}</div>
            <div style={{ background: P.purple, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, display: "inline-block", letterSpacing: 1, marginTop: 6 }}>MASTER ADMIN</div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: sidebarExpanded ? "10px 12px" : "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              background: active === id ? P.purple : "transparent",
              color: active === id ? "#fff" : P.muted,
              transition: "background .15s",
              minHeight: 42,
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {sidebarExpanded && <span style={{ fontSize: 14, fontWeight: active === id ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>}
          </button>
        ))}
      </nav>

      <div style={{ padding: "12px 8px", borderTop: `1px solid ${P.border}` }}>
        {sidebarExpanded && (
          <div style={{ color: P.muted, fontSize: 10, lineHeight: 1.5, padding: "0 12px 10px" }}>
            <div>Feito pela {COMPANY.developer}</div>
            <div>CNPJ {COMPANY.cnpj}</div>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: P.muted, cursor: "pointer", width: "100%" }}
          >
            <ChevronDown size={16} style={{ transform: sidebarOpen ? "rotate(90deg)" : "rotate(-90deg)" }} />
            {sidebarOpen && <span style={{ fontSize: 13 }}>Recolher menu</span>}
          </button>
        )}
        <button
          onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: P.muted, cursor: "pointer", width: "100%" }}
        >
          <LogOut size={16} />
          {sidebarOpen && <span style={{ fontSize: 13 }}>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: P.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" }}>
      {!isMobile && (
        <aside style={{ width: desktopSidebarWidth, background: P.surface, borderRight: `1px solid ${P.border}`, display: "flex", flexDirection: "column", transition: "width .2s ease", flexShrink: 0, overflow: "hidden" }}>
          <SidebarBody />
        </aside>
      )}

      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#000000b8", zIndex: 1200 }} onClick={closeMobileMenu}>
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(84vw, 320px)",
              height: "100%",
              background: P.surface,
              borderRight: `1px solid ${P.border}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "18px 0 60px rgba(0,0,0,.35)",
            }}
          >
            <SidebarBody />
          </aside>
        </div>
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <header style={{ background: P.surface, borderBottom: `1px solid ${P.border}`, padding: isMobile ? "14px 16px" : "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button
                onClick={openMobileMenu}
                style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${P.border}`, background: P.card, color: P.text, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: P.text, fontWeight: 700, fontSize: isMobile ? 16 : 18, margin: 0, lineHeight: 1.2 }}>{SECTION_TITLES[active]}</h1>
              <div style={{ color: P.muted, fontSize: 11, marginTop: 4 }}>NEXUS TECNOLOGIA LTDA · CNPJ {COMPANY.cnpj}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
            {!isMobile && (
              <div style={{ color: P.muted, fontSize: 11, textAlign: "right" }}>
                <div>{COMPANY.developer}</div>
                <div>CNPJ {COMPANY.cnpj}</div>
              </div>
            )}
            <div style={{ background: "#064E3B", color: P.green, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>
              Plataforma Online
            </div>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, background: P.purple, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ color: P.text, fontSize: 13, fontWeight: 600 }}>Admin Master</div>
                  <div style={{ color: P.muted, fontSize: 11 }}>comercial@nexustecnologialtda.com.br</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* key={active} forces remount (and fresh data load) on tab change */}
        <div key={active} style={{ flex: 1, padding: isMobile ? 16 : 28, overflowY: "auto", overflowX: "hidden" }}>
          <SectionComponent />
        </div>
      </main>
    </div>
  );
}
