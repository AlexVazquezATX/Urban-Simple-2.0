'use client'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div className="bg-card rounded-[14px] border border-border p-5">
      <label className="block text-sm font-medium text-foreground mb-2">
        What do you want to create?
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the image you want to generate. Be as specific or creative as you want — photorealistic, cartoon, animated, fantasy, anything goes..."
        rows={4}
        disabled={disabled}
        className="w-full px-3.5 py-3 rounded-[12px] border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring resize-y text-sm disabled:opacity-50 min-h-[100px]"
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-muted-foreground">
          Any style works: photorealistic, illustration, cartoon, 3D, watercolor...
        </p>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">{value.length}</span>
      </div>
    </div>
  )
}
