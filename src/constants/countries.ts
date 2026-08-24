// Country list for the location selector. Priority markets first, then the rest
// alphabetically. Values are the display names (stored as the profile "location").
export const PRIORITY_COUNTRIES = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'United Kingdom',
  'United States',
  'Canada',
];

export const OTHER_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Australia', 'Austria',
  'Bahrain', 'Bangladesh', 'Belgium', 'Benin', 'Botswana', 'Brazil', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cameroon', 'Chad', 'Chile', 'China', 'Colombia',
  'Congo (DRC)', 'Congo (Republic)', "Côte d'Ivoire", 'Croatia', 'Cyprus', 'Czechia',
  'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Greece', 'Guinea', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Latvia', 'Lebanon',
  'Lesotho', 'Liberia', 'Libya', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico', 'Morocco',
  'Mozambique', 'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Niger', 'Norway',
  'Oman', 'Pakistan', 'Panama', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Korea', 'Spain', 'Sri Lanka',
  'Sudan', 'Swaziland (Eswatini)', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

// Full ordered list for the dropdown (priority markets pinned to the top).
export const COUNTRIES = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES];
