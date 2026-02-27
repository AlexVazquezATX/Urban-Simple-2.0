'use client'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div className="bg-white rounded-sm border border-warm-200 p-5">
      <label className="block text-sm font-medium text-warm-900 mb-2">
        What do you want to create?
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the image you want to generate. Be as specific or creative as you want — photorealistic, cartoon, animated, fantasy, anything goes..."
        rows={4}
        disabled={disabled}
        className="w-full px-3.5 py-3 rounded-sm border border-warm-200 bg-white text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500 resize-y text-sm disabled:opacity-50 min-h-[100px]"
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-warm-400">
          Any style works: photorealistic, illustration, cartoon, 3D, watercolor...
        </p>
        <span className="text-xs text-warm-400">{value.length}</span>
      </div>
    </div>
  )
}
