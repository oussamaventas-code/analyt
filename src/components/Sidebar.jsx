import { BarChart3, LayoutDashboard, Megaphone, ShoppingCart, Settings, TrendingUp, Menu, X, GitBranch, Calculator } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';

export default function Sidebar({ activePage, onPageChange, metaConnected, shopifyConnected }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, section: 'overview' },
    { id: 'campaigns', label: t('nav.campaigns'), icon: Megaphone, section: 'meta' },
    { id: 'shopify', label: t('nav.shopify'), icon: ShoppingCart, section: 'shopify' },
    { id: 'roas', label: t('nav.roas'), icon: TrendingUp, section: 'analytics' },
    { id: 'attribution', label: t('nav.attribution'), icon: GitBranch, section: 'analytics' },
    { id: 'calculator', label: t('nav.calculator'), icon: Calculator, section: 'tools' },
    { id: 'settings', label: t('nav.settings'), icon: Settings, section: 'config' },
  ];

  const handleNav = (id) => {
    onPageChange(id);
    setMobileOpen(false);
  };

  const renderSection = (sectionId, labelKey) => {
    const items = navItems.filter(n => n.section === sectionId);
    if (items.length === 0) return null;
    return (
      <>
        <div className="nav-section-label">{t(labelKey)}</div>
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <item.icon className="nav-item-icon" size={18} />
            {item.label}
          </button>
        ))}
      </>
    );
  };

  return (
    <>
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

        <nav className="sidebar-nav">
          {renderSection('overview', 'nav.general')}
          {renderSection('meta', 'nav.platforms')}
          {navItems.filter(n => n.section === 'shopify').length > 0 && (
            <>
              {navItems.filter(n => n.section === 'shopify').map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => handleNav(item.id)}
                >
                  <item.icon className="nav-item-icon" size={18} />
                  {item.label}
                </button>
              ))}
            </>
          )}
          {renderSection('analytics', 'nav.analytics')}
          {renderSection('tools', 'nav.tools')}
          {renderSection('config', 'nav.system')}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-status">
            <span className={`status-dot ${metaConnected ? 'connected' : 'disconnected'}`} />
            {metaConnected ? t('sidebar.metaConnected') : t('sidebar.metaDisconnected')}
          </div>
          <div className="connection-status">
            <span className={`status-dot ${shopifyConnected ? 'connected' : 'disconnected'}`} />
            {shopifyConnected ? t('sidebar.shopifyConnected') : t('sidebar.shopifyDisconnected')}
          </div>
        </div>
      </aside>
    </>
  );
}
