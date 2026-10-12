/**
 * Partnership Accounting Calculator - Core Engine & UI Controller
 */

// State Object
const AppState = {
  settings: {
    currencySymbol: 'Rs. ',
    partners: [
      { id: 'p1', name: 'Mohsan', shareNum: 1, shareDenom: 3, percentage: 33.333333, openingBalance: 0, openingCapital: 0, openingLoan: 0 },
      { id: 'p2', name: 'Muzzmal', shareNum: 2, shareDenom: 3, percentage: 66.666667, openingBalance: 0, openingCapital: 0, openingLoan: 0 }
    ]
  },
  accounts: [
    { id: 'acc_cash', name: 'Business Cash', type: 'business_cash', openingBalance: 0 },
    { id: 'acc_bank', name: 'Business Bank', type: 'business_bank', openingBalance: 0 },
    { id: 'acc_p1', name: "Mohsan's Personal Funds", type: 'partner_pocket', partnerId: 'p1', openingBalance: 0 },
    { id: 'acc_p2', name: "Muzzmal's Personal Funds", type: 'partner_pocket', partnerId: 'p2', openingBalance: 0 },
    { id: 'acc_emp', name: 'Employee-held Cash', type: 'employee_cash', openingBalance: 0 }
  ],
  categories: {
    income: ['Sales', 'Services', 'Customer Payments', 'Other Income'],
    expense: ['Salaries', 'Rent', 'Utilities', 'Transport', 'Inventory', 'Purchases', 'Repairs', 'Food', 'Office Expenses', 'Employee Expenses', 'Other Expenses']
  },
  employees: [
    { id: 'emp_1', name: 'Ali Khan', phone: '0300-1234567', title: 'Operations Lead', openingAdvance: 0, notes: 'Default field staff' }
  ],
  transactions: [],
  filters: {
    dateRange: 'all',
    startDate: '',
    endDate: '',
    search: ''
  },
  activeTab: 'dashboard'
};

const STORAGE_KEY = 'partnership_calculator_data_v1';

// Helpers
function formatPKR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
  const isNegative = amount < 0;
  const absFormatted = Math.abs(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return (isNegative ? '-' : '') + AppState.settings.currencySymbol + absFormatted;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateId(prefix = 'tx') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Storage Management
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.settings) AppState.settings = parsed.settings;
      if (parsed.accounts) AppState.accounts = parsed.accounts;
      if (parsed.categories) AppState.categories = parsed.categories;
      if (parsed.employees) AppState.employees = parsed.employees;
      if (parsed.transactions) AppState.transactions = parsed.transactions;
    }
  } catch (err) {
    console.error('Failed to load local storage:', err);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      settings: AppState.settings,
      accounts: AppState.accounts,
      categories: AppState.categories,
      employees: AppState.employees,
      transactions: AppState.transactions
    }));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
    showToast('Failed to save data to local storage!', 'danger');
  }
}

// Core Calculations
function calculateAllFinancials(filterOpts = null) {
  const txs = filterTransactions(filterOpts || AppState.filters);
  const partners = AppState.settings.partners;

  // 1. Business Income
  let totalIncome = 0;
  // 2. Business Approved Expenses
  let totalExpenses = 0;
  
  // Categorized Income & Expenses
  const incomeByCategory = {};
  const expenseByCategory = {};

  // Partner Personal Spending
  const partnerPersonalExpense = {};
  const partnerCapitalContrib = {};
  const partnerLoans = {};
  const partnerWithdrawals = {};
  const partnerReimbursements = {};
  const partnerLoanRepayments = {};
  const partnerFundedAdvances = {};

  partners.forEach(p => {
    partnerPersonalExpense[p.id] = 0;
    partnerCapitalContrib[p.id] = 0;
    partnerLoans[p.id] = 0;
    partnerWithdrawals[p.id] = 0;
    partnerReimbursements[p.id] = 0;
    partnerLoanRepayments[p.id] = 0;
    partnerFundedAdvances[p.id] = 0;
  });

  // Employee Balances
  const employeeBalances = {};
  const employeeOwed = {}; // Reimbursement liabilities owed to employees
  AppState.employees.forEach(e => {
    employeeBalances[e.id] = Number(e.openingAdvance) || 0;
    employeeOwed[e.id] = 0;
  });

  // Account Balances
  const accountBalances = {};
  AppState.accounts.forEach(acc => {
    accountBalances[acc.id] = {
      opening: Number(acc.openingBalance) || 0,
      received: 0,
      paid: 0,
      transfersIn: 0,
      transfersOut: 0,
      current: Number(acc.openingBalance) || 0
    };
  });

  // Process all transactions
  txs.forEach(tx => {
    const amt = Number(tx.amount) || 0;

    switch (tx.type) {
      case 'income': {
        totalIncome += amt;
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + amt;
        if (tx.receivingAccount && accountBalances[tx.receivingAccount]) {
          accountBalances[tx.receivingAccount].received += amt;
          accountBalances[tx.receivingAccount].current += amt;
        }
        break;
      }

      case 'expense': {
        totalExpenses += amt;
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + amt;

        // Check who paid
        if (tx.paidBy === 'p1_personal') {
          partnerPersonalExpense['p1'] = (partnerPersonalExpense['p1'] || 0) + amt;
        } else if (tx.paidBy === 'p2_personal') {
          partnerPersonalExpense['p2'] = (partnerPersonalExpense['p2'] || 0) + amt;
        } else if (tx.paidBy === 'employee_personal') {
          // Employee paid from personal pocket -> creates reimbursement liability
          if (tx.paidByPersonId && employeeOwed[tx.paidByPersonId] !== undefined) {
            employeeOwed[tx.paidByPersonId] += amt;
          }
        } else if (tx.paidBy === 'employee_advance') {
          // Spent from existing advance
          if (tx.paidByPersonId && employeeBalances[tx.paidByPersonId] !== undefined) {
            employeeBalances[tx.paidByPersonId] -= amt;
          }
          if (accountBalances['acc_emp']) {
            accountBalances['acc_emp'].paid += amt;
            accountBalances['acc_emp'].current -= amt;
          }
        } else if (tx.paymentSourceAccount && accountBalances[tx.paymentSourceAccount]) {
          // Paid directly from business cash/bank
          accountBalances[tx.paymentSourceAccount].paid += amt;
          accountBalances[tx.paymentSourceAccount].current -= amt;
        }
        break;
      }

      case 'employee_advance': {
        // Giving an advance is NOT an expense. It moves money to employee.
        if (tx.employeeId && employeeBalances[tx.employeeId] !== undefined) {
          employeeBalances[tx.employeeId] += amt;
        }

        if (tx.paidBy === 'p1_personal') {
          partnerFundedAdvances['p1'] = (partnerFundedAdvances['p1'] || 0) + amt;
        } else if (tx.paidBy === 'p2_personal') {
          partnerFundedAdvances['p2'] = (partnerFundedAdvances['p2'] || 0) + amt;
        } else if (tx.sourceAccount && accountBalances[tx.sourceAccount]) {
          accountBalances[tx.sourceAccount].transfersOut += amt;
          accountBalances[tx.sourceAccount].current -= amt;
          if (accountBalances['acc_emp']) {
            accountBalances['acc_emp'].transfersIn += amt;
            accountBalances['acc_emp'].current += amt;
          }
        }
        break;
      }

      case 'employee_settlement': {
        // Employee settlements can include: approved business expense, cash returned, personal money used
        const spent = Number(tx.amountSpent) || 0;
        const advUsed = Number(tx.advanceUsed) || 0;
        const personalUsed = Number(tx.personalMoneyUsed) || 0;
        const returned = Number(tx.cashReturned) || 0;

        // Approved expense portion
        if (spent > 0) {
          totalExpenses += spent;
          const cat = tx.category || 'Employee Expenses';
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + spent;
        }

        // Adjust employee advance balance: - advUsed - returned
        if (tx.employeeId && employeeBalances[tx.employeeId] !== undefined) {
          employeeBalances[tx.employeeId] -= (advUsed + returned);
          if (personalUsed > 0) {
            employeeOwed[tx.employeeId] += personalUsed;
          }
        }

        // Return cash to business cash
        if (returned > 0 && accountBalances['acc_cash']) {
          accountBalances['acc_cash'].received += returned;
          accountBalances['acc_cash'].current += returned;
          if (accountBalances['acc_emp']) {
            accountBalances['acc_emp'].paid += returned;
            accountBalances['acc_emp'].current -= returned;
          }
        }
        break;
      }

      case 'employee_reimbursement': {
        // Business pays back employee for personal money used
        if (tx.employeeId && employeeOwed[tx.employeeId] !== undefined) {
          employeeOwed[tx.employeeId] -= amt;
        }
        if (tx.sourceAccount && accountBalances[tx.sourceAccount]) {
          accountBalances[tx.sourceAccount].paid += amt;
          accountBalances[tx.sourceAccount].current -= amt;
        }
        break;
      }

      case 'partner_transaction': {
        const pid = tx.partnerId;
        if (pid) {
          if (tx.subType === 'capital_contribution') {
            partnerCapitalContrib[pid] = (partnerCapitalContrib[pid] || 0) + amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].received += amt;
              accountBalances[tx.accountId].current += amt;
            }
          } else if (tx.subType === 'capital_withdrawal') {
            partnerCapitalContrib[pid] = (partnerCapitalContrib[pid] || 0) - amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].paid += amt;
              accountBalances[tx.accountId].current -= amt;
            }
          } else if (tx.subType === 'partner_loan') {
            partnerLoans[pid] = (partnerLoans[pid] || 0) + amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].received += amt;
              accountBalances[tx.accountId].current += amt;
            }
          } else if (tx.subType === 'loan_repayment') {
            partnerLoanRepayments[pid] = (partnerLoanRepayments[pid] || 0) + amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].paid += amt;
              accountBalances[tx.accountId].current -= amt;
            }
          } else if (tx.subType === 'drawings') {
            partnerWithdrawals[pid] = (partnerWithdrawals[pid] || 0) + amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].paid += amt;
              accountBalances[tx.accountId].current -= amt;
            }
          } else if (tx.subType === 'reimbursement_received') {
            partnerReimbursements[pid] = (partnerReimbursements[pid] || 0) + amt;
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].paid += amt;
              accountBalances[tx.accountId].current -= amt;
            }
          } else if (tx.subType === 'transfer_to_business') {
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].transfersIn += amt;
              accountBalances[tx.accountId].current += amt;
            }
          } else if (tx.subType === 'transfer_from_business') {
            if (tx.accountId && accountBalances[tx.accountId]) {
              accountBalances[tx.accountId].transfersOut += amt;
              accountBalances[tx.accountId].current -= amt;
            }
          }
        }
        break;
      }

      case 'transfer': {
        if (tx.fromAccountId && accountBalances[tx.fromAccountId]) {
          accountBalances[tx.fromAccountId].transfersOut += amt;
          accountBalances[tx.fromAccountId].current -= amt;
        }
        if (tx.toAccountId && accountBalances[tx.toAccountId]) {
          accountBalances[tx.toAccountId].transfersIn += amt;
          accountBalances[tx.toAccountId].current += amt;
        }
        break;
      }

      case 'settlement_payment': {
        // e.g. Partner pays partner or business pays partner
        if (tx.fromType === 'partner' && tx.toType === 'partner') {
          // Partner A paid Partner B directly
          // A's entitlement increases by amt (or B's decreases by amt)
          partnerReimbursements[tx.toId] = (partnerReimbursements[tx.toId] || 0) + amt;
          partnerPersonalExpense[tx.fromId] = (partnerPersonalExpense[tx.fromId] || 0) + amt;
        } else if (tx.fromType === 'business' && tx.toType === 'partner') {
          // Business paid Partner
          partnerReimbursements[tx.toId] = (partnerReimbursements[tx.toId] || 0) + amt;
          if (tx.paymentMethodAccount && accountBalances[tx.paymentMethodAccount]) {
            accountBalances[tx.paymentMethodAccount].paid += amt;
            accountBalances[tx.paymentMethodAccount].current -= amt;
          }
        }
        break;
      }
    }
  });

  // Profit / Loss calculation
  const netProfitOrLoss = totalIncome - totalExpenses;

  // Total Business Cash Available (Business Cash + Business Bank)
  const cashBal = (accountBalances['acc_cash'] ? accountBalances['acc_cash'].current : 0);
  const bankBal = (accountBalances['acc_bank'] ? accountBalances['acc_bank'].current : 0);
  const totalCashAvailable = cashBal + bankBal;

  // Partner Shares & Entitlements
  const partnerSummaries = {};
  partners.forEach(p => {
    // Exact fraction calculation
    const profitShare = (netProfitOrLoss * p.shareNum) / p.shareDenom;
    const personalExpenses = partnerPersonalExpense[p.id] || 0;
    const fundedAdvances = partnerFundedAdvances[p.id] || 0;
    const eligiblePersonalPayments = personalExpenses + fundedAdvances;
    
    const capitalContrib = (Number(p.openingCapital) || 0) + (partnerCapitalContrib[p.id] || 0);
    const newLoans = partnerLoans[p.id] || 0;
    const loanRepayments = partnerLoanRepayments[p.id] || 0;
    const netLoanBalance = (Number(p.openingLoan) || 0) + newLoans - loanRepayments;

    const withdrawals = partnerWithdrawals[p.id] || 0;
    const reimbursements = partnerReimbursements[p.id] || 0;
    const openingBal = Number(p.openingBalance) || 0;

    // Closing Business Entitlement Formula from Section 9:
    // Opening Partner Balance
    // + Allocated Profit or Loss
    // + Eligible Personal Business Expenses Paid (and partner funded advances)
    // + Capital Contributions
    // + New Partner Loans
    // - Personal Withdrawals
    // - Reimbursements Received
    // - Capital Returned (handled in partnerCapitalContrib)
    // - Partner Loan Repayments Received.
    const closingEntitlement = openingBal 
      + profitShare 
      + eligiblePersonalPayments 
      + capitalContrib 
      + newLoans 
      - withdrawals 
      - reimbursements 
      - loanRepayments;

    // Operational Settlement Balance (excluding long-term capital & loans):
    // Profit Share + Eligible Personal Payments Paid - Withdrawals - Reimbursements + OpeningBal
    const operationalSettlement = openingBal + profitShare + eligiblePersonalPayments - withdrawals - reimbursements;

    partnerSummaries[p.id] = {
      partner: p,
      profitShare,
      personalExpenses,
      fundedAdvances,
      eligiblePersonalPayments,
      capitalContrib,
      newLoans,
      loanRepayments,
      netLoanBalance,
      withdrawals,
      reimbursements,
      openingBal,
      closingEntitlement,
      operationalSettlement
    };
  });

  // Calculate Employee Total Advance Balance & Total Reimbursement Owed
  let totalEmployeeAdvanceBalance = 0;
  let totalEmployeeOwed = 0;
  Object.values(employeeBalances).forEach(b => { totalEmployeeAdvanceBalance += b; });
  Object.values(employeeOwed).forEach(b => { totalEmployeeOwed += b; });

  return {
    totalIncome,
    totalExpenses,
    netProfitOrLoss,
    totalCashAvailable,
    incomeByCategory,
    expenseByCategory,
    partnerSummaries,
    employeeBalances,
    employeeOwed,
    totalEmployeeAdvanceBalance,
    totalEmployeeOwed,
    accountBalances
  };
}

// Filter transactions by date & search query
function filterTransactions(filters) {
  let list = AppState.transactions.slice();

  // Date Range Filtering
  const today = getTodayString();
  const now = new Date();

  if (filters.dateRange === 'today') {
    list = list.filter(t => t.date === today);
  } else if (filters.dateRange === 'this_month') {
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    list = list.filter(t => t.date >= startOfMonth && t.date <= today);
  } else if (filters.dateRange === 'last_month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${lastDayPrevMonth.getFullYear()}-${String(lastDayPrevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayPrevMonth.getDate()).padStart(2, '0')}`;
    list = list.filter(t => t.date >= startStr && t.date <= endStr);
  } else if (filters.dateRange === 'this_year') {
    const startOfYear = `${now.getFullYear()}-01-01`;
    list = list.filter(t => t.date >= startOfYear && t.date <= today);
  } else if (filters.dateRange === 'custom') {
    if (filters.startDate) {
      list = list.filter(t => t.date >= filters.startDate);
    }
    if (filters.endDate) {
      list = list.filter(t => t.date <= filters.endDate);
    }
  }

  // Search Filter
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      const vendor = (t.vendor || '').toLowerCase();
      const cust = (t.customerName || '').toLowerCase();
      const ref = (t.referenceNo || t.receiptNo || '').toLowerCase();
      return desc.includes(q) || cat.includes(q) || notes.includes(q) || vendor.includes(q) || cust.includes(q) || ref.includes(q);
    });
  }

  // Sort descending by date
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
  return list;
}

// UI Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Global modal handling
let currentConfirmCallback = null;
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalBody').textContent = message;
  currentConfirmCallback = onConfirm;
  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  currentConfirmCallback = null;
}

// Export / Import Functions
function exportDataToJSON() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(AppState, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `partnership_accounts_backup_${getTodayString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Database exported successfully as JSON!', 'success');
}

function triggerImportJSON() {
  document.getElementById('importFileInput').click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  showConfirmModal(
    'Warning: Overwrite Existing Data',
    'Importing this file will overwrite your current transactions, employees, and settings. Are you completely sure you want to proceed?',
    () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.settings && parsed.transactions) {
            AppState.settings = parsed.settings;
            AppState.accounts = parsed.accounts || AppState.accounts;
            AppState.categories = parsed.categories || AppState.categories;
            AppState.employees = parsed.employees || AppState.employees;
            AppState.transactions = parsed.transactions || [];
            saveState();
            refreshAllUI();
            showToast('Data imported successfully!', 'success');
          } else {
            showToast('Invalid backup file structure.', 'danger');
          }
        } catch (err) {
          showToast('Failed to parse JSON file.', 'danger');
        }
      };
      reader.readAsText(file);
    }
  );
  e.target.value = '';
}

function exportToCSV(filename, rows) {
  const processRow = row => row.map(val => {
    let str = (val === null || val === undefined) ? '' : String(val);
    if (str.search(/("|,|\n)/g) >= 0) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`Exported ${filename}`, 'success');
}

// Reset All Data
function resetAllData() {
  showConfirmModal(
    'EXTREME WARNING: Reset All Data',
    'This action will permanently delete all recorded income, expenses, employee records, partner payments, and restore original factory settings. This cannot be undone! Are you sure?',
    () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  );
}

// Load Demo Data for Verification & Demonstration
function loadDemoData() {
  showConfirmModal(
    'Load Realistic Demo Scenario',
    'This will populate comprehensive transactions representing the exact test scenario: Income, Mohsan & Muzzmal personal expenses, Employee advances and settlements, Personal expense by employee, Partner reimbursements, and Withdrawals. Proceed?',
    () => {
      AppState.transactions = [
        {
          id: 'demo_1',
          type: 'income',
          date: '2026-10-01',
          description: 'Client Project Alpha Milestone Payment',
          category: 'Services',
          amount: 300000,
          receivedBy: 'p1', // Mohsan received on behalf of business
          receivingAccount: 'acc_cash',
          customerName: 'Tech Innovations Ltd',
          referenceNo: 'INV-2026-001',
          notes: 'Received into Business Cash register'
        },
        {
          id: 'demo_2',
          type: 'expense',
          date: '2026-10-02',
          description: 'Office Server Equipment & Wiring',
          category: 'Office Expenses',
          amount: 30000,
          paidBy: 'p1_personal',
          paidByPersonId: 'p1',
          paymentSourceAccount: 'acc_p1',
          vendor: 'Hardware Mart',
          receiptNo: 'REC-3011',
          notes: 'Paid personally by Mohsan from his pocket'
        },
        {
          id: 'demo_3',
          type: 'expense',
          date: '2026-10-03',
          description: 'Bulk Inventory Components',
          category: 'Inventory',
          amount: 50000,
          paidBy: 'p2_personal',
          paidByPersonId: 'p2',
          paymentSourceAccount: 'acc_p2',
          vendor: 'Industrial Supplies Co',
          receiptNo: 'REC-5022',
          notes: 'Paid personally by Muzzmal from his pocket'
        },
        {
          id: 'demo_4',
          type: 'employee_advance',
          date: '2026-10-04',
          employeeId: 'emp_1',
          amount: 20000,
          paidBy: 'business_cash',
          sourceAccount: 'acc_cash',
          purpose: 'Procurement and travel advance',
          notes: 'Given to Ali Khan from business cash'
        },
        {
          id: 'demo_5',
          type: 'employee_settlement',
          date: '2026-10-05',
          employeeId: 'emp_1',
          description: 'Site Raw Materials & Local Transport',
          category: 'Purchases',
          amountSpent: 15000,
          advanceUsed: 15000,
          personalMoneyUsed: 0,
          cashReturned: 5000,
          receiptNo: 'ALI-EXP-01',
          notes: 'Ali spent Rs. 15,000 and returned remaining Rs. 5,000 cash to business'
        },
        {
          id: 'demo_6',
          type: 'expense',
          date: '2026-10-06',
          description: 'Emergency Generator Repairs',
          category: 'Repairs',
          amount: 5000,
          paidBy: 'employee_personal',
          paidByPersonId: 'emp_1',
          paymentSourceAccount: '',
          vendor: 'City Electric Works',
          receiptNo: 'REP-900',
          notes: 'Paid by Ali Khan from his own pocket on behalf of business (owed reimbursement)'
        },
        {
          id: 'demo_7',
          type: 'partner_transaction',
          subType: 'reimbursement_received',
          date: '2026-10-07',
          partnerId: 'p1',
          amount: 20000,
          accountId: 'acc_cash',
          notes: 'Business paid partial reimbursement to Mohsan from business cash'
        },
        {
          id: 'demo_8',
          type: 'partner_transaction',
          subType: 'drawings',
          date: '2026-10-08',
          partnerId: 'p2',
          amount: 10000,
          accountId: 'acc_cash',
          notes: 'Muzzmal withdrew Rs. 10,000 for personal use'
        }
      ];

      saveState();
      refreshAllUI();
      showToast('Demo scenario loaded successfully!', 'success');
    }
  );
}

// UI Refresh Controller
function refreshAllUI() {
  const fin = calculateAllFinancials();
  renderDashboard(fin);
  renderIncomeLedger();
  renderExpenseLedger();
  renderPartnersSection(fin);
  renderEmployeesSection(fin);
  renderAccountsSection(fin);
  renderSettlementSection(fin);
  renderReportsSection(fin);
  renderSettingsSection();
  populateDropdowns();
}

// Switch Tab
function switchTab(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('active', el.id === `tab-${tabId}`);
  });
  const titles = {
    dashboard: 'Financial Dashboard',
    income: 'Income Management',
    expenses: 'Business Expense Management',
    partners: 'Partners & Ownership Shares',
    employees: 'Employee Advances & Settlements',
    accounts: 'Cash & Bank Accounts',
    settlement: 'Partner Settlement Calculator',
    reports: 'Financial Reports & Statements',
    settings: 'System Configuration & Ratios'
  };
  document.getElementById('current-page-title').textContent = titles[tabId] || 'Dashboard';
  refreshAllUI();
}

// Populate Dynamic Select Dropdowns across all forms
function populateDropdowns() {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];

  // Income Received By
  const incReceivedBy = document.getElementById('incReceivedBy');
  if (incReceivedBy) {
    const prev = incReceivedBy.value;
    incReceivedBy.innerHTML = `
      <option value="${p1.id}">${p1.name} (Partner)</option>
      <option value="${p2.id}">${p2.name} (Partner)</option>
      <option value="business_cash">Business Cash Counter</option>
      ${AppState.employees.map(e => `<option value="${e.id}">${e.name} (Employee)</option>`).join('')}
    `;
    if (prev) incReceivedBy.value = prev;
  }

  // Income Category
  const incCat = document.getElementById('incCategory');
  if (incCat) {
    incCat.innerHTML = AppState.categories.income.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Expense Category
  const expCat = document.getElementById('expCategory');
  if (expCat) {
    expCat.innerHTML = AppState.categories.expense.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Receiving Accounts (Income)
  const incAccount = document.getElementById('incReceivingAccount');
  if (incAccount) {
    incAccount.innerHTML = AppState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }

  // Expense Paid By
  const expPaidBy = document.getElementById('expPaidBy');
  if (expPaidBy) {
    const prev = expPaidBy.value;
    expPaidBy.innerHTML = `
      <option value="business_cash">Business Cash</option>
      <option value="business_bank">Business Bank Account</option>
      <option value="p1_personal">${p1.name} from personal pocket</option>
      <option value="p2_personal">${p2.name} from personal pocket</option>
      <option value="employee_advance">Employee using advance</option>
      <option value="employee_personal">Employee from personal money (reimbursable)</option>
      <option value="other">Other source</option>
    `;
    if (prev) expPaidBy.value = prev;
  }

  // Expense Paid From Account
  const expAccount = document.getElementById('expPaidFromAccount');
  if (expAccount) {
    expAccount.innerHTML = AppState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }

  // Expense Employee Select
  const expEmpSelect = document.getElementById('expEmployeeSelect');
  if (expEmpSelect) {
    expEmpSelect.innerHTML = AppState.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  // Advance Employee Select
  const advEmp = document.getElementById('advEmployeeSelect');
  if (advEmp) {
    advEmp.innerHTML = AppState.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  // Advance Paid By
  const advPaidBy = document.getElementById('advPaidBy');
  if (advPaidBy) {
    advPaidBy.innerHTML = `
      <option value="business_cash">Business Cash</option>
      <option value="business_bank">Business Bank</option>
      <option value="p1_personal">${p1.name} (from personal pocket)</option>
      <option value="p2_personal">${p2.name} (from personal pocket)</option>
    `;
  }

  // Settlement Employee Select
  const stlEmp = document.getElementById('stlEmployeeSelect');
  if (stlEmp) {
    stlEmp.innerHTML = AppState.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  // Settlement Category
  const stlCat = document.getElementById('stlCategory');
  if (stlCat) {
    stlCat.innerHTML = AppState.categories.expense.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Partner Transaction Partner Select
  const ptPartner = document.getElementById('ptPartner');
  if (ptPartner) {
    ptPartner.innerHTML = `
      <option value="${p1.id}">${p1.name}</option>
      <option value="${p2.id}">${p2.name}</option>
    `;
  }

  // Partner Transaction Account
  const ptAccount = document.getElementById('ptAccount');
  if (ptAccount) {
    ptAccount.innerHTML = AppState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }

  // Transfer accounts
  const trFrom = document.getElementById('trFromAccount');
  const trTo = document.getElementById('trToAccount');
  if (trFrom && trTo) {
    const opts = AppState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    trFrom.innerHTML = opts;
    trTo.innerHTML = opts;
  }
}

// -------------------------------------------------------------------------
// 1. DASHBOARD VIEW
// -------------------------------------------------------------------------
function renderDashboard(fin) {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];

  const p1Sum = fin.partnerSummaries[p1.id];
  const p2Sum = fin.partnerSummaries[p2.id];

  // Summary Cards
  document.getElementById('card-total-income').textContent = formatPKR(fin.totalIncome);
  document.getElementById('card-total-expenses').textContent = formatPKR(fin.totalExpenses);

  const profitEl = document.getElementById('card-net-profit');
  profitEl.textContent = formatPKR(fin.netProfitOrLoss);
  profitEl.className = 'card-value ' + (fin.netProfitOrLoss >= 0 ? 'text-success' : 'text-danger');

  document.getElementById('card-cash-available').textContent = formatPKR(fin.totalCashAvailable);

  // Profit Shares
  document.getElementById('card-p1-profit-label').textContent = `${p1.name}'s Profit Share (${p1.shareNum}/${p1.shareDenom})`;
  document.getElementById('card-p1-profit').textContent = formatPKR(p1Sum.profitShare);

  document.getElementById('card-p2-profit-label').textContent = `${p2.name}'s Profit Share (${p2.shareNum}/${p2.shareDenom})`;
  document.getElementById('card-p2-profit').textContent = formatPKR(p2Sum.profitShare);

  // Personal Payments
  document.getElementById('card-p1-payments-label').textContent = `${p1.name}'s Personal Payments`;
  document.getElementById('card-p1-payments').textContent = formatPKR(p1Sum.eligiblePersonalPayments);

  document.getElementById('card-p2-payments-label').textContent = `${p2.name}'s Personal Payments`;
  document.getElementById('card-p2-payments').textContent = formatPKR(p2Sum.eligiblePersonalPayments);

  // Employee advance
  document.getElementById('card-emp-advance').textContent = formatPKR(fin.totalEmployeeAdvanceBalance);

  // Amounts Receivable / Payable by Partner
  const p1Net = p1Sum.closingEntitlement;
  const p2Net = p2Sum.closingEntitlement;

  const recCard = document.getElementById('card-receivable');
  const payCard = document.getElementById('card-payable');

  let recText = [];
  let payText = [];

  if (p1Net > 0) recText.push(`${p1.name}: ${formatPKR(p1Net)}`);
  else if (p1Net < 0) payText.push(`${p1.name}: ${formatPKR(Math.abs(p1Net))}`);

  if (p2Net > 0) recText.push(`${p2.name}: ${formatPKR(p2Net)}`);
  else if (p2Net < 0) payText.push(`${p2.name}: ${formatPKR(Math.abs(p2Net))}`);

  recCard.textContent = recText.length ? recText.join(' | ') : 'None';
  payCard.textContent = payText.length ? payText.join(' | ') : 'None';

  // Dashboard Recent Activity Table
  const recentTxs = filterTransactions(AppState.filters).slice(0, 10);
  const recentTableBody = document.getElementById('dash-recent-table-body');
  if (recentTableBody) {
    if (recentTxs.length === 0) {
      recentTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--slate-400);">No transactions recorded in this period. Click "+ Add Income" or "Load Demo Data".</td></tr>`;
    } else {
      recentTableBody.innerHTML = recentTxs.map(t => {
        let badgeClass = 'badge-primary';
        let typeLabel = t.type;
        if (t.type === 'income') { badgeClass = 'badge-income'; typeLabel = 'Income'; }
        else if (t.type === 'expense') { badgeClass = 'badge-expense'; typeLabel = 'Expense'; }
        else if (t.type === 'employee_advance') { badgeClass = 'badge-advance'; typeLabel = 'Advance'; }
        else if (t.type === 'employee_settlement') { badgeClass = 'badge-advance'; typeLabel = 'Settlement'; }
        else if (t.type === 'partner_transaction') { badgeClass = 'badge-partner'; typeLabel = 'Partner Tx'; }
        else if (t.type === 'transfer') { badgeClass = 'badge-transfer'; typeLabel = 'Transfer'; }

        return `
          <tr>
            <td><strong>${formatDate(t.date)}</strong></td>
            <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
            <td>${t.description || '-'}</td>
            <td>${t.category || '-'}</td>
            <td class="text-right"><strong>${formatPKR(t.amount || t.amountSpent || 0)}</strong></td>
            <td class="text-right">
              <button class="btn btn-sm btn-secondary" onclick="deleteTransaction('${t.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Settlement Quick Callout
  renderSettlementCallout(fin);
}

function renderSettlementCallout(fin) {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];
  const p1Sum = fin.partnerSummaries[p1.id];
  const p2Sum = fin.partnerSummaries[p2.id];

  const calloutEl = document.getElementById('dash-settlement-instruction');
  if (!calloutEl) return;

  const p1Ent = p1Sum.operationalSettlement;
  const p2Ent = p2Sum.operationalSettlement;
  const cash = fin.totalCashAvailable;

  let text = '';
  // Check if business has enough cash to pay positive entitlements
  const positiveEntitlements = (p1Ent > 0 ? p1Ent : 0) + (p2Ent > 0 ? p2Ent : 0);

  if (cash >= positiveEntitlements && positiveEntitlements > 0) {
    text = `Business Cash (${formatPKR(cash)}) is sufficient to reimburse partners directly: `;
    if (p1Ent > 0) text += `Pay ${p1.name} ${formatPKR(p1Ent)}. `;
    if (p2Ent > 0) text += `Pay ${p2.name} ${formatPKR(p2Ent)}. `;
  } else if (p1Ent > 0 && p2Ent < 0) {
    const settlementAmt = Math.min(p1Ent, Math.abs(p2Ent));
    text = `${p2.name} should pay ${p1.name} ${formatPKR(settlementAmt)}.`;
    if (cash > 0) {
      text += ` (Remaining ${formatPKR(p1Ent - settlementAmt)} can be paid from available business cash).`;
    }
  } else if (p2Ent > 0 && p1Ent < 0) {
    const settlementAmt = Math.min(p2Ent, Math.abs(p1Ent));
    text = `${p1.name} should pay ${p2.name} ${formatPKR(settlementAmt)}.`;
    if (cash > 0) {
      text += ` (Remaining ${formatPKR(p2Ent - settlementAmt)} can be paid from available business cash).`;
    }
  } else if (p1Ent === 0 && p2Ent === 0) {
    text = `All partner accounts are completely balanced. No settlement needed.`;
  } else {
    text = `Partner balances: ${p1.name}: ${formatPKR(p1Ent)}, ${p2.name}: ${formatPKR(p2Ent)}. Available Business Cash: ${formatPKR(cash)}.`;
  }

  calloutEl.textContent = text;
}

// -------------------------------------------------------------------------
// 2. INCOME MANAGEMENT
// -------------------------------------------------------------------------
function renderIncomeLedger() {
  const tableBody = document.getElementById('income-ledger-body');
  if (!tableBody) return;

  const incomeTxs = filterTransactions(AppState.filters).filter(t => t.type === 'income');

  if (incomeTxs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--slate-400);">No income records found. Fill the form above to add business income.</td></tr>`;
    return;
  }

  tableBody.innerHTML = incomeTxs.map(tx => {
    let recByName = tx.receivedBy;
    const p = AppState.settings.partners.find(x => x.id === tx.receivedBy);
    if (p) recByName = `${p.name} (Partner)`;
    else if (tx.receivedBy === 'business_cash') recByName = 'Business Cash Register';
    else {
      const emp = AppState.employees.find(e => e.id === tx.receivedBy);
      if (emp) recByName = `${emp.name} (Employee)`;
    }

    const acc = AppState.accounts.find(a => a.id === tx.receivingAccount);
    const accName = acc ? acc.name : '-';

    return `
      <tr>
        <td><strong>${formatDate(tx.date)}</strong></td>
        <td>${tx.description}</td>
        <td><span class="badge badge-income">${tx.category}</span></td>
        <td class="text-right"><strong>${formatPKR(tx.amount)}</strong></td>
        <td>${recByName}</td>
        <td>${accName}</td>
        <td>${tx.customerName || '-'}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-secondary" onclick="editIncome('${tx.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${tx.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAddIncome(e) {
  e.preventDefault();
  const id = document.getElementById('incomeEditId').value || generateId('inc');
  const date = document.getElementById('incDate').value;
  const description = document.getElementById('incDescription').value.trim();
  const amount = parseFloat(document.getElementById('incAmount').value);
  const category = document.getElementById('incCategory').value;
  const receivedBy = document.getElementById('incReceivedBy').value;
  const receivingAccount = document.getElementById('incReceivingAccount').value;
  const customerName = document.getElementById('incCustomerName').value.trim();
  const referenceNo = document.getElementById('incReferenceNo').value.trim();
  const notes = document.getElementById('incNotes').value.trim();

  if (!date || !description || isNaN(amount) || amount <= 0) {
    showToast('Please fill all required fields with a valid positive amount.', 'danger');
    return;
  }

  const existingIdx = AppState.transactions.findIndex(t => t.id === id);
  const txObj = {
    id,
    type: 'income',
    date,
    description,
    amount,
    category,
    receivedBy,
    receivingAccount,
    customerName,
    referenceNo,
    notes
  };

  if (existingIdx >= 0) {
    AppState.transactions[existingIdx] = txObj;
    showToast('Income updated successfully!', 'success');
  } else {
    AppState.transactions.push(txObj);
    showToast('Income recorded successfully!', 'success');
  }

  saveState();
  document.getElementById('incomeForm').reset();
  document.getElementById('incomeEditId').value = '';
  document.getElementById('incDate').value = getTodayString();
  refreshAllUI();
}

function editIncome(id) {
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('incomeEditId').value = tx.id;
  document.getElementById('incDate').value = tx.date;
  document.getElementById('incDescription').value = tx.description;
  document.getElementById('incAmount').value = tx.amount;
  document.getElementById('incCategory').value = tx.category;
  document.getElementById('incReceivedBy').value = tx.receivedBy;
  document.getElementById('incReceivingAccount').value = tx.receivingAccount;
  document.getElementById('incCustomerName').value = tx.customerName || '';
  document.getElementById('incReferenceNo').value = tx.referenceNo || '';
  document.getElementById('incNotes').value = tx.notes || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------------------
// 3. BUSINESS EXPENSE MANAGEMENT
// -------------------------------------------------------------------------
function renderExpenseLedger() {
  const tableBody = document.getElementById('expense-ledger-body');
  if (!tableBody) return;

  const expTxs = filterTransactions(AppState.filters).filter(t => t.type === 'expense');

  if (expTxs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--slate-400);">No business expenses found. Fill the form above to record an expense.</td></tr>`;
    return;
  }

  tableBody.innerHTML = expTxs.map(tx => {
    let payerDisplay = tx.paidBy;
    if (tx.paidBy === 'p1_personal') payerDisplay = `${AppState.settings.partners[0].name} (Personal Pocket)`;
    else if (tx.paidBy === 'p2_personal') payerDisplay = `${AppState.settings.partners[1].name} (Personal Pocket)`;
    else if (tx.paidBy === 'business_cash') payerDisplay = 'Business Cash';
    else if (tx.paidBy === 'business_bank') payerDisplay = 'Business Bank Account';
    else if (tx.paidBy === 'employee_advance') {
      const emp = AppState.employees.find(e => e.id === tx.paidByPersonId);
      payerDisplay = `${emp ? emp.name : 'Employee'} (From Advance)`;
    } else if (tx.paidBy === 'employee_personal') {
      const emp = AppState.employees.find(e => e.id === tx.paidByPersonId);
      payerDisplay = `${emp ? emp.name : 'Employee'} (Personal Money - Reimbursable)`;
    }

    return `
      <tr>
        <td><strong>${formatDate(tx.date)}</strong></td>
        <td>${tx.description}</td>
        <td><span class="badge badge-expense">${tx.category}</span></td>
        <td class="text-right"><strong>${formatPKR(tx.amount)}</strong></td>
        <td>${payerDisplay}</td>
        <td>${tx.vendor || '-'}</td>
        <td>${tx.receiptNo || '-'}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-secondary" onclick="editExpense('${tx.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${tx.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAddExpense(e) {
  e.preventDefault();
  const id = document.getElementById('expenseEditId').value || generateId('exp');
  const date = document.getElementById('expDate').value;
  const description = document.getElementById('expDescription').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;
  const paidBy = document.getElementById('expPaidBy').value;
  const paidFromAccount = document.getElementById('expPaidFromAccount').value;
  const vendor = document.getElementById('expVendor').value.trim();
  const receiptNo = document.getElementById('expReceiptNo').value.trim();
  const notes = document.getElementById('expNotes').value.trim();

  let paidByPersonId = '';
  if (paidBy === 'p1_personal') paidByPersonId = AppState.settings.partners[0].id;
  else if (paidBy === 'p2_personal') paidByPersonId = AppState.settings.partners[1].id;
  else if (paidBy === 'employee_advance' || paidBy === 'employee_personal') {
    paidByPersonId = document.getElementById('expEmployeeSelect').value;
  }

  if (!date || !description || isNaN(amount) || amount <= 0) {
    showToast('Please fill all required fields with a valid positive amount.', 'danger');
    return;
  }

  const existingIdx = AppState.transactions.findIndex(t => t.id === id);
  const txObj = {
    id,
    type: 'expense',
    date,
    description,
    amount,
    category,
    paidBy,
    paidByPersonId,
    paymentSourceAccount: paidFromAccount,
    vendor,
    receiptNo,
    notes
  };

  if (existingIdx >= 0) {
    AppState.transactions[existingIdx] = txObj;
    showToast('Expense updated successfully!', 'success');
  } else {
    AppState.transactions.push(txObj);
    showToast('Expense recorded successfully!', 'success');
  }

  saveState();
  document.getElementById('expenseForm').reset();
  document.getElementById('expenseEditId').value = '';
  document.getElementById('expDate').value = getTodayString();
  refreshAllUI();
}

function editExpense(id) {
  const tx = AppState.transactions.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('expenseEditId').value = tx.id;
  document.getElementById('expDate').value = tx.date;
  document.getElementById('expDescription').value = tx.description;
  document.getElementById('expAmount').value = tx.amount;
  document.getElementById('expCategory').value = tx.category;
  document.getElementById('expPaidBy').value = tx.paidBy;
  toggleExpEmployeeDropdown();
  if (tx.paidByPersonId) {
    document.getElementById('expEmployeeSelect').value = tx.paidByPersonId;
  }
  document.getElementById('expPaidFromAccount').value = tx.paymentSourceAccount || '';
  document.getElementById('expVendor').value = tx.vendor || '';
  document.getElementById('expReceiptNo').value = tx.receiptNo || '';
  document.getElementById('expNotes').value = tx.notes || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleExpEmployeeDropdown() {
  const paidBy = document.getElementById('expPaidBy').value;
  const empGroup = document.getElementById('expEmployeeGroup');
  if (paidBy === 'employee_advance' || paidBy === 'employee_personal') {
    empGroup.style.display = 'flex';
  } else {
    empGroup.style.display = 'none';
  }
}

// -------------------------------------------------------------------------
// 4. EMPLOYEE & CASH ADVANCE MANAGEMENT
// -------------------------------------------------------------------------
function renderEmployeesSection(fin) {
  const listEl = document.getElementById('employee-cards-container');
  if (!listEl) return;

  listEl.innerHTML = AppState.employees.map(emp => {
    const advanceBal = fin.employeeBalances[emp.id] || 0;
    const owedBal = fin.employeeOwed[emp.id] || 0;

    return `
      <div class="card card-accent-warning">
        <div class="card-title">
          <span>${emp.name}</span>
          <span class="badge ${advanceBal > 0 ? 'badge-advance' : 'badge-income'}">
            ${advanceBal > 0 ? 'Advance Active' : 'Clear'}
          </span>
        </div>
        <div style="font-size: 12px; color: var(--slate-500); margin-bottom: 8px;">
          ${emp.title || 'Staff'} ${emp.phone ? '• ' + emp.phone : ''}
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Advance Held:</span>
          <strong>${formatPKR(advanceBal)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Reimbursement Owed:</span>
          <strong class="${owedBal > 0 ? 'text-danger' : ''}">${formatPKR(owedBal)}</strong>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          ${owedBal > 0 ? `<button class="btn btn-sm btn-success" onclick="quickReimburseEmployee('${emp.id}', ${owedBal})">Pay Reimbursement</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="deleteEmployee('${emp.id}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  // Employee Ledger
  const ledgerEl = document.getElementById('employee-ledger-body');
  if (ledgerEl) {
    const empTxs = AppState.transactions.filter(t => 
      t.type === 'employee_advance' || 
      t.type === 'employee_settlement' || 
      t.type === 'employee_reimbursement' ||
      (t.type === 'expense' && (t.paidBy === 'employee_advance' || t.paidBy === 'employee_personal'))
    );

    if (empTxs.length === 0) {
      ledgerEl.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--slate-400);">No employee transactions recorded yet.</td></tr>`;
    } else {
      ledgerEl.innerHTML = empTxs.map(t => {
        const emp = AppState.employees.find(e => e.id === (t.employeeId || t.paidByPersonId));
        const empName = emp ? emp.name : 'Unknown';
        let typeStr = t.type;
        let amt = t.amount || 0;
        let details = t.notes || t.description || '-';

        if (t.type === 'employee_advance') {
          typeStr = '<span class="badge badge-advance">Advance Given</span>';
        } else if (t.type === 'employee_settlement') {
          typeStr = '<span class="badge badge-income">Settlement</span>';
          amt = t.amountSpent;
          details = `Spent: ${formatPKR(t.amountSpent)}, Returned: ${formatPKR(t.cashReturned)}, Personal: ${formatPKR(t.personalMoneyUsed)}`;
        } else if (t.type === 'employee_reimbursement') {
          typeStr = '<span class="badge badge-transfer">Reimbursement Paid</span>';
        } else if (t.type === 'expense') {
          typeStr = `<span class="badge badge-expense">${t.paidBy === 'employee_advance' ? 'Exp (Advance)' : 'Exp (Personal)'}</span>`;
        }

        return `
          <tr>
            <td><strong>${formatDate(t.date)}</strong></td>
            <td>${empName}</td>
            <td>${typeStr}</td>
            <td class="text-right"><strong>${formatPKR(amt)}</strong></td>
            <td>${details}</td>
            <td class="text-right">
              <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

function handleAddEmployee(e) {
  e.preventDefault();
  const name = document.getElementById('newEmpName').value.trim();
  const phone = document.getElementById('newEmpPhone').value.trim();
  const title = document.getElementById('newEmpTitle').value.trim();
  const openingAdvance = parseFloat(document.getElementById('newEmpAdvance').value) || 0;
  const notes = document.getElementById('newEmpNotes').value.trim();

  if (!name) {
    showToast('Employee name is required.', 'danger');
    return;
  }

  const newEmp = {
    id: generateId('emp'),
    name,
    phone,
    title,
    openingAdvance,
    notes
  };

  AppState.employees.push(newEmp);
  saveState();
  document.getElementById('newEmployeeForm').reset();
  refreshAllUI();
  showToast(`Employee ${name} added successfully!`, 'success');
}

function deleteEmployee(empId) {
  showConfirmModal('Delete Employee Profile', 'Are you sure you want to delete this employee profile? Existing transaction history will be preserved.', () => {
    AppState.employees = AppState.employees.filter(e => e.id !== empId);
    saveState();
    refreshAllUI();
    showToast('Employee deleted.', 'info');
  });
}

function handleGiveAdvance(e) {
  e.preventDefault();
  const date = document.getElementById('advDate').value;
  const employeeId = document.getElementById('advEmployeeSelect').value;
  const amount = parseFloat(document.getElementById('advAmount').value);
  const paidBy = document.getElementById('advPaidBy').value;
  const sourceAccount = document.getElementById('advSourceAccount').value;
  const purpose = document.getElementById('advPurpose').value.trim();
  const notes = document.getElementById('advNotes').value.trim();

  if (!date || !employeeId || isNaN(amount) || amount <= 0) {
    showToast('Please provide valid date, employee, and amount.', 'danger');
    return;
  }

  const tx = {
    id: generateId('adv'),
    type: 'employee_advance',
    date,
    employeeId,
    amount,
    paidBy,
    sourceAccount,
    purpose,
    notes
  };

  AppState.transactions.push(tx);
  saveState();
  document.getElementById('advanceForm').reset();
  document.getElementById('advDate').value = getTodayString();
  refreshAllUI();
  showToast('Cash advance registered successfully!', 'success');
}
const handleAddAdvance = handleGiveAdvance;

function handleEmployeeSettlement(e) {
  e.preventDefault();
  const date = document.getElementById('stlDate').value;
  const employeeId = document.getElementById('stlEmployeeSelect').value;
  const description = document.getElementById('stlDescription').value.trim();
  const category = document.getElementById('stlCategory').value;
  const amountSpent = parseFloat(document.getElementById('stlSpent').value) || 0;
  const advanceUsed = parseFloat(document.getElementById('stlAdvUsed').value) || 0;
  const personalMoneyUsed = parseFloat(document.getElementById('stlPersonalUsed').value) || 0;
  const cashReturned = parseFloat(document.getElementById('stlReturned').value) || 0;
  const receiptNo = document.getElementById('stlReceiptNo').value.trim();
  const notes = document.getElementById('stlNotes').value.trim();

  if (!date || !employeeId || !description) {
    showToast('Please enter date, employee, and description.', 'danger');
    return;
  }

  if (amountSpent <= 0 && cashReturned <= 0) {
    showToast('Settlement must have either approved expense amount or cash returned.', 'danger');
    return;
  }

  if (Math.abs(amountSpent - (advanceUsed + personalMoneyUsed)) > 0.01) {
    showToast('Amount Spent must equal (Advance Used + Personal Money Used).', 'danger');
    return;
  }

  const tx = {
    id: generateId('stl'),
    type: 'employee_settlement',
    date,
    employeeId,
    description,
    category,
    amountSpent,
    advanceUsed,
    personalMoneyUsed,
    cashReturned,
    receiptNo,
    notes
  };

  AppState.transactions.push(tx);
  saveState();
  document.getElementById('settlementForm').reset();
  document.getElementById('stlDate').value = getTodayString();
  refreshAllUI();
  showToast('Employee settlement recorded successfully!', 'success');
}

function quickReimburseEmployee(empId, owedAmount) {
  showConfirmModal('Pay Employee Reimbursement', `Pay Rs. ${owedAmount.toLocaleString()} reimbursement to this employee from Business Cash?`, () => {
    const tx = {
      id: generateId('reimb_emp'),
      type: 'employee_reimbursement',
      date: getTodayString(),
      employeeId: empId,
      amount: owedAmount,
      sourceAccount: 'acc_cash',
      notes: 'Paid employee reimbursement liability'
    };
    AppState.transactions.push(tx);
    saveState();
    refreshAllUI();
    showToast('Reimbursement recorded successfully!', 'success');
  });
}

// -------------------------------------------------------------------------
// 5. PARTNER PERSONAL PAYMENTS, CONTRIBUTIONS & LEDGER
// -------------------------------------------------------------------------
function renderPartnersSection(fin) {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];

  const p1Sum = fin.partnerSummaries[p1.id];
  const p2Sum = fin.partnerSummaries[p2.id];

  const p1Card = document.getElementById('partner-card-p1');
  const p2Card = document.getElementById('partner-card-p2');

  if (p1Card && p2Card) {
    p1Card.innerHTML = `
      <div class="card-title">
        <span>${p1.name} (Share: ${p1.shareNum}/${p1.shareDenom} • ${(p1.shareNum/p1.shareDenom*100).toFixed(2)}%)</span>
        <span class="badge badge-partner">Partner 1</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Allocated Profit/Loss:</span><strong>${formatPKR(p1Sum.profitShare)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Personal Expenses Paid:</span><strong>${formatPKR(p1Sum.personalExpenses)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Funded Advances:</span><strong>${formatPKR(p1Sum.fundedAdvances)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Capital Contributions:</span><strong>${formatPKR(p1Sum.capitalContrib)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Loans to Business:</span><strong>${formatPKR(p1Sum.netLoanBalance)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Personal Withdrawals:</span><strong class="text-danger">${formatPKR(p1Sum.withdrawals)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Reimbursements Received:</span><strong class="text-danger">${formatPKR(p1Sum.reimbursements)}</strong></div>
      <div style="border-top: 1px solid var(--slate-200); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between;">
        <span><strong>Net Closing Entitlement:</strong></span>
        <strong style="font-size:16px; color:${p1Sum.closingEntitlement >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatPKR(p1Sum.closingEntitlement)}
        </strong>
      </div>
    `;

    p2Card.innerHTML = `
      <div class="card-title">
        <span>${p2.name} (Share: ${p2.shareNum}/${p2.shareDenom} • ${(p2.shareNum/p2.shareDenom*100).toFixed(2)}%)</span>
        <span class="badge badge-partner">Partner 2</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Allocated Profit/Loss:</span><strong>${formatPKR(p2Sum.profitShare)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Personal Expenses Paid:</span><strong>${formatPKR(p2Sum.personalExpenses)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Funded Advances:</span><strong>${formatPKR(p2Sum.fundedAdvances)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Capital Contributions:</span><strong>${formatPKR(p2Sum.capitalContrib)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Loans to Business:</span><strong>${formatPKR(p2Sum.netLoanBalance)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Personal Withdrawals:</span><strong class="text-danger">${formatPKR(p2Sum.withdrawals)}</strong></div>
      <div style="display:flex; justify-content:space-between; margin:4px 0;"><span>Reimbursements Received:</span><strong class="text-danger">${formatPKR(p2Sum.reimbursements)}</strong></div>
      <div style="border-top: 1px solid var(--slate-200); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between;">
        <span><strong>Net Closing Entitlement:</strong></span>
        <strong style="font-size:16px; color:${p2Sum.closingEntitlement >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatPKR(p2Sum.closingEntitlement)}
        </strong>
      </div>
    `;
  }

  // Partner Ledger Table
  const pLedgerEl = document.getElementById('partner-ledger-body');
  if (pLedgerEl) {
    const partnerTxs = AppState.transactions.filter(t => 
      t.type === 'partner_transaction' || 
      (t.type === 'expense' && (t.paidBy === 'p1_personal' || t.paidBy === 'p2_personal')) ||
      (t.type === 'employee_advance' && (t.paidBy === 'p1_personal' || t.paidBy === 'p2_personal')) ||
      (t.type === 'settlement_payment' && (t.fromId === 'p1' || t.fromId === 'p2' || t.toId === 'p1' || t.toId === 'p2'))
    );

    if (partnerTxs.length === 0) {
      pLedgerEl.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--slate-400);">No partner personal entries recorded yet.</td></tr>`;
    } else {
      pLedgerEl.innerHTML = partnerTxs.map(t => {
        let pName = 'Unknown';
        let typeLabel = '';
        let amt = t.amount || 0;

        if (t.type === 'partner_transaction') {
          const p = AppState.settings.partners.find(x => x.id === t.partnerId);
          pName = p ? p.name : '-';
          typeLabel = t.subType.replace(/_/g, ' ').toUpperCase();
        } else if (t.type === 'expense') {
          pName = t.paidBy === 'p1_personal' ? p1.name : p2.name;
          typeLabel = 'PERSONAL EXPENSE PAID';
        } else if (t.type === 'employee_advance') {
          pName = t.paidBy === 'p1_personal' ? p1.name : p2.name;
          typeLabel = 'FUNDED EMPLOYEE ADVANCE';
        } else if (t.type === 'settlement_payment') {
          pName = `${t.fromId} -> ${t.toId}`;
          typeLabel = 'SETTLEMENT TRANSFER';
        }

        return `
          <tr>
            <td><strong>${formatDate(t.date)}</strong></td>
            <td><strong>${pName}</strong></td>
            <td><span class="badge badge-partner">${typeLabel}</span></td>
            <td>${t.description || t.notes || '-'}</td>
            <td class="text-right"><strong>${formatPKR(amt)}</strong></td>
            <td class="text-right">
              <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

function handleAddPartnerTransaction(e) {
  e.preventDefault();
  const date = document.getElementById('ptDate').value;
  const partnerId = document.getElementById('ptPartner').value;
  const subType = document.getElementById('ptType').value;
  const amount = parseFloat(document.getElementById('ptAmount').value);
  const accountId = document.getElementById('ptAccount').value;
  const notes = document.getElementById('ptNotes').value.trim();

  if (!date || !partnerId || isNaN(amount) || amount <= 0) {
    showToast('Please fill all required fields with a valid amount.', 'danger');
    return;
  }

  const tx = {
    id: generateId('pt'),
    type: 'partner_transaction',
    date,
    partnerId,
    subType,
    amount,
    accountId,
    notes
  };

  AppState.transactions.push(tx);
  saveState();
  document.getElementById('partnerTxForm').reset();
  document.getElementById('ptDate').value = getTodayString();
  refreshAllUI();
  showToast('Partner transaction recorded successfully!', 'success');
}

// -------------------------------------------------------------------------
// 6. CASH & BANK ACCOUNT MANAGEMENT
// -------------------------------------------------------------------------
function renderAccountsSection(fin) {
  const container = document.getElementById('accounts-cards-container');
  if (!container) return;

  container.innerHTML = AppState.accounts.map(acc => {
    const balData = fin.accountBalances[acc.id] || { opening: 0, received: 0, paid: 0, transfersIn: 0, transfersOut: 0, current: 0 };
    const isNegative = balData.current < 0;

    return `
      <div class="card ${isNegative ? 'card-accent-danger' : 'card-accent-primary'}">
        <div class="card-title">
          <span>${acc.name}</span>
          <span class="badge ${isNegative ? 'badge-expense' : 'badge-income'}">${acc.type.replace(/_/g, ' ')}</span>
        </div>
        <div class="card-value ${isNegative ? 'text-danger' : ''}">${formatPKR(balData.current)}</div>
        <div style="font-size: 11px; color: var(--slate-500); line-height: 1.6; margin-top: 8px;">
          <div>Opening: ${formatPKR(balData.opening)}</div>
          <div>Inflows: +${formatPKR(balData.received + balData.transfersIn)}</div>
          <div>Outflows: -${formatPKR(balData.paid + balData.transfersOut)}</div>
        </div>
        ${isNegative ? '<div style="color:var(--danger); font-size:11px; font-weight:bold; margin-top:4px;">⚠️ Negative balance detected!</div>' : ''}
      </div>
    `;
  }).join('');
}

function handleAddTransfer(e) {
  e.preventDefault();
  const date = document.getElementById('trDate').value;
  const fromAccountId = document.getElementById('trFromAccount').value;
  const toAccountId = document.getElementById('trToAccount').value;
  const amount = parseFloat(document.getElementById('trAmount').value);
  const description = document.getElementById('trDescription').value.trim();

  if (fromAccountId === toAccountId) {
    showToast('Source and destination accounts cannot be identical.', 'danger');
    return;
  }

  if (!date || isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid positive transfer amount.', 'danger');
    return;
  }

  const tx = {
    id: generateId('tr'),
    type: 'transfer',
    date,
    fromAccountId,
    toAccountId,
    amount,
    description: description || 'Internal Transfer',
    notes: ''
  };

  AppState.transactions.push(tx);
  saveState();
  document.getElementById('transferForm').reset();
  document.getElementById('trDate').value = getTodayString();
  refreshAllUI();
  showToast('Account transfer processed!', 'success');
}

function handleAddCustomAccount(e) {
  e.preventDefault();
  const name = document.getElementById('newAccountName').value.trim();
  const type = document.getElementById('newAccountType').value;
  const openingBalance = parseFloat(document.getElementById('newAccountBalance').value) || 0;

  if (!name) {
    showToast('Account name is required.', 'danger');
    return;
  }

  const newAcc = {
    id: generateId('acc'),
    name,
    type,
    openingBalance
  };

  AppState.accounts.push(newAcc);
  saveState();
  document.getElementById('newAccountForm').reset();
  refreshAllUI();
  showToast(`Account "${name}" created successfully!`, 'success');
}

// -------------------------------------------------------------------------
// 7. PARTNER SETTLEMENT CALCULATOR
// -------------------------------------------------------------------------
function renderSettlementSection(fin) {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];

  const p1Sum = fin.partnerSummaries[p1.id];
  const p2Sum = fin.partnerSummaries[p2.id];

  const p1Ent = p1Sum.operationalSettlement;
  const p2Ent = p2Sum.operationalSettlement;
  const cash = fin.totalCashAvailable;

  const instrEl = document.getElementById('settlement-main-instruction');
  const detailsEl = document.getElementById('settlement-breakdown-details');

  let instructionText = '';
  if (p1Ent > 0 && p2Ent < 0) {
    const amount = Math.min(p1Ent, Math.abs(p2Ent));
    instructionText = `${p2.name} should pay ${p1.name} ${formatPKR(amount)}`;
    if (cash > 0 && p1Ent > amount) {
      instructionText += ` (And Business Cash can pay remaining ${formatPKR(p1Ent - amount)})`;
    }
  } else if (p2Ent > 0 && p1Ent < 0) {
    const amount = Math.min(p2Ent, Math.abs(p1Ent));
    instructionText = `${p1.name} should pay ${p2.name} ${formatPKR(amount)}`;
    if (cash > 0 && p2Ent > amount) {
      instructionText += ` (And Business Cash can pay remaining ${formatPKR(p2Ent - amount)})`;
    }
  } else if (p1Ent > 0 && p2Ent > 0) {
    instructionText = `Both partners have positive balances. Business Cash (${formatPKR(cash)}) owes: ${p1.name} ${formatPKR(p1Ent)}, and ${p2.name} ${formatPKR(p2Ent)}.`;
  } else if (p1Ent === 0 && p2Ent === 0) {
    instructionText = `Both partners are fully settled. No payment required.`;
  } else {
    instructionText = `Settlement status: ${p1.name}: ${formatPKR(p1Ent)} | ${p2.name}: ${formatPKR(p2Ent)}. Available Cash: ${formatPKR(cash)}.`;
  }

  if (instrEl) instrEl.textContent = instructionText;

  if (detailsEl) {
    detailsEl.innerHTML = `
      <div class="calc-breakdown">
========================================================================
             DETAILED PARTNER SETTLEMENT ARITHMETIC
========================================================================

1. PROFIT / LOSS ALLOCATION:
   Total Business Income:                  ${formatPKR(fin.totalIncome)}
 - Total Approved Business Expenses:       ${formatPKR(fin.totalExpenses)}
 -----------------------------------------------------------------------
 = Net Business Profit / (Loss):           ${formatPKR(fin.netProfitOrLoss)}

   ${p1.name}'s Share (${p1.shareNum}/${p1.shareDenom} = ${(p1.shareNum/p1.shareDenom*100).toFixed(4)}%):     ${formatPKR(p1Sum.profitShare)}
   ${p2.name}'s Share (${p2.shareNum}/${p2.shareDenom} = ${(p2.shareNum/p2.shareDenom*100).toFixed(4)}%):     ${formatPKR(p2Sum.profitShare)}

2. ${p1.name.toUpperCase()}'S STATEMENT:
   Opening Balance:                        ${formatPKR(p1Sum.openingBal)}
 + Allocated Profit Share:                 ${formatPKR(p1Sum.profitShare)}
 + Personal Business Expenses Paid:        ${formatPKR(p1Sum.personalExpenses)}
 + Partner-Funded Advances:                ${formatPKR(p1Sum.fundedAdvances)}
 - Personal Withdrawals (Drawings):        ${formatPKR(p1Sum.withdrawals)}
 - Reimbursements Received from Business:  ${formatPKR(p1Sum.reimbursements)}
 -----------------------------------------------------------------------
 = Operational Settlement Entitlement:     ${formatPKR(p1Sum.operationalSettlement)}
   (Long-term Capital Contributed: ${formatPKR(p1Sum.capitalContrib)} | Net Loans: ${formatPKR(p1Sum.netLoanBalance)})
 = Total Closing Business Entitlement:     ${formatPKR(p1Sum.closingEntitlement)}

3. ${p2.name.toUpperCase()}'S STATEMENT:
   Opening Balance:                        ${formatPKR(p2Sum.openingBal)}
 + Allocated Profit Share:                 ${formatPKR(p2Sum.profitShare)}
 + Personal Business Expenses Paid:        ${formatPKR(p2Sum.personalExpenses)}
 + Partner-Funded Advances:                ${formatPKR(p2Sum.fundedAdvances)}
 - Personal Withdrawals (Drawings):        ${formatPKR(p2Sum.withdrawals)}
 - Reimbursements Received from Business:  ${formatPKR(p2Sum.reimbursements)}
 -----------------------------------------------------------------------
 = Operational Settlement Entitlement:     ${formatPKR(p2Sum.operationalSettlement)}
   (Long-term Capital Contributed: ${formatPKR(p2Sum.capitalContrib)} | Net Loans: ${formatPKR(p2Sum.netLoanBalance)})
 = Total Closing Business Entitlement:     ${formatPKR(p2Sum.closingEntitlement)}

4. LIQUIDITY & BUSINESS CASH POSITION:
   Business Cash Register:                 ${formatPKR(fin.accountBalances['acc_cash'] ? fin.accountBalances['acc_cash'].current : 0)}
   Business Bank Balance:                  ${formatPKR(fin.accountBalances['acc_bank'] ? fin.accountBalances['acc_bank'].current : 0)}
   Total Liquid Business Cash Available:   ${formatPKR(fin.totalCashAvailable)}
   Outstanding Employee Advances Held:     ${formatPKR(fin.totalEmployeeAdvanceBalance)}
   Outstanding Employee Reimbursements:    ${formatPKR(fin.totalEmployeeOwed)}
========================================================================
    `;
  }
}

function handleRecordSettlementPayment(e) {
  e.preventDefault();
  const date = document.getElementById('spDate').value;
  const fromPartner = document.getElementById('spFrom').value;
  const toPartner = document.getElementById('spTo').value;
  const amount = parseFloat(document.getElementById('spAmount').value);
  const notes = document.getElementById('spNotes').value.trim();

  if (fromPartner === toPartner) {
    showToast('Payer and receiver cannot be the same entity.', 'danger');
    return;
  }

  if (!date || isNaN(amount) || amount <= 0) {
    showToast('Please provide a valid settlement amount.', 'danger');
    return;
  }

  const tx = {
    id: generateId('sp'),
    type: 'settlement_payment',
    date,
    fromType: fromPartner === 'business' ? 'business' : 'partner',
    fromId: fromPartner,
    toType: toPartner === 'business' ? 'business' : 'partner',
    toId: toPartner,
    amount,
    paymentMethodAccount: 'acc_cash',
    notes: notes || 'Settlement transfer between partners'
  };

  AppState.transactions.push(tx);
  saveState();
  document.getElementById('settlementPaymentForm').reset();
  document.getElementById('spDate').value = getTodayString();
  refreshAllUI();
  showToast('Settlement payment recorded successfully!', 'success');
}

// -------------------------------------------------------------------------
// 8. REPORTS GENERATION (13 DISTINCT REPORTS)
// -------------------------------------------------------------------------
function renderReportsSection(fin) {
  const reportSelect = document.getElementById('reportTypeSelect');
  if (!reportSelect) return;
  const selectedType = reportSelect.value || 'pnl';

  const titleEl = document.getElementById('report-title-display');
  const contentEl = document.getElementById('report-content-display');

  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];
  const p1Sum = fin.partnerSummaries[p1.id];
  const p2Sum = fin.partnerSummaries[p2.id];

  const txs = filterTransactions(AppState.filters);

  let html = '';
  let title = '';

  switch (selectedType) {
    case 'pnl':
      title = 'Profit and Loss Statement';
      html = `
        <div style="max-width: 700px; margin: 0 auto; background: white; padding: 24px; border: 1px solid var(--slate-200); border-radius: 8px;">
          <h3 style="text-align: center; margin-bottom: 4px;">Partnership Profit & Loss Statement</h3>
          <p style="text-align: center; color: var(--slate-500); font-size: 12px; margin-bottom: 20px;">For Selected Period • Currency: PKR</p>
          
          <table class="data-table" style="margin-bottom: 20px;">
            <thead><tr><th>Revenue / Income</th><th class="text-right">Amount (PKR)</th></tr></thead>
            <tbody>
              ${Object.entries(fin.incomeByCategory).map(([cat, amt]) => `
                <tr><td>${cat}</td><td class="text-right">${formatPKR(amt)}</td></tr>
              `).join('')}
              <tr style="font-weight: bold; background: var(--slate-50);">
                <td>Total Business Income</td>
                <td class="text-right">${formatPKR(fin.totalIncome)}</td>
              </tr>
            </tbody>
          </table>

          <table class="data-table" style="margin-bottom: 20px;">
            <thead><tr><th>Operating Expenses</th><th class="text-right">Amount (PKR)</th></tr></thead>
            <tbody>
              ${Object.entries(fin.expenseByCategory).map(([cat, amt]) => `
                <tr><td>${cat}</td><td class="text-right">${formatPKR(amt)}</td></tr>
              `).join('')}
              <tr style="font-weight: bold; background: var(--slate-50);">
                <td>Total Operating Expenses</td>
                <td class="text-right">${formatPKR(fin.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: var(--slate-100); padding: 14px; border-radius: 6px; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-bottom: 20px;">
            <span>Net ${fin.netProfitOrLoss >= 0 ? 'Profit' : 'Loss'}:</span>
            <span style="color: ${fin.netProfitOrLoss >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatPKR(fin.netProfitOrLoss)}</span>
          </div>

          <h4 style="margin-bottom: 10px;">Ownership Profit Allocation</h4>
          <table class="data-table">
            <thead><tr><th>Partner</th><th>Share Fraction</th><th>Share %</th><th class="text-right">Allocated Amount</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>${p1.name}</strong></td>
                <td>${p1.shareNum}/${p1.shareDenom}</td>
                <td>${(p1.shareNum/p1.shareDenom*100).toFixed(2)}%</td>
                <td class="text-right"><strong>${formatPKR(p1Sum.profitShare)}</strong></td>
              </tr>
              <tr>
                <td><strong>${p2.name}</strong></td>
                <td>${p2.shareNum}/${p2.shareDenom}</td>
                <td>${(p2.shareNum/p2.shareDenom*100).toFixed(2)}%</td>
                <td class="text-right"><strong>${formatPKR(p2Sum.profitShare)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      break;

    case 'income':
      title = 'Income Report';
      const incTxs = txs.filter(t => t.type === 'income');
      html = `
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Received By</th><th>Account</th><th class="text-right">Amount</th></tr>
          </thead>
          <tbody>
            ${incTxs.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${t.receivedBy}</td>
                <td>${t.receivingAccount}</td>
                <td class="text-right"><strong>${formatPKR(t.amount)}</strong></td>
              </tr>
            `).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td colspan="5">Total Income</td><td class="text-right">${formatPKR(fin.totalIncome)}</td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'expense':
      title = 'Expense Report';
      const expTxs = txs.filter(t => t.type === 'expense');
      html = `
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Paid By</th><th>Vendor</th><th class="text-right">Amount</th></tr>
          </thead>
          <tbody>
            ${expTxs.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${t.paidBy}</td>
                <td>${t.vendor || '-'}</td>
                <td class="text-right"><strong>${formatPKR(t.amount)}</strong></td>
              </tr>
            `).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td colspan="5">Total Expenses</td><td class="text-right">${formatPKR(fin.totalExpenses)}</td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'partner_settlement':
      title = 'Partner Settlement Report';
      html = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Calculation Item</th>
              <th class="text-right">${p1.name} (${p1.shareNum}/${p1.shareDenom})</th>
              <th class="text-right">${p2.name} (${p2.shareNum}/${p2.shareDenom})</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Opening Partner Balance</td><td class="text-right">${formatPKR(p1Sum.openingBal)}</td><td class="text-right">${formatPKR(p2Sum.openingBal)}</td></tr>
            <tr><td>Allocated Profit / (Loss) Share</td><td class="text-right"><strong>${formatPKR(p1Sum.profitShare)}</strong></td><td class="text-right"><strong>${formatPKR(p2Sum.profitShare)}</strong></td></tr>
            <tr><td>Eligible Personal Business Expenses Paid</td><td class="text-right">${formatPKR(p1Sum.personalExpenses)}</td><td class="text-right">${formatPKR(p2Sum.personalExpenses)}</td></tr>
            <tr><td>Partner-Funded Advances</td><td class="text-right">${formatPKR(p1Sum.fundedAdvances)}</td><td class="text-right">${formatPKR(p2Sum.fundedAdvances)}</td></tr>
            <tr><td>Capital Contributions</td><td class="text-right">${formatPKR(p1Sum.capitalContrib)}</td><td class="text-right">${formatPKR(p2Sum.capitalContrib)}</td></tr>
            <tr><td>New Partner Loans</td><td class="text-right">${formatPKR(p1Sum.newLoans)}</td><td class="text-right">${formatPKR(p2Sum.newLoans)}</td></tr>
            <tr><td>Less: Personal Withdrawals (Drawings)</td><td class="text-right text-danger">(${formatPKR(p1Sum.withdrawals)})</td><td class="text-right text-danger">(${formatPKR(p2Sum.withdrawals)})</td></tr>
            <tr><td>Less: Reimbursements Received</td><td class="text-right text-danger">(${formatPKR(p1Sum.reimbursements)})</td><td class="text-right text-danger">(${formatPKR(p2Sum.reimbursements)})</td></tr>
            <tr><td>Less: Loan Repayments Received</td><td class="text-right text-danger">(${formatPKR(p1Sum.loanRepayments)})</td><td class="text-right text-danger">(${formatPKR(p2Sum.loanRepayments)})</td></tr>
            <tr style="font-weight:bold; background:var(--slate-100); font-size:14px;">
              <td>Closing Business Entitlement</td>
              <td class="text-right" style="color: ${p1Sum.closingEntitlement >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatPKR(p1Sum.closingEntitlement)}</td>
              <td class="text-right" style="color: ${p2Sum.closingEntitlement >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatPKR(p2Sum.closingEntitlement)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;

    case 'partner_profit_share':
      title = 'Partner Profit Share Report';
      html = `
        <table class="data-table">
          <thead><tr><th>Partner</th><th>Ownership Share</th><th class="text-right">Total Net Profit/Loss</th><th class="text-right">Allocated Share</th></tr></thead>
          <tbody>
            <tr><td>${p1.name}</td><td>${p1.shareNum}/${p1.shareDenom} (${(p1.shareNum/p1.shareDenom*100).toFixed(2)}%)</td><td class="text-right">${formatPKR(fin.netProfitOrLoss)}</td><td class="text-right"><strong>${formatPKR(p1Sum.profitShare)}</strong></td></tr>
            <tr><td>${p2.name}</td><td>${p2.shareNum}/${p2.shareDenom} (${(p2.shareNum/p2.shareDenom*100).toFixed(2)}%)</td><td class="text-right">${formatPKR(fin.netProfitOrLoss)}</td><td class="text-right"><strong>${formatPKR(p2Sum.profitShare)}</strong></td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'partner_contributions':
      title = 'Partner Contribution Report';
      html = `
        <table class="data-table">
          <thead><tr><th>Partner</th><th class="text-right">Opening Capital</th><th class="text-right">Net Contributions Added</th><th class="text-right">Total Capital</th></tr></thead>
          <tbody>
            <tr><td>${p1.name}</td><td class="text-right">${formatPKR(p1.openingCapital || 0)}</td><td class="text-right">${formatPKR(p1Sum.capitalContrib - (p1.openingCapital || 0))}</td><td class="text-right"><strong>${formatPKR(p1Sum.capitalContrib)}</strong></td></tr>
            <tr><td>${p2.name}</td><td class="text-right">${p2.openingCapital ? formatPKR(p2.openingCapital) : formatPKR(0)}</td><td class="text-right">${formatPKR(p2Sum.capitalContrib - (p2.openingCapital || 0))}</td><td class="text-right"><strong>${formatPKR(p2Sum.capitalContrib)}</strong></td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'partner_personal_expenses':
      title = 'Partner Personal Expense Report';
      const personalExpTxs = txs.filter(t => t.type === 'expense' && (t.paidBy === 'p1_personal' || t.paidBy === 'p2_personal'));
      html = `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Partner</th><th>Description</th><th>Category</th><th>Vendor</th><th class="text-right">Amount</th></tr></thead>
          <tbody>
            ${personalExpTxs.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td><strong>${t.paidBy === 'p1_personal' ? p1.name : p2.name}</strong></td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${t.vendor || '-'}</td>
                <td class="text-right"><strong>${formatPKR(t.amount)}</strong></td>
              </tr>
            `).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td colspan="5">Total Personal Expenses Paid by Partners</td><td class="text-right">${formatPKR(p1Sum.personalExpenses + p2Sum.personalExpenses)}</td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'employee_advances':
      title = 'Employee Advance Report';
      html = `
        <table class="data-table">
          <thead><tr><th>Employee Name</th><th class="text-right">Opening Advance</th><th class="text-right">Current Advance Balance</th><th class="text-right">Status</th></tr></thead>
          <tbody>
            ${AppState.employees.map(e => `
              <tr>
                <td><strong>${e.name}</strong> (${e.title || 'Staff'})</td>
                <td class="text-right">${formatPKR(e.openingAdvance || 0)}</td>
                <td class="text-right"><strong>${formatPKR(fin.employeeBalances[e.id] || 0)}</strong></td>
                <td class="text-right"><span class="badge ${(fin.employeeBalances[e.id] || 0) > 0 ? 'badge-advance' : 'badge-income'}">${(fin.employeeBalances[e.id] || 0) > 0 ? 'Advance Active' : 'Settled'}</span></td>
              </tr>
            `).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td colspan="2">Total Advances Outstanding</td><td class="text-right">${formatPKR(fin.totalEmployeeAdvanceBalance)}</td><td></td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'employee_expenses':
      title = 'Employee Expense Report';
      const empExpTxs = txs.filter(t => t.type === 'employee_settlement' || (t.type === 'expense' && (t.paidBy === 'employee_advance' || t.paidBy === 'employee_personal')));
      html = `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Employee</th><th>Description</th><th>Payment Source</th><th class="text-right">Approved Amount</th></tr></thead>
          <tbody>
            ${empExpTxs.map(t => {
              const emp = AppState.employees.find(e => e.id === (t.employeeId || t.paidByPersonId));
              return `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td>${emp ? emp.name : '-'}</td>
                  <td>${t.description}</td>
                  <td>${t.paidBy || 'Advance Settlement'}</td>
                  <td class="text-right"><strong>${formatPKR(t.amount || t.amountSpent || 0)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      break;

    case 'cash_bank':
      title = 'Cash and Bank Balance Report';
      html = `
        <table class="data-table">
          <thead><tr><th>Account Name</th><th>Type</th><th class="text-right">Opening</th><th class="text-right">Total In</th><th class="text-right">Total Out</th><th class="text-right">Current Balance</th></tr></thead>
          <tbody>
            ${AppState.accounts.map(acc => {
              const b = fin.accountBalances[acc.id] || { opening:0, received:0, paid:0, transfersIn:0, transfersOut:0, current:0 };
              return `
                <tr>
                  <td><strong>${acc.name}</strong></td>
                  <td>${acc.type}</td>
                  <td class="text-right">${formatPKR(b.opening)}</td>
                  <td class="text-right">${formatPKR(b.received + b.transfersIn)}</td>
                  <td class="text-right">${formatPKR(b.paid + b.transfersOut)}</td>
                  <td class="text-right" style="font-weight:bold; color:${b.current < 0 ? 'var(--danger)' : 'inherit'}">${formatPKR(b.current)}</td>
                </tr>
              `;
            }).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td colspan="5">Total Business Liquid Cash (Cash + Bank)</td><td class="text-right">${formatPKR(fin.totalCashAvailable)}</td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'partner_loans':
      title = 'Partner Loan Report';
      html = `
        <table class="data-table">
          <thead><tr><th>Partner</th><th class="text-right">New Loans Advanced</th><th class="text-right">Repayments Received</th><th class="text-right">Net Outstanding Loan</th></tr></thead>
          <tbody>
            <tr><td>${p1.name}</td><td class="text-right">${formatPKR(p1Sum.newLoans)}</td><td class="text-right">${formatPKR(p1Sum.loanRepayments)}</td><td class="text-right"><strong>${formatPKR(p1Sum.netLoanBalance)}</strong></td></tr>
            <tr><td>${p2.name}</td><td class="text-right">${formatPKR(p2Sum.newLoans)}</td><td class="text-right">${formatPKR(p2Sum.loanRepayments)}</td><td class="text-right"><strong>${formatPKR(p2Sum.netLoanBalance)}</strong></td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'reimbursements':
      title = 'Outstanding Reimbursements Report';
      html = `
        <h4 style="margin-bottom:8px;">Partner Personal Expenses Paid vs Reimbursed</h4>
        <table class="data-table" style="margin-bottom:20px;">
          <thead><tr><th>Partner</th><th class="text-right">Personal Expenses Paid</th><th class="text-right">Reimbursements Received</th><th class="text-right">Net Due for Reimbursement</th></tr></thead>
          <tbody>
            <tr><td>${p1.name}</td><td class="text-right">${formatPKR(p1Sum.personalExpenses)}</td><td class="text-right">${formatPKR(p1Sum.reimbursements)}</td><td class="text-right"><strong>${formatPKR(p1Sum.personalExpenses - p1Sum.reimbursements)}</strong></td></tr>
            <tr><td>${p2.name}</td><td class="text-right">${formatPKR(p2Sum.personalExpenses)}</td><td class="text-right">${formatPKR(p2Sum.reimbursements)}</td><td class="text-right"><strong>${formatPKR(p2Sum.personalExpenses - p2Sum.reimbursements)}</strong></td></tr>
          </tbody>
        </table>

        <h4 style="margin-bottom:8px;">Employee Personal Expenses Owed</h4>
        <table class="data-table">
          <thead><tr><th>Employee Name</th><th class="text-right">Amount Owed to Employee</th></tr></thead>
          <tbody>
            ${AppState.employees.map(e => `
              <tr><td>${e.name}</td><td class="text-right"><strong>${formatPKR(fin.employeeOwed[e.id] || 0)}</strong></td></tr>
            `).join('')}
            <tr style="font-weight:bold; background:var(--slate-50);"><td>Total Employee Reimbursement Liability</td><td class="text-right">${formatPKR(fin.totalEmployeeOwed)}</td></tr>
          </tbody>
        </table>
      `;
      break;

    case 'full_ledger':
    default:
      title = 'Complete Transaction Ledger';
      html = `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category / Source</th><th class="text-right">Amount</th></tr></thead>
          <tbody>
            ${txs.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td><span class="badge badge-primary">${t.type}</span></td>
                <td>${t.description || t.purpose || '-'}</td>
                <td>${t.category || t.paidBy || t.subType || '-'}</td>
                <td class="text-right"><strong>${formatPKR(t.amount || t.amountSpent || 0)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;
  }

  titleEl.textContent = title;
  contentEl.innerHTML = html;
}

function handleExportCurrentReportCSV() {
  const select = document.getElementById('reportTypeSelect');
  const type = select.value || 'pnl';
  const fin = calculateAllFinancials();
  const txs = filterTransactions(AppState.filters);

  let filename = `report_${type}_${getTodayString()}.csv`;
  let rows = [];

  if (type === 'income') {
    rows.push(['Date', 'Description', 'Category', 'Received By', 'Account', 'Amount']);
    txs.filter(t => t.type === 'income').forEach(t => {
      rows.push([t.date, t.description, t.category, t.receivedBy, t.receivingAccount, t.amount]);
    });
  } else if (type === 'expense') {
    rows.push(['Date', 'Description', 'Category', 'Paid By', 'Vendor', 'Amount']);
    txs.filter(t => t.type === 'expense').forEach(t => {
      rows.push([t.date, t.description, t.category, t.paidBy, t.vendor || '', t.amount]);
    });
  } else if (type === 'pnl') {
    rows.push(['Section', 'Category', 'Amount']);
    Object.entries(fin.incomeByCategory).forEach(([k, v]) => rows.push(['Income', k, v]));
    rows.push(['Total Income', '', fin.totalIncome]);
    Object.entries(fin.expenseByCategory).forEach(([k, v]) => rows.push(['Expense', k, v]));
    rows.push(['Total Expense', '', fin.totalExpenses]);
    rows.push(['Net Profit/Loss', '', fin.netProfitOrLoss]);
  } else {
    rows.push(['ID', 'Date', 'Type', 'Description', 'Amount', 'Notes']);
    txs.forEach(t => {
      rows.push([t.id, t.date, t.type, t.description || t.purpose || '', t.amount || t.amountSpent || 0, t.notes || '']);
    });
  }

  exportToCSV(filename, rows);
}

// -------------------------------------------------------------------------
// 9. SETTINGS & PARTNER RATIOS
// -------------------------------------------------------------------------
function renderSettingsSection() {
  const p1 = AppState.settings.partners[0];
  const p2 = AppState.settings.partners[1];

  document.getElementById('setPartner1Name').value = p1.name;
  document.getElementById('setPartner1Num').value = p1.shareNum;
  document.getElementById('setPartner1Denom').value = p1.shareDenom;

  document.getElementById('setPartner2Name').value = p2.name;
  document.getElementById('setPartner2Num').value = p2.shareNum;
  document.getElementById('setPartner2Denom').value = p2.shareDenom;

  // Categories render
  const incCatList = document.getElementById('settingsIncCatList');
  if (incCatList) {
    incCatList.innerHTML = AppState.categories.income.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--slate-50); padding:6px 10px; border-radius:4px; margin-bottom:4px;">
        <span>${c}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteCategory('income', '${c}')">×</button>
      </div>
    `).join('');
  }

  const expCatList = document.getElementById('settingsExpCatList');
  if (expCatList) {
    expCatList.innerHTML = AppState.categories.expense.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--slate-50); padding:6px 10px; border-radius:4px; margin-bottom:4px;">
        <span>${c}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteCategory('expense', '${c}')">×</button>
      </div>
    `).join('');
  }
}

function handleSaveSettings(e) {
  e.preventDefault();
  const n1 = document.getElementById('setPartner1Name').value.trim();
  const num1 = parseInt(document.getElementById('setPartner1Num').value, 10);
  const denom1 = parseInt(document.getElementById('setPartner1Denom').value, 10);

  const n2 = document.getElementById('setPartner2Name').value.trim();
  const num2 = parseInt(document.getElementById('setPartner2Num').value, 10);
  const denom2 = parseInt(document.getElementById('setPartner2Denom').value, 10);

  if (!n1 || !n2 || isNaN(num1) || isNaN(denom1) || isNaN(num2) || isNaN(denom2) || denom1 <= 0 || denom2 <= 0) {
    showToast('Please enter valid partner names and positive fraction denominators.', 'danger');
    return;
  }

  // Fraction validation: num1/denom1 + num2/denom2 must equal 1.0 (100%)
  const ratio1 = num1 / denom1;
  const ratio2 = num2 / denom2;
  const total = ratio1 + ratio2;

  if (Math.abs(total - 1.0) > 0.000001) {
    showToast(`Validation Failed: Ownership ratios sum to ${(total * 100).toFixed(4)}%. They must equal exactly 100%!`, 'danger');
    return;
  }

  AppState.settings.partners[0].name = n1;
  AppState.settings.partners[0].shareNum = num1;
  AppState.settings.partners[0].shareDenom = denom1;
  AppState.settings.partners[0].percentage = ratio1 * 100;

  AppState.settings.partners[1].name = n2;
  AppState.settings.partners[1].shareNum = num2;
  AppState.settings.partners[1].shareDenom = denom2;
  AppState.settings.partners[1].percentage = ratio2 * 100;

  saveState();
  refreshAllUI();
  showToast('Settings & ownership shares saved successfully!', 'success');
}

function addCategory(type) {
  const input = type === 'income' ? document.getElementById('newIncCat') : document.getElementById('newExpCat');
  const val = input.value.trim();
  if (!val) return;
  if (!AppState.categories[type].includes(val)) {
    AppState.categories[type].push(val);
    saveState();
    input.value = '';
    renderSettingsSection();
    populateDropdowns();
    showToast(`Added ${val} to ${type} categories`, 'success');
  }
}

function deleteCategory(type, cat) {
  AppState.categories[type] = AppState.categories[type].filter(c => c !== cat);
  saveState();
  renderSettingsSection();
  populateDropdowns();
  showToast(`Deleted ${cat}`, 'info');
}

// -------------------------------------------------------------------------
// Global Transaction Deletion
// -------------------------------------------------------------------------
function deleteTransaction(id) {
  showConfirmModal('Confirm Transaction Deletion', 'Are you sure you want to delete this transaction record? All dependent balances and reports will be recalculated immediately.', () => {
    AppState.transactions = AppState.transactions.filter(t => t.id !== id);
    saveState();
    refreshAllUI();
    showToast('Transaction deleted successfully.', 'info');
  });
}

// -------------------------------------------------------------------------
// Initialization on Page Load
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Set today's date in all date inputs
  const todayStr = getTodayString();
  ['incDate', 'expDate', 'advDate', 'stlDate', 'ptDate', 'trDate', 'spDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = todayStr;
  });

  // Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Date Filter Change
  const dateFilterSelect = document.getElementById('globalDateFilter');
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener('change', (e) => {
      AppState.filters.dateRange = e.target.value;
      const customDates = document.getElementById('customDateInputs');
      if (customDates) {
        customDates.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      }
      refreshAllUI();
    });
  }

  const startDateInput = document.getElementById('globalStartDate');
  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      AppState.filters.startDate = e.target.value;
      refreshAllUI();
    });
  }

  const endDateInput = document.getElementById('globalEndDate');
  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      AppState.filters.endDate = e.target.value;
      refreshAllUI();
    });
  }

  // Global Search Input
  const globalSearchInput = document.getElementById('globalSearchInput');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      AppState.filters.search = e.target.value;
      refreshAllUI();
    });
  }

  // Forms Binding
  const incForm = document.getElementById('incomeForm');
  if (incForm) incForm.addEventListener('submit', handleAddIncome);

  const expForm = document.getElementById('expenseForm');
  if (expForm) expForm.addEventListener('submit', handleAddExpense);

  const advForm = document.getElementById('advanceForm');
  if (advForm) advForm.addEventListener('submit', handleAddAdvance);

  const stlForm = document.getElementById('settlementForm');
  if (stlForm) stlForm.addEventListener('submit', handleEmployeeSettlement);

  const ptForm = document.getElementById('partnerTxForm');
  if (ptForm) ptForm.addEventListener('submit', handleAddPartnerTransaction);

  const trForm = document.getElementById('transferForm');
  if (trForm) trForm.addEventListener('submit', handleAddTransfer);

  const accForm = document.getElementById('newAccountForm');
  if (accForm) accForm.addEventListener('submit', handleAddCustomAccount);

  const empForm = document.getElementById('newEmployeeForm');
  if (empForm) empForm.addEventListener('submit', handleAddEmployee);

  const setForm = document.getElementById('settingsForm');
  if (setForm) setForm.addEventListener('submit', handleSaveSettings);

  const spForm = document.getElementById('settlementPaymentForm');
  if (spForm) spForm.addEventListener('submit', handleRecordSettlementPayment);

  const expPaidBy = document.getElementById('expPaidBy');
  if (expPaidBy) expPaidBy.addEventListener('change', toggleExpEmployeeDropdown);

  const reportSelect = document.getElementById('reportTypeSelect');
  if (reportSelect) {
    reportSelect.addEventListener('change', () => {
      renderReportsSection(calculateAllFinancials());
    });
  }

  // Confirmation Modal buttons
  document.getElementById('confirmModalYes').addEventListener('click', () => {
    if (currentConfirmCallback) currentConfirmCallback();
    closeConfirmModal();
  });
  document.getElementById('confirmModalNo').addEventListener('click', closeConfirmModal);

  // File import
  document.getElementById('importFileInput').addEventListener('change', handleFileImport);

  // Initial render
  refreshAllUI();
});
