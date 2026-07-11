import prisma from './src/utils/prisma';

async function main() {
  const resumes = await prisma.resume.findMany();
  console.log("Checking Resumes database entries:");
  resumes.forEach(r => {
    console.log(`- ID: ${r.id}, Name: ${r.name}, FilePath: ${r.filePath}, Description: ${r.description}, Has Content: ${r.fileContent ? 'YES' : 'NO'} (${r.fileContent ? r.fileContent.length : 0} characters)`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
