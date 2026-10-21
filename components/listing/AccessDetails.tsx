import { floorLabel, type ListingAccess, PARKING_LABELS, type ParkingType } from "@/lib/listing/equipment";
import { cn } from "@/lib/utils";

const LIFT_LABELS: Record<string, string> = {
    none: "No lift",
    passenger: "Passenger lift",
    goods: "Goods lift",
};

/** "Access and load-in" rows shown beside the map. Any unknown (null) value is left out. */
export default function AccessDetails({ access }: { access: ListingAccess }) {
    const rows: Array<{ label: string; value: string; warning?: boolean }> = [];

    if (access.floor != null) rows.push({ label: "Floor", value: floorLabel(access.floor) });
    if (access.lift) {
        rows.push({ label: "Lift", value: LIFT_LABELS[access.lift] ?? access.lift, warning: access.lift === "none" });
        rows.push({
            label: "Goods lift",
            value: access.lift === "goods" ? "Yes" : "No goods lift",
            warning: access.lift !== "goods",
        });
    }
    if (access.parking) {
        rows.push({ label: "Parking", value: PARKING_LABELS[access.parking as ParkingType] ?? access.parking });
    }
    if (access.vehicleLoadIn != null) {
        rows.push({ label: "Drive-up load-in", value: access.vehicleLoadIn ? "Yes" : "No" });
    }
    if (access.loadInNote?.trim()) rows.push({ label: "Load-in note", value: access.loadInNote.trim() });

    if (rows.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">Access and load-in</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-border p-4 text-sm">
                {rows.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className={cn("text-foreground", row.warning && "font-medium text-warning")}>{row.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
