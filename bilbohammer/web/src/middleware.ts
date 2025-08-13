export { auth as middleware } from "next-auth";

export const config = {
  matcher: ["/panel/:path*", "/cuenta/:path*"],
};
