export default function KpiCard({ label, value, icon: Icon, color = 'blue', prefix = '', suffix = '' }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        {Icon && (
          <div className={`kpi-card-icon ${color}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="kpi-card-value">
        {prefix}{typeof value === 'number' ? value.toLocaleString('es-ES') : value}{suffix}
      </div>
    </div>
  );
}
