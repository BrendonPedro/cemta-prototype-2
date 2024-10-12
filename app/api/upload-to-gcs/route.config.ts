// app/api/upload-to-gcs/route.config.ts

import type { NextConfig } from 'next'

export const config: NextConfig = {
  api: {
    bodyParser: false,
  },
}