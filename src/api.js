import axios from 'axios';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Config
export const getConfigStatus = () => api.get('/config/status');

// Meta Ads
export const getMetaAccount = () => api.get('/meta/account');
export const getMetaCampaigns = () => api.get('/meta/campaigns');
export const getMetaInsights = (since, until) =>
  api.get('/meta/insights', { params: { since, until } });
export const getCampaignInsights = (campaignId, since, until) =>
  api.get(`/meta/campaigns/${campaignId}/insights`, { params: { since, until } });
export const getMetaAdSets = (campaignId) =>
  api.get('/meta/adsets', { params: { campaign_id: campaignId } });

// Shopify
export const getShopifyOrders = (since, until) =>
  api.get('/shopify/orders', { params: { since, until } });
export const getShopifyOrderCount = (since, until) =>
  api.get('/shopify/orders/count', { params: { since, until } });
export const getShopifyProducts = () => api.get('/shopify/products');
export const getShopifyAnalytics = (since, until) =>
  api.get('/shopify/analytics', { params: { since, until } });

// Combined
export const getCombinedRoas = (since, until) =>
  api.get('/combined/roas', { params: { since, until } });

// Telegram Alerts
export const getAlertConfig = () => api.get('/alerts/config');
export const saveAlertConfig = (config) => api.post('/alerts/config', config);
export const testTelegram = () => api.post('/alerts/telegram/test');
export const checkAlerts = (since, until) => api.post('/alerts/check', { since, until });

// UTM Attribution
export const getUTMAttribution = (since, until) =>
  api.get('/attribution/utm', { params: { since, until } });

export default api;
