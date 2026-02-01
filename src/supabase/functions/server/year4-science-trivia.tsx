// Year 4 Science Trivia Questions
// Based on UK Year 4 Science Curriculum Framework
// 200 comprehensive questions covering all curriculum areas

export const YEAR_4_SCIENCE_QUESTIONS = [
  // LIVING THINGS & THEIR HABITATS (30 questions)
  // Grouping and classification
  { id: 'y4_sci_1', question: 'Living things can be grouped by:', options: ['Color only', 'Characteristics and features', 'Size only', 'Name only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_2', question: 'What is classification?', options: ['Naming animals', 'Grouping things by shared characteristics', 'Counting animals', 'Feeding animals'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_3', question: 'Vertebrates are animals with:', options: ['No bones', 'A backbone', 'Wings', 'Fur'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_4', question: 'Invertebrates are animals:', options: ['With a backbone', 'Without a backbone', 'Only insects', 'Only fish'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_5', question: 'Which is a vertebrate?', options: ['Spider', 'Worm', 'Cat', 'Snail'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_6', question: 'Which is an invertebrate?', options: ['Dog', 'Fish', 'Butterfly', 'Bird'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_7', question: 'What is a classification key?', options: ['A door key', 'A tool to identify living things by answering questions', 'A list of names', 'A map'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_8', question: 'In a classification key, you make choices based on:', options: ['Guessing', 'Observable features', 'Colors only', 'Size only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_9', question: 'Mammals are characterized by:', options: ['Laying eggs', 'Having fur/hair and feeding milk to young', 'Having scales', 'Living in water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_10', question: 'Birds are characterized by:', options: ['Having fur', 'Having feathers and laying eggs', 'Living underwater', 'Having no bones'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_11', question: 'Fish are characterized by:', options: ['Living on land', 'Living in water and having gills and scales', 'Having feathers', 'Having fur'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_12', question: 'Amphibians can live:', options: ['Only in water', 'Only on land', 'Both in water and on land', 'Only in trees'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_13', question: 'Reptiles are characterized by:', options: ['Wet skin', 'Dry scaly skin', 'Feathers', 'Fur'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_14', question: 'Which is an amphibian?', options: ['Snake', 'Frog', 'Lizard', 'Fish'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_15', question: 'Which is a reptile?', options: ['Frog', 'Turtle', 'Fish', 'Bird'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Environmental change
  { id: 'y4_sci_16', question: 'Environments can change due to:', options: ['Nothing', 'Natural events and human actions', 'Only weather', 'Only animals'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_17', question: 'What can cause danger to living things in an environment?', options: ['Stable conditions', 'Pollution, habitat destruction, climate change', 'Clean water', 'Fresh air'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_18', question: 'Deforestation means:', options: ['Planting trees', 'Cutting down forests', 'Protecting forests', 'Watering trees'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_19', question: 'How does pollution affect living things?', options: ['Helps them grow', 'Can harm or kill them', 'No effect', 'Makes them stronger'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_20', question: 'What is a habitat?', options: ['A type of animal', 'The natural home of an organism', 'A food', 'A plant'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_21', question: 'Loss of habitat can cause:', options: ['More animals', 'Animal populations to decline', 'Better conditions', 'No change'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_22', question: 'Climate change can affect living things by:', options: ['Making everything better', 'Changing temperatures and habitats', 'Having no effect', 'Only affecting plants'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_23', question: 'Which human activity helps living things?', options: ['Polluting rivers', 'Creating nature reserves', 'Cutting down forests', 'Littering'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_24', question: 'An ecosystem is:', options: ['A single animal', 'A community of living things and their environment', 'Only plants', 'Only animals'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_25', question: 'Endangered species are:', options: ['Very common', 'At risk of extinction', 'Growing in numbers', 'Found everywhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_26', question: 'Recycling helps the environment by:', options: ['Creating more waste', 'Reducing waste and saving resources', 'Polluting more', 'Having no effect'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_27', question: 'What is biodiversity?', options: ['One type of animal', 'Variety of different species', 'Only plants', 'No living things'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_28', question: 'Which protects animals?', options: ['Hunting', 'Conservation', 'Pollution', 'Deforestation'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_29', question: 'Adaptation means:', options: ['Animals changing homes', 'Features that help organisms survive', 'Animals getting sick', 'Animals disappearing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_30', question: 'Why do we group living things?', options: ['For fun', 'To organize and understand them better', 'No reason', 'To confuse people'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // ANIMALS, INCLUDING HUMANS (35 questions)
  // Digestive system
  { id: 'y4_sci_31', question: 'What does the digestive system do?', options: ['Helps us breathe', 'Breaks down food for the body', 'Pumps blood', 'Helps us think'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_32', question: 'Where does digestion begin?', options: ['Stomach', 'Mouth', 'Small intestine', 'Large intestine'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_33', question: 'What do teeth do in digestion?', options: ['Nothing', 'Break down food by chewing', 'Pump blood', 'Absorb nutrients'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_34', question: 'What is the tube that carries food to the stomach?', options: ['Windpipe', 'Oesophagus (gullet)', 'Small intestine', 'Blood vessel'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_35', question: 'What does the stomach do?', options: ['Pumps blood', 'Mixes food with acids and breaks it down', 'Breathes air', 'Filters blood'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_36', question: 'Where are nutrients absorbed?', options: ['Mouth', 'Stomach', 'Small intestine', 'Large intestine'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_37', question: 'What does the large intestine do?', options: ['Breaks down food', 'Absorbs water and forms waste', 'Chews food', 'Pumps blood'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_38', question: 'The order of the digestive system is:', options: ['Stomach, mouth, intestines', 'Mouth, oesophagus, stomach, intestines', 'Intestines, stomach, mouth', 'Mouth, stomach, oesophagus'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Types of teeth
  { id: 'y4_sci_39', question: 'How many types of teeth do humans have?', options: ['2', '3', '4', '5'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_40', question: 'What are incisors used for?', options: ['Grinding', 'Cutting and biting', 'Tearing', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_41', question: 'What are canines used for?', options: ['Cutting', 'Tearing and ripping food', 'Grinding', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_42', question: 'What are molars used for?', options: ['Cutting', 'Tearing', 'Grinding and chewing', 'Nothing'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_43', question: 'What are premolars used for?', options: ['Cutting', 'Grinding and crushing', 'Nothing', 'Tearing only'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_44', question: 'Which teeth are at the front of your mouth?', options: ['Molars', 'Incisors', 'Canines', 'Premolars'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_45', question: 'Which teeth are pointed?', options: ['Incisors', 'Molars', 'Canines', 'Premolars'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_46', question: 'Why should we brush our teeth?', options: ['No reason', 'To remove plaque and prevent decay', 'To make them yellow', 'To damage them'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_47', question: 'What causes tooth decay?', options: ['Brushing', 'Sugar and bacteria', 'Water', 'Vegetables'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_48', question: 'How many teeth does an adult human have?', options: ['20', '24', '28', '32'], correctAnswer: 3, difficulty: 'medium', xpReward: 25 },

  // Food chains
  { id: 'y4_sci_49', question: 'What is a food chain?', options: ['A chain made of food', 'Shows how energy passes from one organism to another', 'A shopping list', 'A recipe'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_50', question: 'A producer in a food chain is:', options: ['An animal that hunts', 'A plant that makes its own food', 'An animal that is eaten', 'A human'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_51', question: 'A consumer is:', options: ['A plant', 'An organism that eats other organisms', 'The sun', 'Water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_52', question: 'A predator is:', options: ['An animal that is hunted', 'An animal that hunts other animals', 'A plant', 'The sun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_53', question: 'Prey is:', options: ['An animal that hunts', 'An animal that is hunted and eaten', 'A plant', 'The sun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_54', question: 'In the food chain: Grass → Rabbit → Fox, what is the producer?', options: ['Grass', 'Rabbit', 'Fox', 'Sun'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_55', question: 'In the food chain: Grass → Rabbit → Fox, what is the predator?', options: ['Grass', 'Rabbit', 'Fox', 'All of them'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_56', question: 'In the food chain: Grass → Rabbit → Fox, what is the prey?', options: ['Grass', 'Rabbit', 'Fox', 'Sun'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_57', question: 'What is at the start of most food chains?', options: ['Animals', 'Plants (producers)', 'Humans', 'Water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_58', question: 'Where do plants get their energy?', options: ['From animals', 'From the sun', 'From water only', 'From soil only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_59', question: 'Arrows in a food chain show:', options: ['Direction of movement', 'Direction of energy flow', 'Nothing', 'Water flow'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_60', question: 'A herbivore is:', options: ['An animal that eats only meat', 'An animal that eats only plants', 'An animal that eats both', 'A plant'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_61', question: 'A carnivore is:', options: ['An animal that eats only plants', 'An animal that eats only meat', 'An animal that eats both', 'A plant'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_62', question: 'An omnivore is:', options: ['Eats only plants', 'Eats only meat', 'Eats both plants and animals', 'Doesn\'t eat'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_63', question: 'Which is a herbivore?', options: ['Lion', 'Rabbit', 'Fox', 'Shark'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_64', question: 'Which is a carnivore?', options: ['Cow', 'Rabbit', 'Lion', 'Deer'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_65', question: 'Which is an omnivore?', options: ['Cow', 'Lion', 'Human', 'Rabbit'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },

  // STATES OF MATTER (35 questions)
  // Three states
  { id: 'y4_sci_66', question: 'What are the three states of matter?', options: ['Hot, cold, warm', 'Solid, liquid, gas', 'Big, small, medium', 'Hard, soft, rough'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_67', question: 'A solid has:', options: ['No fixed shape', 'A fixed shape and volume', 'No volume', 'Only a fixed shape'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_68', question: 'A liquid:', options: ['Has a fixed shape', 'Takes the shape of its container', 'Cannot flow', 'Has no volume'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_69', question: 'A gas:', options: ['Has a fixed shape', 'Has a fixed volume', 'Fills all available space', 'Cannot move'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_70', question: 'Which is a solid?', options: ['Water', 'Air', 'Wood', 'Steam'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_71', question: 'Which is a liquid?', options: ['Ice', 'Water', 'Steam', 'Rock'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_72', question: 'Which is a gas?', options: ['Ice', 'Water', 'Steam', 'Metal'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_73', question: 'Particles in a solid are:', options: ['Far apart', 'Close together and vibrate', 'Moving freely', 'Not there'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_74', question: 'Particles in a liquid:', options: ['Are fixed', 'Can move around each other', 'Are very far apart', 'Don\'t exist'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_75', question: 'Particles in a gas:', options: ['Are close together', 'Are very far apart and move freely', 'Are fixed', 'Don\'t move'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Changing states
  { id: 'y4_sci_76', question: 'What happens when a solid is heated?', options: ['It stays solid', 'It may melt to a liquid', 'It disappears', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_77', question: 'Melting is when:', options: ['A liquid becomes solid', 'A solid becomes liquid', 'A liquid becomes gas', 'Nothing changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_78', question: 'Freezing is when:', options: ['A solid becomes liquid', 'A liquid becomes solid', 'A gas becomes liquid', 'Nothing changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_79', question: 'Evaporation is when:', options: ['A solid becomes liquid', 'A liquid becomes gas', 'A gas becomes liquid', 'Nothing changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_80', question: 'Condensation is when:', options: ['A liquid becomes gas', 'A gas becomes liquid', 'A solid becomes liquid', 'Nothing changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_81', question: 'At what temperature does water freeze?', options: ['0°C', '50°C', '100°C', '25°C'], correctAnswer: 0, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_82', question: 'At what temperature does water boil?', options: ['0°C', '50°C', '100°C', '25°C'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_83', question: 'What is the melting point?', options: ['Temperature at which liquid freezes', 'Temperature at which solid melts', 'Temperature at which water boils', 'Room temperature'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_84', question: 'What is the boiling point?', options: ['Temperature at which liquid evaporates', 'Temperature at which water freezes', 'Temperature at which solid melts', 'Room temperature'], correctAnswer: 0, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_85', question: 'When ice melts, it becomes:', options: ['Steam', 'Water', 'Gas', 'Solid'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_86', question: 'When water boils, it becomes:', options: ['Ice', 'Water vapor (steam)', 'Solid', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Water cycle
  { id: 'y4_sci_87', question: 'What is the water cycle?', options: ['Water going in circles', 'Continuous movement of water on Earth', 'Swimming', 'Drinking water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_88', question: 'In the water cycle, water evaporates from:', options: ['The sky', 'Oceans, rivers, and lakes', 'Mountains only', 'Nowhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_89', question: 'What causes water to evaporate faster?', options: ['Cold temperature', 'Higher temperature', 'No temperature', 'Rain'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_90', question: 'Water vapor rises and cools, forming:', options: ['Rain', 'Ice', 'Clouds', 'Rivers'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_91', question: 'When water vapor cools in clouds, it:', options: ['Evaporates', 'Condenses into water droplets', 'Disappears', 'Freezes only'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_92', question: 'Precipitation is:', options: ['Evaporation', 'Water falling as rain, snow, or hail', 'Condensation', 'Melting'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_93', question: 'The stages of the water cycle are:', options: ['Only evaporation', 'Evaporation, condensation, precipitation', 'Only rain', 'Only clouds'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_94', question: 'What provides energy for the water cycle?', options: ['Moon', 'Sun', 'Wind', 'Clouds'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_95', question: 'What is sublimation?', options: ['Liquid to gas', 'Solid to gas', 'Gas to liquid', 'Liquid to solid'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },
  { id: 'y4_sci_96', question: 'Temperature is measured in:', options: ['Meters', 'Kilograms', 'Degrees Celsius (°C)', 'Seconds'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_97', question: 'Which state of matter has the most energy?', options: ['Solid', 'Liquid', 'Gas', 'All same'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_98', question: 'Ice is what state of water?', options: ['Liquid', 'Solid', 'Gas', 'Plasma'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_99', question: 'Steam is what state of water?', options: ['Liquid', 'Solid', 'Gas', 'Plasma'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_100', question: 'Can materials change back to their original state?', options: ['Never', 'Yes, state changes are reversible', 'Only sometimes', 'No'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // SOUND (30 questions)
  // How sounds are made
  { id: 'y4_sci_101', question: 'Sounds are made by:', options: ['Light', 'Vibrations', 'Colors', 'Smells'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_102', question: 'What is a vibration?', options: ['Staying still', 'Rapid back and forth movement', 'Slow movement', 'No movement'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_103', question: 'When you pluck a guitar string, it:', options: ['Stays still', 'Vibrates to make sound', 'Breaks', 'Disappears'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_104', question: 'Sound travels through:', options: ['Nothing (vacuum)', 'A medium like air, water, or solids', 'Only air', 'Only water'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_105', question: 'Sound cannot travel through:', options: ['Air', 'Water', 'A vacuum (empty space)', 'Solids'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_106', question: 'How do we hear sounds?', options: ['With our eyes', 'Vibrations travel to our ears', 'With our nose', 'With our skin'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_107', question: 'Sound waves travel from the source to:', options: ['Nowhere', 'Our ears', 'Our stomach', 'Our feet'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_108', question: 'Sound travels fastest through:', options: ['Air', 'Water', 'Solids', 'Vacuum'], correctAnswer: 2, difficulty: 'medium', xpReward: 25 },

  // Pitch
  { id: 'y4_sci_109', question: 'Pitch is how:', options: ['Loud a sound is', 'High or low a sound is', 'Long a sound lasts', 'Fast it travels'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_110', question: 'A high-pitched sound has:', options: ['Slow vibrations', 'Fast vibrations', 'No vibrations', 'Medium vibrations'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_111', question: 'A low-pitched sound has:', options: ['Fast vibrations', 'Slow vibrations', 'No vibrations', 'Very fast vibrations'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_112', question: 'A short string on a guitar makes:', options: ['Low pitch', 'High pitch', 'No sound', 'Medium pitch'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_113', question: 'A long string on a guitar makes:', options: ['High pitch', 'Low pitch', 'No sound', 'Very high pitch'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_114', question: 'A tight string makes:', options: ['Lower pitch', 'Higher pitch', 'No sound', 'Same pitch'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_115', question: 'A loose string makes:', options: ['Higher pitch', 'Lower pitch', 'No sound', 'Very high pitch'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Volume
  { id: 'y4_sci_116', question: 'Volume is how:', options: ['High or low a sound is', 'Loud or quiet a sound is', 'Long it lasts', 'Fast it travels'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_117', question: 'A loud sound has:', options: ['Weak vibrations', 'Strong vibrations', 'No vibrations', 'Slow vibrations'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_118', question: 'A quiet sound has:', options: ['Strong vibrations', 'Weak vibrations', 'No vibrations', 'Very strong vibrations'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_119', question: 'If you hit a drum harder, the sound becomes:', options: ['Quieter', 'Louder', 'Higher pitch', 'Lower pitch'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_120', question: 'If you hit a drum softly, the sound becomes:', options: ['Louder', 'Quieter', 'Higher pitch', 'Lower pitch'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Distance and sound
  { id: 'y4_sci_121', question: 'As you move farther from a sound source:', options: ['Sound gets louder', 'Sound gets fainter', 'Sound stays same', 'Pitch changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_122', question: 'As you move closer to a sound source:', options: ['Sound gets fainter', 'Sound gets louder', 'Sound stays same', 'Pitch changes'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_123', question: 'Why does sound get fainter with distance?', options: ['It disappears', 'Energy spreads out', 'It gets tired', 'No reason'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_124', question: 'Which material is good for soundproofing?', options: ['Thin paper', 'Thick soft materials', 'Glass only', 'Metal only'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_125', question: 'An echo is:', options: ['A new sound', 'Sound reflecting back', 'No sound', 'A light'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_126', question: 'Which sense do we use to detect sound?', options: ['Sight', 'Hearing', 'Smell', 'Taste'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_127', question: 'Very loud sounds can:', options: ['Improve hearing', 'Damage hearing', 'Have no effect', 'Make you see better'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_128', question: 'The part of the ear that vibrates is:', options: ['Ear lobe', 'Eardrum', 'Ear canal only', 'Outside ear'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_129', question: 'Musical instruments make sounds by:', options: ['Magic', 'Vibrating different parts', 'Staying still', 'Being silent'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_130', question: 'Which travels faster: sound or light?', options: ['Sound', 'Light', 'Same speed', 'Neither travels'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // ELECTRICITY (35 questions)
  // Electrical appliances
  { id: 'y4_sci_131', question: 'Which appliance uses electricity?', options: ['Wooden spoon', 'Television', 'Paper', 'Rock'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_132', question: 'Which of these runs on electricity?', options: ['Bicycle', 'Laptop', 'Book', 'Ball'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_133', question: 'What provides electricity to appliances at home?', options: ['Water pipes', 'Mains electricity', 'Air', 'Soil'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_134', question: 'What provides electricity to portable devices?', options: ['Mains only', 'Batteries or cells', 'Water', 'Air'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Simple circuits
  { id: 'y4_sci_135', question: 'What is an electrical circuit?', options: ['A race track', 'A complete loop for electricity to flow', 'A type of wire', 'A battery'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_136', question: 'For a bulb to light, the circuit must be:', options: ['Broken', 'Complete (closed loop)', 'Open', 'Disconnected'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_137', question: 'What is a cell (battery)?', options: ['A prison', 'A source of electrical energy', 'A wire', 'A bulb'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_138', question: 'What do wires do in a circuit?', options: ['Make light', 'Carry electricity', 'Store energy', 'Nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_139', question: 'What does a bulb do in a circuit?', options: ['Stores electricity', 'Converts electrical energy to light', 'Stops electricity', 'Makes noise'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_140', question: 'What does a buzzer do in a circuit?', options: ['Makes light', 'Makes sound', 'Stops electricity', 'Stores energy'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_141', question: 'What is a series circuit?', options: ['Multiple paths', 'Components connected in one loop', 'No connection', 'Parallel paths'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_142', question: 'In a simple series circuit, electricity flows:', options: ['In multiple paths', 'In one complete path', 'Not at all', 'Backwards'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Switches
  { id: 'y4_sci_143', question: 'What does a switch do?', options: ['Makes electricity', 'Opens and closes the circuit', 'Stores electricity', 'Measures electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_144', question: 'When a switch is ON (closed):', options: ['Circuit is broken', 'Circuit is complete and electricity flows', 'No electricity', 'Battery dies'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_145', question: 'When a switch is OFF (open):', options: ['Electricity flows', 'Circuit is broken and electricity stops', 'Battery charges', 'Nothing happens'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_146', question: 'A switch allows you to:', options: ['Store electricity', 'Control the flow of electricity', 'Make electricity', 'Destroy electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_147', question: 'If there is a gap in a circuit:', options: ['Electricity flows', 'Electricity cannot flow', 'More electricity flows', 'Battery charges'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Conductors and insulators
  { id: 'y4_sci_148', question: 'A conductor is a material that:', options: ['Blocks electricity', 'Allows electricity to flow through', 'Stores electricity', 'Makes electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_149', question: 'An insulator is a material that:', options: ['Allows electricity through', 'Blocks or resists electricity', 'Makes electricity', 'Destroys electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_150', question: 'Which is a good conductor?', options: ['Plastic', 'Wood', 'Copper (metal)', 'Rubber'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_151', question: 'Which is a good insulator?', options: ['Copper', 'Iron', 'Plastic', 'Aluminum'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_152', question: 'Metals are generally:', options: ['Insulators', 'Good conductors', 'Non-conductive', 'Bad at conducting'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_153', question: 'Why are wires usually made of metal?', options: ['They look nice', 'Metals conduct electricity well', 'They are cheap only', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_154', question: 'Why do wires have plastic coating?', options: ['For decoration', 'Plastic insulates and keeps us safe', 'To make them heavier', 'No reason'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_155', question: 'Which would NOT conduct electricity?', options: ['Gold', 'Silver', 'Wood', 'Copper'], correctAnswer: 2, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_156', question: 'Why are plugs made with plastic?', options: ['For color', 'Plastic is an insulator for safety', 'They are lighter', 'No reason'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },

  // Safety
  { id: 'y4_sci_157', question: 'Is electricity dangerous?', options: ['No, never', 'Yes, if not handled safely', 'Only sometimes', 'Not at all'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_158', question: 'You should:', options: ['Play with mains electricity', 'Never play with mains electricity', 'Touch live wires', 'Poke sockets'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_159', question: 'Water and electricity together are:', options: ['Safe', 'Very dangerous', 'Good', 'Helpful'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_160', question: 'In school, you should only use:', options: ['Mains electricity', 'Low voltage batteries/cells', 'High voltage', 'No electricity'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // Circuit components
  { id: 'y4_sci_161', question: 'What does a motor do in a circuit?', options: ['Makes light', 'Converts electrical energy to movement', 'Stores energy', 'Makes sound'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_162', question: 'The symbol for a cell/battery in a circuit is:', options: ['A circle', 'Two lines (one long, one short)', 'A cross', 'A square'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_163', question: 'If you add more cells to a circuit:', options: ['Bulb gets dimmer', 'Bulb gets brighter', 'No change', 'Bulb breaks'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_164', question: 'If you add more bulbs in series:', options: ['Bulbs get brighter', 'Bulbs get dimmer', 'No change', 'All bulbs break'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_165', question: 'Electricity flows from:', options: ['Negative to positive', 'Positive to negative', 'Randomly', 'It doesn\'t flow'], correctAnswer: 1, difficulty: 'hard', xpReward: 30 },

  // WORKING SCIENTIFICALLY (25 questions)
  { id: 'y4_sci_166', question: 'A scientific question is one that:', options: ['Cannot be tested', 'Can be tested through investigation', 'Is about opinions', 'Has no answer'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_167', question: 'What is a fair test?', options: ['Any test', 'A test where only one variable changes', 'A test with no controls', 'An unfair test'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_168', question: 'A variable is:', options: ['A fixed value', 'Something that can change', 'A result', 'A conclusion'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_169', question: 'In a fair test, you change:', options: ['Everything', 'Only one variable', 'Nothing', 'Two variables'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_170', question: 'Why do we repeat tests?', options: ['For fun', 'To check results are reliable', 'To waste time', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_171', question: 'What is an observation?', options: ['A guess', 'Using your senses to gather information', 'A conclusion', 'A test'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_172', question: 'Why do we record data?', options: ['To waste time', 'To remember and analyze results', 'For decoration', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_173', question: 'Data can be recorded using:', options: ['Nothing', 'Tables, charts, and graphs', 'Only words', 'Only pictures'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_174', question: 'A prediction is:', options: ['A result', 'What you think will happen', 'A conclusion', 'An observation'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_175', question: 'A hypothesis is:', options: ['A fact', 'An educated guess to test', 'A result', 'A conclusion'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_176', question: 'A conclusion is:', options: ['The start', 'What you learned from the investigation', 'A guess', 'A question'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_177', question: 'Evidence is:', options: ['A guess', 'Information from observations and tests', 'An opinion', 'A story'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_178', question: 'Why use standard units in measurements?', options: ['For fun', 'So everyone can compare results', 'To confuse', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_179', question: 'Accurate measurements are:', options: ['Random', 'Precise and close to true value', 'Wrong', 'Guesses'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_180', question: 'Classifying means:', options: ['Breaking things', 'Grouping by similar properties', 'Hiding things', 'Losing things'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_181', question: 'Why do scientists share their findings?', options: ['To show off', 'So others can learn and check results', 'To hide information', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_182', question: 'A pattern in results means:', options: ['Random data', 'Something that repeats or shows a trend', 'Mistakes', 'Nothing'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_183', question: 'If results don\'t match your prediction:', options: ['Give up', 'Think about why and learn', 'Change the data', 'Ignore it'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_184', question: 'Safety in science means:', options: ['Being careless', 'Following rules and being careful', 'Ignoring instructions', 'Taking risks'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_185', question: 'A control in an experiment is:', options: ['The changed variable', 'Something kept the same for comparison', 'A result', 'A guess'], correctAnswer: 1, difficulty: 'medium', xpReward: 25 },
  { id: 'y4_sci_186', question: 'Why ask questions in science?', options: ['It\'s annoying', 'Questions lead to investigations', 'To waste time', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_187', question: 'What is a line graph used for?', options: ['Decoration', 'Showing how data changes over time', 'Nothing', 'Making patterns'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_188', question: 'What is a bar chart used for?', options: ['Showing continuous data', 'Comparing different categories', 'Nothing', 'Hiding data'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_189', question: 'Good scientists are:', options: ['Careless', 'Curious, careful, and learn from results', 'Give up easily', 'Never wrong'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_190', question: 'Scientific language helps:', options: ['Confuse people', 'Communicate clearly and accurately', 'Sound complicated', 'Waste time'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },

  // ASSESSMENT (10 questions)
  { id: 'y4_sci_191', question: 'Why do we have science tests?', options: ['To punish students', 'To check understanding and progress', 'For fun only', 'No reason'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_192', question: 'Scientific enquiry means:', options: ['Reading only', 'Investigating to answer questions', 'Guessing', 'Doing nothing'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_193', question: 'What is the water cycle?', options: ['Riding a bike', 'Movement of water through evaporation, condensation, precipitation', 'Swimming', 'Drinking'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_194', question: 'Name the three states of matter:', options: ['Hot, cold, warm', 'Solid, liquid, gas', 'Big, small, medium', 'Fast, slow, still'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_195', question: 'Sound is produced by:', options: ['Light', 'Vibrations', 'Smell', 'Taste'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_196', question: 'For electricity to flow, a circuit must be:', options: ['Broken', 'Complete', 'Open', 'Disconnected'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_197', question: 'The digestive system:', options: ['Pumps blood', 'Breaks down food', 'Helps breathing', 'Filters waste'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_198', question: 'In a food chain, energy flows from:', options: ['Predator to prey', 'Producer to consumer', 'Consumer to producer', 'Nowhere'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_199', question: 'Classification helps us:', options: ['Confuse things', 'Organize and identify living things', 'Make things complicated', 'Hide information'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 },
  { id: 'y4_sci_200', question: 'The best way to learn science is to:', options: ['Memorize only', 'Investigate, question, and explore', 'Never ask questions', 'Avoid experiments'], correctAnswer: 1, difficulty: 'easy', xpReward: 20 }
];
