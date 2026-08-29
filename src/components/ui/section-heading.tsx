import { Badge } from "@/components/ui/badge";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
};

export function SectionHeading({
  align = "left",
  description,
  eyebrow,
  tone = "light",
  title,
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "mx-auto items-center text-center" : "items-start";
  const descriptionColor = tone === "dark" ? "text-slate-300" : "text-muted";
  const titleColor = tone === "dark" ? "text-white" : "text-ink";

  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${alignment}`}>
      {eyebrow ? (
        <Badge tone={tone === "dark" ? "neutral" : "brand"}>{eyebrow}</Badge>
      ) : null}
      <h2
        className={`font-display text-3xl leading-[1.05] tracking-[-0.035em] sm:text-4xl ${titleColor}`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`text-base leading-7 ${descriptionColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
