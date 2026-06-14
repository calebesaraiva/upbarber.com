import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Calendar, Scissors,
  CreditCard, Download, RefreshCw, FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { reportsService } from '../../services/reports.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const COLORS = ['#D4AF37', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

const PERIOD_OPTIONS = [
  { value: 'daily',    label: 'Hoje' },
  { value: 'weekly',  label: 'Esta semana' },
  { value: 'monthly', label: 'Este mês' },
  { value: 'biweekly',label: 'Últimos 14 dias' },
];

function Stat({ label, value, sub, icon: Icon, color = 'text-gold' }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color} flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-black text-white mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportsService.getReport(period);
      setData(res.data?.data ?? res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const exportCsv = async () => {
    const r = await reportsService.exportCsv({});
    const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'relatorio-upbarber.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const r = await reportsService.exportPdf({ period });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `relatorio-${period}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  };

  const revenue = data?.revenue;
  const appointments = data?.appointments;
  const clients = data?.clients;
  const services = data?.services || [];
  const barbers = data?.barbers || [];
  const pmMap = data?.paymentMethods || {};

  const pmData = Object.entries(pmMap).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        subtitle="Dados reais calculados a partir das suas operações"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary py-2 px-3 text-xs" onClick={exportCsv}><Download size={13} /> CSV</button>
            <button className="btn-secondary py-2 px-3 text-xs" onClick={exportPdf} disabled={exportingPdf}>
              <FileText size={13} /> {exportingPdf ? 'Gerando...' : 'PDF'}
            </button>
            <button className="btn-secondary py-2 px-3 text-xs" onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        }
      />

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === opt.value ? 'bg-gold text-dark' : 'bg-dark-300 border border-dark-500 text-gray-400 hover:text-white'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-500 text-sm">Carregando dados...</div>
      ) : !data ? (
        <div className="card text-center py-12 text-gray-500 text-sm">Sem dados para o período selecionado.</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={TrendingUp} label="Receita" value={money(revenue?.totalIncome)} sub={`Despesas: ${money(revenue?.totalExpense)}`} color="text-emerald-400" />
            <Stat icon={TrendingDown} label="Lucro" value={money(data.profit)} color={data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <Stat icon={Calendar} label="Agendamentos" value={appointments?.total ?? 0} sub={`${appointments?.completed ?? 0} concluídos · ${appointments?.cancelled ?? 0} cancelados`} color="text-blue-400" />
            <Stat icon={Users} label="Clientes" value={clients?.active ?? 0} sub={`${clients?.new ?? 0} novos no período`} color="text-purple-400" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top Services */}
            {services.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Scissors size={16} className="text-gold" />
                  <h3 className="section-title">Top serviços</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={services.slice(0, 6)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                      formatter={(v, n) => [n === 'count' ? `${v} atend.` : money(v), n === 'count' ? 'Atendimentos' : 'Receita']}
                    />
                    <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payment methods */}
            {pmData.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={16} className="text-gold" />
                  <h3 className="section-title">Formas de pagamento</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pmData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pmData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Barbers performance */}
          {barbers.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Scissors size={16} className="text-gold" />
                <h3 className="section-title">Desempenho por barbeiro</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Barbeiro', 'Atendimentos', 'Receita'].map(h => (
                        <th key={h} className="table-header text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.map((b, i) => (
                      <tr key={i} className="border-t border-dark-400">
                        <td className="table-cell font-medium text-white">{b.name}</td>
                        <td className="table-cell">{b.count}</td>
                        <td className="table-cell text-emerald-400 font-semibold">{money(b.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
