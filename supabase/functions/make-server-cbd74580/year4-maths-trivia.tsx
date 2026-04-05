// Year 4 Mathematics Trivia Questions
// Based on UK Year 4 Maths Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_4_MATHS_QUESTIONS = [
  // NUMBER AND PLACE VALUE (30 questions)
  // Counting in multiples
  { id: 'y4_math_1', question: 'Count in 6s: 6, 12, 18, 24, ___', options: ['28', '30', '32', '36'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_2', question: 'Count in 6s: 30, 36, 42, ___', options: ['44', '46', '48', '50'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_3', question: 'Count in 7s: 7, 14, 21, ___', options: ['26', '27', '28', '29'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_4', question: 'Count in 7s: 35, 42, 49, ___', options: ['54', '55', '56', '57'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_5', question: 'Count in 9s: 9, 18, 27, ___', options: ['34', '35', '36', '37'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_6', question: 'Count in 9s: 45, 54, 63, ___', options: ['70', '71', '72', '73'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_7', question: 'Count in 25s: 25, 50, 75, ___', options: ['90', '95', '100', '105'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_8', question: 'Count in 25s: 200, 225, 250, ___', options: ['260', '270', '275', '280'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_9', question: 'Count in 1000s: 2000, 3000, 4000, ___', options: ['4500', '4900', '5000', '6000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_10', question: 'What is 1000 more than 3456?', options: ['3466', '4456', '4356', '3556'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_11', question: 'What is 1000 less than 7823?', options: ['6823', '7723', '7923', '8823'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_12', question: 'Count backwards through zero: 2, 1, 0, ___', options: ['-2', '-1', '1', '0'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_13', question: 'What comes before 0? -5, -4, -3, -2, -1, 0, ___', options: ['-1', '0', '1', '2'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_14', question: 'Which is colder: -3°C or 2°C?', options: ['-3°C', '2°C', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Place value
  { id: 'y4_math_15', question: 'In the number 5432, what is the value of 5?', options: ['5', '50', '500', '5000'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_16', question: 'In the number 7289, what is the value of 2?', options: ['2', '20', '200', '2000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_17', question: 'What is 6 thousands, 4 hundreds, 3 tens, 2 ones?', options: ['6432', '4632', '3246', '2346'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_18', question: 'What is 3000 + 500 + 60 + 7?', options: ['3567', '3576', '3657', '3675'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_19', question: 'How many hundreds are in 4500?', options: ['4', '5', '45', '450'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Ordering and comparing
  { id: 'y4_math_20', question: 'Put in order from smallest to largest: 4567, 4576, 4657', options: ['4567, 4576, 4657', '4657, 4576, 4567', '4576, 4567, 4657', '4567, 4657, 4576'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_21', question: 'Which is greater: 8234 or 8243?', options: ['8234', '8243', 'Same', 'Cannot tell'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_22', question: 'Round 456 to the nearest 10:', options: ['450', '455', '460', '500'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_23', question: 'Round 782 to the nearest 100:', options: ['700', '750', '780', '800'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_24', question: 'Round 3456 to the nearest 1000:', options: ['3000', '3400', '3500', '4000'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_25', question: 'Round 6789 to the nearest 1000:', options: ['6000', '6700', '6800', '7000'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },

  // Roman numerals
  { id: 'y4_math_26', question: 'What is the Roman numeral for 10?', options: ['V', 'X', 'L', 'C'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_27', question: 'What is the Roman numeral for 50?', options: ['V', 'X', 'L', 'C'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_28', question: 'What is the Roman numeral for 100?', options: ['L', 'C', 'D', 'M'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_29', question: 'What number is XV?', options: ['5', '10', '15', '20'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_30', question: 'What number is XXX?', options: ['10', '20', '30', '40'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // ADDITION AND SUBTRACTION (25 questions)
  { id: 'y4_math_31', question: 'What is 2345 + 1234?', options: ['3569', '3579', '3589', '3679'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_32', question: 'What is 5678 + 2134?', options: ['7802', '7812', '7822', '7912'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_33', question: 'What is 4567 - 1234?', options: ['3323', '3333', '3343', '3433'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_34', question: 'What is 7856 - 2345?', options: ['5501', '5511', '5521', '5611'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_35', question: 'Using column method: 3456 + 2897 = ___', options: ['6343', '6353', '6363', '6453'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_36', question: 'Using column method: 8234 - 3567 = ___', options: ['4657', '4667', '4677', '4767'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_37', question: 'Estimate 3987 + 2134 to nearest 1000:', options: ['5000', '6000', '7000', '8000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_38', question: 'Estimate 7823 - 3156 to nearest 1000:', options: ['4000', '5000', '6000', '7000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_39', question: 'Check: If 345 + 267 = 612, then 612 - 267 = ___', options: ['267', '345', '612', '879'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_40', question: 'What is 4000 + 3000?', options: ['6000', '7000', '8000', '9000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_41', question: 'What is 9000 - 4000?', options: ['4000', '5000', '6000', '7000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_42', question: 'A shop had 4567 items. 2345 were sold. How many left?', options: ['2212', '2222', '2232', '2322'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_43', question: 'Tom scored 2345 points, then 1987 more. Total points?', options: ['4322', '4332', '4342', '4432'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_44', question: 'Two-step: (345 + 267) - 100 = ___', options: ['412', '512', '522', '612'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_45', question: 'Two-step: (789 - 234) + 156 = ___', options: ['701', '711', '721', '811'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_46', question: 'What is 5432 + 3698?', options: ['9120', '9130', '9140', '9230'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_47', question: 'What is 6754 - 2987?', options: ['3757', '3767', '3777', '3867'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_48', question: 'Add: 1234 + 2345 + 3456 = ___', options: ['7025', '7035', '7045', '7135'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_math_49', question: 'What is 8765 - 4321?', options: ['4434', '4444', '4454', '4544'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_50', question: 'Sara had ₦5678. She spent ₦2345. How much left?', options: ['3323', '3333', '3343', '3433'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_51', question: 'What is 7000 - 2345?', options: ['4645', '4655', '4665', '4755'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_52', question: 'What is 3456 + 4567?', options: ['8013', '8023', '8033', '8123'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_53', question: 'What is 9999 - 4444?', options: ['5545', '5555', '5565', '5655'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_54', question: 'Multi-step: A school has 1234 boys and 1456 girls. Total students?', options: ['2680', '2690', '2700', '2790'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_55', question: 'Inverse: If 2345 + 3456 = 5801, then 5801 - 3456 = ___', options: ['2345', '3456', '5801', '8257'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // MULTIPLICATION AND DIVISION (35 questions)
  // Times tables up to 12x12
  { id: 'y4_math_56', question: 'What is 6 × 7?', options: ['40', '42', '44', '48'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_57', question: 'What is 6 × 8?', options: ['44', '46', '48', '50'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_58', question: 'What is 6 × 9?', options: ['52', '54', '56', '58'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_59', question: 'What is 7 × 7?', options: ['45', '47', '49', '51'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_60', question: 'What is 7 × 8?', options: ['54', '56', '58', '60'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_61', question: 'What is 7 × 9?', options: ['61', '63', '65', '67'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_62', question: 'What is 8 × 8?', options: ['60', '62', '64', '66'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_63', question: 'What is 8 × 9?', options: ['70', '72', '74', '76'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_64', question: 'What is 9 × 9?', options: ['79', '81', '83', '85'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_65', question: 'What is 9 × 12?', options: ['106', '108', '110', '112'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_66', question: 'What is 11 × 11?', options: ['119', '121', '123', '125'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_67', question: 'What is 11 × 12?', options: ['130', '132', '134', '136'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_68', question: 'What is 12 × 12?', options: ['142', '144', '146', '148'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_69', question: 'What is 72 ÷ 6?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_70', question: 'What is 56 ÷ 7?', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_71', question: 'What is 81 ÷ 9?', options: ['7', '8', '9', '10'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_72', question: 'What is 96 ÷ 8?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_73', question: 'What is 132 ÷ 11?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_74', question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Multiply 2-digit and 3-digit by 1-digit
  { id: 'y4_math_75', question: 'What is 34 × 3?', options: ['92', '102', '112', '122'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_76', question: 'What is 56 × 4?', options: ['214', '224', '234', '244'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_77', question: 'What is 78 × 5?', options: ['380', '390', '400', '410'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_78', question: 'What is 123 × 3?', options: ['359', '369', '379', '389'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_79', question: 'What is 234 × 4?', options: ['926', '936', '946', '956'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_math_80', question: 'What is 456 × 2?', options: ['902', '912', '922', '932'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Mental multiplication and division
  { id: 'y4_math_81', question: 'What is 30 × 4?', options: ['100', '110', '120', '130'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_82', question: 'What is 50 × 6?', options: ['280', '290', '300', '310'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_83', question: 'What is 200 × 3?', options: ['500', '550', '600', '650'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_84', question: 'What is 80 ÷ 4?', options: ['18', '19', '20', '21'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_85', question: 'What is 120 ÷ 6?', options: ['18', '19', '20', '21'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // Problem solving
  { id: 'y4_math_86', question: 'If one book costs ₦45, how much for 6 books?', options: ['260', '270', '280', '290'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_87', question: 'Share 84 sweets equally among 7 children. How many each?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_88', question: 'Distributive law: 6 × 24 = (6 × 20) + (6 × 4) = ___', options: ['134', '144', '154', '164'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_math_89', question: 'What is 7 × __ = 84?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_90', question: 'What is __ × 8 = 96?', options: ['10', '11', '12', '13'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // FRACTIONS AND DECIMALS (40 questions)
  // Equivalent fractions
  { id: 'y4_math_91', question: 'Which fraction is equivalent to 1/2?', options: ['1/4', '2/4', '1/3', '3/4'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_92', question: 'Which fraction is equivalent to 1/3?', options: ['2/6', '2/4', '3/6', '3/4'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_93', question: 'Which fraction is equivalent to 2/3?', options: ['3/6', '4/6', '2/6', '5/6'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_94', question: 'Is 3/6 the same as 1/2?', options: ['Yes', 'No', 'Sometimes', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_95', question: 'Is 4/8 the same as 1/2?', options: ['Yes', 'No', 'Sometimes', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_96', question: 'Which is equivalent to 3/4?', options: ['6/8', '4/8', '2/8', '5/8'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Adding and subtracting fractions
  { id: 'y4_math_97', question: 'What is 1/5 + 2/5?', options: ['2/5', '3/5', '3/10', '1/5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_98', question: 'What is 3/7 + 2/7?', options: ['4/7', '5/7', '5/14', '6/7'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_99', question: 'What is 5/8 - 2/8?', options: ['2/8', '3/8', '4/8', '7/8'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_100', question: 'What is 7/10 - 3/10?', options: ['3/10', '4/10', '5/10', '10/10'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_101', question: 'What is 2/6 + 3/6?', options: ['4/6', '5/6', '6/6', '5/12'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_102', question: 'What is 9/12 - 4/12?', options: ['4/12', '5/12', '6/12', '13/12'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Decimal equivalents
  { id: 'y4_math_103', question: 'What is 3/10 as a decimal?', options: ['0.03', '0.3', '3.0', '0.33'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_104', question: 'What is 7/10 as a decimal?', options: ['0.07', '0.7', '7.0', '0.77'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_105', question: 'What is 25/100 as a decimal?', options: ['0.025', '0.25', '2.5', '25.0'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_106', question: 'What is 50/100 as a decimal?', options: ['0.05', '0.5', '5.0', '50.0'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_107', question: 'What is 1/4 as a decimal?', options: ['0.14', '0.25', '0.4', '0.5'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_108', question: 'What is 1/2 as a decimal?', options: ['0.12', '0.2', '0.5', '0.25'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_109', question: 'What is 3/4 as a decimal?', options: ['0.34', '0.5', '0.75', '0.25'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Dividing by 10 and 100
  { id: 'y4_math_110', question: 'What is 50 ÷ 10?', options: ['0.5', '5', '50', '500'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_111', question: 'What is 80 ÷ 10?', options: ['0.8', '8', '80', '800'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_112', question: 'What is 35 ÷ 10?', options: ['0.35', '3.5', '35', '350'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_113', question: 'What is 400 ÷ 100?', options: ['0.4', '4', '40', '400'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_114', question: 'What is 650 ÷ 100?', options: ['0.65', '6.5', '65', '650'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_115', question: 'What is 28 ÷ 10?', options: ['0.28', '2.8', '28', '280'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Rounding decimals
  { id: 'y4_math_116', question: 'Round 3.4 to the nearest whole number:', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_117', question: 'Round 5.7 to the nearest whole number:', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_118', question: 'Round 8.2 to the nearest whole number:', options: ['7', '8', '9', '10'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_119', question: 'Round 6.9 to the nearest whole number:', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_120', question: 'Round 4.5 to the nearest whole number:', options: ['3', '4', '5', '6'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Comparing decimals
  { id: 'y4_math_121', question: 'Which is larger: 3.4 or 3.7?', options: ['3.4', '3.7', 'Same', 'Cannot tell'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_122', question: 'Which is smaller: 5.2 or 5.8?', options: ['5.2', '5.8', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_123', question: 'Put in order: 2.3, 2.1, 2.5', options: ['2.1, 2.3, 2.5', '2.5, 2.3, 2.1', '2.3, 2.1, 2.5', '2.1, 2.5, 2.3'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_124', question: 'Is 4.6 > 4.3?', options: ['Yes', 'No', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_125', question: 'Is 7.2 < 7.5?', options: ['Yes', 'No', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // More fraction questions
  { id: 'y4_math_126', question: 'What is 1/4 + 2/4?', options: ['2/4', '3/4', '3/8', '4/4'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_127', question: 'What is 5/9 - 2/9?', options: ['2/9', '3/9', '4/9', '7/9'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_128', question: 'Simplify 6/8:', options: ['2/4', '3/4', '4/6', '1/2'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_129', question: 'Simplify 4/6:', options: ['1/2', '2/3', '3/4', '1/3'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_130', question: 'What decimal is 9/10?', options: ['0.09', '0.9', '9.0', '0.99'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // MEASUREMENT (25 questions)
  // Converting units
  { id: 'y4_math_131', question: 'How many metres in 1 kilometre?', options: ['10', '100', '1000', '10000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_132', question: 'How many centimetres in 1 metre?', options: ['10', '100', '1000', '10000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_133', question: 'How many millimetres in 1 centimetre?', options: ['1', '10', '100', '1000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_134', question: 'How many grams in 1 kilogram?', options: ['10', '100', '500', '1000'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_135', question: 'How many millilitres in 1 litre?', options: ['10', '100', '500', '1000'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_136', question: 'How many minutes in 1 hour?', options: ['30', '45', '60', '90'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_137', question: 'Convert 3 km to metres:', options: ['30 m', '300 m', '3000 m', '30000 m'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_138', question: 'Convert 2.5 m to centimetres:', options: ['25 cm', '250 cm', '2500 cm', '25000 cm'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_139', question: 'Convert 4 kg to grams:', options: ['40 g', '400 g', '4000 g', '40000 g'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // Perimeter
  { id: 'y4_math_140', question: 'Perimeter of a rectangle 6cm × 4cm:', options: ['10 cm', '18 cm', '20 cm', '24 cm'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_141', question: 'Perimeter of a square with sides 7cm:', options: ['14 cm', '21 cm', '28 cm', '35 cm'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_142', question: 'A rectangle is 8m long and 5m wide. Perimeter?', options: ['13 m', '20 m', '26 m', '40 m'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_143', question: 'Perimeter of a shape with sides 3cm, 4cm, 5cm, 6cm:', options: ['16 cm', '17 cm', '18 cm', '19 cm'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Area
  { id: 'y4_math_144', question: 'Area of a rectangle 5cm × 3cm (by counting squares):', options: ['8 cm²', '12 cm²', '15 cm²', '16 cm²'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_145', question: 'Area of a rectangle 6cm × 4cm:', options: ['10 cm²', '20 cm²', '24 cm²', '30 cm²'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_146', question: 'Area of a square with sides 5cm:', options: ['10 cm²', '20 cm²', '25 cm²', '30 cm²'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // Money
  { id: 'y4_math_147', question: 'What is £3.45 + £2.67?', options: ['£6.02', '£6.12', '£6.22', '£7.12'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_148', question: 'What is £10.00 - £4.55?', options: ['£5.35', '£5.45', '£5.55', '£6.45'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_149', question: 'How much is 4 items at £1.25 each?', options: ['£4.00', '£4.50', '£5.00', '£5.50'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Time
  { id: 'y4_math_150', question: 'What is 14:30 in 12-hour format?', options: ['2:30 AM', '2:30 PM', '4:30 PM', '6:30 PM'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_151', question: 'What is 3:45 PM in 24-hour format?', options: ['03:45', '13:45', '15:45', '17:45'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_152', question: 'What is 20:15 in 12-hour format?', options: ['8:15 AM', '8:15 PM', '10:15 PM', '6:15 PM'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_153', question: 'How many hours from 9:00 AM to 2:00 PM?', options: ['3 hours', '4 hours', '5 hours', '6 hours'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_154', question: 'If it is 11:45 now, what time is it in 30 minutes?', options: ['12:00', '12:15', '12:30', '12:45'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_155', question: 'How many seconds in 2 minutes?', options: ['60', '100', '120', '150'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // GEOMETRY (25 questions)
  // Classifying shapes
  { id: 'y4_math_156', question: 'A quadrilateral has ___ sides:', options: ['3', '4', '5', '6'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_157', question: 'Which is a quadrilateral?', options: ['Triangle', 'Rectangle', 'Pentagon', 'Circle'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_158', question: 'A square is a special type of:', options: ['Triangle', 'Rectangle', 'Pentagon', 'Circle'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_159', question: 'A rhombus has:', options: ['All sides different', '2 equal sides', '4 equal sides', 'No equal sides'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_160', question: 'An equilateral triangle has:', options: ['No equal sides', '2 equal sides', '3 equal sides', '4 equal sides'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_161', question: 'An isosceles triangle has:', options: ['No equal sides', '2 equal sides', '3 equal sides', '4 equal sides'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_162', question: 'A scalene triangle has:', options: ['No equal sides', '2 equal sides', '3 equal sides', 'All equal sides'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Angles
  { id: 'y4_math_163', question: 'A right angle is:', options: ['45 degrees', '90 degrees', '180 degrees', '360 degrees'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_164', question: 'An acute angle is:', options: ['Exactly 90°', 'Less than 90°', 'More than 90°', '180°'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_165', question: 'An obtuse angle is:', options: ['Less than 90°', 'Exactly 90°', 'Between 90° and 180°', '180°'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_166', question: 'Which angle is largest: 45°, 90°, or 120°?', options: ['45°', '90°', '120°', 'All same'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_167', question: 'A straight line makes an angle of:', options: ['90°', '120°', '180°', '360°'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Lines of symmetry
  { id: 'y4_math_168', question: 'How many lines of symmetry does a square have?', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_169', question: 'How many lines of symmetry does a rectangle have?', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_170', question: 'How many lines of symmetry does an equilateral triangle have?', options: ['1', '2', '3', '4'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_171', question: 'A circle has:', options: ['No lines of symmetry', '1 line of symmetry', '4 lines of symmetry', 'Infinite lines of symmetry'], correctAnswer: 3, difficulty: 'hard', xpReward: 30 },

  // Coordinates
  { id: 'y4_math_172', question: 'In coordinates (3, 5), the 3 represents:', options: ['Up', 'Down', 'Across (x)', 'Neither'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_173', question: 'In coordinates (4, 2), the 2 represents:', options: ['Across', 'Up (y)', 'Down', 'Neither'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_174', question: 'What are the coordinates of a point 5 across and 3 up?', options: ['(3, 5)', '(5, 3)', '(5, 5)', '(3, 3)'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_175', question: 'Moving from (2, 3) to (5, 3) is a translation:', options: ['Up', 'Down', 'Right', 'Left'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_176', question: 'Moving from (4, 6) to (4, 2) is a translation:', options: ['Up', 'Down', 'Right', 'Left'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_177', question: 'A parallelogram has:', options: ['No parallel sides', '1 pair of parallel sides', '2 pairs of parallel sides', '3 pairs of parallel sides'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_178', question: 'A trapezium has:', options: ['No parallel sides', '1 pair of parallel sides', '2 pairs of parallel sides', 'All sides parallel'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_179', question: 'How many vertices does a pentagon have?', options: ['4', '5', '6', '7'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_180', question: 'How many sides does a hexagon have?', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // STATISTICS (15 questions)
  { id: 'y4_math_181', question: 'In a bar chart, the tallest bar shows:', options: ['The least', 'The most', 'The middle', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_182', question: 'Discrete data is:', options: ['Continuous', 'Counted in whole numbers', 'Measured', 'Random'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_183', question: 'Continuous data is:', options: ['Counted', 'Measured and can have decimals', 'Only whole numbers', 'Random'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_184', question: 'If a bar reaches 12 and another reaches 8, the difference is:', options: ['2', '4', '6', '20'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_185', question: 'If bars show 10, 15, and 20, the total is:', options: ['35', '40', '45', '50'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_186', question: 'A time graph shows:', options: ['Colors', 'Changes over time', 'Shapes', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_187', question: 'If 🍎 = 5 apples, how many apples is 🍎🍎🍎🍎?', options: ['4', '15', '20', '25'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_188', question: 'In a pictogram, if 🚗 = 10 cars, how many cars is 🚗🚗🚗?', options: ['3', '13', '20', '30'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_189', question: 'Data in a table is organized in:', options: ['Random order', 'Rows and columns', 'Circles', 'No order'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_190', question: 'To find the total from a bar chart, you:', options: ['Count bars', 'Add all values', 'Subtract values', 'Multiply values'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_191', question: 'Which is better for showing continuous change?', options: ['Bar chart', 'Time graph/line graph', 'Pictogram', 'Table'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_192', question: 'If Monday has 5 and Tuesday has 8, Tuesday has ___ more:', options: ['2', '3', '4', '13'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_193', question: 'The sum of 12, 15, and 18 is:', options: ['40', '42', '45', '48'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_194', question: 'The difference between 25 and 17 is:', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_195', question: 'Interpreting data means:', options: ['Making it up', 'Understanding what it shows', 'Hiding it', 'Breaking it'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // ASSESSMENT AND REASONING (5 questions)
  { id: 'y4_math_196', question: 'In a times table check, you should know up to:', options: ['10 × 10', '11 × 11', '12 × 12', '15 × 15'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_math_197', question: 'Problem: A shop has 234 books. 87 were sold. 56 arrived. Total now?', options: ['193', '203', '213', '223'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_math_198', question: 'Problem: 8 boxes with 12 items each. Total items?', options: ['84', '88', '92', '96'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_199', question: 'Problem: Perimeter of garden 12m × 8m. Fencing needed?', options: ['20 m', '32 m', '40 m', '96 m'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_math_200', question: 'Reasoning: If 6 × 7 = 42, then 42 ÷ 6 = ___', options: ['6', '7', '36', '48'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
];
