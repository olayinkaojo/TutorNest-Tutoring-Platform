// Year 1 English Trivia Questions
// Based on TUTORNEST — YEAR 1 ENGLISH CURRICULUM FRAMEWORK (UK)
// 200 comprehensive questions covering all curriculum areas

export const YEAR_1_ENGLISH_QUESTIONS = [
  // PHONICS & EARLY READING (40 questions)
  // Phase 2 & 3 Sounds
  { id: 'y1_eng_1', question: 'What sound does the letter "s" make?', options: ['ssss (like a snake)', 'mmmm', 'aaaa', 'oooo'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_2', question: 'What sound does the letter "t" make?', options: ['fff', 't t t (like tapping)', 'zzz', 'bbb'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_3', question: 'Which letter makes the "mmm" sound?', options: ['n', 's', 'm', 't'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_4', question: 'What sound does "sh" make?', options: ['s-h', 'shhhh (be quiet)', 'ch', 'th'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_5', question: 'What sound does "ch" make?', options: ['sh', 'ch ch (like a train)', 'th', 's'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Blending & Reading CVC Words
  { id: 'y1_eng_6', question: 'Blend these sounds: c-a-t. What word do you get?', options: ['can', 'cat', 'cap', 'cut'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_7', question: 'Blend: d-o-g. What\'s the word?', options: ['dig', 'dog', 'dug', 'dot'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_8', question: 'Which word says: p-i-n?', options: ['pen', 'pan', 'pin', 'pun'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_9', question: 'What word is this: r-e-d?', options: ['red', 'rod', 'rid', 'rad'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_10', question: 'Blend: s-u-n. What word?', options: ['sun', 'son', 'sin', 'san'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  
  // Consonant Clusters
  { id: 'y1_eng_11', question: 'What word starts with "bl"?', options: ['bread', 'black', 'slide', 'from'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_12', question: 'Which word has the "st" sound at the start?', options: ['best', 'star', 'fast', 'list'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_13', question: 'Find the word with "tr" at the beginning:', options: ['tree', 'three', 'street', 'great'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_14', question: 'Which word ends with "nd"?', options: ['hand', 'help', 'hard', 'half'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_15', question: 'What word has "mp" in it?', options: ['jump', 'just', 'jack', 'junk'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  
  // Tricky Words & High-Frequency Words  
  { id: 'y1_eng_16', question: 'Which is the correct spelling of this tricky word?', options: ['thuh', 'the', 'teh', 'thee'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_17', question: 'How do we spell the word that means "possess"?', options: ['hav', 'have', 'hev', 'huve'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_18', question: 'Which is correct?', options: ['sed', 'said', 'siad', 'sayd'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_19', question: 'Choose the right spelling:', options: ['lik', 'liek', 'like', 'lyke'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_20', question: 'How do we write "there was"?', options: ['wos', 'wus', 'was', 'waz'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_21', question: 'Pick the tricky word:', options: ['sum', 'som', 'some', 'sume'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_22', question: 'Which is the word for "to travel"?', options: ['go', 'goe', 'gow', 'gou'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_23', question: 'How do we spell "they are"?', options: ['ar', 'arr', 'are', 'air'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_24', question: 'Choose the correct word:', options: ['hee', 'hea', 'he', 'hi'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_25', question: 'Which is right?', options: ['she', 'shee', 'shi', 'shea'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  
  // Reading Fluency
  { id: 'y1_eng_26', question: 'When you see a full stop (.), what should you do?', options: ['Keep reading fast', 'Stop and take a breath', 'Read louder', 'Skip it'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_27', question: 'What helps you read smoothly?', options: ['Reading very fast', 'Skipping words', 'Practicing the same book', 'Only reading once'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_28', question: 'When should you pause while reading?', options: ['At every word', 'At punctuation marks', 'Never', 'Only at pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_29', question: 'What does reading aloud help with?', options: ['Sleeping', 'Getting better at reading', 'Drawing', 'Running'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_30', question: 'Why do we re-read books?', options: ['To get bored', 'To get better and smoother', 'Because we have no other books', 'To waste time'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // More Phonics Practice
  { id: 'y1_eng_31', question: 'What sound does "oo" make in "book"?', options: ['oh', 'oo (short)', 'oo (long)', 'ow'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_32', question: 'In the word "rain", what sound does "ai" make?', options: ['a', 'ay', 'ee', 'i'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_33', question: 'What does "igh" say in "night"?', options: ['ig', 'eye', 'ee', 'ow'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_34', question: 'Which letters make the "ee" sound in "feet"?', options: ['ft', 'ee', 'et', 'fe'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_35', question: 'What sound does "oa" make in "boat"?', options: ['oh', 'ow', 'oo', 'ah'], correctAnswer: 0, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_36', question: 'Segment this word into sounds: "bag"', options: ['b-ag', 'ba-g', 'b-a-g', 'bag'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_37', question: 'How many sounds in the word "ship"?', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_38', question: 'Break "tent" into sounds:', options: ['t-ent', 'te-nt', 't-e-n-t', 'tent'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_39', question: 'Which word has 4 sounds?', options: ['go', 'stop', 'at', 'is'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_40', question: 'What are the sounds in "frog"?', options: ['f-r-og', 'fr-o-g', 'f-r-o-g', 'fro-g'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },

  // READING COMPREHENSION (30 questions)
  // Understanding Texts - Who, What, Where
  { id: 'y1_eng_41', question: 'In "The cat sat on the mat," WHO sat on the mat?', options: ['The dog', 'The cat', 'The rat', 'The bat'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_42', question: 'In "Tom ran to the park," WHERE did Tom go?', options: ['School', 'Home', 'Park', 'Shop'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_43', question: '"The dog ate his dinner." WHAT did the dog do?', options: ['Slept', 'Ate', 'Ran', 'Jumped'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_44', question: '"Mum baked a cake." WHO baked?', options: ['Dad', 'Mum', 'Sister', 'Brother'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_45', question: 'A story has a beginning, middle, and what?', options: ['Start', 'End', 'Top', 'Bottom'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Vocabulary Development
  { id: 'y1_eng_46', question: 'If something is "huge", it is:', options: ['Very small', 'Very big', 'Very fast', 'Very slow'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_47', question: 'What does "tiny" mean?', options: ['Big', 'Very small', 'Tall', 'Wide'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_48', question: 'If you are "happy", you feel:', options: ['Sad', 'Angry', 'Good and smiley', 'Tired'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_49', question: 'What does "cold" mean?', options: ['Not hot', 'Very hot', 'Wet', 'Dry'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_50', question: '"Fast" means:', options: ['Slow', 'Quick', 'Stop', 'Walk'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Fiction vs Non-Fiction
  { id: 'y1_eng_51', question: 'A story about a talking dragon is:', options: ['Non-fiction', 'Fiction (made up)', 'A true story', 'News'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_52', question: 'A book about real animals is:', options: ['Fiction', 'Made up', 'Non-fiction (true)', 'A fairy tale'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_53', question: 'Which is fiction?', options: ['A book about space', 'A book about a magic wand', 'A book about dogs', 'A book about cars'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_54', question: 'A poem is:', options: ['A type of writing with rhythm', 'A type of car', 'A type of food', 'A type of game'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_55', question: 'In a story, the people or animals are called:', options: ['Words', 'Characters', 'Pages', 'Pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Story Retelling & Sequencing
  { id: 'y1_eng_56', question: 'What comes first in making a sandwich?', options: ['Eat it', 'Get the bread', 'Put it away', 'Wash up'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_57', question: 'In Little Red Riding Hood, what happens FIRST?', options: ['She meets the wolf', 'She goes to grandma', 'Grandma is saved', 'She leaves home'], correctAnswer: 3, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_58', question: 'When retelling a story, you should tell it:', options: ['Backwards', 'In the right order', 'Mixed up', 'Very fast'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_59', question: 'What do we call the start of a story?', options: ['The end', 'The middle', 'The beginning', 'The cover'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_60', question: 'If a story says "First... then... finally...", what are these?', options: ['Rhyming words', 'Order words', 'Action words', 'Tricky words'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  
  // More Comprehension
  { id: 'y1_eng_61', question: 'What is the title of a book?', options: ['The author', 'The name of the book', 'The last page', 'The pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_62', question: 'Who writes a book?', options: ['The reader', 'The author', 'The teacher', 'The illustrator'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_63', question: 'Who draws the pictures in a book?', options: ['The author', 'The reader', 'The illustrator', 'The printer'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_64', question: 'The cover of a book is:', options: ['The inside pages', 'The front and back', 'Only the words', 'The middle'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_65', question: 'What does a picture in a story help us do?', options: ['Sleep', 'Understand the story better', 'Close the book', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_66', question: 'If a character is smiling in a picture, they are probably:', options: ['Sad', 'Angry', 'Happy', 'Tired'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_67', question: 'Where do we usually find the title of a book?', options: ['On the cover', 'On page 10', 'At the end', 'On the back only'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_68', question: 'A fairy tale usually has:', options: ['Only true facts', 'Magic and fantasy', 'No words', 'Numbers only'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_69', question: 'What is a prediction?', options: ['Reading backwards', 'Guessing what happens next', 'Closing the book', 'Drawing a picture'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_70', question: 'When we read, we go from:', options: ['Right to left', 'Left to right', 'Bottom to top', 'Anywhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },

  // SPELLING (25 questions)
  // CVC and CVCC Words
  { id: 'y1_eng_71', question: 'How do you spell the word for a feline pet?', options: ['kat', 'cat', 'catt', 'cet'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_72', question: 'Spell the word for something you sit on:', options: ['cair', 'chare', 'chair', 'cher'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_73', question: 'How do you write the word for a small container?', options: ['boks', 'box', 'boc', 'boxs'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_74', question: 'Spell: something you wear on your foot', options: ['sok', 'sock', 'soc', 'sokk'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_75', question: 'How do you spell a word for a young dog?', options: ['pup', 'pupp', 'pop', 'pap'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  
  // Plurals with -s and -es
  { id: 'y1_eng_76', question: 'What is the plural of "cat"?', options: ['cat', 'cats', 'cates', 'caties'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_77', question: 'More than one dog:', options: ['dog', 'dogs', 'doges', 'dogies'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_78', question: 'Many "bus" =', options: ['bus', 'buss', 'buses', 'busi'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_79', question: 'More than one "box":', options: ['boxs', 'box', 'boxes', 'boxies'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_80', question: 'Plural of "wish":', options: ['wishs', 'wishes', 'wish', 'wishies'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  
  // Adding -ing and -ed
  { id: 'y1_eng_81', question: 'Add -ing to "jump":', options: ['jumping', 'jumpping', 'jumpping', 'juming'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_82', question: 'Add -ed to "walk":', options: ['walking', 'walkked', 'walked', 'walkt'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_83', question: '"Play" in the past becomes:', options: ['playd', 'playing', 'played', 'plaied'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_84', question: 'Add -ing to "look":', options: ['looking', 'lookking', 'lookin', 'loocking'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_85', question: 'Past tense of "help":', options: ['helping', 'helped', 'helpd', 'helpped'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Common Exception Words
  { id: 'y1_eng_86', question: 'Spell the opposite of "yes":', options: ['no', 'noe', 'now', 'kno'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_87', question: 'How do you spell the word for "to travel"?', options: ['goe', 'go', 'gow', 'goo'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_88', question: 'Spell: opposite of "come":', options: ['gow', 'goe', 'go', 'goo'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_89', question: 'Which is correct for "I, we, they ___"?', options: ['ar', 'are', 'arr', 'air'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_90', question: 'Spell the word that means "belonging to me":', options: ['mi', 'my', 'mie', 'mye'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_91', question: 'How do we spell "one more time"?', options: ['agen', 'again', 'agane', 'agin'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_92', question: 'Spell: the word for a 24-hour period', options: ['dai', 'day', 'dae', 'dey'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_93', question: 'How do you spell the word for "not right"?', options: ['rong', 'wrong', 'wrog', 'wroung'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_94', question: 'Spell: "I ___ a book" (possess)', options: ['hav', 'have', 'hev', 'haev'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_95', question: 'Which spelling is correct?', options: ['becuz', 'becaus', 'because', 'becuase'], correctAnswer: 2, difficulty: 'hard', xpReward: 20 },

  // GRAMMAR & PUNCTUATION (30 questions)
  // Nouns
  { id: 'y1_eng_96', question: 'A noun is a:', options: ['Doing word', 'Describing word', 'Naming word', 'Joining word'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_97', question: 'Which one is a noun?', options: ['run', 'happy', 'table', 'quickly'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_98', question: 'Find the noun: "The dog ran fast."', options: ['The', 'dog', 'ran', 'fast'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_99', question: 'Which is NOT a noun?', options: ['book', 'run', 'pen', 'apple'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_100', question: 'A person, place, or thing is called a:', options: ['Verb', 'Noun', 'Adjective', 'Number'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Verbs
  { id: 'y1_eng_101', question: 'A verb is a:', options: ['Naming word', 'Doing word', 'Describing word', 'Number'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_102', question: 'Which word is a verb?', options: ['cat', 'jump', 'red', 'table'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_103', question: 'Find the verb: "The bird sings."', options: ['The', 'bird', 'sings', 'none'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_104', question: 'Which is a doing word?', options: ['big', 'eat', 'car', 'blue'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_105', question: 'In "I play football", the verb is:', options: ['I', 'play', 'football', 'no verb'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Adjectives
  { id: 'y1_eng_106', question: 'An adjective is a:', options: ['Doing word', 'Naming word', 'Describing word', 'Joining word'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_107', question: 'Which word describes something?', options: ['run', 'beautiful', 'dog', 'jump'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_108', question: 'Find the adjective: "The big cat"', options: ['The', 'big', 'cat', 'none'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_109', question: 'Which describes a noun?', options: ['happy', 'run', 'go', 'jump'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_110', question: 'In "a red ball", the adjective is:', options: ['a', 'red', 'ball', 'none'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Capital Letters & Punctuation
  { id: 'y1_eng_111', question: 'We use a capital letter at the:', options: ['End of a sentence', 'Start of a sentence', 'Middle of a word', 'Never'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_112', question: 'Names need:', options: ['Small letters', 'Capital letters', 'No letters', 'Numbers'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_113', question: 'Which is written correctly?', options: ['tom', 'Tom', 'toM', 'TOM'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_114', question: 'Days of the week start with:', options: ['Small letters', 'Capital letters', 'Numbers', 'Symbols'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_115', question: 'The word "I" is always written as:', options: ['i', 'I', 'iI', 'Ii'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Punctuation Marks
  { id: 'y1_eng_116', question: 'What mark ends a sentence?', options: ['?', '.', ',', '!'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_117', question: 'A question mark looks like:', options: ['.', '!', '?', ','], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_118', question: 'Which sentence needs a question mark? "Where is my hat___"', options: ['.', '!', '?', 'Nothing'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_119', question: 'An exclamation mark shows:', options: ['A question', 'Excitement or surprise', 'The end only', 'A mistake'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_120', question: 'Which needs an exclamation mark? "Watch out___"', options: ['.', '?', '!', ','], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_121', question: 'We put spaces between:', options: ['Letters', 'Words', 'Sentences', 'Pages'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_122', question: 'A full stop is:', options: ['A big dot', 'A small dot', 'A line', 'A circle'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_123', question: 'Which is correct?', options: ['i like cats', 'I like cats.', 'i Like Cats', 'I Like cats'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_124', question: 'Where do we put a full stop?', options: ['Start of sentence', 'Middle of sentence', 'End of sentence', 'Anywhere'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_125', question: 'Singular means:', options: ['More than one', 'Just one', 'None', 'Many'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },

  // WRITING & COMPOSITION (25 questions)
  // Sentence Writing
  { id: 'y1_eng_126', question: 'A sentence must start with:', options: ['A small letter', 'A capital letter', 'A number', 'A picture'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_127', question: 'A sentence must end with:', options: ['Nothing', 'A full stop or ? or !', 'A comma', 'A letter'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_128', question: 'Which is a complete sentence?', options: ['running fast', 'The dog', 'I like apples.', 'blue and red'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_129', question: 'We use "and" to:', options: ['End sentences', 'Join words or ideas', 'Ask questions', 'Make mistakes'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_130', question: 'Which joining word fits? "I like cats ___ dogs"', options: ['or', 'and', 'but', 'because'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  
  // Expanded Noun Phrases
  { id: 'y1_eng_131', question: 'Which makes "ball" more interesting?', options: ['ball', 'a ball', 'a big red ball', 'ball ball'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_132', question: 'Add describing words to "dog":', options: ['dog dog', 'the fluffy brown dog', 'dog and dog', 'a dog dog dog'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_133', question: 'Which sounds better?', options: ['cat', 'a cat', 'a small black cat', 'cat cat'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_134', question: 'We can describe nouns with:', options: ['Verbs', 'Adjectives', 'Full stops', 'Numbers only'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_135', question: '"The ___ ___ car" needs:', options: ['Two adjectives', 'Two nouns', 'Two verbs', 'Nothing'], correctAnswer: 0, difficulty: 'medium', xpReward: 15 },
  
  // Different Writing Purposes
  { id: 'y1_eng_136', question: 'A label tells us:', options: ['A long story', 'What something is', 'How to do something', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_137', question: 'Instructions tell us:', options: ['A story', 'How to do something', 'About the past', 'A joke'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_138', question: 'A recount is about:', options: ['The future', 'Something that happened', 'Make-believe', 'Questions'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_139', question: 'A story usually has:', options: ['Only labels', 'Characters and events', 'Only instructions', 'Only questions'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_140', question: 'A caption is:', options: ['A long story', 'Words under a picture', 'A whole book', 'A punctuation mark'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_141', question: 'When writing about your weekend, you write a:', options: ['Recipe', 'Recount', 'Label', 'Question'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_142', question: 'To tell someone how to make a sandwich, you write:', options: ['A story', 'Instructions', 'A poem', 'A caption'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_143', question: 'A description tells us:', options: ['How to do things', 'What something is like', 'The time', 'Numbers'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_144', question: 'In a story, "Once upon a time" is:', options: ['The end', 'The beginning', 'The middle', 'Not important'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_145', question: 'Which word helps to start a sentence in order? "First..."', options: ['Next', 'Because', 'But', 'The'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  
  // Handwriting
  { id: 'y1_eng_146', question: 'Letters should sit:', options: ['Above the line', 'On the line', 'Below the line', 'Anywhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_147', question: 'We leave spaces between:', options: ['Letters in a word', 'Words in a sentence', 'Lines on a page', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_148', question: 'Neat writing is:', options: ['Not important', 'Important so others can read', 'Only for teachers', 'Impossible'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_149', question: 'When forming letters, we should:', options: ['Start anywhere', 'Start in the right place', 'Use any size', 'Write very fast'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_150', question: 'Capital letters are:', options: ['Smaller than lowercase', 'The same size', 'Bigger than lowercase', 'Not used'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },

  // POETRY & RHYMES (15 questions)
  { id: 'y1_eng_151', question: 'Which words rhyme?', options: ['cat, dog', 'cat, hat', 'cat, car', 'cat, cup'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_152', question: 'Find the rhyming pair:', options: ['sun, moon', 'sun, fun', 'sun, star', 'sun, sky'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_153', question: 'Which rhymes with "book"?', options: ['look', 'lake', 'bike', 'ball'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_154', question: 'Do "play" and "day" rhyme?', options: ['Yes', 'No', 'Sometimes', 'Never'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_155', question: 'Rhyming words have:', options: ['The same start', 'The same ending sound', 'The same length', 'The same meaning'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_156', question: 'A poem can have:', options: ['Rhythm and rhyme', 'Only pictures', 'No words', 'Only numbers'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_157', question: 'Nursery rhymes are:', options: ['Boring', 'Traditional poems for children', 'Only for adults', 'Not real'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_158', question: 'Which is a nursery rhyme?', options: ['A textbook', 'Twinkle Twinkle Little Star', 'A recipe', 'A timetable'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_159', question: 'To perform a poem means to:', options: ['Throw it away', 'Say it aloud with expression', 'Write it down', 'Forget it'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_160', question: 'Rhythm in poetry is:', options: ['The beat or pattern', 'The color', 'The size', 'The cover'], correctAnswer: 0, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_161', question: 'Which rhymes with "night"?', options: ['light', 'no', 'name', 'never'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_162', question: 'Find the rhyme: "The cat in the ___"', options: ['dog', 'hat', 'car', 'box'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_163', question: 'Do "bee" and "tree" rhyme?', options: ['Yes', 'No', 'Maybe', 'Never'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_164', question: 'An action rhyme is:', options: ['Silent', 'With movements and words', 'Written only', 'For adults'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_165', question: 'Creating your own rhyme means:', options: ['Copying others', 'Making up your own', 'Not writing', 'Sleeping'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },

  // SPEAKING & LISTENING (15 questions)
  { id: 'y1_eng_166', question: 'When someone is speaking, you should:', options: ['Interrupt them', 'Listen carefully', 'Run away', 'Sleep'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_167', question: 'A full sentence when speaking has:', options: ['Just one word', 'A complete idea', 'No meaning', 'Only sounds'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_168', question: 'When sharing ideas, you should speak:', options: ['Very quietly', 'Clearly', 'Very fast', 'Not at all'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_169', question: 'To retell a story orally means to:', options: ['Write it down', 'Tell it using your voice', 'Draw it', 'Forget it'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_170', question: 'When describing a picture, you should:', options: ['Say nothing', 'Tell what you see', 'Close your eyes', 'Leave'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_171', question: 'Listening attentively means:', options: ['Not paying attention', 'Looking and focusing', 'Sleeping', 'Talking'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_172', question: 'Following instructions means:', options: ['Ignoring them', 'Doing what is asked', 'Running away', 'Arguing'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_173', question: 'When you respond, you:', options: ['Stay silent', 'Answer or reply', 'Sleep', 'Leave'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_174', question: 'Good listeners:', options: ['Talk over others', 'Pay attention', 'Never listen', 'Always interrupt'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_175', question: 'To share your opinion means to:', options: ['Keep quiet', 'Tell what you think', 'Shout', 'Argue'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_176', question: 'Speaking in full sentences helps:', options: ['Confuse people', 'Make your ideas clear', 'Waste time', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_177', question: 'When telling about an event, include:', options: ['Nothing', 'What happened', 'Only colors', 'Random words'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_178', question: 'Eye contact when speaking means:', options: ['Looking at the floor', 'Looking at the person', 'Closing your eyes', 'Looking away'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_179', question: 'A clear voice is:', options: ['Mumbled', 'Easy to hear and understand', 'Very quiet', 'Very loud'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_180', question: 'To take turns speaking means:', options: ['Everyone talks at once', 'One person at a time', 'Nobody talks', 'Shouting'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },

  // REASONING & LANGUAGE SKILLS (20 questions)
  { id: 'y1_eng_181', question: 'If the story is about a lost puppy, it will probably end with:', options: ['The puppy stays lost', 'The puppy is found', 'A dragon appears', 'It rains'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_182', question: 'Predicting means:', options: ['Remembering the past', 'Guessing what comes next', 'Giving up', 'Not thinking'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_183', question: 'If a character packs a suitcase, they might:', options: ['Stay home', 'Go on a trip', 'Sleep', 'Eat dinner'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_184', question: 'Making an inference means:', options: ['Reading the exact words', 'Working out what is not directly said', 'Guessing randomly', 'Skipping pages'], correctAnswer: 1, difficulty: 'hard', xpReward: 20 },
  { id: 'y1_eng_185', question: 'What comes next? "First I wake up, then I ___"', options: ['Go to sleep', 'Get dressed', 'Have dinner', 'Go to bed'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_186', question: 'Sequencing means:', options: ['Mixing things up', 'Putting in order', 'Removing things', 'Adding more'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_187', question: 'Which sentence matches the picture of a boy eating?', options: ['The boy sleeps', 'The boy eats', 'The boy runs', 'The boy swims'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_188', question: 'Find the error: "the dog is big"', options: ['No error', 'Should be "The"', 'Should be "doG"', 'Should be "iS"'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_189', question: 'What\'s wrong? "I like apples"', options: ['Nothing, it\'s correct', 'No capital', 'No full stop', 'Wrong word'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_190', question: 'Fix this: "she went home"', options: ['she went home', 'She went home.', 'shE Went Home', 'she Went home.'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_191', question: 'Which sentence is in the right order?', options: ['home went I', 'went home I', 'I went home', 'I home went'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_192', question: 'What\'s the problem? "he like sweets"', options: ['Nothing', 'Should be "likes"', 'Should be "He"', 'Both "He" and "likes"'], correctAnswer: 3, difficulty: 'hard', xpReward: 20 },
  { id: 'y1_eng_193', question: 'Sort these: 3. Finally 2. Then 1. First', options: ['3, 2, 1', '1, 2, 3', '2, 1, 3', '1, 3, 2'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_194', question: 'What picture matches "The cat sleeps on the bed"?', options: ['Cat running', 'Cat sleeping on bed', 'Dog sleeping', 'Cat eating'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_195', question: 'Context clues help us:', options: ['Spell words', 'Understand new words', 'Draw pictures', 'Count'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_196', question: 'If it says "The ice cream melted in the sun," it was probably:', options: ['Cold outside', 'Hot outside', 'Raining', 'Snowing'], correctAnswer: 1, difficulty: 'medium', xpReward: 15 },
  { id: 'y1_eng_197', question: 'What word is missing? "I ___ to school every day"', options: ['sleep', 'eat', 'go', 'swim'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_198', question: 'Matching pictures to sentences helps us:', options: ['Sleep', 'Understand the story', 'Draw better', 'Write faster'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_199', question: 'What makes sense? "The bird ___ in the sky"', options: ['swims', 'drives', 'flies', 'walks'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
  { id: 'y1_eng_200', question: 'Understanding a story means knowing:', options: ['Only the pictures', 'What happened and why', 'Only the title', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 }
];
