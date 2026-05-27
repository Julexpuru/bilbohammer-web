import { NextResponse } from "next/server";
import { getW40kLayoutCatalog } from "@/lib/labrador-layout-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getW40kLayoutCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("[w40k-layout-catalog] Error", error);
    return NextResponse.json({ error: "No se pudo cargar el catálogo de layouts de 40K." }, { status: 502 });
  }
}
