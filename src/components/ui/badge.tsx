import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-[9px] py-[2.5px] text-[11px] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        /* The five chip tones — the whole pill zoo collapses into these.
           Mapping: urgent→coral · HOT→gold · draft→neutral · Published→teal ·
           active→green · AI→gold w/ spark icon. Don't invent new colors
           per feature; filled-solid badges are for counts only. */
        neutral: "text-muted-foreground bg-secondary border-border",
        gold: "text-gold-600 bg-gold-600/10 border-gold-600/30 dark:text-gold-400 dark:bg-gold-400/12 dark:border-gold-400/25",
        teal: "text-teal-600 bg-teal-600/10 border-teal-600/30 dark:text-teal-300 dark:bg-teal-300/12 dark:border-teal-300/25",
        coral: "text-coral-600 bg-coral-600/10 border-coral-600/30 dark:text-coral-300 dark:bg-coral-300/12 dark:border-coral-300/25",
        green: "text-green-600 bg-green-600/12 border-green-600/30 dark:text-green-300 dark:bg-green-300/12 dark:border-green-300/25",
        /* Filled badge — counts only */
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        /* Deprecated shadcn variants — migrate to the tones above */
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
