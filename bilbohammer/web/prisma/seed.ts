import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@bilbohammer.eus";
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      passwordHash
    }
  });
  console.log("Seeded admin user:", email, "(pass: admin123)");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
