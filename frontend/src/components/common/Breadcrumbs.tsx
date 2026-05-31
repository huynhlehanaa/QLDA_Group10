import { Link } from 'react-router-dom'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type Props = {
  items: BreadcrumbItem[]
}

function Breadcrumbs({ items }: Props) {
  if (!items.length) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={`${item.label}-${item.to ?? index}`} className="flex items-center gap-2">
            {item.to && !isLast ? (
              <Link to={item.to} className="font-medium text-slate-600 transition hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-slate-900' : ''}>{item.label}</span>
            )}
            {!isLast && <span aria-hidden="true" className="text-slate-300">/</span>}
          </div>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs