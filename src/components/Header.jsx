import { RefreshCw, Calendar, Languages } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function Header({ activePage, dateRange, onDateChange, onRefresh, loading }) {
  const { t, lang, setLang } = useTranslation();
  const pageInfo = t(`header.${activePage}`) || t('header.dashboard');

  const noDatePages = ['settings', 'calculator', 'attribution'];

  return (
    <header className="main-header">
      <div className="header-left">
        <div>
          <h2>{pageInfo.title}</h2>
          <p>{pageInfo.subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Language toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 3,
        }}>
          <Languages size={14} style={{ color: 'var(--text-muted)', marginLeft: 6 }} />
          <button
            onClick={() => setLang('es')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: lang === 'es' ? 'var(--accent-blue)' : 'transparent',
              color: lang === 'es' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            ES
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: lang === 'en' ? 'var(--accent-blue)' : 'transparent',
              color: lang === 'en' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            EN
          </button>
        </div>

        {!noDatePages.includes(activePage) && (
          <>
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
              {loading ? t('header.loading') : t('header.refresh')}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
