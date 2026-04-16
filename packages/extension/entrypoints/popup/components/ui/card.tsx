import * as React from "react"

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}
      {...props}
    />
  )
}