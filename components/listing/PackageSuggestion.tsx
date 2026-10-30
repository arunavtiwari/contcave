"use client";

import Button from "@/components/ui/Button";
import Callout from "@/components/ui/Callout";
import type { WholeStudioSuggestion } from "@/lib/pricing";
import { pluralize } from "@/lib/strings";
import { formatINR } from "@/lib/utils";
import type { Package } from "@/types/package";

type Props = {
  suggestion: WholeStudioSuggestion;
  onUsePackage: (pkg: Package) => void;
  onBrowsePackages: () => void;
};

export default function PackageSuggestion({ suggestion, onUsePackage, onBrowsePackages }: Props) {
  return (
    <Callout
      title="Booking the whole studio?"
      data-testid="whole-studio-suggestion"
      action={suggestion.kind === "package" ? (
        <Button label="Use this package" onClick={() => onUsePackage(suggestion.package)} size="sm" rounded fit />
      ) : (
        <Button label="See packages" onClick={onBrowsePackages} variant="outline" size="sm" rounded fit />
      )}
    >
      {suggestion.kind === "package"
        ? `${suggestion.package.title} covers every set for the same ${pluralize(Number(suggestion.package.durationHours), "hour")} at ${formatINR(suggestion.price)}. You save ${formatINR(suggestion.savings)}.`
        : "Our packages cover every set."}
    </Callout>
  );
}
