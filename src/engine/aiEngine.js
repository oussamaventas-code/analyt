/**
 * AI Analytics Engine - Rule-based recommendation system
 * Analyzes campaign data and generates actionable insights
 */

// Severity levels for insights
const SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success',
};

const CATEGORY = {
  ROAS: 'roas',
  BUDGET: 'budget',
  CAMPAIGN: 'campaign',
  TREND: 'trend',
  SCALING: 'scaling',
  ANOMALY: 'anomaly',
};

/**
 * Main analysis function - generates all insights
 */
export function analyzeData(dashboardData, campaignsData) {
  if (!dashboardData) return [];

  const insights = [];

  // 1. ROAS Analysis
  insights.push(...analyzeROAS(dashboardData));

  // 2. Trend Analysis  
  insights.push(...analyzeTrends(dashboardData));

  // 3. Campaign Performance
  insights.push(...analyzeCampaigns(campaignsData));

  // 4. Budget Optimization
  insights.push(...analyzeBudget(dashboardData, campaignsData));

  // 5. Anomaly Detection
  insights.push(...detectAnomalies(dashboardData));

  // 6. Scaling Recommendations
  insights.push(...scalingRecommendations(dashboardData));

  // Sort by severity priority
  const severityOrder = { critical: 0, warning: 1, success: 2, info: 3 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * ROAS Analysis
 */
function analyzeROAS(data) {
  const insights = [];
  const roas = parseFloat(data.combined?.roas) || 0;
  const spend = parseFloat(data.meta?.totalSpend) || 0;
  const revenue = parseFloat(data.shopify?.totalRevenue) || 0;

  if (roas < 1) {
    insights.push({
      id: 'roas-negative',
      severity: SEVERITY.CRITICAL,
      category: CATEGORY.ROAS,
      title: '🚨 ROAS por debajo de 1x — Estás perdiendo dinero',
      description: `Tu ROAS es ${roas.toFixed(2)}x. Por cada €1 invertido solo recuperas €${roas.toFixed(2)}. Estás perdiendo €${(spend - revenue).toFixed(2)} en el periodo.`,
      action: 'Pausa las campañas con peor rendimiento inmediatamente. Revisa tu targeting y creativos antes de seguir gastando.',
      impact: 'alto',
      icon: '🔴',
    });
  } else if (roas < 2) {
    insights.push({
      id: 'roas-low',
      severity: SEVERITY.WARNING,
      category: CATEGORY.ROAS,
      title: '⚠️ ROAS bajo — Margen muy ajustado',
      description: `Con un ROAS de ${roas.toFixed(2)}x, tu margen de beneficio es del ${data.combined?.profitMargin}%. Después de costes de producto y envío, podrías estar en pérdidas.`,
      action: 'Optimiza tus creativos y prueba nuevas audiencias. Considera subir el precio de venta o reducir costes de envío.',
      impact: 'medio',
      icon: '🟡',
    });
  } else if (roas >= 3 && roas < 5) {
    insights.push({
      id: 'roas-good',
      severity: SEVERITY.SUCCESS,
      category: CATEGORY.ROAS,
      title: '✅ Buen ROAS — Tu campaña es rentable',
      description: `ROAS de ${roas.toFixed(2)}x. Por cada €1 generas €${roas.toFixed(2)} en ingresos. Beneficio neto de €${data.combined?.profit}.`,
      action: 'Considera escalar el presupuesto un 20-30% manteniendo las mismas audiencias y creativos.',
      impact: 'positivo',
      icon: '🟢',
    });
  } else if (roas >= 5) {
    insights.push({
      id: 'roas-excellent',
      severity: SEVERITY.SUCCESS,
      category: CATEGORY.ROAS,
      title: '🚀 ROAS excelente — Momento de escalar',
      description: `Tu ROAS de ${roas.toFixed(2)}x es excepcional. Estás en una posición perfecta para escalar agresivamente.`,
      action: 'Duplica tu presupuesto esta semana. Crea lookalike audiences basadas en tus compradores actuales. Lanza nuevos creativos para evitar fatiga.',
      impact: 'alto',
      icon: '🟢',
    });
  }

  return insights;
}

/**
 * Trend Analysis - Analyze daily data for patterns
 */
function analyzeTrends(data) {
  const insights = [];
  const daily = data.daily || [];

  if (daily.length < 3) return insights;

  // Calculate trend direction
  const recentDays = daily.slice(-7);
  const previousDays = daily.slice(-14, -7);

  if (recentDays.length > 0 && previousDays.length > 0) {
    const recentRevAvg = recentDays.reduce((s, d) => s + (d.revenue || 0), 0) / recentDays.length;
    const prevRevAvg = previousDays.reduce((s, d) => s + (d.revenue || 0), 0) / previousDays.length;
    const revChange = prevRevAvg > 0 ? ((recentRevAvg - prevRevAvg) / prevRevAvg) * 100 : 0;

    if (revChange > 20) {
      insights.push({
        id: 'trend-revenue-up',
        severity: SEVERITY.SUCCESS,
        category: CATEGORY.TREND,
        title: '📈 Ingresos en tendencia alcista',
        description: `Los ingresos han subido un ${revChange.toFixed(0)}% en los últimos 7 días vs la semana anterior (€${recentRevAvg.toFixed(0)}/día vs €${prevRevAvg.toFixed(0)}/día).`,
        action: 'Mantén la estrategia actual y considera incrementar presupuesto mientras la tendencia se mantiene.',
        impact: 'positivo',
        icon: '📈',
      });
    } else if (revChange < -20) {
      insights.push({
        id: 'trend-revenue-down',
        severity: SEVERITY.WARNING,
        category: CATEGORY.TREND,
        title: '📉 Ingresos en caída',
        description: `Los ingresos han bajado un ${Math.abs(revChange).toFixed(0)}% en los últimos 7 días (€${recentRevAvg.toFixed(0)}/día vs €${prevRevAvg.toFixed(0)}/día).`,
        action: 'Revisa si hay fatiga de audiencia. Actualiza creativos y prueba nuevos ángulos de venta.',
        impact: 'alto',
        icon: '📉',
      });
    }

    // Spend trend
    const recentSpendAvg = recentDays.reduce((s, d) => s + (d.spend || 0), 0) / recentDays.length;
    const prevSpendAvg = previousDays.reduce((s, d) => s + (d.spend || 0), 0) / previousDays.length;
    const spendChange = prevSpendAvg > 0 ? ((recentSpendAvg - prevSpendAvg) / prevSpendAvg) * 100 : 0;

    if (spendChange > 30 && revChange < 10) {
      insights.push({
        id: 'trend-spend-efficiency',
        severity: SEVERITY.WARNING,
        category: CATEGORY.BUDGET,
        title: '💸 El gasto sube pero los ingresos no',
        description: `Has aumentado el gasto un ${spendChange.toFixed(0)}% pero los ingresos solo un ${revChange.toFixed(0)}%. Tu eficiencia está bajando.`,
        action: 'Reduce el presupuesto al nivel anterior y optimiza antes de volver a escalar.',
        impact: 'alto',
        icon: '💸',
      });
    }
  }

  // Best/Worst day analysis
  if (daily.length >= 7) {
    const withRoas = daily.filter(d => d.spend > 0).map(d => ({
      ...d,
      roasNum: d.revenue / d.spend
    }));

    if (withRoas.length > 0) {
      const bestDay = withRoas.reduce((a, b) => a.roasNum > b.roasNum ? a : b);
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const bestDayName = dayNames[new Date(bestDay.date).getDay()];

      insights.push({
        id: 'trend-best-day',
        severity: SEVERITY.INFO,
        category: CATEGORY.TREND,
        title: `📅 Tu mejor día de la semana: ${bestDayName}`,
        description: `El ${bestDayName} (${bestDay.date}) tuviste un ROAS de ${bestDay.roasNum.toFixed(2)}x con €${bestDay.revenue.toFixed(0)} de ingresos.`,
        action: `Concentra más presupuesto los ${bestDayName}s con Day Parting o reglas automatizadas en Meta.`,
        impact: 'medio',
        icon: '📅',
      });
    }
  }

  return insights;
}

/**
 * Campaign Analysis
 */
function analyzeCampaigns(campaigns) {
  const insights = [];
  if (!campaigns || campaigns.length === 0) return insights;

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' || c.estado === 'ACTIVA');
  const pausedCampaigns = campaigns.filter(c => c.status === 'PAUSED' || c.estado === 'PAUSADA');

  // Top performer
  const withRoas = campaigns.filter(c => c.roas || c.roasValue);
  if (withRoas.length > 1) {
    const sorted = [...withRoas].sort((a, b) => {
      const roasA = parseFloat(a.roas || a.roasValue || 0);
      const roasB = parseFloat(b.roas || b.roasValue || 0);
      return roasB - roasA;
    });

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    insights.push({
      id: 'campaign-best',
      severity: SEVERITY.INFO,
      category: CATEGORY.CAMPAIGN,
      title: `🏆 Mejor campaña: "${best.name || best.campaignName}"`,
      description: `ROAS de ${parseFloat(best.roas || best.roasValue || 0).toFixed(2)}x. Esta campaña es tu mejor activo.`,
      action: 'Crea variantes de esta campaña con diferentes creativos. Escala su presupuesto un 20% cada 3 días.',
      impact: 'positivo',
      icon: '🏆',
    });

    if (parseFloat(worst.roas || worst.roasValue || 0) < 2) {
      insights.push({
        id: 'campaign-worst',
        severity: SEVERITY.WARNING,
        category: CATEGORY.CAMPAIGN,
        title: `🐌 Campaña débil: "${worst.name || worst.campaignName}"`,
        description: `ROAS de ${parseFloat(worst.roas || worst.roasValue || 0).toFixed(2)}x. Esta campaña consume presupuesto sin generar retorno suficiente.`,
        action: 'Páusala y redirige ese presupuesto a tu mejor campaña. O renueva creativos y audiencias.',
        impact: 'medio',
        icon: '🐌',
      });
    }
  }

  // Too many active campaigns
  if (activeCampaigns.length > 5) {
    insights.push({
      id: 'campaign-too-many',
      severity: SEVERITY.INFO,
      category: CATEGORY.CAMPAIGN,
      title: '📊 Tienes muchas campañas activas',
      description: `${activeCampaigns.length} campañas activas. Si tu presupuesto diario es bajo, estás fragmentando el gasto y el algoritmo de Meta no puede optimizar bien.`,
      action: 'Consolida en 2-3 campañas principales con más presupuesto cada una. Meta funciona mejor con datos concentrados.',
      impact: 'medio',
      icon: '📊',
    });
  }

  return insights;
}

/**
 * Budget Analysis
 */
function analyzeBudget(data, campaigns) {
  const insights = [];
  const spend = parseFloat(data.meta?.totalSpend) || 0;
  const revenue = parseFloat(data.shopify?.totalRevenue) || 0;
  const daily = data.daily || [];
  
  if (daily.length === 0) return insights;

  const avgDailySpend = spend / daily.length;
  const avgDailyRevenue = revenue / daily.length;

  // Low spend analysis
  if (avgDailySpend < 10 && avgDailySpend > 0) {
    insights.push({
      id: 'budget-low',
      severity: SEVERITY.INFO,
      category: CATEGORY.BUDGET,
      title: '💰 Presupuesto diario muy bajo',
      description: `Gastas una media de €${avgDailySpend.toFixed(2)}/día. Con menos de €10/día, el algoritmo de Meta necesita más tiempo para optimizar (fase de aprendizaje más lenta).`,
      action: 'Si puedes, sube a €20-30/día concentrado en 1-2 campañas. Conseguirás resultados más rápido.',
      impact: 'medio',
      icon: '💰',
    });
  }

  // CPA vs AOV analysis
  const cpa = parseFloat(data.combined?.cpa) || 0;
  const aov = parseFloat(data.shopify?.averageOrderValue) || 0;

  if (cpa > 0 && aov > 0 && cpa > aov * 0.5) {
    insights.push({
      id: 'budget-cpa-high',
      severity: SEVERITY.WARNING,
      category: CATEGORY.BUDGET,
      title: '📛 CPA demasiado alto respecto al ticket medio',
      description: `Tu coste por adquisición (€${cpa.toFixed(2)}) es el ${((cpa / aov) * 100).toFixed(0)}% de tu ticket medio (€${aov.toFixed(2)}). Queda poco margen.`,
      action: 'Mejora el funnel de conversión. Prueba: mejores landing pages, descuentos de primera compra, o upsells post-compra.',
      impact: 'alto',
      icon: '📛',
    });
  }

  return insights;
}

/**
 * Anomaly Detection - Find unusual patterns
 */
function detectAnomalies(data) {
  const insights = [];
  const daily = data.daily || [];

  if (daily.length < 5) return insights;

  // Calculate standard deviation for revenue
  const revenues = daily.map(d => d.revenue || 0);
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const stdDev = Math.sqrt(revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length);

  // Check last 3 days for anomalies
  const recent = daily.slice(-3);
  recent.forEach(day => {
    const diff = (day.revenue || 0) - avgRevenue;
    if (Math.abs(diff) > stdDev * 2 && stdDev > 0) {
      if (diff > 0) {
        insights.push({
          id: `anomaly-spike-${day.date}`,
          severity: SEVERITY.INFO,
          category: CATEGORY.ANOMALY,
          title: `⚡ Pico inusual el ${day.date}`,
          description: `Ingresos de €${(day.revenue || 0).toFixed(0)} vs media de €${avgRevenue.toFixed(0)} (+${((diff / avgRevenue) * 100).toFixed(0)}%). Algo funcionó especialmente bien.`,
          action: 'Investiga qué campaña/anuncio generó este pico. Intenta replicar las condiciones (creativos, audiencia, hora).',
          impact: 'positivo',
          icon: '⚡',
        });
      } else {
        insights.push({
          id: `anomaly-drop-${day.date}`,
          severity: SEVERITY.WARNING,
          category: CATEGORY.ANOMALY,
          title: `📉 Caída inusual el ${day.date}`,
          description: `Ingresos de €${(day.revenue || 0).toFixed(0)} vs media de €${avgRevenue.toFixed(0)} (${((diff / avgRevenue) * 100).toFixed(0)}%).`,
          action: 'Revisa si hubo un problema técnico (web caída, checkout roto) o si fue un día festivo con bajo tráfico.',
          impact: 'medio',
          icon: '📉',
        });
      }
    }
  });

  return insights;
}

/**
 * Scaling Recommendations
 */
function scalingRecommendations(data) {
  const insights = [];
  const roas = parseFloat(data.combined?.roas) || 0;
  const spend = parseFloat(data.meta?.totalSpend) || 0;
  const revenue = parseFloat(data.shopify?.totalRevenue) || 0;
  const daily = data.daily || [];

  if (daily.length === 0 || spend === 0) return insights;

  const avgDailySpend = spend / daily.length;

  if (roas >= 2.5) {
    // Calculate projected scaling
    const scaledSpend20 = avgDailySpend * 1.2;
    const scaledSpend50 = avgDailySpend * 1.5;
    const projectedRev20 = scaledSpend20 * roas * 0.9; // 10% efficiency drop
    const projectedRev50 = scaledSpend50 * roas * 0.8; // 20% efficiency drop

    insights.push({
      id: 'scaling-opportunity',
      severity: SEVERITY.INFO,
      category: CATEGORY.SCALING,
      title: '🎯 Proyección de escalado',
      description: `Si subes presupuesto un 20% (€${scaledSpend20.toFixed(0)}/día), podrías generar ~€${projectedRev20.toFixed(0)}/día. Con un 50% más (€${scaledSpend50.toFixed(0)}/día), ~€${projectedRev50.toFixed(0)}/día. (Ajustado por pérdida de eficiencia al escalar)`,
      action: 'Escala gradualmente: +20% cada 3-4 días. Monitoriza el ROAS diariamente. Si baja de 2x, para y optimiza.',
      impact: 'alto',
      icon: '🎯',
    });
  }

  return insights;
}

/**
 * Generate a score (0-100) based on overall performance
 */
export function calculateHealthScore(data) {
  if (!data) return { score: 0, label: 'Sin datos', color: '#6b7280' };

  let score = 50; // Base

  const roas = parseFloat(data.combined?.roas) || 0;
  const margin = parseFloat(data.combined?.profitMargin) || 0;

  // ROAS scoring (max 30 points)
  if (roas >= 5) score += 30;
  else if (roas >= 3) score += 20;
  else if (roas >= 2) score += 10;
  else if (roas >= 1) score += 0;
  else score -= 20;

  // Margin scoring (max 20 points)
  if (margin >= 60) score += 20;
  else if (margin >= 40) score += 10;
  else if (margin >= 20) score += 5;
  else score -= 10;

  // Trend scoring (based on recent daily data)
  const daily = data.daily || [];
  if (daily.length >= 7) {
    const recent = daily.slice(-3);
    const prev = daily.slice(-6, -3);
    const recentAvg = recent.reduce((s, d) => s + (d.revenue || 0), 0) / recent.length;
    const prevAvg = prev.reduce((s, d) => s + (d.revenue || 0), 0) / prev.length;
    if (prevAvg > 0) {
      const trend = ((recentAvg - prevAvg) / prevAvg) * 100;
      if (trend > 10) score += 10;
      else if (trend < -10) score -= 10;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let label, color;
  if (score >= 80) { label = 'Excelente'; color = '#10b981'; }
  else if (score >= 60) { label = 'Bueno'; color = '#3b82f6'; }
  else if (score >= 40) { label = 'Regular'; color = '#f59e0b'; }
  else if (score >= 20) { label = 'Necesita mejoras'; color = '#ef4444'; }
  else { label = 'Crítico'; color = '#dc2626'; }

  return { score, label, color };
}
