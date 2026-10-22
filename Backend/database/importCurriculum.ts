// Adds a sector's curriculum (database/curriculum_backup/) to the database, published.
// Run with: npm run db:curriculum -- <csharp|javascript> --admin <username or email> [--dry-run]
//
// Each quest is saved exactly as the admin quest editor saves it (same
// validation, same rules for prerequisites), in prerequisite order, and is
// listed under the admin given. New quests can be edited in the editor
// afterwards. Safe to re-run: quests are found again by title (seeded ones by
// id) and updated in place, keeping pilots' progress.
//
// --dry-run checks every quest without connecting to the database.
// Run npm run db:seed first: the curriculum builds on the seeded quests.
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { pool } from '../src/config/db.js';
import { questBody } from '../src/controllers/adminController.js';
import { findQuest, listQuests, type AdminQuest } from '../src/models/adminQuestModel.js';
import { findByLogin } from '../src/models/userModel.js';
import { saveQuest } from '../src/services/adminQuestService.js';
import { HttpError } from '../src/utils/httpError.js';
import { curriculumProblems, inPrerequisiteOrder, mapColumns, objectivesFor, questInput } from './curriculum_backup/build.js';
import { csharp } from './curriculum_backup/csharp/index.js';
import { javascript } from './curriculum_backup/javascript/index.js';
import { isSeeded, type Curriculum } from './curriculum_backup/types.js';

const curricula: Record<string, Curriculum> = { csharp, javascript };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { admin: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
});
const name = positionals[0] ?? '';
const curriculum = curricula[name];
if (!curriculum) {
  console.error(`Name a curriculum: ${Object.keys(curricula).join(', ')}`);
  process.exit(1);
}

const problems = curriculumProblems(curriculum);
if (problems.length > 0) {
  console.error(`The ${name} curriculum has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const columns = Math.max(...mapColumns(curriculum.quests).values()) + 1;
console.log(`${name}: ${curriculum.quests.length} quests over ${columns} map columns, all valid.`);

if (values['dry-run']) {
  console.log('Dry run: nothing was saved.');
  await pool.end();
  process.exit(0);
}

const ids = new Map<string, number>();
try {
  if (!values.admin) throw new Error('Pass --admin <username or email>: the quests are listed under that admin.');
  const admin = await findByLogin(values.admin);
  if (!admin || admin.role !== 'admin') throw new Error(`${values.admin} isn't an admin.`);

  const inSector = (await listQuests()).filter((q) => q.languageId === curriculum.languageId);

  for (const quest of inPrerequisiteOrder(curriculum.quests)) {
    let current: AdminQuest | null = null;
    if (isSeeded(quest)) {
      current = await findQuest(quest.seededQuestId);
      if (!current) throw new Error(`Seeded quest ${quest.seededQuestId} isn't in the database. Run npm run db:seed first.`);
    } else {
      const match = inSector.find((q) => q.title === quest.title);
      if (match) current = await findQuest(match.questId);
    }

    const prerequisiteIds = quest.prerequisites.map((key) => ids.get(key)!);
    // Parsed like an editor request, so text is trimmed the same way
    const input = questBody.parse(questInput(quest, curriculum.languageId, prerequisiteIds, objectivesFor(quest, current)));
    const saved = await saveQuest(admin.userId, current?.questId ?? null, input);
    ids.set(quest.key, saved.questId);
    console.log(`${current ? 'Updated' : 'Added'} #${saved.questId} ${saved.title} (${saved.objectives.length} objectives)`);
  }

  console.log(`Done. Restart the backend (or wait 5 minutes) for pilots to see the changes.`);
} catch (err) {
  const fields = err instanceof HttpError && err.fields ? ` ${JSON.stringify(err.fields)}` : '';
  console.error('Import stopped:', err instanceof Error ? err.message : err, fields);
  console.error(
    ids.size === 0
      ? 'Nothing was saved.'
      : `The ${ids.size} quest(s) saved before this point are kept; fix the problem and re-run to continue.`,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
