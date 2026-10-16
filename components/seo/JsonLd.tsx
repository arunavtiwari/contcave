import { safeJsonLd } from "@/lib/safeJsonLd";

type Props = {
  id?: string;
  data: unknown;
};

export default function JsonLd({ id, data }: Props) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
