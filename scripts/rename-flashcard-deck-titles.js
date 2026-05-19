const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let [, key, value] = match;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const deckTitles = new Map([
  [1, 'Household Basics'],
  [2, "It's + Adjectives"],
  [3, 'Everyday Actions'],
  [4, 'Simple Descriptions'],
  [5, 'Colors in Context'],
  [6, 'Negative Actions'],
  [7, 'You Are in Action'],
  [8, 'Daily Commands'],
  [9, 'Will Future'],
  [10, 'Everyday Past'],
  [11, 'Past Routine'],
  [12, 'They Are'],
  [13, 'Simple Present Negative'],
  [14, 'I Am Feelings'],
  [15, 'Casual Reactions'],
  [16, 'Present Continuous'],
  [18, 'Your Everyday Objects'],
  [19, 'My Things and Places'],
  [20, 'Past Continuous'],
  [21, 'Simple Present Routine'],
  [22, 'Urban Details'],
  [23, 'Weather Talk'],
  [24, 'Personality Traits'],
  [25, 'Do Questions'],
  [26, 'Future Plans'],
  [27, 'Have and There Is'],
  [28, 'Simple Present Questions'],
  [29, 'Daily Habit Prompts'],
  [30, 'Informal Expressions'],
  [31, 'Simple Present Foundations'],
  [32, 'City Locations'],
  [33, 'Negative Routine'],
  [34, 'There Is / There Are'],
  [35, 'People and Adjectives'],
  [36, 'Is There...?'],
  [37, 'Public Places'],
  [38, 'Street English'],
  [39, 'Phrasal Verbs'],
  [40, 'Preferences and Habits'],
  [41, 'Have Been Experiences'],
  [42, 'Work and Study in Progress'],
  [43, 'Morning Routine Story'],
  [44, 'Past Continuous Scenes'],
  [45, 'Professions and Places'],
  [46, 'Bathroom and Self-Care'],
  [47, 'Everyday Flow'],
  [48, 'Tech Trouble Talk'],
  [49, 'Travel and Airport'],
  [50, 'Home Repairs'],
  [51, 'Core Vocabulary Mix'],
  [52, 'Family Life'],
  [53, 'Sports Talk'],
  [54, 'Analysis and Discovery'],
  [55, 'Action Stories'],
  [56, 'Vegetables and Nutrition'],
  [57, 'Countries and Cultures'],
  [58, 'Urgent Reactions'],
  [59, 'Quick Exclamations'],
  [60, 'Personal Tech Life'],
  [61, 'Object Pronouns'],
  [62, 'Past Interruptions'],
  [63, 'Those Are'],
  [64, 'Much and a Lot'],
  [65, 'There Are Many'],
  [66, 'Few and Little'],
  [67, 'People and Places'],
  [68, 'Movement and Direction'],
  [69, 'Object Conditions'],
  [70, 'Academic Concepts'],
  [71, 'Comparatives'],
  [72, 'As...As Comparisons'],
  [73, 'Colors in Description'],
  [74, 'Everyday Adjectives'],
  [75, 'Formal Problem Solving'],
  [76, 'Present Perfect Continuous Questions'],
  [77, 'Discourse Markers'],
  [78, 'Home Cleaning Tasks'],
  [79, 'Have You Ever...?'],
  [80, 'Natural Elements'],
  [81, 'Discourse Markers II'],
  [82, 'Casual Spoken English'],
  [83, 'Opinions and Preferences'],
  [84, 'Past Perfect and Would'],
  [85, 'Work and Burnout'],
  [86, 'Relationships and Boundaries'],
  [87, 'Time Linkers'],
  [88, 'Casual Reductions'],
  [89, 'Casual Reductions II'],
  [90, 'Regret and Expectation'],
  [91, 'Emotional Pressure'],
  [92, 'Inner Struggles'],
  [93, 'Complex Abstract Scenes'],
  [94, 'Polite Requests'],
  [95, 'Store and City Friction'],
  [96, 'Messy Modern Life'],
  [97, 'Pressure and Cover-Ups'],
  [98, 'Emotional Reactions'],
  [99, 'Emotional Pressure II'],
  [100, 'Conflict and Burnout'],
  [150, 'Purpose and Calling'],
]);

async function main() {
  loadEnv(path.join(process.cwd(), '.env'));
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Check your .env file.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const { rows } = await client.query(`
    SELECT deck_level, title, payload
      FROM public.flashcards_public_decks
     WHERE deck_level IS NOT NULL
     ORDER BY deck_level ASC
  `);

  const updates = [];
  for (const row of rows) {
    const nextTitle = deckTitles.get(Number(row.deck_level));
    if (!nextTitle) continue;
    const currentTitle = String(row.title || '').trim();
    if (currentTitle === nextTitle) continue;
    const nextPayload =
      row.payload && typeof row.payload === 'object'
        ? { ...row.payload, title: nextTitle }
        : { title: nextTitle };
    updates.push({
      deckLevel: Number(row.deck_level),
      from: currentTitle,
      to: nextTitle,
      payload: nextPayload,
    });
  }

  for (const update of updates) {
    await client.query(
      `
        UPDATE public.flashcards_public_decks
           SET title = $2,
               payload = $3::jsonb,
               updated_at = NOW()
         WHERE deck_level = $1
      `,
      [update.deckLevel, update.to, JSON.stringify(update.payload)],
    );
  }

  await client.end();

  console.log(`Updated ${updates.length} deck titles.`);
  for (const update of updates) {
    console.log(`${String(update.deckLevel).padStart(3, ' ')} | ${update.from} -> ${update.to}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
