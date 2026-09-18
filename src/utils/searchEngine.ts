import { CampusLocation, FacultyMember, CourseDepartmentMapping, LocationCategory } from '../types';

export interface SearchResultItem {
  id: string;
  type: 'location' | 'course' | 'faculty';
  title: string;
  hindiTitle?: string;
  subtitle: string;
  category: LocationCategory | 'course' | 'faculty';
  targetLocation: CampusLocation;
  floor?: string;
  room?: string;
  score: number;
  matchedField: string;
  matchedSnippet?: string;
  highlightIndices?: [number, number];
  badgeText?: string;
}

export interface SearchEngineResponse {
  query: string;
  correctedQuery?: string;
  didYouMean?: string;
  hasTypoCorrection: boolean;
  results: SearchResultItem[];
}

// 1. Comprehensive CSJMU Keyword & Synonym Thesaurus
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  // UIET & Engineering
  uiet: ['uiet', 'engineering', 'btech', 'mtech', 'b.tech', 'm.tech', 'technology', 'engineer', 'engg', 'institute of engineering', 'युईईटी', 'इंजीनियरिंग'],
  uiet1: ['uiet 1', 'uiet-1', 'block 1', 'cse', 'it', 'computer science', 'bca', 'mca', 'ai', 'aiml', 'artificial intelligence', 'data science', 'cs department', 'कंप्यूटर साइंस'],
  uiet2: ['uiet 2', 'uiet-2', 'block 2', 'ece', 'electronics', 'ee', 'electrical', 'communication', 'इलेक्ट्रॉनिक्स'],
  uiet3: ['uiet 3', 'uiet-3', 'block 3', 'me', 'mechanical', 'civil', 'chemical', 'workshop', 'cad cam', 'मैकेनिकल', 'सिविल', 'केमिकल'],
  cse: ['cse', 'computer science', 'it', 'information tech', 'software', 'programming', 'coding', 'bca', 'mca', 'uiet 1'],
  btech: ['btech', 'b.tech', 'b tech', 'engineering', 'bachelor of technology', 'uiet'],
  mca: ['mca', 'bca', 'computer application', 'uiet 1'],
  
  // Library
  library: ['library', 'lib', 'central library', 'pustakalay', 'books', 'reading room', 'e-library', 'shivaji library', 'chhatrapati shivaji', 'पुस्तकालय', 'किताबें'],
  
  // Food & Refreshment
  canteen: ['canteen', 'cafeteria', 'nescafe', 'amul', 'verka', 'mess', 'food', 'snack', 'chai', 'tea', 'coffee', 'lunch', 'breakfast', 'samosa', 'maggi', 'dhaba', 'कैंटीन', 'खाना', 'चाय'],
  nescafe: ['nescafe', 'coffee', 'canteen', 'shake', 'snacks', 'uiet canteen'],
  amul: ['amul', 'ice cream', 'milk', 'dairy', 'beverage', 'amul parlour'],
  
  // Admin & Governance
  admin: ['admin', 'administrative block', 'chhatrapati shahu bhavan', 'shahu ji bhavan', 'vc', 'vice chancellor', 'registrar', 'admission', 'enquiry', 'finance', 'cfo', 'pariksha', 'prashasanik', 'प्रशासनिक भवन', 'वीसी'],
  vc: ['vc', 'vice chancellor', 'kulpati', 'vc office', 'vc chamber', 'secretariat', 'kulapati', 'कुलपति', 'वीसी कार्यालय'],
  registrar: ['registrar', 'kulsachiv', 'kul sachiv', 'admin', 'कुलसचिव'],
  ssc: ['ssc', 'student support cell', 'facilitation', 'help desk', 'duplicate marksheet', 'migration', 'degree counter', 'छात्र सुविधा केंद्र'],
  
  // Evaluation & Exams
  evaluation: ['evaluation', 'central evaluation', 'mulyankan', 'pariksha bhavan', 'confidential', 'answer sheets', 'copy checking', 'kopyan', 'coe', 'controller of examinations', 'मूल्यांकन भवन', 'परीक्षा'],
  exam: ['exam', 'examination', 'coe', 'admit card', 'marksheet', 'pariksha', 'evaluation'],
  
  // Lecture Hall & Auditoriums
  lhc: ['lhc', 'lecture hall complex', 'smart classes', 'smart classroom', 'lecture hall', 'vyakhyan kaksh', 'व्याख्यान कक्ष परिसर'],
  auditorium: ['auditorium', 'audi', 'atal bihari vajpayee', 'atal auditorium', 'hall', 'convocation', 'sabhaagar', 'functions', 'सभागार', 'ऑडिटोरियम'],
  
  // Health & Medicine
  health: ['health', 'hospital', 'dispensary', 'health centre', 'doctor', 'clinic', 'first aid', 'emergency', 'ambulance', 'swasthya', 'aspataal', 'dawai', 'स्वास्थ्य केंद्र', 'अस्पताल'],
  pharmacy: ['pharmacy', 'pharma', 'd pharma', 'b pharma', 'm pharma', 'institute of pharmacy', 'medicines', 'फार्मेसी', 'औषधि'],
  
  // Hostels
  hostel: ['hostel', 'chhatravas', 'boys hostel', 'girls hostel', 'ganga', 'yamuna', 'saraswati', 'kaveri', 'shivaji hostel', 'durgawati', 'jhansi', 'mess', 'छात्र hostel', 'छात्रावास'],
  girlshostel: ['girls hostel', 'ganga', 'yamuna', 'saraswati', 'kaveri', 'mahila chhatravas', 'गर्ल्स हॉस्टल'],
  boyshostel: ['boys hostel', 'shivaji boys hostel', 'swarna jayanti hostel', 'बॉयज हॉस्टल'],
  
  // Sports & Stadium
  sports: ['sports', 'stadium', 'ground', 'cricket', 'football', 'badminton', 'running track', 'athletics', 'gym', 'swimming pool', 'khel', 'stadiam', 'स्टेडियम', 'खेल का मैदान'],
  gym: ['gym', 'fitness centre', 'workout', 'stadium gym', 'जिम'],
  swimming: ['swimming pool', 'pool', 'sports complex', 'स्विमिंग पूल'],
  
  // Gates & Transport
  gate1: ['gate 1', 'gate-1', 'main gate', 'gt road gate', 'kalyanpur gate', 'mukhy dwar', 'गेट 1', 'मुख्य द्वार'],
  gate2: ['gate 2', 'gate-2', 'side gate', 'hospital gate', 'uiet gate', 'गेट 2'],
  gate3: ['gate 3', 'gate-3', 'back gate', 'residential gate', 'hostel gate', 'गेट 3'],
  helipad: ['helipad', 'helicopter', 'sports ground helipad', 'हेलीपैड'],
  parking: ['parking', 'vehicle stand', 'cycle stand', 'car parking', 'पार्किंग'],
  
  // Other Departments
  biotech: ['biotech', 'biotechnology', 'bio engineering', 'life sciences', 'माइक्रोबायोलॉजी', 'बायोटेक'],
  materials: ['materials science', 'nanotechnology', 'polymer', 'nano science', 'मटीरियल साइंस'],
  hotel: ['ihtm', 'hotel management', 'tourism', 'hospitality', 'catering', 'cooking', 'होटल मैनेजमेंट'],
  law: ['law', 'school of law', 'llb', 'ba llb', 'bba llb', 'moot court', 'vidhi', 'कानून', 'विधि संकाय'],
  finearts: ['fine arts', 'lalit kala', 'painting', 'sculpture', 'music', 'drawing', 'art department', 'ललित कला'],
  education: ['education', 'shiksha vibhag', 'bed', 'b.ed', 'med', 'm.ed', 'teacher training', 'शिक्षा विभाग'],
  english: ['english', 'foreign languages', 'french', 'german', 'linguistics', 'language lab', 'अंग्रेजी विभाग'],
  physics: ['physics', 'applied physics', 'laser lab', 'optics', 'material physics', 'भौतिकी विभाग'],
  bank: ['bank', 'pnb', 'punjab national bank', 'sbi', 'atm', 'cash', 'money', 'बैंक', 'एटीएम'],
  postoffice: ['post office', 'dak ghar', 'speed post', 'courier', 'डाकघर'],
  temple: ['temple', 'mandir', 'shiv mandir', 'campus temple', 'मंदिर']
};

// 2. Common Typos / Misspellings Mapping (Direct Phonetic Corrections)
const COMMON_TYPOS: Record<string, string> = {
  // UIET & Engineering
  uieet: 'uiet',
  ueit: 'uiet',
  uet: 'uiet',
  uiett: 'uiet',
  iuet: 'uiet',
  engneering: 'engineering',
  engenering: 'engineering',
  engg: 'engineering',
  bteck: 'btech',
  btehc: 'btech',
  btechh: 'btech',
  mcba: 'mca',
  compter: 'computer',
  computr: 'computer',
  computar: 'computer',
  softwere: 'software',

  // Canteen & Food
  caneteen: 'canteen',
  cantin: 'canteen',
  cantene: 'canteen',
  kanteen: 'canteen',
  kantin: 'canteen',
  cafteria: 'cafeteria',
  caffeteria: 'cafeteria',
  nescfe: 'nescafe',
  nescafeee: 'nescafe',
  nescefe: 'nescafe',
  amull: 'amul',

  // Library
  libary: 'library',
  librari: 'library',
  libray: 'library',
  librery: 'library',
  lybrary: 'library',
  pustkalay: 'pustakalay',
  pustakly: 'pustakalay',
  pustaklay: 'pustakalay',

  // Hostels
  hostal: 'hostel',
  hostle: 'hostel',
  hotal: 'hostel',
  hostell: 'hostel',
  chatravas: 'chhatravas',
  chatrawaash: 'chhatravas',

  // Stadium & Sports
  stadiam: 'stadium',
  stedium: 'stadium',
  stadim: 'stadium',
  stydium: 'stadium',
  staydium: 'stadium',
  swimng: 'swimming pool',
  swimmin: 'swimming pool',

  // Auditorium
  auditirium: 'auditorium',
  auditerium: 'auditorium',
  oditorium: 'auditorium',
  audi: 'auditorium',
  audutorium: 'auditorium',
  audtiorium: 'auditorium',
  sabagar: 'sabhaagar',
  sabhaghar: 'sabhaagar',

  // Administrative & VC
  adminstrativ: 'admin',
  admistration: 'admin',
  admn: 'admin',
  administartive: 'admin',
  vicechancler: 'vc',
  vicechancellor: 'vc',
  vcoffce: 'vc',
  regsitrar: 'registrar',
  regstrar: 'registrar',

  // Evaluation & Exams
  evalution: 'evaluation',
  evaluvation: 'evaluation',
  evaliation: 'evaluation',
  muliyankan: 'mulyankan',
  mulyankn: 'mulyankan',
  kopyan: 'evaluation',
  pariksha: 'examination',
  pareeksha: 'examination',

  // Lecture Hall
  lecutre: 'lhc',
  lectur: 'lhc',
  lectrue: 'lhc',
  lhcc: 'lhc',

  // Hospital & Health
  dispencery: 'dispensary',
  dispensery: 'dispensary',
  dispenzary: 'dispensary',
  medicl: 'health',
  hospitl: 'health',
  aspatal: 'health',

  // Pharmacy & Biotech & Science
  pharamcy: 'pharmacy',
  farmacy: 'pharmacy',
  farmasi: 'pharmacy',
  pharmaa: 'pharmacy',
  bioteck: 'biotech',
  biotec: 'biotech',
  nanoteck: 'materials',
  nanotec: 'materials',
  matrial: 'materials',
  finitarts: 'finearts',
  fineart: 'finearts',
  lalitkala: 'finearts',

  // Gates & Bank
  gat: 'gate',
  get: 'gate',
  gatee: 'gate',
  gat1: 'gate 1',
  get1: 'gate 1',
  gat2: 'gate 2',
  get2: 'gate 2',
  gat3: 'gate 3',
  get3: 'gate 3',
  atmm: 'atm',
  pnnb: 'pnb',
  sbii: 'sbi'
};

// 3. String distance algorithms (Levenshtein & Damerau-Levenshtein)
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition (e.g. "ui" <-> "iu", "re" <-> "er")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        min = Math.min(min, matrix[i - 2][j - 2] + cost);
      }
      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

// Normalized Similarity (0 to 1)
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;
  if (longer.length === 0) return 1.0;
  
  const editDistance = damerauLevenshtein(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

// Phonetic / Normalization Cleaner
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[.,\-_/\\()&:]/g, ' ')
    .replace(/\s+/g, ' ');
}

// 4. Smart Spell Corrector & Query Expansion
export function correctTypo(rawQuery: string): { corrected: string; wasCorrected: boolean; didYouMean?: string } {
  const norm = normalizeQuery(rawQuery);
  if (!norm) return { corrected: '', wasCorrected: false };

  // 1. Direct typo check in Dictionary
  if (COMMON_TYPOS[norm]) {
    return {
      corrected: COMMON_TYPOS[norm],
      wasCorrected: true,
      didYouMean: COMMON_TYPOS[norm]
    };
  }

  // 2. Token-by-token typo correction
  const tokens = norm.split(' ');
  let changed = false;
  const newTokens = tokens.map((token) => {
    if (COMMON_TYPOS[token]) {
      changed = true;
      return COMMON_TYPOS[token];
    }
    return token;
  });

  if (changed) {
    const joined = newTokens.join(' ');
    return {
      corrected: joined,
      wasCorrected: true,
      didYouMean: joined
    };
  }

  // 3. Fuzzy check against all known synonym keys
  let bestKey = '';
  let bestSim = 0;

  for (const key of Object.keys(KEYWORD_SYNONYMS)) {
    const sim = stringSimilarity(norm, key);
    if (sim > bestSim && sim >= 0.70) {
      bestSim = sim;
      bestKey = key;
    }

    // Check against individual synonyms
    for (const syn of KEYWORD_SYNONYMS[key]) {
      const synSim = stringSimilarity(norm, syn);
      if (synSim > bestSim && synSim >= 0.75) {
        bestSim = synSim;
        bestKey = syn;
      }
    }
  }

  if (bestKey && bestSim >= 0.70 && bestKey.toLowerCase() !== norm) {
    return {
      corrected: bestKey,
      wasCorrected: true,
      didYouMean: bestKey
    };
  }

  return { corrected: norm, wasCorrected: false };
}

// 5. Intelligent Multi-Entity Search Engine
export function performSmartSearch(
  query: string,
  locations: CampusLocation[],
  courses: CourseDepartmentMapping[] = [],
  facultyList: FacultyMember[] = []
): SearchEngineResponse {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      hasTypoCorrection: false,
      results: []
    };
  }

  const { corrected, wasCorrected, didYouMean } = correctTypo(trimmed);
  const activeQueries = Array.from(new Set([normalizeQuery(trimmed), normalizeQuery(corrected)]));

  const resultsMap = new Map<string, SearchResultItem>();

  // Helper to add or upgrade result
  const registerResult = (item: SearchResultItem) => {
    const existing = resultsMap.get(item.id);
    if (!existing || item.score > existing.score) {
      resultsMap.set(item.id, item);
    }
  };

  for (const q of activeQueries) {
    if (!q) continue;
    const qTokens = q.split(' ').filter(Boolean);

    // --- Search Locations ---
    for (const loc of locations) {
      let score = 0;
      let matchedField = '';
      let matchedSnippet = '';

      const titleLower = loc.title.toLowerCase();
      const hindiTitleLower = (loc.hindiTitle || '').toLowerCase();
      const descLower = loc.description.toLowerCase();
      const hindiDescLower = (loc.hindiDescription || '').toLowerCase();
      const blockLower = (loc.block || '').toLowerCase();
      const terms = (loc.popularSearchTerms || []).map((t) => t.toLowerCase());

      // 1. Exact or Prefix Title Match
      if (titleLower === q || hindiTitleLower === q) {
        score = 100;
        matchedField = 'Exact Name';
      } else if (titleLower.startsWith(q) || hindiTitleLower.startsWith(q)) {
        score = 90;
        matchedField = 'Name Prefix';
      } else if (titleLower.includes(q) || hindiTitleLower.includes(q)) {
        score = 80;
        matchedField = 'Name';
      }

      // 2. Acronym / Block match (e.g. "UIET 1", "LHC", "SSC", "Admin")
      if (blockLower && (blockLower.includes(q) || q.includes(blockLower))) {
        score = Math.max(score, 85);
        matchedField = 'Block';
      }

      // 3. Keyword / Synonyms Check
      for (const term of terms) {
        if (term === q) {
          score = Math.max(score, 95);
          matchedField = 'Keyword';
          matchedSnippet = term;
          break;
        } else if (term.includes(q) || q.includes(term)) {
          score = Math.max(score, 75);
          matchedField = 'Keyword';
          matchedSnippet = term;
        } else {
          // Fuzzy match on term
          const sim = stringSimilarity(q, term);
          if (sim >= 0.75) {
            score = Math.max(score, Math.round(sim * 80));
            matchedField = 'Fuzzy Term';
            matchedSnippet = term;
          }
        }
      }

      // 4. Token Matching (e.g. "uiet block 1" matches "uiet" + "block" + "1")
      if (qTokens.length > 1) {
        const fullText = `${titleLower} ${hindiTitleLower} ${descLower} ${blockLower} ${terms.join(' ')}`;
        const matchedTokens = qTokens.filter((token) => fullText.includes(token));
        if (matchedTokens.length === qTokens.length) {
          score = Math.max(score, 85);
          matchedField = 'Multi-word Match';
        } else if (matchedTokens.length >= 1) {
          score = Math.max(score, 50 + (matchedTokens.length / qTokens.length) * 25);
        }
      }

      // 5. Global Thesaurus check (e.g. "canteen" synonym matches Cafeteria)
      for (const [key, synList] of Object.entries(KEYWORD_SYNONYMS)) {
        if (synList.some((s) => s.includes(q) || q.includes(s))) {
          const locText = `${titleLower} ${descLower} ${terms.join(' ')}`.toLowerCase();
          if (locText.includes(key) || synList.some((s) => locText.includes(s))) {
            score = Math.max(score, 78);
            matchedField = 'Synonym Match';
          }
        }
      }

      // 6. Fuzzy Match on Title
      const titleSim = Math.max(
        stringSimilarity(q, titleLower),
        stringSimilarity(q, hindiTitleLower)
      );
      if (titleSim >= 0.65) {
        score = Math.max(score, Math.round(titleSim * 75));
        if (!matchedField) matchedField = 'Similar Name';
      }

      // Description Match
      if (descLower.includes(q) || hindiDescLower.includes(q)) {
        score = Math.max(score, 60);
        if (!matchedField) matchedField = 'Description';
      }

      // If score is high enough, register
      if (score >= 40) {
        registerResult({
          id: loc.id,
          type: 'location',
          title: loc.title,
          hindiTitle: loc.hindiTitle,
          subtitle: loc.description,
          category: loc.category,
          targetLocation: loc,
          floor: loc.floor,
          room: loc.roomNumber,
          score,
          matchedField,
          matchedSnippet: matchedSnippet || loc.block || loc.floor,
          badgeText: loc.category.toUpperCase()
        });
      }
    }

    // --- Search Courses (e.g. "B.Tech CSE", "MCA", "LL.B") ---
    for (const course of courses) {
      const cName = course.courseName.toLowerCase();
      const hName = course.hindiName.toLowerCase();
      const tags = course.tags.map((t) => t.toLowerCase());

      let courseScore = 0;
      if (cName.includes(q) || hName.includes(q)) {
        courseScore = 88;
      } else if (tags.some((t) => t.includes(q) || q.includes(t))) {
        courseScore = 80;
      } else {
        const sim = stringSimilarity(q, cName);
        if (sim >= 0.70) {
          courseScore = Math.round(sim * 75);
        }
      }

      if (courseScore >= 50) {
        const targetLoc = locations.find((l) => l.id === course.departmentLocationId);
        if (targetLoc) {
          registerResult({
            id: `course-${course.courseId}`,
            type: 'course',
            title: course.courseName,
            hindiTitle: course.hindiName,
            subtitle: `${course.departmentName} • ${course.block}, ${course.floor}`,
            category: 'course',
            targetLocation: targetLoc,
            floor: course.floor,
            room: course.hodCabin,
            score: courseScore,
            matchedField: 'Course / Degree',
            badgeText: 'COURSE'
          });
        }
      }
    }

    // --- Search Faculty (e.g. "Vinay Pathak", "HOD Civil") ---
    for (const fac of facultyList) {
      const fName = fac.name.toLowerCase();
      const fHindi = (fac.hindiName || '').toLowerCase();
      const fDept = fac.department.toLowerCase();
      const fDesig = fac.designation.toLowerCase();
      const subjects = (fac.subjects || []).map((s) => s.toLowerCase());

      let facScore = 0;
      if (fName.includes(q) || fHindi.includes(q)) {
        facScore = 92;
      } else if (fDesig.includes(q) || fDept.includes(q)) {
        facScore = 78;
      } else if (subjects.some((s) => s.includes(q))) {
        facScore = 72;
      } else {
        const sim = stringSimilarity(q, fName);
        if (sim >= 0.70) {
          facScore = Math.round(sim * 80);
        }
      }

      if (facScore >= 50) {
        const targetLoc = locations.find(
          (l) => l.id === fac.buildingId || l.id === fac.departmentId
        ) || locations[0];

        registerResult({
          id: `fac-${fac.id}`,
          type: 'faculty',
          title: fac.name,
          hindiTitle: fac.hindiName,
          subtitle: `${fac.designation} • ${fac.buildingName} (${fac.cabinRoom})`,
          category: 'faculty',
          targetLocation: targetLoc,
          floor: fac.floor,
          room: fac.cabinRoom,
          score: facScore,
          matchedField: 'Faculty / Cabin',
          badgeText: 'FACULTY'
        });
      }
    }
  }

  // Sort descending by relevance score
  const sortedResults = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);

  return {
    query: trimmed,
    correctedQuery: wasCorrected ? corrected : undefined,
    didYouMean: wasCorrected ? didYouMean : undefined,
    hasTypoCorrection: wasCorrected,
    results: sortedResults.slice(0, 10)
  };
}
