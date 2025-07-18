export interface Card {
  id: string
  type: "property" | "money" | "action" | "rent" | "house" | "hotel"
  name: string
  value?: number
  color?: string
  colors?: string[]
  description?: string
  rentValues?: number[]
}

export const PROPERTY_COLORS = {
  brown: { name: "Brown", count: 2, rentValues: [1, 2] },
  lightblue: { name: "Light Blue", count: 3, rentValues: [1, 2, 3] },
  pink: { name: "Pink", count: 3, rentValues: [1, 2, 4] },
  orange: { name: "Orange", count: 3, rentValues: [1, 3, 5] },
  red: { name: "Red", count: 3, rentValues: [2, 3, 6] },
  yellow: { name: "Yellow", count: 3, rentValues: [2, 4, 6] },
  green: { name: "Green", count: 3, rentValues: [2, 4, 7] },
  darkblue: { name: "Dark Blue", count: 2, rentValues: [3, 8] },
  utility: { name: "Utility", count: 2, rentValues: [1, 2] },
  railroad: { name: "Railroad", count: 4, rentValues: [1, 2, 3, 4] },
}

export const CARDS: Card[] = [
  // Property Cards
  { id: "prop_brown_1", type: "property", name: "Mediterranean Avenue", color: "brown", value: 1 },
  { id: "prop_brown_2", type: "property", name: "Baltic Avenue", color: "brown", value: 1 },

  { id: "prop_lightblue_1", type: "property", name: "Oriental Avenue", color: "lightblue", value: 1 },
  { id: "prop_lightblue_2", type: "property", name: "Vermont Avenue", color: "lightblue", value: 1 },
  { id: "prop_lightblue_3", type: "property", name: "Connecticut Avenue", color: "lightblue", value: 1 },

  { id: "prop_pink_1", type: "property", name: "St. Charles Place", color: "pink", value: 2 },
  { id: "prop_pink_2", type: "property", name: "States Avenue", color: "pink", value: 2 },
  { id: "prop_pink_3", type: "property", name: "Virginia Avenue", color: "pink", value: 2 },

  { id: "prop_orange_1", type: "property", name: "St. James Place", color: "orange", value: 2 },
  { id: "prop_orange_2", type: "property", name: "Tennessee Avenue", color: "orange", value: 2 },
  { id: "prop_orange_3", type: "property", name: "New York Avenue", color: "orange", value: 2 },

  { id: "prop_red_1", type: "property", name: "Kentucky Avenue", color: "red", value: 3 },
  { id: "prop_red_2", type: "property", name: "Indiana Avenue", color: "red", value: 3 },
  { id: "prop_red_3", type: "property", name: "Illinois Avenue", color: "red", value: 3 },

  { id: "prop_yellow_1", type: "property", name: "Atlantic Avenue", color: "yellow", value: 3 },
  { id: "prop_yellow_2", type: "property", name: "Ventnor Avenue", color: "yellow", value: 3 },
  { id: "prop_yellow_3", type: "property", name: "Marvin Gardens", color: "yellow", value: 3 },

  { id: "prop_green_1", type: "property", name: "Pacific Avenue", color: "green", value: 4 },
  { id: "prop_green_2", type: "property", name: "North Carolina Avenue", color: "green", value: 4 },
  { id: "prop_green_3", type: "property", name: "Pennsylvania Avenue", color: "green", value: 4 },

  { id: "prop_darkblue_1", type: "property", name: "Park Place", color: "darkblue", value: 4 },
  { id: "prop_darkblue_2", type: "property", name: "Boardwalk", color: "darkblue", value: 4 },

  { id: "prop_railroad_1", type: "property", name: "Reading Railroad", color: "railroad", value: 2 },
  { id: "prop_railroad_2", type: "property", name: "Pennsylvania Railroad", color: "railroad", value: 2 },
  { id: "prop_railroad_3", type: "property", name: "B&O Railroad", color: "railroad", value: 2 },
  { id: "prop_railroad_4", type: "property", name: "Short Line", color: "railroad", value: 2 },

  { id: "prop_utility_1", type: "property", name: "Electric Company", color: "utility", value: 2 },
  { id: "prop_utility_2", type: "property", name: "Water Works", color: "utility", value: 2 },

  // Property Wildcards
  { id: "wildcard_1", type: "property", name: "Property Wildcard", colors: ["brown", "lightblue"], value: 1 },
  { id: "wildcard_2", type: "property", name: "Property Wildcard", colors: ["pink", "orange"], value: 2 },
  { id: "wildcard_3", type: "property", name: "Property Wildcard", colors: ["red", "yellow"], value: 3 },
  { id: "wildcard_4", type: "property", name: "Property Wildcard", colors: ["green", "darkblue"], value: 4 },
  { id: "wildcard_5", type: "property", name: "Property Wildcard", colors: ["railroad", "utility"], value: 2 },

  // Money Cards
  { id: "money_1m_1", type: "money", name: "1M", value: 1 },
  { id: "money_1m_2", type: "money", name: "1M", value: 1 },
  { id: "money_1m_3", type: "money", name: "1M", value: 1 },
  { id: "money_1m_4", type: "money", name: "1M", value: 1 },
  { id: "money_1m_5", type: "money", name: "1M", value: 1 },
  { id: "money_1m_6", type: "money", name: "1M", value: 1 },

  { id: "money_2m_1", type: "money", name: "2M", value: 2 },
  { id: "money_2m_2", type: "money", name: "2M", value: 2 },
  { id: "money_2m_3", type: "money", name: "2M", value: 2 },
  { id: "money_2m_4", type: "money", name: "2M", value: 2 },
  { id: "money_2m_5", type: "money", name: "2M", value: 2 },

  { id: "money_3m_1", type: "money", name: "3M", value: 3 },
  { id: "money_3m_2", type: "money", name: "3M", value: 3 },
  { id: "money_3m_3", type: "money", name: "3M", value: 3 },

  { id: "money_4m_1", type: "money", name: "4M", value: 4 },
  { id: "money_4m_2", type: "money", name: "4M", value: 4 },
  { id: "money_4m_3", type: "money", name: "4M", value: 4 },

  { id: "money_5m_1", type: "money", name: "5M", value: 5 },
  { id: "money_5m_2", type: "money", name: "5M", value: 5 },

  { id: "money_10m_1", type: "money", name: "10M", value: 10 },

  // Action Cards
  {
    id: "deal_breaker_1",
    type: "action",
    name: "Deal Breaker",
    value: 5,
    description: "Steal a complete property set from any player",
  },
  {
    id: "deal_breaker_2",
    type: "action",
    name: "Deal Breaker",
    value: 5,
    description: "Steal a complete property set from any player",
  },

  { id: "sly_deal_1", type: "action", name: "Sly Deal", value: 3, description: "Steal a property from any player" },
  { id: "sly_deal_2", type: "action", name: "Sly Deal", value: 3, description: "Steal a property from any player" },
  { id: "sly_deal_3", type: "action", name: "Sly Deal", value: 3, description: "Steal a property from any player" },

  {
    id: "forced_deal_1",
    type: "action",
    name: "Forced Deal",
    value: 3,
    description: "Force a player to trade properties with you",
  },
  {
    id: "forced_deal_2",
    type: "action",
    name: "Forced Deal",
    value: 3,
    description: "Force a player to trade properties with you",
  },
  {
    id: "forced_deal_3",
    type: "action",
    name: "Forced Deal",
    value: 3,
    description: "Force a player to trade properties with you",
  },

  {
    id: "debt_collector_1",
    type: "action",
    name: "Debt Collector",
    value: 3,
    description: "Force any player to pay you 5M",
  },
  {
    id: "debt_collector_2",
    type: "action",
    name: "Debt Collector",
    value: 3,
    description: "Force any player to pay you 5M",
  },
  {
    id: "debt_collector_3",
    type: "action",
    name: "Debt Collector",
    value: 3,
    description: "Force any player to pay you 5M",
  },

  { id: "birthday_1", type: "action", name: "It's My Birthday", value: 2, description: "All players pay you 2M" },
  { id: "birthday_2", type: "action", name: "It's My Birthday", value: 2, description: "All players pay you 2M" },
  { id: "birthday_3", type: "action", name: "It's My Birthday", value: 2, description: "All players pay you 2M" },

  { id: "pass_go_1", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_2", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_3", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_4", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_5", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_6", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_7", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_8", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_9", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },
  { id: "pass_go_10", type: "action", name: "Pass Go", value: 1, description: "Draw 2 additional cards" },

  {
    id: "just_say_no_1",
    type: "action",
    name: "Just Say No!",
    value: 4,
    description: "Cancel any action played against you",
  },
  {
    id: "just_say_no_2",
    type: "action",
    name: "Just Say No!",
    value: 4,
    description: "Cancel any action played against you",
  },
  {
    id: "just_say_no_3",
    type: "action",
    name: "Just Say No!",
    value: 4,
    description: "Cancel any action played against you",
  },

  // Rent Cards
  {
    id: "rent_brown_lightblue",
    type: "rent",
    name: "Rent",
    colors: ["brown", "lightblue"],
    value: 1,
    description: "Charge rent for Brown/Light Blue properties",
  },
  {
    id: "rent_pink_orange",
    type: "rent",
    name: "Rent",
    colors: ["pink", "orange"],
    value: 1,
    description: "Charge rent for Pink/Orange properties",
  },
  {
    id: "rent_red_yellow",
    type: "rent",
    name: "Rent",
    colors: ["red", "yellow"],
    value: 1,
    description: "Charge rent for Red/Yellow properties",
  },
  {
    id: "rent_green_darkblue",
    type: "rent",
    name: "Rent",
    colors: ["green", "darkblue"],
    value: 1,
    description: "Charge rent for Green/Dark Blue properties",
  },
  {
    id: "rent_railroad_utility",
    type: "rent",
    name: "Rent",
    colors: ["railroad", "utility"],
    value: 1,
    description: "Charge rent for Railroad/Utility properties",
  },

  {
    id: "wild_rent_1",
    type: "rent",
    name: "Wild Rent",
    value: 3,
    description: "Charge rent for any color from all players",
  },
  {
    id: "wild_rent_2",
    type: "rent",
    name: "Wild Rent",
    value: 3,
    description: "Charge rent for any color from all players",
  },
  {
    id: "wild_rent_3",
    type: "rent",
    name: "Wild Rent",
    value: 3,
    description: "Charge rent for any color from all players",
  },

  // House and Hotel Cards
  { id: "house_1", type: "house", name: "House", value: 3, description: "Add to a complete property set (+1 rent)" },
  { id: "house_2", type: "house", name: "House", value: 3, description: "Add to a complete property set (+1 rent)" },
  { id: "house_3", type: "house", name: "House", value: 3, description: "Add to a complete property set (+1 rent)" },

  {
    id: "hotel_1",
    type: "hotel",
    name: "Hotel",
    value: 4,
    description: "Add to a complete property set with house (+3 rent)",
  },
  {
    id: "hotel_2",
    type: "hotel",
    name: "Hotel",
    value: 4,
    description: "Add to a complete property set with house (+3 rent)",
  },
  {
    id: "hotel_3",
    type: "hotel",
    name: "Hotel",
    value: 4,
    description: "Add to a complete property set with house (+3 rent)",
  },
]

export function shuffleDeck(): string[] {
  const deck = [...CARDS.map((card) => card.id)]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function getCard(id: string): Card | undefined {
  return CARDS.find((card) => card.id === id)
}
