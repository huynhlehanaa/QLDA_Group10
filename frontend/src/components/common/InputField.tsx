import type { InputHTMLAttributes } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

function InputField({ label, error, id, ...props }: InputFieldProps) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={id}
        className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
          error
            ? 'border-rose-400 focus:border-rose-500'
            : 'border-slate-300 focus:border-brand'
        }`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

export default InputField
