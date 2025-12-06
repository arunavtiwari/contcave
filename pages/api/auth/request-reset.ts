import prisma from "@/lib/prismadb";
import { sendTemplateEmail } from "@/lib/email/mailer";
import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.email) {
            return res.status(200).json({ message: "If an account exists, a reset email has been sent." });
        }


        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

        const TEMPLATE_ID = process.env.MS_TPL_RESET_PASSWORD!;

        await sendTemplateEmail({
            toEmail: user.email,
            toName: user.name || "User",
            templateId: TEMPLATE_ID,
            data: {
                reset_url: resetUrl,
                user_name: user.name || "User",
            },
        });

        return res.status(200).json({ message: "If an account exists, a reset email has been sent." });
    } catch (error) {
        console.error("RESET_PASSWORD_ERROR", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
