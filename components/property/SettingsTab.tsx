"use client";

import React from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

interface SettingsTabProps {
  setIsDeleteModalOpen: (open: boolean) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ setIsDeleteModalOpen }) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-8 min-h-150">
      <Heading title="Property Settings" subtitle="Manage your property settings and danger zone actions" />

      <div className="flex flex-col gap-4 p-6 border-2 border-destructive/20 rounded-xl bg-destructive/10">
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Warning:</span> Deleting your property will permanently remove all your
          data and cannot be undone. This action is irreversible.
        </p>
        <div className="w-fit">
          <Button
            label="DELETE PROPERTY"
            onClick={() => setIsDeleteModalOpen(true)}
            outline
            rounded
            className="px-6 border-2 border-destructive text-destructive hover:bg-destructive hover:text-background"
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
