import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/env";

const storageRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  env.RESUME_STORAGE_PATH,
);

export const resumeStorage = {
  async put(key: string, data: Buffer) {
    const target = path.resolve(/* turbopackIgnore: true */ storageRoot, key);
    if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Invalid storage key.");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
  },

  async delete(key: string) {
    const target = path.resolve(/* turbopackIgnore: true */ storageRoot, key);
    if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Invalid storage key.");
    await rm(target, { force: true });
  },

  async get(key: string) {
    const target = path.resolve(/* turbopackIgnore: true */ storageRoot, key);
    if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Invalid storage key.");
    return readFile(target);
  },
};
