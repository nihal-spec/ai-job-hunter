import { createHash, createHmac } from "node:crypto";

import type { ObjectStorage } from "@/server/storage/contracts";

/**
 * Minimal AWS SigV4-signed S3-compatible client (works against AWS S3, Cloudflare R2, or any
 * other S3-compatible provider). Implemented with `fetch` + `node:crypto` rather than the AWS
 * SDK, matching this codebase's existing convention of hand-rolled adapters (see
 * `src/server/jobs/sources/greenhouse.ts`) and avoiding a heavy dependency for three HTTP verbs.
 * Only server-to-server put/get/delete are needed — resumes are never served via a public URL.
 */
export type S3StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function hash(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function amzDate(date: Date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

export function createS3Storage(config: S3StorageConfig, fetcher: typeof fetch = fetch): ObjectStorage {
  const endpointUrl = new URL(config.endpoint);
  const host = config.forcePathStyle ? endpointUrl.host : `${config.bucket}.${endpointUrl.host}`;

  function objectUrl(key: string) {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const pathPrefix = config.forcePathStyle ? `/${config.bucket}` : "";
    return new URL(`${endpointUrl.protocol}//${host}${pathPrefix}/${encodedKey}`);
  }

  async function signedRequest(method: string, key: string, body?: Buffer) {
    const url = objectUrl(key);
    const now = new Date();
    const { amzDate: amz, dateStamp } = amzDate(now);
    const payloadHash = body ? hash(body) : hash(Buffer.alloc(0));

    const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
      method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amz,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const signature = hmac(signingKey(config.secretAccessKey, dateStamp, config.region), stringToSign).toString(
      "hex",
    );

    const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetcher(url, {
      method,
      headers: {
        host: url.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amz,
        authorization,
      },
      body: body ? new Uint8Array(body) : undefined,
    });
  }

  return {
    async put(key, data) {
      const response = await signedRequest("PUT", key, data);
      if (!response.ok) throw new Error(`S3 upload failed with HTTP ${response.status}.`);
    },
    async get(key) {
      const response = await signedRequest("GET", key);
      if (!response.ok) throw new Error(`S3 download failed with HTTP ${response.status}.`);
      return Buffer.from(await response.arrayBuffer());
    },
    async delete(key) {
      const response = await signedRequest("DELETE", key);
      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 delete failed with HTTP ${response.status}.`);
      }
    },
  };
}
