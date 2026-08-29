import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";

type PublicPageIntroProps = {
  children?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function PublicPageIntro({
  children,
  description,
  eyebrow,
  title,
}: PublicPageIntroProps) {
  return (
    <main className="flex-1" id="konten-utama">
      <section className="border-line bg-canvas border-b pt-28 pb-14 sm:pt-32 sm:pb-18">
        <Container>
          <div className="max-w-3xl">
            <Badge>{eyebrow}</Badge>
            <h1 className="font-display text-ink mt-4 text-4xl leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="text-muted mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              {description}
            </p>
          </div>
        </Container>
      </section>
      {children}
    </main>
  );
}
