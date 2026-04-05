// Comprehensive Trivia Questions Database
// Organized by grade level and subject

// Import the comprehensive Year 1 questions
import { YEAR_1_MATHS_QUESTIONS } from './year1-maths-trivia.tsx';
import { YEAR_1_ENGLISH_QUESTIONS } from './year1-english-trivia.tsx';
// Import the comprehensive Year 1 Science questions
import { YEAR_1_SCIENCE_QUESTIONS } from './year1-science-trivia.tsx';
// Import the comprehensive Year 2 questions
import { YEAR_2_MATHS_QUESTIONS } from './year2-maths-trivia.tsx';
import { YEAR_2_ENGLISH_QUESTIONS } from './year2-english-trivia.tsx';
import { YEAR_2_SCIENCE_QUESTIONS } from './year2-science-trivia.tsx';
// Import the comprehensive Year 3 questions
import { YEAR_3_MATHS_QUESTIONS } from './year3-maths-trivia.tsx';
import { YEAR_3_ENGLISH_QUESTIONS } from './year3-english-trivia.tsx';
import { YEAR_3_SCIENCE_QUESTIONS } from './year3-science-trivia.tsx';
// Import the comprehensive Year 4 questions
import { YEAR_4_MATHS_QUESTIONS } from './year4-maths-trivia.tsx';
import { YEAR_4_ENGLISH_QUESTIONS } from './year4-english-trivia.tsx';
import { YEAR_4_SCIENCE_QUESTIONS } from './year4-science-trivia.tsx';
// Import the comprehensive Year 5 questions
import { YEAR_5_MATHS_QUESTIONS } from './year5-maths-trivia.tsx';
import { YEAR_5_ENGLISH_QUESTIONS } from './year5-english-trivia.tsx';
import { YEAR_5_SCIENCE_QUESTIONS } from './year5-science-trivia.tsx';
// Import the comprehensive Year 6 questions
import { YEAR_6_MATHS_QUESTIONS } from './year6-maths-trivia.tsx';
import { YEAR_6_ENGLISH_QUESTIONS } from './year6-english-trivia.tsx';
import { YEAR_6_SCIENCE_QUESTIONS } from './year6-science-trivia.tsx';
// Import the comprehensive Year 7 questions
import { YEAR_7_MATHS_QUESTIONS } from './year7-maths-trivia.tsx';
import { YEAR_7_ENGLISH_QUESTIONS } from './year7-english-trivia.tsx';
import { YEAR_7_SCIENCE_QUESTIONS } from './year7-science-trivia.tsx';
// Import the comprehensive Year 8 questions
import { YEAR_8_MATHS_QUESTIONS } from './year8-maths-trivia.tsx';
import { YEAR_8_ENGLISH_QUESTIONS } from './year8-english-trivia.tsx';
import { YEAR_8_SCIENCE_QUESTIONS } from './year8-science-trivia.tsx';
// Import the comprehensive Year 9 questions
import { YEAR_9_MATHS_QUESTIONS } from './year9-maths-trivia.tsx';
import { YEAR_9_ENGLISH_QUESTIONS } from './year9-english-trivia.tsx';
import { YEAR_9_SCIENCE_QUESTIONS } from './year9-science-trivia.tsx';
// Import the comprehensive Year 10 questions
import { YEAR_10_MATHS_QUESTIONS } from './year10-maths-trivia.tsx';
import { YEAR_10_ENGLISH_QUESTIONS } from './year10-english-trivia.tsx';
import { YEAR_10_SCIENCE_QUESTIONS } from './year10-science-trivia.tsx';
// Import the comprehensive Year 11 questions
import { YEAR_11_MATHS_QUESTIONS } from './year11-maths-trivia.tsx';
import { YEAR_11_ENGLISH_QUESTIONS } from './year11-english-trivia.tsx';
import { YEAR_11_SCIENCE_QUESTIONS } from './year11-science-trivia.tsx';
// Import the comprehensive Year 12 questions
import { YEAR_12_MATHS_QUESTIONS } from './year12-maths-trivia.tsx';
import { YEAR_12_ENGLISH_QUESTIONS } from './year12-english-trivia.tsx';
import { YEAR_12_SCIENCE_QUESTIONS } from './year12-science-trivia.tsx';

export const COMPREHENSIVE_TRIVIA = {
  // YEAR 1 - Complete with all subjects
  year_1: {
    Mathematics: YEAR_1_MATHS_QUESTIONS,
    English: YEAR_1_ENGLISH_QUESTIONS,
    Sciences: YEAR_1_SCIENCE_QUESTIONS,
    Art: [
      { id: 'y1_art_1', question: 'What are the primary colors?', options: ['Red, Blue, Yellow', 'Red, Green, Blue', 'Orange, Purple, Green', 'Black, White, Gray'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_art_2', question: 'Which tool do we use to paint?', options: ['Pencil', 'Brush', 'Eraser', 'Ruler'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_art_3', question: 'What shape is a ball?', options: ['Square', 'Triangle', 'Circle', 'Rectangle'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_art_4', question: 'What color do you get when you mix red and blue?', options: ['Green', 'Orange', 'Purple', 'Brown'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
      { id: 'y1_art_5', question: 'What do we call a picture made with pencils or crayons?', options: ['Painting', 'Drawing', 'Sculpture', 'Photo'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 }
    ],
    Music: [
      { id: 'y1_music_1', question: 'How many strings does a guitar usually have?', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
      { id: 'y1_music_2', question: 'Which instrument do you hit to make sound?', options: ['Flute', 'Violin', 'Drum', 'Trumpet'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_music_3', question: 'What is the opposite of loud?', options: ['Soft', 'Fast', 'Slow', 'High'], correctAnswer: 0, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_music_4', question: 'Which of these makes a sound when you blow into it?', options: ['Piano', 'Drum', 'Flute', 'Guitar'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_music_5', question: 'What do we call someone who sings?', options: ['Painter', 'Singer', 'Dancer', 'Writer'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 }
    ],
    'Physical Education': [
      { id: 'y1_pe_1', question: 'What should you do before exercising?', options: ['Eat a big meal', 'Warm up', 'Go to sleep', 'Watch TV'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_pe_2', question: 'Which sport uses a round ball that you kick?', options: ['Basketball', 'Tennis', 'Football', 'Cricket'], correctAnswer: 2, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_pe_3', question: 'What do you wear on your feet when playing sports?', options: ['Slippers', 'Sports shoes', 'Sandals', 'Bare feet'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 },
      { id: 'y1_pe_4', question: 'How many players are on a football team?', options: ['9', '10', '11', '12'], correctAnswer: 2, difficulty: 'medium', xpReward: 15 },
      { id: 'y1_pe_5', question: 'What should you drink to stay hydrated during exercise?', options: ['Soda', 'Water', 'Juice', 'Milk'], correctAnswer: 1, difficulty: 'easy', xpReward: 10 }
    ]
  },

  // YEAR 2 - Complete with all subjects  
  year_2: {
    Mathematics: YEAR_2_MATHS_QUESTIONS,
    English: YEAR_2_ENGLISH_QUESTIONS,
    Sciences: YEAR_2_SCIENCE_QUESTIONS,
    Art: [
      { id: 'y2_art_1', question: 'What color do you get when you mix yellow and blue?', options: ['Orange', 'Purple', 'Green', 'Brown'], correctAnswer: 2, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_art_2', question: 'What is a sculpture?', options: ['A painting', 'A 3D artwork', 'A drawing', 'A photo'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_art_3', question: 'What tool is used to mix colors when painting?', options: ['Palette', 'Canvas', 'Frame', 'Easel'], correctAnswer: 0, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_art_4', question: 'What are warm colors?', options: ['Blue, Green, Purple', 'Red, Orange, Yellow', 'Black, White, Gray', 'All colors'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_art_5', question: 'What do we call a picture of a person?', options: ['Landscape', 'Portrait', 'Still life', 'Abstract'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 }
    ],
    Music: [
      { id: 'y2_music_1', question: 'How many black keys are in one octave on a piano?', options: ['3', '4', '5', '7'], correctAnswer: 2, difficulty: 'hard', xpReward: 25 },
      { id: 'y2_music_2', question: 'What is the name of the five lines where music notes are written?', options: ['Score', 'Staff', 'Measure', 'Clef'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_music_3', question: 'Which instrument has keys that you press?', options: ['Drum', 'Guitar', 'Piano', 'Trumpet'], correctAnswer: 2, difficulty: 'easy', xpReward: 15 },
      { id: 'y2_music_4', question: 'What does "forte" mean in music?', options: ['Soft', 'Loud', 'Fast', 'Slow'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_music_5', question: 'How many beats does a whole note get?', options: ['1', '2', '3', '4'], correctAnswer: 3, difficulty: 'medium', xpReward: 20 }
    ],
    'Physical Education': [
      { id: 'y2_pe_1', question: 'In which sport do you try to score a goal?', options: ['Cricket', 'Football', 'Tennis', 'Swimming'], correctAnswer: 1, difficulty: 'easy', xpReward: 15 },
      { id: 'y2_pe_2', question: 'What is the best way to stay fit?', options: ['Sleeping all day', 'Regular exercise', 'Eating only sweets', 'Watching TV'], correctAnswer: 1, difficulty: 'easy', xpReward: 15 },
      { id: 'y2_pe_3', question: 'Which of these is a team sport?', options: ['Swimming', 'Running', 'Basketball', 'Cycling'], correctAnswer: 2, difficulty: 'easy', xpReward: 15 },
      { id: 'y2_pe_4', question: 'What should you do after exercising?', options: ['Eat junk food', 'Cool down and stretch', 'Run more', 'Sleep immediately'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 },
      { id: 'y2_pe_5', question: 'In athletics, what is a sprint?', options: ['Long slow run', 'Short fast run', 'Walking', 'Jumping'], correctAnswer: 1, difficulty: 'medium', xpReward: 20 }
    ]
  },

  // YEAR 3 - Building comprehensive coverage
  year_3: {
    Mathematics: YEAR_3_MATHS_QUESTIONS,
    English: YEAR_3_ENGLISH_QUESTIONS,
    Sciences: YEAR_3_SCIENCE_QUESTIONS,
    History: [
      { id: 'y3_hist_1', question: 'Who was the first president of Nigeria?', options: ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello', 'Tafawa Balewa'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
      { id: 'y3_hist_2', question: 'When did Nigeria gain independence?', options: ['1950', '1960', '1970', '1980'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y3_hist_3', question: 'What were the ancient Egyptians famous for building?', options: ['Castles', 'Pyramids', 'Skyscrapers', 'Bridges'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y3_hist_4', question: 'Who was the queen of England during World War II?', options: ['Queen Victoria', 'Queen Elizabeth I', 'Queen Elizabeth II', 'Queen Mary'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
      { id: 'y3_hist_5', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 }
    ],
    Geography: [
      { id: 'y3_geo_1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y3_geo_2', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
      { id: 'y3_geo_3', question: 'Which river is the longest in Africa?', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
      { id: 'y3_geo_4', question: 'What is the largest country in Africa?', options: ['Nigeria', 'Algeria', 'Sudan', 'Libya'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y3_geo_5', question: 'Which ocean is on the western coast of Africa?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ]
  },

  // YEAR 4 - Building comprehensive coverage
  year_4: {
    Mathematics: YEAR_4_MATHS_QUESTIONS,
    English: YEAR_4_ENGLISH_QUESTIONS,
    Sciences: YEAR_4_SCIENCE_QUESTIONS,
    History: [
      { id: 'y4_hist_1', question: 'Who was the first president of Nigeria?', options: ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello', 'Tafawa Balewa'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
      { id: 'y4_hist_2', question: 'When did Nigeria gain independence?', options: ['1950', '1960', '1970', '1980'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y4_hist_3', question: 'What were the Romans famous for building?', options: ['Pyramids', 'Roads and aqueducts', 'Skyscrapers', 'Airplanes'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y4_hist_4', question: 'Who were the Vikings?', options: ['Farmers only', 'Seafaring warriors and traders', 'Desert nomads', 'Mountain climbers'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y4_hist_5', question: 'What is an artifact?', options: ['A new invention', 'An object from the past', 'A type of food', 'A modern building'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ],
    Geography: [
      { id: 'y4_geo_1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y4_geo_2', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
      { id: 'y4_geo_3', question: 'Which river is the longest in Africa?', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
      { id: 'y4_geo_4', question: 'What is the largest country in Africa?', options: ['Nigeria', 'Algeria', 'Sudan', 'Libya'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y4_geo_5', question: 'Which ocean is on the western coast of Africa?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ]
  },

  // YEAR 5 (Years 3-6) - Complete with all subjects
  year_5: {
    Mathematics: YEAR_5_MATHS_QUESTIONS,
    English: YEAR_5_ENGLISH_QUESTIONS,
    Sciences: YEAR_5_SCIENCE_QUESTIONS,
    History: [
      { id: 'y5_hist_1', question: 'Who was the first president of Nigeria?', options: ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello', 'Tafawa Balewa'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
      { id: 'y5_hist_2', question: 'When did Nigeria gain independence?', options: ['1950', '1960', '1970', '1980'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y5_hist_3', question: 'What were the ancient Egyptians famous for building?', options: ['Castles', 'Pyramids', 'Skyscrapers', 'Bridges'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y5_hist_4', question: 'Who was the queen of England during World War II?', options: ['Queen Victoria', 'Queen Elizabeth I', 'Queen Elizabeth II', 'Queen Mary'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
      { id: 'y5_hist_5', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 }
    ],
    Geography: [
      { id: 'y5_geo_1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y5_geo_2', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
      { id: 'y5_geo_3', question: 'Which river is the longest in Africa?', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
      { id: 'y5_geo_4', question: 'What is the largest country in Africa?', options: ['Nigeria', 'Algeria', 'Sudan', 'Libya'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y5_geo_5', question: 'Which ocean is on the western coast of Africa?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ]
  },

  // YEAR 6 (Years 3-6) - Complete with all subjects - SATs Preparation Level
  year_6: {
    Mathematics: YEAR_6_MATHS_QUESTIONS,
    English: YEAR_6_ENGLISH_QUESTIONS,
    Sciences: YEAR_6_SCIENCE_QUESTIONS,
    History: [
      { id: 'y6_hist_1', question: 'Who was the first president of Nigeria?', options: ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello', 'Tafawa Balewa'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
      { id: 'y6_hist_2', question: 'When did Nigeria gain independence?', options: ['1950', '1960', '1970', '1980'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y6_hist_3', question: 'What were the ancient Egyptians famous for building?', options: ['Castles', 'Pyramids', 'Skyscrapers', 'Bridges'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y6_hist_4', question: 'Who was the queen of England during World War II?', options: ['Queen Victoria', 'Queen Elizabeth I', 'Queen Elizabeth II', 'Queen Mary'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
      { id: 'y6_hist_5', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 }
    ],
    Geography: [
      { id: 'y6_geo_1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y6_geo_2', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
      { id: 'y6_geo_3', question: 'Which river is the longest in Africa?', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
      { id: 'y6_geo_4', question: 'What is the largest country in Africa?', options: ['Nigeria', 'Algeria', 'Sudan', 'Libya'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y6_geo_5', question: 'Which ocean is on the western coast of Africa?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ]
  },

  // YEAR 7 (Years 3-6) - Complete with all subjects - SATs Preparation Level
  year_7: {
    Mathematics: YEAR_7_MATHS_QUESTIONS,
    English: YEAR_7_ENGLISH_QUESTIONS,
    Sciences: YEAR_7_SCIENCE_QUESTIONS,
    History: [
      { id: 'y7_hist_1', question: 'Who was the first president of Nigeria?', options: ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello', 'Tafawa Balewa'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
      { id: 'y7_hist_2', question: 'When did Nigeria gain independence?', options: ['1950', '1960', '1970', '1980'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y7_hist_3', question: 'What were the ancient Egyptians famous for building?', options: ['Castles', 'Pyramids', 'Skyscrapers', 'Bridges'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y7_hist_4', question: 'Who was the queen of England during World War II?', options: ['Queen Victoria', 'Queen Elizabeth I', 'Queen Elizabeth II', 'Queen Mary'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
      { id: 'y7_hist_5', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 }
    ],
    Geography: [
      { id: 'y7_geo_1', question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
      { id: 'y7_geo_2', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
      { id: 'y7_geo_3', question: 'Which river is the longest in Africa?', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
      { id: 'y7_geo_4', question: 'What is the largest country in Africa?', options: ['Nigeria', 'Algeria', 'Sudan', 'Libya'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
      { id: 'y7_geo_5', question: 'Which ocean is on the western coast of Africa?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
    ]
  },

  // YEAR 8 (Years 7-9) - Complete with all subjects
  year_8: {
    Mathematics: YEAR_8_MATHS_QUESTIONS,
    English: YEAR_8_ENGLISH_QUESTIONS,
    Sciences: YEAR_8_SCIENCE_QUESTIONS,
    History: [
      { id: 'y8_hist_1', question: 'What was the Nigerian civil war also known as?', options: ['Independence War', 'Biafran War', 'Colonial War', 'Unity War'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y8_hist_2', question: 'Who discovered America in 1492?', options: ['Vasco da Gama', 'Christopher Columbus', 'Ferdinand Magellan', 'Marco Polo'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_hist_3', question: 'What year did the Titanic sink?', options: ['1910', '1911', '1912', '1913'], correctAnswer: 2, difficulty: 'medium', xpReward: 30 },
      { id: 'y8_hist_4', question: 'Who was the first man on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_hist_5', question: 'When was the Berlin Wall torn down?', options: ['1985', '1987', '1989', '1991'], correctAnswer: 2, difficulty: 'hard', xpReward: 35 }
    ],
    Geography: [
      { id: 'y8_geo_1', question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y8_geo_2', question: 'Which mountain is the tallest in the world?', options: ['K2', 'Kilimanjaro', 'Mount Everest', 'Denali'], correctAnswer: 2, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_geo_3', question: 'How many states does Nigeria have?', options: ['30', '32', '34', '36'], correctAnswer: 3, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_geo_4', question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Rome'], correctAnswer: 2, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_geo_5', question: 'Which desert is the largest hot desert in the world?', options: ['Gobi', 'Sahara', 'Arabian', 'Kalahari'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 }
    ],
    'Computer Science': [
      { id: 'y8_cs_1', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Utility'], correctAnswer: 0, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_cs_2', question: 'What does HTML stand for?', options: ['High Tech Modern Language', 'HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y8_cs_3', question: 'What is the main function of RAM?', options: ['Store data permanently', 'Process data', 'Temporary storage for running programs', 'Display graphics'], correctAnswer: 2, difficulty: 'medium', xpReward: 30 },
      { id: 'y8_cs_4', question: 'Which of these is a programming language?', options: ['Windows', 'Python', 'Microsoft', 'Google'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y8_cs_5', question: 'What does WWW stand for?', options: ['World Wide Web', 'World Wide Weather', 'World Web Wide', 'Wide World Web'], correctAnswer: 0, difficulty: 'easy', xpReward: 25 }
    ]
  },

  // YEAR 9 (Years 7-9) - Complete with all subjects
  year_9: {
    Mathematics: YEAR_9_MATHS_QUESTIONS,
    English: YEAR_9_ENGLISH_QUESTIONS,
    Sciences: YEAR_9_SCIENCE_QUESTIONS,
    History: [
      { id: 'y9_hist_1', question: 'What was the Nigerian civil war also known as?', options: ['Independence War', 'Biafran War', 'Colonial War', 'Unity War'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y9_hist_2', question: 'Who discovered America in 1492?', options: ['Vasco da Gama', 'Christopher Columbus', 'Ferdinand Magellan', 'Marco Polo'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_hist_3', question: 'What year did the Titanic sink?', options: ['1910', '1911', '1912', '1913'], correctAnswer: 2, difficulty: 'medium', xpReward: 30 },
      { id: 'y9_hist_4', question: 'Who was the first man on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_hist_5', question: 'When was the Berlin Wall torn down?', options: ['1985', '1987', '1989', '1991'], correctAnswer: 2, difficulty: 'hard', xpReward: 35 }
    ],
    Geography: [
      { id: 'y9_geo_1', question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y9_geo_2', question: 'Which mountain is the tallest in the world?', options: ['K2', 'Kilimanjaro', 'Mount Everest', 'Denali'], correctAnswer: 2, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_geo_3', question: 'How many states does Nigeria have?', options: ['30', '32', '34', '36'], correctAnswer: 3, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_geo_4', question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Rome'], correctAnswer: 2, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_geo_5', question: 'Which desert is the largest hot desert in the world?', options: ['Gobi', 'Sahara', 'Arabian', 'Kalahari'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 }
    ],
    'Computer Science': [
      { id: 'y9_cs_1', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Utility'], correctAnswer: 0, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_cs_2', question: 'What does HTML stand for?', options: ['High Tech Modern Language', 'HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language'], correctAnswer: 1, difficulty: 'medium', xpReward: 30 },
      { id: 'y9_cs_3', question: 'What is the main function of RAM?', options: ['Store data permanently', 'Process data', 'Temporary storage for running programs', 'Display graphics'], correctAnswer: 2, difficulty: 'medium', xpReward: 30 },
      { id: 'y9_cs_4', question: 'Which of these is a programming language?', options: ['Windows', 'Python', 'Microsoft', 'Google'], correctAnswer: 1, difficulty: 'easy', xpReward: 25 },
      { id: 'y9_cs_5', question: 'What does WWW stand for?', options: ['World Wide Web', 'World Wide Weather', 'World Web Wide', 'Wide World Web'], correctAnswer: 0, difficulty: 'easy', xpReward: 25 }
    ]
  },

  // YEAR 10 (GCSE) - Complete with all subjects
  year_10: {
    Mathematics: YEAR_10_MATHS_QUESTIONS,
    English: YEAR_10_ENGLISH_QUESTIONS,
    Sciences: YEAR_10_SCIENCE_QUESTIONS,
    History: [
      { id: 'y10_hist_1', question: 'When did World War I begin?', options: ['1912', '1914', '1916', '1918'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y10_hist_2', question: 'Who was the British Prime Minister during most of World War II?', options: ['Neville Chamberlain', 'Winston Churchill', 'Clement Attlee', 'Anthony Eden'], correctAnswer: 1, difficulty: 'easy', xpReward: 30 },
      { id: 'y10_hist_3', question: 'What was the Cold War?', options: ['A war fought in winter', 'Tension between USA and USSR', 'A civil war', 'A trade war'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y10_hist_4', question: 'When did the Great Depression begin?', options: ['1925', '1927', '1929', '1931'], correctAnswer: 2, difficulty: 'hard', xpReward: 40 },
      { id: 'y10_hist_5', question: 'Who was Nelson Mandela?', options: ['Nigerian president', 'South African anti-apartheid leader', 'Kenyan activist', 'Ghanaian leader'], correctAnswer: 1, difficulty: 'easy', xpReward: 30 }
    ],
    Geography: [
      { id: 'y10_geo_1', question: 'What causes earthquakes?', options: ['Tectonic plate movement', 'Volcanic eruptions', 'Heavy rainfall', 'Strong winds'], correctAnswer: 0, difficulty: 'medium', xpReward: 35 },
      { id: 'y10_geo_2', question: 'What is GDP?', options: ['Gross Domestic Product', 'General Development Plan', 'Global Distribution Program', 'Gross Development Percentage'], correctAnswer: 0, difficulty: 'medium', xpReward: 35 },
      { id: 'y10_geo_3', question: 'Which of these is a renewable energy source?', options: ['Coal', 'Oil', 'Solar', 'Natural gas'], correctAnswer: 2, difficulty: 'easy', xpReward: 30 },
      { id: 'y10_geo_4', question: 'What is urbanization?', options: ['Building cities', 'Movement from rural to urban areas', 'Improving roads', 'Planting trees'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y10_geo_5', question: 'What is the greenhouse effect?', options: ['Growing plants in greenhouses', 'Trapping of heat in Earth\'s atmosphere', 'Effect of green paint', 'Planting trees'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 }
    ]
  },

  // YEAR 11 (GCSE) - Complete with all subjects
  year_11: {
    Mathematics: YEAR_11_MATHS_QUESTIONS,
    English: YEAR_11_ENGLISH_QUESTIONS,
    Sciences: YEAR_11_SCIENCE_QUESTIONS,
    History: [
      { id: 'y11_hist_1', question: 'When did World War I begin?', options: ['1912', '1914', '1916', '1918'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y11_hist_2', question: 'Who was the British Prime Minister during most of World War II?', options: ['Neville Chamberlain', 'Winston Churchill', 'Clement Attlee', 'Anthony Eden'], correctAnswer: 1, difficulty: 'easy', xpReward: 30 },
      { id: 'y11_hist_3', question: 'What was the Cold War?', options: ['A war fought in winter', 'Tension between USA and USSR', 'A civil war', 'A trade war'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y11_hist_4', question: 'When did the Great Depression begin?', options: ['1925', '1927', '1929', '1931'], correctAnswer: 2, difficulty: 'hard', xpReward: 40 },
      { id: 'y11_hist_5', question: 'Who was Nelson Mandela?', options: ['Nigerian president', 'South African anti-apartheid leader', 'Kenyan activist', 'Ghanaian leader'], correctAnswer: 1, difficulty: 'easy', xpReward: 30 }
    ],
    Geography: [
      { id: 'y11_geo_1', question: 'What causes earthquakes?', options: ['Tectonic plate movement', 'Volcanic eruptions', 'Heavy rainfall', 'Strong winds'], correctAnswer: 0, difficulty: 'medium', xpReward: 35 },
      { id: 'y11_geo_2', question: 'What is GDP?', options: ['Gross Domestic Product', 'General Development Plan', 'Global Distribution Program', 'Gross Development Percentage'], correctAnswer: 0, difficulty: 'medium', xpReward: 35 },
      { id: 'y11_geo_3', question: 'Which of these is a renewable energy source?', options: ['Coal', 'Oil', 'Solar', 'Natural gas'], correctAnswer: 2, difficulty: 'easy', xpReward: 30 },
      { id: 'y11_geo_4', question: 'What is urbanization?', options: ['Building cities', 'Movement from rural to urban areas', 'Improving roads', 'Planting trees'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 },
      { id: 'y11_geo_5', question: 'What is the greenhouse effect?', options: ['Growing plants in greenhouses', 'Trapping of heat in Earth\'s atmosphere', 'Effect of green paint', 'Planting trees'], correctAnswer: 1, difficulty: 'medium', xpReward: 35 }
    ]
  },

  // YEAR 12 (A-Level) - Complete with all subjects
  year_12: {
    Mathematics: YEAR_12_MATHS_QUESTIONS,
    English: YEAR_12_ENGLISH_QUESTIONS,
    Sciences: YEAR_12_SCIENCE_QUESTIONS,
    Economics: [
      { id: 'y12_econ_1', question: 'What is the law of demand?', options: ['Price increases, demand increases', 'Price increases, demand decreases', 'Price stays same, demand changes', 'Demand creates supply'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_econ_2', question: 'What does inflation mean?', options: ['Prices falling', 'Prices rising', 'Stable prices', 'No prices'], correctAnswer: 1, difficulty: 'easy', xpReward: 40 },
      { id: 'y12_econ_3', question: 'What is opportunity cost?', options: ['The money cost', 'The next best alternative foregone', 'The total cost', 'The average cost'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_econ_4', question: 'What is a monopoly?', options: ['Many sellers', 'Two sellers', 'One seller', 'No sellers'], correctAnswer: 2, difficulty: 'easy', xpReward: 40 },
      { id: 'y12_econ_5', question: 'What does GDP measure?', options: ['Government debt', 'Total economic output', 'Inflation rate', 'Unemployment'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 }
    ],
    Psychology: [
      { id: 'y12_psych_1', question: 'Who is known as the father of psychoanalysis?', options: ['Carl Jung', 'Sigmund Freud', 'B.F. Skinner', 'Ivan Pavlov'], correctAnswer: 1, difficulty: 'easy', xpReward: 40 },
      { id: 'y12_psych_2', question: 'What is classical conditioning?', options: ['Learning through rewards', 'Learning through association', 'Learning through observation', 'Learning through reading'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_psych_3', question: 'What part of the brain controls memory?', options: ['Cerebellum', 'Hippocampus', 'Medulla', 'Pons'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_psych_4', question: 'What is cognitive dissonance?', options: ['Memory loss', 'Conflicting beliefs causing discomfort', 'Learning difficulty', 'Sleep disorder'], correctAnswer: 1, difficulty: 'hard', xpReward: 50 },
      { id: 'y12_psych_5', question: 'What does IQ stand for?', options: ['Internal Quotient', 'Intelligence Quotient', 'Individual Quality', 'Intellectual Question'], correctAnswer: 1, difficulty: 'easy', xpReward: 40 }
    ],
    'Computer Science': [
      { id: 'y12_cs_1', question: 'What is an algorithm?', options: ['A programming language', 'A step-by-step procedure', 'A computer virus', 'A website'], correctAnswer: 1, difficulty: 'easy', xpReward: 40 },
      { id: 'y12_cs_2', question: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Question Language', 'System Quality Language', 'Standard Queue List'], correctAnswer: 0, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_cs_3', question: 'What is binary?', options: ['Base 10 number system', 'Base 2 number system', 'Base 8 number system', 'Base 16 number system'], correctAnswer: 1, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_cs_4', question: 'What is object-oriented programming?', options: ['Programming with objects and classes', 'Programming with only functions', 'Programming without variables', 'Programming in binary'], correctAnswer: 0, difficulty: 'medium', xpReward: 45 },
      { id: 'y12_cs_5', question: 'What is a database?', options: ['A programming language', 'Organized collection of data', 'A web browser', 'An operating system'], correctAnswer: 1, difficulty: 'easy', xpReward: 40 }
    ]
  }
};