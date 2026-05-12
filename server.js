import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Runtime override for Shopify token (set via OAuth without restart)
let runtimeShopifyToken = null;

app.use(cors());
app.use(express.json());

// =============================================
// Health Check
// =============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================
// Config Status - Check if APIs are configured
// =============================================
app.get('/api/config/status', (req, res) => {
  res.json({
    meta: {
      configured: !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
      adAccountId: process.env.META_AD_ACCOUNT_ID ? `act_${process.env.META_AD_ACCOUNT_ID}` : null,
    },
    shopify: {
      configured: isShopifyConfigured(),
      storeUrl: process.env.SHOPIFY_STORE_URL || null,
    }
  });
});

// =============================================
// META ADS API ROUTES
// =============================================
const META_BASE_URL = 'https://graph.facebook.com/v21.0';

// Helper to build Meta API URL
function metaUrl(path, params = {}) {
  const token = process.env.META_ACCESS_TOKEN;
  const searchParams = new URLSearchParams({ access_token: token, ...params });
  return `${META_BASE_URL}/${path}?${searchParams.toString()}`;
}

// GET /api/meta/account - Get Ad Account info
app.get('/api/meta/account', async (req, res) => {
  try {
    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    const url = metaUrl(accountId, {
      fields: 'name,account_id,account_status,currency,timezone_name,balance,amount_spent'
    });
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Meta Account Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching Meta account',
      details: error.response?.data?.error || error.message
    });
  }
});

// GET /api/meta/campaigns - List campaigns
app.get('/api/meta/campaigns', async (req, res) => {
  try {
    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    const url = metaUrl(`${accountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,created_time,start_time,stop_time',
      limit: 100
    });
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Meta Campaigns Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching campaigns',
      details: error.response?.data?.error || error.message
    });
  }
});

// GET /api/meta/insights - Get account-level insights
app.get('/api/meta/insights', async (req, res) => {
  try {
    const { since, until, time_increment } = req.query;
    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    
    const params = {
      fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type,conversions,conversion_values,date_start,date_stop',
      time_range: JSON.stringify({ since: since || getDefaultSince(), until: until || getToday() }),
      time_increment: time_increment || 1,
      limit: 500
    };
    
    const url = metaUrl(`${accountId}/insights`, params);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Meta Insights Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching insights',
      details: error.response?.data?.error || error.message
    });
  }
});

// GET /api/meta/campaigns/:id/insights - Campaign-level insights
app.get('/api/meta/campaigns/:id/insights', async (req, res) => {
  try {
    const { since, until, time_increment } = req.query;
    
    const params = {
      fields: 'campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type,conversions,conversion_values,date_start,date_stop',
      time_range: JSON.stringify({ since: since || getDefaultSince(), until: until || getToday() }),
      time_increment: time_increment || 1,
      limit: 500
    };
    
    const url = metaUrl(`${req.params.id}/insights`, params);
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Campaign Insights Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching campaign insights',
      details: error.response?.data?.error || error.message
    });
  }
});

// GET /api/meta/adsets - List ad sets
app.get('/api/meta/adsets', async (req, res) => {
  try {
    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    const { campaign_id } = req.query;
    
    const endpoint = campaign_id 
      ? `${campaign_id}/adsets`
      : `${accountId}/adsets`;
    
    const url = metaUrl(endpoint, {
      fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event',
      limit: 100
    });
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Meta AdSets Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching ad sets',
      details: error.response?.data?.error || error.message
    });
  }
});

// =============================================
// SHOPIFY OAUTH
// =============================================
const oauthStates = new Set();

app.get('/auth/shopify', (req, res) => {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const store = process.env.SHOPIFY_STORE_URL;
  if (!apiKey || !store) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0a0e1a;color:#fff">
        <h2>⚠️ Faltan credenciales</h2>
        <p>Añade <code>SHOPIFY_API_KEY</code> y <code>SHOPIFY_STORE_URL</code> al archivo <code>.env</code> y reinicia el servidor.</p>
      </body></html>
    `);
  }
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.add(state);
  const scopes = 'read_orders,read_products,read_customers,read_analytics';
  const redirectUri = `http://localhost:${PORT}/auth/shopify/callback`;
  const authUrl = `https://${store}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/shopify/callback', async (req, res) => {
  const { code, state, hmac, shop } = req.query;
  if (!oauthStates.has(state)) {
    return res.status(403).send('<html><body style="font-family:sans-serif;padding:40px;background:#0a0e1a;color:#fff"><h2>❌ Estado OAuth inválido</h2></body></html>');
  }
  oauthStates.delete(state);
  try {
    const store = process.env.SHOPIFY_STORE_URL;
    const response = await axios.post(`https://${store}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });
    const token = response.data.access_token;
    runtimeShopifyToken = token;

    // Persist to .env file (solo en local, Vercel tiene filesystem de solo lectura)
    if (!process.env.VERCEL) {
      try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('SHOPIFY_ACCESS_TOKEN=')) {
          envContent = envContent.replace(/SHOPIFY_ACCESS_TOKEN=.*/g, `SHOPIFY_ACCESS_TOKEN=${token}`);
        } else {
          envContent += `\nSHOPIFY_ACCESS_TOKEN=${token}`;
        }
        fs.writeFileSync(envPath, envContent);
      } catch (e) {
        console.warn('No se pudo guardar el token en .env:', e.message);
      }
    }

    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0a0e1a;color:#fff;text-align:center">
        <div style="max-width:500px;margin:60px auto;background:#1a1f35;padding:40px;border-radius:16px;border:1px solid rgba(16,185,129,0.3)">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#10b981;margin-bottom:8px">Shopify conectado</h2>
          <p style="color:#8b93a7;margin-bottom:24px">Token guardado correctamente. Ya puedes cerrar esta ventana.</p>
          <a href="http://localhost:5173" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Volver al Dashboard →
          </a>
        </div>
      </body></html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0a0e1a;color:#fff">
        <h2>❌ Error al obtener el token</h2>
        <pre style="background:#1a1f35;padding:16px;border-radius:8px;color:#ef4444">${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
        <p>Comprueba que <code>SHOPIFY_API_SECRET</code> está correcto en el .env</p>
      </body></html>
    `);
  }
});

// GET /api/auth/shopify/status
app.get('/api/auth/shopify/status', (req, res) => {
  res.json({ connected: isShopifyConfigured(), hasRuntimeToken: !!runtimeShopifyToken });
});

// =============================================
// SHOPIFY API ROUTES
// =============================================

function shopifyHeaders() {
  return {
    'X-Shopify-Access-Token': runtimeShopifyToken || process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };
}

function isShopifyConfigured() {
  return !!((runtimeShopifyToken || process.env.SHOPIFY_ACCESS_TOKEN) && process.env.SHOPIFY_STORE_URL);
}

function shopifyUrl(path) {
  const store = process.env.SHOPIFY_STORE_URL;
  return `https://${store}/admin/api/2024-01/${path}`;
}

// GET /api/shopify/orders - Get orders
app.get('/api/shopify/orders', async (req, res) => {
  try {
    const { since, until, limit } = req.query;
    const params = new URLSearchParams({
      status: 'any',
      limit: limit || 250,
    });
    
    if (since) params.set('created_at_min', new Date(since).toISOString());
    if (until) params.set('created_at_max', new Date(until + 'T23:59:59').toISOString());
    
    const url = `${shopifyUrl('orders.json')}?${params.toString()}`;
    const response = await axios.get(url, { headers: shopifyHeaders() });
    res.json(response.data);
  } catch (error) {
    console.error('Shopify Orders Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching Shopify orders',
      details: error.response?.data?.errors || error.message
    });
  }
});

// GET /api/shopify/orders/count - Get order count
app.get('/api/shopify/orders/count', async (req, res) => {
  try {
    const { since, until } = req.query;
    const params = new URLSearchParams({ status: 'any' });
    
    if (since) params.set('created_at_min', new Date(since).toISOString());
    if (until) params.set('created_at_max', new Date(until + 'T23:59:59').toISOString());
    
    const url = `${shopifyUrl('orders/count.json')}?${params.toString()}`;
    const response = await axios.get(url, { headers: shopifyHeaders() });
    res.json(response.data);
  } catch (error) {
    console.error('Shopify Count Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching order count',
      details: error.response?.data?.errors || error.message
    });
  }
});

// GET /api/shopify/products - Get products
app.get('/api/shopify/products', async (req, res) => {
  try {
    const url = `${shopifyUrl('products.json')}?limit=250`;
    const response = await axios.get(url, { headers: shopifyHeaders() });
    res.json(response.data);
  } catch (error) {
    console.error('Shopify Products Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching products',
      details: error.response?.data?.errors || error.message
    });
  }
});

// GET /api/shopify/analytics - Aggregated analytics
app.get('/api/shopify/analytics', async (req, res) => {
  try {
    const { since, until } = req.query;
    const params = new URLSearchParams({
      status: 'any',
      limit: 250,
      financial_status: 'paid'
    });
    
    if (since) params.set('created_at_min', new Date(since).toISOString());
    if (until) params.set('created_at_max', new Date(until + 'T23:59:59').toISOString());
    
    const url = `${shopifyUrl('orders.json')}?${params.toString()}`;
    const response = await axios.get(url, { headers: shopifyHeaders() });
    
    const orders = response.data.orders || [];
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Group by day
    const dailyData = {};
    orders.forEach(order => {
      const day = order.created_at.split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, revenue: 0, orders: 0 };
      }
      dailyData[day].revenue += parseFloat(order.total_price || 0);
      dailyData[day].orders += 1;
    });
    
    res.json({
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        averageOrderValue: aov.toFixed(2),
        currency: orders[0]?.currency || 'EUR'
      },
      daily: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      recentOrders: orders.slice(0, 10).map(o => ({
        id: o.id,
        name: o.name,
        total: o.total_price,
        currency: o.currency,
        createdAt: o.created_at,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        customerName: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'Guest'
      }))
    });
  } catch (error) {
    console.error('Shopify Analytics Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching analytics',
      details: error.response?.data?.errors || error.message
    });
  }
});

// =============================================
// COMBINED ANALYTICS
// =============================================
app.get('/api/combined/roas', async (req, res) => {
  try {
    const { since, until } = req.query;
    const sinceDate = since || getDefaultSince();
    const untilDate = until || getToday();
    
    // Fetch Meta insights
    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    const metaParams = {
      fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,date_start,date_stop',
      time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
      time_increment: 1,
      limit: 500
    };
    
    const metaResponse = await axios.get(metaUrl(`${accountId}/insights`, metaParams));
    const metaData = metaResponse.data.data || [];
    
    // Fetch Shopify orders
    const shopifyParams = new URLSearchParams({
      status: 'any',
      limit: 250,
      financial_status: 'paid',
      created_at_min: new Date(sinceDate).toISOString(),
      created_at_max: new Date(untilDate + 'T23:59:59').toISOString()
    });
    
    const shopifyResponse = await axios.get(
      `${shopifyUrl('orders.json')}?${shopifyParams.toString()}`,
      { headers: shopifyHeaders() }
    );
    const orders = shopifyResponse.data.orders || [];
    
    // Aggregate Meta data
    const totalSpend = metaData.reduce((sum, d) => sum + parseFloat(d.spend || 0), 0);
    const totalImpressions = metaData.reduce((sum, d) => sum + parseInt(d.impressions || 0), 0);
    const totalClicks = metaData.reduce((sum, d) => sum + parseInt(d.clicks || 0), 0);
    const totalReach = metaData.reduce((sum, d) => sum + parseInt(d.reach || 0), 0);
    
    // Aggregate Shopify data
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const totalOrders = orders.length;
    
    // Calculate cross-platform metrics
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpa = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    
    // Build daily combined data
    const dailyMap = {};
    
    metaData.forEach(d => {
      const day = d.date_start;
      if (!dailyMap[day]) dailyMap[day] = { date: day, spend: 0, revenue: 0, orders: 0, clicks: 0, impressions: 0 };
      dailyMap[day].spend += parseFloat(d.spend || 0);
      dailyMap[day].clicks += parseInt(d.clicks || 0);
      dailyMap[day].impressions += parseInt(d.impressions || 0);
    });
    
    orders.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, spend: 0, revenue: 0, orders: 0, clicks: 0, impressions: 0 };
      dailyMap[day].revenue += parseFloat(o.total_price || 0);
      dailyMap[day].orders += 1;
    });
    
    const dailyData = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        roas: d.spend > 0 ? (d.revenue / d.spend).toFixed(2) : '0',
        spend: parseFloat(d.spend.toFixed(2)),
        revenue: parseFloat(d.revenue.toFixed(2))
      }));
    
    res.json({
      period: { since: sinceDate, until: untilDate },
      meta: {
        totalSpend: totalSpend.toFixed(2),
        totalImpressions,
        totalClicks,
        totalReach,
        ctr: ctr.toFixed(2),
        cpc: cpc.toFixed(2),
        cpm: cpm.toFixed(2)
      },
      shopify: {
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        averageOrderValue: aov.toFixed(2)
      },
      combined: {
        roas: roas.toFixed(2),
        cpa: cpa.toFixed(2),
        profitMargin: profitMargin.toFixed(2),
        profit: (totalRevenue - totalSpend).toFixed(2)
      },
      daily: dailyData
    });
  } catch (error) {
    console.error('Combined Analytics Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching combined analytics',
      details: error.response?.data || error.message
    });
  }
});

// =============================================
// HELPERS
// =============================================
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDefaultSince() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

// =============================================
// TELEGRAM ALERTS
// =============================================

const alertConfig = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  roasThreshold: parseFloat(process.env.ALERT_ROAS_THRESHOLD) || 2.0,
  enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
};

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${alertConfig.telegramBotToken}/sendMessage`;
  return axios.post(url, {
    chat_id: alertConfig.telegramChatId,
    text,
    parse_mode: 'Markdown',
  });
}

app.get('/api/alerts/config', (req, res) => {
  res.json({
    enabled: alertConfig.enabled,
    hasTelegramToken: !!alertConfig.telegramBotToken,
    telegramChatId: alertConfig.telegramChatId,
    roasThreshold: alertConfig.roasThreshold,
  });
});

app.post('/api/alerts/config', (req, res) => {
  const { telegramBotToken, telegramChatId, roasThreshold, enabled } = req.body;
  if (telegramBotToken) alertConfig.telegramBotToken = telegramBotToken;
  if (telegramChatId !== undefined) alertConfig.telegramChatId = telegramChatId;
  if (roasThreshold !== undefined) alertConfig.roasThreshold = parseFloat(roasThreshold);
  if (enabled !== undefined) alertConfig.enabled = Boolean(enabled);
  res.json({
    success: true,
    config: {
      enabled: alertConfig.enabled,
      hasTelegramToken: !!alertConfig.telegramBotToken,
      telegramChatId: alertConfig.telegramChatId,
      roasThreshold: alertConfig.roasThreshold,
    },
  });
});

app.post('/api/alerts/telegram/test', async (req, res) => {
  try {
    if (!alertConfig.telegramBotToken || !alertConfig.telegramChatId) {
      return res.status(400).json({ error: 'Telegram no configurado. Añade Bot Token y Chat ID.' });
    }
    const message = `🤖 *MetaShop Analytics* — Prueba de alertas\n\n✅ Conexión exitosa! Las alertas están activas.\n\n📊 Umbral ROAS configurado: < ${alertConfig.roasThreshold}x\n⏰ ${new Date().toLocaleString('es-ES')}`;
    await sendTelegramMessage(message);
    res.json({ success: true, message: 'Mensaje de prueba enviado a Telegram' });
  } catch (error) {
    console.error('Telegram Test Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error al enviar mensaje de Telegram',
      details: error.response?.data?.description || error.message,
    });
  }
});

app.post('/api/alerts/check', async (req, res) => {
  try {
    if (!alertConfig.enabled || !alertConfig.telegramBotToken || !alertConfig.telegramChatId) {
      return res.json({ sent: false, reason: 'Alertas desactivadas o sin configurar' });
    }
    if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
      return res.json({ sent: false, reason: 'Meta Ads no configurado' });
    }

    const { since, until } = req.body;
    const sinceDate = since || getDefaultSince();
    const untilDate = until || getToday();

    const accountId = `act_${process.env.META_AD_ACCOUNT_ID}`;
    const metaResponse = await axios.get(metaUrl(`${accountId}/insights`, {
      fields: 'spend',
      time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
      limit: 10,
    }));
    const totalSpend = (metaResponse.data.data || []).reduce((s, d) => s + parseFloat(d.spend || 0), 0);

    let totalRevenue = 0;
    let totalOrders = 0;
    if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_STORE_URL) {
      const shopifyParams = new URLSearchParams({
        financial_status: 'paid',
        limit: 250,
        created_at_min: new Date(sinceDate).toISOString(),
        created_at_max: new Date(untilDate + 'T23:59:59').toISOString(),
      });
      const shopRes = await axios.get(
        `${shopifyUrl('orders.json')}?${shopifyParams.toString()}`,
        { headers: shopifyHeaders() }
      );
      const orders = shopRes.data.orders || [];
      totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
      totalOrders = orders.length;
    }

    const currentRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    if (currentRoas < alertConfig.roasThreshold && totalSpend > 0) {
      const message = `🚨 *MetaShop Analytics — Alerta ROAS*\n\n⚠️ Tu ROAS ha bajado del umbral configurado.\n\n📊 ROAS actual: *${currentRoas.toFixed(2)}x*\n🎯 Umbral: ${alertConfig.roasThreshold}x\n💸 Gasto: €${totalSpend.toFixed(2)}\n💰 Ingresos: €${totalRevenue.toFixed(2)}\n📦 Pedidos: ${totalOrders}\n\n📅 Período: ${sinceDate} → ${untilDate}\n⏰ ${new Date().toLocaleString('es-ES')}\n\n_Revisa tus campañas en MetaShop Analytics_`;
      await sendTelegramMessage(message);
      return res.json({ sent: true, currentRoas: currentRoas.toFixed(2), threshold: alertConfig.roasThreshold });
    }

    res.json({ sent: false, reason: 'ROAS dentro del rango aceptable', currentRoas: currentRoas.toFixed(2) });
  } catch (error) {
    console.error('Alert Check Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al comprobar alertas', details: error.message });
  }
});

// =============================================
// UTM ATTRIBUTION
// =============================================

function parseUTM(urlStr) {
  if (!urlStr) return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null };
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://placeholder.com${urlStr}`);
    return {
      utm_source: parsed.searchParams.get('utm_source'),
      utm_medium: parsed.searchParams.get('utm_medium'),
      utm_campaign: parsed.searchParams.get('utm_campaign'),
      utm_content: parsed.searchParams.get('utm_content'),
      utm_term: parsed.searchParams.get('utm_term'),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null };
  }
}

app.get('/api/attribution/utm', async (req, res) => {
  try {
    const { since, until } = req.query;
    const params = new URLSearchParams({ status: 'any', limit: 250, financial_status: 'paid' });
    if (since) params.set('created_at_min', new Date(since).toISOString());
    if (until) params.set('created_at_max', new Date(until + 'T23:59:59').toISOString());

    const url = `${shopifyUrl('orders.json')}?${params.toString()}`;
    const response = await axios.get(url, { headers: shopifyHeaders() });
    const orders = response.data.orders || [];

    const attributed = orders.map(order => {
      const utm = parseUTM(order.landing_site || '');
      return {
        id: order.id,
        name: order.name,
        total: parseFloat(order.total_price || 0),
        currency: order.currency,
        createdAt: order.created_at,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest',
        landingSite: order.landing_site,
        utm,
      };
    });

    const campaignMap = {};
    attributed.forEach(order => {
      const key = order.utm.utm_campaign || '__direct__';
      if (!campaignMap[key]) {
        campaignMap[key] = {
          campaign: order.utm.utm_campaign || '(directo / sin UTM)',
          source: order.utm.utm_source || 'direct',
          medium: order.utm.utm_medium || '(none)',
          orders: 0,
          revenue: 0,
        };
      }
      campaignMap[key].orders += 1;
      campaignMap[key].revenue += order.total;
    });

    const sourceMap = {};
    attributed.forEach(order => {
      const src = order.utm.utm_source || 'direct';
      if (!sourceMap[src]) sourceMap[src] = { source: src, orders: 0, revenue: 0 };
      sourceMap[src].orders += 1;
      sourceMap[src].revenue += order.total;
    });

    const totalRevenue = attributed.reduce((s, o) => s + o.total, 0);
    const attributedOrders = attributed.filter(o => o.utm.utm_campaign).length;

    res.json({
      totalOrders: attributed.length,
      totalRevenue: totalRevenue.toFixed(2),
      attributedOrders,
      attributionRate: attributed.length > 0 ? ((attributedOrders / attributed.length) * 100).toFixed(1) : '0',
      campaigns: Object.values(campaignMap)
        .sort((a, b) => b.revenue - a.revenue)
        .map(c => ({ ...c, revenue: c.revenue.toFixed(2), aov: c.orders > 0 ? (c.revenue / c.orders).toFixed(2) : '0' })),
      sources: Object.values(sourceMap)
        .sort((a, b) => b.revenue - a.revenue)
        .map(s => ({ ...s, revenue: s.revenue.toFixed(2) })),
      orders: attributed.slice(0, 50),
    });
  } catch (error) {
    console.error('UTM Attribution Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error fetching UTM attribution',
      details: error.response?.data?.errors || error.message,
    });
  }
});

// =============================================
// SERVE REACT BUILD (solo en local, Vercel sirve dist/ automáticamente)
// =============================================
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// =============================================
// START SERVER (solo en local, no en Vercel)
// =============================================
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 MetaShop Analytics API running on http://localhost:${PORT}`);
    console.log(`\n📊 Status:`);
    console.log(`   Meta API: ${process.env.META_ACCESS_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Shopify:  ${process.env.SHOPIFY_ACCESS_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`\n📝 Configure your .env file with your API keys\n`);
  });
}

export default app;
