import prisma from "@/lib/prismadb";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }

    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: "Missing token or password" });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("RESET_PASSWORD_CONFIRM_ERROR", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
