import prisma from '../utils/prisma';
import fs from 'fs';
import { logger } from '../utils/logger';

async function main() {
  console.log("Starting backfill for resumes...");
  const resumes = await prisma.resume.findMany({
    where: {
      OR: [
        { fileContent: null },
        { fileContent: '' }
      ]
    }
  });

  console.log(`Found ${resumes.length} resumes that need backfilling.`);

  for (const resume of resumes) {
    if (!resume.filePath) {
      console.log(`Resume ID ${resume.id} (${resume.name}) has no filePath. Skipping.`);
      continue;
    }

    if (fs.existsSync(resume.filePath)) {
      try {
        const fileBuffer = fs.readFileSync(resume.filePath);
        const fileContent = fileBuffer.toString('base64');

        await prisma.resume.update({
          where: { id: resume.id },
          data: { fileContent }
        });

        const msg = `Successfully backfilled resume ID ${resume.id} (${resume.name}) from disk (size: ${fileBuffer.length} bytes)`;
        console.log(msg);
        await logger.info('BACKFILL', msg);
      } catch (err: any) {
        const errMsg = `Failed to backfill resume ID ${resume.id} (${resume.name}): ${err.message || String(err)}`;
        console.error(errMsg);
        await logger.error('BACKFILL', errMsg, err);
      }
    } else {
      const warnMsg = `Resume file for ID ${resume.id} (${resume.name}) does not exist at ${resume.filePath}.`;
      console.warn(warnMsg);
      await logger.warn('BACKFILL', warnMsg);
    }
  }

  console.log("Backfill completed.");
  process.exit(0);
}

main().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
