import { FaccionesW40K, FaccionesAoS, FaccionesTOW } from "@prisma/client";

// Devuelve los nombres de cada enum tal y como están en Prisma (VOTANN, SM, ...)
export const PRISMA_W40K = Object.keys(FaccionesW40K) as Array<keyof typeof FaccionesW40K>;
export const PRISMA_AOS  = Object.keys(FaccionesAoS)  as Array<keyof typeof FaccionesAoS>;
export const PRISMA_TOW  = Object.keys(FaccionesTOW)  as Array<keyof typeof FaccionesTOW>;
