// src/middleware.ts — usa la versión Edge sin Prisma
export { auth as middleware } from "@/lib/auth-edge";

export const config = {
  matcher: ["/mi-perfil", "/profile", "/api/members/:path*"],
};
