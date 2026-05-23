import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const distPath = resolve("dist");

copyFileSync(resolve(distPath, "index.html"), resolve(distPath, "404.html"));
