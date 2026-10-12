"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { getIpLocation } from "@/lib/http/requestMeta";

export const getVisitorLocationAction = createAction(z.object({}), {}, async () => {
    const headerList = await headers();
    return getIpLocation(headerList);
});
