// Year 4 English Trivia Questions
// Based on UK Year 4 English Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_4_ENGLISH_QUESTIONS = [
  // READING & COMPREHENSION (40 questions)
  // Root words, prefixes, and suffixes
  { id: 'y4_eng_1', question: 'What is the root word in "unhappy"?', options: ['un', 'happy', 'unhappy', 'hap'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_2', question: 'What does the prefix "re-" mean?', options: ['Not', 'Again', 'Before', 'After'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_3', question: 'What does the prefix "un-" mean?', options: ['Again', 'Not', 'Before', 'Very'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_4', question: 'What does the suffix "-ful" mean?', options: ['Without', 'Full of', 'Small', 'Many'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_5', question: 'What is the root word in "carefully"?', options: ['care', 'careful', 'full', 'ly'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_6', question: 'If "help" is the root word, what does "helpful" mean?', options: ['Without help', 'Full of help', 'Needing help', 'Past help'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_7', question: 'What does the prefix "pre-" mean?', options: ['After', 'Before', 'Against', 'Not'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_8', question: 'What is the root word in "disappointment"?', options: ['disappoint', 'appoint', 'point', 'dis'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Themes and conventions
  { id: 'y4_eng_9', question: 'What is a theme in a story?', options: ['The title', 'The main idea or message', 'The characters', 'The setting'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_10', question: 'Which is a common theme in fairy tales?', options: ['Science', 'Good vs evil', 'Sports', 'School'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_11', question: 'What is a convention in poetry?', options: ['Using verses and rhythm', 'Using long sentences', 'Using no punctuation', 'Using only capital letters'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_12', question: 'What convention is often used in traditional tales?', options: ['Modern technology', 'Once upon a time', 'Emails', 'Phone calls'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Drawing inferences
  { id: 'y4_eng_13', question: 'If a character is crying, they might feel:', options: ['Happy', 'Sad or upset', 'Angry', 'Hungry'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_14', question: 'If a character slams the door, what might they feel?', options: ['Calm', 'Angry or frustrated', 'Sleepy', 'Confused'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_15', question: 'What does it mean to "draw an inference"?', options: ['To draw a picture', 'To work out something not directly stated', 'To write a story', 'To read aloud'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_16', question: 'If the text says "She smiled when she opened the gift," what can you infer?', options: ['She was sad', 'She liked the gift', 'She was angry', 'She was tired'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_17', question: 'What is evidence in reading?', options: ['A guess', 'Words from the text that support your answer', 'The title', 'The author'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Predicting
  { id: 'y4_eng_18', question: 'To predict means to:', options: ['Read backwards', 'Say what might happen next', 'Summarize', 'Ask questions'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_19', question: 'Which helps you make predictions?', options: ['Ignoring the text', 'Using clues from the text', 'Only reading the end', 'Skipping pages'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_20', question: 'If dark clouds appear in a story, what might happen?', options: ['Sunshine', 'Rain or storm', 'Party', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Retrieving information
  { id: 'y4_eng_21', question: 'Where would you find information about a book\'s chapters?', options: ['Index', 'Contents page', 'Glossary', 'Bibliography'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_22', question: 'What is a glossary?', options: ['List of chapters', 'List of difficult words and meanings', 'List of authors', 'List of pictures'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_23', question: 'What is an index in a non-fiction book?', options: ['The first page', 'Alphabetical list of topics with page numbers', 'The title', 'The author\'s name'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_24', question: 'Headings in non-fiction help you:', options: ['Find specific information quickly', 'Make the book longer', 'Confuse readers', 'Hide information'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Summarising
  { id: 'y4_eng_25', question: 'To summarise means to:', options: ['Write everything again', 'Give the main points briefly', 'Read slowly', 'Ask questions'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_26', question: 'When summarising, you should:', options: ['Include every detail', 'Include only key information', 'Copy word for word', 'Make things up'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_27', question: 'A summary should be:', options: ['Longer than the original', 'Shorter than the original', 'The same length', 'Very detailed'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Fiction and non-fiction
  { id: 'y4_eng_28', question: 'What is fiction?', options: ['True stories', 'Made-up stories', 'Only poems', 'Only plays'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_29', question: 'What is non-fiction?', options: ['Made-up stories', 'True, factual information', 'Only poems', 'Only plays'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_30', question: 'Which is an example of fiction?', options: ['A science textbook', 'A fairy tale', 'A history book', 'A dictionary'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_31', question: 'Which is an example of non-fiction?', options: ['A fantasy novel', 'A biography', 'A myth', 'A legend'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Poetry
  { id: 'y4_eng_32', question: 'What is a verse in poetry?', options: ['A line', 'A group of lines (stanza)', 'A word', 'A title'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_33', question: 'What is rhyme in poetry?', options: ['Words that sound the same at the end', 'Long words', 'Capital letters', 'Numbers'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_34', question: 'Which words rhyme?', options: ['Cat and mat', 'Dog and fish', 'Sun and moon', 'Red and blue'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_35', question: 'What is rhythm in poetry?', options: ['The title', 'The pattern of beats', 'The author', 'The paper'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Characters and settings
  { id: 'y4_eng_36', question: 'A character is:', options: ['The setting', 'A person or creature in a story', 'The title', 'The ending'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_37', question: 'The setting is:', options: ['The characters', 'Where and when the story happens', 'The author', 'The moral'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_38', question: 'What is the plot?', options: ['The characters', 'The setting', 'The sequence of events in a story', 'The title'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_39', question: 'The main character in a story is called:', options: ['The villain', 'The protagonist', 'The author', 'The narrator'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_40', question: 'The problem or challenge in a story is called:', options: ['The setting', 'The conflict', 'The theme', 'The chapter'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // WRITING - COMPOSITION (30 questions)
  // Planning writing
  { id: 'y4_eng_41', question: 'Why should you plan before writing?', options: ['It wastes time', 'It helps organize ideas', 'It makes writing harder', 'It\'s not important'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_42', question: 'A writing model is:', options: ['A fashion show', 'An example of good writing to learn from', 'A toy', 'A picture'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_43', question: 'What should you do when planning a story?', options: ['Start writing immediately', 'Think about characters, setting, and plot', 'Write the ending first', 'Skip planning'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Varied vocabulary
  { id: 'y4_eng_44', question: 'Why use varied vocabulary in writing?', options: ['To confuse readers', 'To make writing more interesting', 'To make it longer', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_45', question: 'Instead of "said," you could use:', options: ['Walked', 'Whispered', 'Jumped', 'Ate'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_46', question: 'Instead of "nice," you could use:', options: ['Bad', 'Lovely or pleasant', 'Ugly', 'Small'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Paragraphs
  { id: 'y4_eng_47', question: 'A paragraph is:', options: ['One sentence', 'A group of sentences about one idea', 'The whole story', 'The title'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_48', question: 'When should you start a new paragraph?', options: ['Never', 'When changing to a new idea or topic', 'After every sentence', 'Randomly'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_49', question: 'Paragraphs help make writing:', options: ['Confusing', 'Organized and clear', 'Longer', 'Boring'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Narratives
  { id: 'y4_eng_50', question: 'In a narrative, you should describe:', options: ['Only characters', 'Settings, characters, and events', 'Only the ending', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_51', question: 'A detailed setting includes:', options: ['Only the time', 'What the place looks, sounds, and feels like', 'Only the weather', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_52', question: 'When creating a character, describe their:', options: ['Name only', 'Appearance, personality, and feelings', 'Age only', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_53', question: 'A good story plot has:', options: ['No events', 'A beginning, middle, and end', 'Only an ending', 'No characters'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Non-narrative writing
  { id: 'y4_eng_54', question: 'Headings in non-fiction writing:', options: ['Confuse readers', 'Help organize information', 'Are not needed', 'Make it boring'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_55', question: 'Sub-headings are:', options: ['Main titles', 'Smaller headings under main headings', 'Not important', 'Paragraphs'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_56', question: 'In a non-fiction text, what helps readers find information?', options: ['Long sentences', 'Headings and bullet points', 'No organization', 'Small writing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Proofreading and editing
  { id: 'y4_eng_57', question: 'Proofreading means:', options: ['Reading for fun', 'Checking for errors', 'Writing a new story', 'Ignoring mistakes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_58', question: 'When proofreading, check for:', options: ['Nothing', 'Spelling and punctuation errors', 'Only pictures', 'Page numbers'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_59', question: 'Editing means:', options: ['Rewriting everything', 'Improving and correcting your writing', 'Deleting all work', 'Starting over'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_60', question: 'When editing, you might:', options: ['Make it worse', 'Change words to improve clarity', 'Add more errors', 'Delete everything'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_61', question: 'Why is it important to read your work aloud?', options: ['It wastes time', 'It helps you spot mistakes', 'It\'s boring', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_62', question: 'What should you do if you find a mistake?', options: ['Ignore it', 'Correct it', 'Hide it', 'Cross out the whole page'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_63', question: 'Good writers:', options: ['Never edit', 'Edit and improve their work', 'Write perfectly first time', 'Don\'t care about errors'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_64', question: 'A draft is:', options: ['The final version', 'An early version you can improve', 'A picture', 'A waste'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_65', question: 'When improving vocabulary, you might:', options: ['Use simpler words', 'Replace boring words with interesting ones', 'Delete all adjectives', 'Use only short words'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_66', question: 'Rehearsing sentences orally means:', options: ['Writing them down', 'Saying them out loud before writing', 'Singing them', 'Ignoring them'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_67', question: 'What is the purpose of a story opening?', options: ['To end the story', 'To grab the reader\'s attention', 'To confuse readers', 'No purpose'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_68', question: 'What makes a good story ending?', options: ['It\'s boring', 'It resolves the problem', 'It\'s confusing', 'There is no ending'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_69', question: 'In instruction writing, you should:', options: ['Be unclear', 'Use clear, ordered steps', 'Skip steps', 'Use long sentences'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_70', question: 'A persuasive text tries to:', options: ['Inform only', 'Convince the reader', 'Confuse', 'Bore'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // GRAMMAR & PUNCTUATION (50 questions)
  // Expanded noun phrases
  { id: 'y4_eng_71', question: 'What is a noun?', options: ['A doing word', 'A naming word', 'A describing word', 'A joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_72', question: 'What is a noun phrase?', options: ['A verb', 'A noun with describing words', 'A sentence', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_73', question: 'Which is an expanded noun phrase?', options: ['Dog', 'The big, fluffy dog', 'Run', 'Quickly'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_74', question: 'Expand this: "house" becomes:', options: ['A house', 'The old, wooden house', 'House running', 'Very house'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Fronted adverbials
  { id: 'y4_eng_75', question: 'What is a fronted adverbial?', options: ['A verb at the start', 'A word/phrase at the start telling when, where, or how', 'A noun at the start', 'The title'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_76', question: 'Which is a fronted adverbial?', options: ['The boy ran', 'Later that day, we left', 'She is happy', 'Books are fun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_77', question: 'What comes after a fronted adverbial?', options: ['Nothing', 'A comma', 'A full stop', 'A question mark'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_78', question: 'Which sentence uses a fronted adverbial correctly?', options: ['Quietly, the cat crept in.', 'The cat quietly crept in.', 'Quietly the cat crept in', 'Cat quietly'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_79', question: '"In the morning," is a fronted adverbial telling:', options: ['Where', 'When', 'How', 'Why'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_80', question: '"Under the table," is a fronted adverbial telling:', options: ['When', 'Where', 'How', 'Why'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Pronouns
  { id: 'y4_eng_81', question: 'What is a pronoun?', options: ['A naming word', 'A word that replaces a noun', 'A describing word', 'A joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_82', question: 'Which is a pronoun?', options: ['Happy', 'Run', 'He', 'Beautiful'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_83', question: 'Use a pronoun: "Tom went home. ___ was tired."', options: ['Tom', 'He', 'She', 'Happy'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_84', question: 'Pronouns help avoid:', options: ['Repetition', 'Clarity', 'Understanding', 'Grammar'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_85', question: 'Which are pronouns?', options: ['Cat, dog', 'I, you, he, she, it, we, they', 'Run, jump', 'Happy, sad'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Direct speech
  { id: 'y4_eng_86', question: 'What are inverted commas used for?', options: ['Ending sentences', 'Showing direct speech', 'Lists', 'Questions'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_87', question: 'Which sentence uses inverted commas correctly?', options: ['"Hello," she said.', 'Hello, she said.', '"Hello" she said', 'Hello she said.'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_88', question: 'Direct speech is:', options: ['Describing', 'The exact words someone says', 'Summarizing', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_89', question: 'What punctuation goes before the inverted commas in: She said, "Hello"?', options: ['Full stop', 'Comma', 'Question mark', 'Exclamation'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_90', question: 'Inverted commas are also called:', options: ['Full stops', 'Speech marks or quotation marks', 'Commas', 'Apostrophes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Possessive apostrophes
  { id: 'y4_eng_91', question: 'An apostrophe shows:', options: ['Possession or omission', 'A question', 'An exclamation', 'A list'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_92', question: 'Which shows possession correctly?', options: ['The dogs bone', 'The dog\'s bone', 'The dogs\' bone', 'The dog bone\'s'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_93', question: 'For a plural word ending in s, where does the apostrophe go?', options: ['Before the s', 'After the s', 'No apostrophe', 'At the start'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_94', question: 'The girls\' hats means:', options: ['One girl', 'More than one girl', 'No girls', 'A boy'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_95', question: 'The girl\'s hat means:', options: ['One girl', 'Many girls', 'No girls', 'A boy'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Standard English
  { id: 'y4_eng_96', question: 'Which is correct standard English?', options: ['We was going', 'We were going', 'We is going', 'We be going'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_97', question: 'Which is correct?', options: ['I done it', 'I did it', 'I doed it', 'I do it yesterday'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_98', question: 'Which is correct?', options: ['She don\'t like it', 'She doesn\'t like it', 'She do not like it', 'She ain\'t like it'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_99', question: 'Which is correct?', options: ['I seen it', 'I saw it', 'I seed it', 'I see it yesterday'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Other grammar
  { id: 'y4_eng_100', question: 'What is a verb?', options: ['A naming word', 'A doing or being word', 'A describing word', 'A joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_101', question: 'What is an adjective?', options: ['A naming word', 'A doing word', 'A describing word', 'A joining word'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_102', question: 'Which is an adjective?', options: ['Run', 'Beautiful', 'Quickly', 'And'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_103', question: 'What is an adverb?', options: ['A word describing a noun', 'A word describing a verb', 'A naming word', 'A joining word'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_104', question: 'Which is an adverb?', options: ['Happy', 'Quickly', 'Dog', 'Blue'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_105', question: 'What does a conjunction do?', options: ['Describes', 'Joins words or sentences', 'Names things', 'Shows action'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_106', question: 'Which is a conjunction?', options: ['Happy', 'Run', 'And', 'Beautiful'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_107', question: 'What ends a sentence?', options: ['A comma', 'A full stop, question mark, or exclamation mark', 'A space', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_108', question: 'A question ends with:', options: ['A full stop', 'A comma', 'A question mark', 'Nothing'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_109', question: 'An exclamation shows:', options: ['Boredom', 'Strong feeling or surprise', 'A question', 'A list'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_110', question: 'A comma is used to:', options: ['End sentences', 'Separate items in a list or clauses', 'Show questions', 'Replace full stops'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_111', question: 'What is a preposition?', options: ['A naming word', 'A word showing position (in, on, under)', 'A doing word', 'A describing word'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_112', question: 'Which is a preposition?', options: ['Happy', 'Under', 'Run', 'Beautiful'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_113', question: 'What is a determiner?', options: ['A describing word', 'A word like "the" or "a"', 'A verb', 'A pronoun'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_114', question: 'A sentence must have:', options: ['Just a noun', 'A subject and a verb', 'Only adjectives', 'No punctuation'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_115', question: 'A clause is:', options: ['A single word', 'A group of words with a subject and verb', 'A letter', 'A title'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_116', question: 'What is cohesion in writing?', options: ['Breaking it apart', 'How ideas link together smoothly', 'Random sentences', 'No connection'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_117', question: 'A complex sentence has:', options: ['One clause', 'A main clause and a subordinate clause', 'No verbs', 'Only nouns'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_118', question: 'Which is a complex sentence?', options: ['I ran.', 'The dog barked.', 'Although it rained, we played outside.', 'She is happy.'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_119', question: 'A compound sentence has:', options: ['One clause', 'Two or more main clauses joined', 'No verbs', 'Only adjectives'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_120', question: 'Which is a compound sentence?', options: ['I like pizza.', 'I like pizza and she likes pasta.', 'Pizza is nice.', 'Like pizza.'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // SPELLING & VOCABULARY (60 questions)
  // Prefixes
  { id: 'y4_eng_121', question: 'What does the prefix "in-" mean in "invisible"?', options: ['Very', 'Not', 'Again', 'Before'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_122', question: 'What does "il-" mean in "illegal"?', options: ['Not', 'Very', 'Again', 'Under'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_123', question: 'What does "im-" mean in "impossible"?', options: ['Very', 'Not', 'Before', 'After'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_124', question: 'What does "ir-" mean in "irregular"?', options: ['Very', 'Not', 'Again', 'Under'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_125', question: 'What does "sub-" mean in "submarine"?', options: ['Above', 'Under', 'Between', 'Again'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_126', question: 'What does "inter-" mean in "international"?', options: ['Within', 'Between', 'Above', 'Under'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_127', question: 'What does "super-" mean in "superhero"?', options: ['Under', 'Above or beyond', 'Between', 'Not'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_128', question: 'What does "anti-" mean in "antifreeze"?', options: ['For', 'Against', 'Under', 'Above'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_129', question: 'What does "auto-" mean in "autobiography"?', options: ['Self', 'Other', 'Many', 'None'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Suffixes
  { id: 'y4_eng_130', question: 'What does the suffix "-ation" do?', options: ['Makes a verb into a noun', 'Makes a noun into a verb', 'Makes an adjective', 'Nothing'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_131', question: '"Inform" + "-ation" becomes:', options: ['Informing', 'Information', 'Informed', 'Informative'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_132', question: 'What does the suffix "-ous" mean?', options: ['Without', 'Full of', 'Small', 'Many'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_133', question: '"Danger" + "-ous" becomes:', options: ['Dangering', 'Dangered', 'Dangerous', 'Dangerously'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_134', question: '"Poison" + "-ous" becomes:', options: ['Poisoning', 'Poisonous', 'Poisoned', 'Poisonly'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_135', question: 'Which spelling is correct?', options: ['Dangerus', 'Dangerous', 'Dangeros', 'Dangerouse'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Year 4 word list examples
  { id: 'y4_eng_136', question: 'Which spelling is correct?', options: ['Beleive', 'Believe', 'Beleeve', 'Belive'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_137', question: 'Which spelling is correct?', options: ['Freind', 'Frend', 'Friend', 'Freend'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_138', question: 'Which spelling is correct?', options: ['Becuase', 'Because', 'Becuse', 'Becase'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_139', question: 'Which spelling is correct?', options: ['Diffrent', 'Different', 'Diferent', 'Differant'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_140', question: 'Which spelling is correct?', options: ['Gard', 'Gaurd', 'Guard', 'Guord'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_141', question: 'Which spelling is correct?', options: ['Importent', 'Important', 'Imporatnt', 'Importint'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_142', question: 'Which spelling is correct?', options: ['Intresting', 'Interesting', 'Intersting', 'Intressting'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_143', question: 'Which spelling is correct?', options: ['Libary', 'Liberry', 'Library', 'Librery'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_144', question: 'Which spelling is correct?', options: ['Necessary', 'Neccessary', 'Necesary', 'Neccesary'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_145', question: 'Which spelling is correct?', options: ['Ocasion', 'Occassion', 'Occasion', 'Ocastion'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_146', question: 'Which spelling is correct?', options: ['Probly', 'Probably', 'Probally', 'Probbably'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_147', question: 'Which spelling is correct?', options: ['Seperate', 'Separate', 'Seperete', 'Separete'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_148', question: 'Which spelling is correct?', options: ['Thier', 'There', 'Their', 'Thare'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_149', question: 'Which spelling is correct?', options: ['Untill', 'Until', 'Untile', 'Untl'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_150', question: 'Which spelling is correct?', options: ['Wensday', 'Wendsday', 'Wednesday', 'Wednsday'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Dictionary and thesaurus
  { id: 'y4_eng_151', question: 'What is a dictionary used for?', options: ['Finding stories', 'Finding word meanings and spellings', 'Finding pictures', 'Finding numbers'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_152', question: 'Words in a dictionary are arranged:', options: ['Randomly', 'Alphabetically', 'By size', 'By color'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_153', question: 'What is a thesaurus used for?', options: ['Finding spellings', 'Finding synonyms and antonyms', 'Finding stories', 'Finding numbers'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_154', question: 'A synonym is:', options: ['The opposite word', 'A word with similar meaning', 'A spelling mistake', 'A punctuation mark'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_155', question: 'An antonym is:', options: ['A similar word', 'An opposite word', 'A spelling', 'A sentence'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_156', question: 'A synonym for "happy" is:', options: ['Sad', 'Joyful', 'Angry', 'Tired'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_157', question: 'An antonym for "hot" is:', options: ['Warm', 'Boiling', 'Cold', 'Fire'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_158', question: 'A synonym for "big" is:', options: ['Small', 'Tiny', 'Large', 'Little'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_159', question: 'An antonym for "fast" is:', options: ['Quick', 'Speedy', 'Slow', 'Rapid'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // More spelling patterns
  { id: 'y4_eng_160', question: 'Which word follows the "i before e except after c" rule?', options: ['Recieve', 'Receive', 'Beleive', 'Freind'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_161', question: 'How do you spell the plural of "baby"?', options: ['Babys', 'Babies', 'Babyes', 'Babyies'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_162', question: 'How do you spell the plural of "box"?', options: ['Boxs', 'Boxes', 'Boxies', 'Boxe'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_163', question: 'How do you spell the past tense of "hop"?', options: ['Hoped', 'Hopped', 'Hoping', 'Hopt'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_164', question: 'Which spelling is correct?', options: ['Adress', 'Address', 'Addres', 'Adres'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_165', question: 'Which spelling is correct?', options: ['Bisiness', 'Buisness', 'Business', 'Bussiness'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_166', question: 'Which spelling is correct?', options: ['Calender', 'Calendar', 'Calandar', 'Calander'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_167', question: 'Which spelling is correct?', options: ['Comunity', 'Comunety', 'Community', 'Comunitty'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_168', question: 'Which spelling is correct?', options: ['Enviroment', 'Environment', 'Envirement', 'Environement'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_169', question: 'Which spelling is correct?', options: ['Exersise', 'Exercise', 'Excercise', 'Exercize'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_170', question: 'Which spelling is correct?', options: ['Fourty', 'Forty', 'Fourthy', 'Fourtie'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_171', question: 'Which spelling is correct?', options: ['Grammer', 'Grammar', 'Gramer', 'Gramner'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_172', question: 'Which spelling is correct?', options: ['Hieght', 'Height', 'Heighth', 'Hight'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_173', question: 'Which spelling is correct?', options: ['Iland', 'Island', 'Iseland', 'Islend'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_174', question: 'Which spelling is correct?', options: ['Knowlege', 'Knowledge', 'Knolwedge', 'Knowladge'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_eng_175', question: 'Which spelling is correct?', options: ['Lengh', 'Lenth', 'Length', 'Lengthe'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_176', question: 'Which spelling is correct?', options: ['Medecine', 'Medicine', 'Medicin', 'Medisine'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_177', question: 'Which spelling is correct?', options: ['Natchural', 'Natural', 'Naturel', 'Natral'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_178', question: 'Which spelling is correct?', options: ['Posible', 'Possible', 'Possable', 'Possibl'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_179', question: 'Which spelling is correct?', options: ['Questoin', 'Question', 'Queston', 'Questian'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_180', question: 'Which spelling is correct?', options: ['Sentance', 'Sentence', 'Sentense', 'Sentense'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // HANDWRITING (10 questions)
  { id: 'y4_eng_181', question: 'Why is neat handwriting important?', options: ['It\'s not important', 'So others can read your work', 'To waste time', 'To use more paper'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_182', question: 'In joined handwriting, letters are:', options: ['Separate', 'Connected', 'Very large', 'Invisible'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_183', question: 'Which letters are usually best left unjoined?', options: ['All letters', 'Letters that don\'t flow well together', 'Vowels only', 'Consonants only'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_eng_184', question: 'Good handwriting has:', options: ['Inconsistent size', 'Consistent size and spacing', 'Very small letters', 'Very large letters'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_185', question: 'When writing, you should:', options: ['Rush', 'Write carefully and neatly', 'Make letters messy', 'Use no spaces'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_186', question: 'Diagonal strokes in letters help:', options: ['Make it messy', 'Join letters smoothly', 'Separate words', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_187', question: 'Spacing between words should be:', options: ['Very large', 'Consistent and clear', 'Non-existent', 'Random'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_188', question: 'Letters should sit:', options: ['Above the line', 'On the line', 'Below the line', 'Anywhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_189', question: 'Capital letters are used:', options: ['For every word', 'At the start of sentences and for names', 'Never', 'Only in titles'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_190', question: 'Ascenders are:', options: ['Letters that go below the line', 'Letters that go above (like b, d, h)', 'Capital letters', 'Spaces'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // ASSESSMENT & PROGRESS (10 questions)
  { id: 'y4_eng_191', question: 'Why do we have spelling tests?', options: ['To waste time', 'To check and improve spelling', 'For fun only', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_192', question: 'What is dictation?', options: ['Drawing pictures', 'Writing down words or sentences read aloud', 'Reading silently', 'Copying from a book'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_193', question: 'Reading comprehension tests check if you:', options: ['Can read fast', 'Understand what you read', 'Can spell', 'Can draw'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_194', question: 'A writing portfolio is:', options: ['A bag', 'A collection of your best writing', 'A test', 'A book'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_195', question: 'Why is it good to review your work?', options: ['To waste time', 'To see progress and improve', 'It\'s not good', 'To make it worse'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_196', question: 'What does "mastery" mean?', options: ['Being bad at something', 'Being very good at something', 'Not trying', 'Giving up'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_197', question: 'To improve in English, you should:', options: ['Never read', 'Read regularly and practice writing', 'Only watch TV', 'Avoid books'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_198', question: 'When you make a mistake, you should:', options: ['Give up', 'Learn from it and try again', 'Get upset', 'Ignore it'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_199', question: 'Good readers:', options: ['Never read', 'Read regularly and widely', 'Only read comics', 'Avoid books'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_eng_200', question: 'The best way to become a better writer is to:', options: ['Never practice', 'Write regularly and read good examples', 'Only write once a year', 'Copy everything'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
];
