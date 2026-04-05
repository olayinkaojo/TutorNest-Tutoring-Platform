// Year 3 English Trivia Questions
// Based on UK Year 3 English Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_3_ENGLISH_QUESTIONS = [
  // READING & COMPREHENSION (50 questions)
  // Developing positive attitudes to reading
  { id: 'y3_eng_1', question: 'Why is reading regularly important?', options: ['It wastes time', 'It improves vocabulary and imagination', 'It\'s boring', 'Only for tests'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_2', question: 'Fiction means:', options: ['True stories', 'Made-up stories', 'Only poems', 'Instructions'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_3', question: 'Non-fiction books give us:', options: ['Made-up stories', 'Real information and facts', 'Only pictures', 'Nothing useful'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_4', question: 'Poetry often uses:', options: ['Only facts', 'Rhythm and sometimes rhyme', 'No patterns', 'Only long sentences'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_5', question: 'Reading different types of books helps you:', options: ['Get confused', 'Become a better reader and learner', 'Waste time', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Retrieving and recording information
  { id: 'y3_eng_6', question: 'When retrieving information, you:', options: ['Make things up', 'Find specific facts from the text', 'Ignore the text', 'Copy everything'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_7', question: 'In "The dog was brown and had a long tail," what color was the dog?', options: ['Black', 'Brown', 'White', 'Not mentioned'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_8', question: 'Where would you find information about animals in a non-fiction book?', options: ['In a story about space', 'In an animal encyclopedia', 'In a cookbook', 'Nowhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_9', question: 'Recording information means:', options: ['Forgetting it', 'Writing it down or remembering it', 'Ignoring it', 'Hiding it'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_10', question: 'If a text says "The castle was built in 1066," when was it built?', options: ['1066', '1666', '1860', 'Not mentioned'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Drawing inferences
  { id: 'y3_eng_11', question: 'Inference means:', options: ['Reading only what\'s written', 'Working out meaning from clues', 'Guessing randomly', 'Ignoring the text'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_12', question: '"Tom slammed the door and crossed his arms." How does Tom probably feel?', options: ['Happy', 'Angry or upset', 'Sleepy', 'Hungry'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_13', question: '"She smiled and jumped for joy." What can we infer about her feelings?', options: ['She is sad', 'She is happy and excited', 'She is angry', 'She is bored'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_14', question: '"He packed his suitcase and called a taxi." What is he probably going to do?', options: ['Stay home', 'Go on a trip', 'Clean the house', 'Watch TV'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_15', question: '"Her eyes filled with tears." What can we infer?', options: ['She is laughing', 'She is sad or emotional', 'She is angry', 'She is sleeping'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_16', question: '"The sky grew dark and thunder rumbled." What might happen next?', options: ['Sunshine', 'A storm', 'Nothing', 'Snow in summer'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_17', question: '"He studied hard every night." What can we infer about his character?', options: ['He is lazy', 'He is determined and hardworking', 'He doesn\'t care', 'He is bored'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_18', question: '"She whispered so no one would hear." Why did she whisper?', options: ['She wanted everyone to hear', 'She wanted to keep it secret', 'She was shouting', 'She was singing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Predicting
  { id: 'y3_eng_19', question: 'Predicting means:', options: ['Looking back', 'Guessing what might happen next', 'Forgetting the story', 'Stopping reading'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_20', question: '"The detective followed the footprints to the door." What might happen next?', options: ['He gives up', 'He investigates inside', 'He goes home', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_21', question: 'Using clues from the text helps us:', options: ['Get confused', 'Make good predictions', 'Stop reading', 'Forget the story'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_22', question: '"She opened the mysterious box slowly..." What might be inside?', options: ['We can predict based on story clues', 'Nothing', 'We should stop reading', 'It doesn\'t matter'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Language, structure, and presentation
  { id: 'y3_eng_23', question: 'Why do authors use exciting adjectives?', options: ['To bore readers', 'To make writing more interesting and descriptive', 'To confuse readers', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_24', question: 'What does bold text usually show?', options: ['Unimportant text', 'Important words or headings', 'Mistakes', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_25', question: 'A heading tells you:', options: ['Nothing', 'What a section is about', 'The end of the book', 'Random information'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_26', question: 'Why might an author use short sentences?', options: ['They can\'t write long ones', 'To create tension or speed', 'To bore readers', 'No reason'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_27', question: 'Pictures and diagrams in non-fiction books:', options: ['Are useless', 'Help explain information', 'Should be ignored', 'Are only for decoration'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_28', question: 'Why do poets use rhyme?', options: ['To confuse readers', 'To create rhythm and make it memorable', 'By accident', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_29', question: 'Alliteration is:', options: ['Random words', 'Words starting with the same sound', 'Long sentences', 'No pattern'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_30', question: 'Example of alliteration:', options: ['The cat sat', 'Big brown bear', 'A lovely day', 'She went home'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_31', question: 'A simile compares using:', options: ['Random words', '"like" or "as"', 'No comparison', 'Only verbs'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_32', question: 'Which is a simile?', options: ['The sun is bright', 'She runs fast', 'As brave as a lion', 'The dog barked'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_33', question: 'Why do chapters help readers?', options: ['They don\'t help', 'They organize the story into sections', 'They confuse readers', 'They waste space'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_34', question: 'What is the purpose of a blurb on a book?', options: ['To waste space', 'To give a brief summary and hook readers', 'To tell the whole story', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_35', question: 'Why might an author use speech marks?', options: ['For decoration', 'To show what characters say', 'To confuse readers', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  
  // More comprehension questions
  { id: 'y3_eng_36', question: 'The main character in a story is called the:', options: ['Villain', 'Protagonist', 'Setting', 'Author'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_37', question: 'The setting is:', options: ['The main character', 'Where and when the story takes place', 'The problem', 'The ending'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_38', question: 'The plot is:', options: ['The place', 'The sequence of events in the story', 'The main character', 'The pictures'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_39', question: 'A character\'s motivation is:', options: ['Their appearance', 'Why they do what they do', 'Their name', 'Where they live'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_40', question: 'The climax of a story is:', options: ['The beginning', 'The most exciting part', 'The end', 'The middle'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_41', question: 'A fable is:', options: ['A true story', 'A short story with a moral lesson', 'Only about animals', 'A very long book'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_42', question: 'A myth usually involves:', options: ['Only real events', 'Gods, heroes, and explains natural phenomena', 'Modern technology', 'Only animals'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_43', question: 'An autobiography is:', options: ['A story about someone else', 'A story written by a person about their own life', 'A made-up story', 'Only about famous people'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_44', question: 'A biography is:', options: ['A true story about someone\'s life', 'A made-up story', 'Only about animals', 'A poem'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_45', question: 'What is the moral of a story?', options: ['The main character', 'The lesson or message', 'The setting', 'The title'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_46', question: 'An index in a non-fiction book:', options: ['Is useless', 'Helps you find topics alphabetically', 'Tells the story', 'Is the title'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_47', question: 'A contents page shows:', options: ['The end', 'Where to find different chapters or sections', 'Nothing useful', 'Only pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_48', question: 'A glossary explains:', options: ['The story', 'Difficult or specialist words', 'The author\'s name', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_49', question: 'Scanning means:', options: ['Reading every word slowly', 'Quickly looking for specific information', 'Not reading', 'Closing the book'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_50', question: 'Skimming means:', options: ['Reading carefully', 'Reading quickly to get the main idea', 'Not reading at all', 'Only looking at pictures'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // WRITING - COMPOSITION (30 questions)
  { id: 'y3_eng_51', question: 'Before writing, it helps to:', options: ['Just start writing randomly', 'Plan and look at similar examples', 'Give up', 'Only draw pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_52', question: 'Composing sentences orally means:', options: ['Never speaking', 'Saying sentences aloud before writing', 'Only thinking', 'Writing immediately'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_53', question: 'A paragraph groups sentences about:', options: ['Different random topics', 'The same topic or idea', 'Nothing', 'Only one word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_54', question: 'In a narrative, you should include:', options: ['Only facts', 'Setting, characters, and plot', 'Random information', 'Only dialogue'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_55', question: 'A good story opening should:', options: ['Be boring', 'Hook the reader and set the scene', 'Give away the ending', 'Be very short'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_56', question: 'When creating a character, think about:', options: ['Nothing', 'Their appearance, personality, and feelings', 'Only their name', 'Only what they wear'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_57', question: 'The setting describes:', options: ['The main character', 'Where and when the story happens', 'The ending', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_58', question: 'A plot needs:', options: ['No events', 'A beginning, middle, and end', 'Only an ending', 'Random sentences'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_59', question: 'In non-fiction writing, headings:', options: ['Are useless', 'Organize information clearly', 'Confuse readers', 'Should be avoided'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_60', question: 'Sub-headings help by:', options: ['Making it messy', 'Breaking information into smaller sections', 'Hiding information', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_61', question: 'Proofreading means:', options: ['Never checking your work', 'Checking for spelling and punctuation errors', 'Writing more', 'Throwing work away'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_62', question: 'When should you proofread?', options: ['Never', 'After finishing your writing', 'Before starting', 'While writing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_63', question: 'Good descriptions use:', options: ['No words', 'Interesting adjectives and details', 'Only short words', 'No detail'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_64', question: 'When writing instructions, you should:', options: ['Be unclear', 'Use clear, ordered steps', 'Confuse the reader', 'Use no order'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_65', question: 'A recount tells about:', options: ['Made-up events', 'Something that really happened', 'The future', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_66', question: 'When writing dialogue, you should:', options: ['Never use speech marks', 'Use speech marks and make it sound natural', 'Only write actions', 'Confuse the reader'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_67', question: 'A good ending should:', options: ['Leave everything unfinished', 'Conclude the story satisfyingly', 'Be random', 'Start a new story'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_68', question: 'Organizing your writing helps:', options: ['Confuse readers', 'Make it clearer and easier to follow', 'Waste time', 'Make it messy'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_69', question: 'In a persuasive text, you should:', options: ['Give no reasons', 'Give reasons and evidence for your opinion', 'Confuse readers', 'Be unclear'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_70', question: 'When writing a letter, you should include:', options: ['No address', 'A greeting, body, and closing', 'Random information', 'Only your name'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_71', question: 'A topic sentence in a paragraph:', options: ['Goes at the end', 'Introduces the main idea', 'Is random', 'Is not needed'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_72', question: 'Time connectives like "first," "then," "finally" help:', options: ['Confuse order', 'Show the sequence of events', 'Make no sense', 'Should be avoided'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_73', question: 'When writing a report, you should:', options: ['Make things up', 'Present facts clearly', 'Confuse readers', 'Use no structure'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_74', question: 'Draft writing means:', options: ['Your final perfect copy', 'Your first attempt that can be improved', 'Wasting time', 'Not needed'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_75', question: 'Editing your work means:', options: ['Never changing anything', 'Making improvements and corrections', 'Throwing it away', 'Starting again'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_76', question: 'When planning a story, you might use:', options: ['Nothing', 'A story map or plan', 'Only your memory', 'No structure'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_77', question: 'Varying sentence length makes writing:', options: ['Boring', 'More interesting and engaging', 'Confusing', 'Too long'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_78', question: 'A strong verb is:', options: ['Weak and boring', 'Precise and powerful', 'Not needed', 'Always "said"'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_79', question: 'Instead of "said," you could use:', options: ['Always "said"', 'Whispered, shouted, exclaimed', 'No speech', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_80', question: 'Show, don\'t tell means:', options: ['Tell everything directly', 'Use descriptive details to show', 'Hide everything', 'Be unclear'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // GRAMMAR & PUNCTUATION (50 questions)
  // Conjunctions
  { id: 'y3_eng_81', question: 'A conjunction:', options: ['Is a noun', 'Joins words or sentences', 'Is a verb', 'Describes a noun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_82', question: 'Which is a conjunction showing time?', options: ['Happy', 'When', 'Quick', 'Dog'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_83', question: 'Complete: "I stayed home ___ it was raining."', options: ['happy', 'because', 'quick', 'the'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_84', question: '"Before," "after," and "while" show:', options: ['Place', 'Time', 'Color', 'Size'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_85', question: '"So" and "because" show:', options: ['Time', 'Cause and effect', 'Place', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_86', question: 'Complete: "She ran fast ___ she was late."', options: ['the', 'because', 'happy', 'dog'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_87', question: 'Which shows time? "I\'ll go ___ you arrive."', options: ['happy', 'when', 'beautiful', 'big'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_88', question: '"We left ___ the movie ended."', options: ['happy', 'after', 'quick', 'red'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Adverbs
  { id: 'y3_eng_89', question: 'An adverb describes:', options: ['A noun', 'How, when, or where something happens', 'A place', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_90', question: 'Which is an adverb?', options: ['Dog', 'Quickly', 'Blue', 'Table'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_91', question: '"Then," "next," and "soon" are adverbs showing:', options: ['Place', 'Time', 'Manner', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_92', question: '"Therefore" shows:', options: ['Time', 'Cause or result', 'Place', 'Color'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_93', question: 'In "She ran quickly," which is the adverb?', options: ['She', 'ran', 'quickly', 'None'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_94', question: 'Adverbs often end in:', options: ['-tion', '-ly', '-ness', '-ful'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Prepositions
  { id: 'y3_eng_95', question: 'A preposition shows:', options: ['Action', 'Position, time, or relationship', 'Description', 'Nothing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_96', question: 'Which is a preposition?', options: ['Happy', 'Before', 'Running', 'Beautiful'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_97', question: '"During," "in," and "after" are:', options: ['Verbs', 'Prepositions', 'Nouns', 'Adjectives'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_98', question: 'Complete: "We left ___ the rain."', options: ['happy', 'because of', 'quick', 'dog'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Paragraphs
  { id: 'y3_eng_99', question: 'A new paragraph shows:', options: ['The same topic continues', 'A new topic or idea', 'The end', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_100', question: 'Paragraphs help by:', options: ['Confusing readers', 'Organizing writing clearly', 'Making it messy', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Headings and sub-headings
  { id: 'y3_eng_101', question: 'Headings tell you:', options: ['Nothing', 'What a section is about', 'The ending', 'Random things'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_102', question: 'Sub-headings:', options: ['Are not useful', 'Break up sections with more specific topics', 'Confuse readers', 'Should be avoided'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Present perfect form
  { id: 'y3_eng_103', question: 'Present perfect uses:', options: ['Only present tense', 'Has/have + past participle', 'Only past tense', 'No verbs'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_104', question: 'Which uses present perfect?', options: ['I walked', 'I have walked', 'I walk', 'I am walking'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_105', question: 'Present perfect is used for:', options: ['Actions in the future', 'Actions completed in the past affecting now', 'Only present actions', 'Nothing'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y3_eng_106', question: 'Which is correct?', options: ['I seen it', 'I have saw it', 'I have seen it', 'I sees it'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_107', question: 'Change to present perfect: "She ate lunch."', options: ['She eats lunch', 'She has eaten lunch', 'She eating lunch', 'She eat lunch'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Inverted commas (speech marks)
  { id: 'y3_eng_108', question: 'Speech marks show:', options: ['Nothing', 'What someone says', 'Thoughts only', 'Actions'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_109', question: 'Which is correct?', options: ['He said hello', '"He said hello"', 'He said "hello"', '"He said" hello'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_110', question: 'Speech marks are also called:', options: ['Full stops', 'Inverted commas', 'Question marks', 'Apostrophes'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_111', question: 'Punctuate: She said I am happy', options: ['She said I am happy.', 'She said "I am happy."', '"She said I am happy."', 'She "said I am happy."'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_112', question: 'Where do speech marks go?', options: ['Around actions', 'Around what is spoken', 'Nowhere', 'At the start only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_113', question: 'What punctuation ends speech inside marks?', options: ['Nothing', 'Comma, full stop, ! or ?', 'Only full stop', 'No punctuation'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // More grammar questions
  { id: 'y3_eng_114', question: 'What is a noun?', options: ['Doing word', 'Naming word', 'Describing word', 'Joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_115', question: 'What is a verb?', options: ['Naming word', 'Doing or being word', 'Describing word', 'Joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_116', question: 'What is an adjective?', options: ['Doing word', 'Naming word', 'Describing word', 'Joining word'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_117', question: 'In "The quick brown fox," which words are adjectives?', options: ['The, fox', 'quick, brown', 'The, quick', 'fox, brown'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_118', question: 'A proper noun:', options: ['Is lowercase', 'Starts with a capital letter (name/place)', 'Is not real', 'Is a verb'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_119', question: 'Which is a proper noun?', options: ['dog', 'city', 'London', 'table'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_120', question: 'A sentence must start with:', options: ['Lowercase', 'A capital letter', 'A comma', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_121', question: 'A sentence must end with:', options: ['Nothing', 'A full stop, ! or ?', 'A comma', 'A capital'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_122', question: 'A comma can be used to:', options: ['End a sentence', 'Separate items in a list', 'Start a sentence', 'Replace full stops'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_123', question: 'An exclamation mark shows:', options: ['A question', 'Strong feeling or surprise', 'Normal statement', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_124', question: 'A question mark shows:', options: ['A statement', 'A question', 'An exclamation', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_125', question: 'An apostrophe for possession shows:', options: ['Plural', 'Ownership', 'A question', 'Nothing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_126', question: '"The dog\'s bone" means:', options: ['Many dogs', 'The bone belongs to the dog', 'Dog is', 'Dogs bone'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_127', question: 'Past tense of "walk":', options: ['walking', 'walks', 'walked', 'will walk'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_128', question: 'Present tense of "jumped":', options: ['jumping', 'jump', 'will jump', 'jumped'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_129', question: 'Future tense uses:', options: ['Only past forms', 'Will or shall', 'No helping verbs', 'Only -ed'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_130', question: '"I will go" is:', options: ['Past tense', 'Present tense', 'Future tense', 'No tense'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // SPELLING (35 questions)
  // Prefixes
  { id: 'y3_eng_131', question: 'The prefix "dis-" means:', options: ['Again', 'Not or opposite', 'Before', 'Too much'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_132', question: 'Add "dis-" to "appear":', options: ['disppear', 'disappear', 'dissappear', 'dis-appear'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_133', question: 'The prefix "mis-" means:', options: ['Again', 'Wrong or badly', 'Before', 'Not'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_134', question: 'Add "mis-" to "spell":', options: ['misspell', 'misspel', 'mis-spell', 'missppell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_135', question: 'The prefix "re-" means:', options: ['Not', 'Again', 'Before', 'Too much'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_136', question: 'Add "re-" to "write":', options: ['rerite', 'rewright', 'rewrite', 're-wright'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_137', question: 'The prefix "pre-" means:', options: ['After', 'Before', 'Not', 'Again'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_138', question: 'Add "pre-" to "view":', options: ['preview', 'pre-veiw', 'preveiw', 'prevue'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_139', question: 'The prefix "super-" means:', options: ['Under', 'Above or beyond', 'Not', 'Again'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_140', question: 'The prefix "anti-" means:', options: ['For', 'Against', 'Before', 'Again'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_141', question: 'The prefix "auto-" means:', options: ['Other', 'Self', 'Not', 'Again'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Suffix -ly
  { id: 'y3_eng_142', question: 'The suffix "-ly" often makes:', options: ['A noun', 'An adverb', 'A verb', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_143', question: 'Add "-ly" to "quick":', options: ['quickley', 'quickly', 'quikly', 'quickli'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_144', question: 'Add "-ly" to "happy":', options: ['happyly', 'happily', 'hapily', 'happyley'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_145', question: 'When a word ends in "y," change it to ___ before adding "-ly":', options: ['a', 'e', 'i', 'o'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_146', question: 'Add "-ly" to "gentle":', options: ['gentlely', 'gently', 'gentley', 'gentily'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Words with endings sounding like /ze/ or /cher/
  { id: 'y3_eng_147', question: 'How do you spell: "to find the size"?', options: ['measher', 'mesure', 'measure', 'mezhure'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_148', question: 'How do you spell: "a living thing"?', options: ['creture', 'creature', 'creeture', 'creacher'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_149', question: 'The /cher/ sound is often spelled:', options: ['-cher', '-ture', '-sure', '-ter'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_150', question: 'Spell: "something you enjoy":', options: ['plesure', 'pleasure', 'plezhure', 'plesher'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Words with /ei/ sound
  { id: 'y3_eng_151', question: 'How do you spell: "a blood vessel"?', options: ['vain', 'vein', 'vien', 'vane'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_152', question: 'How do you spell the number after seven?', options: ['eigt', 'eight', 'eite', 'aight'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_153', question: 'The /ei/ sound can be spelled:', options: ['Only "ei"', '"ei" or "eigh"', 'Only "ai"', 'Only "ay"'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_154', question: 'Spell: "carries heavy loads":', options: ['waight', 'wate', 'weight', 'weit'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // General spelling
  { id: 'y3_eng_155', question: 'How do you spell: "opposite of light"?', options: ['heavy', 'hevvy', 'hevy', 'heavie'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_156', question: 'How do you spell: "60 seconds"?', options: ['minit', 'minute', 'minite', 'minut'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_157', question: 'How do you spell: "the place where you learn"?', options: ['scool', 'skool', 'school', 'shool'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_158', question: 'To check spelling, use:', options: ['Nothing', 'A dictionary', 'Guessing only', 'Your imagination'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_159', question: 'Look up a word in a dictionary using:', options: ['Random pages', 'The first 2-3 letters alphabetically', 'The last letter', 'Pictures only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_160', question: 'Spell: "not easy":', options: ['dificult', 'difficult', 'difficalt', 'dificalt'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_161', question: 'Spell: "twelve months":', options: ['yeer', 'year', 'yeare', 'yier'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_162', question: 'Spell: "a group of people":', options: ['comunity', 'community', 'comunnity', 'comunety'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y3_eng_163', question: 'Spell: "to make better":', options: ['improve', 'improove', 'inprove', 'emprove'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_164', question: 'Spell: "a space between":', options: ['distanse', 'distance', 'distants', 'distanse'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_165', question: 'Common exception word:', options: ['Regular patterns only', 'Words that don\'t follow rules', 'Only easy words', 'Nothing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // HANDWRITING (15 questions)
  { id: 'y3_eng_166', question: 'Joined handwriting means:', options: ['Letters are separate', 'Letters are connected', 'Only capitals', 'No writing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_167', question: 'Letters should be:', options: ['All different sizes', 'Consistent in size', 'Very large', 'Very tiny'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_168', question: 'Spacing between words should be:', options: ['No space', 'Clear and consistent', 'Very large', 'Random'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_169', question: 'Tall letters like "h" and "l" should:', options: ['Be very short', 'Reach above the line', 'Stay on the line', 'Go below'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_170', question: 'Letters with tails like "g" and "y" should:', options: ['Stay on line', 'Go below the line', 'Go above', 'Be any size'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_171', question: 'Diagonal strokes help:', options: ['Make writing messy', 'Join letters smoothly', 'Separate letters', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_172', question: 'Some letters are best:', options: ['Always joined', 'Left unjoined', 'Never written', 'Very large'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_173', question: 'Legible writing means:', options: ['Messy', 'Easy to read', 'Impossible to read', 'Decorated'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_174', question: 'Why is neat handwriting important?', options: ['It\'s not important', 'Others can read your ideas clearly', 'To waste time', 'To show off'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_175', question: 'Practice helps improve:', options: ['Nothing', 'Consistency and quality', 'Make it worse', 'Slow you down'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_176', question: 'Good posture when writing means:', options: ['Lying down', 'Sitting properly at a desk', 'Standing', 'Any position'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_177', question: 'Horizontal strokes go:', options: ['Up and down', 'Left to right', 'Diagonal', 'In circles'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_178', question: 'Quality handwriting is:', options: ['Messy and quick', 'Neat, clear, and consistent', 'Very slow', 'Impossible'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_179', question: 'Which letters often don\'t join to the next?', options: ['All letters join', 'Letters like "b," "o," "v," "w"', 'Only vowels', 'Only consonants'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_180', question: 'Starting letters at the correct place helps:', options: ['Nothing', 'Form letters correctly and join smoothly', 'Make it messy', 'Slow you down'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // VOCABULARY (20 questions)
  { id: 'y3_eng_181', question: 'A synonym is:', options: ['An opposite word', 'A word with similar meaning', 'A made-up word', 'A long word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_182', question: 'A synonym for "big" is:', options: ['Small', 'Large', 'Tiny', 'Short'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_183', question: 'An antonym is:', options: ['A similar word', 'An opposite word', 'The same word', 'A noun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_184', question: 'An antonym for "hot" is:', options: ['Warm', 'Cold', 'Boiling', 'Hot'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_185', question: 'A word family shares:', options: ['Nothing', 'A common root word', 'The same length', 'Random letters'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_186', question: 'Word family for "solve":', options: ['Run, jump', 'Solve, solution, solver', 'Cat, dog', 'Red, blue'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_187', question: 'Using a dictionary helps you:', options: ['Waste time', 'Find meanings and spellings', 'Get confused', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_188', question: 'Words in a dictionary are arranged:', options: ['Randomly', 'Alphabetically', 'By size', 'By color'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_189', question: 'Recording interesting words helps:', options: ['Nothing', 'Expand your vocabulary', 'Waste time', 'Confuse you'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_190', question: 'A powerful verb is:', options: ['Weak', 'Strong and descriptive', 'Boring', 'Not needed'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_191', question: 'Instead of "nice," you could say:', options: ['Bad', 'Lovely, wonderful, pleasant', 'Boring', 'Small'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_192', question: 'A word family for "happy":', options: ['Happy, happily, happiness, unhappy', 'Run, walk', 'Red, blue', 'Cat, dog'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_193', question: 'Using varied vocabulary makes writing:', options: ['Boring', 'More interesting', 'Confusing', 'Shorter'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_194', question: 'A thesaurus helps you find:', options: ['Nothing', 'Synonyms and antonyms', 'Pictures', 'Numbers'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_195', question: 'Context clues help you:', options: ['Get confused', 'Work out word meanings', 'Stop reading', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_196', question: 'Descriptive words make writing:', options: ['Boring', 'More vivid and interesting', 'Shorter', 'Unclear'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_197', question: 'Technical vocabulary is:', options: ['Made-up', 'Specialist words for specific subjects', 'Only simple words', 'Not real'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_198', question: 'Learning new vocabulary helps you:', options: ['Get confused', 'Express ideas more clearly', 'Waste time', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y3_eng_199', question: 'Root words are:', options: ['Random', 'The base form that other words are built from', 'Only long words', 'Not important'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y3_eng_200', question: 'Expanding vocabulary improves:', options: ['Nothing', 'Your reading, writing, and communication', 'Only spelling', 'Only handwriting'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
];
