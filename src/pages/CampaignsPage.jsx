import { useState } from 'react';
import { Eye, MousePointerClick, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';

export default function CampaignsPage({ campaigns, loading }) {
  const [filter, setFilter] = useState('all');

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Cargando campañas...</p></div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Megaphone size={32} /></div>
        <h3>Sin campañas</h3>
        <p>No se encontraron campañas. Verifica tu configuración de Meta API.</p>
      </div>
    );
  }

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter.toUpperCase());

  return (
    <div className="animate-fade-in">
      {/* Filter Tabs */}
      <div className="tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Todas ({campaigns.length})
        </button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
          Activas ({campaigns.filter(c => c.status === 'ACTIVE').length})
        </button>
        <button className={`tab ${filter === 'paused' ? 'active' : ''}`} onClick={() => setFilter('paused')}>
          Pausadas ({campaigns.filter(c => c.status === 'PAUSED').length})
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Campañas Meta Ads</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Estado</th>
                <th>Gasto</th>
                <th>Impresiones</th>
                <th>Clics</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Conv.</th>
                <th>ROAS</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 250 }}>{c.name}</td>
                  <td>
                    <span className={`status-badge ${c.status === 'ACTIVE' ? 'active' : c.status === 'PAUSED' ? 'paused' : 'inactive'}`}>
                      {c.status === 'ACTIVE' ? 'Activa' : c.status === 'PAUSED' ? 'Pausada' : c.status}
                    </span>
                  </td>
                  <td>€{parseFloat(c.spend).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td>{parseInt(c.impressions).toLocaleString('es-ES')}</td>
                  <td>{parseInt(c.clicks).toLocaleString('es-ES')}</td>
                  <td>{c.ctr}%</td>
                  <td>€{c.cpc}</td>
                  <td style={{ fontWeight: 600 }}>{c.conversions}</td>
                  <td style={{ fontWeight: 700, color: parseFloat(c.roas) >= 2 ? '#10b981' : parseFloat(c.roas) >= 1 ? '#f59e0b' : '#ef4444' }}>
                    {c.roas}x
                  </td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>€{parseFloat(c.revenue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ marginTop: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Gasto Total</span>
            <div className="kpi-card-icon blue"><DollarSign size={18} /></div>
          </div>
          <div className="kpi-card-value">€{filtered.reduce((s, c) => s + parseFloat(c.spend), 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Clics Totales</span>
            <div className="kpi-card-icon purple"><MousePointerClick size={18} /></div>
          </div>
          <div className="kpi-card-value">{filtered.reduce((s, c) => s + parseInt(c.clicks), 0).toLocaleString('es-ES')}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Conversiones</span>
            <div className="kpi-card-icon green"><ShoppingCart size={18} /></div>
          </div>
          <div className="kpi-card-value">{filtered.reduce((s, c) => s + parseInt(c.conversions), 0)}</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-card-header">
            <span className="kpi-card-label">ROAS Medio</span>
            <div className="kpi-card-icon orange"><TrendingUp size={18} /></div>
          </div>
          <div className="kpi-card-value">
            {(filtered.reduce((s, c) => s + parseFloat(c.roas), 0) / filtered.length).toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  );
}
