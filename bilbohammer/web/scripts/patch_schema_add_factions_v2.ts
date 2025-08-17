import { promises as fs } from "fs";
import path from "path";

// Nuevas listas de enums (deben coincidir con FACTIONS UI -> toEnumKey)
const W40K = [
  "ADEPTA_SORORITAS",
  "ADEPTUS_CUSTODES",
  "ADEPTUS_MECHANICUS",
  "ASTRA_MILITARUM",
  "BLACK_TEMPLARS",
  "BLOOD_ANGELS",
  "CHAOS_DAEMONS",
  "CHAOS_KNIGHTS",
  "CHAOS_MARINES",
  "DARK_ANGELS",
  "DEATHWATCH",
  "DEATH_GUARD",
  "DRUKHARI",
  "ELDARS",
  "EMPERORS_CHILDREN",
  "GENESTEALER_CULTS",
  "GREY_KNIGHTS",
  "IMPERIAL_AGENTS",
  "IMPERIAL_KNIGHTS",
  "LEAGUES_OF_VOTANN",
  "NECRONS",
  "ORCS",
  "SPACE_MARINES",
  "SPACE_WOLVES",
  "TAU",
  "THOUSAND_SONS",
  "TYRANIDS",
  "WORLD_EATERS",
];

const AOS = [
  "STORMCAST",
  "SLAVES_TO_DARKNESS",
  "SOULBLIGHT_GRAVELORDS",
  "IRONJAWZ",
];

const TOW = [
  "EMPIRE",
  "DWARFS",
  "HIGHELVES",
  "CHAOS",
];

function replaceEnum(src: string, enumName: string, values: string[]): string {
  const re = new RegExp(`enum\\s+${enumName}\\s*{[\\s\\S]*?}`, "m");
  const block = `enum ${enumName} {\n  ${values.join("\n  ")}\n}`;
  if (re.test(src)) return src.replace(re, block);
  // append if not found
  return src.trimEnd() + "\n\n" + block + "\n";
}

function ensureUserFields(src: string): string {
  const re = /(model\s+User\s*{[\s\S]*?)(}\s*)/m;
  const m = src.match(re);
  if (!m) throw new Error("No se encontró model User");
  let block = m[0];
  const need = {
    faccionesW40K: !/\bfaccionesW40K\b/.test(block),
    faccionesAoS: !/\bfaccionesAoS\b/.test(block),
    faccionesTOW: !/\bfaccionesTOW\b/.test(block),
  };
  if (!need.faccionesW40K && !need.faccionesAoS && !need.faccionesTOW) return src;
  const beforeClose = block.slice(0, block.lastIndexOf("}"));
  let additions = "";
  if (need.faccionesW40K) additions += "  faccionesW40K FaccionesW40K[]\n";
  if (need.faccionesAoS) additions += "  faccionesAoS  FaccionesAoS[]\n";
  if (need.faccionesTOW) additions += "  faccionesTOW  FaccionesTOW[]\n";
  const updated = beforeClose + additions + "}";
  return src.replace(re, updated);
}

async function run() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let src = await fs.readFile(schemaPath, "utf8");

  src = replaceEnum(src, "FaccionesW40K", W40K);
  src = replaceEnum(src, "FaccionesAoS", AOS);
  src = replaceEnum(src, "FaccionesTOW", TOW);
  src = ensureUserFields(src);

  await fs.writeFile(schemaPath, src, "utf8");
  console.log("[patch_schema_add_factions_v2] schema.prisma actualizado");
}

run().catch((e) => { console.error(e); process.exit(1); });
