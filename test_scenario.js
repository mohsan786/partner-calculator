// test_scenario.js
// Verification of the test scenario required by prompt Section 16

const partners = [
  { id: 'p1', name: 'Mohsan', shareNum: 1, shareDenom: 3 },
  { id: 'p2', name: 'Muzzmal', shareNum: 2, shareDenom: 3 }
];

const transactions = [
  // 1. Business receives income: Rs. 300,000
  { type: 'income', amount: 300000, receivingAccount: 'acc_cash' },

  // 2. Mohsan pays business expense from pocket: Rs. 30,000
  { type: 'expense', amount: 30000, paidBy: 'p1_personal' },

  // 3. Muzzmal pays business expense from pocket: Rs. 50,000
  { type: 'expense', amount: 50000, paidBy: 'p2_personal' },

  // 4. Partner/Business transfers advance to employee: Rs. 20,000 from business cash
  { type: 'employee_advance', amount: 20000, paidBy: 'business_cash', sourceAccount: 'acc_cash', employeeId: 'emp_1' },

  // 5. Employee spends part of advance (Rs. 15,000) and returns remainder (Rs. 5,000)
  { type: 'employee_settlement', employeeId: 'emp_1', amountSpent: 15000, advanceUsed: 15000, personalMoneyUsed: 0, cashReturned: 5000 },

  // 6. Employee pays additional business expense from personal money: Rs. 5,000
  { type: 'expense', amount: 5000, paidBy: 'employee_personal', paidByPersonId: 'emp_1' },

  // 7. Business reimburses Mohsan: Rs. 20,000
  { type: 'partner_transaction', subType: 'reimbursement_received', partnerId: 'p1', amount: 20000, accountId: 'acc_cash' },

  // 8. Muzzmal withdraws money for personal use: Rs. 10,000
  { type: 'partner_transaction', subType: 'drawings', partnerId: 'p2', amount: 10000, accountId: 'acc_cash' }
];

// Calculation
let totalIncome = 0;
let totalExpenses = 0;
let p1PersonalExpenses = 0;
let p2PersonalExpenses = 0;
let p1Reimbursement = 0;
let p2Reimbursement = 0;
let p1Withdrawal = 0;
let p2Withdrawal = 0;

let empAdvance = 0;
let empOwed = 0;

let cashBal = 0;

transactions.forEach(t => {
  if (t.type === 'income') {
    totalIncome += t.amount;
    cashBal += t.amount;
  } else if (t.type === 'expense') {
    totalExpenses += t.amount;
    if (t.paidBy === 'p1_personal') p1PersonalExpenses += t.amount;
    if (t.paidBy === 'p2_personal') p2PersonalExpenses += t.amount;
    if (t.paidBy === 'employee_personal') empOwed += t.amount;
  } else if (t.type === 'employee_advance') {
    empAdvance += t.amount;
    cashBal -= t.amount;
  } else if (t.type === 'employee_settlement') {
    totalExpenses += t.amountSpent;
    empAdvance -= (t.advanceUsed + t.cashReturned);
    cashBal += t.cashReturned;
  } else if (t.type === 'partner_transaction') {
    if (t.subType === 'reimbursement_received') {
      if (t.partnerId === 'p1') p1Reimbursement += t.amount;
      if (t.partnerId === 'p2') p2Reimbursement += t.amount;
      cashBal -= t.amount;
    } else if (t.subType === 'drawings') {
      if (t.partnerId === 'p1') p1Withdrawal += t.amount;
      if (t.partnerId === 'p2') p2Withdrawal += t.amount;
      cashBal -= t.amount;
    }
  }
});

const netProfit = totalIncome - totalExpenses;
const p1ProfitShare = (netProfit * 1) / 3;
const p2ProfitShare = (netProfit * 2) / 3;

const p1Entitlement = p1ProfitShare + p1PersonalExpenses - p1Reimbursement - p1Withdrawal;
const p2Entitlement = p2ProfitShare + p2PersonalExpenses - p2Reimbursement - p2Withdrawal;

console.log('--- TEST SCENARIO RESULTS ---');
console.log('Total Income:', totalIncome); // Expected: 300,000
console.log('Total Approved Expenses:', totalExpenses); // Expected: 30,000 + 50,000 + 15,000 + 5,000 = 100,000
console.log('Net Profit:', netProfit); // Expected: 200,000
console.log("Mohsan's Profit Share (1/3):", p1ProfitShare.toFixed(2)); // Expected: 66,666.67
console.log("Muzzmal's Profit Share (2/3):", p2ProfitShare.toFixed(2)); // Expected: 133,333.33
console.log('Mohsan Personal Expenses:', p1PersonalExpenses); // Expected: 30,000
console.log('Muzzmal Personal Expenses:', p2PersonalExpenses); // Expected: 50,000
console.log('Mohsan Reimbursement Received:', p1Reimbursement); // Expected: 20,000
console.log('Muzzmal Withdrawals:', p2Withdrawal); // Expected: 10,000
console.log("Mohsan's Final Entitlement:", p1Entitlement.toFixed(2)); // Expected: 66,666.67 + 30,000 - 20,000 = 76,666.67
console.log("Muzzmal's Final Entitlement:", p2Entitlement.toFixed(2)); // Expected: 133,333.33 + 50,000 - 10,000 = 173,333.33
console.log('Employee Advance Balance:', empAdvance); // Expected: 20,000 - 15,000 - 5,000 = 0
console.log('Employee Reimbursement Owed:', empOwed); // Expected: 5,000
console.log('Cash Balance Available in Business:', cashBal); // Expected: 300,000 - 20,000 + 5,000 - 20,000 - 10,000 = 255,000

// Verification:
// Cash available (255,000) = Mohsan Entitlement (76,666.67) + Muzzmal Entitlement (173,333.33) + Employee Owed (5,000)
// 76,666.67 + 173,333.33 + 5,000 = 255,000! Perfectly balanced!
const totalLiabilitiesAndEquities = p1Entitlement + p2Entitlement + empOwed;
console.log('Sum of Entitlements + Liabilities:', totalLiabilitiesAndEquities.toFixed(2));
console.log('Accounting Balance Check:', (cashBal - totalLiabilitiesAndEquities < 0.01) ? 'PERFECT BALANCE ✅' : 'MISMATCH ❌');
