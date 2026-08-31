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
  /**
   * `h2` suits the common case, where the card sits under a page heading.
   * Standalone state pages (loading, not-found, error) have no other heading,
   * so they pass `h1` to keep one clear top-level heading per page as required
   * by docs/UX_UI_DESIGN_SYSTEM.md section 11.
   */
  headingLevel?: "h1" | "h2" | "h3";
  title: string;
  tone?: StateTone;
};

export function StateCard({
  description,
  headingLevel: Heading = "h2",
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
        <Heading className="text-ink text-lg font-bold">{title}</Heading>
        <p className="text-muted text-sm leading-6">{description}</p>
      </div>
    </Card>
  );
}
