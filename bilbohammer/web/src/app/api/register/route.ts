import { POST as registerPost } from "@/app/api/auth/register/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = registerPost;
