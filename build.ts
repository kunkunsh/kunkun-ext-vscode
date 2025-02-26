import { watch } from "fs";
import { join } from "path";
import { refreshTemplateWorkerCommand } from "@kksh/api/dev";
import { $ } from "bun";

const filenames = ["recent-workspaces.ts", "project-manager.ts"];

async function build() {
  for (const filename of filenames) {
    await $`bun build --minify --target=browser --outdir=./dist ./src/${filename}`;
  }
  await refreshTemplateWorkerCommand();
}

const srcDir = join(import.meta.dir, "src");

await build();

if (Bun.argv.includes("dev")) {
  console.log(`Watching ${srcDir} for changes...`);
  watch(srcDir, { recursive: true }, async (event, filename) => {
    await build();
  });
}
