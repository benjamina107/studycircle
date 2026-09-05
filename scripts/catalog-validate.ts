import { readFile, stat } from "node:fs/promises";
import { validateCatalog } from "../src/lib/catalog-validation";

// Intentionally no environment loading, Supabase imports, or network operations.
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith("--")) {
    throw new Error("Usage: npm run catalog:validate -- <catalog.json>");
  }
  const info = await stat(args[0]);
  if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new Error("Catalog must be a regular file of 10 MB or less.");
  const bytes = await readFile(args[0]);
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Catalog must be 10 MB or less.");
  let input: unknown;
  try { input = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Catalog is not valid JSON."); }
  const catalog = validateCatalog(input);
  const sections = catalog.courses.flatMap(course => course.sections);
  const professors = new Set(sections.map(section => section.professor_key));
  console.log(`Valid ${catalog.source.kind} catalog: ${catalog.term}`);
  console.log(`${catalog.courses.length} courses, ${sections.length} sections, ${professors.size} professors.`);
  console.log(`Teaching dates: ${catalog.starts_on} through ${catalog.ends_on}.`);
  console.log("Offline validation only. Source accuracy is not verified; no data was imported.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog validation failed.");
  process.exitCode = 1;
});
