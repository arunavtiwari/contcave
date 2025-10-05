import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/email/validate",
      { email },
      {
        headers: {
          accept: "application/json",
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, result: response.data });
  } catch (err: any) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Failed to verify email" });
  }
}
