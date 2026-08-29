import { Card } from "@/components/ui/card";

type StateTone = "empty" | "error" | "loading" | "success";

const toneClasses: Record<StateTone, string> = {
  empty: "bg-brand-soft text-brand",
  error: "bg-danger-soft text-danger",
  loading: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
};

type StateCardProps = {
  description: string;
  title: string;
  tone?: StateTone;
};

export function StateCard({
  description,
  title,
  tone = "empty",
}: StateCardProps) {
  const symbol = { empty: "—", error: "!", loading: "…", success: "✓" }[tone];

  return (
    <Card className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${toneClasses[tone]}`}
      >
        {symbol}
      </span>
      <div className="space-y-1">
        <h2 className="text-ink text-lg font-bold">{title}</h2>
        <p className="text-muted text-sm leading-6">{description}</p>
      </div>
    </Card>
  );
}
