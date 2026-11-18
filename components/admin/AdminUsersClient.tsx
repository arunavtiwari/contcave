"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FiMail, FiUserPlus } from "react-icons/fi";
import { toast } from "sonner";

import { type AdminUserRow, type AdminUsersPageData, changeUserRoleAction, resendStaffInviteAction } from "@/app/actions/adminUserActions";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminTabs from "@/components/admin/AdminTabs";
import InviteStaffModal from "@/components/admin/InviteStaffModal";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import SearchInput from "@/components/ui/SearchInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/components/ui/Table";
import { ROLE_LABELS, roleAfter, type RoleChange, USER_ROLE_TABS, type UserRoleTab } from "@/lib/admin/userRoles";
import { USERS_PATH, usersHref } from "@/lib/admin/usersHref";
import { isStaff } from "@/lib/user/permissions";
import { formatISTDate } from "@/lib/utils";

type Props = AdminUsersPageData & { search: string; currentUserId: string };

type PendingChange = { user: AdminUserRow; change: RoleChange };

const TAB_LABELS: Record<UserRoleTab, string> = {
  all: "All",
  ADMIN: "Admins",
  FINANCE: "Finance",
  OWNER: "Owners",
  CUSTOMER: "Customers",
};

/** The role changes an admin can make from a row: grants first, then removing staff access. */
function changesFor(user: AdminUserRow): RoleChange[] {
  const grants = (["FINANCE", "ADMIN"] as const).filter(
    (role) => role !== user.role && !(role === "FINANCE" && user.listingCount > 0)
  );
  return isStaff(user.role) ? [...grants, "revoke"] : grants;
}

const changeLabel = (change: RoleChange) =>
  change === "revoke" ? "Remove staff access" : `Make ${ROLE_LABELS[change].toLowerCase()}`;

const displayName = (user: AdminUserRow) => user.name || user.email || "This user";

export default function AdminUsersClient({ users, total, page, pageSize, tab, tabCounts, search, currentUserId }: Props) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [isSaving, startSaving] = useTransition();

  const confirmChange = () => {
    if (!pending) return;
    const { user, change } = pending;
    startSaving(async () => {
      const res = await changeUserRoleAction({ userId: user.id, change });
      if (!res.success) {
        toast.error(res.error || "Couldn't change the role");
        return;
      }
      toast.success(`${displayName(user)} is now ${ROLE_LABELS[roleAfter(change, user.listingCount > 0)].toLowerCase()}.`);
      setPending(null);
      router.refresh();
    });
  };

  const resendInvite = (user: AdminUserRow) =>
    startSaving(async () => {
      const res = await resendStaffInviteAction({ userId: user.id });
      if (res.success) toast.success(`Setup email sent to ${user.email}.`);
      else toast.error(res.error || "Couldn't send the email");
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button label="Add staff" icon={FiUserPlus} fit size="sm" onClick={() => setIsInviteOpen(true)} />
      </div>

      <AdminFilterBar
        tabs={(
          <AdminTabs
            activeId={tab}
            ariaLabel="Filter users by role"
            items={USER_ROLE_TABS.map((id) => ({
              id,
              label: TAB_LABELS[id],
              count: tabCounts[id],
              href: usersHref({ tab: id, q: search }),
            }))}
          />
        )}
      >
        <form action={USERS_PATH} method="get" role="search" className="sm:w-80">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <SearchInput
            id="user-search"
            name="q"
            aria-label="Search users"
            defaultValue={search}
            placeholder="Search by name, email or phone"
          />
        </form>
      </AdminFilterBar>

      <Table
        footer={(
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            label="users"
            hrefForPage={(nextPage, nextSize) => usersHref({ tab, page: nextPage, pageSize: nextSize ?? pageSize, q: search })}
          />
        )}
      >
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-center">Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                {search ? `No users match "${search}".` : "No users here yet."}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              const invitePending = isStaff(user.role) && !user.hasPassword;
              return (
                <TableRow key={user.id} data-testid="user-row">
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {user.name || "—"}
                      {isSelf && <span className="text-muted-foreground"> (you)</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email || "No email"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{user.phone || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Pill label={ROLE_LABELS[user.role]} variant={isStaff(user.role) ? "solid" : "subtle"} size="xs" />
                    {invitePending && <div className="mt-1 text-xs text-muted-foreground">Invite pending</div>}
                  </TableCell>
                  <TableCell className="text-sm">{formatISTDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {!isSelf && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {invitePending && user.email && (
                          <Button
                            label="Resend invite"
                            icon={FiMail}
                            size="sm"
                            outline
                            fit
                            disabled={isSaving}
                            onClick={() => resendInvite(user)}
                          />
                        )}
                        {changesFor(user).map((change) => (
                          <Button
                            key={change}
                            label={changeLabel(change)}
                            size="sm"
                            outline
                            fit
                            disabled={isSaving}
                            onClick={() => setPending({ user, change })}
                          />
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <InviteStaffModal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          router.refresh();
        }}
      />

      <Modal
        isOpen={pending !== null}
        onCloseAction={() => setPending(null)}
        onSubmitAction={confirmChange}
        title={pending ? changeLabel(pending.change) : ""}
        actionLabel={isSaving ? "Saving…" : "Confirm"}
        disabled={isSaving}
        body={pending ? (
          <p className="text-base text-foreground">
            {displayName(pending.user)} will become{" "}
            <strong>{ROLE_LABELS[roleAfter(pending.change, pending.user.listingCount > 0)].toLowerCase()}</strong>
            {pending.change === "revoke" ? " and lose access to the admin panel." : "."} The change applies the next time
            they open a page.
          </p>
        ) : undefined}
      />
    </div>
  );
}
