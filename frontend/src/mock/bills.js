export const extractedBills = {
  default: {
    id: 'bill_mock_1',
    fileName: 'dinner-bill.jpg',
    merchant: 'Coastal Kitchen',
    items: [
      { id: 'bill_item_1', name: 'Pizza', amount: 800 },
      { id: 'bill_item_2', name: 'Burger', amount: 450 },
      { id: 'bill_item_3', name: 'Drinks', amount: 300 },
      { id: 'bill_item_4', name: 'Dessert', amount: 250 },
    ],
    subtotal: 1800,
    tax: 180,
    tip: 0,
    total: 1980,
  },
  restaurant: {
    id: 'bill_mock_2',
    fileName: 'group-dinner.pdf',
    merchant: 'The Lantern',
    items: [
      { id: 'bill_item_5', name: 'Dinner', amount: 2000 },
      { id: 'bill_item_6', name: 'Drinks', amount: 800 },
      { id: 'bill_item_7', name: 'Dessert', amount: 1000 },
    ],
    subtotal: 3800,
    tax: 380,
    tip: 620,
    total: 4800,
  },
}
