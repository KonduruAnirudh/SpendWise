import { createStore } from './mockStore'
import { people as peopleSeed } from '../mock/people'
import { groups as groupSeed } from '../mock/groups'
import { sharedExpenses as expenseSeed } from '../mock/expenses'
import { balances as balanceSeed, suggestedSettlements as settlementSeed } from '../mock/settlements'

export const peopleStore = createStore(peopleSeed)
export const groupsStore = createStore(groupSeed)
export const expensesStore = createStore(expenseSeed)
export const settlementsStore = createStore(settlementSeed)
export const balancesStore = createStore(balanceSeed)
