import KpiCard from '../components/KpiCard';
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  ShoppingCart, Target, Percent, Banknote
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import AIInsights from '../components/AIInsights';
import { useTranslation } from '../i18n/useTranslation';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1f35',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '12px 16px',
      fontSize: 12,
    }}>
      <p style={{ color: '#8b93a7', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage({ data, campaignsData, loading }) {
  const { t, lang } = useTranslation();
  const locale = lang === 'es' ? 'es-ES' : 'en-US';

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>{t('header.loading')}</p></div>;
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3>{t('common.noData')}</h3>
        <p>{t('banner.configureApis')}</p>
      </div>
    );
  }

  const { meta, shopify, combined, daily } = data;

  return (
    <div className="animate-fade-in">
      <AIInsights dashboardData={data} campaignsData={campaignsData} />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard label={t('kpi.totalSpend')} value={`€${parseFloat(meta.totalSpend).toLocaleString(locale, { minimumFractionDigits: 2 })}`} icon={DollarSign} color="blue" />
        <KpiCard label={t('kpi.revenue')} value={`€${parseFloat(shopify.totalRevenue).toLocaleString(locale, { minimumFractionDigits: 2 })}`} icon={Banknote} color="green" />
        <KpiCard label={t('kpi.roas')} value={`${combined.roas}x`} icon={TrendingUp} color="purple" />
        <KpiCard label={t('kpi.profit')} value={`€${parseFloat(combined.profit).toLocaleString(locale, { minimumFractionDigits: 2 })}`} icon={Target} color={parseFloat(combined.profit) >= 0 ? 'green' : 'orange'} />
        <KpiCard label={t('kpi.impressions')} value={parseInt(meta.totalImpressions).toLocaleString(locale)} icon={Eye} color="blue" />
        <KpiCard label={t('kpi.clicks')} value={parseInt(meta.totalClicks).toLocaleString(locale)} icon={MousePointerClick} color="purple" />
        <KpiCard label={t('kpi.orders')} value={shopify.totalOrders} icon={ShoppingCart} color="green" />
        <KpiCard label={t('kpi.margin')} value={`${combined.profitMargin}%`} icon={Percent} color="orange" />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Revenue vs Spend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Ingresos vs Gasto</div>
              <div className="chart-card-subtitle">Comparativa diaria</div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Ingresos</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }} /> Gasto</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#10b981" fill="url(#gradRevenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="spend" name="Gasto" stroke="#3b82f6" fill="url(#gradSpend)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ROAS Daily */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">ROAS Diario</div>
              <div className="chart-card-subtitle">Return on Ad Spend</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roas" name="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders & Clicks */}
      <div className="charts-grid full">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Clics y Pedidos</div>
              <div className="chart-card-subtitle">Embudo de conversión diario</div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#06b6d4' }} /> Clics</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#ec4899' }} /> Pedidos</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="clicks" name="Clics" fill="#06b6d4" radius={[3, 3, 0, 0]} opacity={0.7} />
              <Bar yAxisId="right" dataKey="orders" name="Pedidos" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Métricas Meta Ads</div>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>CTR</td><td style={{ fontWeight: 600 }}>{meta.ctr}%</td></tr>
              <tr><td>CPC</td><td style={{ fontWeight: 600 }}>€{meta.cpc}</td></tr>
              <tr><td>CPM</td><td style={{ fontWeight: 600 }}>€{meta.cpm}</td></tr>
              <tr><td>Alcance</td><td style={{ fontWeight: 600 }}>{parseInt(meta.totalReach).toLocaleString('es-ES')}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Métricas Shopify</div>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>Total Pedidos</td><td style={{ fontWeight: 600 }}>{shopify.totalOrders}</td></tr>
              <tr><td>Ticket Medio</td><td style={{ fontWeight: 600 }}>€{shopify.averageOrderValue}</td></tr>
              <tr><td>CPA</td><td style={{ fontWeight: 600 }}>€{combined.cpa}</td></tr>
              <tr><td>Margen</td><td style={{ fontWeight: 600, color: parseFloat(combined.profitMargin) > 0 ? '#10b981' : '#ef4444' }}>{combined.profitMargin}%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
