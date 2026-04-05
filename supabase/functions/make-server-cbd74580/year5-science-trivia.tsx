// Year 5 Science Trivia Questions
// Based on UK Year 5 Science Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_5_SCIENCE_QUESTIONS = [
  // LIVING THINGS & THEIR HABITATS (35 questions)
  // Life cycles
  { id: 'y5_sci_1', question: 'What is a life cycle?', options: ['A bicycle', 'The series of changes an organism goes through', 'A type of plant', 'A season'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_2', question: 'What are the stages in a mammal\'s life cycle?', options: ['Egg, larva, pupa, adult', 'Birth, growth, reproduction, death', 'Seed, seedling, adult', 'Egg, tadpole, adult'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_3', question: 'How are most mammals born?', options: ['From eggs', 'Live birth', 'From seeds', 'From spores'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_4', question: 'What is the first stage in an amphibian\'s life cycle?', options: ['Live birth', 'Egg laid in water', 'Pupa', 'Adult'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_5', question: 'What is a tadpole?', options: ['A baby fish', 'A young frog/amphibian', 'A type of insect', 'A plant'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_6', question: 'Adult amphibians can live:', options: ['Only in water', 'Only on land', 'Both on land and in water', 'Only in trees'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_7', question: 'What is metamorphosis?', options: ['Growth', 'A dramatic change in form during life cycle', 'Death', 'Reproduction'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_8', question: 'The life cycle of an insect with complete metamorphosis includes:', options: ['Egg, nymph, adult', 'Egg, larva, pupa, adult', 'Birth, growth, death', 'Egg, tadpole, adult'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_9', question: 'What is a larva?', options: ['An adult insect', 'An immature insect that looks different from adult', 'An egg', 'A type of bird'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_10', question: 'What is a pupa?', options: ['A baby', 'The resting stage where larva transforms into adult', 'An egg', 'An adult'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_11', question: 'A caterpillar is the larva of a:', options: ['Fly', 'Bee', 'Butterfly or moth', 'Beetle'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_12', question: 'What is a chrysalis?', options: ['A flower', 'The pupa of a butterfly', 'An egg', 'A bird'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_13', question: 'Bird life cycle begins with:', options: ['Live birth', 'Eggs laid in nest', 'Seeds', 'Spores'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_14', question: 'Young birds are called:', options: ['Larvae', 'Chicks', 'Tadpoles', 'Pups'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_15', question: 'Which animal lays eggs in water?', options: ['Dog', 'Frog', 'Cat', 'Human'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Reproduction
  { id: 'y5_sci_16', question: 'What is reproduction?', options: ['Growing', 'The process of producing offspring', 'Eating', 'Sleeping'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_17', question: 'What is pollination?', options: ['A type of pollution', 'Transfer of pollen from male to female flower parts', 'Making seeds', 'Growing roots'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_18', question: 'What helps pollinate flowers?', options: ['Rain only', 'Insects, birds, wind', 'Soil', 'Darkness'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_19', question: 'What is the male part of a flower called?', options: ['Petal', 'Stamen', 'Stigma', 'Ovary'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_20', question: 'What is the female part of a flower called?', options: ['Stamen', 'Carpel (pistil)', 'Sepal', 'Petal'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_21', question: 'After pollination, a flower produces:', options: ['More petals', 'Seeds', 'Roots', 'Leaves'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_22', question: 'How do seeds spread?', options: ['They don\'t', 'Wind, water, animals', 'Only by humans', 'They jump'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_23', question: 'What is germination?', options: ['A plant dying', 'A seed beginning to grow', 'Pollination', 'Fertilization'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_24', question: 'What do seeds need to germinate?', options: ['Only light', 'Water, warmth, oxygen', 'Only soil', 'Only darkness'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_25', question: 'Sexual reproduction in animals requires:', options: ['One parent', 'Two parents (male and female)', 'No parents', 'Three parents'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_26', question: 'What is fertilization?', options: ['Growing bigger', 'When male and female cells join', 'Eating food', 'Sleeping'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_27', question: 'Mammals develop inside the:', options: ['Egg outside body', 'Mother\'s womb/uterus', 'Water', 'Soil'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_28', question: 'The time a baby develops inside mother is called:', options: ['Germination', 'Gestation', 'Hibernation', 'Migration'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_29', question: 'Which reproduces by laying eggs?', options: ['Dog', 'Cat', 'Chicken', 'Human'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_30', question: 'Asexual reproduction requires:', options: ['Two parents', 'One parent', 'Three parents', 'No parent'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_31', question: 'Which plant reproduction method doesn\'t need seeds?', options: ['Germination', 'Runners, bulbs, tubers (vegetative)', 'Pollination', 'Fertilization'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_sci_32', question: 'What is an embryo?', options: ['A flower', 'An early stage of development', 'A seed coat', 'A root'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_33', question: 'Why do animals reproduce?', options: ['For fun', 'To continue the species', 'No reason', 'To eat'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_34', question: 'Which takes longer to develop: insect or mammal?', options: ['Insect', 'Mammal', 'Same time', 'Neither develops'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_35', question: 'What is the main difference between amphibian and mammal life cycles?', options: ['No difference', 'Amphibians start in water with metamorphosis', 'Mammals lay eggs', 'Amphibians have live birth'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // ANIMALS, INCLUDING HUMANS (25 questions)
  // Human development
  { id: 'y5_sci_36', question: 'What are the main stages of human life?', options: ['Baby, child, adult, elderly', 'Only baby and adult', 'Just one stage', 'Five hundred stages'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_37', question: 'A human baby develops inside the mother for about:', options: ['3 months', '6 months', '9 months', '12 months'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_38', question: 'What is infancy?', options: ['Old age', 'The baby stage (0-1 year)', 'Teenage years', 'Adult years'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_39', question: 'During childhood, humans:', options: ['Stop growing', 'Grow and develop skills', 'Get smaller', 'Never change'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_40', question: 'What is adolescence?', options: ['Baby stage', 'Teenage years with puberty', 'Old age', 'Birth'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_41', question: 'What is puberty?', options: ['Growing taller', 'Physical changes from child to adult', 'Learning to read', 'Old age'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_42', question: 'When does puberty usually begin?', options: ['Age 2-5', 'Age 10-14', 'Age 20-25', 'Age 40-50'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_43', question: 'What happens during puberty?', options: ['Nothing', 'Body grows, hormones change, reproductive maturity', 'You get smaller', 'You stop eating'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_44', question: 'Adulthood is when you:', options: ['Are fully grown', 'Are a baby', 'Can\'t walk', 'Can\'t think'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_45', question: 'What happens as humans age?', options: ['Nothing changes', 'Body systems gradually slow down', 'You get taller forever', 'You turn into an animal'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_46', question: 'In old age, humans may experience:', options: ['Super strength', 'Reduced mobility, memory changes, health issues', 'Growing taller', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_47', question: 'What helps humans stay healthy as they age?', options: ['Never exercising', 'Good diet, exercise, social connections', 'Eating only sweets', 'Sleeping all day'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_48', question: 'At what stage can humans reproduce?', options: ['Baby', 'After puberty/adulthood', 'Old age only', 'Never'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_49', question: 'What is the average human lifespan?', options: ['30 years', '50 years', '70-80 years', '150 years'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_50', question: 'Baby teeth are replaced by permanent teeth during:', options: ['Infancy', 'Childhood', 'Old age', 'Never'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_51', question: 'Which develops first in babies?', options: ['Walking', 'Talking', 'Sitting and crawling', 'Running'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_52', question: 'What is menopause?', options: ['When women stop menstruating', 'A childhood stage', 'A disease', 'A type of food'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_53', question: 'Growth rate is fastest during:', options: ['Old age', 'Infancy and adolescence', 'Middle adulthood', 'It never changes'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_54', question: 'What changes occur in elderly people\'s bones?', options: ['Become stronger', 'May become weaker and brittle', 'Turn to metal', 'Disappear'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_55', question: 'Mental development includes:', options: ['Only physical growth', 'Learning, memory, problem-solving', 'Nothing', 'Getting taller'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_56', question: 'Social development means:', options: ['Growing taller', 'Learning to interact with others', 'Eating more', 'Sleeping less'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_57', question: 'What organ pumps blood throughout life?', options: ['Lungs', 'Heart', 'Liver', 'Brain'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_58', question: 'Why do humans need a balanced diet throughout life?', options: ['No reason', 'For growth, energy, and health', 'To look good', 'It doesn\'t matter'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_59', question: 'Which life stage lasts the longest?', options: ['Infancy', 'Childhood', 'Adulthood', 'Old age'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_60', question: 'What happens to reaction time in old age?', options: ['Gets faster', 'May slow down', 'Stays exactly the same', 'Disappears'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // PROPERTIES & CHANGES OF MATERIALS (50 questions)
  // Properties of materials
  { id: 'y5_sci_61', question: 'What is hardness?', options: ['How hot something is', 'How difficult it is to scratch or dent', 'How heavy it is', 'How big it is'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_62', question: 'Which is the hardest?', options: ['Cotton', 'Wood', 'Diamond', 'Water'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_63', question: 'What is solubility?', options: ['How hard something is', 'The ability to dissolve in a liquid', 'How heavy something is', 'How hot something is'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_64', question: 'Which is soluble in water?', options: ['Sand', 'Salt', 'Wood', 'Plastic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_65', question: 'What does transparent mean?', options: ['Opaque', 'You can see through it', 'Colored', 'Heavy'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_66', question: 'Which material is transparent?', options: ['Wood', 'Metal', 'Glass', 'Brick'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_67', question: 'What does opaque mean?', options: ['See-through', 'You cannot see through it', 'Soft', 'Light'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_68', question: 'What is electrical conductivity?', options: ['How heavy something is', 'The ability to let electricity pass through', 'How hard something is', 'How hot something is'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_69', question: 'Which is a good electrical conductor?', options: ['Wood', 'Plastic', 'Copper (metal)', 'Rubber'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_70', question: 'Which is an electrical insulator?', options: ['Copper wire', 'Metal', 'Plastic', 'Steel'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_71', question: 'What is thermal conductivity?', options: ['How heavy something is', 'The ability to transfer heat', 'How bright something is', 'How soft something is'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_72', question: 'Metals are generally:', options: ['Poor heat conductors', 'Good heat conductors', 'Cannot conduct heat', 'Only conduct cold'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_73', question: 'Which material is magnetic?', options: ['Plastic', 'Wood', 'Iron', 'Glass'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_74', question: 'Which is NOT magnetic?', options: ['Iron', 'Steel', 'Nickel', 'Aluminum'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_75', question: 'What is flexibility?', options: ['How heavy', 'The ability to bend without breaking', 'How hot', 'How big'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Dissolving and solutions
  { id: 'y5_sci_76', question: 'What is a solution?', options: ['An answer', 'A mixture where solid dissolves in liquid', 'Only water', 'A problem'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_77', question: 'What is dissolving?', options: ['Melting', 'When a solid mixes completely with a liquid', 'Freezing', 'Boiling'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_78', question: 'The liquid that dissolves something is called:', options: ['Solution', 'Solute', 'Solvent', 'Solid'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_79', question: 'The solid that dissolves is called:', options: ['Solvent', 'Solute', 'Solution', 'Water'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_80', question: 'How can you recover salt from salt water?', options: ['Filtering', 'Evaporation', 'Freezing', 'Nothing works'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_81', question: 'When water evaporates from a solution:', options: ['Salt evaporates too', 'Solid is left behind', 'Everything disappears', 'Nothing happens'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_82', question: 'Stirring helps sugar dissolve:', options: ['Slower', 'Faster', 'Not at all', 'It explodes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_83', question: 'Hot water dissolves sugar:', options: ['Slower than cold', 'Faster than cold', 'Same as cold', 'Not at all'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Separating mixtures
  { id: 'y5_sci_84', question: 'What is filtering?', options: ['Mixing things', 'Separating solids from liquids', 'Melting', 'Freezing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_85', question: 'What is used to filter?', options: ['Hammer', 'Filter paper or sieve', 'Knife', 'Spoon'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_86', question: 'How would you separate sand from water?', options: ['Evaporation', 'Filtering', 'Mixing', 'Freezing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_87', question: 'What is sieving?', options: ['Melting', 'Separating particles by size', 'Dissolving', 'Burning'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_88', question: 'How would you separate rice from small stones?', options: ['Dissolving', 'Sieving', 'Burning', 'Freezing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_89', question: 'What is evaporation?', options: ['Liquid turning to solid', 'Liquid turning to gas', 'Gas turning to liquid', 'Solid turning to gas'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_90', question: 'How would you separate salt from salt water?', options: ['Filtering', 'Evaporation', 'Sieving', 'Freezing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Uses of materials
  { id: 'y5_sci_91', question: 'Why are saucepans made of metal?', options: ['They look nice', 'Metal conducts heat well', 'They are light', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_92', question: 'Why are electrical wires covered in plastic?', options: ['Decoration', 'Plastic is an insulator for safety', 'To make them heavy', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_93', question: 'Why is glass used for windows?', options: ['It\'s opaque', 'It\'s transparent', 'It\'s soft', 'It conducts electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_94', question: 'Why is wood used for furniture?', options: ['Strong, durable, and easy to shape', 'Transparent', 'Dissolves in water', 'Magnetic'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_95', question: 'Why is plastic used for bottles?', options: ['Heavy', 'Lightweight, waterproof, doesn\'t break easily', 'Transparent always', 'Conducts electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_96', question: 'Why are bridges made of steel?', options: ['Cheap', 'Strong and can support heavy loads', 'Transparent', 'Soft'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_97', question: 'Why is rubber used for tires?', options: ['Hard', 'Flexible, durable, and provides grip', 'Transparent', 'Dissolves easily'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Reversible changes
  { id: 'y5_sci_98', question: 'What is a reversible change?', options: ['A permanent change', 'A change that can be undone', 'No change', 'A chemical reaction'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_99', question: 'Which is reversible?', options: ['Burning wood', 'Freezing water to ice', 'Baking a cake', 'Rusting iron'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_100', question: 'Is melting reversible?', options: ['Yes', 'No', 'Sometimes', 'Never'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_101', question: 'Is dissolving reversible?', options: ['Never', 'Yes, by evaporation', 'No', 'Only sometimes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_102', question: 'Is mixing sand and water reversible?', options: ['No', 'Yes, by filtering or evaporation', 'Never', 'Only if hot'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_103', question: 'Changes of state (solid, liquid, gas) are:', options: ['Irreversible', 'Reversible', 'Impossible', 'Random'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Irreversible changes
  { id: 'y5_sci_104', question: 'What is an irreversible change?', options: ['Can be undone', 'Cannot be undone - new material forms', 'Melting', 'Freezing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_105', question: 'Which is irreversible?', options: ['Melting ice', 'Burning wood', 'Freezing water', 'Dissolving salt'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_106', question: 'When wood burns, it produces:', options: ['Same wood', 'Ash, smoke, gases (new materials)', 'Ice', 'Water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_107', question: 'Can you reverse burning?', options: ['Yes', 'No, new materials formed', 'Sometimes', 'Always'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_108', question: 'What happens when you add vinegar to bicarbonate of soda?', options: ['Nothing', 'Chemical reaction - bubbles/gas produced', 'It freezes', 'It melts'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_109', question: 'Is the vinegar and bicarbonate reaction reversible?', options: ['Yes', 'No, new gas produced', 'Sometimes', 'Always'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_110', question: 'Is cooking an egg reversible?', options: ['Yes', 'No, proteins change permanently', 'Sometimes', 'Always'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // EARTH & SPACE (35 questions)
  // Solar system
  { id: 'y5_sci_111', question: 'What is at the center of our solar system?', options: ['Earth', 'Moon', 'Sun', 'Mars'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_112', question: 'What is the Sun?', options: ['A planet', 'A star', 'A moon', 'A comet'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_113', question: 'How many planets are in our solar system?', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_114', question: 'What do planets do?', options: ['Stay still', 'Orbit (go around) the Sun', 'Orbit Earth', 'Float randomly'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_115', question: 'What is Earth?', options: ['A star', 'A planet', 'A moon', 'A comet'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_116', question: 'Which planet is closest to the Sun?', options: ['Earth', 'Venus', 'Mercury', 'Mars'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_117', question: 'Which planet is largest?', options: ['Earth', 'Mars', 'Jupiter', 'Mercury'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_118', question: 'What shape is the Earth?', options: ['Flat', 'Approximately spherical (round)', 'Square', 'Triangle'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_119', question: 'What shape is the Sun?', options: ['Cube', 'Approximately spherical', 'Flat', 'Pyramid'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_120', question: 'How long does Earth take to orbit the Sun?', options: ['1 day', '1 month', '1 year (365 days)', '10 years'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_121', question: 'The path Earth takes around the Sun is called:', options: ['A circle', 'An orbit', 'A line', 'A jump'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_122', question: 'What keeps planets orbiting the Sun?', options: ['Magic', 'Gravity', 'Wind', 'Light'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_123', question: 'Order of planets from Sun: Mercury, Venus, Earth...', options: ['Jupiter, Mars, Saturn', 'Mars, Jupiter, Saturn', 'Saturn, Mars, Jupiter', 'Mars, Saturn, Jupiter'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },

  // Moon
  { id: 'y5_sci_124', question: 'What is the Moon?', options: ['A planet', 'A star', 'Earth\'s natural satellite', 'A comet'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_125', question: 'What does the Moon orbit?', options: ['Sun', 'Earth', 'Mars', 'Jupiter'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_126', question: 'What shape is the Moon?', options: ['Flat', 'Approximately spherical', 'Square', 'Star-shaped'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_127', question: 'How long does the Moon take to orbit Earth?', options: ['1 day', 'About 28 days (1 month)', '1 year', '1 week'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_128', question: 'Why does the Moon appear to change shape?', options: ['It actually changes', 'We see different amounts of the lit side', 'It\'s magic', 'It shrinks'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_129', question: 'What are the Moon\'s phases?', options: ['Colors', 'Different shapes we see as it orbits', 'Temperatures', 'Sounds'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_130', question: 'Does the Moon produce its own light?', options: ['Yes', 'No, it reflects sunlight', 'Sometimes', 'Only at night'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_131', question: 'A full moon is when:', options: ['We see no Moon', 'We see all of the lit side', 'Half moon', 'New moon'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_132', question: 'A new moon is when:', options: ['We see the whole Moon', 'We see very little/none of the lit side', 'Half moon', 'Full moon'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Day and night, Earth's rotation
  { id: 'y5_sci_133', question: 'What causes day and night?', options: ['Sun moving', 'Earth spinning (rotating)', 'Moon moving', 'Magic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_134', question: 'How long does Earth take to rotate once?', options: ['1 hour', '12 hours', '24 hours (1 day)', '1 year'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_135', question: 'When your part of Earth faces the Sun, it is:', options: ['Night', 'Day', 'Evening', 'Morning'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_136', question: 'When your part of Earth faces away from Sun, it is:', options: ['Day', 'Night', 'Noon', 'Afternoon'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_137', question: 'The Sun appears to move across the sky because:', options: ['Sun is moving', 'Earth is rotating', 'Moon pushes it', 'Magic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_138', question: 'Does the Sun actually move across our sky?', options: ['Yes, it moves', 'No, Earth rotates making it appear to move', 'Sometimes', 'Only in summer'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_139', question: 'Where does the Sun appear to rise?', options: ['West', 'East', 'North', 'South'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_140', question: 'Where does the Sun appear to set?', options: ['East', 'West', 'North', 'South'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_141', question: 'What is Earth\'s axis?', options: ['A tool', 'An imaginary line through Earth\'s center', 'A country', 'A planet'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_142', question: 'Earth rotates on its:', options: ['Equator', 'Axis', 'Surface', 'Clouds'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_143', question: 'Why don\'t we feel Earth spinning?', options: ['It\'s not spinning', 'We move with it at constant speed', 'It spins very slowly', 'Magic'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_144', question: 'What causes seasons?', options: ['Moon\'s orbit', 'Distance from Sun only', 'Earth\'s tilted axis and orbit', 'Random'], correctAnswer: 2, difficulty: 'hard', xpReward: 30 },
  { id: 'y5_sci_145', question: 'Is it daytime everywhere on Earth at once?', options: ['Yes', 'No, half has day while half has night', 'Sometimes', 'Always night'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // FORCES (35 questions)
  // Gravity
  { id: 'y5_sci_146', question: 'What is gravity?', options: ['A type of magnet', 'A force pulling objects towards Earth', 'Wind', 'Light'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_147', question: 'Why do objects fall to the ground?', options: ['They want to', 'Gravity pulls them', 'Wind pushes them', 'Magic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_148', question: 'Gravity acts between:', options: ['Only Earth and objects', 'All objects with mass', 'Only large objects', 'Nothing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_149', question: 'What keeps us on the ground?', options: ['Magnets', 'Gravity', 'Wind', 'Glue'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_150', question: 'What keeps the Moon orbiting Earth?', options: ['String', 'Gravity', 'Wind', 'Magic'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_151', question: 'Without gravity, objects would:', options: ['Stay on ground', 'Float away', 'Get heavier', 'Disappear'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_152', question: 'What is weight?', options: ['How big something is', 'The force of gravity on an object', 'How fast it moves', 'Its color'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_153', question: 'Weight is measured in:', options: ['Meters', 'Newtons', 'Liters', 'Degrees'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Air resistance
  { id: 'y5_sci_154', question: 'What is air resistance?', options: ['A type of gravity', 'A force opposing motion through air', 'A type of magnet', 'Wind'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_155', question: 'Air resistance acts:', options: ['With movement', 'Against movement', 'Randomly', 'Nowhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_156', question: 'A parachute works because of:', options: ['Gravity only', 'Air resistance', 'Magnetism', 'Weight'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_157', question: 'Air resistance is greater when:', options: ['Object is smaller', 'Object is larger/has bigger surface area', 'Object is heavier', 'No difference'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_158', question: 'Streamlined shapes reduce:', options: ['Gravity', 'Air resistance', 'Weight', 'Size'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_159', question: 'Why are cars streamlined?', options: ['Look nice', 'Reduce air resistance for speed/efficiency', 'Increase weight', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Water resistance
  { id: 'y5_sci_160', question: 'What is water resistance?', options: ['Fear of water', 'A force opposing motion through water', 'A type of gravity', 'Floating'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_161', question: 'Water resistance acts:', options: ['With movement', 'Against movement', 'Randomly', 'Only up'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_162', question: 'Why are boats streamlined?', options: ['Look nice', 'Reduce water resistance', 'Increase weight', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_163', question: 'Water resistance is greater than air resistance because:', options: ['Water is denser', 'Water is lighter', 'No difference', 'Water is colder'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },

  // Friction
  { id: 'y5_sci_164', question: 'What is friction?', options: ['A type of gravity', 'A force opposing motion between surfaces', 'Wind', 'Light'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_165', question: 'Friction occurs when:', options: ['Surfaces don\'t touch', 'Surfaces rub against each other', 'Objects float', 'Nothing happens'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_166', question: 'Friction can be useful for:', options: ['Nothing', 'Brakes, grip, holding objects', 'Making things slippery', 'Flying'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_167', question: 'How can you reduce friction?', options: ['Make surfaces rougher', 'Use lubricants like oil, smooth surfaces', 'Increase pressure', 'Add glue'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_168', question: 'Rough surfaces have:', options: ['Less friction', 'More friction', 'No friction', 'Same as smooth'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_169', question: 'Friction produces:', options: ['Cold', 'Heat', 'Light only', 'Sound only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_170', question: 'Why do we have treads on shoes?', options: ['Decoration', 'Increase friction for grip', 'Reduce friction', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Mechanisms
  { id: 'y5_sci_171', question: 'What is a lever?', options: ['A type of force', 'A simple machine using a bar and pivot', 'A liquid', 'A planet'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_172', question: 'A lever allows you to:', options: ['Do more work', 'Lift heavy objects with less force', 'Create energy', 'Stop moving'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_173', question: 'The pivot point of a lever is called:', options: ['The end', 'The fulcrum', 'The middle', 'The top'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_174', question: 'Example of a lever:', options: ['Screw', 'Seesaw', 'Wheel', 'Nail'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_175', question: 'What is a pulley?', options: ['A type of lever', 'A wheel with a rope/chain to lift loads', 'A ramp', 'A screw'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_176', question: 'A pulley helps to:', options: ['Make things heavier', 'Lift heavy objects more easily', 'Stop movement', 'Create friction'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_177', question: 'What are gears?', options: ['Types of forces', 'Toothed wheels that work together', 'Liquids', 'Springs'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_178', question: 'Gears can:', options: ['Change speed and force', 'Create energy', 'Stop time', 'Make light'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_179', question: 'Where might you find gears?', options: ['In water', 'In bicycles, cars, clocks', 'In trees', 'In clouds'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_180', question: 'A small gear turning a large gear:', options: ['Increases speed', 'Increases force but reduces speed', 'Does nothing', 'Breaks the machine'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },

  // WORKING SCIENTIFICALLY (15 questions)
  { id: 'y5_sci_181', question: 'What is a scientific enquiry?', options: ['A guess', 'An investigation to answer a question', 'A story', 'A game'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_182', question: 'What is a variable?', options: ['A tool', 'Something that can change in an experiment', 'A result', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_183', question: 'What is a fair test?', options: ['Any test', 'A test where only one variable changes', 'A test with no variables', 'A test with many changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_184', question: 'Why control variables?', options: ['No reason', 'To make the test fair and accurate', 'To confuse results', 'To end the test'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_185', question: 'What is accuracy?', options: ['Speed of work', 'How close a measurement is to the true value', 'How big it is', 'How colorful'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_186', question: 'What is precision?', options: ['Being quick', 'How close repeated measurements are to each other', 'Being loud', 'Being first'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y5_sci_187', question: 'Why take repeated measurements?', options: ['Waste time', 'Improve accuracy and reliability', 'Make work harder', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_188', question: 'How can you record data?', options: ['Don\'t record', 'Tables, graphs, diagrams, labels', 'Only in your head', 'Tell others'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_189', question: 'What is a line graph used for?', options: ['Decoration', 'Showing continuous data and trends', 'Measuring length', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_190', question: 'What is a bar chart used for?', options: ['Decoration', 'Comparing categories or groups', 'Measuring time', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_191', question: 'What is a prediction?', options: ['A guess', 'What you think will happen based on knowledge', 'A result', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_192', question: 'Why make predictions?', options: ['No reason', 'To test understanding and plan investigations', 'To waste time', 'To confuse'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_193', question: 'What is a conclusion?', options: ['The start', 'A statement based on results', 'A guess', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_194', question: 'Scientific findings should be:', options: ['Kept secret', 'Reported and shared clearly', 'Hidden', 'Ignored'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_195', question: 'What makes evidence reliable?', options: ['One test', 'Repeated tests with similar results', 'Guessing', 'Random data'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // ASSESSMENT (5 questions)
  { id: 'y5_sci_196', question: 'What do end-of-unit assessments test?', options: ['Nothing', 'Your knowledge of the topic', 'Your name', 'Your age'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_197', question: 'Scientific investigation reports should include:', options: ['Only results', 'Question, method, results, conclusion', 'Only pictures', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_198', question: 'What is competency mastery?', options: ['Failing everything', 'Demonstrating understanding and skills', 'Guessing', 'Avoiding work'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_199', question: 'Why are assessments important?', options: ['To punish students', 'To track progress and identify areas for improvement', 'No reason', 'To waste time'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y5_sci_200', question: 'End-of-year assessments check:', options: ['Only one topic', 'Understanding across all topics', 'Nothing', 'Only behavior'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
];
