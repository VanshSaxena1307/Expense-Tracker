
let expenses     = [];
let editingId    = null;
let deletingId   = null;
let pieChart     = null;
let barChart     = null;


const CAT_COLORS = {
  Food:          '#fbbf24',
  Travel:        '#38bdf8',
  Shopping:      '#f472b6',
  Entertainment: '#a78bfa',
  Bills:         '#f87171',
  Health:        '#34d399',
  Education:     '#818cf8',
  Other:         '#94a3b8',
};

const CATEGORIES = Object.keys(CAT_COLORS);


function saveExpenses() {
  localStorage.setItem('expenseiq_data', JSON.stringify(expenses));
}


function loadExpenses() {
  const raw = localStorage.getItem('expenseiq_data');
  if (raw) {
    try {
      expenses = JSON.parse(raw);
    } catch {
      expenses = [];
    }
  }
}

function generateId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* =============================================
   FORM VALIDATION
   ============================================= */

/**
 * validateFields — validate name, amount, category, date
 * @param {string} name
 * @param {string} amount
 * @param {string} category
 * @param {string} date
 * @param {object} errIds — object mapping field names to error element IDs
 * @returns {boolean} true if valid
 */
function validateFields(name, amount, category, date, errIds) {
  let valid = true;

  Object.values(errIds).forEach(id => {
    document.getElementById(id).textContent = '';
  });

  if (!name.trim()) {
    document.getElementById(errIds.name).textContent = 'Expense name is required.';
    valid = false;
  }

  const amt = parseFloat(amount);
  if (!amount || isNaN(amt) || amt <= 0) {
    document.getElementById(errIds.amount).textContent = 'Enter a valid positive amount.';
    valid = false;
  }

  if (!category) {
    document.getElementById(errIds.category).textContent = 'Please select a category.';
    valid = false;
  }

  if (!date) {
    document.getElementById(errIds.date).textContent = 'Please select a date.';
    valid = false;
  }

  return valid;
}

function addExpense(e) {
  e.preventDefault();

  const name     = document.getElementById('expName').value;
  const amount   = document.getElementById('expAmount').value;
  const category = document.getElementById('expCategory').value;
  const date     = document.getElementById('expDate').value;

  const isValid = validateFields(name, amount, category, date, {
    name:     'err-name',
    amount:   'err-amount',
    category: 'err-category',
    date:     'err-date',
  });

  if (!isValid) return;

  const newExpense = {
    id:       generateId(),
    name:     name.trim(),
    amount:   parseFloat(parseFloat(amount).toFixed(2)),
    category,
    date,
  };

  expenses.push(newExpense);
  saveExpenses();
  renderAll();
  showNotification('Expense added successfully!', 'success');

  // Reset form
  document.getElementById('expenseForm').reset();
}

/* =============================================
   EDIT EXPENSE
   ============================================= */

/**
 * openEditModal — populate modal with existing expense data
 * @param {string} id — expense ID
 */
function openEditModal(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  editingId = id;

  document.getElementById('editId').value       = expense.id;
  document.getElementById('editName').value      = expense.name;
  document.getElementById('editAmount').value    = expense.amount;
  document.getElementById('editCategory').value  = expense.category;
  document.getElementById('editDate').value      = expense.date;

 
  ['edit-err-name','edit-err-amount','edit-err-category','edit-err-date']
    .forEach(id => document.getElementById(id).textContent = '');

  openModal('editModalOverlay');
}


function editExpense(e) {
  e.preventDefault();

  const name     = document.getElementById('editName').value;
  const amount   = document.getElementById('editAmount').value;
  const category = document.getElementById('editCategory').value;
  const date     = document.getElementById('editDate').value;

  const isValid = validateFields(name, amount, category, date, {
    name:     'edit-err-name',
    amount:   'edit-err-amount',
    category: 'edit-err-category',
    date:     'edit-err-date',
  });

  if (!isValid) return;

  const idx = expenses.findIndex(e => e.id === editingId);
  if (idx === -1) return;

  expenses[idx] = {
    ...expenses[idx],
    name:     name.trim(),
    amount:   parseFloat(parseFloat(amount).toFixed(2)),
    category,
    date,
  };

  saveExpenses();
  renderAll();
  closeModal('editModalOverlay');
  showNotification('Expense updated successfully!', 'success');
  editingId = null;
}



/**
 * openDeleteModal — ask for confirmation before deleting
 * @param {string} id
 */
function openDeleteModal(id) {
  deletingId = id;
  openModal('deleteModalOverlay');
}

function deleteExpense() {
  if (!deletingId) return;

  expenses = expenses.filter(e => e.id !== deletingId);
  saveExpenses();
  renderAll();
  closeModal('deleteModalOverlay');
  showNotification('Expense deleted.', 'info');
  deletingId = null;
}


/**
 * clearAllExpenses — wipe all data after modal confirmation
 */
function clearAllExpenses() {
  expenses = [];
  saveExpenses();
  renderAll();
  closeModal('clearModalOverlay');
  showNotification('All expenses cleared.', 'info');
}


/**
 * getFilteredExpenses — apply search + category filter + sort
 * @returns {Array} filtered & sorted expenses
 */
function getFilteredExpenses() {
  const query    = document.getElementById('searchInput').value.trim().toLowerCase();
  const category = document.getElementById('filterCategory').value;
  const sort     = document.getElementById('sortSelect').value;

  let result = [...expenses];

  
  if (query) {
    result = result.filter(e => e.name.toLowerCase().includes(query));
  }

  
  if (category) {
    result = result.filter(e => e.category === category);
  }

  switch (sort) {
    case 'latest':
      result.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest':
      result.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'highest':
      result.sort((a, b) => b.amount - a.amount); break;
    case 'lowest':
      result.sort((a, b) => a.amount - b.amount); break;
  }

  return result;
}



function renderExpenses() {
  const tbody    = document.getElementById('expenseTableBody');
  const empty    = document.getElementById('tableEmpty');
  const filtered = getFilteredExpenses();

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  filtered.forEach((expense, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escHtml(expense.name)}</td>
      <td>₹${expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="cat-badge ${expense.category}">${expense.category}</span></td>
      <td>${formatDate(expense.date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit"   onclick="openEditModal('${expense.id}')">Edit</button>
          <button class="btn-delete" onclick="openDeleteModal('${expense.id}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


function updateDashboard() {
  const total   = expenses.reduce((s, e) => s + e.amount, 0);
  const count   = expenses.length;
  const highest = count ? Math.max(...expenses.map(e => e.amount)) : 0;


  const now    = new Date();
  const yrMon  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthly = expenses
    .filter(e => e.date.startsWith(yrMon))
    .reduce((s, e) => s + e.amount, 0);

  document.getElementById('totalExpenses').textContent =
    `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('totalCount').textContent    = count;
  document.getElementById('highestExpense').textContent =
    `₹${highest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('monthlyExpense').textContent =
    `₹${monthly.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('currentMonthLabel').textContent =
    now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}


function renderRecent() {
  const container = document.getElementById('recentList');
  const sorted    = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions yet.</div>';
    return;
  }

  container.innerHTML = sorted.map(e => `
    <div class="recent-item">
      <div class="recent-left">
        <div class="recent-dot dot-${e.category}"></div>
        <div>
          <div class="recent-name">${escHtml(e.name)}</div>
          <div class="recent-date">${formatDate(e.date)} · ${e.category}</div>
        </div>
      </div>
      <div class="recent-amount">₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  `).join('');
}


function renderCategorySummary() {
  const container = document.getElementById('categorySummary');
  const total     = expenses.reduce((s, e) => s + e.amount, 0);

  const catTotals = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }));

  container.innerHTML = catTotals.map(({ cat, total: catTotal }) => {
    const pct = total > 0 ? (catTotal / total) * 100 : 0;
    return `
      <div class="cat-row">
        <div class="cat-name">${cat}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="cat-amount">₹${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    `;
  }).join('');
}


function updateCharts() {
  updatePieChart();
  updateBarChart();
}


function updatePieChart() {
  const ctx = document.getElementById('pieChart').getContext('2d');

  const catTotals = CATEGORIES.map(cat =>
    expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
  );
  const colors = CATEGORIES.map(cat => CAT_COLORS[cat]);

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CATEGORIES,
      datasets: [{
        data:            catTotals,
        backgroundColor: colors.map(c => c + '99'),  // semi-transparent
        borderColor:     colors,
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color:      '#94a3b8',
            font:       { family: 'DM Sans', size: 12 },
            boxWidth:   12,
            padding:    14,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ₹${ctx.parsed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          },
          backgroundColor: 'rgba(13,21,38,0.95)',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#e2e8f0',
          bodyColor:       '#94a3b8',
          padding:         12,
        },
      },
      cutout: '65%',
    },
  });
}


function updateBarChart() {
  const ctx = document.getElementById('barChart').getContext('2d');

  const months = [];
  const monthTotals = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const total = expenses
      .filter(e => e.date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    months.push(label);
    monthTotals.push(total);
  }

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label:           'Expenses (₹)',
        data:            monthTotals,
        backgroundColor: 'rgba(56,189,248,0.25)',
        borderColor:     '#38bdf8',
        borderWidth:     2,
        borderRadius:    6,
        hoverBackgroundColor: 'rgba(56,189,248,0.45)',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ₹${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          },
          backgroundColor: 'rgba(13,21,38,0.95)',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#e2e8f0',
          bodyColor:       '#94a3b8',
          padding:         12,
        },
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', font: { family: 'DM Sans' } },
        },
        y: {
          grid:        { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color:    '#64748b',
            font:     { family: 'DM Sans' },
            callback: v => `₹${v.toLocaleString('en-IN')}`,
          },
          beginAtZero: true,
        },
      },
    },
  });
}


function renderAll() {
  updateDashboard();
  renderRecent();
  renderCategorySummary();
  renderExpenses();
  updateCharts();
}


function exportCSV() {
  if (expenses.length === 0) {
    showNotification('No expenses to export.', 'error');
    return;
  }

  const header = 'Name,Amount,Category,Date';
  const rows   = expenses.map(e =>
    `"${e.name.replace(/"/g, '""')}",${e.amount},"${e.category}","${e.date}"`
  );
  const csv   = [header, ...rows].join('\n');
  const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');

  a.href     = url;
  a.download = `expenseiq_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('Expenses exported as CSV!', 'success');
}


/**
 * showNotification — displays a slide-in toast
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');

  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 320);
  }, 3000);
}


function openModal(overlayId) {
  document.getElementById(overlayId).classList.add('active');
}

function closeModal(overlayId) {
  document.getElementById(overlayId).classList.remove('active');
}


/**
 * switchSection — show selected section, update nav
 * @param {string} sectionName — 'dashboard' | 'expenses' | 'analytics'
 */
function switchSection(sectionName) {

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`section-${sectionName}`);
  if (section) section.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
  if (navBtn) navBtn.classList.add('active');

  const titles = { dashboard: 'Dashboard', expenses: 'Expenses', analytics: 'Analytics' };
  document.getElementById('sectionTitle').textContent = titles[sectionName] || sectionName;

  if (sectionName === 'analytics') {
    setTimeout(updateCharts, 50);
  }

  closeMobileSidebar();
}


function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}


/**
 * formatDate — nice readable date string
 * @param {string} dateStr — YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

/**
 * escHtml — prevent XSS in innerHTML
 */
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}


document.addEventListener('DOMContentLoaded', () => {

  loadExpenses();

  document.getElementById('expDate').valueAsDate = new Date();

  renderAll();

  document.getElementById('expenseForm').addEventListener('submit', addExpense);
  document.getElementById('editForm').addEventListener('submit', editExpense);

  document.getElementById('searchInput').addEventListener('input', renderExpenses);
  document.getElementById('filterCategory').addEventListener('change', renderExpenses);
  document.getElementById('sortSelect').addEventListener('change', renderExpenses);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSection(btn.dataset.section);
    });
  });

  document.getElementById('hamburger').addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  document.getElementById('clearAllBtn').addEventListener('click', () => openModal('clearModalOverlay'));
  document.getElementById('clearCancelBtn').addEventListener('click', () => closeModal('clearModalOverlay'));
  document.getElementById('clearModalClose').addEventListener('click', () => closeModal('clearModalOverlay'));
  document.getElementById('clearConfirmBtn').addEventListener('click', clearAllExpenses);

  document.getElementById('deleteCancelBtn').addEventListener('click', () => closeModal('deleteModalOverlay'));
  document.getElementById('deleteModalClose').addEventListener('click', () => closeModal('deleteModalOverlay'));
  document.getElementById('deleteConfirmBtn').addEventListener('click', deleteExpense);

  document.getElementById('editCancelBtn').addEventListener('click', () => closeModal('editModalOverlay'));
  document.getElementById('editModalClose').addEventListener('click', () => closeModal('editModalOverlay'));

  ['editModalOverlay','deleteModalOverlay','clearModalOverlay'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) closeModal(id);
    });
  });

});
