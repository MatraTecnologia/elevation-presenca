import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const path = new URL("../.env", import.meta.url);
let source = readFileSync(path, "utf8");
for (const [key, length] of [["BETTER_AUTH_SECRET", 48], ["ADMIN_PASSWORD", 12]]) source = source.replace(new RegExp(`^${key}=""$`, "m"), `${key}="${randomBytes(length).toString("hex")}"`);
writeFileSync(path, source);
console.log("Segredos locais configurados; valores mantidos no .env.");
