// Curriculum data types and constants

export interface Resource {
  id: string;
  title: string;
  type: 'worksheet' | 'lesson_plan' | 'video' | 'quiz' | 'presentation' | 'reading';
  description: string;
  duration?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  downloads: number;
  rating: number;
  fileSize?: string;
  format?: string;
  preview?: string;
  content?: string;
}

export interface CurriculumTopic {
  id: string;
  title: string;
  description: string;
  learningOutcomes: string[];
  resources: Resource[];
  duration: string;
}

export interface CurriculumSubject {
  id: string;
  name: string;
  topics: CurriculumTopic[];
}

export interface CurriculumClass {
  id: string;
  name: string;
  ageRange: string;
  description: string;
  subjects: CurriculumSubject[];
}

// Sample resource content
const PHONICS_WORKSHEET_CONTENT = `PHASE 1 PHONICS - SOUND RECOGNITION

Activity 1: Initial Sounds
Look at each picture and circle the correct starting sound:

🍎 Apple    (a / b / c)
🐻 Bear     (b / d / p)
🐱 Cat      (c / k / s)
🐕 Dog      (d / b / g)

Activity 2: Rhyming Words
Draw a line to match the rhyming words:

cat  →  bat
dog  →  log  
hen  →  pen
sun  →  run

Activity 3: Sound Sorting
Write these words under the correct starting sound:

Words: sun, cat, dog, sock, dig, car

S words: _________  _________
C words: _________  _________  
D words: _________  _________

Parent Notes:
• Practice each sound clearly
• Encourage your child to say the sound before writing
• Praise effort and progress!`;

const PHONICS_LESSON_PLAN_CONTENT = `PHASE 1 PHONICS LESSON PLAN
Topic: Environmental Sounds & Listening Skills
Age Group: 3-5 years | Duration: 30 minutes

LEARNING OBJECTIVES:
• Distinguish between different sounds
• Identify environmental sounds
• Develop listening and attention skills

MATERIALS NEEDED:
• Sound cards or audio clips (doorbell, telephone, animal sounds)
• Musical instruments (optional)
• Worksheets for practice

LESSON STRUCTURE:

1. WARM-UP (5 minutes)
   - Listening game: "Close your eyes and listen"
   - Identify classroom sounds
   - Discussion: What sounds did you hear?

2. MAIN ACTIVITY (15 minutes)
   - Introduce environmental sounds
   - Play sound clips and ask children to identify
   - Group activity: Match sound to picture
   - Practice making sounds

3. GUIDED PRACTICE (7 minutes)
   - Worksheet completion
   - Circle the correct picture for each sound
   - Draw a sound they heard today

4. WRAP-UP (3 minutes)
   - Review: What sounds did we learn?
   - Home activity: Listen walk around the house
   - Praise and encourage

DIFFERENTIATION:
• Support: Work with pairs, provide visual cues
• Extension: Create own sound story

ASSESSMENT:
• Can identify 4+ environmental sounds
• Demonstrates active listening
• Participates in discussions`;

const PHONICS_VIDEO_CONTENT = `VIDEO CONTENT PREVIEW

🎵 Phase 1 Phonics Songs & Sounds 🎵

Chapter 1: Environmental Sounds (0:00-2:30)
- Doorbell: Ding dong! 🔔
- Telephone: Ring ring! 📞
- Dog barking: Woof woof! 🐕
- Cat meowing: Meow meow! 🐱

Chapter 2: Instrumental Sounds (2:30-5:00)
- Drum beats
- Shaker rhythms
- Bell tinkles
- Clapping patterns

Chapter 3: Body Percussion (5:00-7:30)
- Clap your hands
- Stamp your feet
- Click your tongue
- Pat your knees

Chapter 4: Listening Game (7:30-10:00)
- Interactive "What sound is this?" quiz
- Fun animations and characters
- Sing-along finale

[Video player would display here with play/pause controls]`;

const PHONICS_QUIZ_CONTENT = `PHASE 1 PHONICS QUIZ

Question 1: Which sound does this word start with?
🍎 APPLE
a) /a/  ✓ CORRECT
b) /b/
c) /p/

Question 2: Match the rhyming words:
CAT rhymes with...
a) DOG
b) BAT  ✓ CORRECT
c) PEN

Question 3: Circle the odd one out (different starting sound):
a) Sun
b) Sock
c) Dog  ✓ CORRECT
d) Sand

Question 4: Which picture shows something that makes a loud sound?
a) Feather
b) Drum  ✓ CORRECT
c) Pillow

Question 5: True or False: All words that rhyme end with the same sound?
a) True  ✓ CORRECT
b) False

⭐ Score: 5/5 - Excellent!

Tips for Parents:
• Practice these sounds daily
• Use real objects for sound recognition
• Make it fun with songs and games!`;

const PHONICS_PRESENTATION_CONTENT = `PHASE 1 PHONICS PRESENTATION

Slide 1: Title Slide
📚 Phase 1 Phonics
Listening Skills & Environmental Sounds

Slide 2: Learning Objectives
• Recognize environmental sounds
• Distinguish between different sounds
• Develop listening skills
• Begin sound discrimination

Slide 3: What is Phase 1?
Phase 1 focuses on developing speaking and listening skills.
No letter learning yet - just sounds!

Slide 4-8: Environmental Sounds
🔔 Doorbell sounds
📞 Telephone rings
🚗 Car engines
🐕 Animal sounds
🌧️ Weather sounds

Slide 9-13: Instrumental Sounds
🥁 Drum
🔔 Bell
📯 Trumpet
🎸 Guitar
🎹 Piano

Slide 14-18: Body Percussion
👏 Clapping
👣 Stamping
👅 Clicking
🤲 Patting

Slide 19: Practice Activity
Sound Discrimination Game
Can you tell which sound is louder?

Slide 20: Home Learning
• Go on a sound walk
• Play "I Spy" with sounds
• Sing rhyming songs

[Full presentation available for download]`;

export const CURRICULUM_DATA: CurriculumClass[] = [
  {
    id: 'early-years',
    name: 'Early Years (EYFS)',
    ageRange: '3-5 years',
    description: 'Foundation stage learning covering communication, literacy, mathematics, and understanding the world',
    subjects: [
      {
        id: 'literacy',
        name: 'Communication & Literacy',
        topics: [
          {
            id: 'phonics-1',
            title: 'Phase 1 Phonics',
            description: 'Introduction to sounds and listening skills',
            learningOutcomes: [
              'Recognize environmental sounds',
              'Distinguish between sounds',
              'Develop oral blending and segmenting',
              'Understand rhythm and rhyme'
            ],
            resources: [
              {
                id: 'phonics-1-worksheet-1',
                title: 'Sound Recognition Worksheet',
                type: 'worksheet',
                description: 'Practice identifying initial sounds in words with pictures and letter matching activities',
                duration: '15 minutes',
                difficulty: 'easy',
                downloads: 1245,
                rating: 4.8,
                fileSize: '2.3 MB',
                format: 'PDF',
                content: PHONICS_WORKSHEET_CONTENT
              },
              {
                id: 'phonics-1-lesson-plan',
                title: 'Phase 1 Phonics Lesson Plan',
                type: 'lesson_plan',
                description: 'Complete 30-minute lesson plan for introducing environmental sounds and listening skills',
                duration: '30 minutes',
                difficulty: 'easy',
                downloads: 892,
                rating: 4.9,
                fileSize: '1.8 MB',
                format: 'PDF',
                content: PHONICS_LESSON_PLAN_CONTENT
              },
              {
                id: 'phonics-1-video',
                title: 'Phonics Songs & Sounds Video',
                type: 'video',
                description: 'Engaging 10-minute video with songs and animations teaching Phase 1 phonics sounds',
                duration: '10 minutes',
                difficulty: 'easy',
                downloads: 2103,
                rating: 4.9,
                fileSize: '85 MB',
                format: 'MP4',
                content: PHONICS_VIDEO_CONTENT
              },
              {
                id: 'phonics-1-quiz',
                title: 'Sound Recognition Quiz',
                type: 'quiz',
                description: 'Interactive quiz to test understanding of Phase 1 phonics sounds',
                duration: '10 minutes',
                difficulty: 'easy',
                downloads: 1534,
                rating: 4.7,
                fileSize: '1.2 MB',
                format: 'Interactive',
                content: PHONICS_QUIZ_CONTENT
              },
              {
                id: 'phonics-1-presentation',
                title: 'Phase 1 Phonics Teaching Presentation',
                type: 'presentation',
                description: 'Complete PowerPoint presentation with activities and examples for teaching Phase 1',
                duration: '20 slides',
                difficulty: 'easy',
                downloads: 967,
                rating: 4.8,
                fileSize: '15.4 MB',
                format: 'PPTX',
                content: PHONICS_PRESENTATION_CONTENT
              }
            ],
            duration: '8-10 weeks'
          },
          {
            id: 'writing-basics',
            title: 'Early Writing Skills',
            description: 'Introduction to mark-making and letter formation',
            learningOutcomes: [
              'Develop pencil grip and control',
              'Form recognizable letters',
              'Write own name',
              'Begin writing simple words'
            ],
            resources: [
              {
                id: 'writing-1',
                title: 'Letter Formation Worksheets',
                type: 'worksheet',
                description: 'Practice sheets for forming letters correctly',
                duration: '20 minutes',
                difficulty: 'easy',
                downloads: 1120,
                rating: 4.7,
                fileSize: '3.1 MB',
                format: 'PDF'
              },
              {
                id: 'writing-2',
                title: 'Name Writing Practice',
                type: 'worksheet',
                description: 'Personalized name tracing activities',
                duration: '15 minutes',
                difficulty: 'easy',
                downloads: 980,
                rating: 4.6,
                fileSize: '1.8 MB',
                format: 'PDF'
              }
            ],
            duration: '6-8 weeks'
          }
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'counting-numbers',
            title: 'Counting and Numbers 1-20',
            description: 'Learning to count, recognize and order numbers',
            learningOutcomes: [
              'Count reliably up to 20',
              'Recognize numerals 1-20',
              'Order numbers correctly',
              'Understand one more and one less'
            ],
            resources: [
              {
                id: 'counting-1',
                title: 'Number Recognition Cards',
                type: 'worksheet',
                description: 'Flashcards for number recognition 1-20',
                duration: '15 minutes',
                difficulty: 'easy',
                downloads: 1567,
                rating: 4.9,
                fileSize: '2.5 MB',
                format: 'PDF'
              },
              {
                id: 'counting-2',
                title: 'Counting Video Tutorial',
                type: 'video',
                description: 'Fun counting song and activities',
                duration: '8 minutes',
                difficulty: 'easy',
                downloads: 2340,
                rating: 4.8,
                fileSize: '65 MB',
                format: 'MP4'
              }
            ],
            duration: '8-10 weeks'
          },
          {
            id: 'shapes',
            title: 'Shape Recognition',
            description: 'Identifying and describing 2D and 3D shapes',
            learningOutcomes: [
              'Name common 2D shapes',
              'Recognize 3D shapes',
              'Describe shape properties',
              'Find shapes in environment'
            ],
            resources: [
              {
                id: 'shapes-1',
                title: 'Shape Sorting Activity',
                type: 'worksheet',
                description: 'Cut and paste shape sorting exercises',
                duration: '20 minutes',
                difficulty: 'easy',
                downloads: 1234,
                rating: 4.7,
                fileSize: '2.8 MB',
                format: 'PDF'
              }
            ],
            duration: '4-6 weeks'
          }
        ]
      },
      {
        id: 'understanding-world',
        name: 'Understanding the World',
        topics: [
          {
            id: 'seasons',
            title: 'Seasons and Weather',
            description: 'Learning about the four seasons and weather patterns',
            learningOutcomes: [
              'Name the four seasons',
              'Identify seasonal changes',
              'Describe different weather types',
              'Understand seasonal clothing'
            ],
            resources: [
              {
                id: 'seasons-1',
                title: 'Seasons Poster Set',
                type: 'presentation',
                description: 'Visual posters showing each season',
                duration: '12 slides',
                difficulty: 'easy',
                downloads: 890,
                rating: 4.8,
                fileSize: '8.4 MB',
                format: 'PPTX'
              }
            ],
            duration: '6-8 weeks'
          }
        ]
      }
    ]
  },
  {
    id: 'primary-ks1',
    name: 'Primary Key Stage 1 (Years 1-2)',
    ageRange: '5-7 years',
    description: 'Early primary education covering English, Mathematics, and Science',
    subjects: [
      {
        id: 'english',
        name: 'English',
        topics: [
          {
            id: 'phonics-2-3',
            title: 'Phonics Phases 2-3',
            description: 'Learning letter sounds and blending',
            learningOutcomes: [
              'Know all letter sounds',
              'Blend CVC words',
              'Segment words for spelling',
              'Read simple sentences'
            ],
            resources: [
              {
                id: 'phonics-23-1',
                title: 'CVC Word Building',
                type: 'worksheet',
                description: 'Consonant-Vowel-Consonant word practice',
                duration: '20 minutes',
                difficulty: 'easy',
                downloads: 1890,
                rating: 4.8,
                fileSize: '2.7 MB',
                format: 'PDF'
              },
              {
                id: 'phonics-23-2',
                title: 'Blending and Segmenting Quiz',
                type: 'quiz',
                description: 'Interactive phonics assessment',
                duration: '15 minutes',
                difficulty: 'medium',
                downloads: 1456,
                rating: 4.7,
                fileSize: '1.5 MB',
                format: 'Interactive'
              }
            ],
            duration: '12 weeks'
          },
          {
            id: 'reading-comp',
            title: 'Reading Comprehension',
            description: 'Understanding and discussing texts',
            learningOutcomes: [
              'Answer questions about texts',
              'Make predictions',
              'Retell stories in sequence',
              'Express opinions about books'
            ],
            resources: [
              {
                id: 'reading-1',
                title: 'Comprehension Passages',
                type: 'reading',
                description: 'Short stories with questions',
                duration: '25 minutes',
                difficulty: 'medium',
                downloads: 1678,
                rating: 4.9,
                fileSize: '3.2 MB',
                format: 'PDF'
              }
            ],
            duration: '20 weeks'
          }
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'addition-subtraction',
            title: 'Addition and Subtraction within 20',
            description: 'Basic arithmetic operations',
            learningOutcomes: [
              'Add single digits',
              'Subtract within 20',
              'Solve word problems',
              'Use number bonds'
            ],
            resources: [
              {
                id: 'add-sub-1',
                title: 'Number Bonds Worksheet',
                type: 'worksheet',
                description: 'Practice number bonds to 10 and 20',
                duration: '20 minutes',
                difficulty: 'medium',
                downloads: 2134,
                rating: 4.8,
                fileSize: '2.1 MB',
                format: 'PDF'
              },
              {
                id: 'add-sub-2',
                title: 'Word Problems Collection',
                type: 'worksheet',
                description: 'Real-world addition and subtraction scenarios',
                duration: '25 minutes',
                difficulty: 'medium',
                downloads: 1890,
                rating: 4.7,
                fileSize: '2.8 MB',
                format: 'PDF'
              }
            ],
            duration: '15 weeks'
          }
        ]
      },
      {
        id: 'science',
        name: 'Science',
        topics: [
          {
            id: 'plants',
            title: 'Plants and Growth',
            description: 'Understanding plant life cycles',
            learningOutcomes: [
              'Name parts of a plant',
              'Understand plant needs',
              'Observe plant growth',
              'Record observations'
            ],
            resources: [
              {
                id: 'plants-1',
                title: 'Plant Parts Diagram',
                type: 'worksheet',
                description: 'Label the parts of a plant',
                duration: '15 minutes',
                difficulty: 'easy',
                downloads: 1456,
                rating: 4.8,
                fileSize: '1.9 MB',
                format: 'PDF'
              }
            ],
            duration: '6 weeks'
          }
        ]
      }
    ]
  },
  {
    id: 'primary-ks2',
    name: 'Primary Key Stage 2 (Years 3-6)',
    ageRange: '7-11 years',
    description: 'Upper primary education building on KS1 foundations',
    subjects: [
      {
        id: 'english',
        name: 'English',
        topics: [
          {
            id: 'grammar',
            title: 'Grammar and Punctuation',
            description: 'Sentence structure and punctuation rules',
            learningOutcomes: [
              'Use correct punctuation',
              'Identify word classes',
              'Write complex sentences',
              'Use conjunctions effectively'
            ],
            resources: [
              {
                id: 'grammar-1',
                title: 'Punctuation Practice',
                type: 'worksheet',
                description: 'Exercises on commas, apostrophes, and more',
                duration: '30 minutes',
                difficulty: 'medium',
                downloads: 2345,
                rating: 4.9,
                fileSize: '3.5 MB',
                format: 'PDF'
              },
              {
                id: 'grammar-2',
                title: 'Grammar Quiz',
                type: 'quiz',
                description: 'Test your grammar knowledge',
                duration: '20 minutes',
                difficulty: 'medium',
                downloads: 1987,
                rating: 4.7,
                fileSize: '1.8 MB',
                format: 'Interactive'
              }
            ],
            duration: '10 weeks'
          },
          {
            id: 'creative-writing',
            title: 'Creative Writing',
            description: 'Story writing and descriptive language',
            learningOutcomes: [
              'Plan story structure',
              'Use descriptive language',
              'Develop characters',
              'Write different text types'
            ],
            resources: [
              {
                id: 'writing-1',
                title: 'Story Planning Templates',
                type: 'worksheet',
                description: 'Templates for planning narratives',
                duration: '25 minutes',
                difficulty: 'medium',
                downloads: 1765,
                rating: 4.8,
                fileSize: '2.4 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'fractions',
            title: 'Fractions, Decimals and Percentages',
            description: 'Understanding and converting between formats',
            learningOutcomes: [
              'Understand fraction notation',
              'Convert fractions to decimals',
              'Calculate percentages',
              'Solve fraction problems'
            ],
            resources: [
              {
                id: 'fractions-1',
                title: 'Fraction Fundamentals',
                type: 'worksheet',
                description: 'Introduction to fractions with visual aids',
                duration: '35 minutes',
                difficulty: 'medium',
                downloads: 2567,
                rating: 4.9,
                fileSize: '4.2 MB',
                format: 'PDF'
              },
              {
                id: 'fractions-2',
                title: 'Conversion Practice',
                type: 'worksheet',
                description: 'Converting between fractions, decimals, and percentages',
                duration: '30 minutes',
                difficulty: 'hard',
                downloads: 2134,
                rating: 4.8,
                fileSize: '3.8 MB',
                format: 'PDF'
              }
            ],
            duration: '8 weeks'
          },
          {
            id: 'multiplication-division',
            title: 'Multiplication and Division',
            description: 'Times tables and division facts',
            learningOutcomes: [
              'Know times tables up to 12x12',
              'Use written methods',
              'Solve multi-step problems',
              'Apply to real contexts'
            ],
            resources: [
              {
                id: 'times-tables-1',
                title: 'Times Tables Practice',
                type: 'worksheet',
                description: 'Comprehensive times tables exercises',
                duration: '25 minutes',
                difficulty: 'medium',
                downloads: 3456,
                rating: 4.9,
                fileSize: '2.9 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'science',
        name: 'Science',
        topics: [
          {
            id: 'human-body',
            title: 'The Human Body',
            description: 'Understanding body systems and health',
            learningOutcomes: [
              'Name major organs',
              'Understand the digestive system',
              'Learn about the skeleton',
              'Explore how muscles work'
            ],
            resources: [
              {
                id: 'body-1',
                title: 'Body Systems Diagram',
                type: 'worksheet',
                description: 'Label and describe major body systems',
                duration: '30 minutes',
                difficulty: 'medium',
                downloads: 1890,
                rating: 4.8,
                fileSize: '3.4 MB',
                format: 'PDF'
              }
            ],
            duration: '8 weeks'
          }
        ]
      }
    ]
  },
  {
    id: 'secondary-ks3',
    name: 'Secondary Key Stage 3 (Years 7-9)',
    ageRange: '11-14 years',
    description: 'Early secondary education introducing specialized subjects',
    subjects: [
      {
        id: 'english',
        name: 'English Language & Literature',
        topics: [
          {
            id: 'shakespeare',
            title: 'Introduction to Shakespeare',
            description: 'Exploring Shakespeare\'s plays and language',
            learningOutcomes: [
              'Understand Shakespearean language',
              'Analyze character development',
              'Interpret themes',
              'Perform scenes'
            ],
            resources: [
              {
                id: 'shakespeare-1',
                title: 'Romeo and Juliet Study Guide',
                type: 'reading',
                description: 'Comprehensive guide to the play',
                duration: '45 minutes',
                difficulty: 'medium',
                downloads: 2890,
                rating: 4.9,
                fileSize: '5.6 MB',
                format: 'PDF'
              },
              {
                id: 'shakespeare-2',
                title: 'Language Analysis Worksheet',
                type: 'worksheet',
                description: 'Analyzing Shakespeare\'s use of language',
                duration: '35 minutes',
                difficulty: 'hard',
                downloads: 2345,
                rating: 4.8,
                fileSize: '3.2 MB',
                format: 'PDF'
              }
            ],
            duration: '10 weeks'
          }
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'algebra-intro',
            title: 'Introduction to Algebra',
            description: 'Understanding algebraic expressions and equations',
            learningOutcomes: [
              'Simplify algebraic expressions',
              'Solve linear equations',
              'Use substitution',
              'Form and solve equations from word problems'
            ],
            resources: [
              {
                id: 'algebra-1',
                title: 'Algebraic Expressions',
                type: 'worksheet',
                description: 'Practice simplifying and expanding expressions',
                duration: '40 minutes',
                difficulty: 'medium',
                downloads: 3456,
                rating: 4.9,
                fileSize: '3.8 MB',
                format: 'PDF'
              },
              {
                id: 'algebra-2',
                title: 'Solving Equations',
                type: 'worksheet',
                description: 'Step-by-step equation solving practice',
                duration: '45 minutes',
                difficulty: 'hard',
                downloads: 3123,
                rating: 4.8,
                fileSize: '4.1 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'science',
        name: 'Science',
        topics: [
          {
            id: 'cells',
            title: 'Cells and Organization',
            description: 'Understanding cell structure and function',
            learningOutcomes: [
              'Identify cell structures',
              'Compare plant and animal cells',
              'Understand specialized cells',
              'Explain cell organization'
            ],
            resources: [
              {
                id: 'cells-1',
                title: 'Cell Structure Diagrams',
                type: 'worksheet',
                description: 'Detailed cell diagrams to label',
                duration: '35 minutes',
                difficulty: 'medium',
                downloads: 2678,
                rating: 4.9,
                fileSize: '4.3 MB',
                format: 'PDF'
              }
            ],
            duration: '6 weeks'
          },
          {
            id: 'forces',
            title: 'Forces and Motion',
            description: 'Understanding forces and their effects',
            learningOutcomes: [
              'Identify different forces',
              'Calculate speed and acceleration',
              'Understand Newton\'s laws',
              'Apply forces to real scenarios'
            ],
            resources: [
              {
                id: 'forces-1',
                title: 'Forces Calculations',
                type: 'worksheet',
                description: 'Practice calculating forces and motion',
                duration: '40 minutes',
                difficulty: 'hard',
                downloads: 2456,
                rating: 4.8,
                fileSize: '3.9 MB',
                format: 'PDF'
              }
            ],
            duration: '8 weeks'
          }
        ]
      }
    ]
  },
  {
    id: 'gcse',
    name: 'GCSE (Years 10-11)',
    ageRange: '14-16 years',
    description: 'GCSE qualification preparation across core and optional subjects',
    subjects: [
      {
        id: 'english',
        name: 'English Language',
        topics: [
          {
            id: 'gcse-reading',
            title: 'Reading Comprehension and Analysis',
            description: 'Analyzing fiction and non-fiction texts',
            learningOutcomes: [
              'Identify writer\'s methods',
              'Analyze language and structure',
              'Compare texts',
              'Evaluate effectiveness'
            ],
            resources: [
              {
                id: 'gcse-reading-1',
                title: 'Language Analysis Practice',
                type: 'worksheet',
                description: 'Extract analysis with model answers',
                duration: '60 minutes',
                difficulty: 'hard',
                downloads: 4567,
                rating: 4.9,
                fileSize: '6.2 MB',
                format: 'PDF'
              },
              {
                id: 'gcse-reading-2',
                title: 'Comparative Analysis Guide',
                type: 'reading',
                description: 'How to compare texts effectively',
                duration: '45 minutes',
                difficulty: 'hard',
                downloads: 3890,
                rating: 4.8,
                fileSize: '5.1 MB',
                format: 'PDF'
              }
            ],
            duration: '20 weeks'
          },
          {
            id: 'gcse-writing',
            title: 'Creative and Transactional Writing',
            description: 'Developing writing skills for different purposes',
            learningOutcomes: [
              'Write engaging narratives',
              'Produce persuasive texts',
              'Structure arguments effectively',
              'Adapt tone and style'
            ],
            resources: [
              {
                id: 'gcse-writing-1',
                title: 'Writing Techniques Guide',
                type: 'reading',
                description: 'Comprehensive writing skills handbook',
                duration: '50 minutes',
                difficulty: 'hard',
                downloads: 4123,
                rating: 4.9,
                fileSize: '5.8 MB',
                format: 'PDF'
              }
            ],
            duration: '20 weeks'
          }
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'gcse-algebra',
            title: 'Advanced Algebra',
            description: 'Quadratic equations, graphs, and sequences',
            learningOutcomes: [
              'Solve quadratic equations',
              'Plot and interpret graphs',
              'Work with sequences',
              'Solve simultaneous equations'
            ],
            resources: [
              {
                id: 'gcse-algebra-1',
                title: 'Quadratic Equations Workbook',
                type: 'worksheet',
                description: 'Comprehensive quadratics practice',
                duration: '60 minutes',
                difficulty: 'hard',
                downloads: 5678,
                rating: 4.9,
                fileSize: '7.3 MB',
                format: 'PDF'
              },
              {
                id: 'gcse-algebra-2',
                title: 'Graphs and Functions',
                type: 'worksheet',
                description: 'Plotting and interpreting graphs',
                duration: '55 minutes',
                difficulty: 'hard',
                downloads: 5234,
                rating: 4.8,
                fileSize: '6.8 MB',
                format: 'PDF'
              }
            ],
            duration: '15 weeks'
          },
          {
            id: 'gcse-geometry',
            title: 'Geometry and Trigonometry',
            description: 'Angles, shapes, and trigonometric ratios',
            learningOutcomes: [
              'Apply angle rules',
              'Calculate areas and volumes',
              'Use trigonometric ratios',
              'Apply Pythagoras theorem'
            ],
            resources: [
              {
                id: 'gcse-geom-1',
                title: 'Trigonometry Practice',
                type: 'worksheet',
                description: 'SOHCAHTOA and applications',
                duration: '50 minutes',
                difficulty: 'hard',
                downloads: 4890,
                rating: 4.9,
                fileSize: '5.9 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'biology',
        name: 'Biology',
        topics: [
          {
            id: 'gcse-cells-bio',
            title: 'Cell Biology',
            description: 'Cell structure, division, and transport',
            learningOutcomes: [
              'Describe cell structures in detail',
              'Explain mitosis and meiosis',
              'Understand diffusion and osmosis',
              'Investigate stem cells'
            ],
            resources: [
              {
                id: 'gcse-cells-1',
                title: 'Cell Biology Revision Guide',
                type: 'reading',
                description: 'Complete topic coverage with diagrams',
                duration: '60 minutes',
                difficulty: 'hard',
                downloads: 4234,
                rating: 4.9,
                fileSize: '8.4 MB',
                format: 'PDF'
              }
            ],
            duration: '8 weeks'
          },
          {
            id: 'gcse-ecology',
            title: 'Ecology and Ecosystems',
            description: 'Understanding ecosystems and environmental impact',
            learningOutcomes: [
              'Explain food chains and webs',
              'Understand biodiversity',
              'Investigate environmental changes',
              'Analyze human impact'
            ],
            resources: [
              {
                id: 'gcse-ecology-1',
                title: 'Ecosystems Workbook',
                type: 'worksheet',
                description: 'Ecology questions and data analysis',
                duration: '55 minutes',
                difficulty: 'hard',
                downloads: 3890,
                rating: 4.8,
                fileSize: '6.7 MB',
                format: 'PDF'
              }
            ],
            duration: '6 weeks'
          }
        ]
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        topics: [
          {
            id: 'gcse-atomic',
            title: 'Atomic Structure and Periodic Table',
            description: 'Understanding atoms, elements, and the periodic table',
            learningOutcomes: [
              'Describe atomic structure',
              'Understand electron configuration',
              'Navigate the periodic table',
              'Explain trends in groups'
            ],
            resources: [
              {
                id: 'gcse-atomic-1',
                title: 'Atomic Structure Guide',
                type: 'reading',
                description: 'Detailed atomic theory and periodic trends',
                duration: '50 minutes',
                difficulty: 'hard',
                downloads: 4456,
                rating: 4.9,
                fileSize: '7.2 MB',
                format: 'PDF'
              }
            ],
            duration: '7 weeks'
          },
          {
            id: 'gcse-chemical-reactions',
            title: 'Chemical Reactions',
            description: 'Types of reactions and calculations',
            learningOutcomes: [
              'Balance chemical equations',
              'Calculate moles and masses',
              'Identify reaction types',
              'Understand rate of reaction'
            ],
            resources: [
              {
                id: 'gcse-reactions-1',
                title: 'Chemical Calculations',
                type: 'worksheet',
                description: 'Practice mole calculations and equations',
                duration: '60 minutes',
                difficulty: 'hard',
                downloads: 4123,
                rating: 4.8,
                fileSize: '5.6 MB',
                format: 'PDF'
              }
            ],
            duration: '10 weeks'
          }
        ]
      },
      {
        id: 'physics',
        name: 'Physics',
        topics: [
          {
            id: 'gcse-energy',
            title: 'Energy and Energy Resources',
            description: 'Energy stores, transfers, and resources',
            learningOutcomes: [
              'Identify energy stores and transfers',
              'Calculate efficiency',
              'Understand energy resources',
              'Analyze energy demands'
            ],
            resources: [
              {
                id: 'gcse-energy-1',
                title: 'Energy Calculations Workbook',
                type: 'worksheet',
                description: 'Practice energy calculations and efficiency',
                duration: '55 minutes',
                difficulty: 'hard',
                downloads: 3987,
                rating: 4.9,
                fileSize: '6.1 MB',
                format: 'PDF'
              }
            ],
            duration: '8 weeks'
          },
          {
            id: 'gcse-electricity',
            title: 'Electricity and Circuits',
            description: 'Current, voltage, resistance, and circuits',
            learningOutcomes: [
              'Apply Ohm\'s law',
              'Analyze series and parallel circuits',
              'Calculate power and energy',
              'Understand mains electricity'
            ],
            resources: [
              {
                id: 'gcse-elec-1',
                title: 'Electricity Calculations',
                type: 'worksheet',
                description: 'Circuit problems and calculations',
                duration: '60 minutes',
                difficulty: 'hard',
                downloads: 4567,
                rating: 4.9,
                fileSize: '6.8 MB',
                format: 'PDF'
              }
            ],
            duration: '9 weeks'
          }
        ]
      }
    ]
  },
  {
    id: 'a-level',
    name: 'A-Level (Years 12-13)',
    ageRange: '16-18 years',
    description: 'Advanced Level qualifications for university preparation',
    subjects: [
      {
        id: 'mathematics',
        name: 'Mathematics',
        topics: [
          {
            id: 'alevel-calculus',
            title: 'Calculus',
            description: 'Differentiation and integration',
            learningOutcomes: [
              'Differentiate complex functions',
              'Apply chain, product, and quotient rules',
              'Integrate using various methods',
              'Solve differential equations'
            ],
            resources: [
              {
                id: 'alevel-calc-1',
                title: 'Differentiation Techniques',
                type: 'worksheet',
                description: 'Advanced differentiation practice',
                duration: '90 minutes',
                difficulty: 'hard',
                downloads: 5678,
                rating: 4.9,
                fileSize: '9.4 MB',
                format: 'PDF'
              },
              {
                id: 'alevel-calc-2',
                title: 'Integration Methods',
                type: 'worksheet',
                description: 'Comprehensive integration practice',
                duration: '90 minutes',
                difficulty: 'hard',
                downloads: 5234,
                rating: 4.9,
                fileSize: '8.9 MB',
                format: 'PDF'
              }
            ],
            duration: '20 weeks'
          },
          {
            id: 'alevel-mechanics',
            title: 'Mechanics',
            description: 'Forces, motion, and projectiles',
            learningOutcomes: [
              'Model real-world situations',
              'Solve projectile problems',
              'Apply Newton\'s laws in complex scenarios',
              'Analyze moments and equilibrium'
            ],
            resources: [
              {
                id: 'alevel-mech-1',
                title: 'Mechanics Problem Set',
                type: 'worksheet',
                description: 'Advanced mechanics questions',
                duration: '75 minutes',
                difficulty: 'hard',
                downloads: 4890,
                rating: 4.8,
                fileSize: '7.8 MB',
                format: 'PDF'
              }
            ],
            duration: '15 weeks'
          }
        ]
      },
      {
        id: 'biology',
        name: 'Biology',
        topics: [
          {
            id: 'alevel-biochem',
            title: 'Biological Molecules',
            description: 'Proteins, carbohydrates, lipids, and nucleic acids',
            learningOutcomes: [
              'Explain protein structure',
              'Understand enzyme action',
              'Describe DNA and RNA structure',
              'Analyze biochemical tests'
            ],
            resources: [
              {
                id: 'alevel-biochem-1',
                title: 'Biochemistry Revision Notes',
                type: 'reading',
                description: 'Detailed biological molecules guide',
                duration: '80 minutes',
                difficulty: 'hard',
                downloads: 4567,
                rating: 4.9,
                fileSize: '11.2 MB',
                format: 'PDF'
              }
            ],
            duration: '10 weeks'
          },
          {
            id: 'alevel-genetics',
            title: 'Genetics and Evolution',
            description: 'Inheritance, variation, and natural selection',
            learningOutcomes: [
              'Solve genetic crosses',
              'Understand gene expression',
              'Explain evolution mechanisms',
              'Analyze population genetics'
            ],
            resources: [
              {
                id: 'alevel-genetics-1',
                title: 'Genetics Problems',
                type: 'worksheet',
                description: 'Practice genetic crosses and analysis',
                duration: '70 minutes',
                difficulty: 'hard',
                downloads: 4234,
                rating: 4.8,
                fileSize: '8.6 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        topics: [
          {
            id: 'alevel-organic',
            title: 'Organic Chemistry',
            description: 'Hydrocarbons, functional groups, and reactions',
            learningOutcomes: [
              'Name organic compounds',
              'Predict reaction mechanisms',
              'Understand isomerism',
              'Synthesize organic molecules'
            ],
            resources: [
              {
                id: 'alevel-organic-1',
                title: 'Organic Reaction Mechanisms',
                type: 'reading',
                description: 'Complete mechanisms guide with examples',
                duration: '85 minutes',
                difficulty: 'hard',
                downloads: 5123,
                rating: 4.9,
                fileSize: '12.4 MB',
                format: 'PDF'
              },
              {
                id: 'alevel-organic-2',
                title: 'Synthesis Pathways',
                type: 'worksheet',
                description: 'Practice organic synthesis problems',
                duration: '75 minutes',
                difficulty: 'hard',
                downloads: 4678,
                rating: 4.8,
                fileSize: '9.7 MB',
                format: 'PDF'
              }
            ],
            duration: '18 weeks'
          }
        ]
      },
      {
        id: 'physics',
        name: 'Physics',
        topics: [
          {
            id: 'alevel-quantum',
            title: 'Quantum Physics',
            description: 'Photoelectric effect, wave-particle duality, and atomic structure',
            learningOutcomes: [
              'Explain the photoelectric effect',
              'Understand wave-particle duality',
              'Apply quantum principles',
              'Analyze atomic spectra'
            ],
            resources: [
              {
                id: 'alevel-quantum-1',
                title: 'Quantum Physics Guide',
                type: 'reading',
                description: 'Introduction to quantum mechanics',
                duration: '90 minutes',
                difficulty: 'hard',
                downloads: 4890,
                rating: 4.9,
                fileSize: '10.8 MB',
                format: 'PDF'
              }
            ],
            duration: '10 weeks'
          },
          {
            id: 'alevel-fields',
            title: 'Fields and Their Effects',
            description: 'Gravitational, electric, and magnetic fields',
            learningOutcomes: [
              'Calculate field strengths',
              'Understand field interactions',
              'Apply field equations',
              'Analyze planetary motion'
            ],
            resources: [
              {
                id: 'alevel-fields-1',
                title: 'Fields Calculations',
                type: 'worksheet',
                description: 'Complex field problems and applications',
                duration: '80 minutes',
                difficulty: 'hard',
                downloads: 4456,
                rating: 4.8,
                fileSize: '9.2 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          }
        ]
      },
      {
        id: 'literature',
        name: 'English Literature',
        topics: [
          {
            id: 'alevel-poetry',
            title: 'Poetry Analysis',
            description: 'Analyzing poetic techniques and themes',
            learningOutcomes: [
              'Analyze poetic devices',
              'Compare poems effectively',
              'Understand context and influence',
              'Develop critical interpretations'
            ],
            resources: [
              {
                id: 'alevel-poetry-1',
                title: 'Poetry Anthology Analysis',
                type: 'reading',
                description: 'Detailed analysis of set poems',
                duration: '75 minutes',
                difficulty: 'hard',
                downloads: 4123,
                rating: 4.9,
                fileSize: '8.9 MB',
                format: 'PDF'
              }
            ],
            duration: '12 weeks'
          },
          {
            id: 'alevel-prose',
            title: 'Prose Fiction Analysis',
            description: 'Analyzing novels and critical perspectives',
            learningOutcomes: [
              'Analyze narrative techniques',
              'Understand characterization',
              'Apply critical theories',
              'Evaluate literary merit'
            ],
            resources: [
              {
                id: 'alevel-prose-1',
                title: 'Novel Study Guide',
                type: 'reading',
                description: 'Critical approaches to prose fiction',
                duration: '85 minutes',
                difficulty: 'hard',
                downloads: 3987,
                rating: 4.8,
                fileSize: '10.3 MB',
                format: 'PDF'
              }
            ],
            duration: '14 weeks'
          }
        ]
      }
    ]
  }
];