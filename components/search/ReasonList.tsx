import { IoCheckmarkCircle } from "react-icons/io5";

export default function ReasonList({ items }: { items: string[] }) {
    if (!items.length) return null;
    return (
        <ul className="space-y-0.5">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                    <IoCheckmarkCircle className="mt-0.5 shrink-0 text-success" aria-hidden />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}
