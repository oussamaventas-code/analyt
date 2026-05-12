import KpiCard from '../components/KpiCard';
import { ShoppingCart, Banknote, CreditCard, Package } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
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

export default function ShopifyPage({ data, orders, loading }) {
  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Cargando datos de Shopify...</p></div>;
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <h3>Sin datos de Shopify</h3>
        <p>Configura tu API de Shopify para ver los datos de ventas.</p>
      </div>
    );
  }

  const { shopify, daily } = data;
  const displayOrders = orders || [];
  const shopifyDaily = daily ? daily.map(d => ({ date: d.date, revenue: d.revenue, orders: d.orders })) : [];

  return (
    <div className="animate-fade-in">
      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="Ingresos Totales" value={`€${parseFloat(shopify.totalRevenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`} icon={Banknote} color="green" />
        <KpiCard label="Total Pedidos" value={shopify.totalOrders} icon={ShoppingCart} color="blue" />
        <KpiCard label="Ticket Medio" value={`€${shopify.averageOrderValue}`} icon={CreditCard} color="purple" />
        <KpiCard label="Ingresos/Día" value={`€${(parseFloat(shopify.totalRevenue) / (daily?.length || 1)).toFixed(2)}`} icon={Package} color="orange" />
      </div>

      {/* Revenue Chart */}
      <div className="charts-grid full" style={{ marginBottom: 24 }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Ingresos Diarios Shopify</div>
              <div className="chart-card-subtitle">Evolución de ventas</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={shopifyDaily}>
              <defs>
                <linearGradient id="gradShopify" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Ingresos €" stroke="#10b981" fill="url(#gradShopify)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Últimos Pedidos</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado Pago</th>
                <th>Envío</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.name}</td>
                  <td>{o.customerName}</td>
                  <td style={{ fontWeight: 600 }}>€{parseFloat(o.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`status-badge ${o.financialStatus === 'paid' ? 'active' : o.financialStatus === 'pending' ? 'paused' : 'inactive'}`}>
                      {o.financialStatus === 'paid' ? 'Pagado' : o.financialStatus === 'pending' ? 'Pendiente' : o.financialStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${o.fulfillmentStatus === 'fulfilled' ? 'active' : 'paused'}`}>
                      {o.fulfillmentStatus === 'fulfilled' ? 'Enviado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(o.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
