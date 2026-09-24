import Heading from "@/components/ui/Heading";
import type { FaqItem } from "@/lib/seo";

type Props = {
  items: FaqItem[];
  title?: string;
};

export default function Faq({ items, title = "Frequently asked questions" }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <Heading title={title} variant="h5" as="h2" />
      <div className="divide-y divide-border border-y border-border">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-medium text-foreground">{item.question}</h3>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="pt-2 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
