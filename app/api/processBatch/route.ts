// pages/api/processBatch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { processBatchServer } from '@/app/actions/batch-processing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { areas } = req.body;

  try {
    const result = await processBatchServer(areas);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
