// Year 5 Mathematics Trivia Questions
// Based on UK Year 5 Maths Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_5_MATHS_QUESTIONS = [
  // NUMBER & PLACE VALUE (35 questions)
  // Reading, writing, ordering and comparing numbers to 1,000,000
  { id: 'y5_math_1', question: 'What is the value of 7 in 752,341?', options: ['7', '70', '700', '700,000'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_2', question: 'What is the value of 4 in 234,567?', options: ['4', '40', '400', '4,000'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_3', question: 'Write 500,000 + 60,000 + 7,000 + 400 + 30 + 2 in standard form:', options: ['567,432', '576,342', '567,342', '576,432'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_4', question: 'Which is the largest number?', options: ['456,789', '465,789', '456,987', '465,978'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_5', question: 'Order from smallest to largest: 823,456 | 832,456 | 823,546', options: ['823,456 | 823,546 | 832,456', '832,456 | 823,546 | 823,456', '823,546 | 823,456 | 832,456', '823,456 | 832,456 | 823,546'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_6', question: 'How do you write "six hundred and twenty-three thousand, four hundred and fifty-one"?', options: ['623,451', '632,451', '623,541', '632,541'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_7', question: 'What number comes next: 100,000 | 200,000 | 300,000 | ___?', options: ['350,000', '400,000', '450,000', '500,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Counting in steps of powers of 10
  { id: 'y5_math_8', question: 'Count forwards in 10,000s: 50,000 | 60,000 | 70,000 | ___', options: ['75,000', '80,000', '85,000', '90,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_9', question: 'Count backwards in 100,000s: 800,000 | 700,000 | 600,000 | ___', options: ['550,000', '500,000', '450,000', '400,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_10', question: 'What is 10,000 more than 456,789?', options: ['457,789', '466,789', '556,789', '465,789'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_11', question: 'What is 100,000 less than 923,456?', options: ['823,456', '922,456', '913,456', '923,356'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Negative numbers
  { id: 'y5_math_12', question: 'What is colder: -8°C or -3°C?', options: ['-3°C', '-8°C', 'Same', 'Cannot tell'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_13', question: 'Count backwards: 3, 2, 1, 0, ___, -2', options: ['-3', '-1', '1', '0'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_14', question: 'Order from smallest to largest: -5, 2, -1, 4', options: ['-5, -1, 2, 4', '-1, -5, 2, 4', '2, 4, -1, -5', '4, 2, -1, -5'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_15', question: 'What number is 5 less than -2?', options: ['-7', '-3', '3', '7'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_16', question: 'If the temperature is -4°C and rises by 6°C, what is the new temperature?', options: ['-10°C', '-2°C', '2°C', '10°C'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Rounding
  { id: 'y5_math_17', question: 'Round 456,789 to the nearest 10:', options: ['456,780', '456,790', '456,800', '457,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_18', question: 'Round 723,456 to the nearest 100:', options: ['723,400', '723,450', '723,460', '723,500'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_19', question: 'Round 567,823 to the nearest 1,000:', options: ['567,000', '568,000', '570,000', '600,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_20', question: 'Round 834,567 to the nearest 10,000:', options: ['830,000', '834,000', '835,000', '840,000'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_21', question: 'Round 678,234 to the nearest 100,000:', options: ['600,000', '650,000', '700,000', '680,000'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_22', question: 'Round 449,999 to the nearest 100,000:', options: ['400,000', '450,000', '500,000', '440,000'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Roman numerals
  { id: 'y5_math_23', question: 'What is the Roman numeral for 100?', options: ['L', 'C', 'D', 'M'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_24', question: 'What is the Roman numeral for 500?', options: ['L', 'C', 'D', 'M'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_25', question: 'What is the Roman numeral for 1000?', options: ['C', 'D', 'M', 'X'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_26', question: 'What number is CC?', options: ['100', '150', '200', '250'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_27', question: 'What number is MCM?', options: ['1100', '1900', '1500', '900'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_28', question: 'What year is MMXX?', options: ['2010', '2020', '2030', '2000'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_29', question: 'What is XL in numbers?', options: ['10', '40', '50', '60'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_30', question: 'What is CD in numbers?', options: ['100', '400', '500', '600'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_31', question: 'How do you write 90 in Roman numerals?', options: ['LXXXX', 'XC', 'IC', 'LXL'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_32', question: 'What is DCCC?', options: ['600', '700', '800', '900'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_33', question: 'How many thousands in 456,789?', options: ['4', '45', '456', '4567'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_34', question: 'What is 234,567 rounded to 1 significant figure?', options: ['200,000', '230,000', '234,000', '235,000'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_35', question: 'Which digit is in the ten thousands place in 876,543?', options: ['8', '7', '6', '5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // ADDITION & SUBTRACTION (25 questions)
  { id: 'y5_math_36', question: 'What is 45,678 + 23,456?', options: ['68,134', '69,134', '68,234', '69,234'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_37', question: 'What is 123,456 + 87,654?', options: ['210,110', '211,110', '210,010', '211,010'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_38', question: 'What is 87,654 - 23,456?', options: ['64,198', '64,298', '65,198', '65,298'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_39', question: 'What is 500,000 - 234,567?', options: ['265,433', '265,533', '266,433', '266,533'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_40', question: 'Add mentally: 3,400 + 2,600', options: ['5,000', '5,800', '6,000', '6,200'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_41', question: 'Subtract mentally: 8,000 - 3,500', options: ['4,000', '4,500', '5,000', '5,500'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_42', question: 'What is 234,567 + 345,678?', options: ['580,245', '580,345', '579,245', '579,345'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_43', question: 'What is 654,321 - 123,456?', options: ['530,865', '531,865', '530,765', '531,765'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_44', question: 'Round and estimate: 4,832 + 3,167 ≈', options: ['7,000', '8,000', '9,000', '10,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_45', question: 'Round and estimate: 9,876 - 4,123 ≈', options: ['5,000', '6,000', '7,000', '8,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_46', question: 'Multi-step: (45,678 + 23,456) - 10,000 = ___', options: ['58,134', '59,134', '58,234', '59,234'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_47', question: 'Multi-step: (100,000 - 45,678) + 12,345 = ___', options: ['66,667', '67,667', '66,567', '67,567'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_48', question: 'A shop had 234,567 items. 98,765 sold. How many left?', options: ['135,802', '136,802', '135,902', '136,902'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_49', question: 'Sara saved ₦45,678 then ₦32,456. Total savings?', options: ['77,134', '78,134', '77,234', '78,234'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_50', question: 'What is 76,543 + 23,457?', options: ['99,000', '99,900', '100,000', '100,100'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_51', question: 'What is 800,000 - 456,789?', options: ['343,211', '344,211', '343,111', '344,111'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_52', question: 'Check using inverse: If 45,678 + 23,456 = 69,134, then 69,134 - 23,456 = ___', options: ['45,678', '46,678', '44,678', '23,456'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_53', question: 'What is 345,678 + 654,322?', options: ['999,000', '999,900', '1,000,000', '1,000,100'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_54', question: 'Add: 234,567 + 345,678 + 123,456 = ___', options: ['703,701', '703,601', '702,701', '702,601'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_55', question: 'What is 1,000,000 - 234,567?', options: ['765,433', '765,533', '766,433', '766,533'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_56', question: 'Mentally: 56,000 + 34,000', options: ['80,000', '85,000', '90,000', '95,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_57', question: 'Mentally: 75,000 - 23,000', options: ['48,000', '50,000', '52,000', '55,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_58', question: 'Two towns have populations of 234,567 and 345,678. Total?', options: ['580,245', '580,345', '579,245', '579,345'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_59', question: 'A school needs ₦500,000. Has ₦234,567. How much more needed?', options: ['265,433', '265,533', '266,433', '266,533'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_60', question: 'What is 999,999 + 1?', options: ['999,000', '1,000,000', '1,000,001', '1,100,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // MULTIPLICATION & DIVISION (40 questions)
  // Multiples and factors
  { id: 'y5_math_61', question: 'What are the factors of 12?', options: ['1, 2, 3, 4, 6, 12', '1, 2, 3, 6, 12', '2, 3, 4, 6, 12', '1, 3, 4, 12'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_62', question: 'What are the factors of 24?', options: ['1, 2, 3, 4, 6, 8, 12, 24', '1, 2, 4, 6, 8, 12, 24', '2, 3, 4, 6, 8, 12, 24', '1, 3, 6, 8, 12, 24'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_63', question: 'What are the first 5 multiples of 7?', options: ['7, 14, 21, 28, 35', '7, 14, 21, 28, 36', '6, 14, 21, 28, 35', '7, 13, 21, 28, 35'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_64', question: 'What is the common factor of 12 and 18?', options: ['2, 3, 6', '1, 2, 3, 6', '3, 6', '6'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_65', question: 'What is the highest common factor (HCF) of 12 and 18?', options: ['2', '3', '6', '9'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Prime numbers
  { id: 'y5_math_66', question: 'What is a prime number?', options: ['A number with only 1 factor', 'A number with exactly 2 factors (1 and itself)', 'An even number', 'An odd number'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_67', question: 'Which is a prime number?', options: ['9', '15', '17', '21'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_68', question: 'Is 2 a prime number?', options: ['Yes', 'No', 'Sometimes', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_69', question: 'Which is NOT a prime number?', options: ['2', '3', '9', '7'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_70', question: 'What are the prime numbers up to 19?', options: ['2, 3, 5, 7, 11, 13, 17, 19', '1, 2, 3, 5, 7, 11, 13, 17, 19', '2, 3, 5, 7, 9, 11, 13, 17, 19', '3, 5, 7, 11, 13, 17, 19'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_71', question: 'What is a composite number?', options: ['A prime number', 'A number with more than 2 factors', 'The number 1', 'An even number'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_72', question: 'Is 1 a prime number?', options: ['Yes', 'No', 'Sometimes', 'Cannot tell'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Long multiplication
  { id: 'y5_math_73', question: 'What is 234 × 12?', options: ['2,808', '2,708', '2,908', '2,608'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_74', question: 'What is 456 × 23?', options: ['10,388', '10,488', '10,588', '10,688'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_75', question: 'What is 1,234 × 5?', options: ['6,160', '6,170', '6,180', '6,190'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_76', question: 'What is 2,345 × 6?', options: ['14,060', '14,070', '14,080', '14,090'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_77', question: 'What is 789 × 34?', options: ['26,626', '26,726', '26,826', '26,926'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },

  // Mental multiplication and division
  { id: 'y5_math_78', question: 'What is 25 × 4?', options: ['90', '95', '100', '105'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_79', question: 'What is 50 × 8?', options: ['350', '380', '400', '420'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_80', question: 'What is 125 × 8?', options: ['900', '950', '1,000', '1,050'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_81', question: 'What is 360 ÷ 6?', options: ['50', '55', '60', '65'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_82', question: 'What is 720 ÷ 9?', options: ['70', '75', '80', '85'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Short division
  { id: 'y5_math_83', question: 'What is 456 ÷ 4?', options: ['113', '114', '115', '116'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_84', question: 'What is 789 ÷ 3?', options: ['261', '262', '263', '264'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_85', question: 'What is 1,248 ÷ 6?', options: ['206', '207', '208', '209'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_86', question: 'What is 2,345 ÷ 5?', options: ['467', '468', '469', '470'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Multiplying and dividing by 10, 100, 1000
  { id: 'y5_math_87', question: 'What is 45 × 10?', options: ['45', '450', '4,500', '45,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_88', question: 'What is 3.4 × 100?', options: ['3.4', '34', '340', '3,400'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_89', question: 'What is 2.56 × 1000?', options: ['25.6', '256', '2,560', '25,600'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_90', question: 'What is 780 ÷ 10?', options: ['7.8', '78', '780', '7,800'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_91', question: 'What is 4,500 ÷ 100?', options: ['4.5', '45', '450', '4,500'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_92', question: 'What is 6,700 ÷ 1000?', options: ['0.67', '6.7', '67', '670'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_93', question: 'What is 0.56 × 10?', options: ['0.056', '0.56', '5.6', '56'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_94', question: 'What is 123.4 ÷ 10?', options: ['1.234', '12.34', '123.4', '1,234'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Square and cube numbers
  { id: 'y5_math_95', question: 'What is 5²?', options: ['10', '15', '25', '50'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_96', question: 'What is 6²?', options: ['12', '24', '36', '48'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_97', question: 'What is 10²?', options: ['20', '50', '100', '1,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_98', question: 'What is 2³?', options: ['4', '6', '8', '9'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_99', question: 'What is 3³?', options: ['9', '12', '18', '27'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_100', question: 'What is 4³?', options: ['12', '16', '48', '64'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },

  // FRACTIONS, DECIMALS & PERCENTAGES (45 questions)
  // Comparing and ordering fractions
  { id: 'y5_math_101', question: 'Which is larger: 2/5 or 3/5?', options: ['2/5', '3/5', 'Same', 'Cannot tell'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_102', question: 'Order from smallest to largest: 1/4, 2/4, 3/4', options: ['1/4, 2/4, 3/4', '3/4, 2/4, 1/4', '2/4, 1/4, 3/4', '1/4, 3/4, 2/4'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_103', question: 'Which is larger: 3/10 or 7/10?', options: ['3/10', '7/10', 'Same', 'Cannot tell'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Equivalent fractions
  { id: 'y5_math_104', question: 'Which fraction is equivalent to 1/2?', options: ['2/3', '3/6', '2/5', '3/5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_105', question: 'Which fraction is equivalent to 2/3?', options: ['4/6', '3/6', '4/9', '3/9'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_106', question: 'Which fraction is equivalent to 3/4?', options: ['6/8', '6/12', '9/16', '3/8'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_107', question: 'Simplify 4/8:', options: ['1/2', '2/4', '1/4', '3/4'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_108', question: 'Simplify 6/9:', options: ['1/3', '2/3', '3/6', '1/2'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_109', question: 'What is 25/100 simplified?', options: ['1/2', '1/4', '1/5', '2/5'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Mixed numbers and improper fractions
  { id: 'y5_math_110', question: 'What is 7/4 as a mixed number?', options: ['1 1/4', '1 2/4', '1 3/4', '2 1/4'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_111', question: 'What is 11/3 as a mixed number?', options: ['3 1/3', '3 2/3', '2 2/3', '4 1/3'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_112', question: 'What is 2 1/2 as an improper fraction?', options: ['3/2', '4/2', '5/2', '6/2'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_113', question: 'What is 3 2/5 as an improper fraction?', options: ['15/5', '16/5', '17/5', '18/5'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },

  // Adding and subtracting fractions
  { id: 'y5_math_114', question: 'What is 1/5 + 2/5?', options: ['2/5', '3/5', '3/10', '1/5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_115', question: 'What is 4/7 - 2/7?', options: ['1/7', '2/7', '3/7', '6/7'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_116', question: 'What is 1/4 + 2/8? (Hint: make denominators the same)', options: ['3/8', '1/2', '3/12', '5/8'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_117', question: 'What is 3/10 + 1/5? (Hint: 1/5 = 2/10)', options: ['4/10', '5/10', '4/15', '5/15'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_118', question: 'What is 7/8 - 1/4? (Hint: 1/4 = 2/8)', options: ['5/8', '6/8', '3/4', '1/2'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Multiplying fractions
  { id: 'y5_math_119', question: 'What is 1/2 × 4?', options: ['1', '2', '3', '4'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_120', question: 'What is 1/3 × 6?', options: ['1', '2', '3', '6'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_121', question: 'What is 2/5 × 10?', options: ['2', '4', '5', '10'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_122', question: 'What is 3/4 × 8?', options: ['4', '5', '6', '7'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Decimals as fractions
  { id: 'y5_math_123', question: 'What is 0.5 as a fraction?', options: ['1/2', '1/5', '5/10', 'Both A and C'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_124', question: 'What is 0.25 as a fraction?', options: ['1/4', '25/100', '1/25', 'Both A and B'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_125', question: 'What is 0.75 as a fraction?', options: ['3/4', '75/100', '7/10', 'Both A and B'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_126', question: 'What is 0.1 as a fraction?', options: ['1/10', '1/100', '1/1000', '10/100'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_127', question: 'What is 0.03 as a fraction?', options: ['3/10', '3/100', '3/1000', '30/100'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Thousandths
  { id: 'y5_math_128', question: 'What is 0.001 as a fraction?', options: ['1/10', '1/100', '1/1000', '10/1000'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_129', question: 'What is 0.456 in words?', options: ['Four hundred and fifty-six thousandths', 'Four point five six', 'Forty-five point six', 'Four point fifty-six'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_130', question: 'Which is larger: 0.5 or 0.05?', options: ['0.5', '0.05', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Rounding decimals
  { id: 'y5_math_131', question: 'Round 3.46 to the nearest whole number:', options: ['2', '3', '4', '5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_132', question: 'Round 7.89 to the nearest whole number:', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_133', question: 'Round 4.567 to 1 decimal place:', options: ['4.5', '4.6', '4.7', '5.0'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_134', question: 'Round 8.234 to 1 decimal place:', options: ['8.1', '8.2', '8.3', '8.4'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Ordering and comparing decimals
  { id: 'y5_math_135', question: 'Order from smallest: 2.3, 2.03, 2.33', options: ['2.03, 2.3, 2.33', '2.3, 2.03, 2.33', '2.33, 2.3, 2.03', '2.03, 2.33, 2.3'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_136', question: 'Which is largest: 0.456, 0.465, 0.546?', options: ['0.456', '0.465', '0.546', 'All same'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_137', question: 'Is 0.7 greater than 0.67?', options: ['Yes', 'No', 'Same', 'Cannot tell'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },

  // Percentages
  { id: 'y5_math_138', question: 'What does % mean?', options: ['Parts per ten', 'Parts per hundred', 'Parts per thousand', 'Whole'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_139', question: 'What is 50% as a fraction?', options: ['1/2', '1/4', '1/5', '5/10'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_140', question: 'What is 25% as a fraction?', options: ['1/2', '1/4', '1/5', '2/5'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_141', question: 'What is 75% as a fraction?', options: ['1/4', '1/2', '3/4', '7/10'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_142', question: 'What is 100%?', options: ['Half', 'All', 'Quarter', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_143', question: 'What is 10% as a decimal?', options: ['0.01', '0.1', '1.0', '10'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_144', question: 'What is 1% as a decimal?', options: ['0.001', '0.01', '0.1', '1'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_145', question: 'What percentage is shaded if 3 out of 10 squares are shaded?', options: ['3%', '10%', '30%', '70%'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // MEASUREMENT (25 questions)
  // Converting metric units
  { id: 'y5_math_146', question: 'How many metres in 3 kilometres?', options: ['30', '300', '3,000', '30,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_147', question: 'How many centimetres in 2.5 metres?', options: ['25', '250', '2,500', '25,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_148', question: 'How many millimetres in 5 centimetres?', options: ['5', '50', '500', '5,000'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_149', question: 'How many grams in 4 kilograms?', options: ['40', '400', '4,000', '40,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_150', question: 'How many millilitres in 2 litres?', options: ['20', '200', '2,000', '20,000'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_151', question: 'Convert 3.5 km to metres:', options: ['35 m', '350 m', '3,500 m', '35,000 m'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_152', question: 'Convert 1,500 g to kilograms:', options: ['0.15 kg', '1.5 kg', '15 kg', '150 kg'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Imperial units
  { id: 'y5_math_153', question: 'Approximately how many inches in 1 foot?', options: ['6', '10', '12', '16'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_154', question: 'Approximately how many pounds in 1 kilogram?', options: ['1', '2', '2.2', '5'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_155', question: 'Approximately how many pints in 1 litre?', options: ['1', '1.76', '2', '4'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },

  // Perimeter
  { id: 'y5_math_156', question: 'Perimeter of a rectangle 8m × 5m:', options: ['13 m', '20 m', '26 m', '40 m'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_157', question: 'Perimeter of a square with sides 12cm:', options: ['24 cm', '36 cm', '48 cm', '60 cm'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_158', question: 'Perimeter of shape with sides 5cm, 7cm, 8cm, 6cm:', options: ['24 cm', '25 cm', '26 cm', '27 cm'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Area
  { id: 'y5_math_159', question: 'Area of rectangle 6cm × 4cm:', options: ['10 cm²', '20 cm²', '24 cm²', '26 cm²'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_160', question: 'Area of square with sides 7cm:', options: ['14 cm²', '28 cm²', '49 cm²', '56 cm²'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_161', question: 'Area of rectangle 12m × 8m:', options: ['20 m²', '40 m²', '80 m²', '96 m²'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_162', question: 'A rectangle has area 48cm² and length 8cm. What is the width?', options: ['4 cm', '5 cm', '6 cm', '7 cm'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },

  // Volume and capacity
  { id: 'y5_math_163', question: 'What is volume?', options: ['The amount of space inside a shape', 'The distance around', 'The surface area', 'The weight'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_164', question: 'Volume is measured in:', options: ['cm', 'cm²', 'cm³', 'cm⁴'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_165', question: 'If a shape is made of 12 1cm³ cubes, what is its volume?', options: ['6 cm³', '12 cm³', '24 cm³', '36 cm³'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Time
  { id: 'y5_math_166', question: 'How many seconds in 3 minutes?', options: ['30', '60', '120', '180'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_167', question: 'How many minutes in 2.5 hours?', options: ['100', '120', '150', '180'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_168', question: 'How many days in 3 weeks?', options: ['14', '18', '21', '24'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_169', question: 'A film starts at 14:30 and lasts 120 minutes. When does it end?', options: ['15:30', '16:00', '16:30', '17:00'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_170', question: 'How many hours from 08:45 to 14:15?', options: ['5 hours', '5.5 hours', '6 hours', '6.5 hours'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },

  // GEOMETRY (20 questions)
  // 3D shapes
  { id: 'y5_math_171', question: 'A cube has how many faces?', options: ['4', '6', '8', '12'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_172', question: 'A cube has how many edges?', options: ['6', '8', '10', '12'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_173', question: 'A cube has how many vertices (corners)?', options: ['4', '6', '8', '12'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_174', question: 'What is a cuboid?', options: ['A square', 'A cube', 'A 3D rectangular shape', 'A circle'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // Angles
  { id: 'y5_math_175', question: 'Angles are measured in:', options: ['Metres', 'Degrees', 'Grams', 'Litres'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_176', question: 'An acute angle is:', options: ['Less than 90°', 'Exactly 90°', 'More than 90°', '180°'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_177', question: 'An obtuse angle is:', options: ['Less than 90°', 'Exactly 90°', 'Between 90° and 180°', 'More than 180°'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_178', question: 'A reflex angle is:', options: ['Less than 90°', '90° to 180°', 'More than 180°', 'Exactly 180°'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_179', question: 'A full turn is:', options: ['90°', '180°', '270°', '360°'], correctAnswer: 3, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_180', question: 'A half turn is:', options: ['90°', '180°', '270°', '360°'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_181', question: 'Angles on a straight line add up to:', options: ['90°', '180°', '270°', '360°'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_182', question: 'Angles around a point add up to:', options: ['90°', '180°', '270°', '360°'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },

  // Polygons
  { id: 'y5_math_183', question: 'What is a regular polygon?', options: ['Any polygon', 'A polygon with all sides and angles equal', 'A polygon with 4 sides', 'A circle'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_math_184', question: 'Which is a regular polygon?', options: ['Rectangle', 'Square', 'Trapezium', 'Any quadrilateral'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_185', question: 'An irregular polygon has:', options: ['All sides equal', 'All angles equal', 'Sides or angles that are not all equal', 'No sides'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Reflection and translation
  { id: 'y5_math_186', question: 'What is a reflection?', options: ['Turning a shape', 'Flipping a shape over a line', 'Making a shape bigger', 'Moving a shape'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_187', question: 'What is a translation?', options: ['Flipping a shape', 'Turning a shape', 'Sliding a shape', 'Enlarging a shape'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_188', question: 'In a reflection, the shape:', options: ['Changes size', 'Stays the same size', 'Changes color', 'Disappears'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_189', question: 'The line of reflection acts like:', options: ['A ruler', 'A mirror', 'A pencil', 'A compass'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_190', question: 'In a translation, all points move:', options: ['In different directions', 'The same distance in the same direction', 'Only up', 'Only down'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // STATISTICS (5 questions)
  { id: 'y5_math_191', question: 'In a line graph, what does the line show?', options: ['Nothing', 'How data changes over time', 'Colors', 'Shapes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_192', question: 'If a line graph goes up, the values are:', options: ['Decreasing', 'Increasing', 'Staying same', 'Random'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_193', question: 'A timetable shows:', options: ['Colors', 'When things happen', 'Shapes', 'Weights'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_194', question: 'In a table, data is organized in:', options: ['Circles', 'Rows and columns', 'Random order', 'Colors'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_195', question: 'To find the difference between two values:', options: ['Add them', 'Subtract them', 'Multiply them', 'Divide them'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // REASONING & ASSESSMENT (5 questions)
  { id: 'y5_math_196', question: 'Multi-step: If a book costs ₦450 and you buy 6, then get ₦200 discount, total cost?', options: ['₦2,500', '₦2,700', '₦2,900', '₦3,100'], correctAnswer: 0, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_197', question: 'Multi-step: A shop has 1,234 items. 567 sold, 345 arrived. Total now?', options: ['1,002', '1,012', '1,022', '1,032'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_198', question: 'Reasoning: If 15 × 6 = 90, then 90 ÷ 6 = ___', options: ['6', '15', '90', '540'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_math_199', question: 'Problem: A rectangle has perimeter 24cm and length 8cm. Width?', options: ['3 cm', '4 cm', '6 cm', '8 cm'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_math_200', question: 'Reasoning: If 3/4 of 12 is 9, what is 3/4 of 24?', options: ['12', '15', '18', '21'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 }
];
