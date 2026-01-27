// ============ MacTube Expense Manager - Application Logic ============

// ============ DATA MANAGEMENT ============
const APP_STATE = {
    user: null,
    expenses: [],
    categories: {
        'Madalena Cruz': ['Videoclip "Amor"', 'Single "Sol"', 'EP "Lua"', 'Sessão Fotográfica'],
        'João Silva': ['Album "Noite"', 'Tour 2024', 'Merchandising'],
        'Ana Santos': ['Single "Mar"', 'Festival Verão']
    }
};

// Demo data for testing
const DEMO_EXPENSES = [
    { id: 1, category: 'Madalena Cruz', subcategory: 'Videoclip "Amor"', type: 'producao', value: 1500, entity: 'Produtora XYZ', date: '2024-01-15', investor: 'MacTube', notes: 'Filmagens dia 1' },
    { id: 2, category: 'Madalena Cruz', subcategory: 'Videoclip "Amor"', type: 'alojamento', value: 350, entity: 'Hotel Lisboa', date: '2024-01-15', investor: 'MacTube', notes: 'Equipa técnica' },
    { id: 3, category: 'Madalena Cruz', subcategory: 'Videoclip "Amor"', type: 'alimentacao', value: 200, entity: 'Catering ABC', date: '2024-01-15', investor: 'Outro', notes: 'Almoço equipa' },
    { id: 4, category: 'Madalena Cruz', subcategory: 'Single "Sol"', type: 'producao', value: 2000, entity: 'Studio Som', date: '2024-01-20', investor: 'MacTube', notes: 'Gravação estúdio' },
    { id: 5, category: 'Madalena Cruz', subcategory: 'Single "Sol"', type: 'promocao', value: 800, entity: 'Agência Marketing', date: '2024-01-22', investor: 'Outro', notes: 'Campanha digital' },
    { id: 6, category: 'João Silva', subcategory: 'Album "Noite"', type: 'producao', value: 5000, entity: 'Studio Pro', date: '2024-01-25', investor: 'MacTube', notes: 'Produção completa' },
    { id: 7, category: 'João Silva', subcategory: 'Tour 2024', type: 'transporte', value: 1200, entity: 'Transportes Lda', date: '2024-02-01', investor: 'MacTube', notes: 'Aluguer carrinha' },
    { id: 8, category: 'João Silva', subcategory: 'Tour 2024', type: 'equipamento', value: 600, entity: 'Som & Luz', date: '2024-02-02', investor: 'Outro', notes: 'Aluguer PA' },
    { id: 9, category: 'Ana Santos', subcategory: 'Single "Mar"', type: 'producao', value: 1800, entity: 'Beach Studio', date: '2024-02-05', investor: 'MacTube', notes: 'Gravação' },
    { id: 10, category: 'Ana Santos', subcategory: 'Festival Verão', type: 'combustivel', value: 150, entity: 'Galp', date: '2024-02-10', investor: 'MacTube', notes: 'Deslocação' }
];

// ============ LOCAL STORAGE ============
function saveData() {
    localStorage.setItem('mactube_expenses', JSON.stringify(APP_STATE.expenses));
    localStorage.setItem('mactube_categories', JSON.stringify(APP_STATE.categories));
}

function loadData() {
    const expenses = localStorage.getItem('mactube_expenses');
    const categories = localStorage.getItem('mactube_categories');
    
    if (expenses) {
        APP_STATE.expenses = JSON.parse(expenses);
    } else {
        // Load demo data on first run
        APP_STATE.expenses = [...DEMO_EXPENSES];
        saveData();
    }
    
    if (categories) {
        APP_STATE.categories = JSON.parse(categories);
    }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initAuth();
    initTabs();
    initExpenseForm();
    initModals();
    initFilters();
    initSearch();
    updateAllViews();
    
    // Hide splash screen
    setTimeout(() => {
        const splash = document.querySelector('.splash-screen');
        if (splash) {
            splash.classList.add('hidden');
        }
    }, 1800);
});

// ============ AUTHENTICATION ============
function initAuth() {
    const authForm = document.getElementById('auth-form');
    const loginBtn = document.querySelector('.auth-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value : 'demo@mactube.pt';
            
            // Demo login - accept any input
            APP_STATE.user = email || 'demo@mactube.pt';
            
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            
            const greeting = document.getElementById('user-greeting');
            if (greeting) {
                const name = APP_STATE.user.split('@')[0];
                greeting.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            }
            
            updateAllViews();
        });
    }
}

// ============ TABS ============
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            // Update tab states
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show correct content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            // Update view when switching tabs
            if (targetId === 'dashboard-tab') {
                updateDashboard();
            } else if (targetId === 'reports-tab') {
                updateReportsTable();
            } else if (targetId === 'settlement-tab') {
                updateSettlement();
            }
        });
    });
}

// ============ EXPENSE FORM ============
function initExpenseForm() {
    // Expense type selection
    document.querySelectorAll('.expense-types .option').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.expense-types .option').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Investor selection
    document.querySelectorAll('.investor-option').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.investor-option').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Category change - update subcategories
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        // Populate categories
        updateCategoryDropdown();
        
        categorySelect.addEventListener('change', function() {
            updateSubcategoryDropdown(this.value);
        });
    }
    
    // Submit form
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', addExpense);
    }
    
    // Add new category button
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openModal('add-category-modal'));
    }
    
    // Add new subcategory button
    const addSubcategoryBtn = document.getElementById('add-subcategory-btn');
    if (addSubcategoryBtn) {
        addSubcategoryBtn.addEventListener('click', () => openModal('add-subcategory-modal'));
    }
}

function updateCategoryDropdown(selectElement = null) {
    const select = selectElement || document.getElementById('category');
    const filterSelect = document.getElementById('filter-category');
    const settlementSelect = document.getElementById('settlement-category');
    
    const options = '<option value="">Selecionar artista...</option>' +
        Object.keys(APP_STATE.categories).map(cat => 
            `<option value="${cat}">${cat}</option>`
        ).join('');
    
    if (select) select.innerHTML = options;
    if (filterSelect) filterSelect.innerHTML = '<option value="">Todos os artistas</option>' + 
        Object.keys(APP_STATE.categories).map(cat => `<option value="${cat}">${cat}</option>`).join('');
    if (settlementSelect) settlementSelect.innerHTML = options;
}

function updateSubcategoryDropdown(category, selectElement = null) {
    const select = selectElement || document.getElementById('subcategory');
    const filterSelect = document.getElementById('filter-subcategory');
    
    if (!select) return;
    
    if (!category || !APP_STATE.categories[category]) {
        select.innerHTML = '<option value="">Primeiro selecione o artista</option>';
        if (filterSelect) filterSelect.innerHTML = '<option value="">Todos os projetos</option>';
        return;
    }
    
    const options = '<option value="">Selecionar projeto...</option>' +
        APP_STATE.categories[category].map(sub => 
            `<option value="${sub}">${sub}</option>`
        ).join('');
    
    select.innerHTML = options;
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todos os projetos</option>' +
            APP_STATE.categories[category].map(sub => `<option value="${sub}">${sub}</option>`).join('');
    }
}

function addExpense() {
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value;
    const typeBtn = document.querySelector('.expense-types .option.selected');
    const value = parseFloat(document.getElementById('value').value);
    const entity = document.getElementById('entity').value;
    const date = document.getElementById('date').value;
    const investorBtn = document.querySelector('.investor-option.selected');
    const notes = document.getElementById('notes').value;
    
    // Validation
    if (!category) {
        showToast('Por favor, selecione um artista', 'error');
        return;
    }
    if (!subcategory) {
        showToast('Por favor, selecione um projeto', 'error');
        return;
    }
    if (!typeBtn) {
        showToast('Por favor, selecione o tipo de despesa', 'error');
        return;
    }
    if (!value || isNaN(value)) {
        showToast('Por favor, insira um valor válido', 'error');
        return;
    }
    if (!entity) {
        showToast('Por favor, insira a entidade', 'error');
        return;
    }
    if (!date) {
        showToast('Por favor, selecione a data', 'error');
        return;
    }
    if (!investorBtn) {
        showToast('Por favor, selecione quem investiu', 'error');
        return;
    }
    
    const expense = {
        id: Date.now(),
        category,
        subcategory,
        type: typeBtn.getAttribute('data-type'),
        value,
        entity,
        date,
        investor: investorBtn.getAttribute('data-investor'),
        notes
    };
    
    APP_STATE.expenses.push(expense);
    saveData();
    
    // Reset form
    document.getElementById('category').value = '';
    document.getElementById('subcategory').innerHTML = '<option value="">Primeiro selecione o artista</option>';
    document.querySelectorAll('.expense-types .option').forEach(b => b.classList.remove('selected'));
    document.getElementById('value').value = '';
    document.getElementById('entity').value = '';
    document.getElementById('date').value = '';
    document.querySelectorAll('.investor-option').forEach(b => b.classList.remove('selected'));
    document.getElementById('notes').value = '';
    
    showToast('Despesa adicionada com sucesso!');
    updateAllViews();
}

// ============ MODALS ============
function initModals() {
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
    
    // Add category confirm
    const addCategoryConfirm = document.getElementById('add-category-confirm');
    if (addCategoryConfirm) {
        addCategoryConfirm.addEventListener('click', addNewCategory);
    }
    
    // Add subcategory confirm
    const addSubcategoryConfirm = document.getElementById('add-subcategory-confirm');
    if (addSubcategoryConfirm) {
        addSubcategoryConfirm.addEventListener('click', addNewSubcategory);
    }
    
    // Edit expense confirm
    const editExpenseConfirm = document.getElementById('edit-expense-confirm');
    if (editExpenseConfirm) {
        editExpenseConfirm.addEventListener('click', saveEditedExpense);
    }
    
    // Delete expense confirm
    const deleteExpenseConfirm = document.getElementById('delete-expense-confirm');
    if (deleteExpenseConfirm) {
        deleteExpenseConfirm.addEventListener('click', confirmDeleteExpense);
    }
    
    // Logout button
    const logoutBtn = document.querySelector('.header-icon-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.getElementById('app-screen').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
        });
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function addNewCategory() {
    const input = document.getElementById('new-category-input');
    const name = input.value.trim();
    
    if (!name) {
        showToast('Por favor, insira o nome do artista', 'error');
        return;
    }
    
    if (APP_STATE.categories[name]) {
        showToast('Este artista já existe', 'error');
        return;
    }
    
    APP_STATE.categories[name] = [];
    saveData();
    updateCategoryDropdown();
    
    input.value = '';
    closeModal('add-category-modal');
    showToast('Artista adicionado com sucesso!');
}

function addNewSubcategory() {
    const input = document.getElementById('new-subcategory-input');
    const category = document.getElementById('category').value;
    const name = input.value.trim();
    
    if (!category) {
        showToast('Por favor, selecione primeiro um artista', 'error');
        return;
    }
    
    if (!name) {
        showToast('Por favor, insira o nome do projeto', 'error');
        return;
    }
    
    if (APP_STATE.categories[category].includes(name)) {
        showToast('Este projeto já existe', 'error');
        return;
    }
    
    APP_STATE.categories[category].push(name);
    saveData();
    updateSubcategoryDropdown(category);
    
    input.value = '';
    closeModal('add-subcategory-modal');
    showToast('Projeto adicionado com sucesso!');
}

// Edit expense
let currentEditId = null;

function editExpense(id) {
    const expense = APP_STATE.expenses.find(e => e.id === id);
    if (!expense) return;
    
    currentEditId = id;
    
    document.getElementById('edit-value').value = expense.value;
    document.getElementById('edit-entity').value = expense.entity;
    document.getElementById('edit-notes').value = expense.notes || '';
    
    openModal('edit-expense-modal');
}

function saveEditedExpense() {
    if (!currentEditId) return;
    
    const expense = APP_STATE.expenses.find(e => e.id === currentEditId);
    if (!expense) return;
    
    const value = parseFloat(document.getElementById('edit-value').value);
    const entity = document.getElementById('edit-entity').value;
    const notes = document.getElementById('edit-notes').value;
    
    if (!value || isNaN(value)) {
        showToast('Por favor, insira um valor válido', 'error');
        return;
    }
    
    if (!entity) {
        showToast('Por favor, insira a entidade', 'error');
        return;
    }
    
    expense.value = value;
    expense.entity = entity;
    expense.notes = notes;
    
    saveData();
    updateAllViews();
    closeModal('edit-expense-modal');
    showToast('Despesa atualizada com sucesso!');
    currentEditId = null;
}

// Delete expense
let currentDeleteId = null;

function deleteExpense(id) {
    currentDeleteId = id;
    openModal('delete-expense-modal');
}

function confirmDeleteExpense() {
    if (!currentDeleteId) return;
    
    APP_STATE.expenses = APP_STATE.expenses.filter(e => e.id !== currentDeleteId);
    saveData();
    updateAllViews();
    closeModal('delete-expense-modal');
    showToast('Despesa eliminada com sucesso!');
    currentDeleteId = null;
}

// ============ FILTERS & SEARCH ============
function initFilters() {
    const filterCategory = document.getElementById('filter-category');
    const filterSubcategory = document.getElementById('filter-subcategory');
    const filterInvestor = document.getElementById('filter-investor');
    const settlementCategory = document.getElementById('settlement-category');
    
    if (filterCategory) {
        filterCategory.addEventListener('change', function() {
            updateSubcategoryDropdown(this.value);
            updateReportsTable();
        });
    }
    
    if (filterSubcategory) {
        filterSubcategory.addEventListener('change', updateReportsTable);
    }
    
    if (filterInvestor) {
        filterInvestor.addEventListener('change', updateReportsTable);
    }
    
    if (settlementCategory) {
        settlementCategory.addEventListener('change', function() {
            updateSettlement(this.value);
        });
    }
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            updateReportsTable(this.value);
        });
    }
}

// ============ UPDATE VIEWS ============
function updateAllViews() {
    updateDashboard();
    updateReportsTable();
    updateSettlement();
}

// ============ DASHBOARD ============
function updateDashboard() {
    const totalExpenses = APP_STATE.expenses.reduce((sum, e) => sum + e.value, 0);
    const mactubeExpenses = APP_STATE.expenses.filter(e => e.investor === 'MacTube').reduce((sum, e) => sum + e.value, 0);
    const otherExpenses = APP_STATE.expenses.filter(e => e.investor === 'Outro').reduce((sum, e) => sum + e.value, 0);
    const expenseCount = APP_STATE.expenses.length;
    
    // Update stat cards
    const statTotal = document.getElementById('stat-total');
    const statMactube = document.getElementById('stat-mactube');
    const statOthers = document.getElementById('stat-others');
    const statCount = document.getElementById('stat-count');
    
    if (statTotal) statTotal.textContent = formatCurrency(totalExpenses);
    if (statMactube) statMactube.textContent = formatCurrency(mactubeExpenses);
    if (statOthers) statOthers.textContent = formatCurrency(otherExpenses);
    if (statCount) statCount.textContent = expenseCount;
    
    // Update charts
    updateCategoryChart();
    updateTypeChart();
    
    // Update activity
    updateRecentActivity();
}

function updateCategoryChart() {
    const container = document.getElementById('category-chart');
    if (!container) return;
    
    const categoryTotals = {};
    APP_STATE.expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.value;
    });
    
    const maxValue = Math.max(...Object.values(categoryTotals), 1);
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
    
    let html = '';
    Object.entries(categoryTotals).slice(0, 5).forEach(([category, value], i) => {
        const percentage = (value / maxValue) * 100;
        html += `
            <div class="chart-bar">
                <span class="chart-bar-label">${category}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background: ${colors[i % colors.length]}"></div>
                </div>
                <span class="chart-bar-value">${formatCurrency(value)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="color: var(--text-light); text-align: center; padding: 40px 0;">Sem dados para mostrar</p>';
}

function updateTypeChart() {
    const container = document.getElementById('type-chart');
    if (!container) return;
    
    const typeTotals = {};
    const typeNames = {
        'combustivel': 'Combustível',
        'alimentacao': 'Alimentação',
        'alojamento': 'Alojamento',
        'equipamento': 'Equipamento',
        'producao': 'Produção',
        'promocao': 'Promoção',
        'transporte': 'Transporte',
        'outros': 'Outros'
    };
    
    APP_STATE.expenses.forEach(e => {
        typeTotals[e.type] = (typeTotals[e.type] || 0) + e.value;
    });
    
    const maxValue = Math.max(...Object.values(typeTotals), 1);
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8'];
    
    let html = '';
    Object.entries(typeTotals).slice(0, 5).forEach(([type, value], i) => {
        const percentage = (value / maxValue) * 100;
        html += `
            <div class="chart-bar">
                <span class="chart-bar-label">${typeNames[type] || type}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background: ${colors[i % colors.length]}"></div>
                </div>
                <span class="chart-bar-value">${formatCurrency(value)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="color: var(--text-light); text-align: center; padding: 40px 0;">Sem dados para mostrar</p>';
}

function updateRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    const recentExpenses = [...APP_STATE.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    const typeIcons = {
        'combustivel': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22h18"/><path d="M4 3h8v14H4z"/><path d="M8 3v2"/><path d="M8 17v5"/><path d="M12 9h4a2 2 0 0 1 2 2v5h-6"/><path d="M18 16v5"/></svg>',
        'alimentacao': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
        'alojamento': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
        'equipamento': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        'producao': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        'promocao': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
        'transporte': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
        'outros': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    
    let html = '';
    recentExpenses.forEach(expense => {
        const icon = typeIcons[expense.type] || typeIcons['outros'];
        html += `
            <div class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${expense.entity}</div>
                    <div class="activity-meta">${expense.category} • ${formatDate(expense.date)}</div>
                </div>
                <div class="activity-amount ${expense.investor === 'MacTube' ? 'mactube' : 'other'}">${formatCurrency(expense.value)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="color: var(--text-light); text-align: center; padding: 40px 0;">Sem atividade recente</p>';
}

// ============ REPORTS TABLE ============
function updateReportsTable(searchQuery = '') {
    const filterCategory = document.getElementById('filter-category')?.value || '';
    const filterSubcategory = document.getElementById('filter-subcategory')?.value || '';
    const filterInvestor = document.getElementById('filter-investor')?.value || '';
    
    let filtered = [...APP_STATE.expenses];
    
    // Apply filters
    if (filterCategory) {
        filtered = filtered.filter(e => e.category === filterCategory);
    }
    if (filterSubcategory) {
        filtered = filtered.filter(e => e.subcategory === filterSubcategory);
    }
    if (filterInvestor) {
        filtered = filtered.filter(e => e.investor === filterInvestor);
    }
    
    // Apply search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(e => 
            e.category.toLowerCase().includes(query) ||
            e.subcategory.toLowerCase().includes(query) ||
            e.entity.toLowerCase().includes(query) ||
            (e.notes && e.notes.toLowerCase().includes(query))
        );
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Update summary cards
    const totalFiltered = filtered.reduce((sum, e) => sum + e.value, 0);
    const mactubeFiltered = filtered.filter(e => e.investor === 'MacTube').reduce((sum, e) => sum + e.value, 0);
    const otherFiltered = filtered.filter(e => e.investor === 'Outro').reduce((sum, e) => sum + e.value, 0);
    
    const summaryTotal = document.getElementById('summary-total');
    const summaryMactube = document.getElementById('summary-mactube');
    const summaryOther = document.getElementById('summary-other');
    
    if (summaryTotal) summaryTotal.textContent = formatCurrency(totalFiltered);
    if (summaryMactube) summaryMactube.textContent = formatCurrency(mactubeFiltered);
    if (summaryOther) summaryOther.textContent = formatCurrency(otherFiltered);
    
    // Update table
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;
    
    const typeNames = {
        'combustivel': 'Combustível',
        'alimentacao': 'Alimentação',
        'alojamento': 'Alojamento',
        'equipamento': 'Equipamento',
        'producao': 'Produção',
        'promocao': 'Promoção',
        'transporte': 'Transporte',
        'outros': 'Outros'
    };
    
    let html = '';
    filtered.forEach(expense => {
        html += `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.category}</td>
                <td>${expense.subcategory}</td>
                <td>${typeNames[expense.type] || expense.type}</td>
                <td>${formatCurrency(expense.value)}</td>
                <td>${expense.entity}</td>
                <td><span class="investor-badge ${expense.investor.toLowerCase()}">${expense.investor}</span></td>
                <td>
                    <button class="action-btn" onclick="editExpense(${expense.id})" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="deleteExpense(${expense.id})" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: var(--text-light); padding: 40px 0;">Nenhuma despesa encontrada</td></tr>';
}

// ============ SETTLEMENT ============
function updateSettlement(selectedCategory = null) {
    const category = selectedCategory || document.getElementById('settlement-category')?.value;
    const container = document.getElementById('settlement-content');
    
    if (!container) return;
    
    if (!category) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-light);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p>Selecione um artista para ver o acerto de contas</p>
            </div>
        `;
        return;
    }
    
    const expenses = APP_STATE.expenses.filter(e => e.category === category);
    const mactubeTotal = expenses.filter(e => e.investor === 'MacTube').reduce((sum, e) => sum + e.value, 0);
    const otherTotal = expenses.filter(e => e.investor === 'Outro').reduce((sum, e) => sum + e.value, 0);
    const total = mactubeTotal + otherTotal;
    const difference = mactubeTotal - otherTotal;
    
    // Calculate per project
    const projectTotals = {};
    expenses.forEach(e => {
        if (!projectTotals[e.subcategory]) {
            projectTotals[e.subcategory] = { mactube: 0, other: 0 };
        }
        if (e.investor === 'MacTube') {
            projectTotals[e.subcategory].mactube += e.value;
        } else {
            projectTotals[e.subcategory].other += e.value;
        }
    });
    
    // Visual bar percentages
    const mactubePercent = total > 0 ? (mactubeTotal / total) * 100 : 50;
    const otherPercent = total > 0 ? (otherTotal / total) * 100 : 50;
    
    // Determine settlement status
    let resultIcon, resultClass, resultNote;
    if (difference > 0) {
        resultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>';
        resultClass = 'positive';
        resultNote = `${category} deve à MacTube`;
    } else if (difference < 0) {
        resultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>';
        resultClass = 'negative';
        resultNote = `MacTube deve a ${category}`;
    } else {
        resultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>';
        resultClass = 'neutral';
        resultNote = 'Contas acertadas';
    }
    
    // Build project breakdown HTML
    let projectBreakdownHtml = '';
    Object.entries(projectTotals).forEach(([project, totals]) => {
        const projectDiff = totals.mactube - totals.other;
        projectBreakdownHtml += `
            <div class="project-item">
                <span class="project-name">${project}</span>
                <span class="project-amount" style="color: ${projectDiff > 0 ? 'var(--primary)' : projectDiff < 0 ? 'var(--success)' : 'var(--text)'}">${formatCurrency(projectDiff)}</span>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="settlement-box">
            <div class="settlement-artist-name">${category}</div>
            
            <div class="settlement-visual">
                <div class="settlement-bar">
                    <div class="settlement-bar-mactube" style="width: ${mactubePercent}%"></div>
                    <div class="settlement-bar-others" style="width: ${otherPercent}%"></div>
                </div>
                <div class="settlement-bar-legend">
                    <span class="legend-mactube">MacTube: ${formatCurrency(mactubeTotal)}</span>
                    <span class="legend-others">Terceiros: ${formatCurrency(otherTotal)}</span>
                </div>
            </div>
            
            <div class="settlement-divider"></div>
            
            <div class="settlement-result">
                <div class="settlement-result-icon ${resultClass}">${resultIcon}</div>
                <div class="settlement-result-content">
                    <div class="settlement-result-label">Balanço</div>
                    <div class="settlement-result-value">${formatCurrency(Math.abs(difference))}</div>
                    <div class="settlement-note">${resultNote}</div>
                </div>
            </div>
            
            <div class="settlement-breakdown">
                <h4>Detalhes por Projeto</h4>
                ${projectBreakdownHtml || '<p style="color: var(--text-light);">Nenhum projeto encontrado</p>'}
            </div>
        </div>
    `;
}

// ============ EXPORT FUNCTIONS ============
function exportToExcel() {
    const filterCategory = document.getElementById('filter-category')?.value || '';
    const filterSubcategory = document.getElementById('filter-subcategory')?.value || '';
    const filterInvestor = document.getElementById('filter-investor')?.value || '';
    
    let data = [...APP_STATE.expenses];
    
    // Apply filters
    if (filterCategory) data = data.filter(e => e.category === filterCategory);
    if (filterSubcategory) data = data.filter(e => e.subcategory === filterSubcategory);
    if (filterInvestor) data = data.filter(e => e.investor === filterInvestor);
    
    // Sort by date
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const typeNames = {
        'combustivel': 'Combustível',
        'alimentacao': 'Alimentação',
        'alojamento': 'Alojamento',
        'equipamento': 'Equipamento',
        'producao': 'Produção',
        'promocao': 'Promoção',
        'transporte': 'Transporte',
        'outros': 'Outros'
    };
    
    // Build CSV
    let csv = 'Data,Artista,Projeto,Tipo,Valor,Entidade,Investidor,Notas\n';
    data.forEach(e => {
        csv += `${e.date},"${e.category}","${e.subcategory}","${typeNames[e.type] || e.type}",${e.value},"${e.entity}",${e.investor},"${e.notes || ''}"\n`;
    });
    
    // Add totals
    const total = data.reduce((sum, e) => sum + e.value, 0);
    const mactube = data.filter(e => e.investor === 'MacTube').reduce((sum, e) => sum + e.value, 0);
    const other = data.filter(e => e.investor === 'Outro').reduce((sum, e) => sum + e.value, 0);
    
    csv += '\n';
    csv += `Total,,,,${total},,MacTube: ${mactube} | Terceiros: ${other},\n`;
    
    // Download file
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MacTube_Despesas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Ficheiro Excel exportado com sucesso!');
}

function exportToPDF() {
    // Simple PDF generation using browser print
    const filterCategory = document.getElementById('filter-category')?.value || 'Todos os artistas';
    const filterSubcategory = document.getElementById('filter-subcategory')?.value || 'Todos os projetos';
    
    let data = [...APP_STATE.expenses];
    
    // Apply filters
    const categoryFilter = document.getElementById('filter-category')?.value;
    const subcategoryFilter = document.getElementById('filter-subcategory')?.value;
    const investorFilter = document.getElementById('filter-investor')?.value;
    
    if (categoryFilter) data = data.filter(e => e.category === categoryFilter);
    if (subcategoryFilter) data = data.filter(e => e.subcategory === subcategoryFilter);
    if (investorFilter) data = data.filter(e => e.investor === investorFilter);
    
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const total = data.reduce((sum, e) => sum + e.value, 0);
    const mactube = data.filter(e => e.investor === 'MacTube').reduce((sum, e) => sum + e.value, 0);
    const other = data.filter(e => e.investor === 'Outro').reduce((sum, e) => sum + e.value, 0);
    
    const typeNames = {
        'combustivel': 'Combustível',
        'alimentacao': 'Alimentação',
        'alojamento': 'Alojamento',
        'equipamento': 'Equipamento',
        'producao': 'Produção',
        'promocao': 'Promoção',
        'transporte': 'Transporte',
        'outros': 'Outros'
    };
    
    let tableRows = data.map(e => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td>${e.category}</td>
            <td>${e.subcategory}</td>
            <td>${typeNames[e.type] || e.type}</td>
            <td style="text-align: right;">${formatCurrency(e.value)}</td>
            <td>${e.entity}</td>
            <td>${e.investor}</td>
        </tr>
    `).join('');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MacTube - Relatório de Despesas</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #6366f1; margin-bottom: 8px; }
                .subtitle { color: #666; margin-bottom: 30px; }
                .summary { display: flex; gap: 30px; margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
                .summary-item { }
                .summary-label { font-size: 12px; color: #666; }
                .summary-value { font-size: 24px; font-weight: bold; color: #333; }
                .summary-value.primary { color: #6366f1; }
                .summary-value.success { color: #10b981; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f5f5f5; font-size: 12px; text-transform: uppercase; color: #666; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <h1>MacTube - Relatório de Despesas</h1>
            <p class="subtitle">Filtros: ${categoryFilter || 'Todos'} / ${subcategoryFilter || 'Todos'}</p>
            
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-label">Total</div>
                    <div class="summary-value">${formatCurrency(total)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">MacTube</div>
                    <div class="summary-value primary">${formatCurrency(mactube)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Terceiros</div>
                    <div class="summary-value success">${formatCurrency(other)}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Artista</th>
                        <th>Projeto</th>
                        <th>Tipo</th>
                        <th style="text-align: right;">Valor</th>
                        <th>Entidade</th>
                        <th>Investidor</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="footer">
                Gerado em ${new Date().toLocaleString('pt-PT')} | MacTube Expense Manager
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
    
    showToast('A abrir janela de impressão para PDF...');
}

// ============ UTILITIES ============
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (toastMessage) toastMessage.textContent = message;
    
    if (toastIcon) {
        if (type === 'error') {
            toastIcon.style.color = 'var(--error)';
        } else {
            toastIcon.style.color = 'var(--success)';
        }
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Make functions globally available
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
