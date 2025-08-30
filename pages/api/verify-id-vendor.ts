import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { refId, otp } = req.body;
    const resp = await axios.post(
      'https://sandbox.cashfree.com/verification/offline-aadhaar/verify',
      { ref_id: refId, otp },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        },
      }
    );
    res.status(200).json(resp.data);
  } catch (err: any) {
    console.error(err);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
}
