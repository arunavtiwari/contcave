import Link from "next/link";

export type ExploreLink = { href: string; label: string; description?: string };

type Props = {
  id: string;
  title: string;
  links: ExploreLink[];
  className?: string;
};

export default function ExploreLinks({ id, title, links, className }: Props) {
  if (links.length === 0) return null;

  return (
    <nav aria-labelledby={id} className={className}>
      <h2 id={id} className="mb-5 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="group flex flex-col">
              <span className="text-sm font-medium text-foreground group-hover:underline">{link.label}</span>
              {link.description && <span className="text-sm text-muted-foreground">{link.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
