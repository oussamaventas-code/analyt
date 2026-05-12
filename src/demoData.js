/**
 * Demo data generator for MetaShop Analytics
 * Used when APIs are not configured to show the dashboard capabilities
 */

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function generateDailyData(days = 30) {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const spend = randomBetween(15, 120);
    const impressions = Math.floor(randomBetween(1500, 15000));
    const clicks = Math.floor(impressions * randomBetween(0.01, 0.06));
    const orders = Math.floor(randomBetween(1, 12));
    const revenue = orders * randomBetween(25, 85);
    
    data.push({
      date: dateStr,
      spend: parseFloat(spend.toFixed(2)),
      impressions,
      clicks,
      orders,
      revenue: parseFloat(revenue.toFixed(2)),
      roas: spend > 0 ? (revenue / spend).toFixed(2) : '0'
    });
  }
  return data;
}

export function generateDemoData() {
  const daily = generateDailyData(30);
  
  const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = daily.reduce((s, d) => s + d.clicks, 0);
  const totalReach = Math.floor(totalImpressions * 0.65);
  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = daily.reduce((s, d) => s + d.orders, 0);
  
  return {
    period: {
      since: daily[0].date,
      until: daily[daily.length - 1].date
    },
    meta: {
      totalSpend: totalSpend.toFixed(2),
      totalImpressions,
      totalClicks,
      totalReach,
      ctr: ((totalClicks / totalImpressions) * 100).toFixed(2),
      cpc: (totalSpend / totalClicks).toFixed(2),
      cpm: ((totalSpend / totalImpressions) * 1000).toFixed(2)
    },
    shopify: {
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      averageOrderValue: (totalRevenue / totalOrders).toFixed(2)
    },
    combined: {
      roas: (totalRevenue / totalSpend).toFixed(2),
      cpa: (totalSpend / totalOrders).toFixed(2),
      profitMargin: (((totalRevenue - totalSpend) / totalRevenue) * 100).toFixed(2),
      profit: (totalRevenue - totalSpend).toFixed(2)
    },
    daily
  };
}

export function generateDemoCampaigns() {
  const campaigns = [
    { id: '1', name: 'Campaña Conversiones - Mayo', status: 'ACTIVE', objective: 'OUTCOME_SALES' },
    { id: '2', name: 'Remarketing - Carrito Abandonado', status: 'ACTIVE', objective: 'OUTCOME_SALES' },
    { id: '3', name: 'Prospección Lookalike 1%', status: 'ACTIVE', objective: 'OUTCOME_TRAFFIC' },
    { id: '4', name: 'Brand Awareness - Spring', status: 'PAUSED', objective: 'OUTCOME_AWARENESS' },
    { id: '5', name: 'DPA - Catálogo Productos', status: 'ACTIVE', objective: 'OUTCOME_SALES' },
    { id: '6', name: 'Campaña Abril - Cierre', status: 'PAUSED', objective: 'OUTCOME_SALES' },
  ];

  return campaigns.map(c => ({
    ...c,
    spend: randomBetween(50, 600).toFixed(2),
    impressions: Math.floor(randomBetween(5000, 80000)),
    clicks: Math.floor(randomBetween(100, 3000)),
    ctr: randomBetween(0.8, 5.5).toFixed(2),
    cpc: randomBetween(0.1, 1.5).toFixed(2),
    conversions: Math.floor(randomBetween(3, 50)),
    roas: randomBetween(1.2, 6.5).toFixed(2),
    revenue: randomBetween(200, 3000).toFixed(2)
  }));
}

export function generateDemoAttribution() {
  const campaigns = [
    { campaign: 'campana-conversiones-mayo', source: 'facebook', medium: 'cpc', orders: 18, revenue: 1240.50 },
    { campaign: 'remarketing-carrito-abandonado', source: 'facebook', medium: 'cpc', orders: 12, revenue: 820.30 },
    { campaign: 'prospeccion-lookalike-1pct', source: 'instagram', medium: 'cpc', orders: 8, revenue: 560.00 },
    { campaign: 'brand-awareness-spring', source: 'facebook', medium: 'cpm', orders: 5, revenue: 380.00 },
    { campaign: null, source: 'google', medium: 'organic', orders: 7, revenue: 490.00 },
    { campaign: null, source: null, medium: null, orders: 15, revenue: 950.00 },
  ];

  const sourceMap = {};
  campaigns.forEach(c => {
    const src = c.source || 'direct';
    if (!sourceMap[src]) sourceMap[src] = { source: src, orders: 0, revenue: 0 };
    sourceMap[src].orders += c.orders;
    sourceMap[src].revenue += c.revenue;
  });

  const totalOrders = campaigns.reduce((s, c) => s + c.orders, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const attributedOrders = campaigns.filter(c => c.campaign).reduce((s, c) => s + c.orders, 0);

  return {
    totalOrders,
    totalRevenue: totalRevenue.toFixed(2),
    attributedOrders,
    attributionRate: ((attributedOrders / totalOrders) * 100).toFixed(1),
    campaigns: campaigns.map(c => ({
      campaign: c.campaign || '(directo / sin UTM)',
      source: c.source || 'direct',
      medium: c.medium || '(none)',
      orders: c.orders,
      revenue: c.revenue.toFixed(2),
      aov: (c.revenue / c.orders).toFixed(2),
    })),
    sources: Object.values(sourceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map(s => ({ ...s, revenue: s.revenue.toFixed(2) })),
    orders: [],
  };
}

export function generateDemoShopifyOrders() {
  const statuses = ['paid', 'paid', 'paid', 'pending', 'refunded'];
  const names = ['María G.', 'Carlos R.', 'Ana P.', 'Pedro M.', 'Laura S.', 'Juan D.', 'Elena V.', 'Miguel A.', 'Sofia T.', 'Diego L.'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: 1000 + i,
    name: `#${1050 + i}`,
    total: randomBetween(25, 180).toFixed(2),
    currency: 'EUR',
    createdAt: new Date(Date.now() - i * 86400000 * randomBetween(0.5, 2)).toISOString(),
    financialStatus: statuses[Math.floor(Math.random() * statuses.length)],
    fulfillmentStatus: Math.random() > 0.3 ? 'fulfilled' : 'unfulfilled',
    customerName: names[i]
  }));
}
