// web/prisma.config.ts
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  // Si quieres cambiar output de Client o datasources, hazlo aquí
});