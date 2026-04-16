import * as React from "react"

export const Tabs = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`w-full ${className}`} {...props} />
)

export const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`} {...props} />
)

export const TabsTrigger = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className}`} {...props} />
)

export const TabsContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-2 focus-visible:outline-none ${className}`} {...props} />
)