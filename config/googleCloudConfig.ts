// config/googleCloudConfig.ts
import { Storage } from '@google-cloud/storage';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId) {
  throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID environment variable');
}

if (!keyFilename) {
  throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS environment variable');
}

const storage = new Storage({
  projectId,
  keyFilename,
});

const documentAiClient = new DocumentProcessorServiceClient({
  keyFilename,
});

const labeledBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET_LABELED;
const unlabeledBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

if (!labeledBucketName) {
  throw new Error('Missing GOOGLE_CLOUD_STORAGE_BUCKET_LABELED environment variable');
}

if (!unlabeledBucketName) {
  throw new Error('Missing GOOGLE_CLOUD_STORAGE_BUCKET environment variable');
}

const labeledBucket = storage.bucket(labeledBucketName);
const unlabeledBucket = storage.bucket(unlabeledBucketName);

export { storage, documentAiClient, labeledBucket, unlabeledBucket };

// // googleCloudConfig.ts
// import { Storage } from '@google-cloud/storage';
// import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
// const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// if (!projectId) {
//   throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID environment variable');
// }

// if (!keyFilename) {
//   throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS environment variable');
// }

// const storage = new Storage({
//   projectId,
//   keyFilename,
// });

// const documentAiClient = new DocumentProcessorServiceClient({
//   projectId,
//   keyFilename,
// });

// const labeledBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET_LABELED;
// const unlabeledBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

// if (!labeledBucketName) {
//   throw new Error('Missing GOOGLE_CLOUD_STORAGE_BUCKET_LABELED environment variable');
// }

// if (!unlabeledBucketName) {
//   throw new Error('Missing GOOGLE_CLOUD_STORAGE_BUCKET environment variable');
// }

// const labeledBucket = storage.bucket(labeledBucketName);
// const unlabeledBucket = storage.bucket(unlabeledBucketName);

// export { storage, documentAiClient, labeledBucket, unlabeledBucket };
