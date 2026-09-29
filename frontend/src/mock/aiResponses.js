export const aiResponses = [
  {
    match: /restaurant|food|swiggy|dining/i,
    answer:
      'You spent ₹12,400 on food this month. Restaurants and delivery made up ₹7,860 of that, with groceries at ₹4,540.',
  },
  {
    match: /biggest expense|largest/i,
    answer:
      'Your biggest expense this month is house rent at ₹18,500, followed by Zara (₹4,290) and BigBasket (₹3,180).',
  },
  {
    match: /shopping/i,
    answer:
      'Shopping over the last three months totals ₹24,180. August so far is ₹8,600, slightly below July.',
  },
  {
    match: /more this month|compared|last month/i,
    answer:
      'You spent 8% less this month than in July. August expenses are ₹54,200 versus ₹58,900 last month.',
  },
  {
    match: /category consumes|most of my money|top category/i,
    answer:
      'Bills consume the most of your money this month at ₹17,639, largely because of rent. Among discretionary spend, Food is the largest at ₹12,400.',
  },
  {
    match: /save|savings/i,
    answer:
      'You saved ₹30,800 this month — a 36.2% savings rate on ₹85,000 income.',
  },
]

export const defaultAiAnswer =
  'I can help with spending, savings, categories, and shared expenses. Try asking how much you spent on food this month.'

export const suggestedPrompts = [
  'How much did I spend on restaurants this month?',
  'What was my biggest expense?',
  'How much did I spend on shopping in the last three months?',
  'Did I spend more this month than last month?',
  'What category consumes most of my money?',
  'How much money did I save this month?',
]
