import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

export interface LegalSection {
  title: string;
  body?: string;
  items?: string[];
}

export function LegalShell({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container-wide flex h-16 items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-normal">
            Co-Op
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft weight="bold" className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="container-tight py-14">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-foreground text-background">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-normal sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{intro}</p>
        </div>
      </section>
      <article className="container-tight py-12">
        <div className="space-y-10">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="font-serif text-2xl font-semibold tracking-normal">
                {index + 1}. {section.title}
              </h2>
              {section.body && (
                <p className="mt-4 leading-8 text-muted-foreground">{section.body}</p>
              )}
              {section.items && (
                <ul className="mt-4 space-y-3 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 leading-7">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <p className="mt-12 rounded-lg border border-border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
          This page describes the current Co-Op product boundary and customer responsibilities. A
          signed agreement, order form, or required regional notice may add terms for a specific
          customer relationship.
        </p>
      </article>
    </main>
  );
}
