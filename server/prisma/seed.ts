import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("ChangeMe123!", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@studio.test" },
    update: {},
    create: {
      email: "admin@studio.test",
      passwordHash: adminPassword,
      name: "Yahya Al-Saib"
    }
  });
  console.log(`Admin ready: ${admin.email} (password: ChangeMe123!)`);

  const wedding = await prisma.photoSession.upsert({
    where: { slug: "wedding-of-ahmed-and-sara" },
    update: {},
    create: {
      title: "Wedding of Ahmed & Sara",
      slug: "wedding-of-ahmed-and-sara",
      eventDate: new Date("2026-05-14"),
      location: "Riyadh, Saudi Arabia",
      description: "A beautiful spring wedding at the Al-Khair estate.",
      status: "active"
    }
  });

  const engagement = await prisma.photoSession.upsert({
    where: { slug: "layla-engagement" },
    update: {},
    create: {
      title: "Layla's Engagement",
      slug: "layla-engagement",
      eventDate: new Date("2026-03-02"),
      location: "Jeddah, Saudi Arabia",
      description: "Sunset engagement shoot on the Corniche.",
      status: "draft"
    }
  });

  console.log(`Sessions ready: ${wedding.title}, ${engagement.title}`);

  const weddingClients = [
    { name: "Sara (Bride)", phone: "+971501234567" },
    { name: "Ahmed (Groom)", phone: "+971501234568" },
    { name: "Ahmed's Parents", phone: "+971501234569" }
  ];

  for (const client of weddingClients) {
    await prisma.client.upsert({
      where: { phone: client.phone },
      update: {},
      create: { ...client, sessionId: wedding.id }
    });
  }
  console.log(`${weddingClients.length} clients assigned to ${wedding.title}`);

  await prisma.gallerySettings.upsert({
    where: { sessionId: wedding.id },
    update: {},
    create: {
      sessionId: wedding.id,
      allowDownloads: true,
      watermarkPreviewImages: false,
      hideOriginalFileNames: false,
      passwordProtected: false
    }
  });
  console.log("Gallery settings ready for", wedding.title);

  console.log("Seeding complete.");
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
