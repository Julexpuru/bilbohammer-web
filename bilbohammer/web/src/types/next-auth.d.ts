import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    rol?: string | null;
    nick?: string | null;
  }

  interface Session {
    user: {
      id: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      rol?: string | null;
      nick?: string | null;
    };
  }
}
