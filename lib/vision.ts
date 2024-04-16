import vision from '@google-cloud/vision';

let visionClient: vision.ImageAnnotatorClient | null = null;

export const getVisionClient = () => {
  if (!visionClient) {
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
  return visionClient;
};