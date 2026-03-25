import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_OWNER = {
  email: process.env.TEST_OWNER_EMAIL ?? "e2e-owner@contcave.local",
  password: process.env.TEST_OWNER_PASSWORD ?? "TestOwner123!",
  name: process.env.TEST_OWNER_NAME ?? "E2E Test Owner",
  phone: process.env.TEST_OWNER_PHONE ?? "9876543210",
};

async function main() {
  const hashedPassword = await bcrypt.hash(TEST_OWNER.password, 12);

  const user = await prisma.user.upsert({
    where: { email: TEST_OWNER.email.toLowerCase() },
    update: {
      name: TEST_OWNER.name,
      phone: TEST_OWNER.phone,
      hashedPassword,
      is_owner: true,
      is_verified: true,
      phone_verified: true,
      email_verified: true,
      verified_via: ["seed_test_owner"],
      verified_at: new Date(),
    },
    create: {
      email: TEST_OWNER.email.toLowerCase(),
      name: TEST_OWNER.name,
      phone: TEST_OWNER.phone,
      hashedPassword,
      is_owner: true,
      is_verified: true,
      phone_verified: true,
      email_verified: true,
      verified_via: ["seed_test_owner"],
      verified_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      is_owner: true,
      is_verified: true,
      phone_verified: true,
      email_verified: true,
    },
  });

  console.log("Seeded test owner:");
  console.log(JSON.stringify({ ...user, password: TEST_OWNER.password }, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to seed test owner");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
