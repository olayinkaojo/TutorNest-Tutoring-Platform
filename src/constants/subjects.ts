// Knowledge Fons Academy Subject Categories and Pricing

export const SUBJECT_CATEGORIES = {
  MATHEMATICS: 'Mathematics',
  ENGLISH: 'English',
  SCIENCES: 'Sciences',
  HUMANITIES: 'Humanities',
  LANGUAGES: 'Languages',
  ARTS: 'Creative Arts',
  COMPUTING: 'Computer Science',
  PHYSICAL_ED: 'Physical Education',
  EXAM_PREP: 'Exam Preparation',
  SPECIAL_NEEDS: 'Special Educational Needs',
  STUDY_SKILLS: 'Study Skills'
};

export const SUBJECTS = {
  // Mathematics
  'Primary Mathematics': { category: 'Mathematics', tier: 1, price: 14000 },
  'Secondary Mathematics (Year 7-9)': { category: 'Mathematics', tier: 2, price: 18000 },
  'GCSE Mathematics': { category: 'Mathematics', tier: 3, price: 22000 },
  'A-Level Mathematics': { category: 'Mathematics', tier: 4, price: 28000 },
  'Further Mathematics': { category: 'Mathematics', tier: 4, price: 28000 },
  'Statistics': { category: 'Mathematics', tier: 3, price: 22000 },
  'Algebra': { category: 'Mathematics', tier: 2, price: 18000 },
  'Geometry': { category: 'Mathematics', tier: 2, price: 18000 },
  'Calculus': { category: 'Mathematics', tier: 4, price: 28000 },

  // English
  'Primary English': { category: 'English', tier: 1, price: 14000 },
  'Secondary English': { category: 'English', tier: 2, price: 18000 },
  'GCSE English Language': { category: 'English', tier: 3, price: 22000 },
  'GCSE English Literature': { category: 'English', tier: 3, price: 22000 },
  'A-Level English Literature': { category: 'English', tier: 4, price: 28000 },
  'Creative Writing': { category: 'English', tier: 2, price: 18000 },
  'Essay Writing': { category: 'English', tier: 2, price: 18000 },

  // Sciences
  'Primary Science': { category: 'Sciences', tier: 1, price: 14000 },
  'Secondary Science (Year 7-9)': { category: 'Sciences', tier: 2, price: 18000 },
  'GCSE Biology': { category: 'Sciences', tier: 3, price: 22000 },
  'GCSE Chemistry': { category: 'Sciences', tier: 3, price: 22000 },
  'GCSE Physics': { category: 'Sciences', tier: 3, price: 22000 },
  'A-Level Biology': { category: 'Sciences', tier: 4, price: 28000 },
  'A-Level Chemistry': { category: 'Sciences', tier: 4, price: 28000 },
  'A-Level Physics': { category: 'Sciences', tier: 4, price: 28000 },
  'Combined Science': { category: 'Sciences', tier: 3, price: 22000 },

  // Humanities
  'History': { category: 'Humanities', tier: 2, price: 18000 },
  'Geography': { category: 'Humanities', tier: 2, price: 18000 },
  'Religious Studies': { category: 'Humanities', tier: 2, price: 18000 },
  'GCSE History': { category: 'Humanities', tier: 3, price: 22000 },
  'GCSE Geography': { category: 'Humanities', tier: 3, price: 22000 },
  'A-Level History': { category: 'Humanities', tier: 4, price: 28000 },
  'A-Level Geography': { category: 'Humanities', tier: 4, price: 28000 },
  'Psychology': { category: 'Humanities', tier: 3, price: 22000 },
  'Sociology': { category: 'Humanities', tier: 3, price: 22000 },
  'Economics': { category: 'Humanities', tier: 3, price: 22000 },
  'Business Studies': { category: 'Humanities', tier: 3, price: 22000 },

  // Languages
  'French (Beginner)': { category: 'Languages', tier: 2, price: 18000 },
  'French (Intermediate)': { category: 'Languages', tier: 2, price: 18000 },
  'French (Advanced)': { category: 'Languages', tier: 3, price: 22000 },
  'Spanish (Beginner)': { category: 'Languages', tier: 2, price: 18000 },
  'Spanish (Intermediate)': { category: 'Languages', tier: 2, price: 18000 },
  'Spanish (Advanced)': { category: 'Languages', tier: 3, price: 22000 },
  'German (Beginner)': { category: 'Languages', tier: 2, price: 18000 },
  'German (Intermediate)': { category: 'Languages', tier: 2, price: 18000 },
  'German (Advanced)': { category: 'Languages', tier: 3, price: 22000 },
  'Mandarin Chinese': { category: 'Languages', tier: 3, price: 22000 },
  'Italian': { category: 'Languages', tier: 2, price: 18000 },
  'Arabic': { category: 'Languages', tier: 2, price: 18000 },
  'Latin': { category: 'Languages', tier: 3, price: 22000 },

  // Creative Arts
  'Art & Design': { category: 'Creative Arts', tier: 2, price: 18000 },
  'Music': { category: 'Creative Arts', tier: 2, price: 18000 },
  'Music Theory': { category: 'Creative Arts', tier: 2, price: 18000 },
  'Drama': { category: 'Creative Arts', tier: 2, price: 18000 },
  'Photography': { category: 'Creative Arts', tier: 2, price: 18000 },
  'Graphic Design': { category: 'Creative Arts', tier: 3, price: 22000 },

  // Computer Science
  'Computer Science (GCSE)': { category: 'Computer Science', tier: 3, price: 22000 },
  'Computer Science (A-Level)': { category: 'Computer Science', tier: 4, price: 28000 },
  'Programming (Python)': { category: 'Computer Science', tier: 3, price: 22000 },
  'Programming (Java)': { category: 'Computer Science', tier: 3, price: 22000 },
  'Programming (JavaScript)': { category: 'Computer Science', tier: 3, price: 22000 },
  'Web Development': { category: 'Computer Science', tier: 3, price: 22000 },
  'Database Management': { category: 'Computer Science', tier: 3, price: 22000 },

  // Physical Education
  'Physical Education': { category: 'Physical Education', tier: 2, price: 18000 },
  'Sports Science': { category: 'Physical Education', tier: 3, price: 22000 },

  // Exam Preparation
  'SATs Preparation': { category: 'Exam Preparation', tier: 2, price: 18000 },
  '11+ Exam Preparation': { category: 'Exam Preparation', tier: 3, price: 22000 },
  '13+ Exam Preparation': { category: 'Exam Preparation', tier: 3, price: 22000 },
  'GCSE Exam Technique': { category: 'Exam Preparation', tier: 3, price: 22000 },
  'A-Level Exam Technique': { category: 'Exam Preparation', tier: 4, price: 28000 },
  'Oxbridge Preparation': { category: 'Exam Preparation', tier: 4, price: 28000 },
  'Medical School Entrance (UCAT/BMAT)': { category: 'Exam Preparation', tier: 4, price: 28000 },
  'Law School Entrance (LNAT)': { category: 'Exam Preparation', tier: 4, price: 28000 },
  'IB Diploma Programme': { category: 'Exam Preparation', tier: 4, price: 28000 },
  'UCAS Personal Statement': { category: 'Exam Preparation', tier: 3, price: 22000 },

  // Special Educational Needs
  'Dyslexia Support': { category: 'Special Educational Needs', tier: 4, price: 28000 },
  'Dyscalculia Support': { category: 'Special Educational Needs', tier: 4, price: 28000 },
  'ADHD Support': { category: 'Special Educational Needs', tier: 4, price: 28000 },
  'Autism Spectrum Support': { category: 'Special Educational Needs', tier: 4, price: 28000 },
  'General Learning Difficulties': { category: 'Special Educational Needs', tier: 4, price: 28000 },
  'Gifted & Talented Support': { category: 'Special Educational Needs', tier: 4, price: 28000 },

  // Study Skills
  'Study Skills': { category: 'Study Skills', tier: 1, price: 14000 },
  'Time Management': { category: 'Study Skills', tier: 1, price: 14000 },
  'Revision Techniques': { category: 'Study Skills', tier: 2, price: 18000 },
  'Note-Taking': { category: 'Study Skills', tier: 1, price: 14000 },
  'General Homework Support': { category: 'Study Skills', tier: 1, price: 14000 },
};

// Helper function to get all subjects as an array
export const getAllSubjects = (): string[] => {
  return Object.keys(SUBJECTS);
};

// Helper function to get subjects by category
export const getSubjectsByCategory = (category: string): string[] => {
  return Object.entries(SUBJECTS)
    .filter(([_, data]) => data.category === category)
    .map(([subject, _]) => subject);
};

// Helper function to get subject price
export const getSubjectPrice = (subject: string): number => {
  return SUBJECTS[subject as keyof typeof SUBJECTS]?.price || 18000; // Default to Tier 2
};

// Helper function to get subject tier
export const getSubjectTier = (subject: string): number => {
  return SUBJECTS[subject as keyof typeof SUBJECTS]?.tier || 2; // Default to Tier 2
};

// Helper function to format price in Naira
export const formatPrice = (price: number): string => {
  return `₦${price.toLocaleString()}`;
};

// Pricing tiers explanation
export const PRICING_TIERS = {
  1: {
    name: 'Foundation',
    description: 'Primary level subjects and basic study skills',
    price: 14000,
    tutorShare: 11200, // 80%
    platformFee: 2800  // 20%
  },
  2: {
    name: 'Standard',
    description: 'Secondary subjects (Year 7-9) and creative arts',
    price: 18000,
    tutorShare: 14400,
    platformFee: 3600
  },
  3: {
    name: 'Advanced',
    description: 'GCSE level and specialized subjects',
    price: 22000,
    tutorShare: 17600,
    platformFee: 4400
  },
  4: {
    name: 'Specialist',
    description: 'A-Level, university prep, and SEN support',
    price: 28000,
    tutorShare: 22400,
    platformFee: 5600
  }
};

// Grade levels (Nigeria 6-3-3-4 system / UK England system)
export const GRADE_LEVELS = [
  { value: 'year_1', label: 'Year 1 / Primary 1 (P1)', ageRange: '5-6' },
  { value: 'year_2', label: 'Year 2 / Primary 2 (P2)', ageRange: '6-7' },
  { value: 'year_3', label: 'Year 3 / Primary 3 (P3)', ageRange: '7-8' },
  { value: 'year_4', label: 'Year 4 / Primary 4 (P4)', ageRange: '8-9' },
  { value: 'year_5', label: 'Year 5 / Primary 5 (P5)', ageRange: '9-10' },
  { value: 'year_6', label: 'Year 6 / Primary 6 (P6)', ageRange: '10-11' },
  { value: 'year_7', label: 'Year 7 / JSS 1', ageRange: '11-12' },
  { value: 'year_8', label: 'Year 8 / JSS 2', ageRange: '12-13' },
  { value: 'year_9', label: 'Year 9 / JSS 3', ageRange: '13-14' },
  { value: 'year_10', label: 'Year 10 / SS 1', ageRange: '14-15' },
  { value: 'year_11', label: 'Year 11 / SS 2', ageRange: '15-16' },
  { value: 'year_12', label: 'Year 12 / SS 3', ageRange: '16-17' },
  { value: 'year_13', label: 'Year 13 / Post-Secondary', ageRange: '17-18' },
];

export default SUBJECTS;
