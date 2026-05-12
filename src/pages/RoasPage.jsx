import KpiCard from '../components/KpiCard';
import { TrendingUp, Target, Percent, DollarSign } from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area
} from 'recharts';

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

export default function RoasPage({ data, loading }) {
  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Calculando ROAS...</p></div>;
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📈</div>
        <h3>Sin datos cruzados</h3>
        <p>Conecta Meta Ads y Shopify para ver el ROAS combinado.</p>
      </div>
    );
  }

  const { combined, daily } = data;

  return (
    <div className="animate-fade-in">
      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="ROAS" value={`${combined.roas}x`} icon={TrendingUp} color="purple" />
        <KpiCard label="CPA" value={`€${combined.cpa}`} icon={Target} color="blue" />
        <KpiCard label="Beneficio Neto" value={`€${parseFloat(combined.profit).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`} icon={DollarSign} color={parseFloat(combined.profit) >= 0 ? 'green' : 'orange'} />
        <KpiCard label="Margen de Beneficio" value={`${combined.profitMargin}%`} icon={Percent} color="orange" />
      </div>

      {/* Combined Chart */}
      <div className="charts-grid full">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Análisis ROAS Combinado</div>
              <div className="chart-card-subtitle">Ingresos Shopify vs Gasto Meta Ads con línea de ROAS</div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} /> Ingresos</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }} /> Gasto</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} /> ROAS</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={daily}>
              <defs>
                <linearGradient id="gradRev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis yAxisId="money" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="money" type="monotone" dataKey="revenue" name="Ingresos €" stroke="#10b981" fill="url(#gradRev2)" strokeWidth={2} />
              <Bar yAxisId="money" dataKey="spend" name="Gasto €" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.6} />
              <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interpretation Card */}
      <div className="charts-grid" style={{ marginTop: 0 }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">💡 Interpretación</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {parseFloat(combined.roas) >= 3 && (
              <p>✅ <strong style={{ color: '#10b981' }}>Excelente rendimiento.</strong> Tu ROAS de {combined.roas}x indica que por cada €1 invertido generas €{combined.roas} en ingresos. Tu campaña es muy rentable.</p>
            )}
            {parseFloat(combined.roas) >= 2 && parseFloat(combined.roas) < 3 && (
              <p>👍 <strong style={{ color: '#f59e0b' }}>Buen rendimiento.</strong> Tu ROAS de {combined.roas}x es positivo. Considera optimizar los ad sets con menor rendimiento para mejorar.</p>
            )}
            {parseFloat(combined.roas) >= 1 && parseFloat(combined.roas) < 2 && (
              <p>⚠️ <strong style={{ color: '#f59e0b' }}>Rendimiento marginal.</strong> Tu ROAS de {combined.roas}x cubre costes, pero el margen es bajo. Revisa tu segmentación y creativos.</p>
            )}
            {parseFloat(combined.roas) < 1 && (
              <p>🔴 <strong style={{ color: '#ef4444' }}>Rendimiento negativo.</strong> Tu ROAS de {combined.roas}x indica pérdidas. Necesitas revisar urgentemente tu estrategia de campañas.</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">📊 Resumen de Periodo</div>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>Inversión Total</td><td style={{ fontWeight: 600 }}>€{parseFloat(data.meta.totalSpend).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
              <tr><td>Ingresos Shopify</td><td style={{ fontWeight: 600, color: '#10b981' }}>€{parseFloat(data.shopify.totalRevenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
              <tr><td>Beneficio Neto</td><td style={{ fontWeight: 700, color: parseFloat(combined.profit) >= 0 ? '#10b981' : '#ef4444' }}>€{parseFloat(combined.profit).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
              <tr><td>Coste por Adquisición</td><td style={{ fontWeight: 600 }}>€{combined.cpa}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
