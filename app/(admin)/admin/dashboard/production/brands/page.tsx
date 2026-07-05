import { getClientBrands } from "@/app/actions/getProductionData";

import BrandForm from "./BrandForm";

export const dynamic = "force-dynamic";

export default async function ClientBrandsPage() {
    const brands = await getClientBrands();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Client brands</h1>
                <p className="text-sm text-muted-foreground">
                    Each brand gets a tokenised intake link — share it to receive briefs. Add a phone
                    number to enable WhatsApp quotes via Hermes.
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                {brands.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">No brands yet — add one below.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border bg-neutral-50 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">City</th>
                                <th className="px-4 py-3 font-medium">Phone</th>
                                <th className="px-4 py-3 font-medium">Intake link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map((b) => (
                                <tr key={b.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-3 font-medium">{b.name}</td>
                                    <td className="px-4 py-3">{b.category ?? "—"}</td>
                                    <td className="px-4 py-3">{b.city ?? "—"}</td>
                                    <td className="px-4 py-3">{b.contact?.phone ?? "—"}</td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        <a
                                            className="text-blue-600 hover:underline"
                                            href={`/submit/${b.intakeToken}`}
                                            target="_blank"
                                        >
                                            /submit/{b.intakeToken}
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <BrandForm />
        </div>
    );
}
