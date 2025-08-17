import { promises as fs } from "fs";
import path from "path";

async function run() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let src = await fs.readFile(schemaPath, "utf8");

  const hasEnumW = /enum\s+FaccionesW40K\b/.test(src);
  const hasEnumA = /enum\s+FaccionesAoS\b/.test(src);
  const hasEnumT = /enum\s+FaccionesTOW\b/.test(src);

  const userModelRe = /(model\s+User\s*{[\s\S]*?)(}\s*)/m;
  const m = src.match(userModelRe);
  if (!m) throw new Error("No se localiza model User en prisma/schema.prisma");

  let userBlock = m[0];
  const beforeClose = userBlock.slice(0, userBlock.lastIndexOf("}"));

  const needW = !/\bfaccionesW40K\b/.test(userBlock);
  const needA = !/\bfaccionesAoS\b/.test(userBlock);
  const needT = !/\bfaccionesTOW\b/.test(userBlock);

  let additions = "";
  if (needW) additions += "  faccionesW40K FaccionesW40K[]\n";
  if (needA) additions += "  faccionesAoS  FaccionesAoS[]\n";
  if (needT) additions += "  faccionesTOW  FaccionesTOW[]\n";

  if (additions) {
    const updatedUser = beforeClose + additions + "}";
    src = src.replace(userModelRe, updatedUser);
  }

  let enumsToAppend = "";
  if (!hasEnumW) {
    enumsToAppend += `
enum FaccionesW40K {
  VOTANN
  SM
  TAU
  NECRONS
  TYRANIDS
}
`;
  }
  if (!hasEnumA) {
    enumsToAppend += `
enum FaccionesAoS {
  STORMCAST
  SLAVES
  ORRUKS
  SOULBLIGHT
}
`;
  }
  if (!hasEnumT) {
    enumsToAppend += `
enum FaccionesTOW {
  EMPIRE
  BRETONNIA
  GREENSkins
  DWARFS
}
`;
  }

  if (enumsToAppend.trim().length > 0) {
    if (!src.endsWith("\n")) src += "\n";
    src += "\n" + enumsToAppend.trim() + "\n";
  }

  await fs.writeFile(schemaPath, src, "utf8");
  console.log("[patch_schema_add_factions] schema.prisma actualizado");
}

run().catch((e) => { console.error(e); process.exit(1); });
