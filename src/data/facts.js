export const CATEGORIES = [
  { id: "animaux", label: "Animaux", emoji: "ð¦", color: "#6BCB77", bg: "#0A2A0E", image: "Carte WTF Animaux.png" },
  { id: "art", label: "Art", emoji: "ð¨", color: "#A07CD8", bg: "#1A0A35", image: "Carte WTF Art.png" },
  { id: "corps-humain", label: "Corps Humain", emoji: "ð«", color: "#F07070", bg: "#3A0A0A", image: "Carte WTF Corps humain.png" },
  { id: "definition", label: "DÃ©finition", emoji: "ð", color: "#C8C8C8", bg: "#1C1C1C", image: "Carte WTF Definition.png" },
  { id: "gastronomie", label: "Gastronomie", emoji: "ð½ï¸", color: "#FFA500", bg: "#3A2000", image: "Carte WTF Gastronomie.png" },
  { id: "geographie", label: "GÃ©ographie", emoji: "ð", color: "#40D9C8", bg: "#003A35", image: "Carte WTF Geographie.png" },
  { id: "histoire", label: "Histoire", emoji: "ð", color: "#E8CFA0", bg: "#2C2010", image: "Carte WTF Histoire.png" },
  { id: "kids", label: "Kids", emoji: "ð", color: "#FFEF60", bg: "#3A3300", image: "Carte WTF Kids.png" },
  { id: "phobies", label: "Phobies", emoji: "ð±", color: "#A8B8D8", bg: "#0A1020", image: "Carte WTF Phobies.png" },
  { id: "records", label: "Records", emoji: "ð", color: "#E8B84B", bg: "#2E2000", image: "Carte WTF Records.png" },
  { id: "sante", label: "SantÃ©", emoji: "âï¸", color: "#90F090", bg: "#053A05", image: "Carte WTF Sante.png" },
  { id: "sciences", label: "Sciences", emoji: "ð¬", color: "#80C8E8", bg: "#0A2035", image: "Carte WTF Sciences.png" },
  { id: "sport", label: "Sport", emoji: "â½", color: "#E84535", bg: "#3A0A05", image: "Carte WTF Sport.png" },
  { id: "technologie", label: "Technologie", emoji: "ð¤", color: "#C0C0C0", bg: "#1C1C1C", image: "Carte WTF Technologie.png" },
  { id: "lois", label: "Lois & RÃ¨gles", emoji: "âï¸", color: "#B0A8D8", bg: "#1A0A35", image: "Carte WTF Lois et regles.png" },
  { id: "politique", label: "Politique", emoji: "ð³ï¸", color: "#B24B4B", bg: "#2A0A0A", image: "Carte WTF Politique.png", disabled: true },
  { id: "cinema", label: "CinÃ©ma", emoji: "ð¬", color: "#D4AF37", bg: "#2A2000", image: "Carte WTF Cinema.png" },
  { id: "crimes", label: "Crimes & Faits Divers", emoji: "ð", color: "#8B4789", bg: "#2A0A2A", image: "Carte WTF Crimes.png", disabled: true },
  { id: "architecture", label: "Architecture", emoji: "ðï¸", color: "#A0826D", bg: "#2A1A0F", image: "Carte WTF Architecture.png", disabled: true },
  { id: "internet", label: "Internet & RÃ©seaux Sociaux", emoji: "ð±", color: "#5B8DBE", bg: "#0A1A35", image: "Carte WTF Internet.png", disabled: true },
  { id: "espace", label: "Espace", emoji: "ð", color: "#2E1A47", bg: "#1A0A2A", image: "Carte WTF Espace.png", disabled: true },
  { id: "musique", label: "Musique", emoji: "ðµ", color: "#E84B8A", bg: "#2A0A1A", image: "Carte WTF Musique.png" },
  { id: "psychologie", label: "Psychologie", emoji: "ð§ ", color: "#8E44AD", bg: "#1A0A2A", image: "Carte WTF Psychologie.png", disabled: true }
]

export const FACTS = [
  {
    id: 920,
    category: "crimes",
    question: "Quel gangster était informateur du FBI tout en dirigeant la mafia de Boston ?",
    hint1: "Whitey",
    hint2: "Bulger",
    shortAnswer: "Whitey Bulger",
    explanation: "Whitey Bulger était le patron de la mafia irlandaise de Boston tout en étant informateur du FBI pendant des années.",
    sourceUrl: "https://en.wikipedia.org/wiki/Whitey_Bulger",
    options: ["John Gotti","Lucky Luciano","Al Capone","Meyer Lansky","Jimmy Hoffa","Whitey Bulger"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 921,
    category: "crimes",
    question: "Charles Ponzi a-t-il inventé l'arnaque pyramidale ?",
    hint1: "Italie",
    hint2: "Non",
    shortAnswer: "Non, il n'en est pas l'inventeur",
    explanation: "L'arnaque pyramidale existait avant Ponzi, mais son escroquerie de 1920 était si spectaculaire que le nom lui est resté.",
    sourceUrl: "https://en.wikipedia.org/wiki/Charles_Ponzi",
    options: ["Oui en 1920","Oui en 1910","Oui, il en est le créateur","Peut-être","Le schéma porte son nom","Non, il n'en est pas l'inventeur"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 922,
    category: "crimes",
    question: "Combien de membres compte la Yakuza japonaise ?",
    hint1: "Japon",
    hint2: "40 000",
    shortAnswer: "Environ 40 000 membres",
    explanation: "La Yakuza est l'une des plus grandes organisations criminelles avec environ 40 000 membres.",
    sourceUrl: "https://en.wikipedia.org/wiki/Yakuza",
    options: ["5 000","10 000","20 000","30 000","100 000","Environ 40 000 membres"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 926,
    category: "crimes",
    question: "Quel est le plus grand vol de bijoux de l'histoire ?",
    hint1: "Anvers",
    hint2: "2003",
    shortAnswer: "Le casse d'Anvers en 2003",
    explanation: "Le casse du Diamond Center d'Anvers en 2003 a permis de dérober des pierres pour 100+ millions d'euros.",
    sourceUrl: "https://en.wikipedia.org/wiki/Antwerp_diamond_heist",
    options: ["Vol Louvre","Casse Londres","Braquage Paris","Vol Rome","Casse Genève","Le casse d'Anvers en 2003"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 928,
    category: "cinema",
    question: "Combien de kilos Joaquin Phoenix a-t-il perdu pour jouer le Joker ?",
    hint1: "Régime",
    hint2: "23",
    shortAnswer: "23 kg",
    explanation: "Joaquin Phoenix a perdu 23 kg pour incarner le Joker dans le film de Todd Phillips (2019).",
    sourceUrl: "https://en.wikipedia.org/wiki/Joker_(2019_film)",
    options: ["5 kg","10 kg","15 kg","18 kg","30 kg","23 kg"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 930,
    category: "cinema",
    question: "Le film Titanic a-t-il coûté plus que le vrai paquebot ?",
    hint1: "Budget",
    hint2: "Oui",
    shortAnswer: "Oui, le film a coûté plus cher",
    explanation: "Le Titanic réel a coûté environ 7,5 millions $ en 1912 (150M$ ajustés). Le film de Cameron a coûté 200M$.",
    sourceUrl: "https://en.wikipedia.org/wiki/Titanic_(1997_film)",
    options: ["Non","À peu près pareil","Deux fois plus","Dix fois plus","Exactement pareil","Oui, le film a coûté plus cher"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 933,
    category: "cinema",
    question: "Parasite a-t-il été le premier film non anglophone à gagner l'Oscar du Meilleur Film ?",
    hint1: "Corée",
    hint2: "Oui",
    shortAnswer: "Oui, premier dans l'histoire",
    explanation: "Parasite (2019) de Bong Joon-ho est le premier film non-anglophone à remporter l'Oscar du Meilleur Film.",
    sourceUrl: "https://en.wikipedia.org/wiki/Parasite_(2019_film)",
    options: ["Non","Deuxième","C'est un film anglais","Il n'a pas gagné","Il est américain","Oui, premier dans l'histoire"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 935,
    category: "cinema",
    question: "Combien de temps Jim Carrey pouvait-il supporter son costume de Grinch ?",
    hint1: "Douloureux",
    hint2: "2 heures",
    shortAnswer: "Maximum 2 heures",
    explanation: "Jim Carrey ne pouvait pas rester dans son costume de Grinch plus de 2 heures à cause des douleurs au visage.",
    sourceUrl: "https://en.wikipedia.org/wiki/How_the_Grinch_Stole_Christmas_(film)",
    options: ["30 minutes","1 heure","4 heures","8 heures","Toute la journée","Maximum 2 heures"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 941,
    category: "cinema",
    question: "Le film Cléopâtre (1963) a-t-il failli ruiner un studio hollywoodien ?",
    hint1: "20th",
    hint2: "Fox",
    shortAnswer: "Oui, 20th Century Fox",
    explanation: "Cléopâtre (1963) a failli couler la 20th Century Fox avec un budget explosé à 44 millions de dollars.",
    sourceUrl: "https://en.wikipedia.org/wiki/Cleopatra_(1963_film)",
    options: ["MGM","Warner Bros","Paramount","Universal","Columbia","Oui, 20th Century Fox"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 943,
    category: "cinema",
    question: "Quel film a inventé la technique du 'bullet time' au cinéma ?",
    hint1: "Matrix",
    hint2: "1999",
    shortAnswer: "Matrix (1999)",
    explanation: "The Matrix (1999) des Wachowski a popularisé le 'bullet time', une technique de caméras multiples synchronisées.",
    sourceUrl: "https://en.wikipedia.org/wiki/The_Matrix",
    options: ["Terminator 2","Speed Racer","Inception","Gravity","Avatar","Matrix (1999)"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 945,
    category: "musique",
    question: "Beethoven était-il sourd quand il a composé sa 9e Symphonie ?",
    hint1: "Surdité",
    hint2: "Oui",
    shortAnswer: "Oui, complètement sourd",
    explanation: "Beethoven était totalement sourd lorsqu'il a composé et dirigé la première de sa 9e Symphonie en 1824.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ludwig_van_Beethoven",
    options: ["Non","Partiellement","Il simulait","Il entendait les basses","Il utilisait des vibrations","Oui, complètement sourd"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 950,
    category: "musique",
    question: "Kurt Cobain jouait-il de la guitare d'une façon atypique ?",
    hint1: "Main",
    hint2: "Gaucher",
    shortAnswer: "Oui, il était gaucher et jouait à l'envers",
    explanation: "Cobain était gaucher mais jouait souvent avec une guitare droite retournée, ce qui rendait son style unique.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kurt_Cobain",
    options: ["Non, tout normal","Il jouait de la basse","Ambidextre","Il n'utilisait pas de médiator","Il jouait avec les dents","Oui, il était gaucher et jouait à l'envers"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 951,
    category: "musique",
    question: "Lady Gaga a-t-elle été renvoyée d'un label au début de sa carrière ?",
    hint1: "Def Jam",
    hint2: "3 mois",
    shortAnswer: "Oui, par Def Jam après 3 mois",
    explanation: "Lady Gaga a signé avec Def Jam Records puis a été renvoyée après seulement 3 mois.",
    sourceUrl: "https://en.wikipedia.org/wiki/Lady_Gaga",
    options: ["Non","Elle n'a jamais signé","Sony l'a renvoyée","Universal","Après 2 ans","Oui, par Def Jam après 3 mois"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 953,
    category: "musique",
    question: "Taylor Swift a-t-elle ré-enregistré ses anciens albums ?",
    hint1: "Droits",
    hint2: "Taylor's Version",
    shortAnswer: "Oui pour récupérer ses droits",
    explanation: "Taylor Swift a ré-enregistré ses 6 premiers albums pour récupérer les droits de sa musique vendus à Scooter Braun.",
    sourceUrl: "https://en.wikipedia.org/wiki/Taylor_Swift",
    options: ["Non","Seulement un","En cours","Pour les améliorer","À titre expérimental","Oui pour récupérer ses droits"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 958,
    category: "musique",
    question: "Michael Jackson avait-il des animaux exotiques à Neverland ?",
    hint1: "Zoo",
    hint2: "Oui",
    shortAnswer: "Oui, dont une girafe et un chimpanzé",
    explanation: "Neverland Ranch de Michael Jackson abritait un zoo privé avec girafes, éléphants et son célèbre chimpanzé Bubbles.",
    sourceUrl: "https://en.wikipedia.org/wiki/Neverland_Ranch",
    options: ["Non","Seulement des chats","Seulement des chiens","Un perroquet","Un lion","Oui, dont une girafe et un chimpanzé"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 962,
    category: "musique",
    question: "Quel groupe de rock a survécu à trois de ses membres originaux mourant à 27 ans ?",
    hint1: "27",
    hint2: "Rock",
    shortAnswer: "Le Club des 27 (Jim Morrison, Jimi Hendrix, Janis",
    explanation: "Le Club des 27 regroupe des artistes rock décédés à 27 ans : Morrison, Hendrix, Joplin, Cobain, Winehouse.",
    sourceUrl: "https://en.wikipedia.org/wiki/27_Club",
    options: ["Les Beatles","Les Rolling Stones","Pink Floyd","The Doors","Led Zeppelin","Le Club des 27 (Jim Morrison, Jimi Hendrix, Janis"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 966,
    category: "espace",
    question: "Saturne flotte-t-elle sur l'eau ?",
    hint1: "Densité",
    hint2: "Oui",
    shortAnswer: "Oui, elle est moins dense que l'eau",
    explanation: "La densité de Saturne (0,687 g/cm³) est inférieure à celle de l'eau (1 g/cm³) — elle flotterait théoriquement.",
    sourceUrl: "https://en.wikipedia.org/wiki/Saturn",
    options: ["Non","Seulement ses anneaux","Elle coulerait","Partiellement","Selon la température","Oui, elle est moins dense que l'eau"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 967,
    category: "espace",
    question: "En combien de temps la lumière du Soleil atteint-elle la Terre ?",
    hint1: "Minutes",
    hint2: "8",
    shortAnswer: "8 minutes et 20 secondes",
    explanation: "La lumière du Soleil parcourt les 150 millions de km jusqu'à la Terre en 8 minutes et 20 secondes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Speed_of_light",
    options: ["1 seconde","1 minute","4 minutes","12 minutes","30 minutes","8 minutes et 20 secondes"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 970,
    category: "espace",
    question: "Quelles furent les premières créatures envoyées dans l'espace ?",
    hint1: "1947",
    hint2: "Insectes",
    shortAnswer: "Des mouches à fruits en 1947",
    explanation: "Des mouches à fruits (drosophiles) ont été les premières créatures envoyées dans l'espace par les USA en 1947.",
    sourceUrl: "https://en.wikipedia.org/wiki/Animals_in_space",
    options: ["Une souris","Un singe","Un chien","Un hamster","Un lapin","Des mouches à fruits en 1947"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 972,
    category: "espace",
    question: "Combien pèserait une cuillère d'étoile à neutrons ?",
    hint1: "Dense",
    hint2: "1 milliard",
    shortAnswer: "Environ 1 milliard de tonnes",
    explanation: "La matière d'une étoile à neutrons est si dense qu'une cuillère à café pèserait ~1 milliard de tonnes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Neutron_star",
    options: ["1 kg","1 tonne","1 000 tonnes","1 million tonnes","100 milliards tonnes","Environ 1 milliard de tonnes"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 973,
    category: "espace",
    question: "À quelle vitesse se déplace l'ISS ?",
    hint1: "Rapide",
    hint2: "28 000",
    shortAnswer: "28 000 km/h",
    explanation: "La Station Spatiale Internationale voyage à 28 000 km/h, soit environ 8 km par seconde.",
    sourceUrl: "https://en.wikipedia.org/wiki/International_Space_Station",
    options: ["1 000 km/h","5 000 km/h","10 000 km/h","20 000 km/h","40 000 km/h","28 000 km/h"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 975,
    category: "espace",
    question: "À quelle distance est la sonde Voyager 1 lancée en 1977 ?",
    hint1: "Milliards",
    hint2: "23",
    shortAnswer: "Plus de 23 milliards de km",
    explanation: "Voyager 1, lancée en 1977, est maintenant à plus de 23 milliards de km de la Terre, dans l'espace interstellaire.",
    sourceUrl: "https://en.wikipedia.org/wiki/Voyager_1",
    options: ["1 milliard km","5 milliards km","10 milliards km","15 milliards km","50 milliards km","Plus de 23 milliards de km"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 981,
    category: "psychologie",
    question: "Le cerveau peut maintenir la concentration combien de minutes ?",
    hint1: "Attention",
    hint2: "20",
    shortAnswer: "Environ 20 minutes",
    explanation: "Le cerveau humain a du mal à maintenir une concentration active au-delà de 20 minutes sans pause.",
    sourceUrl: "https://en.wikipedia.org/wiki/Attention_span",
    options: ["5 minutes","10 minutes","30 minutes","1 heure","2 heures","Environ 20 minutes"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 985,
    category: "psychologie",
    question: "Qu'est-ce que l'effet Dunning-Kruger ?",
    hint1: "Compétence",
    hint2: "Biais",
    shortAnswer: "Les incompétents surestiment, les experts",
    explanation: "L'effet Dunning-Kruger est un biais cognitif où les incompétents se surestiment et les experts doutent d'eux-mêmes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Dunning%E2%80%93Kruger_effect",
    options: ["Mémoire sélective","Biais de confirmation","Confiance des experts","Effet placebo cognitif","Phénomène d'imposteur","Les incompétents surestiment, les experts"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'expert',
  },
  {
    id: 987,
    category: "psychologie",
    question: "L'effet Zeigarnik dit qu'on se souvient mieux de quoi ?",
    hint1: "Tâche",
    hint2: "Interrompue",
    shortAnswer: "Des tâches interrompues",
    explanation: "L'effet Zeigarnik décrit que les tâches inachevées ou interrompues sont mieux mémorisées que les tâches complètes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Zeigarnik_effect",
    options: ["Tâches agréables","Premières tâches","Dernières tâches","Tâches réussies","Tâches difficiles","Des tâches interrompues"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 992,
    category: "psychologie",
    question: "Combien de fois par jour une personne ment-elle en moyenne ?",
    hint1: "Conversation",
    hint2: "1-2",
    shortAnswer: "1 à 2 fois par jour",
    explanation: "Des études estiment qu'une personne ment en moyenne 1 à 2 fois par jour dans ses interactions sociales.",
    sourceUrl: "https://en.wikipedia.org/wiki/Lie",
    options: ["Jamais","10 fois","5 fois","Seulement rarement","3-4 fois","1 à 2 fois par jour"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 995,
    category: "psychologie",
    question: "Le syndrome de Paris touche principalement quels touristes ?",
    hint1: "Japon",
    hint2: "Déception",
    shortAnswer: "Les touristes japonais",
    explanation: "Le syndrome de Paris décrit l'état de choc de touristes japonais confrontés à une réalité très différente de l'image idéalisée.",
    sourceUrl: "https://en.wikipedia.org/wiki/Paris_syndrome",
    options: ["Américains","Chinois","Australiens","Allemands","Brésiliens","Les touristes japonais"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'easy',
  },
  {
    id: 996,
    category: "psychologie",
    question: "Les gens achètent-ils plus dans les magasins qui sentent bon ?",
    hint1: "Marketing",
    hint2: "Oui",
    shortAnswer: "Oui, le marketing olfactif est prouvé",
    explanation: "Le marketing olfactif est une technique réelle : les bonnes odeurs augmentent les achats spontanés.",
    sourceUrl: "https://en.wikipedia.org/wiki/Sensory_marketing",
    options: ["Non","Peut-être","Seulement les femmes","Ça les ralentit","Aucun effet","Oui, le marketing olfactif est prouvé"],
    correctIndex: 5,
    imageUrl: null,
    difficulty: 'normal',
  },
  {
    id: 999,
    category: "kids",
    question: "Qui est le meilleur à What The Fact! ?",
    hint1: "Famille",
    hint2: "Kalfon",
    shortAnswer: "Aucun",
    explanation: "C'est Michael le meilleur il a crée toutes les questions ET les réponses !! mais il aurait jamais pu sans l'aide de DIAMS !",
    sourceUrl: "",
    options: ["Aucun","Shirel","Isaac","Aaron"],
    correctIndex: 0,
    imageUrl: "https://znoceotakhynqcqhpwgz.supabase.co/storage/v1/object/public/fact-images/facts/new-1774710871260.png",
    difficulty: 'easy',
  },
]

export const getCategoryById = (id) => CATEGORIES.find((c) => c.id === id)

// Extract fact ID from relative imageUrl (e.g., "/assets/facts/365.png" â 365)
const getImageId = (imageUrl) => {
  if (!imageUrl || imageUrl.startsWith('http')) return null
  const match = imageUrl.match(/\/(\d+)\.png$/)
  return match ? parseInt(match[1]) : null
}

// Only images 1-350 exist physically in public/assets/facts/
// Facts 351-850 reference images that don't exist, so they're filtered out
const EXISTING_IMAGE_IDS = new Set(Array.from({ length: 350 }, (_, i) => i + 1))

export const isFactValid = (fact) => {
  if (!fact || !fact.question || !fact.category) return false
  if (!Array.isArray(fact.options) || fact.options.length < 2) return false
  if (typeof fact.correctIndex !== 'number' || fact.correctIndex < 0) return false

  // imageUrl: null â no image, allowed
  // imageUrl: "https://..." â external image, always allowed
  // imageUrl: "/assets/facts/N.png" â must exist locally (N between 1-350)
  if (fact.imageUrl !== null && fact.imageUrl !== undefined) {
    if (!fact.imageUrl.startsWith('http')) {
      const imageId = getImageId(fact.imageUrl)
      if (imageId === null || !EXISTING_IMAGE_IDS.has(imageId)) return false
    }
  }

  return true
}

export const VALID_FACTS = FACTS.filter(isFactValid)

// Categories available for gameplay (disabled: true = hidden until ready)
export const PLAYABLE_CATEGORIES = CATEGORIES.filter((c) => !c.disabled)

export const getFactsByCategory = (categoryId) =>
  categoryId
    ? VALID_FACTS.filter((f) => f.category === categoryId)
    : VALID_FACTS

// Build difficulty assignment:
//   Priority 1 â use stored difficulty field (set in admin, synced from Supabase)
//   Priority 2 â positional fallback (first 10 per category = easy, next 10 = normal, rest = expert)
function buildDifficultyAssignment() {
  const map = {}

  // Priority 1: use stored difficulty where available
  for (const f of FACTS) {
    if (!f || !f.difficulty) continue
    switch (f.difficulty.toLowerCase()) {
      case 'facile': case 'easy': case 'cool':     map[f.id] = 'cool'; break
      case 'normal': case 'hot':                   map[f.id] = 'hot';  break
      case 'expert': case 'hard': case 'wtf':      map[f.id] = 'wtf';  break
    }
  }

  // Priority 2: positional fallback for facts without stored difficulty
  const catIds = CATEGORIES.filter(c => !c.disabled).map(c => c.id)
  for (const catId of catIds) {
    const catFacts = FACTS
      .filter(f => f && f.question && f.category === catId && Array.isArray(f.options) && f.options.length >= 2 && typeof f.correctIndex === 'number' && !map[f.id])
      .sort((a, b) => a.id - b.id)
    catFacts.forEach((f, i) => {
      if (i < 10) map[f.id] = 'cool'
      else if (i < 20) map[f.id] = 'hot'
      else map[f.id] = 'wtf'
    })
  }
  return map
}
export const DIFFICULTY_ASSIGNMENT = buildDifficultyAssignment()

// Parcours facts: relaxed image filter (imageUrl â null if image missing), includes difficulty + isSuperWTF
export const PARCOURS_FACTS = FACTS
  .filter(f => f && f.question && f.category && Array.isArray(f.options) && f.options.length >= 2 && typeof f.correctIndex === 'number' && DIFFICULTY_ASSIGNMENT[f.id])
  .map(f => {
    let imageUrl = f.imageUrl
    if (imageUrl !== null && imageUrl !== undefined && !imageUrl.startsWith('http')) {
      const imageId = getImageId(imageUrl)
      if (!imageId || !EXISTING_IMAGE_IDS.has(imageId)) imageUrl = null
    }
    return { ...f, imageUrl, difficulty: DIFFICULTY_ASSIGNMENT[f.id], isSuperWTF: false }
  })

// Lookup: category+difficulty â Set of fact IDs (for completion detection)
export const CATEGORY_LEVEL_FACT_IDS = {}
PARCOURS_FACTS.forEach(f => {
  const key = `${f.category}_${f.difficulty}`
  if (!CATEGORY_LEVEL_FACT_IDS[key]) CATEGORY_LEVEL_FACT_IDS[key] = new Set()
  CATEGORY_LEVEL_FACT_IDS[key].add(f.id)
})

// âââ WTF du Jour â daily game loop âââââââââââââââââââââââââââââââââââââââââ

// VIP Fact IDs â manually curated selection of the most "What The Fact!" facts
export const VIP_FACT_IDS = new Set([
  4, 7, 17, 24, 35, 47, 80, 90, 100, 120, 130, 140, 160, 180, 190, 240, 290, 310, 350,
])

// Generate a masked teaser title â reveals first ~40% of words to build curiosity
export function getTitrePartiel(fact) {
  const answer = fact.shortAnswer || ''
  const words = answer.split(' ')
  if (words.length <= 1) return `${words[0] || '...'} [masquÃ©] ð`
  const revealCount = Math.max(1, Math.floor(words.length * 0.4))
  return `${words.slice(0, revealCount).join(' ')}... [masquÃ©] ð`
}

// Get today's WTF du Jour fact â deterministic per calendar day, same for all users
export function getDailyFact() {
  const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const pool = VALID_FACTS.filter(f => VIP_FACT_IDS.has(f.id))
  const facts = pool.length > 0 ? pool : VALID_FACTS
  return facts[seed % facts.length]
}
