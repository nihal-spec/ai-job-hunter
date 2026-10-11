import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ObjectStorage } from "@/server/storage/contracts";

/** Development-only storage. Files live on local disk, which does not persist on serverless/ephemeral hosts — use STORAGE_PROVIDER=s3 in production. */
export function createLocalStorage(storageRoot: string): ObjectStorage {
  const root = path.resolve(/* turbopackIgnore: true */ storageRoot);

  function resolveKey(key: string) {
    const target = path.resolve(/* turbopackIgnore: true */ root, key);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage key.");
    return target;
  }

  return {
    async put(key, data) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data, { flag: "wx" });
    },
    async delete(key) {
      await rm(resolveKey(key), { force: true });
    },
    async get(key) {
      return readFile(resolveKey(key));
    },
  };
}
