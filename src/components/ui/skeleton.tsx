import { cn } from "@/lib/utils"

/**
 * El brillo que barre no está acá: vive en `globals.css`, colgado de
 * `[data-slot="skeleton"]`, para que lo tengan también los bloques que no pasan
 * por este componente.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
