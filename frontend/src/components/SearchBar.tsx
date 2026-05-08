import { Loader2, Search, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { cx } from '../utils/cx'

type Variant = 'inline' | 'floating'

type Props = {
  variant: Variant
  initialQuery?: string
  placeholder?: string
  disabled?: boolean
  isSearching?: boolean
  onSubmit: (query: string) => void
  onClear: () => void
}

export function SearchBar({
  variant,
  initialQuery = '',
  placeholder = 'Search...',
  disabled,
  isSearching,
  onSubmit,
  onClear,
}: Props) {
  const [value, setValue] = useState(initialQuery)

  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q) onSubmit(q)
  }

  const clear = () => {
    setValue('')
    onClear()
  }

  const isFloating = variant === 'floating'
  const showClear = value.length > 0
  const submitDisabled = disabled || !value.trim() || isSearching

  return (
    <form onSubmit={submit} className="relative w-[520px]">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className={cx(
          'w-full rounded-full border-2 py-[14px] pl-6 pr-[100px] text-[15px] outline-none transition-colors placeholder:text-gray-400 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
          isFloating && 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
          !disabled && 'border-indigo-600 bg-white text-ink',
        )}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {showClear && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent text-gray-400 hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          aria-label="Search"
          className={cx(
            'mr-1 flex h-9 w-9 items-center justify-center rounded-full border-0 text-white transition-colors',
            submitDisabled ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700',
          )}
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </form>
  )
}
