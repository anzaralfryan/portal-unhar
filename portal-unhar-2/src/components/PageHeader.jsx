import './PageHeader.css'

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="ph-title-block">
        <h1 className="ph-title">{title}</h1>
        {subtitle && <p className="ph-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  )
}
