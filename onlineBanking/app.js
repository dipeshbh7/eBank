/* 
   eBank - Secure Banking Application
   Features: Multi-account, transfers, PIN security, persistence
    */

//  DEFAULT DATA 
const DEFAULT_ACCOUNTS = [
  { id: 'ACC001', name: 'eBank Wallet',   number: '9841XXXX21', type: 'Wallet',   balance: 15420.50, color: '#60BB46' },
  { id: 'ACC002', name: 'Savings Account', number: '0128XXXX88', type: 'Savings',  balance: 12750.00, color: '#1976D2' },
  { id: 'ACC003', name: 'Current Account', number: '0219XXXX09', type: 'Current',  balance: 8900.75,  color: '#F57C00' },
  { id: 'ACC004', name: 'Travel Fund',     number: '0337XXXX67', type: 'Savings',  balance: 1250.25,  color: '#7B1FA2' }
];

const DEFAULT_TRANSACTIONS = [
  { id: 'TXN1001', from: 'ACC001', to: 'ACC002', amount: 5000, remarks: 'Savings deposit', date: Date.now() - 86400000 * 2, status: 'success' },
  { id: 'TXN1002', from: 'ACC001', to: 'EXT_NTC', toName: 'NTC Prepaid', amount: 100, remarks: 'Mobile recharge', date: Date.now() - 86400000, status: 'success' }
];

// Demo MPIN - in production this would be server-validated
const DEMO_MPIN = '1234';

//  STATE 
let state = {
  accounts: [],
  transactions: [],
  balanceHidden: false,
  pendingTransfer: null
};

//  PERSISTENCE 
function loadData() {
  try {
    const acc = localStorage.getItem('ebank_accounts');
    const txn = localStorage.getItem('ebank_transactions');
    state.accounts = acc ? JSON.parse(acc) : JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    state.transactions = txn ? JSON.parse(txn) : JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
  } catch (e) {
    state.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    state.transactions = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
  }
}

function saveData() {
  localStorage.setItem('ebank_accounts', JSON.stringify(state.accounts));
  localStorage.setItem('ebank_transactions', JSON.stringify(state.transactions));
}

//  UTILITIES 
function formatNPR(amount) {
  return 'NPR ' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function generateTxnId() {
  return 'TXN' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
}

function getAccount(id) {
  return state.accounts.find(a => a.id === id);
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 2800);
}

//  VIEW NAVIGATION 
function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-nav="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Render view-specific content
  if (viewName === 'home') renderHome();
  if (viewName === 'accounts') renderAccounts();
  if (viewName === 'transfer') renderTransferForm();
  if (viewName === 'history') renderHistory();
  if (viewName === 'qr') showToast('QR Scanner coming soon!', 'success');
  if (viewName === 'profile') showToast('Profile section coming soon!', 'success');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

//  RENDER: HOME 
function renderHome() {
  const total = state.accounts.reduce((s, a) => s + a.balance, 0);
  const balEl = document.getElementById('totalBalance');
  balEl.textContent = state.balanceHidden ? 'NPR ••••••' : formatNPR(total);

  const list = document.getElementById('recentTransactions');
  const recent = state.transactions.slice(-5).reverse();
  list.innerHTML = recent.length ? recent.map(renderTxnItem).join('') : emptyState('No recent transactions');
}

function renderTxnItem(txn) {
  const fromAcc = getAccount(txn.from);
  const toAcc = getAccount(txn.to);
  const isOut = fromAcc !== undefined;
  const counterparty = isOut ? (toAcc ? toAcc.name : (txn.toName || 'External')) : (fromAcc ? fromAcc.name : 'External');
  const icon = isOut ? 'fa-arrow-up' : 'fa-arrow-down';
  const cls = isOut ? 'out' : 'in';
  const sign = isOut ? '-' : '+';

  return `
    <div class="txn-item">
      <div class="txn-icon ${cls}"><i class="fas ${icon}"></i></div>
      <div class="txn-info">
        <div class="txn-title">${isOut ? 'Sent to' : 'Received from'} ${counterparty}</div>
        <div class="txn-meta">${txn.remarks || 'Transfer'} • ${formatDate(txn.date)}</div>
      </div>
      <div class="txn-amount ${cls}">
        ${sign}${formatNPR(txn.amount)}
        <small>${txn.id}</small>
      </div>
    </div>
  `;
}

function emptyState(msg) {
  return `<div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div>`;
}

//  RENDER: ACCOUNTS 
function renderAccounts() {
  const list = document.getElementById('accountsList');
  list.innerHTML = state.accounts.map(a => `
    <div class="account-card" style="border-left-color:${a.color}">
      <div class="account-info">
        <h3>${a.name}</h3>
        <div class="acc-num">${a.number}</div>
        <span class="acc-type">${a.type}</span>
      </div>
      <div class="account-balance">
        <div class="bal">${formatNPR(a.balance)}</div>
        <div class="lbl">Available</div>
      </div>
    </div>
  `).join('');
}

//  RENDER: TRANSFER FORM 
function renderTransferForm() {
  const options = state.accounts.map(a =>
    `<option value="${a.id}">${a.name} • ${formatNPR(a.balance)}</option>`
  ).join('');
  document.getElementById('fromAccount').innerHTML = options;
  document.getElementById('toAccount').innerHTML = options;
  document.getElementById('amount').value = '';
  document.getElementById('remarks').value = '';
}

//  RENDER: HISTORY 
function renderHistory() {
  const list = document.getElementById('fullHistory');
  if (!state.transactions.length) {
    list.innerHTML = emptyState('No transactions yet');
    return;
  }
  list.innerHTML = state.transactions.slice().reverse().map(renderTxnItem).join('');
}

//  TRANSFER VALIDATION 
function validateTransfer(fromId, toId, amount) {
  if (fromId === toId) return 'Cannot transfer to same account';
  if (!amount || amount <= 0) return 'Enter a valid amount';
  if (amount < 1) return 'Minimum amount is NPR 1';
  if (amount > 100000) return 'Maximum amount is NPR 100,000';

  const from = getAccount(fromId);
  if (!from) return 'Invalid source account';
  if (from.balance < amount) return 'Insufficient balance';
  return null;
}

//  PIN MODAL 
function openPinModal(data) {
  state.pendingTransfer = data;
  const from = getAccount(data.fromId);
  const to = getAccount(data.toId);
  document.getElementById('sumFrom').textContent = from.name;
  document.getElementById('sumTo').textContent = to ? to.name : 'External';
  document.getElementById('sumAmount').textContent = formatNPR(data.amount);

  const remarksRow = document.getElementById('sumRemarksRow');
  if (data.remarks) {
    remarksRow.style.display = 'flex';
    document.getElementById('sumRemarks').textContent = data.remarks;
  } else {
    remarksRow.style.display = 'none';
  }

  // Reset PIN inputs
  document.querySelectorAll('.pin-digit').forEach(i => i.value = '');
  document.getElementById('confirmBtn').disabled = true;
  document.getElementById('pinModal').classList.add('active');
  setTimeout(() => document.querySelector('.pin-digit').focus(), 300);
}

function closePinModal() {
  document.getElementById('pinModal').classList.remove('active');
  state.pendingTransfer = null;
}

//  EXECUTE TRANSFER (Secure Double-Entry) 
function executeTransfer() {
  const { fromId, toId, amount, remarks } = state.pendingTransfer;

  // Re-validate (security: state may have changed)
  const err = validateTransfer(fromId, toId, amount);
  if (err) {
    showToast(err, 'error');
    closePinModal();
    return;
  }

  const from = getAccount(fromId);
  const to = getAccount(toId);

  // Atomic debit + credit
  from.balance = Math.round((from.balance - amount) * 100) / 100;
  if (to) to.balance = Math.round((to.balance + amount) * 100) / 100;

  // Record transaction
  const txn = {
    id: generateTxnId(),
    from: fromId,
    to: toId,
    toName: to ? to.name : 'External Account',
    amount: amount,
    remarks: remarks || 'Transfer',
    date: Date.now(),
    status: 'success'
  };
  state.transactions.push(txn);
  saveData();

  closePinModal();
  showSuccessModal(txn);
}

function showSuccessModal(txn) {
  const to = getAccount(txn.to);
  document.getElementById('successAmount').textContent = formatNPR(txn.amount);
  document.getElementById('successTo').textContent = to ? to.name : txn.toName;
  document.getElementById('txnId').textContent = txn.id;
  document.getElementById('successModal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('active');
  showView('home');
}

//  PIN INPUT HANDLING 
function setupPinInputs() {
  const digits = document.querySelectorAll('.pin-digit');
  digits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < 3) digits[idx + 1].focus();
      checkPinComplete();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        digits[idx - 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      paste.split('').forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
      if (paste.length > 0) digits[Math.min(paste.length, 3)].focus();
      checkPinComplete();
    });
  });
}

function checkPinComplete() {
  const pin = Array.from(document.querySelectorAll('.pin-digit')).map(i => i.value).join('');
  document.getElementById('confirmBtn').disabled = pin.length !== 4;
}

function getPin() {
  return Array.from(document.querySelectorAll('.pin-digit')).map(i => i.value).join('');
}

//  EVENT LISTENERS 
function initEvents() {
  // Service buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.action));
  });

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.nav));
  });

  // Toggle balance visibility
  document.getElementById('toggleBalance').addEventListener('click', (e) => {
    state.balanceHidden = !state.balanceHidden;
    const icon = e.currentTarget.querySelector('i');
    icon.className = state.balanceHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
    renderHome();
  });

  // Transfer form submission
  document.getElementById('transferForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fromId = document.getElementById('fromAccount').value;
    const toId = document.getElementById('toAccount').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const remarks = document.getElementById('remarks').value.trim();

    const err = validateTransfer(fromId, toId, amount);
    if (err) {
      showToast(err, 'error');
      return;
    }
    openPinModal({ fromId, toId, amount, remarks });
  });

  // PIN modal controls
  document.getElementById('closePinModal').addEventListener('click', closePinModal);
  document.getElementById('pinModal').addEventListener('click', (e) => {
    if (e.target.id === 'pinModal') closePinModal();
  });

  document.getElementById('confirmBtn').addEventListener('click', () => {
    const pin = getPin();
    if (pin.length !== 4) {
      showToast('Enter complete 4-digit MPIN', 'error');
      return;
    }
    // In production: verify PIN via secure API call
    if (pin !== DEMO_MPIN) {
      showToast('Incorrect MPIN. Try 1234', 'error');
      document.querySelectorAll('.pin-digit').forEach(i => i.value = '');
      document.querySelector('.pin-digit').focus();
      document.getElementById('confirmBtn').disabled = true;
      return;
    }
    executeTransfer();
  });

  // Success modal
  document.getElementById('closeSuccess').addEventListener('click', closeSuccessModal);
}

//  INIT 
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupPinInputs();
  initEvents();
  renderHome();
});