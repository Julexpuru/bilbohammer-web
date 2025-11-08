import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    roles?: string[] | null;
    rol?: string | null; // primer rol para compatibilidad
    nick?: string | null;
    avatarUrl?: string | null;
    oauthAvatarUrl?: string | null;
  }

  interface Session {
    user: {
      id: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[] | null;
      rol?: string | null;
      nick?: string | null;
      avatarUrl?: string | null;
      oauthAvatarUrl?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string | null;
    roles?: string[] | null;
    rol?: string | null;
    nick?: string | null;
    avatarUrl?: string | null;
    oauthAvatarUrl?: string | null;
  }
}
