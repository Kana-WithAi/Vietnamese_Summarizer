import { useState } from 'react'

function AuthInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  showToggle = false,
}) {
  const [visible, setVisible] = useState(false)
  const inputType = showToggle ? (visible ? 'text' : 'password') : type

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-surface-elevated px-4 py-3 text-slate-200 shadow-sm outline-none transition placeholder:text-slate-600 focus:ring-2 ${
            error
              ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/20'
              : 'border-surface-border focus:border-accent focus:ring-accent/20'
          } ${showToggle ? 'pr-12' : ''}`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition hover:text-slate-600"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default AuthInput
