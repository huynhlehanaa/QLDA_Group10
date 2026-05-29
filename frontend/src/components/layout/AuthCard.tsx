import type { PropsWithChildren } from 'react'

interface AuthCardProps extends PropsWithChildren {
  title: string
  subtitle: string
}

function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-panel sm:p-8">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}

export default AuthCard
