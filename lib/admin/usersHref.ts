import type { UserRoleTab } from "@/lib/admin/userRoles";

export const USERS_PATH = "/admin/dashboard/users";

export function usersHref({ tab, page = 1, pageSize, q }: { tab: UserRoleTab; page?: number; pageSize?: number; q?: string }) {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    if (page > 1) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    if (q?.trim()) params.set("q", q.trim());
    const query = params.toString();
    return query ? `${USERS_PATH}?${query}` : USERS_PATH;
}
