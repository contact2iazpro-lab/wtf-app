/**
 * fix_phobies.mjs
 * Corrige les facts Phobies générés (IDs 506-526) :
 * - Pattern question : "Qu'est-ce que [la/l'] [phobie] ?"
 * - Réponse : max 50 chars
 * - Indices : max 20 chars chacun
 * - Options QCM : max 50 chars chacune
 * - Explication : 100-300 chars
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://znoceotakhynqcqhpwgz.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante'); process.exit(1) }

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// Raccourcit une chaîne à max N chars, coupe au dernier espace
function trunc(str, max) {
  if (!str || str.length <= max) return str
  return str.slice(0, max).replace(/\s+\S*$/, '').trim()
}

// Corrections manuelles pour chaque fact généré
const FIXES = [
  {
    id: 506,
    question: "Qu'est-ce que la nomatophobie ?",
    short_answer: "La nomatophobie, peur des noms propres",
    hint1: "Identité",
    hint2: "Prénom",
    options: [
      "La nomatophobie, peur des noms propres",
      "La pronophobie, peur de prononcer",
      "L'identonymphobie, peur d'identité",
      "L'onymophobie, peur des appellations",
    ],
    correct_index: 0,
    explanation: "La nomatophobie est la peur pathologique des noms propres, y compris le sien. Les personnes souffrant de cette phobie ressentent une anxiété intense à l'idée d'entendre ou prononcer des noms. Dans les cas sévères, elles évitent les conversations formelles.",
  },
  {
    id: 507,
    question: "Qu'est-ce que la météorophobie ?",
    short_answer: "La météorophobie, peur du beau temps",
    hint1: "Soleil",
    hint2: "Ciel dégagé",
    options: [
      "La météorophobie, peur du beau temps",
      "La céranophobie, peur du tonnerre",
      "La photophobie, peur de la lumière",
      "La calophobie, peur des journées claires",
    ],
    correct_index: 0,
    explanation: "La météorophobie inclut la peur des journées ensoleillées. Certains individus ressentent une angoisse profonde face à un ciel bleu dégagé, associant l'absence de nuages à un sentiment de vulnérabilité extrême. Cette phobie est documentée dans des études cliniques.",
  },
  {
    id: 508,
    question: "Qu'est-ce que la koumpounophobie ?",
    short_answer: "La koumpounophobie, peur des boutons",
    hint1: "Couture",
    hint2: "Vêtement",
    options: [
      "La koumpounophobie, peur des boutons",
      "La boutonnophobie, peur des attaches",
      "La vestiphobie, peur des vêtements",
      "La haphtophobie, peur des petits objets",
    ],
    correct_index: 0,
    explanation: "La koumpounophobie est la peur des boutons de vêtements, reconnue comme phobie spécifique. Les personnes atteintes refusent de porter des vêtements à boutons. Steve Jobs était réputé pour cette aversion, ce qui expliquerait son attachement aux interfaces épurées.",
  },
  {
    id: 509,
    question: "Qu'est-ce que la lépidoptérophobie ?",
    short_answer: "La lépidoptérophobie, peur des papillons",
    hint1: "Ailes",
    hint2: "Chrysalide",
    options: [
      "La lépidoptérophobie, peur des papillons",
      "La mélittophobie, peur des insectes",
      "La chrysalidophobie, peur des cocons",
      "La rhopalocérophobie, peur des lépidoptères",
    ],
    correct_index: 0,
    explanation: "La lépidoptérophobie est la peur intense et irrationnelle des papillons et des mites. Les déclencheurs sont souvent le battement imprévisible des ailes ou la texture de leurs écailles. Robbie Williams a publiquement avoué souffrir de cette phobie rare.",
  },
  {
    id: 510,
    question: "Qu'est-ce que la genuphophobie ?",
    short_answer: "La genuphophobie, peur des genoux",
    hint1: "Corps",
    hint2: "Articulation",
    options: [
      "La genuphophobie, peur des genoux",
      "La gonuphophobie, peur des rotules",
      "La rotulophophobie, peur des jambes",
      "La flexophobie, peur des membres fléchis",
    ],
    correct_index: 0,
    explanation: "La genuphophobie provoque une terreur intense à la vue ou au toucher des genoux — même les siens. Certains patients ne portent que des pantalons longs. Tyra Banks a déclaré publiquement souffrir de cette phobie reconnue cliniquement.",
  },
  {
    id: 511,
    question: "Qu'est-ce que l'arachibutyrophobie ?",
    short_answer: "L'arachibutyrophobie, colle au palais",
    hint1: "Cuisine",
    hint2: "Palais",
    options: [
      "L'arachibutyrophobie, colle au palais",
      "L'arachibutyrophobie, obstrue les narines",
      "L'arachidophobie, provoque suffocation",
      "L'arachidophobie, peur d'avaler",
    ],
    correct_index: 0,
    explanation: "L'arachibutyrophobie est la peur que le beurre de cacahuète reste collé au palais. Popularisé dès 1988, des cas cliniques réels ont été documentés depuis. Les personnes atteintes ressentent une anxiété anticipatoire sévère à la simple odeur du produit.",
  },
  {
    id: 512,
    question: "Qu'est-ce que l'hippopotomonstrosesquipédaliophobie ?",
    short_answer: "L'hippopotomonstrosesquipédaliophobie",
    hint1: "Langage",
    hint2: "Longueur",
    options: [
      "L'hippopotomonstrosesquipédaliophobie",
      "La verbomégallophobie, mots longs",
      "La polysyllabophobie, mots complexes",
      "La lexicophobie, peur des dictionnaires",
    ],
    correct_index: 0,
    explanation: "L'hippopotomonstrosesquipédaliophobie est la peur irrationnelle des mots longs. Son nom compte 36 lettres, ce qui est considéré comme une cruauté envers ceux qui en souffrent. Les individus concernés paniquent à la lecture de textes médicaux ou juridiques complexes.",
  },
  {
    id: 513,
    question: "Qu'est-ce que l'héliophophobie ?",
    short_answer: "L'héliophophobie, peur du soleil",
    hint1: "Astre",
    hint2: "Lumière",
    options: [
      "La phéboréophobie, peur du jour",
      "La photoastrophobie, peur du soleil",
      "L'héliophophobie, peur du soleil",
      "La solarigraphophobie, peur des UV",
    ],
    correct_index: 2,
    explanation: "L'héliophophobie provoque une peur intense et irrationnelle du soleil. Les personnes atteintes peuvent rester cloîtrées chez elles le jour et ne sortir que la nuit. Elle est souvent associée à des troubles anxieux généralisés et peut mener à de graves carences en vitamine D.",
  },
  {
    id: 514,
    question: "Qu'est-ce que la phagophobie ?",
    short_answer: "La phagophobie, peur d'avaler",
    hint1: "Gorge",
    hint2: "Salive",
    options: [
      "La ptysiophobie, blocage de déglutition",
      "La sialofolie, rejet de salive",
      "La sialophobie, peur de la salive",
      "La phagophobie, peur d'avaler",
    ],
    correct_index: 3,
    explanation: "La phagophobie est la peur pathologique d'avaler. Dans ses formes extrêmes, certains patients refusent d'avaler leur propre salive. Reconnu par le DSM-5, certains patients ont dû être alimentés par sonde suite à une déshydratation sévère causée par cette peur.",
  },
  {
    id: 515,
    question: "Qu'est-ce que la catoptrophobie ?",
    short_answer: "La catoptrophobie, peur des reflets",
    hint1: "Miroir",
    hint2: "Reflet",
    options: [
      "La catoptrophobie, peur des reflets",
      "La scophydrophobie, peur des surfaces",
      "L'eisoptrophobie aquatique",
      "La narcissophobie, peur de son image",
    ],
    correct_index: 0,
    explanation: "La catoptrophobie est la peur des miroirs et des reflets. Certains patients ne peuvent pas s'approcher de surfaces réfléchissantes comme l'eau ou les vitres. Dans de nombreuses cultures, voir son reflet brisé était considéré comme un signe de mort imminente.",
  },
  {
    id: 516,
    question: "Qu'est-ce que la xanthophobie ?",
    short_answer: "La xanthophobie, peur du jaune",
    hint1: "Couleur",
    hint2: "Soleil",
    options: [
      "La luteïnophobie, peur du jaune",
      "La xanthophobie, peur du jaune",
      "La citriophobie, peur du citron",
      "La flavophobie, peur du jaune vif",
    ],
    correct_index: 1,
    explanation: "La xanthophobie est la peur médicalement reconnue de la couleur jaune. Les personnes atteintes peuvent paniquer face au soleil, aux bananes ou aux fleurs jaunes. Dans les cas extrêmes, les patients redécorent leur domicile pour supprimer toute trace de cette couleur.",
  },
  {
    id: 518,
    question: "Qu'est-ce que la porphyrophobie ?",
    short_answer: "La porphyrophobie, peur du violet",
    hint1: "Couleur",
    hint2: "Deuil",
    options: [
      "La porphyrophobie, peur du violet",
      "La chromophobie violacée, peur du mauve",
      "La purpurophobie, peur du pourpre",
      "La ianthinophobie, peur des teintes mauves",
    ],
    correct_index: 0,
    explanation: "La porphyrophobie est la peur clinique de la couleur pourpre ou violette. Certains patients ne peuvent pas regarder des aubergines ou des fleurs violettes. Historiquement associée au deuil dans plusieurs cultures, cette association renforce la phobie chez certains individus.",
  },
  {
    id: 519,
    question: "Qu'est-ce que la koumpounophobie ?",
    short_answer: "La koumpounophobie, peur des boutons",
    hint1: "Vêtement",
    hint2: "Couture",
    options: [
      "La raptophobie, peur des coutures",
      "La fibulonophobie, peur des boutons nacre",
      "La vestiophobie, peur des fermetures",
      "La koumpounophobie, peur des boutons",
    ],
    correct_index: 3,
    explanation: "La koumpounophobie est la peur intense des boutons de vêtements, en particulier en plastique. Steve Jobs en souffrait selon plusieurs biographies. Les personnes atteintes ne peuvent pas porter de chemises boutonnées. Cette phobie toucherait 1 personne sur 75 000.",
  },
  {
    id: 520,
    question: "Qu'est-ce que la pogonophobie ?",
    short_answer: "La pogonophobie, peur des barbes",
    hint1: "Barbe",
    hint2: "Poil",
    options: [
      "La pogonophobie, peur des barbes",
      "La trichophobie, peur des cheveux",
      "La piliophobie, peur des poils blancs",
      "La neophobie, peur des déguisements",
    ],
    correct_index: 0,
    explanation: "La pogonophobie est la peur pathologique des barbes. Elle peut déclencher des crises de panique au simple contact visuel d'un visage barbu. Des Pères Noël rasés ont même été employés dans certains hôpitaux pédiatriques pour ne pas déclencher de crises chez les enfants.",
  },
  {
    id: 521,
    question: "Qu'est-ce que la genuphophobie ?",
    short_answer: "La genuphophobie, peur des genoux",
    hint1: "Articulation",
    hint2: "Pantalon",
    options: [
      "La genuphophobie, peur des genoux",
      "La rotulophophobie, peur des rotules",
      "La gonuphophobie, peur des jambes",
      "La genuphophobie, peur des coudes",
    ],
    correct_index: 0,
    explanation: "La genuphophobie est une phobie reconnue : peur intense des genoux. Certains patients portent des pantalons longs en toutes circonstances, même par 40°C. Cette phobie peut s'étendre à la simple évocation du mot genou et est classifiée parmi les phobies spécifiques.",
  },
  {
    id: 522,
    question: "Qu'est-ce que la koumpounophobie ?",
    short_answer: "La koumpounophobie, peur des boutons",
    hint1: "Chemise",
    hint2: "Couture",
    options: [
      "La raptophobie, peur des coutures",
      "La boutonnophobie, peur des attaches",
      "La koumbanophobie, peur des disques",
      "La koumpounophobie, peur des boutons",
    ],
    correct_index: 3,
    explanation: "La koumpounophobie est la peur pathologique des boutons de vêtements. Steve Jobs aimait les cols roulés sans boutons. Environ 1 personne sur 75 000 souffre de cette phobie. Certains patients ne peuvent pas toucher un vêtement boutonné sans ressentir une nausée intense.",
  },
  {
    id: 523,
    question: "Qu'est-ce que la cherophobie ?",
    short_answer: "La cherophobie, peur du bonheur",
    hint1: "Fête",
    hint2: "Paradoxe",
    options: [
      "La cherophobie, peur du bonheur",
      "La macréphobie, peur du succès",
      "La félicophobie, peur du contentement",
      "L'euphophobie, peur des émotions positives",
    ],
    correct_index: 0,
    explanation: "La cherophobie est la peur irrationnelle d'éprouver de la joie. Les personnes atteintes évitent les fêtes et célébrations par crainte que quelque chose de terrible ne survienne après. Des études publiées dans le Journal of Affective Disorders ont confirmé son existence clinique.",
  },
  {
    id: 524,
    question: "Qu'est-ce que l'hélophobie ?",
    short_answer: "L'hélophobie, peur de la lumière solaire",
    hint1: "Rideau",
    hint2: "Vitamine D",
    options: [
      "L'hélophobie, peur de la lumière solaire",
      "La photodermophobie, peur de la lumière",
      "La lumenophobie, peur des sources de lumière",
      "La nyctalophobie, peur des UV",
    ],
    correct_index: 0,
    explanation: "L'hélophobie est la peur pathologique de la lumière du soleil, purement psychologique. Les personnes atteintes restent chez elles le jour et ne sortent que la nuit. Des cas documentés aux États-Unis montrent des patients n'ayant pas vu la lumière naturelle depuis dix ans.",
  },
  {
    id: 525,
    question: "Qu'est-ce que la turophobia ?",
    short_answer: "La turophobia, peur du fromage",
    hint1: "Comté",
    hint2: "Gruyère",
    options: [
      "La fromagophobie, peur des textures molles",
      "La crustophobia, peur des croûtes",
      "La turophobia, peur du fromage",
      "La casiphobia, peur des odeurs fortes",
    ],
    correct_index: 2,
    explanation: "La turophobia est une phobie réelle : la peur pathologique du fromage. Les personnes atteintes paniquent au simple contact visuel, olfactif ou tactile d'un morceau de fromage. L'animateur britannique Johnny Vegas souffre de cette phobie et en a témoigné publiquement.",
  },
  {
    id: 526,
    question: "Qu'est-ce que la genuphobia ?",
    short_answer: "La genuphobia, peur des genoux",
    hint1: "Articulation",
    hint2: "Rotule",
    options: [
      "La articulophobia, peur des genoux",
      "La patellaphobia, peur des rotules",
      "La genuphobia, peur des genoux",
      "La gonyphobia, peur des jambes",
    ],
    correct_index: 2,
    explanation: "La genuphobia est une phobie cliniquement reconnue : peur intense des genoux — les siens ou ceux des autres. Certains patients ne supportent pas de voir des genoux nus ou d'en entendre parler. Elle est souvent liée à un traumatisme physique dans l'enfance.",
  },
]

// Validation des limites
function validate(fix) {
  const errs = []
  if (fix.question.length > 100) errs.push(`Q trop longue: ${fix.question.length}`)
  if ((fix.hint1||'').length > 20) errs.push(`H1 trop long: ${fix.hint1.length}`)
  if ((fix.hint2||'').length > 20) errs.push(`H2 trop long: ${fix.hint2.length}`)
  if (fix.short_answer.length > 50) errs.push(`Ans trop longue: ${fix.short_answer.length}`)
  fix.options.forEach((o, i) => { if (o.length > 50) errs.push(`Opt${i} trop longue: ${o.length}`) })
  if (fix.explanation.length > 300) errs.push(`Expl trop longue: ${fix.explanation.length}`)
  if (fix.explanation.length < 100) errs.push(`Expl trop courte: ${fix.explanation.length}`)
  if (!fix.question.startsWith("Qu'est-ce que")) errs.push(`Pattern invalide`)
  return errs
}

async function run() {
  console.log(`\n🔧 Correction de ${FIXES.length} facts Phobies\n`)

  let ok = 0
  let failed = 0

  for (const fix of FIXES) {
    // Validation pre-update
    const errs = validate(fix)
    if (errs.length > 0) {
      console.error(`❌ ID ${fix.id} validation échouée:`, errs.join(', '))
      failed++
      continue
    }

    const { error } = await sb.from('facts').update({
      question: fix.question,
      short_answer: fix.short_answer,
      hint1: fix.hint1,
      hint2: fix.hint2,
      options: fix.options,
      correct_index: fix.correct_index,
      explanation: fix.explanation,
      updated_at: new Date().toISOString(),
    }).eq('id', fix.id)

    if (error) {
      console.error(`❌ ID ${fix.id}: ${error.message}`)
      failed++
    } else {
      console.log(`✓ ID ${fix.id}: ${fix.question}`)
      ok++
    }
  }

  console.log(`\n─────────────────────`)
  console.log(`✅ Corrigés : ${ok}/${FIXES.length}`)
  if (failed > 0) console.log(`❌ Échecs : ${failed}`)

  // Vérification post-update
  console.log('\n📊 Vérification post-correction...')
  const { data } = await sb.from('facts').select('id,question,short_answer,hint1,hint2,options,explanation').eq('category','phobies').gte('id',500)

  let issues = 0
  data?.forEach(f => {
    const errs = []
    if ((f.question||'').length > 100) errs.push('Q>100')
    if ((f.hint1||'').length > 20) errs.push('H1>20')
    if ((f.hint2||'').length > 20) errs.push('H2>20')
    if ((f.short_answer||'').length > 50) errs.push('Ans>50')
    if (Array.isArray(f.options)) f.options.forEach((o,i) => { if((o||'').length>50) errs.push(`Opt${i}>50`) })
    if ((f.explanation||'').length > 300) errs.push('Expl>300')
    if ((f.explanation||'').length < 100) errs.push('Expl<100')
    if (!(f.question||'').startsWith("Qu'est-ce que")) errs.push('PatternKO')
    if (errs.length) { console.log(`⚠ ID ${f.id}: ${errs.join(', ')}`); issues++ }
  })

  if (issues === 0) console.log('✅ Tous les facts respectent les limites et le pattern !')
  else console.log(`⚠ ${issues} facts ont encore des problèmes`)
}

run().catch(err => { console.error('❌ Erreur:', err.message); process.exit(1) })
