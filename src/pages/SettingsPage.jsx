import { useState, useEffect } from 'react';
import { getConfigStatus, getAlertConfig, saveAlertConfig, testTelegram, checkAlerts } from '../api';
import { ExternalLink, CheckCircle, AlertCircle, Bell, Send, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);

  // Telegram alert state
  const [alertCfg, setAlertCfg] = useState(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [roasThreshold, setRoasThreshold] = useState(2.0);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    getConfigStatus()
      .then(res => setConfig(res.data))
      .catch(() => setConfig({ meta: { configured: false }, shopify: { configured: false } }));

    getAlertConfig()
      .then(res => {
        const cfg = res.data;
        setAlertCfg(cfg);
        setChatId(cfg.telegramChatId || '');
        setRoasThreshold(cfg.roasThreshold || 2.0);
        setAlertsEnabled(cfg.enabled || false);
      })
      .catch(() => {});
  }, []);

  const handleSaveAlerts = async () => {
    setSaving(true);
    setAlertMsg(null);
    try {
      const payload = {
        telegramChatId: chatId,
        roasThreshold: parseFloat(roasThreshold),
        enabled: alertsEnabled,
      };
      if (telegramToken) payload.telegramBotToken = telegramToken;
      const res = await saveAlertConfig(payload);
      setAlertCfg(res.data.config);
      setTelegramToken('');
      setAlertMsg({ type: 'success', text: 'Configuración guardada correctamente' });
    } catch {
      setAlertMsg({ type: 'error', text: 'Error al guardar la configuración' });
    }
    setSaving(false);
  };

  const handleTestTelegram = async () => {
    setTesting(true);
    setAlertMsg(null);
    try {
      await testTelegram();
      setAlertMsg({ type: 'success', text: '✅ Mensaje de prueba enviado a Telegram' });
    } catch (err) {
      setAlertMsg({ type: 'error', text: `❌ ${err.response?.data?.error || 'Error al enviar mensaje'}` });
    }
    setTesting(false);
  };

  const handleCheckNow = async () => {
    setChecking(true);
    setAlertMsg(null);
    try {
      const res = await checkAlerts();
      const { sent, currentRoas, reason } = res.data;
      if (sent) {
        setAlertMsg({ type: 'warning', text: `🚨 Alerta enviada — ROAS actual: ${currentRoas}x (por debajo del umbral)` });
      } else {
        setAlertMsg({ type: 'success', text: `✅ ROAS OK (${currentRoas || '—'}x). ${reason || ''}` });
      }
    } catch {
      setAlertMsg({ type: 'error', text: 'Error al comprobar ROAS' });
    }
    setChecking(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="alert-banner" style={{ marginBottom: 24 }}>
        ⚙️ Las API keys se configuran en el archivo <strong style={{ margin: '0 4px' }}>.env</strong> del proyecto. Reinicia el servidor backend después de modificar las credenciales.
      </div>

      <div className="settings-grid">
        {/* Meta Configuration */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon meta">📘</div>
            <div>
              <div className="settings-card-title">Meta (Facebook) Ads</div>
              <div className="settings-card-desc">Marketing API v21.0</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: config?.meta?.configured ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)', borderRadius: 'var(--radius-sm)' }}>
            {config?.meta?.configured ? <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} /> : <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />}
            <span style={{ fontSize: 13, color: config?.meta?.configured ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {config?.meta?.configured ? `Conectado - ${config.meta.adAccountId}` : 'No configurado'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Access Token</label>
            <input type="password" className="form-input" value="••••••••••••••••" readOnly />
            <p className="form-help">Configura META_ACCESS_TOKEN en .env</p>
          </div>

          <div className="form-group">
            <label className="form-label">Ad Account ID</label>
            <input type="text" className="form-input" value={config?.meta?.adAccountId || 'Sin configurar'} readOnly />
            <p className="form-help">Configura META_AD_ACCOUNT_ID en .env</p>
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 20, marginBottom: 12, color: 'var(--text-secondary)' }}>Pasos para obtener credenciales:</h4>
          <ol style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 2 }}>
            <li>Ve a <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>developers.facebook.com</a></li>
            <li>Crea o selecciona tu aplicación</li>
            <li>Usa el <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>Graph API Explorer</a> para generar un token</li>
            <li>Selecciona permisos: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>ads_read</code>, <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>ads_management</code></li>
            <li>Tu Ad Account ID está en Business Settings → Ad Accounts</li>
          </ol>
        </div>

        {/* Shopify Configuration */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon shopify">🛍️</div>
            <div>
              <div className="settings-card-title">Shopify</div>
              <div className="settings-card-desc">Admin API 2024-01</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: config?.shopify?.configured ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)', borderRadius: 'var(--radius-sm)' }}>
            {config?.shopify?.configured ? <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} /> : <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />}
            <span style={{ fontSize: 13, color: config?.shopify?.configured ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {config?.shopify?.configured ? `Conectado - ${config.shopify.storeUrl}` : 'No configurado'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Store URL</label>
            <input type="text" className="form-input" value={config?.shopify?.storeUrl || 'Sin configurar'} readOnly />
            <p className="form-help">Configura SHOPIFY_STORE_URL en .env (ej: mi-tienda.myshopify.com)</p>
          </div>

          <div className="form-group">
            <label className="form-label">Access Token</label>
            <input type="password" className="form-input" value="••••••••••••••••" readOnly />
            <p className="form-help">Configura SHOPIFY_ACCESS_TOKEN en .env</p>
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 20, marginBottom: 12, color: 'var(--text-secondary)' }}>Pasos para obtener credenciales:</h4>
          <ol style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 2 }}>
            <li>Ve al admin de tu tienda Shopify</li>
            <li>Settings → Apps and sales channels</li>
            <li>Develop apps → Create an app</li>
            <li>Configura los scopes de Admin API:
              <code style={{ display: 'block', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>read_orders, read_products, read_customers</code>
            </li>
            <li>Instala la app y copia el Access Token</li>
          </ol>
        </div>
      </div>

      {/* Telegram Alerts Card */}
      <div className="settings-card" style={{ marginTop: 24, maxWidth: '100%' }}>
        <div className="settings-card-header">
          <div className="settings-card-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 20 }}>📱</div>
          <div>
            <div className="settings-card-title">Alertas Telegram</div>
            <div className="settings-card-desc">Recibe alertas cuando el ROAS baje del umbral</div>
          </div>
        </div>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '10px 14px',
          background: alertCfg?.enabled && alertCfg?.hasTelegramToken
            ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {alertCfg?.enabled && alertCfg?.hasTelegramToken
            ? <CheckCircle size={16} style={{ color: 'var(--accent-green)' }} />
            : <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />
          }
          <span style={{ fontSize: 13, color: alertCfg?.enabled && alertCfg?.hasTelegramToken ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {alertCfg?.enabled && alertCfg?.hasTelegramToken
              ? `Activo — Chat ID: ${alertCfg.telegramChatId || '—'}`
              : 'Sin configurar'}
          </span>
        </div>

        {/* Enable toggle */}
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Alertas activadas</label>
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: alertsEnabled ? '#22c55e' : 'var(--bg-input)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: alertsEnabled ? 23 : 3,
              width: 18,
              height: 18,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Bot Token</label>
          <input
            type="password"
            className="form-input"
            placeholder={alertCfg?.hasTelegramToken ? '••••••••••••••••  (ya configurado)' : 'Ej: 1234567890:AAABBBCCC...'}
            value={telegramToken}
            onChange={e => setTelegramToken(e.target.value)}
          />
          <p className="form-help">Obtén el token de @BotFather en Telegram</p>
        </div>

        <div className="form-group">
          <label className="form-label">Chat ID</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: 123456789"
            value={chatId}
            onChange={e => setChatId(e.target.value)}
          />
          <p className="form-help">Tu chat ID personal o el ID de un grupo/canal. Usa @userinfobot para obtenerlo.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Umbral ROAS — alertar cuando sea menor de: {roasThreshold}x</label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            value={roasThreshold}
            onChange={e => setRoasThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>1x (pérdidas)</span>
            <span style={{ color: '#f59e0b' }}>2x (ajustado)</span>
            <span style={{ color: '#10b981' }}>3x (rentable)</span>
            <span>5x (excelente)</span>
          </div>
        </div>

        {/* Feedback message */}
        {alertMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background: alertMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : alertMsg.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${alertMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : alertMsg.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: alertMsg.type === 'success' ? '#10b981' : alertMsg.type === 'warning' ? '#f59e0b' : '#ef4444',
          }}>
            {alertMsg.text}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveAlerts}
            disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: 'var(--accent-blue)', color: '#fff', fontWeight: 600, fontSize: 13,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          <button
            onClick={handleTestTelegram}
            disabled={testing || !alertCfg?.hasTelegramToken}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-color)', cursor: testing || !alertCfg?.hasTelegramToken ? 'not-allowed' : 'pointer',
              background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
              opacity: testing || !alertCfg?.hasTelegramToken ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Send size={14} />
            {testing ? 'Enviando...' : 'Probar'}
          </button>
          <button
            onClick={handleCheckNow}
            disabled={checking || !alertCfg?.enabled}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-color)', cursor: checking || !alertCfg?.enabled ? 'not-allowed' : 'pointer',
              background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
              opacity: checking || !alertCfg?.enabled ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={14} />
            {checking ? 'Comprobando...' : 'Comprobar ROAS ahora'}
          </button>
        </div>

        <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>Cómo crear tu bot de Telegram:</h4>
        <ol style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 2.2, margin: 0 }}>
          <li>Abre Telegram y busca <strong style={{ color: 'var(--text-secondary)' }}>@BotFather</strong></li>
          <li>Escribe <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4 }}>/newbot</code> y sigue los pasos</li>
          <li>Copia el <strong style={{ color: 'var(--text-secondary)' }}>token del bot</strong> y pégalo arriba</li>
          <li>Inicia el bot (búscalo en Telegram y pulsa Start)</li>
          <li>Busca <strong style={{ color: 'var(--text-secondary)' }}>@userinfobot</strong> → escríbele → te dará tu Chat ID</li>
          <li>Guarda y pulsa "Probar" para verificar la conexión</li>
        </ol>
      </div>

      {/* Info Card */}
      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-card-header">
          <div className="chart-card-title">ℹ️ Información del Sistema</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Frontend</p>
            <p style={{ fontWeight: 600 }}>Vite + React</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Backend</p>
            <p style={{ fontWeight: 600 }}>Express.js (puerto 3001)</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Meta API</p>
            <p style={{ fontWeight: 600 }}>Marketing API v21.0</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Shopify API</p>
            <p style={{ fontWeight: 600 }}>Admin API 2024-01</p>
          </div>
        </div>
      </div>
    </div>
  );
}
