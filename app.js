// Maktub Art Group - Expense Manager App
// ==========================================

// State
let expenses = [];
let currentUser = null;
let editingId = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const toast = document.getElementById('toast');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForm();
    initFilters();
    initModals();
    initAuth();
    setDefaultDate();
    loadData();
});

// ==========================================
// AUTH
// ==========================================

function initAuth() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    refreshBtn.addEventListener('click', () => {
        loadData();
        showToast('Dados atualizados', 'success');
    });
    
    // Check if already logged in
    const savedUser = localStorage.getItem('maktub_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    }
}

function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Demo login - accept any input
    if (email && password) {
        currentUser = {
            email: email,
            name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
        };
        localStorage.setItem('maktub_user', JSON.stringify(currentUser));
        showApp();
        showToast('Bem-vindo(a), ' + currentUser.name + '!', 'success');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('maktub_user');
    hideApp();
}

function showApp() {
    authScreen.classList.add('hidden');
    authScreen.classList.remove('active');
    appScreen.classList.remove('hidden');
    document.getElementById('user-greeting').textContent = currentUser.name;
    updateDashboard();
}

function hideApp() {
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    authScreen.classList.add('active');
}

// ==========================================
// TABS NAVIGATION - FIXED!
// ==========================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Hide all content
            contents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
            });
            
            // Activate clicked tab
            tab.classList.add('active');
            
            // Show target content - IDs now match data-tab values exactly!
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.classList.remove('hidden');
            }
            
            // Update data when switching to certain tabs
            if (targetId === 'reports') {
                renderTable();
            } else if (targetId === 'settlement') {
                updateSettlement();
            } else if (targetId === 'dashboard') {
                updateDashboard();
            }
        });
    });
}

// ==========================================
// EXPENSE FORM
// ==========================================

function initForm() {
    const form = document.getElementById('expense-form');
    const typeButtons = document.querySelectorAll('.type-btn');
    const investorButtons = document.querySelectorAll('.investor-btn');
    
    // Type selection
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('expense-type').value = btn.getAttribute('data-type');
        });
    });
    
    // Investor selection
    investorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            investorButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('investor').value = btn.getAttribute('data-investor');
        });
    });
    
    // Form submit
    form.addEventListener('submit', handleFormSubmit);
}

function setDefaultDate() {
    const dateInput = document.getElementById('expense-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const artist = document.getElementById('artist').value;
    const project = document.getElementById('project').value;
    const type = document.getElementById('expense-type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('expense-date').value;
    const entity = document.getElementById('entity').value;
    const investor = document.getElementById('investor').value;
    const notes = document.getElementById('notes').value;
    
    if (!artist || !project || !type || !amount || !date) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    const expense = {
        id: Date.now().toString(),
        artist,
        project,
        type,
        amount,
        date,
        entity,
        investor,
        notes,
        createdAt: new Date().toISOString()
    };
    
    expenses.push(expense);
    saveData();
    resetForm();
    updateDashboard();
    showToast('Despesa registada com sucesso!', 'success');
    
    // Switch to dashboard
    document.querySelector('[data-tab="dashboard"]').click();
}

function resetForm() {
    document.getElementById('expense-form').reset();
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.investor-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-investor="maktub"]').classList.add('selected');
    document.getElementById('investor').value = 'maktub';
    setDefaultDate();
}

// ==========================================
// DATA MANAGEMENT
// ==========================================

function loadData() {
    const saved = localStorage.getItem('maktub_expenses');
    if (saved) {
        expenses = JSON.parse(saved);
    } else {
        // Load demo data
        expenses = getDemoData();
        saveData();
    }
    updateDashboard();
}

function saveData() {
    localStorage.setItem('maktub_expenses', JSON.stringify(expenses));
}

function getDemoData() {
    return [
        {
            id: '1',
            artist: 'Buba Espinho',
            project: 'Videoclipe',
            type: 'producao',
            amount: 2500,
            date: '2025-01-10',
            entity: 'Studio XYZ',
            investor: 'maktub',
            notes: 'Produção videoclipe "Novo Single"',
            createdAt: '2025-01-10T10:00:00Z'
        },
        {
            id: '2',
            artist: 'MAR',
            project: 'Concerto',
            type: 'alojamento',
            amount: 450,
            date: '2025-01-12',
            entity: 'Hotel Lisboa',
            investor: 'maktub',
            notes: '2 noites para banda',
            createdAt: '2025-01-12T14:00:00Z'
        },
        {
            id: '3',
            artist: 'D.A.M.A',
            project: 'Tour',
            type: 'combustivel',
            amount: 180,
            date: '2025-01-14',
            entity: 'Galp',
            investor: 'outro',
            notes: 'Viagem Lisboa-Porto',
            createdAt: '2025-01-14T09:00:00Z'
        },
        {
            id: '4',
            artist: 'Buba Espinho',
            project: 'Promoção',
            type: 'promocao',
            amount: 800,
            date: '2025-01-15',
            entity: 'Meta Ads',
            investor: 'maktub',
            notes: 'Campanha Instagram',
            createdAt: '2025-01-15T11:00:00Z'
        },
        {
            id: '5',
            artist: 'Bandidos do Cante',
            project: 'Gravação',
            type: 'equipamento',
            amount: 350,
            date: '2025-01-16',
            entity: 'Thomann',
            investor: 'outro',
            notes: 'Cordas e acessórios',
            createdAt: '2025-01-16T16:00:00Z'
        },
        {
            id: '6',
            artist: 'MAR',
            project: 'Videoclipe',
            type: 'alimentacao',
            amount: 220,
            date: '2025-01-18',
            entity: 'Catering Pro',
            investor: 'maktub',
            notes: 'Catering dia de filmagem',
            createdAt: '2025-01-18T12:00:00Z'
        }
    ];
}

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {
    updateStats();
    updateCharts();
    updateRecentList();
}

function updateStats() {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const maktub = expenses.filter(e => e.investor === 'maktub').reduce((sum, e) => sum + e.amount, 0);
    const others = expenses.filter(e => e.investor === 'outro').reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('stat-total').textContent = formatCurrency(total);
    document.getElementById('stat-maktub').textContent = formatCurrency(maktub);
    document.getElementById('stat-others').textContent = formatCurrency(others);
    document.getElementById('stat-count').textContent = expenses.length;
}

function updateCharts() {
    updateArtistChart();
    updateTypeChart();
}

function updateArtistChart() {
    const container = document.getElementById('chart-artists');
    const byArtist = {};
    
    expenses.forEach(e => {
        byArtist[e.artist] = (byArtist[e.artist] || 0) + e.amount;
    });
    
    const sorted = Object.entries(byArtist).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 0;
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados</p>';
        return;
    }
    
    container.innerHTML = sorted.map(([artist, amount]) => `
        <div class="chart-bar-item">
            <span class="chart-bar-label">${artist}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${(amount / max * 100)}%"></div>
            </div>
            <span class="chart-bar-value">${formatCurrency(amount)}</span>
        </div>
    `).join('');
}

function updateTypeChart() {
    const container = document.getElementById('chart-types');
    const byType = {};
    
    expenses.forEach(e => {
        byType[e.type] = (byType[e.type] || 0) + e.amount;
    });
    
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 0;
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados</p>';
        return;
    }
    
    container.innerHTML = sorted.map(([type, amount]) => `
        <div class="chart-bar-item">
            <span class="chart-bar-label">${getTypeName(type)}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${(amount / max * 100)}%"></div>
            </div>
            <span class="chart-bar-value">${formatCurrency(amount)}</span>
        </div>
    `).join('');
}

function updateRecentList() {
    const container = document.getElementById('recent-list');
    const recent = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p>Nenhuma despesa registada</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recent.map(e => `
        <div class="activity-item">
            <div class="activity-type">
                ${getTypeIcon(e.type)}
            </div>
            <div class="activity-info">
                <div class="activity-title">${e.artist} - ${getTypeName(e.type)}</div>
                <div class="activity-meta">${e.project} • ${formatDate(e.date)}</div>
            </div>
            <div class="activity-amount ${e.investor === 'maktub' ? 'maktub' : 'other'}">
                ${formatCurrency(e.amount)}
            </div>
        </div>
    `).join('');
}

// ==========================================
// REPORTS / TABLE
// ==========================================

function initFilters() {
    document.getElementById('search-input').addEventListener('input', renderTable);
    document.getElementById('filter-artist').addEventListener('change', renderTable);
    document.getElementById('filter-type').addEventListener('change', renderTable);
    document.getElementById('filter-investor').addEventListener('change', renderTable);
    
    document.getElementById('export-csv').addEventListener('click', exportCSV);
    document.getElementById('export-pdf').addEventListener('click', exportPDF);
    document.getElementById('view-all-btn').addEventListener('click', () => {
        document.querySelector('[data-tab="reports"]').click();
    });
}

function renderTable() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const artistFilter = document.getElementById('filter-artist').value;
    const typeFilter = document.getElementById('filter-type').value;
    const investorFilter = document.getElementById('filter-investor').value;
    
    let filtered = expenses.filter(e => {
        const matchSearch = !search || 
            e.artist.toLowerCase().includes(search) ||
            e.project.toLowerCase().includes(search) ||
            e.entity.toLowerCase().includes(search) ||
            e.notes.toLowerCase().includes(search);
        
        const matchArtist = artistFilter === 'all' || e.artist === artistFilter;
        const matchType = typeFilter === 'all' || e.type === typeFilter;
        const matchInvestor = investorFilter === 'all' || e.investor === investorFilter;
        
        return matchSearch && matchArtist && matchType && matchInvestor;
    });
    
    // Update summary
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    const maktub = filtered.filter(e => e.investor === 'maktub').reduce((sum, e) => sum + e.amount, 0);
    const others = filtered.filter(e => e.investor === 'outro').reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('summary-total').textContent = formatCurrency(total);
    document.getElementById('summary-maktub').textContent = formatCurrency(maktub);
    document.getElementById('summary-others').textContent = formatCurrency(others);
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render table
    const tbody = document.getElementById('expenses-body');
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    Nenhuma despesa encontrada
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(e => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td>${e.artist}</td>
            <td>${e.project}</td>
            <td>${getTypeName(e.type)}</td>
            <td>${e.entity || '-'}</td>
            <td><span class="badge ${e.investor === 'maktub' ? 'badge-maktub' : 'badge-other'}">${e.investor === 'maktub' ? 'Maktub' : 'Terceiros'}</span></td>
            <td>${formatCurrency(e.amount)}</td>
            <td>
                <div class="table-actions">
                    <button onclick="openEditModal('${e.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" onclick="openDeleteModal('${e.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function exportCSV() {
    const headers = ['Data', 'Artista', 'Projeto', 'Tipo', 'Entidade', 'Investidor', 'Valor', 'Notas'];
    const rows = expenses.map(e => [
        e.date,
        e.artist,
        e.project,
        getTypeName(e.type),
        e.entity,
        e.investor === 'maktub' ? 'Maktub' : 'Terceiros',
        e.amount.toFixed(2),
        e.notes
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `maktub_despesas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exportado!', 'success');
}

function exportPDF() {
    // Simple print-based PDF export
    const printWindow = window.open('', '_blank');
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const maktub = expenses.filter(e => e.investor === 'maktub').reduce((sum, e) => sum + e.amount, 0);
    const others = expenses.filter(e => e.investor === 'outro').reduce((sum, e) => sum + e.amount, 0);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maktub Art Group - Relatório de Despesas</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #111; margin-bottom: 8px; }
                .subtitle { color: #666; margin-bottom: 32px; }
                .summary { display: flex; gap: 24px; margin-bottom: 32px; }
                .summary-item { padding: 16px; background: #f5f5f5; border-radius: 8px; }
                .summary-label { font-size: 12px; color: #666; display: block; margin-bottom: 4px; }
                .summary-value { font-size: 20px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f5f5f5; font-weight: 600; }
                .maktub { color: #33E933; }
                .outros { color: #ffbb33; }
            </style>
        </head>
        <body>
            <h1>Maktub Art Group</h1>
            <p class="subtitle">Relatório de Despesas - ${new Date().toLocaleDateString('pt-PT')}</p>
            
            <div class="summary">
                <div class="summary-item">
                    <span class="summary-label">Total</span>
                    <span class="summary-value">${formatCurrency(total)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Maktub</span>
                    <span class="summary-value maktub">${formatCurrency(maktub)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Terceiros</span>
                    <span class="summary-value outros">${formatCurrency(others)}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Artista</th>
                        <th>Projeto</th>
                        <th>Tipo</th>
                        <th>Investidor</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => `
                        <tr>
                            <td>${formatDate(e.date)}</td>
                            <td>${e.artist}</td>
                            <td>${e.project}</td>
                            <td>${getTypeName(e.type)}</td>
                            <td class="${e.investor === 'maktub' ? 'maktub' : 'outros'}">${e.investor === 'maktub' ? 'Maktub' : 'Terceiros'}</td>
                            <td>${formatCurrency(e.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showToast('A preparar PDF...', 'success');
}

// ==========================================
// SETTLEMENT
// ==========================================

function updateSettlement() {
    const maktub = expenses.filter(e => e.investor === 'maktub').reduce((sum, e) => sum + e.amount, 0);
    const others = expenses.filter(e => e.investor === 'outro').reduce((sum, e) => sum + e.amount, 0);
    const total = maktub + others;
    
    document.getElementById('settle-maktub').textContent = formatCurrency(maktub);
    document.getElementById('settle-others').textContent = formatCurrency(others);
    
    // Balance bar
    const pctMaktub = total > 0 ? (maktub / total * 100) : 50;
    const pctOthers = total > 0 ? (others / total * 100) : 50;
    
    document.getElementById('bar-maktub').style.width = pctMaktub + '%';
    document.getElementById('bar-others').style.width = pctOthers + '%';
    document.getElementById('pct-maktub').textContent = pctMaktub.toFixed(1) + '%';
    document.getElementById('pct-others').textContent = pctOthers.toFixed(1) + '%';
    
    // Summary text
    const summaryEl = document.getElementById('settlement-summary');
    if (total === 0) {
        summaryEl.innerHTML = '<p>Carregue dados para ver o resumo do acerto.</p>';
    } else {
        const diff = Math.abs(maktub - others);
        const whoOwes = maktub > others ? 'terceiros devem ao Maktub' : 'Maktub deve a terceiros';
        summaryEl.innerHTML = `
            <p>
                O <strong>Maktub Art Group</strong> investiu <span class="highlight">${formatCurrency(maktub)}</span> 
                (${pctMaktub.toFixed(1)}% do total).
            </p>
            <p>
                Os <strong>terceiros</strong> investiram <span class="highlight">${formatCurrency(others)}</span> 
                (${pctOthers.toFixed(1)}% do total).
            </p>
            <p style="margin-top: 16px;">
                ${diff > 0 ? `Para equilibrar as contas, os <strong>${whoOwes}</strong> um total de <span class="highlight">${formatCurrency(diff)}</span>.` : 'As contas estão equilibradas!'}
            </p>
        `;
    }
    
    // Artist breakdown
    updateArtistBreakdown();
}

function updateArtistBreakdown() {
    const container = document.getElementById('artist-breakdown-list');
    const byArtist = {};
    
    expenses.forEach(e => {
        if (!byArtist[e.artist]) {
            byArtist[e.artist] = { maktub: 0, others: 0 };
        }
        if (e.investor === 'maktub') {
            byArtist[e.artist].maktub += e.amount;
        } else {
            byArtist[e.artist].others += e.amount;
        }
    });
    
    const artists = Object.entries(byArtist);
    
    if (artists.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados</p>';
        return;
    }
    
    container.innerHTML = artists.map(([artist, data]) => `
        <div class="breakdown-item">
            <span class="breakdown-artist">${artist}</span>
            <div class="breakdown-values">
                <span class="breakdown-maktub">Maktub: ${formatCurrency(data.maktub)}</span>
                <span class="breakdown-others">Terceiros: ${formatCurrency(data.others)}</span>
            </div>
        </div>
    `).join('');
}

// ==========================================
// MODALS
// ==========================================

function initModals() {
    // Edit modal
    document.getElementById('close-edit').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('edit-form').addEventListener('submit', handleEdit);
    
    // Delete modal
    document.getElementById('close-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', handleDelete);
    
    // Close on backdrop click
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
    document.getElementById('delete-modal').addEventListener('click', (e) => {
        if (e.target.id === 'delete-modal') closeDeleteModal();
    });
}

function openEditModal(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
    editingId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-artist').value = expense.artist;
    document.getElementById('edit-project').value = expense.project;
    document.getElementById('edit-type').value = expense.type;
    document.getElementById('edit-amount').value = expense.amount;
    document.getElementById('edit-date').value = expense.date;
    document.getElementById('edit-entity').value = expense.entity;
    document.getElementById('edit-investor').value = expense.investor;
    document.getElementById('edit-notes').value = expense.notes;
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    editingId = null;
}

function handleEdit(e) {
    e.preventDefault();
    
    const index = expenses.findIndex(exp => exp.id === editingId);
    if (index === -1) return;
    
    expenses[index] = {
        ...expenses[index],
        artist: document.getElementById('edit-artist').value,
        project: document.getElementById('edit-project').value,
        type: document.getElementById('edit-type').value,
        amount: parseFloat(document.getElementById('edit-amount').value),
        date: document.getElementById('edit-date').value,
        entity: document.getElementById('edit-entity').value,
        investor: document.getElementById('edit-investor').value,
        notes: document.getElementById('edit-notes').value
    };
    
    saveData();
    closeEditModal();
    renderTable();
    updateDashboard();
    showToast('Despesa atualizada!', 'success');
}

function openDeleteModal(id) {
    document.getElementById('delete-id').value = id;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
}

function handleDelete() {
    const id = document.getElementById('delete-id').value;
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    closeDeleteModal();
    renderTable();
    updateDashboard();
    showToast('Despesa eliminada!', 'success');
}

// ==========================================
// UTILITIES
// ==========================================

function formatCurrency(amount) {
    return amount.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' EUR';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getTypeName(type) {
    const types = {
        combustivel: 'Combustível',
        alimentacao: 'Alimentação',
        alojamento: 'Alojamento',
        equipamento: 'Equipamento',
        producao: 'Produção',
        promocao: 'Promoção',
        transporte: 'Transporte',
        outros: 'Outros'
    };
    return types[type] || type;
}

function getTypeIcon(type) {
    const icons = {
        combustivel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M13 10h4a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2"/><circle cx="8" cy="10" r="2"/></svg>',
        alimentacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>',
        alojamento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>',
        equipamento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><path d="M8 17V5l12-2v12"/></svg>',
        producao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
        promocao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
        transporte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10H6l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
        outros: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
    };
    return icons[type] || icons.outros;
}

function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = 'toast' + (type ? ' ' + type : '');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Make functions globally accessible for onclick handlers
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
