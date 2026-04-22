import { readFileSync } from 'fs';

const code = readFileSync('C:/Users/VENOEN/wtf-app/src/data/facts.js', 'utf8');

function extractField(block, field) {
  const m = block.match(new RegExp(field + "\s*:\s*['\"]([^'\"]*)['\"]"));
  return m ? m[1] : '';
}
function extractNum(block, field) {
  const m = block.match(new RegExp(field + '\s*:\s*(\d+)'));
  return m ? parseInt(m[1]) : null;
}

const factBlocks = code.split(/\n  \{\n/g).slice(1);
let allFacts = [];
for (const block of factBlocks) {
  const id = extractNum(block, '    id');
  const question = extractField(block, 'question');
  const shortAnswer = extractField(block, 'shortAnswer');
  const category = extractField(block, 'category');
  const funnyWrong1 = extractField(block, 'funnyWrong1');
  const funnyWrong2 = extractField(block, 'funnyWrong2');
  const funnyWrong3 = extractField(block, 'funnyWrong3');
  const closeWrong1 = extractField(block, 'closeWrong1');
  const closeWrong2 = extractField(block, 'closeWrong2');
  const plausibleWrong1 = extractField(block, 'plausibleWrong1');
  const plausibleWrong2 = extractField(block, 'plausibleWrong2');
  const plausibleWrong3 = extractField(block, 'plausibleWrong3');
  const hasNew = !!(funnyWrong1||funnyWrong2||funnyWrong3||closeWrong1||closeWrong2||plausibleWrong1||plausibleWrong2||plausibleWrong3);
  if (id && question && shortAnswer && hasNew) {
    allFacts.push({ id, question, shortAnswer, category, funnyWrong1, funnyWrong2, funnyWrong3, closeWrong1, closeWrong2, plausibleWrong1, plausibleWrong2, plausibleWrong3 });
  }
}

for (let i = allFacts.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [allFacts[i], allFacts[j]] = [allFacts[j], allFacts[i]];
}
const selected = allFacts.slice(0, 10);

const profiles = [
  { weight: 0.8, counts: { plausible: 3 }, label: '3 plausible' },
  { weight: 0.1, counts: { plausible: 2, close: 1 }, label: '2 plausible + 1 proche' },
  { weight: 0.1, counts: { plausible: 2, funny: 1 }, label: '2 plausible + 1 drôle' },
];

function pickRandom(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

for (let qi = 0; qi < selected.length; qi++) {
  const fact = selected[qi];
  const r = Math.random();
  let acc = 0, chosenProfile = profiles[profiles.length - 1];
  for (const p of profiles) {
    acc += p.weight;
    if (r <= acc) { chosenProfile = p; break; }
  }
  const pools = {
    funny: [fact.funnyWrong1, fact.funnyWrong2, fact.funnyWrong3].filter(Boolean),
    close: [fact.closeWrong1, fact.closeWrong2].filter(Boolean),
    plausible: [fact.plausibleWrong1, fact.plausibleWrong2, fact.plausibleWrong3].filter(Boolean),
  };
  let picked = [];
  const used = new Set();
  for (const [type, count] of Object.entries(chosenProfile.counts)) {
    const pool = (pools[type] || []).filter(a => !used.has(a));
    const taken = pickRandom(pool, count);
    for (const t of taken) used.add(t);
    picked.push(...taken.map(t => ({ text: t, type })));
  }
  const allOpts = [{ text: fact.shortAnswer, type: '✅ CORRECT' }, ...picked];
  for (let i = allOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOpts[i], allOpts[j]] = [allOpts[j], allOpts[i]];
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Q${qi+1} [#${fact.id} · ${fact.category}] — Profil: ${chosenProfile.label}`);
  console.log(`❓ ${fact.question}`);
  console.log('');
  allOpts.forEach((o, i) => {
    const letter = String.fromCharCode(65 + i);
    console.log(`  ${letter}. ${o.text}  [${o.type}]`);
  });
  console.log(`\n  Pools: funny=${pools.funny.length} close=${pools.close.length} plausible=${pools.plausible.length}\n`);
}

console.log(`\n📊 Total facts avec nouveau format: ${allFacts.length}`);
