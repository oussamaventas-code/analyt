import React, { useMemo } from 'react';
import { analyzeData, calculateHealthScore } from '../engine/aiEngine';

export default function AIInsights({ dashboardData, campaignsData }) {
  const { insights, health } = useMemo(() => {
    const generatedInsights = analyzeData(dashboardData, campaignsData);
    const scoreInfo = calculateHealthScore(dashboardData);
    return { insights: generatedInsights, health: scoreInfo };
  }, [dashboardData, campaignsData]);

  if (!dashboardData) return null;

  return (
    <div className="ai-insights-section animate-fade-in" style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span> Asesor Inteligente
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.9rem', color: '#8b93a7' }}>Health Score:</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: health.color }}>{Math.round(health.score)}/100</span>
          <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', background: `${health.color}20`, color: health.color, fontWeight: 600 }}>{health.label}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {insights.map(insight => (
          <div key={insight.id} className="insight-card" style={{
            background: `linear-gradient(145deg, rgba(30, 35, 50, 0.7) 0%, rgba(20, 25, 40, 0.9) 100%)`,
            border: `1px solid ${getSeverityColor(insight.severity)}40`,
            borderLeft: `4px solid ${getSeverityColor(insight.severity)}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
              <span>{insight.icon}</span>
              <span style={{ lineHeight: '1.2' }}>{insight.title}</span>
            </div>
            <p style={{ color: '#a0aabf', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>{insight.description}</p>
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                <strong style={{ color: getSeverityColor(insight.severity), marginRight: '4px' }}>Acción sugerida:</strong> 
                {insight.action}
              </p>
            </div>
          </div>
        ))}
        {insights.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', color: '#8b93a7' }}>
            No hay recomendaciones en este momento. ¡Todo va genial!
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return '#ef4444'; // red
    case 'warning': return '#f59e0b'; // amber
    case 'success': return '#10b981'; // emerald
    case 'info': return '#3b82f6'; // blue
    default: return '#8b93a7'; // gray
  }
}
