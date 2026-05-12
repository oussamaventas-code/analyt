import { useState, useEffect } from 'react';
import { Link2, TrendingUp, ShoppingCart, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import KpiCard from '../components/KpiCard';
import { getUTMAttribution } from '../api';
import { generateDemoAttribution } from '../demoData';

const SOURCE_COLORS = {
  facebook: '#3b82f6',
  instagram: '#ec4899',
  google: '#f59e0b',
  direct: '#6b7280',
  organic: '#10b981',
  email: '#8b5cf6',
  twitter: '#06b6d4',
};

function getSourceColor(source) {
  return SOURCE_COLORS[source?.toLowerCase()] || '#6b7280';
}

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 16px', fontSize: 12 }}>
      <p style={{ color: '#8b93a7', marginBottom: 4, fontWeight: 600 }}>{d.source}</p>
      <p style={{ color: '#10b981', fontWeight: 600 }}>€{parseFloat(d.revenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
      <p style={{ color: '#8b93a7' }}>{d.orders} pedidos</p>
    </div>
  );
};

export default function AttributionPage({ isDemo, dateRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setData(generateDemoAttribution());
      setLoading(false);
      return;
    }
    setLoading(true);
    getUTMAttribution(dateRange?.since, dateRange?.until)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setData(generateDemoAttribution());
        setLoading(false);
      });
  }, [isDemo, dateRange?.since, dateRange?.until]);

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Cargando atribución...</p></div>;
  }

  if (!data) return null;

  const { totalOrders, totalRevenue, attributedOrders, attributionRate, campaigns, sources } = data;
  const metaRevenue = sources
    .filter(s => ['facebook', 'instagram'].includes(s.source?.toLowerCase()))
    .reduce((s, r) => s + parseFloat(r.revenue), 0);
  const attrRateNum = parseFloat(attributionRate);

  return (
    <div className="animate-fade-in">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Pedidos con UTM"
          value={`${attributedOrders} / ${totalOrders}`}
          icon={Link2}
          color="blue"
        />
        <KpiCard
          label="Tasa Atribución"
          value={`${attributionRate}%`}
          icon={Percent}
          color={attrRateNum >= 60 ? 'green' : attrRateNum >= 30 ? 'orange' : 'red'}
        />
        <KpiCard
          label="Ingresos Meta (UTM)"
          value={`€${metaRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="purple"
        />
        <KpiCard
          label="Ingresos Totales"
          value={`€${parseFloat(totalRevenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          icon={ShoppingCart}
          color="green"
        />
      </div>

      {/* Charts row */}
      <div className="charts-grid">
        {/* Source breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Ingresos por Fuente</div>
              <div className="chart-card-subtitle">Atribución first-touch vía UTM</div>
            </div>
          </div>
          {sources.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">🔗</div>
              <p>Sin datos de atribución. Configura UTMs en tus anuncios.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sources} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `€${v.toFixed(0)}`}
                />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={72} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {sources.map((s, i) => (
                    <Cell key={i} fill={getSourceColor(s.source)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Setup tips */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Configurar UTM en Meta Ads</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {attrRateNum < 50 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
              }}>
                <strong style={{ color: '#f59e0b' }}>⚠️ Tasa de atribución baja ({attributionRate}%)</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  Añade parámetros UTM a tus anuncios para atribuir pedidos a campañas concretas.
                </p>
              </div>
            )}
            {attrRateNum >= 50 && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
              }}>
                <strong style={{ color: '#10b981' }}>✅ Buena tasa de atribución ({attributionRate}%)</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  La mayoría de tus pedidos están atribuidos correctamente.
                </p>
              </div>
            )}
            <p style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
              Añade esto al URL de destino de tus anuncios:
            </p>
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: 11,
              marginBottom: 16,
              wordBreak: 'break-all',
              lineHeight: 1.9,
              color: '#10b981',
            }}>
              ?utm_source=facebook<br />
              &amp;utm_medium=cpc<br />
              &amp;utm_campaign=&#123;&#123;campaign.name&#125;&#125;<br />
              &amp;utm_content=&#123;&#123;ad.name&#125;&#125;
            </div>
            <ol style={{ paddingLeft: 20, fontSize: 12, lineHeight: 2.2, margin: 0 }}>
              <li>Meta Ads Manager → Editar anuncio</li>
              <li>En <em>URL del sitio web</em> añade los parámetros</li>
              <li>
                <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4 }}>
                  {'{{campaign.name}}'}
                </code>{' '}se rellena automáticamente
              </li>
              <li>Nuevos pedidos quedarán atribuidos a cada campaña</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Campaign Attribution Table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Atribución por Campaña</div>
            <div className="chart-card-subtitle">Pedidos e ingresos agrupados por utm_campaign</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Campaña UTM</th>
                <th>Fuente</th>
                <th>Medio</th>
                <th style={{ textAlign: 'right' }}>Pedidos</th>
                <th style={{ textAlign: 'right' }}>Ingresos</th>
                <th style={{ textAlign: 'right' }}>Ticket Medio</th>
                <th style={{ textAlign: 'right' }}>% del Total</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const pct = totalRevenue > 0
                  ? ((parseFloat(c.revenue) / parseFloat(totalRevenue)) * 100).toFixed(1)
                  : '0';
                const isDirect = c.campaign === '(directo / sin UTM)';
                return (
                  <tr key={i}>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        color: isDirect ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontStyle: isDirect ? 'italic' : 'normal',
                        fontSize: 13,
                      }}>
                        {c.campaign}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: `${getSourceColor(c.source)}22`,
                        color: getSourceColor(c.source),
                        padding: '2px 10px',
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {c.source}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.medium}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      €{parseFloat(c.revenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>€{c.aov}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{
                          width: 60,
                          height: 4,
                          background: 'var(--bg-input)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: getSourceColor(c.source),
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isDemo && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            🎭 Datos de demo — Conecta Shopify para ver la atribución real de tus pedidos
          </div>
        )}
      </div>
    </div>
  );
}
