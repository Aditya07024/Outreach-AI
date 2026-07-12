import prisma from './src/utils/prisma';

async function main() {
  console.log("--- TESTING SETTINGS INSERT ---");
  try {
    const settings = await prisma.settings.create({
      data: { id: 100, name: "Test Settings" }
    });
    console.log("Success creating Settings:", settings);
    await prisma.settings.delete({ where: { id: 100 } });
    console.log("Deleted Settings test record successfully");
  } catch (err) {
    console.error("Error creating Settings:", err);
  }

  console.log("\n--- TESTING GMAIL CREDENTIALS INSERT ---");
  try {
    const creds = await prisma.gmailCredentials.create({
      data: {
        id: 100,
        email: "test@example.com",
        accessToken: "encrypted-token"
      }
    });
    console.log("Success creating GmailCredentials:", creds);
    await prisma.gmailCredentials.delete({ where: { id: 100 } });
    console.log("Deleted GmailCredentials test record successfully");
  } catch (err) {
    console.error("Error creating GmailCredentials:", err);
  }
}

main().catch(console.error);
