import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-2xl font-bold text-primary">Telkom Akses</span>
      <span className="text-xs text-muted-foreground">by Telkom Indonesia</span>
    </div>
  );
}
