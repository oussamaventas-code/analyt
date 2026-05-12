import { BarChart3, LayoutDashboard, Megaphone, ShoppingCart, Settings, TrendingUp, Menu, X, GitBranch } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'overview' },
  { id: 'campaigns', label: 'Campañas Meta', icon: Megaphone, section: 'meta' },
  { id: 'shopify', label: 'Shopify Ventas', icon: ShoppingCart, section: 'shopify' },
  { id: 'roas', label: 'ROAS Combinado', icon: TrendingUp, section: 'analytics' },
  { id: 'attribution', label: 'Atribución UTM', icon: GitBranch, section: 'analytics' },
  { id: 'settings', label: 'Configuración', icon: Settings, section: 'config' },
];

export default function Sidebar({ activePage, onPageChange, metaConnected, shopifyConnected }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id) => {
    onPageChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 200,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: 8,
          color: 'var(--text-primary)',
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <BarChart3 size={20} />
            </div>
            <div className="sidebar-logo-text">
              <h1>MetaShop</h1>
              <span>Analytics</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">General</div>
          {navItems.filter(n => n.section === 'overview').map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon className="nav-item-icon" size={18} />
              {item.label}
            </button>
          ))}

          <div className="nav-section-label">Plataformas</div>
          {navItems.filter(n => n.section === 'meta' || n.section === 'shopify').map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon className="nav-item-icon" size={18} />
              {item.label}
            </button>
          ))}

          <div className="nav-section-label">Analytics</div>
          {navItems.filter(n => n.section === 'analytics').map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon className="nav-item-icon" size={18} />
              {item.label}
            </button>
          ))}

          <div className="nav-section-label">Sistema</div>
          {navItems.filter(n => n.section === 'config').map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <item.icon className="nav-item-icon" size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer - Connection Status */}
        <div className="sidebar-footer">
          <div className="connection-status">
            <span className={`status-dot ${metaConnected ? 'connected' : 'disconnected'}`} />
            Meta Ads {metaConnected ? 'Conectado' : 'Sin configurar'}
          </div>
          <div className="connection-status">
            <span className={`status-dot ${shopifyConnected ? 'connected' : 'disconnected'}`} />
            Shopify {shopifyConnected ? 'Conectado' : 'Sin configurar'}
          </div>
        </div>
      </aside>
    </>
  );
}
