import { RefreshCw, Calendar } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard General', subtitle: 'Vista general de Meta Ads + Shopify' },
  campaigns: { title: 'Campañas Meta Ads', subtitle: 'Rendimiento de tus campañas publicitarias' },
  shopify: { title: 'Shopify Ventas', subtitle: 'Pedidos e ingresos de tu tienda' },
  roas: { title: 'ROAS Combinado', subtitle: 'Retorno de inversión publicitaria cruzado' },
  settings: { title: 'Configuración', subtitle: 'Conecta tus APIs de Meta y Shopify' },
};

export default function Header({ activePage, dateRange, onDateChange, onRefresh, loading }) {
  const pageInfo = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  return (
    <header className="main-header">
      <div className="header-left">
        <div>
          <h2>{pageInfo.title}</h2>
          <p>{pageInfo.subtitle}</p>
        </div>
      </div>

      {activePage !== 'settings' && (
        <div className="header-right">
          <div className="date-picker-group">
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="date-input"
              value={dateRange.since}
              onChange={(e) => onDateChange({ ...dateRange, since: e.target.value })}
            />
            <span className="date-separator">→</span>
            <input
              type="date"
              className="date-input"
              value={dateRange.until}
              onChange={(e) => onDateChange({ ...dateRange, until: e.target.value })}
            />
          </div>

          <button
            className={`btn-refresh ${loading ? 'loading' : ''}`}
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      )}
    </header>
  );
}
