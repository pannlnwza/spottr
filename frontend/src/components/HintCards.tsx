import { Lightbulb, Star, Zap, type LucideIcon } from 'lucide-react'

type Props = {
  onPickExample: (query: string) => void
}

const examples = [
  'A group of people chatting with each other',
  'Person carrying a large box',
  'Red vehicle in parking lot',
]
const tips = [
  'Be descriptive with colors and clothing',
  "Reword the search if you don't like the results",
  'Use natural language — full phrases work',
]
const capabilities = [
  'Open-vocabulary search for any object',
  'Frame-accurate timestamps',
  'In-memory index for this session',
]

export function HintCards({ onPickExample }: Props) {
  return (
    <div className="flex gap-12">
      <HintCard title="Examples" icon={Star} items={examples} onPick={onPickExample} />
      <HintCard title="Tips" icon={Lightbulb} items={tips} />
      <HintCard title="Capabilities" icon={Zap} items={capabilities} />
    </div>
  )
}

function HintCard({
  title,
  icon: Icon,
  items,
  onPick,
}: {
  title: string
  icon: LucideIcon
  items: string[]
  onPick?: (item: string) => void
}) {
  return (
    <div className="max-w-[220px] text-center">
      <div className="mb-3 flex justify-center">
        <Icon className="h-7 w-7 text-ink" strokeWidth={1.5} />
      </div>
      <h3 className="mb-3 font-display text-[15px] font-bold text-ink">{title}</h3>
      <div className="flex flex-col gap-2">
        {items.map((item) =>
          onPick ? (
            <button
              key={item}
              type="button"
              onClick={() => onPick(item)}
              className="rounded-lg bg-gray-100 px-3.5 py-2.5 text-left text-[13px] text-gray-600 transition-colors hover:bg-gray-200"
            >
              {item}
            </button>
          ) : (
            <div
              key={item}
              className="rounded-lg bg-gray-100 px-3.5 py-2.5 text-[13px] text-gray-600"
            >
              {item}
            </div>
          ),
        )}
      </div>
    </div>
  )
}
