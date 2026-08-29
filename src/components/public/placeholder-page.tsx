import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StateCard } from "@/components/ui/state-card";

type PlaceholderPageProps = {
  action?: { href: string; label: string };
  children?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function PlaceholderPage({
  action,
  children,
  description,
  eyebrow,
  title,
}: PlaceholderPageProps) {
  return (
    <main className="flex-1" id="konten-utama">
      <section className="border-line bg-canvas border-b pt-28 pb-14 sm:pt-32 sm:pb-18">
        <Container>
          <SectionHeading
            description={description}
            eyebrow={eyebrow}
            title={title}
          />
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container className="grid gap-6">
          {children}
          {action ? (
            <ButtonLink className="rounded-full" href={action.href}>
              {action.label}
            </ButtonLink>
          ) : null}
        </Container>
      </section>
    </main>
  );
}

export function ComingSoonState({ description }: { description: string }) {
  return (
    <StateCard
      description={description}
      title="Halaman ini masih disiapkan"
      tone="loading"
    />
  );
}

export function InformationCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Card>
      <h2 className="text-ink text-xl font-bold">{title}</h2>
      <div className="text-muted mt-3 space-y-3 text-sm leading-6">
        {children}
      </div>
    </Card>
  );
}
