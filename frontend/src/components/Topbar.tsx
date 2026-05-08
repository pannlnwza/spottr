type Props = {
  title: string
}

export function Topbar({ title }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-border-soft bg-white px-7 py-3">
      <h1 className="font-display text-[15px] font-bold text-ink">{title}</h1>
    </header>
  )
}
