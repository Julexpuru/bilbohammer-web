type DeploymentInfo = {
  id: string;
  label: string;
};

type LayoutInfo = {
  id: string;
  label: string;
  deploymentId: string;
  deploymentLabel: string;
  shareUrl: string;
};

type MapPackInfo = {
  id: string;
  label: string;
  deployments: Array<DeploymentInfo & { layouts: LayoutInfo[] }>;
};

export type W40kLayoutCatalog = {
  source: {
    pageUrl: string;
    appEntryUrl: string;
    nodeUrl: string;
    deploymentsChunkUrl: string;
  };
  fetchedAt: string;
  mapPacks: MapPackInfo[];
};

const LABRADOR_PAGE_URL = "https://labrador.dev/40k_layouts";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

let cachedCatalog: { expiresAt: number; data: W40kLayoutCatalog } | null = null;

function assertString(value: string | undefined, message: string): string {
  if (!value) throw new Error(message);
  return value;
}

function resolveAssetUrl(baseUrl: string, relativePath: string) {
  return new URL(relativePath, baseUrl).toString();
}

function parseAppEntryPath(html: string) {
  const match = html.match(/import\("(\.\/_app\/immutable\/entry\/app\.[^"]+\.js)"\)/);
  return match?.[1];
}

function parseNodeScriptPath(appScript: string) {
  const match = appScript.match(/"\.\.\/nodes\/3\.[^"]+\.js"/);
  return match?.[0].slice(1, -1);
}

function parseDeploymentImport(nodeScript: string) {
  const match = nodeScript.match(
    /import\{a as ([A-Z]),c as [A-Za-z_$][\w$]*,i as ([A-Z]),n as ([A-Z]),o as ([A-Z]),r as ([A-Z]),t as ([A-Z])\}from"(\.\.\/chunks\/[^"]+\.js)"/
  );
  if (!match) {
    throw new Error("No se pudo localizar el bloque de imports de deployment.");
  }
  return {
    chunkPath: match[7],
    aliasesByExportName: {
      a: match[1],
      i: match[2],
      n: match[3],
      o: match[4],
      r: match[5],
      t: match[6],
    },
  } as const;
}

function parseStrikeForceDeployments(chunkScript: string, aliasesByExportName: Record<string, string>) {
  const symbolByExportName = new Map<string, string>();
  const exportBlock = chunkScript.match(/export\{([^}]+)\};/);
  if (!exportBlock?.[1]) throw new Error("No se pudo parsear export map del chunk de deployments.");

  const exportRegex = /([A-Za-z_$][\w$]*) as ([a-z])/g;
  for (const item of exportBlock[1].matchAll(exportRegex)) {
    symbolByExportName.set(item[2], item[1]);
  }

  const deploymentBySymbol = new Map<string, DeploymentInfo>();
  const deploymentRegex = /([A-Za-z_$][\w$]*)=\{id:`([^`]+)`,label:`([^`]+)`,[^}]*format:`strike-force`/g;
  for (const item of chunkScript.matchAll(deploymentRegex)) {
    deploymentBySymbol.set(item[1], { id: item[2], label: item[3] });
  }

  const result = new Map<string, DeploymentInfo>();
  for (const [exportName, alias] of Object.entries(aliasesByExportName)) {
    const symbol = symbolByExportName.get(exportName);
    if (!symbol) continue;
    const deployment = deploymentBySymbol.get(symbol);
    if (!deployment) continue;
    result.set(alias, deployment);
  }
  return result;
}

function parseMapPackEnumValues(nodeScript: string, enumVar: string) {
  const enumBlock = nodeScript.match(new RegExp(`${enumVar}=function\\(e\\)\\{return([^}]+)\\}\\(\\{\\}\\)`));
  if (!enumBlock?.[1]) throw new Error("No se pudo parsear enum de map packs.");
  const values = new Map<string, string>();
  const pairRegex = /e\.([A-Z0-9_]+)=`([^`]+)`/g;
  for (const item of enumBlock[1].matchAll(pairRegex)) {
    values.set(item[1], item[2]);
  }
  return values;
}

function parseMapPackEntries(nodeScript: string) {
  const entries: Array<{ label: string; enumVar: string; enumKey: string }> = [];
  const regex = /\{label:`([^`]+)`[^}]*id:([A-Za-z_$][\w$]*)\.([A-Z0-9_]+)\}/g;
  for (const item of nodeScript.matchAll(regex)) {
    entries.push({ label: item[1], enumVar: item[2], enumKey: item[3] });
  }
  if (entries.length === 0) throw new Error("No se encontraron map packs en el script.");
  return entries;
}

function parseLayoutVarByMapPackKey(nodeScript: string, enumVar: string) {
  const map = new Map<string, string>();
  const switchCaseRegex = new RegExp(`case ${enumVar}\\.([A-Z0-9_]+):return ([A-Za-z_$][\\w$]*)`, "g");
  for (const item of nodeScript.matchAll(switchCaseRegex)) {
    map.set(item[1], item[2]);
  }
  return map;
}

function parseLayoutListByVar(nodeScript: string, varName: string, deploymentByAlias: Map<string, DeploymentInfo>) {
  const mappedPattern = new RegExp(`${varName}=([A-Za-z_$][\\w$]*)\\.map\\(e=>\\[(.*?)\\]\\)\\.flat\\(\\)`);
  const mappedMatch = nodeScript.match(mappedPattern);
  if (mappedMatch?.[1] && mappedMatch[2]) {
    const deploymentArrayVar = mappedMatch[1];
    const deploymentArrayMatch = nodeScript.match(new RegExp(`${deploymentArrayVar}=\\[([^\\]]+)\\]`));
    const deploymentAliases = deploymentArrayMatch?.[1]
      ? deploymentArrayMatch[1]
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
    const templateLayouts = Array.from(mappedMatch[2].matchAll(/I\(`([^`]+)`,`([^`]+)`,[^,]+,e\)/g)).map((entry) => ({
      idTemplate: entry[1],
      label: entry[2],
    }));
    const hydrated: Array<{ id: string; label: string; deploymentAlias: string }> = [];
    for (const alias of deploymentAliases) {
      const deployment = deploymentByAlias.get(alias);
      if (!deployment) continue;
      for (const layout of templateLayouts) {
        hydrated.push({
          id: layout.idTemplate.replace(/\$\{e\.id\}/g, deployment.id),
          label: layout.label,
          deploymentAlias: alias,
        });
      }
    }
    return hydrated;
  }

  const marker = `${varName}=[`;
  const start = nodeScript.indexOf(marker);
  if (start < 0) return [];

  let cursor = start + marker.length;
  let depth = 1;
  while (cursor < nodeScript.length && depth > 0) {
    const ch = nodeScript[cursor];
    if (ch === "[") depth += 1;
    if (ch === "]") depth -= 1;
    cursor += 1;
  }
  const body = nodeScript.slice(start + marker.length, cursor - 1);
  const layouts: Array<{ id: string; label: string; deploymentAlias: string }> = [];
  const layoutRegex = /I\(`([^`]+)`,`([^`]+)`,[^,]+,([A-Z])\)/g;
  for (const item of body.matchAll(layoutRegex)) {
    layouts.push({ id: item[1], label: item[2], deploymentAlias: item[3] });
  }
  return layouts;
}

function buildShareUrl(mapPackId: string, deploymentId: string, layoutId: string) {
  const url = new URL(LABRADOR_PAGE_URL);
  url.searchParams.set("mapPack", mapPackId);
  url.searchParams.set("deployment", deploymentId);
  url.searchParams.set("layout", layoutId);
  return url.toString();
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo descargar ${url} (${res.status}).`);
  }
  return res.text();
}

async function fetchCatalogFromLabrador(): Promise<W40kLayoutCatalog> {
  const pageHtml = await fetchText(LABRADOR_PAGE_URL);
  const appEntryPath = assertString(parseAppEntryPath(pageHtml), "No se encontró app entry en Labrador.");
  const appEntryUrl = resolveAssetUrl(LABRADOR_PAGE_URL, appEntryPath);

  const appEntryScript = await fetchText(appEntryUrl);
  const nodePath = assertString(parseNodeScriptPath(appEntryScript), "No se encontró node 3 en Labrador app entry.");
  const nodeUrl = resolveAssetUrl(appEntryUrl, nodePath);
  const nodeScript = await fetchText(nodeUrl);

  const deploymentImport = parseDeploymentImport(nodeScript);
  const deploymentsChunkUrl = resolveAssetUrl(nodeUrl, deploymentImport.chunkPath);
  const deploymentsChunkScript = await fetchText(deploymentsChunkUrl);
  const deploymentByAlias = parseStrikeForceDeployments(
    deploymentsChunkScript,
    deploymentImport.aliasesByExportName
  );

  const mapPackEntries = parseMapPackEntries(nodeScript);
  const mapPackEnumVar = mapPackEntries[0]?.enumVar;
  const mapPackEnum = parseMapPackEnumValues(nodeScript, mapPackEnumVar);
  const layoutVarByMapPackKey = parseLayoutVarByMapPackKey(nodeScript, mapPackEnumVar);

  const mapPacks: MapPackInfo[] = mapPackEntries
    .map((entry) => {
      const mapPackId = mapPackEnum.get(entry.enumKey);
      const layoutVar = layoutVarByMapPackKey.get(entry.enumKey);
      if (!mapPackId || !layoutVar) return null;

      const rawLayouts = parseLayoutListByVar(nodeScript, layoutVar, deploymentByAlias);
      const deploymentGroups = new Map<string, DeploymentInfo & { layouts: LayoutInfo[] }>();

      for (const raw of rawLayouts) {
        const deployment = deploymentByAlias.get(raw.deploymentAlias);
        if (!deployment) continue;
        if (!deploymentGroups.has(deployment.id)) {
          deploymentGroups.set(deployment.id, { ...deployment, layouts: [] });
        }
        const group = deploymentGroups.get(deployment.id);
        group?.layouts.push({
          id: raw.id,
          label: raw.label,
          deploymentId: deployment.id,
          deploymentLabel: deployment.label,
          shareUrl: buildShareUrl(mapPackId, deployment.id, raw.id),
        });
      }

      const deployments = Array.from(deploymentGroups.values()).map((group) => ({
        ...group,
        layouts: group.layouts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
      }));

      return {
        id: mapPackId,
        label: entry.label,
        deployments,
      };
    })
    .filter((entry): entry is MapPackInfo => Boolean(entry));

  if (mapPacks.length === 0) throw new Error("No se pudo construir el catálogo de layouts de Labrador.");

  return {
    source: {
      pageUrl: LABRADOR_PAGE_URL,
      appEntryUrl,
      nodeUrl,
      deploymentsChunkUrl,
    },
    fetchedAt: new Date().toISOString(),
    mapPacks,
  };
}

export async function getW40kLayoutCatalog() {
  const now = Date.now();
  if (cachedCatalog && now < cachedCatalog.expiresAt) return cachedCatalog.data;

  const data = await fetchCatalogFromLabrador();
  cachedCatalog = {
    data,
    expiresAt: now + CACHE_TTL_MS,
  };
  return data;
}
