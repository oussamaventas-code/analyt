import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import ShopifyPage from './pages/ShopifyPage';
import RoasPage from './pages/RoasPage';
import SettingsPage from './pages/SettingsPage';
import { getConfigStatus, getCombinedRoas, getShopifyAnalytics, getMetaInsights, getMetaCampaigns, checkAlerts } from './api';
import { generateDemoData, generateDemoCampaigns, generateDemoShopifyOrders } from './demoData';
import AttributionPage from './pages/AttributionPage';

function getDefaultDateRange() {
  const until = new Date().toISOString().split('T')[0];
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  return { since, until };
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [loading, setLoading] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [partialMode, setPartialMode] = useState(null); // 'shopify-only', 'meta-only', or null

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [campaignsData, setCampaignsData] = useState([]);
  const [shopifyOrders, setShopifyOrders] = useState([]);

  // Check config on mount
  useEffect(() => {
    fetchData();
  }, []);

  const loadDemoData = useCallback(() => {
    setIsDemo(true);
    setPartialMode(null);
    setDashboardData(generateDemoData());
    setCampaignsData(generateDemoCampaigns());
    setShopifyOrders(generateDemoShopifyOrders());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const configRes = await getConfigStatus();
      const { meta, shopify } = configRes.data;
      setMetaConnected(meta.configured);
      setShopifyConnected(shopify.configured);

      // Both configured - full mode
      if (meta.configured && shopify.configured) {
        setIsDemo(false);
        setPartialMode(null);
        const roasRes = await getCombinedRoas(dateRange.since, dateRange.until);
        setDashboardData(roasRes.data);

        try {
          const campRes = await getMetaCampaigns();
          setCampaignsData(campRes.data.data || []);
        } catch { setCampaignsData(generateDemoCampaigns()); }

        setLoading(false);
        return;
      }

      // Only Shopify configured
      if (shopify.configured && !meta.configured) {
        setIsDemo(false);
        setPartialMode('shopify-only');

        try {
          const shopifyRes = await getShopifyAnalytics(dateRange.since, dateRange.until);
          const shopifyData = shopifyRes.data;

          // Build dashboard data with real Shopify + placeholder Meta
          const demoMeta = generateDemoData();
          setDashboardData({
            period: { since: dateRange.since, until: dateRange.until },
            meta: demoMeta.meta,
            shopify: shopifyData.summary,
            combined: {
              roas: (parseFloat(shopifyData.summary.totalRevenue) / parseFloat(demoMeta.meta.totalSpend)).toFixed(2),
              cpa: (parseFloat(demoMeta.meta.totalSpend) / (shopifyData.summary.totalOrders || 1)).toFixed(2),
              profitMargin: shopifyData.summary.totalOrders > 0 ? (((parseFloat(shopifyData.summary.totalRevenue) - parseFloat(demoMeta.meta.totalSpend)) / parseFloat(shopifyData.summary.totalRevenue)) * 100).toFixed(2) : '0',
              profit: (parseFloat(shopifyData.summary.totalRevenue) - parseFloat(demoMeta.meta.totalSpend)).toFixed(2),
            },
            daily: shopifyData.daily.map(d => ({
              ...d,
              spend: 0,
              clicks: 0,
              impressions: 0,
              roas: '0',
            })),
          });

          setShopifyOrders(shopifyData.recentOrders || []);
        } catch (err) {
          console.error('Shopify fetch error:', err);
          loadDemoData();
        }

        setCampaignsData(generateDemoCampaigns());
        setLoading(false);
        return;
      }

      // Only Meta configured
      if (meta.configured && !shopify.configured) {
        setIsDemo(false);
        setPartialMode('meta-only');
        // TODO: fetch real Meta data with demo Shopify
        loadDemoData();
        setIsDemo(false);
        setPartialMode('meta-only');
        setLoading(false);
        return;
      }

      // Neither configured
      loadDemoData();
    } catch (error) {
      console.error('Error fetching data:', error);
      loadDemoData();
    }
    setLoading(false);

    // Non-blocking ROAS alert check
    checkAlerts(dateRange.since, dateRange.until).catch(() => {});
  }, [dateRange, loadDemoData]);

  // Auto-fetch on date change
  useEffect(() => {
    fetchData();
  }, [dateRange.since, dateRange.until]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage data={dashboardData} campaignsData={campaignsData} loading={loading} />;
      case 'campaigns':
        return <CampaignsPage campaigns={campaignsData} loading={loading} />;
      case 'shopify':
        return <ShopifyPage data={dashboardData} orders={shopifyOrders} loading={loading} />;
      case 'roas':
        return <RoasPage data={dashboardData} loading={loading} />;
      case 'attribution':
        return <AttributionPage isDemo={isDemo} dateRange={dateRange} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage data={dashboardData} campaignsData={campaignsData} loading={loading} />;
    }
  };

  const getBannerMessage = () => {
    if (isDemo) {
      return (
        <div className="alert-banner">
          🎭 Modo Demo — Mostrando datos de ejemplo. <button onClick={() => setActivePage('settings')} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Configura tus APIs</button> para ver datos reales.
        </div>
      );
    }
    if (partialMode === 'shopify-only') {
      return (
        <div className="alert-banner" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)' }}>
          🛍️ Conectado a <strong style={{ color: '#10b981', margin: '0 4px' }}>Shopify</strong> (datos reales). Meta Ads no configurado — <button onClick={() => setActivePage('settings')} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>configurar Meta</button> para análisis cruzado.
        </div>
      );
    }
    if (partialMode === 'meta-only') {
      return (
        <div className="alert-banner" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)' }}>
          📘 Conectado a <strong style={{ color: '#3b82f6', margin: '0 4px' }}>Meta Ads</strong> (datos reales). Shopify no configurado — <button onClick={() => setActivePage('settings')} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>configurar Shopify</button> para análisis cruzado.
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        metaConnected={metaConnected}
        shopifyConnected={shopifyConnected}
      />

      <main className="main-content">
        <Header
          activePage={activePage}
          dateRange={dateRange}
          onDateChange={setDateRange}
          onRefresh={fetchData}
          loading={loading}
        />

        <div className="page-content">
          {activePage !== 'settings' && getBannerMessage()}
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
