"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteStaffUserAction } from "@/app/actions/adminUserActions";
import Modal from "@/components/modals/Modal";
import Input from "@/components/ui/Input";
import RadioGroup from "@/components/ui/RadioGroup";
import { ROLE_LABELS } from "@/lib/admin/userRoles";
import { STAFF_ROLES } from "@/lib/user/permissions";
import { type InviteStaffInput, inviteStaffSchema } from "@/schemas/adminUsers";

const ROLE_HINTS = {
  FINANCE: "Bookings, invoices, receipts and payouts. Read-only.",
  ADMIN: "Everything, including users and settings.",
} as const;

export default function InviteStaffModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { name: "", email: "", role: "FINANCE" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit((values) => startTransition(async () => {
    const res = await inviteStaffUserAction(values);
    if (!res.success || !res.data) {
      toast.error(res.error || "Couldn't add this user");
      return;
    }
    const { created, needsPassword, emailSent } = res.data;
    const done = `${created ? "Added" : "Updated"} ${values.email}.`;
    if (!needsPassword) toast.success(`${done} They can sign in with their existing password.`);
    else if (emailSent) toast.success(`${done} A setup email is on its way.`);
    else toast.warning(`${done} The setup email couldn't be sent; use Resend invite to try again.`);
    close();
  }));

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={close}
      onSubmitAction={submit}
      title="Add staff"
      actionLabel={isPending ? "Adding…" : "Add staff"}
      disabled={isPending}
      body={(
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Input id="staff-name" label="Name" required autoComplete="name" error={errors.name?.message} {...register("name")} />
          <Input id="staff-email" label="Email" type="email" inputMode="email" required autoComplete="email" error={errors.email?.message} {...register("email")} />
          <fieldset className="space-y-2">
            <legend id="staff-role-label" className="text-sm font-medium text-foreground">Role</legend>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <RadioGroup
                  aria-labelledby="staff-role-label"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role], hint: ROLE_HINTS[role] }))}
                />
              )}
            />
          </fieldset>
          <p className="text-sm text-muted-foreground">
            New users get an email to set their password, then sign in at the admin login.
          </p>
        </form>
      )}
    />
  );
}
