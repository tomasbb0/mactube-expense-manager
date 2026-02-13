// Maktub Art Group - Expense Manager App
// ==========================================

// Google Sheets Integration
// IMPORTANT: Replace this URL with your deployed Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxDZ5FINtZU0s9-T4ULaY9TIgAgXo2wv26Oi2KQKOZR9IFIjPcuyyR9g7azk9fls8HY/exec";

// Helper function to send data to Google Sheets
async function sendToGoogleSheets(payload) {
  console.log("🔵 [DEBUG] sendToGoogleSheets called");
  console.log("🔵 [DEBUG] URL:", GOOGLE_SCRIPT_URL);
  console.log("🔵 [DEBUG] Payload action:", payload.action);
  console.log("🔵 [DEBUG] Payload expenses count:", payload.expenses?.length);
  console.log(
    "🔵 [DEBUG] First expense sample:",
    JSON.stringify(payload.expenses?.[0]),
  );

  // Use text/plain to avoid CORS preflight
  try {
    console.log("🔵 [DEBUG] About to fetch...");
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    console.log("🔵 [DEBUG] Fetch completed");
    console.log("🔵 [DEBUG] Response status:", response.status);
    console.log("🔵 [DEBUG] Response ok:", response.ok);
    console.log("🔵 [DEBUG] Response type:", response.type);
    console.log("🔵 [DEBUG] Response headers:", [
      ...response.headers.entries(),
    ]);

    const text = await response.text();
    console.log("🔵 [DEBUG] Response text:", text);
    console.log("🔵 [DEBUG] Response text length:", text.length);

    try {
      const parsed = JSON.parse(text);
      console.log("🟢 [DEBUG] Parsed response:", parsed);
      return parsed;
    } catch (e) {
      console.log("🟡 [DEBUG] Could not parse as JSON:", e.message);
      return { success: true, raw: text };
    }
  } catch (fetchError) {
    console.error("🔴 [DEBUG] Fetch error:", fetchError);
    console.error("🔴 [DEBUG] Error name:", fetchError.name);
    console.error("🔴 [DEBUG] Error message:", fetchError.message);
    throw fetchError;
  }
}

// State
let expenses = [];
let currentUser = null;
let editingId = null;
let customArtists = [];
let customProjects = [];
let isSyncing = false;

// DOM Elements
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");
const toast = document.getElementById("toast");

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initForm();
  initFilters();
  initModals();
  initAuth();
  initGoogleSheetsSync();
  setDefaultDate();
  loadData();
});

// ==========================================
// AUTH
// ==========================================

function initAuth() {
  loginBtn.addEventListener("click", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  refreshBtn.addEventListener("click", () => {
    loadData();
    showToast("Dados atualizados", "success");
  });

  // Check if already logged in
  const savedUser = localStorage.getItem("maktub_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  }
}

function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Demo login - accept any input
  if (email && password) {
    currentUser = {
      email: email,
      name:
        email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1),
    };
    localStorage.setItem("maktub_user", JSON.stringify(currentUser));
    showApp();
    showToast("Bem-vindo(a), " + currentUser.name + "!", "success");
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem("maktub_user");
  hideApp();
}

function showApp() {
  authScreen.classList.add("hidden");
  authScreen.classList.remove("active");
  appScreen.classList.remove("hidden");
  document.getElementById("user-greeting").textContent = currentUser.name;
  updateDashboard();
  updateFilterDropdowns();
}

function hideApp() {
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  authScreen.classList.add("active");
}

// ==========================================
// TABS NAVIGATION
// ==========================================

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");

      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => {
        c.classList.remove("active");
        c.classList.add("hidden");
      });

      tab.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add("active");
        targetContent.classList.remove("hidden");
      }

      if (targetId === "reports") {
        renderTable();
        renderPivotTables();
      } else if (targetId === "settlement") {
        updateSettlement();
      } else if (targetId === "dashboard") {
        updateDashboard();
      }
    });
  });
}

// ==========================================
// ADD NEW OPTIONS
// ==========================================

function addNewOption(fieldId, promptText) {
  const wrapper = document.getElementById(fieldId).closest(".select-with-add");
  const select = document.getElementById(fieldId);

  // If inline input already showing, do nothing
  if (wrapper.querySelector(".inline-add-input")) return;

  // Hide select and + button
  select.style.display = "none";
  wrapper.querySelector(".btn-add-option").style.display = "none";

  // Create inline input row
  const inputRow = document.createElement("div");
  inputRow.className = "inline-add-input";
  inputRow.style.cssText = "display:flex;gap:8px;flex:1;";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = promptText + "...";
  input.style.cssText =
    "flex:1;padding:12px 14px;font-size:0.95rem;background:var(--bg-primary);color:var(--text-primary);border:2px solid transparent;border-radius:var(--radius-sm);outline:none;box-shadow:var(--card-shadow);";
  input.addEventListener("focus", () => {
    input.style.boxShadow = "0 0 0 3px var(--green-glow), var(--card-shadow)";
  });
  input.addEventListener("blur", () => {
    input.style.boxShadow = "var(--card-shadow)";
  });

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.textContent = "✓";
  confirmBtn.style.cssText =
    "width:44px;height:44px;background:var(--green-primary);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);font-size:1.2rem;cursor:pointer;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "✕";
  cancelBtn.style.cssText =
    "width:44px;height:44px;background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid transparent;border-radius:var(--radius-sm);font-size:1.1rem;cursor:pointer;box-shadow:var(--card-shadow);";

  function cleanup() {
    inputRow.remove();
    select.style.display = "";
    wrapper.querySelector(".btn-add-option").style.display = "";
  }

  confirmBtn.addEventListener("click", () => {
    const newValue = input.value.trim();
    if (newValue) {
      const option = document.createElement("option");
      option.value = newValue;
      option.textContent = newValue;
      select.appendChild(option);
      select.value = newValue;

      if (fieldId === "artist") {
        customArtists.push(newValue);
        localStorage.setItem(
          "maktub_custom_artists",
          JSON.stringify(customArtists),
        );
      } else if (fieldId === "project") {
        customProjects.push(newValue);
        localStorage.setItem(
          "maktub_custom_projects",
          JSON.stringify(customProjects),
        );
      }

      showToast("Opção adicionada!", "success");
      cleanup();

      if (fieldId === "artist") filterProjectsByArtist();
    }
  });

  cancelBtn.addEventListener("click", cleanup);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmBtn.click();
    }
    if (e.key === "Escape") cancelBtn.click();
  });

  inputRow.appendChild(input);
  inputRow.appendChild(confirmBtn);
  inputRow.appendChild(cancelBtn);
  wrapper.appendChild(inputRow);
  input.focus();
}

function loadCustomOptions() {
  const savedArtists = localStorage.getItem("maktub_custom_artists");
  const savedProjects = localStorage.getItem("maktub_custom_projects");

  if (savedArtists) {
    customArtists = JSON.parse(savedArtists);
    const artistSelect = document.getElementById("artist");
    customArtists.forEach((a) => {
      const option = document.createElement("option");
      option.value = a;
      option.textContent = a;
      artistSelect.appendChild(option);
    });
  }

  if (savedProjects) {
    customProjects = JSON.parse(savedProjects);
    const projectSelect = document.getElementById("project");
    customProjects.forEach((p) => {
      const option = document.createElement("option");
      option.value = p;
      option.textContent = p;
      projectSelect.appendChild(option);
    });
  }
}

// Artist to Projects mapping (based on real data - per artist only)
const artistProjects = {
  "D.A.M.A": [
    "Beja 25 Abril",
    "Festival Académico Lisboa",
    "Salvaterra de Magos",
    "Prémios Play",
    "Benedita",
    "Alvarães",
  ],
  "Buba Espinho": [],
  MAR: [],
  "Bandidos do Cante": [
    "Gerais Bandidos",
    "Álbum Bairro das Flores - Geral",
    "Amigos Coloridos",
    "Já não há pardais no céu",
    "Tanto Tempo",
    "QUERO ACREDITAR",
    "Voltar a Ver-te",
    "Primavera - Zambujo",
    "Nada Mais",
    "Bairro das Flores",
    "Rosa",
    "Tu És - 4 e Meia",
  ],
  BRUCE: [],
  INÊS: [],
  LUTZ: [],
  "REAL GUNS": [],
  SUAVE: [],
};

// All available projects (for fallback)
const allProjects = [
  // D.A.M.A projects
  { value: "Beja 25 Abril", label: "🎤 Beja 25 Abril" },
  { value: "Festival Académico Lisboa", label: "🎤 Festival Académico Lisboa" },
  { value: "Salvaterra de Magos", label: "🎤 Salvaterra de Magos" },
  { value: "Prémios Play", label: "🏆 Prémios Play" },
  { value: "Benedita", label: "🎤 Benedita" },
  { value: "Alvarães", label: "🎤 Alvarães" },
  // Bandidos do Cante projects
  { value: "Gerais Bandidos", label: "💰 Gerais Bandidos" },
  {
    value: "Álbum Bairro das Flores - Geral",
    label: "🎵 Álbum Bairro das Flores - Geral",
  },
  { value: "Amigos Coloridos", label: "🎵 Amigos Coloridos" },
  { value: "Já não há pardais no céu", label: "🎵 Já não há pardais no céu" },
  { value: "Tanto Tempo", label: "🎵 Tanto Tempo" },
  { value: "QUERO ACREDITAR", label: "🎵 QUERO ACREDITAR" },
  { value: "Voltar a Ver-te", label: "🎵 Voltar a Ver-te" },
  { value: "Primavera - Zambujo", label: "🎵 Primavera - Zambujo" },
  { value: "Nada Mais", label: "🎵 Nada Mais" },
  { value: "Bairro das Flores", label: "🎵 Bairro das Flores" },
  { value: "Rosa", label: "🎵 Rosa" },
  { value: "Tu És - 4 e Meia", label: "🎵 Tu És - 4 e Meia" },
];

function filterProjectsByArtist() {
  const artistSelect = document.getElementById("artist");
  const projectSelect = document.getElementById("project");
  const selectedArtist = artistSelect.value;

  // Save current value
  const currentProject = projectSelect.value;

  // Clear and rebuild options
  projectSelect.innerHTML = '<option value="">Selecionar...</option>';

  // Get projects for this artist (or all if not mapped)
  const allowedProjects =
    artistProjects[selectedArtist] || allProjects.map((p) => p.value);

  // Add filtered projects
  allProjects.forEach((proj) => {
    if (allowedProjects.includes(proj.value)) {
      const option = document.createElement("option");
      option.value = proj.value;
      option.textContent = proj.label;
      projectSelect.appendChild(option);
    }
  });

  // Add custom projects
  customProjects.forEach((p) => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    projectSelect.appendChild(option);
  });

  // Restore value if still valid
  if (currentProject && allowedProjects.includes(currentProject)) {
    projectSelect.value = currentProject;
  }
}

// Make global
window.addNewOption = addNewOption;
window.filterProjectsByArtist = filterProjectsByArtist;

// ==========================================
// EXPENSE FORM
// ==========================================

function initForm() {
  const form = document.getElementById("expense-form");
  const typeButtons = document.querySelectorAll(".type-btn");
  const investorButtons = document.querySelectorAll(".investor-btn");

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("expense-type").value =
        btn.getAttribute("data-type");
    });
  });

  investorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      investorButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("investor").value =
        btn.getAttribute("data-investor");
    });
  });

  form.addEventListener("submit", handleFormSubmit);
  loadCustomOptions();

  // Add artist change listener to filter projects
  const artistSelect = document.getElementById("artist");
  artistSelect.addEventListener("change", filterProjectsByArtist);
}

function setDefaultDate() {
  const dateInput = document.getElementById("expense-date");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const artist = document.getElementById("artist").value;
  const project = document.getElementById("project").value;
  const type = document.getElementById("expense-type").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("expense-date").value;
  const entity = document.getElementById("entity").value;
  const investor = document.getElementById("investor").value;
  const notes = document.getElementById("notes").value;

  if (!artist || !project || !type || !amount || !date) {
    showToast("Preencha todos os campos obrigatórios", "error");
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
    createdAt: new Date().toISOString(),
  };

  expenses.push(expense);
  saveData();
  resetForm();
  updateDashboard();
  updateFilterDropdowns();
  showToast("Despesa registada com sucesso!", "success");

  document.querySelector('[data-tab="dashboard"]').click();
}

function resetForm() {
  document.getElementById("expense-form").reset();
  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("selected"));
  document
    .querySelectorAll(".investor-btn")
    .forEach((b) => b.classList.remove("selected"));
  document.querySelector('[data-investor="maktub"]').classList.add("selected");
  document.getElementById("investor").value = "maktub";
  setDefaultDate();
}

// ==========================================
// DATA MANAGEMENT
// ==========================================

const DATA_VERSION = 5; // Increment to force reload - v5: Fixed settlement, renamed data functions

function loadData() {
  const saved = localStorage.getItem("maktub_expenses");
  const savedVersion = localStorage.getItem("maktub_data_version");

  // Force regenerate if version changed or no data
  if (saved && savedVersion === String(DATA_VERSION)) {
    expenses = JSON.parse(saved);
  } else {
    expenses = generateDemoData(300);
    saveData();
    localStorage.setItem("maktub_data_version", String(DATA_VERSION));
  }
  updateDashboard();
  updateFilterDropdowns();
}

function saveData() {
  localStorage.setItem("maktub_expenses", JSON.stringify(expenses));
}

// Deduplicate expenses - removes duplicates by ID (the simplest approach!)
function deduplicateExpenses() {
  const beforeCount = expenses.length;

  // Simply keep first occurrence of each ID
  const seenIds = new Set();
  const uniqueExpenses = [];

  expenses.forEach((exp) => {
    if (!seenIds.has(exp.id)) {
      seenIds.add(exp.id);
      uniqueExpenses.push(exp);
    }
  });

  const removed = beforeCount - uniqueExpenses.length;
  expenses = uniqueExpenses;
  saveData();

  console.log(
    `✅ Deduplication complete: ${beforeCount} → ${uniqueExpenses.length} (removed ${removed} duplicates)`,
  );

  updateDashboard();
  renderTable();
  renderPivotTables();
  updateSettlement();

  return { before: beforeCount, after: uniqueExpenses.length, removed };
}

function generateDemoData(count) {
  // Return all demo data (D.A.M.A real data + other artists demo data)
  const allData = getAllDemoData();

  // If we have enough data, use it
  if (allData.length >= count) {
    return allData
      .slice(0, count)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Return all data
  return allData.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// REAL DATA from "Apuramento DAMA_Abril e Maio.xlsx" + demo data for all other artists
function getAllDemoData() {
  const data = [];
  let id = 1700000000000;

  // ============================================================
  // === D.A.M.A BEJA 25 ABRIL (25.04.2024) ===
  // ============================================================
  // PROVEITO
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 26750,
    date: "2024-04-01",
    entity: "Serviços prestados por artistas - Aquisição de serviços",
    investor: "outro",
    notes: "PROVEITO - Cachet concerto",
    createdAt: "2024-04-01T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 105,
    date: "2024-04-26",
    entity: "Jorge - despesa DAMA Beja-37391223",
    investor: "maktub",
    notes: "Alimentação - comitivas",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 170,
    date: "2024-04-25",
    entity: "Almoço 9 Técnicos",
    investor: "maktub",
    notes: "Alimentação - comitivas",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 616,
    date: "2024-04-25",
    entity: "Jantar da comitiva dia de concerto",
    investor: "maktub",
    notes: "Alimentação - comitivas",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 8,
    date: "2024-04-25",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Alimentação - comitivas",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alojamento",
    amount: 1700,
    date: "2024-04-23",
    entity: "Bejaparque Hotel",
    investor: "maktub",
    notes: "Alojamento DAMA - 25/04",
    createdAt: "2024-04-23T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "equipamento",
    amount: 32,
    date: "2024-04-26",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer de rampa de carga",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "equipamento",
    amount: 650,
    date: "2024-04-26",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer material audio | DAMA | Beja",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "equipamento",
    amount: 2000,
    date: "2024-04-26",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Material Audiovisual | DAMA | Beja 25.04",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 225,
    date: "2024-05-02",
    entity: "ANA RITA CORREIA GOMES",
    investor: "maktub",
    notes: "Cachet Ana Rita Gomes | DAMA | Beja 25.04",
    createdAt: "2024-05-02T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 175,
    date: "2024-04-30",
    entity: "P S PORTUGAL EVENTS SERVICE LDA",
    investor: "maktub",
    notes: "Cachet Andre Silva - DAMA - Beja",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 150,
    date: "2024-06-12",
    entity: "FUTURO CRIATIVO LDA",
    investor: "maktub",
    notes: "Cachet Cátia Figueiredo - DAMA - Beja",
    createdAt: "2024-06-12T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 400,
    date: "2024-05-07",
    entity: "PRO NOBIS, CRL",
    investor: "maktub",
    notes: "Cachet Daniel fialho | dama | beja 25/04",
    createdAt: "2024-05-07T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 250,
    date: "2024-04-30",
    entity: "FRANCISCO FRAGOSO LAPLAINE GUIMARÃES",
    investor: "maktub",
    notes: "Cachet Francisco Guimarães | DAMA | 25 de Abril",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 600,
    date: "2024-04-29",
    entity: "Interpele, Lda",
    investor: "maktub",
    notes: "Cachet Francisco Meoli - DAMA - Beja",
    createdAt: "2024-04-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 125,
    date: "2024-04-30",
    entity: "Memories Torrent - Unipessoal, Lda",
    investor: "maktub",
    notes: "Cachet Francisco Oliveira | DAMA | Beja",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 350,
    date: "2024-04-30",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Sales | DAMA | Beja",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 250,
    date: "2024-05-08",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Cachet João Nunes | DAMA | Beja 25.04",
    createdAt: "2024-05-08T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 350,
    date: "2024-05-02",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Cachet Luis Batista - DAMA - Beja",
    createdAt: "2024-05-02T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 400,
    date: "2024-05-01",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMa - Beja",
    createdAt: "2024-05-01T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 300,
    date: "2024-05-01",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Beja",
    createdAt: "2024-05-01T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 240,
    date: "2024-05-01",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Beja (Ensaios)",
    createdAt: "2024-05-01T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 500,
    date: "2024-04-30",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarías | DAMA | Beja 25.04",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 50,
    date: "2024-04-30",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarías | DAMA | Beja 25.04-SERV APOIO",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 400,
    date: "2024-05-01",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Beja",
    createdAt: "2024-05-01T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 300,
    date: "2024-04-30",
    entity: "PEDRO SOARES MARQUES",
    investor: "maktub",
    notes: "Cachet Pedro Marques | DAMA | Beja 25.04",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "producao",
    amount: 350,
    date: "2024-05-10",
    entity: "CO FR/18",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho | DAMA | Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 135.83,
    date: "2024-04-23",
    entity: "Catering Concerto",
    investor: "maktub",
    notes: "Catering - hipermercados",
    createdAt: "2024-04-23T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 174.85,
    date: "2024-04-23",
    entity: "Catering Concerto",
    investor: "maktub",
    notes: "Catering - hipermercados",
    createdAt: "2024-04-23T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 2.3,
    date: "2024-04-25",
    entity: "Catering Concerto",
    investor: "maktub",
    notes: "Catering - hipermercados",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 23.5,
    date: "2024-04-25",
    entity: "Catering Concerto",
    investor: "maktub",
    notes: "Catering - hipermercados",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "alimentacao",
    amount: 26,
    date: "2024-04-25",
    entity: "Catering Concerto",
    investor: "maktub",
    notes: "Catering - hipermercados",
    createdAt: "2024-04-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 35,
    date: "2024-03-05",
    entity: "Município de Beja",
    investor: "maktub",
    notes: "Contrato DAMA e os Bandidos do Cante 25º Aniv 25/04",
    createdAt: "2024-03-05T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 12.5,
    date: "2024-05-10",
    entity: "CO FR/18",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - CO Tiago Joaninho",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 12.5,
    date: "2024-05-02",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-02T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 14.28,
    date: "2024-05-01",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-01T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 8.93,
    date: "2024-05-08",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - João Nunes",
    createdAt: "2024-05-08T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 10.71,
    date: "2024-04-30",
    entity: "PEDRO SOARES MARQUES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - Pedro Marques",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 29.92,
    date: "2024-04-30",
    entity: "Pieter Smit Theather Rock Portugal, Lda",
    investor: "maktub",
    notes: "Débito de portagens 25.04-30.04 | DAMA | Beja",
    createdAt: "2024-04-30T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 40.26,
    date: "2024-04-26",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 91.62,
    date: "2024-04-26",
    entity: "Carrinha Técnicos & Backline",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 30,
    date: "2024-04-24",
    entity: "Levantamento da Pieter Smit",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-04-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 111.89,
    date: "2024-04-26",
    entity: "TRF P2P 106051418 351 969795464",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 54.4,
    date: "2024-04-29",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-04-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 45.11,
    date: "2024-04-26",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-04-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "combustivel",
    amount: 72.73,
    date: "2024-04-24",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-04-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 43.95,
    date: "2024-05-17",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens R5518310 AN - DAMA - Beja",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 36.26,
    date: "2024-05-10",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens R55PQ87 - DAMA - Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 175,
    date: "2024-05-10",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Servço de Apoio - António Farinha Driver - DAMA - Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 450,
    date: "2024-05-10",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio - Andre Silva Driver - DAMA - Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 160,
    date: "2024-05-10",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio R5518310 AN - DAMA - Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "transporte",
    amount: 360,
    date: "2024-05-10",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio R55PQ87 AQ - DAMA - Beja",
    createdAt: "2024-05-10T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Beja 25 Abril",
    type: "outros",
    amount: 178.77,
    date: "2024-06-11",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-11T10:00:00Z",
  });

  // ============================================================
  // === D.A.M.A FESTIVAL ACADÉMICO LISBOA (04.05.2024) ===
  // ============================================================
  // PROVEITOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 15000,
    date: "2024-03-06",
    entity: "50% Cachet D.A.M.A | Festival Académico de Lisboa",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-03-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 15000,
    date: "2024-05-02",
    entity: "50% Cachet D.A.M.A | Festival Académico de Lisboa | 04.05.24",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-05-02T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "equipamento",
    amount: 2000,
    date: "2024-05-06",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Material Audiovisual | DAMA | Lisboa 04.05",
    createdAt: "2024-05-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "equipamento",
    amount: 32,
    date: "2024-05-06",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Rampa de carga",
    createdAt: "2024-05-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 225,
    date: "2024-06-03",
    entity: "ANA RITA CORREIA GOMES",
    investor: "maktub",
    notes: "Cachet Ana Rita Gomes - DAMA - Lisboa",
    createdAt: "2024-06-03T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 400,
    date: "2024-06-04",
    entity: "PRO NOBIS, CRL",
    investor: "maktub",
    notes: "Cachet Daniel Fialho_aluguer portatil video - DAMA - Lisboa",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 250,
    date: "2024-06-20",
    entity: "FRANCISCO FRAGOSO LAPLAINE GUIMARÃES",
    investor: "maktub",
    notes: "Cachet Francisco Guimarães - DAMA - Lisboa",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 600,
    date: "2024-05-06",
    entity: "Interpele, Lda",
    investor: "maktub",
    notes: "Cachet Francisco Meoli - DAMA - Fest. Académico Lisboa 04/05",
    createdAt: "2024-05-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 350,
    date: "2024-05-09",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Sales | DAMA | SAL 04.05",
    createdAt: "2024-05-09T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 150,
    date: "2024-06-18",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Cachet João Nunes - DAMA - Lisboa",
    createdAt: "2024-06-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 150,
    date: "2024-05-08",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Cachet João Nunes | DAMA | Festival Académico 04.05",
    createdAt: "2024-05-08T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 350,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Cachet Luis Batista - DAMA - Lisboa",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 175,
    date: "2024-05-08",
    entity: "P S PORTUGAL EVENTS SERVICE LDA",
    investor: "maktub",
    notes: "Cachet Marco Gonçalves - DAMA - Festival Académico de Lisboa",
    createdAt: "2024-05-08T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 400,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Lisboa",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 300,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Cachet Nuno Lopes - DAMA - Lisboa",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 300,
    date: "2024-06-04",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Lisboa",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 500,
    date: "2024-05-31",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarias - DAMA - Lisboa",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 400,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Lisboa",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 200,
    date: "2024-05-20",
    entity: "RUBEN MIGUEL ROQUE GAMEIRO",
    investor: "maktub",
    notes: "Cachet Ruben Gameiro - DAMA - Lisboa",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "producao",
    amount: 350,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho - DAMA - Lisboa",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "combustivel",
    amount: 36.3,
    date: "2024-05-17",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Combustivel R80PS55, AQ | DAMA | Lisboa 04.05",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 12.5,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 14.28,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 10.71,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 12.5,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 5.36,
    date: "2024-06-18",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 5.35,
    date: "2024-05-08",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - João Nunes",
    createdAt: "2024-05-08T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "transporte",
    amount: 380,
    date: "2024-05-16",
    entity: "Pieter Smit Theather Rock B.V",
    investor: "maktub",
    notes: "DAMA - Lisboa",
    createdAt: "2024-05-16T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "combustivel",
    amount: 67.07,
    date: "2024-05-04",
    entity: "COMPRA A.S.POMBAL",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "combustivel",
    amount: 41.35,
    date: "2024-05-04",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-05-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "transporte",
    amount: 2.49,
    date: "2024-05-17",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens R80PS55, AQ | DAMA | Lisboa 04.05",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "transporte",
    amount: 225,
    date: "2024-05-24",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver - DAMA - Lisboa",
    createdAt: "2024-05-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "transporte",
    amount: 180,
    date: "2024-05-17",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio R80PS55, AQ | DAMA | Lisboa 04.05",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "combustivel",
    amount: 30.75,
    date: "2024-05-17",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Taxa combustivel R80PS55, AQ | DAMA | Lisboa 04.05",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Festival Académico Lisboa",
    type: "outros",
    amount: 17.8,
    date: "2024-06-13",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-13T10:00:00Z",
  });

  // ============================================================
  // === D.A.M.A SALVATERRA DE MAGOS (11.05.2024) ===
  // ============================================================
  // PROVEITO
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 19000,
    date: "2024-05-09",
    entity: "Concerto com DAMA - Feira de Magos 2024 - 11 Maio 22h",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-05-09T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "equipamento",
    amount: 2000,
    date: "2024-05-13",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Material Audiovisual | DAMA | Magos 11.05",
    createdAt: "2024-05-13T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "equipamento",
    amount: 32,
    date: "2024-05-13",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Rampa de carga",
    createdAt: "2024-05-13T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 225,
    date: "2024-06-03",
    entity: "ANA RITA CORREIA GOMES",
    investor: "maktub",
    notes: "Cachet Ana Rita Gomes - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-03T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 175,
    date: "2024-05-13",
    entity: "P S PORTUGAL EVENTS SERVICE LDA",
    investor: "maktub",
    notes: "Cachet Andre Silva - DAMA - Salvaterra de Magos 11.05",
    createdAt: "2024-05-13T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 600,
    date: "2024-05-12",
    entity: "Interpele, Lda",
    investor: "maktub",
    notes: "Cachet Francesco Meoli - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-12T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 250,
    date: "2024-05-29",
    entity: "Memories Torrent - Unipessoal, Lda",
    investor: "maktub",
    notes: "Cachet Francisco Desidério | DAMA | Salvaterra de Magos",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 250,
    date: "2024-06-20",
    entity: "FRANCISCO FRAGOSO LAPLAINE GUIMARÃES",
    investor: "maktub",
    notes: "Cachet Francisco Guimarães - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 350,
    date: "2024-05-29",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Salles - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 350,
    date: "2024-06-04",
    entity: "Hugo Andre Carriço Azevedo",
    investor: "maktub",
    notes: "Cachet Hugo Azevedo - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 50,
    date: "2024-06-04",
    entity: "Hugo Andre Carriço Azevedo",
    investor: "maktub",
    notes: "Cachet Hugo Azevedo - DAMA - Salvaterra de Magos_alug PC",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 350,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Cachet Luis Batista - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 400,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 300,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Cachet Nuno Lopes - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 300,
    date: "2024-06-04",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 500,
    date: "2024-05-31",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarias - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 400,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "producao",
    amount: 350,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 12.5,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 14.28,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 12.5,
    date: "2024-06-04",
    entity: "Hugo Andre Carriço Azevedo",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 12.5,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 1.78,
    date: "2024-06-04",
    entity: "Hugo Andre Carriço Azevedo",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 10.71,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 380,
    date: "2024-05-16",
    entity: "Pieter Smit Theather Rock B.V",
    investor: "maktub",
    notes: "DAMA - Salvaterra de Magos",
    createdAt: "2024-05-16T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "combustivel",
    amount: 27.45,
    date: "2024-05-12",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-12T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "combustivel",
    amount: 40,
    date: "2024-05-12",
    entity: "Carrinha Técnicos",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-12T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 6.2,
    date: "2024-05-31",
    entity: "Pieter Smit Theather Rock Portugal, Lda",
    investor: "maktub",
    notes: "Portagens (12-BKF-5) - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 12.4,
    date: "2024-05-28",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens R:80PS55, AQ | DAMA | Salvaterra de magos",
    createdAt: "2024-05-28T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 75.8,
    date: "2024-06-06",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens R5575896 AN - DAMA - Salvaterra de Magos",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 175,
    date: "2024-05-24",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 225,
    date: "2024-05-24",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 160,
    date: "2024-05-24",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio R5575896 AN - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "transporte",
    amount: 180,
    date: "2024-05-24",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio R80PS55 AQ - DAMA - Salvaterra de Magos",
    createdAt: "2024-05-24T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Salvaterra de Magos",
    type: "outros",
    amount: 16.19,
    date: "2024-06-11",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-11T10:00:00Z",
  });

  // ============================================================
  // === D.A.M.A PRÉMIOS PLAY (16.05.2024) ===
  // ============================================================
  // PROVEITO
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 3500,
    date: "2024-05-09",
    entity: "Ajudas de Custo Atuação D.A.M.A | Prémios Play 2024",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-05-09T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "alimentacao",
    amount: 9.2,
    date: "2024-05-16",
    entity: "CC ST MT 2835 P",
    investor: "maktub",
    notes: "Alimentação - comitivas",
    createdAt: "2024-05-16T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 1000,
    date: "2024-05-03",
    entity: "Palco Absoluto, LDA",
    investor: "maktub",
    notes: "Arranjos de Cordas - DAMA",
    createdAt: "2024-05-03T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 500,
    date: "2024-05-28",
    entity: "EDUARDO RAMOS RIBEIRO FERRAZ ESPINHO",
    investor: "maktub",
    notes: "Cachet Eduardo Espinho - DAMA - Lisboa_Prémios Play",
    createdAt: "2024-05-28T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 125,
    date: "2024-05-22",
    entity: "FRANCESCO FINO MEOLI",
    investor: "maktub",
    notes: "Cachet Francesco Meoli - DAMA - Prémios Play",
    createdAt: "2024-05-22T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 125,
    date: "2024-05-29",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Salles - DAMA - Premios Play",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 300,
    date: "2024-06-25",
    entity: "MARGARIDA SANTOS FERRAZ ESPINHO",
    investor: "maktub",
    notes: "Cachet Margarida Espinho - DAMA - Lisboa_styling Bandidos",
    createdAt: "2024-06-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 200,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Mix & Master_Premios Play_14/5",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 150,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Premios Play_Promo_14/5",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 150,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Premios Play_Promo_14/5",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "transporte",
    amount: 60,
    date: "2024-06-18",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - aluguer carrinha 15 e 16.05",
    createdAt: "2024-06-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 200,
    date: "2024-06-18",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Premios Play",
    createdAt: "2024-06-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 125,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Lisboa_Premios Play",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 800,
    date: "2024-06-26",
    entity: "RITA CONDE PRIETO ALVES",
    investor: "maktub",
    notes: "Cachet Rita Alves - DAMA - Lisboa",
    createdAt: "2024-06-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "producao",
    amount: 125,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho - DAMA - Lisboa_Premios Play",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "outros",
    amount: 4.46,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "outros",
    amount: 4.46,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "outros",
    amount: 17.85,
    date: "2024-05-28",
    entity: "EDUARDO RAMOS RIBEIRO FERRAZ ESPINHO",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-28T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "combustivel",
    amount: 25,
    date: "2024-06-18",
    entity: "filipe Valente - despesa-38372849",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-06-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "combustivel",
    amount: 20,
    date: "2024-05-31",
    entity: "Pedro Borges - despesas-38033960",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "transporte",
    amount: 3.2,
    date: "2024-05-31",
    entity: "Pedro Borges - despesas-38033960",
    investor: "maktub",
    notes: "Parques - Comitivas e Colaboradores",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "transporte",
    amount: 8.45,
    date: "2024-05-31",
    entity: "Pedro Borges - despesas-38033960",
    investor: "maktub",
    notes: "Parques - Comitivas e Colaboradores",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "transporte",
    amount: 86.22,
    date: "2024-06-12",
    entity: "IRWT LDA",
    investor: "maktub",
    notes: "Prest Serv (AV-89-HE) - DAMA - Prémios Play 15 e 17.05",
    createdAt: "2024-06-12T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "transporte",
    amount: 123.05,
    date: "2024-05-27",
    entity: "IRWT LDA",
    investor: "maktub",
    notes: "prest Serv (AV-89-HE) | DAMA | premios play",
    createdAt: "2024-05-27T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Prémios Play",
    type: "outros",
    amount: 6.59,
    date: "2024-06-11",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-11T10:00:00Z",
  });

  // ============================================================
  // ============================================================
  // === D.A.M.A BENEDITA (17.05.2024) ===
  // ============================================================
  // PROVEITO
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 25000,
    date: "2024-05-17",
    entity: "Cachet D.A.M.A | Benedita | 17 maio de 2024",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-05-17T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "equipamento",
    amount: 2000,
    date: "2024-05-20",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Material Audiovisual | DAMA | Benedita",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "equipamento",
    amount: 32,
    date: "2024-05-20",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Rampa de carga",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 225,
    date: "2024-06-03",
    entity: "ANA RITA CORREIA GOMES",
    investor: "maktub",
    notes: "Cachet Ana Rita Gomes - DAMA - Benedita",
    createdAt: "2024-06-03T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 175,
    date: "2024-05-21",
    entity: "P S PORTUGAL EVENTS SERVICE LDA",
    investor: "maktub",
    notes: "Cachet Andre Silva - DAMA - Benedita",
    createdAt: "2024-05-21T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 150,
    date: "2024-06-27",
    entity: "AGUARDO FATURA",
    investor: "maktub",
    notes: "Cachet Cátia Figueiredo",
    createdAt: "2024-06-27T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 400,
    date: "2024-06-04",
    entity: "PRO NOBIS, CRL",
    investor: "maktub",
    notes: "Cachet Daniel Fialho_alug portatil video - DAMA - Benedita",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 600,
    date: "2024-05-21",
    entity: "Interpele, Lda",
    investor: "maktub",
    notes: "Cachet Francesco Meoli - DAMA - Benedita",
    createdAt: "2024-05-21T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 250,
    date: "2024-06-20",
    entity: "FRANCISCO FRAGOSO LAPLAINE GUIMARÃES",
    investor: "maktub",
    notes: "Cachet Francisco Guimarães - DAMA - Benedita",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 350,
    date: "2024-05-29",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Salles - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 150,
    date: "2024-05-20",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Cachet João Nunes | DAMA | Benedita",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 350,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Cachet Luis Batista - DAMA - Benedita",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 400,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Benedita",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 300,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Cachet Nuno Lopes - DAMA - Benedita",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 300,
    date: "2024-06-04",
    entity: "Pedro Miguel Borges de Mata Borges",
    investor: "maktub",
    notes: "Cachet Pedro Borges - DAMA - Benedita",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 500,
    date: "2024-05-31",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarias - DAMA - Benedita",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 400,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Benedita",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "producao",
    amount: 350,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho - DAMA - Benedita",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 12.5,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 14.28,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 12.5,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 10.71,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 5.36,
    date: "2024-05-20",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 380,
    date: "2024-05-16",
    entity: "Pieter Smit Theather Rock B.V",
    investor: "maktub",
    notes: "DAMA - Benedita",
    createdAt: "2024-05-16T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "combustivel",
    amount: 45.75,
    date: "2024-05-18",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "combustivel",
    amount: 55.16,
    date: "2024-05-17",
    entity: "Camião Material Pixel",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "combustivel",
    amount: 72.46,
    date: "2024-05-18",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-05-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "combustivel",
    amount: 80.93,
    date: "2024-05-17",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-05-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 48.97,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens 80PS55 AQ- DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 25,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens VZ24019 AN - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 123.05,
    date: "2024-05-27",
    entity: "IRWT LDA",
    investor: "maktub",
    notes: "prest Serv (AV-89-HE) | DAMA | Be cultura",
    createdAt: "2024-05-27T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 270,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio 80PS55 AQ - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 337.5,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver André - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 175,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver Gustavo - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "transporte",
    amount: 160,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio VZ24019 AN - DAMA - Benedita",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Benedita",
    type: "outros",
    amount: 32.83,
    date: "2024-06-11",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-11T10:00:00Z",
  });

  // ============================================================
  // === D.A.M.A ALVARÃES (18.05.2024) ===
  // ============================================================
  // PROVEITO
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 22600,
    date: "2024-05-15",
    entity: "Cachet D.A.M.A | 18 de Maio 2024 | Alvarães",
    investor: "outro",
    notes: "PROVEITO",
    createdAt: "2024-05-15T10:00:00Z",
  });
  // CUSTOS
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "alimentacao",
    amount: 22.25,
    date: "2024-05-18",
    entity: "Alimentação - comitivas",
    investor: "maktub",
    notes: "",
    createdAt: "2024-05-18T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "equipamento",
    amount: 250,
    date: "2024-05-20",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer equipamento iluminação - DAMA - Alvarães",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "equipamento",
    amount: 2000,
    date: "2024-05-20",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Material Audiovisual | DAMA | Viana do Castelo",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "equipamento",
    amount: 32,
    date: "2024-05-20",
    entity: "PIXEL LIGHT, LDA",
    investor: "maktub",
    notes: "Aluguer Rampa de carga",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 225,
    date: "2024-06-03",
    entity: "ANA RITA CORREIA GOMES",
    investor: "maktub",
    notes: "Cachet Ana Rita Gomes - DAMA - Alvarães",
    createdAt: "2024-06-03T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 175,
    date: "2024-05-21",
    entity: "P S PORTUGAL EVENTS SERVICE LDA",
    investor: "maktub",
    notes: "Cachet Andre Silva - DAMA - Alvaraes",
    createdAt: "2024-05-21T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 150,
    date: "2024-06-27",
    entity: "AGUARDO FATURA",
    investor: "maktub",
    notes: "Cachet Cátia Figueiredo",
    createdAt: "2024-06-27T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 400,
    date: "2024-06-04",
    entity: "PRO NOBIS, CRL",
    investor: "maktub",
    notes: "Cachet Daniel Fialho_alug portatil video - DAMA - Viana Cast",
    createdAt: "2024-06-04T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 600,
    date: "2024-05-21",
    entity: "Interpele, Lda",
    investor: "maktub",
    notes: "Cachet Francesco Meoli - DAMA - Alvaraes",
    createdAt: "2024-05-21T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 250,
    date: "2024-06-20",
    entity: "FRANCISCO FRAGOSO LAPLAINE GUIMARÃES",
    investor: "maktub",
    notes: "Cachet Francisco Guimarães - DAMA - Alvarães",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 350,
    date: "2024-05-29",
    entity: "Bronzeado Poderoso Unipessoal Lda",
    investor: "maktub",
    notes: "Cachet Gabriel Salles - DAMA - Alvaraes",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 150,
    date: "2024-05-20",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Cachet João Nunes | DAMA | Alvaraes",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 350,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Cachet Luis Batista - DAMA - Alvarães",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 400,
    date: "2024-05-31",
    entity: "MCORE UNIPESSOAL LDA",
    investor: "maktub",
    notes: "Cachet Mário Correia - DAMA - Alvarães",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 300,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Cachet Nuno Lopes - DAMA - Alvaraes",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 500,
    date: "2024-05-31",
    entity: "ESTRADA TOUR MANAGEMENT & PRODUCTION LDA",
    investor: "maktub",
    notes: "Cachet Pedro Canarias - DAMA - Alvarães",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 400,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Cachet Pedro Joaninho - DAMA - Alvarães",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 300,
    date: "2024-06-20",
    entity: "TIAGO PEREIRA DE CARVALHO",
    investor: "maktub",
    notes: "Cachet Tiago Carvalho | DAMA | Alvarães 18/05",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "producao",
    amount: 350,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Cachet Tiago Joaninho - DAMA - Alvarães",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 12.5,
    date: "2024-06-17",
    entity: "TIAGO JOANINHO LOPES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 14.28,
    date: "2024-06-17",
    entity: "Pedro Joaninho Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-17T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 12.5,
    date: "2024-06-06",
    entity: "Luis Alberto da Ascenção Batista",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-06-06T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 10.71,
    date: "2024-05-31",
    entity: "Nuno Filipe Martins Ribeiro Lopes",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 5.35,
    date: "2024-05-20",
    entity: "JOÃO MARIA AMARAL NUNES",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - EC - SET",
    createdAt: "2024-05-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 10.71,
    date: "2024-06-20",
    entity: "TIAGO PEREIRA DE CARVALHO",
    investor: "maktub",
    notes: "Contribuição Estatuto Artista - Tiago Carvalho",
    createdAt: "2024-06-20T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 380,
    date: "2024-05-16",
    entity: "Pieter Smit Theather Rock B.V",
    investor: "maktub",
    notes: "DAMA - Alavaraes",
    createdAt: "2024-05-16T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 29.5,
    date: "2024-05-19",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-19T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 107.94,
    date: "2024-05-19",
    entity: "CARRINHA MUSICOS",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-19T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 131.63,
    date: "2024-05-19",
    entity: "Carrinha Técnicos Backline",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-19T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 71.03,
    date: "2024-05-19",
    entity: "Carrinha Técnicos & Backline",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-19T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 164.96,
    date: "2024-05-19",
    entity: "Camião Material Pixel",
    investor: "maktub",
    notes: "Gasóleo - 0% - Comitivas = Gasolina - Colaboradores",
    createdAt: "2024-05-19T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "combustivel",
    amount: 40.79,
    date: "2024-05-22",
    entity: "Gasóleo - Colaboradores",
    investor: "maktub",
    notes: "",
    createdAt: "2024-05-22T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 76.59,
    date: "2024-05-31",
    entity: "Pieter Smit Theather Rock Portugal, Lda",
    investor: "maktub",
    notes: "Portagens (12-BKF-5) - DAMA - Alvarães",
    createdAt: "2024-05-31T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 48.97,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens 80PS55 AQ- DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 25,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Portagens VZ24019 AN - DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 270,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio 80PS55 AQ - DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 337.5,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver André - DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 175,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio driver Gustavo - DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "transporte",
    amount: 160,
    date: "2024-05-29",
    entity: "Safety Show - Apoio a Eventos, Lda.",
    investor: "maktub",
    notes: "Serviço de Apoio VZ24019 AN - DAMA - Alvarães",
    createdAt: "2024-05-29T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "D.A.M.A",
    project: "Alvarães",
    type: "outros",
    amount: 71.87,
    date: "2024-06-11",
    entity: "Tributação Autónoma (Prevista)",
    investor: "maktub",
    notes: "",
    createdAt: "2024-06-11T10:00:00Z",
  });


  // ============================================================
  // === BANDIDOS DO CANTE - REAL DATA ===
  // === Source: GERAIS BANDIDOS.xlsx + MUSICAS _ PROJETOS .xlsx ===
  // ============================================================

  // --- GERAIS BANDIDOS (General monthly costs) ---

  // -- Gerais: ABRIL --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 591.0,
    date: "2025-04-15",
    entity: "Vodafone Play - Styling",
    investor: "maktub",
    notes: "",
    createdAt: "2025-04-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "alimentacao",
    amount: 13.8,
    date: "2025-04-15",
    entity: "Vodafone Play - Cervejas",
    investor: "maktub",
    notes: "",
    createdAt: "2025-04-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "outros",
    amount: 500.0,
    date: "2025-04-15",
    entity: "Vodafone Play - Pagamento recebido",
    investor: "patrocinio",
    notes: "(pagos à Maktb)",
    createdAt: "2025-04-15T10:00:00Z",
  });
  // -- Gerais: JUN 25 --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "alojamento",
    amount: 134.86,
    date: "2025-06-15",
    entity: "Airbnb 04/06",
    investor: "maktub",
    notes: "",
    createdAt: "2025-06-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 147.0,
    date: "2025-06-15",
    entity: "Ovibeja - Pagamento Aftermovie",
    investor: "oferta_maktub",
    notes:
      "147 € - OFERTA MAKTUB | Aparece na folha só para so bandidos saberem que oferecemos, mas nao conta para o que os bandidos nos devem.",
    createdAt: "2025-06-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 60.0,
    date: "2025-06-15",
    entity: "Design Single de Ouro",
    investor: "oferta_maktub",
    notes: "60 € - OFERTA MAKTUB",
    createdAt: "2025-06-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 250.0,
    date: "2025-06-15",
    entity: "Design - Pax Julia ' Ao vivo em Beja'",
    investor: "maktub",
    notes: "",
    createdAt: "2025-06-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 200.0,
    date: "2025-06-15",
    entity: "Design Ledwalls",
    investor: "maktub",
    notes: "",
    createdAt: "2025-06-15T10:00:00Z",
  });
  // -- Gerais: JUL 25 --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 403.0,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Styling (Isa)",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 89.0,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Tela",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 71.0,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Estúdio SET",
    investor: "maktub",
    notes: "(Descontaram o valor da tela, dai ser tão barato)",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 100.0,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Estúdio Sítio",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "alimentacao",
    amount: 76.53,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Almoço",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "alimentacao",
    amount: 34.12,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Snacks",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 12.88,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Adereços",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 460.0,
    date: "2025-07-15",
    entity: "Sessão fotográfica - Cajó - fotografia",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 200.0,
    date: "2025-07-15",
    entity: "Gracinha - Técnico de Som Gracinha",
    investor: "maktub",
    notes: "",
    createdAt: "2025-07-15T10:00:00Z",
  });
  // -- Gerais: OUT 25 --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 40.0,
    date: "2025-10-15",
    entity: "Design - Press Kit Bandidos nos teatros",
    investor: "oferta_maktub",
    notes: "40 € - OFERTA MAKTUB",
    createdAt: "2025-10-15T10:00:00Z",
  });
  // -- Gerais: NOV 25 --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 80.0,
    date: "2025-11-15",
    entity: "Design Press Kit",
    investor: "oferta_maktub",
    notes: "80 € - OFERTA MAKTUB",
    createdAt: "2025-11-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 375.0,
    date: "2025-11-15",
    entity: "Design Merch",
    investor: "maktub",
    notes: "",
    createdAt: "2025-11-15T10:00:00Z",
  });
  // -- Gerais: DEZ 25 --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "outros",
    amount: 70.0,
    date: "2025-12-15",
    entity: "Advogada 25",
    investor: "oferta_maktub",
    notes: "TOTAL 70 € - OFERTA MAKTUB 100%",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "Design Datas mensais + Cartaz geral Datas Tour",
    investor: "oferta_maktub_50",
    notes: "TOTAL 300€ - OFERTA MAKTUB 50%",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "transporte",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Design Beja Pax Julia - Derivações 2nd Data e Convidados (",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 65.0,
    date: "2025-12-15",
    entity: "Molduras Galardões  10 molduras)",
    investor: "oferta_maktub_50",
    notes: "TOTAL 130 - MAKTUB OFERECE 50%",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 64.275,
    date: "2025-12-15",
    entity: "Impressão Galardões",
    investor: "oferta_maktub_50",
    notes: "TOTAL 128,55 - MAKTUB OFERECE 50%",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 81.0,
    date: "2025-12-15",
    entity: "Photocall (impressão só de 1 lado)",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 25.0,
    date: "2025-12-15",
    entity: "Roll Up álbum Pax Júlia",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "equipamento",
    amount: 2860.0,
    date: "2025-12-15",
    entity: "Produção Merch",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Gerais Bandidos",
    type: "producao",
    amount: 216.0,
    date: "2025-12-15",
    entity: "Ensaio Pax Júlia",
    investor: "maktub",
    notes: "(não foi cobrado em bilheteira à Haus)",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // ==========================================
  // MUSICAS / PROJETOS - Album Bairro das Flores
  // ==========================================

  // -- GERAL ÁLBUM --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "promocao",
    amount: 312.5,
    date: "2025-12-15",
    entity: "Ramos flores - Promo Álbum",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "producao",
    amount: 200.0,
    date: "2025-12-15",
    entity: "Capa Álbum - Fellypa",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "outros",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Teresa lemos - Assesoria Primavera e álbum",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "outros",
    amount: 1259.23,
    date: "2025-12-15",
    entity: "Festa Lançamento Álbum",
    investor: "maktub",
    notes: "Falta Cajó",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "producao",
    amount: 800.0,
    date: "2025-12-15",
    entity:
      "Mix e master simões : Quero acreditar, nada mais, bairro das flores e voltar a ver-te",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "promocao",
    amount: 75.0,
    date: "2025-12-15",
    entity: "Lucas - conteúdo promo Mega e RR",
    investor: "maktub",
    notes: "Ainda nao foi pago",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "outros",
    amount: 21.98,
    date: "2025-12-15",
    entity: "disco 'Bairro das Flores' casa amália",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "outros",
    amount: 6000.0,
    date: "2025-12-15",
    entity: "Acin (Luís) -",
    investor: "patrocinio",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "producao",
    amount: 1250.0,
    date: "2025-12-15",
    entity: "Herdade do Sobroso - Videoclipe AMIGOS COLORIDOS",
    investor: "patrocinio",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Álbum Bairro das Flores - Geral",
    type: "outros",
    amount: 10000.0,
    date: "2025-12-15",
    entity: "SPA - Apoio Fundo SPA",
    investor: "patrocinio",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // -- Amigos Coloridos --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Youtube",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Instagram",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Tiktok",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "FB",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "outros",
    amount: 60.0,
    date: "2025-12-15",
    entity: "Single de Ouro",
    investor: "oferta_maktub",
    notes: "OFERTA MAKTUB",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "transporte",
    amount: 356.7,
    date: "2024-11-26",
    entity: "Aluguer e transporte sofas",
    investor: "maktub",
    notes: "",
    createdAt: "2024-11-26T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "producao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "produção música",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "producao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "mix e master",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "outros",
    amount: 300.0,
    date: "2025-12-15",
    entity: "aluguer estudio",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "mapi - piano",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "producao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "Rodrigo - guitarra",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 200.0,
    date: "2025-12-15",
    entity: "youtube",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "outros",
    amount: 200.0,
    date: "2025-12-15",
    entity: "tik tok",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Amigos Coloridos",
    type: "promocao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Instagram",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // -- Já não há pardais no céu --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "promocao",
    amount: 1353.0,
    date: "2025-12-15",
    entity: "Blitz Promo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "promocao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "Blitz",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "alimentacao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "almoço imprensa (Solar)",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "alimentacao",
    amount: 190.0,
    date: "2025-12-15",
    entity: "Catering",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "outros",
    amount: 553.0,
    date: "2025-12-15",
    entity: "Espaço",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Design -capa, comunicação redes e convite LP",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 3300.0,
    date: "2025-12-15",
    entity: "Videoclipe",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Produção",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Mix",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 50.0,
    date: "2025-12-15",
    entity: "Master",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Já não há pardais no céu",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Ivo Costa - Bateria",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // -- Tanto Tempo --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "producao",
    amount: 500.0,
    date: "2025-12-15",
    entity: "Produção Edu",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "producao",
    amount: 90.0,
    date: "2025-12-15",
    entity: "Design",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "producao",
    amount: 250.0,
    date: "2025-12-15",
    entity: "Dia Estúdio - Vale de Lobos",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "producao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "Mix e Master",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "producao",
    amount: 3447.73,
    date: "2025-12-15",
    entity: "Videoclipe",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tanto Tempo",
    type: "promocao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Assessoria de Imprensa - Teresa Lemos",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // -- QUERO ACREDITAR --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "QUERO ACREDITAR",
    type: "producao",
    amount: 615.0,
    date: "2025-12-15",
    entity: "Produção (50%) - Rodrigo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "QUERO ACREDITAR",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Jon",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "QUERO ACREDITAR",
    type: "producao",
    amount: 150.0,
    date: "2025-12-15",
    entity: "Mapi- piano",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "QUERO ACREDITAR",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Gui Melo - Bateria",
    investor: "bandidos",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });

  // -- Voltar a Ver-te --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Voltar a Ver-te",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção JON",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Voltar a Ver-te",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Rodrigo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });

  // -- Primavera - Zambujo --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "alimentacao",
    amount: 396.74,
    date: "2025-06-25",
    entity: "Almoço António Zambujo - Solar dos Presentes",
    investor: "maktub",
    notes: "",
    createdAt: "2025-06-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 100.0,
    date: "2025-12-15",
    entity: "Fotos Estúdio mudsea",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 250.0,
    date: "2025-10-25",
    entity: "Dia Estúdio - Vale de Lobos",
    investor: "maktub",
    notes: "",
    createdAt: "2025-10-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 4000.0,
    date: "2025-11-25",
    entity: "Videoclipe GUI",
    investor: "maktub",
    notes: "(s/ IVA)",
    createdAt: "2025-11-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "António - arranjos e Gravação",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 75.0,
    date: "2025-12-25",
    entity: "Técnica Estúdio Valentim de Carvalho - Cordas",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 250.0,
    date: "2025-12-25",
    entity: "Mix e Master Náná",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Quarteto Cordas",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 150.0,
    date: "2025-12-25",
    entity: "Contrabaixo Rodrigo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Primavera - Zambujo",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Edu",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });

  // -- Nada Mais --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Nada Mais",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Edu",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });

  // -- Bairro das Flores --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Bairro das Flores",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Edu",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });

  // -- Rosa --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "António - Arranjo e Gravação",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 390.0,
    date: "2025-12-25",
    entity: "Aluguer estúdio - Paço de Arcos",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 75.0,
    date: "2025-12-25",
    entity: "Técnica Estúdio Valentim de Carvalho - Cordas",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 250.0,
    date: "2025-12-25",
    entity: "Mix e Master Náná",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "outros",
    amount: 70.0,
    date: "2025-12-25",
    entity: "Preparação multificheiros para o Festival da Canção",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Quarteto Cordas",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 150.0,
    date: "2025-12-25",
    entity: "Contrabaixo Rodrigo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 500.0,
    date: "2025-12-25",
    entity: "Produção Edu",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-25T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Rosa",
    type: "producao",
    amount: 1250.0,
    date: "2026-01-25",
    entity: "Arte Palco - Alexandre",
    investor: "maktub",
    notes: "",
    createdAt: "2026-01-25T10:00:00Z",
  });

  // -- Tu És - 4 e Meia --
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "alimentacao",
    amount: 202.5,
    date: "2025-12-15",
    entity: "Almoço Porto",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "alimentacao",
    amount: 221.5,
    date: "2025-12-15",
    entity: "Almoço Porto",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "alimentacao",
    amount: 92.9,
    date: "2025-12-15",
    entity: "Refeição porto",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "alojamento",
    amount: 420.41,
    date: "2025-12-15",
    entity: "Alojamento",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "producao",
    amount: 300.0,
    date: "2025-12-15",
    entity: "Estúdio Porto",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "transporte",
    amount: 265.0,
    date: "2025-12-15",
    entity: "Transporte ida e volta para o Porto",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "producao",
    amount: 250.0,
    date: "2025-12-15",
    entity: "Fotógrafo",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });
  data.push({
    id: (id++).toString(),
    artist: "Bandidos do Cante",
    project: "Tu És - 4 e Meia",
    type: "producao",
    amount: 200.0,
    date: "2025-12-15",
    entity: "Estúdio Lisboa",
    investor: "maktub",
    notes: "",
    createdAt: "2025-12-15T10:00:00Z",
  });


  return data;
}

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {
  updateStats();
  updateCharts();
  updateStackedCharts();
  updateRecentList();
}

function updateStats() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maktub = expenses
    .filter((e) => e.investor === "maktub")
    .reduce((sum, e) => sum + e.amount, 0);
  const others = expenses
    .filter((e) => e.investor === "outro")
    .reduce((sum, e) => sum + e.amount, 0);

  document.getElementById("stat-total").textContent = formatCurrency(total);
  document.getElementById("stat-maktub").textContent = formatCurrency(maktub);
  document.getElementById("stat-others").textContent = formatCurrency(others);
  document.getElementById("stat-count").textContent = expenses.length;
}

function updateCharts() {
  updateArtistChart();
  updateTypeChart();
}

function updateArtistChart() {
  const container = document.getElementById("chart-artists");
  const byArtist = {};

  expenses.forEach((e) => {
    byArtist[e.artist] = (byArtist[e.artist] || 0) + e.amount;
  });

  const sorted = Object.entries(byArtist).sort((a, b) => b[1] - a[1]);
  const max = sorted.length > 0 ? sorted[0][1] : 0;

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty-state">Sem dados</p>';
    return;
  }

  container.innerHTML = sorted
    .map(
      ([artist, amount]) => `
        <div class="chart-bar-item">
            <span class="chart-bar-label">${artist}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${(amount / max) * 100}%"></div>
            </div>
            <span class="chart-bar-value">${formatCurrency(amount)}</span>
        </div>
    `,
    )
    .join("");
}

function updateTypeChart() {
  const container = document.getElementById("chart-types");
  const byType = {};

  expenses.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + e.amount;
  });

  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = sorted.length > 0 ? sorted[0][1] : 0;

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty-state">Sem dados</p>';
    return;
  }

  container.innerHTML = sorted
    .map(
      ([type, amount]) => `
        <div class="chart-bar-item">
            <span class="chart-bar-label">${getTypeName(type)}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${(amount / max) * 100}%"></div>
            </div>
            <span class="chart-bar-value">${formatCurrency(amount)}</span>
        </div>
    `,
    )
    .join("");
}

function updateStackedCharts() {
  updateArtistInvestorChart();
  updateArtistCategoryChart();
}

function updateArtistInvestorChart() {
  const container = document.getElementById("chart-artist-investor");
  const byArtist = {};

  expenses.forEach((e) => {
    if (!byArtist[e.artist]) {
      byArtist[e.artist] = { maktub: 0, outros: 0, total: 0 };
    }
    if (e.investor === "maktub") {
      byArtist[e.artist].maktub += e.amount;
    } else {
      byArtist[e.artist].outros += e.amount;
    }
    byArtist[e.artist].total += e.amount;
  });

  const sorted = Object.entries(byArtist).sort(
    (a, b) => b[1].total - a[1].total,
  );
  const maxTotal = sorted.length > 0 ? sorted[0][1].total : 0;

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty-state">Sem dados</p>';
    return;
  }

  let html = sorted
    .map(([artist, data]) => {
      const maktubPct = (data.maktub / data.total) * 100;
      const outrosPct = (data.outros / data.total) * 100;

      return `
            <div class="chart-bar-item">
                <span class="chart-bar-label">${artist}</span>
                <div class="chart-bar-track stacked">
                    <div class="chart-bar-segment maktub" style="width: ${maktubPct}%" title="Maktub: ${formatCurrency(data.maktub)}"></div>
                    <div class="chart-bar-segment outros" style="width: ${outrosPct}%" title="Terceiros: ${formatCurrency(data.outros)}"></div>
                </div>
                <span class="chart-bar-value">${formatCurrency(data.total)}</span>
            </div>
        `;
    })
    .join("");

  html += `
        <div class="chart-legend">
            <div class="legend-item"><div class="legend-color" style="background: var(--green-primary)"></div> Maktub</div>
            <div class="legend-item"><div class="legend-color" style="background: var(--warning)"></div> Terceiros</div>
        </div>
    `;

  container.innerHTML = html;
}

function updateArtistCategoryChart() {
  const container = document.getElementById("chart-artist-category");
  const byArtist = {};
  const types = [
    "combustivel",
    "alimentacao",
    "alojamento",
    "equipamento",
    "producao",
    "promocao",
    "transporte",
    "outros",
  ];
  const typeColors = {
    combustivel: "#ff6b6b",
    alimentacao: "#ffa94d",
    alojamento: "#ffd43b",
    equipamento: "#69db7c",
    producao: "#33E933",
    promocao: "#4dabf7",
    transporte: "#9775fa",
    outros: "#868e96",
  };

  expenses.forEach((e) => {
    if (!byArtist[e.artist]) {
      byArtist[e.artist] = { total: 0 };
      types.forEach((t) => (byArtist[e.artist][t] = 0));
    }
    byArtist[e.artist][e.type] += e.amount;
    byArtist[e.artist].total += e.amount;
  });

  const sorted = Object.entries(byArtist).sort(
    (a, b) => b[1].total - a[1].total,
  );

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty-state">Sem dados</p>';
    return;
  }

  let html = sorted
    .map(([artist, data]) => {
      let segments = types
        .map((type) => {
          const pct = (data[type] / data.total) * 100;
          if (pct > 0) {
            return `<div class="chart-bar-segment ${type}" style="width: ${pct}%" title="${getTypeName(type)}: ${formatCurrency(data[type])}"></div>`;
          }
          return "";
        })
        .join("");

      return `
            <div class="chart-bar-item">
                <span class="chart-bar-label">${artist}</span>
                <div class="chart-bar-track stacked">
                    ${segments}
                </div>
                <span class="chart-bar-value">${formatCurrency(data.total)}</span>
            </div>
        `;
    })
    .join("");

  html += `
        <div class="chart-legend">
            ${types.map((t) => `<div class="legend-item"><div class="legend-color" style="background: ${typeColors[t]}"></div> ${getTypeName(t)}</div>`).join("")}
        </div>
    `;

  container.innerHTML = html;
}

function updateRecentList() {
  const container = document.getElementById("recent-list");
  const recent = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

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

  container.innerHTML = recent
    .map(
      (e) => `
        <div class="activity-item">
            <div class="activity-type">
                ${getTypeIcon(e.type)}
            </div>
            <div class="activity-info">
                <div class="activity-title">${e.artist} - ${getTypeName(e.type)}</div>
                <div class="activity-meta">${e.project} • ${formatDate(e.date)}</div>
            </div>
            <div class="activity-amount ${e.investor === "maktub" ? "maktub" : "other"}">
                ${formatCurrency(e.amount)}
            </div>
        </div>
    `,
    )
    .join("");
}

// ==========================================
// FILTER DROPDOWNS
// ==========================================

function updateFilterDropdowns() {
  // Get unique artists and projects
  const artists = [...new Set(expenses.map((e) => e.artist))].sort();
  const projects = [...new Set(expenses.map((e) => e.project))].sort();

  // Update artist filter
  const artistFilter = document.getElementById("filter-artist");
  artistFilter.innerHTML =
    '<option value="all">Todos os Artistas</option>' +
    artists.map((a) => `<option value="${a}">${a}</option>`).join("");

  // Update project filter
  const projectFilter = document.getElementById("filter-project");
  projectFilter.innerHTML =
    '<option value="all">Todos os Projetos</option>' +
    projects.map((p) => `<option value="${p}">${p}</option>`).join("");
}

// ==========================================
// REPORTS / TABLE
// ==========================================

function initFilters() {
  document.getElementById("search-input").addEventListener("input", () => {
    renderTable();
    renderPivotTables();
  });
  document.getElementById("filter-artist").addEventListener("change", () => {
    renderTable();
    renderPivotTables();
  });
  document.getElementById("filter-project").addEventListener("change", () => {
    renderTable();
    renderPivotTables();
  });
  document.getElementById("filter-type").addEventListener("change", () => {
    renderTable();
    renderPivotTables();
  });
  document.getElementById("filter-investor").addEventListener("change", () => {
    renderTable();
    renderPivotTables();
  });

  document.getElementById("export-csv").addEventListener("click", exportCSV);
  document
    .getElementById("export-sheets")
    .addEventListener("click", exportGoogleSheets);
  document.getElementById("export-pdf").addEventListener("click", exportPDF);
  document.getElementById("view-all-btn").addEventListener("click", () => {
    document.querySelector('[data-tab="reports"]').click();
  });
}

function getFilteredExpenses() {
  const search = document.getElementById("search-input").value.toLowerCase();
  const artistFilter = document.getElementById("filter-artist").value;
  const projectFilter = document.getElementById("filter-project").value;
  const typeFilter = document.getElementById("filter-type").value;
  const investorFilter = document.getElementById("filter-investor").value;

  return expenses.filter((e) => {
    const matchSearch =
      !search ||
      e.artist.toLowerCase().includes(search) ||
      e.project.toLowerCase().includes(search) ||
      (e.entity && e.entity.toLowerCase().includes(search)) ||
      (e.notes && e.notes.toLowerCase().includes(search));

    const matchArtist = artistFilter === "all" || e.artist === artistFilter;
    const matchProject = projectFilter === "all" || e.project === projectFilter;
    const matchType = typeFilter === "all" || e.type === typeFilter;
    const matchInvestor =
      investorFilter === "all" || e.investor === investorFilter;

    return (
      matchSearch && matchArtist && matchProject && matchType && matchInvestor
    );
  });
}

function renderTable() {
  const filtered = getFilteredExpenses();

  // Update summary
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const maktub = filtered
    .filter((e) => e.investor === "maktub")
    .reduce((sum, e) => sum + e.amount, 0);
  const others = filtered
    .filter((e) => e.investor === "outro")
    .reduce((sum, e) => sum + e.amount, 0);

  document.getElementById("summary-total").textContent = formatCurrency(total);
  document.getElementById("summary-maktub").textContent =
    formatCurrency(maktub);
  document.getElementById("summary-others").textContent =
    formatCurrency(others);
  document.getElementById("summary-count").textContent = filtered.length;

  // Sort by date descending
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const tbody = document.getElementById("expenses-body");
  const tfoot = document.getElementById("expenses-footer");

  if (sorted.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    Nenhuma despesa encontrada
                </td>
            </tr>
        `;
    tfoot.innerHTML = "";
    return;
  }

  tbody.innerHTML = sorted
    .map(
      (e) => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td>${e.artist}</td>
            <td>${e.project}</td>
            <td>${getTypeName(e.type)}</td>
            <td>${e.entity || "-"}</td>
            <td><span class="badge ${e.investor === "maktub" ? "badge-maktub" : "badge-other"}">${e.investor === "maktub" ? "Maktub" : "Terceiros"}</span></td>
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
    `,
    )
    .join("");

  // Add total row in footer
  tfoot.innerHTML = `
        <tr class="table-total-row">
            <td colspan="5"><strong>TOTAL (${filtered.length} registos)</strong></td>
            <td></td>
            <td><strong>${formatCurrency(total)}</strong></td>
            <td></td>
        </tr>
    `;
}

function renderPivotTables() {
  const filtered = getFilteredExpenses();

  // By Artist
  const byArtist = {};
  filtered.forEach((e) => {
    if (!byArtist[e.artist])
      byArtist[e.artist] = { total: 0, maktub: 0, outros: 0 };
    byArtist[e.artist].total += e.amount;
    if (e.investor === "maktub") byArtist[e.artist].maktub += e.amount;
    else byArtist[e.artist].outros += e.amount;
  });

  const pivotArtist = document.getElementById("pivot-artist");
  const artistEntries = Object.entries(byArtist).sort(
    (a, b) => b[1].total - a[1].total,
  );
  const artistTotal = artistEntries.reduce((sum, [_, d]) => sum + d.total, 0);

  pivotArtist.innerHTML =
    artistEntries
      .map(
        ([name, data]) => `
        <div class="pivot-row">
            <span class="label">${name}</span>
            <span class="value">${formatCurrency(data.total)}</span>
        </div>
    `,
      )
      .join("") +
    `
        <div class="pivot-row total">
            <span class="label">TOTAL</span>
            <span class="value">${formatCurrency(artistTotal)}</span>
        </div>
    `;

  // By Project
  const byProject = {};
  filtered.forEach((e) => {
    byProject[e.project] = (byProject[e.project] || 0) + e.amount;
  });

  const pivotProject = document.getElementById("pivot-project");
  const projectEntries = Object.entries(byProject).sort((a, b) => b[1] - a[1]);
  const projectTotal = projectEntries.reduce((sum, [_, v]) => sum + v, 0);

  pivotProject.innerHTML =
    projectEntries
      .map(
        ([name, value]) => `
        <div class="pivot-row">
            <span class="label">${name}</span>
            <span class="value">${formatCurrency(value)}</span>
        </div>
    `,
      )
      .join("") +
    `
        <div class="pivot-row total">
            <span class="label">TOTAL</span>
            <span class="value">${formatCurrency(projectTotal)}</span>
        </div>
    `;

  // By Type
  const byType = {};
  filtered.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + e.amount;
  });

  const pivotType = document.getElementById("pivot-type");
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const typeTotal = typeEntries.reduce((sum, [_, v]) => sum + v, 0);

  pivotType.innerHTML =
    typeEntries
      .map(
        ([name, value]) => `
        <div class="pivot-row">
            <span class="label">${getTypeName(name)}</span>
            <span class="value">${formatCurrency(value)}</span>
        </div>
    `,
      )
      .join("") +
    `
        <div class="pivot-row total">
            <span class="label">TOTAL</span>
            <span class="value">${formatCurrency(typeTotal)}</span>
        </div>
    `;
}

function exportCSV() {
  const filtered = getFilteredExpenses();
  const headers = [
    "Data",
    "Artista",
    "Projeto",
    "Tipo",
    "Entidade",
    "Investidor",
    "Valor",
    "Notas",
  ];
  const rows = filtered.map((e) => [
    e.date,
    e.artist,
    e.project,
    getTypeName(e.type),
    e.entity || "",
    e.investor === "maktub" ? "Maktub" : "Terceiros",
    e.amount.toFixed(2),
    e.notes || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `maktub_despesas_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  showToast("CSV exportado!", "success");
}

function exportGoogleSheets() {
  const filtered = getFilteredExpenses();

  // Create a TSV format that Google Sheets handles well
  const headers = [
    "Data\tArtista\tProjeto\tTipo\tEntidade\tInvestidor\tValor\tNotas",
  ];
  const rows = filtered.map((e) =>
    [
      e.date,
      e.artist,
      e.project,
      getTypeName(e.type),
      e.entity || "",
      e.investor === "maktub" ? "Maktub" : "Terceiros",
      e.amount.toFixed(2).replace(".", ","), // European format
      e.notes || "",
    ].join("\t"),
  );

  // Add summary rows
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const maktub = filtered
    .filter((e) => e.investor === "maktub")
    .reduce((sum, e) => sum + e.amount, 0);
  const outros = filtered
    .filter((e) => e.investor === "outro")
    .reduce((sum, e) => sum + e.amount, 0);

  rows.push("");
  rows.push(`\t\t\t\t\tTOTAL\t${total.toFixed(2).replace(".", ",")}`);
  rows.push(`\t\t\t\t\tMaktub\t${maktub.toFixed(2).replace(".", ",")}`);
  rows.push(`\t\t\t\t\tTerceiros\t${outros.toFixed(2).replace(".", ",")}`);

  // Add pivot summaries
  rows.push("");
  rows.push("RESUMO POR ARTISTA");
  const byArtist = {};
  filtered.forEach((e) => {
    byArtist[e.artist] = (byArtist[e.artist] || 0) + e.amount;
  });
  Object.entries(byArtist)
    .sort((a, b) => b[1] - a[1])
    .forEach(([artist, amount]) => {
      rows.push(`${artist}\t\t\t\t\t\t${amount.toFixed(2).replace(".", ",")}`);
    });

  rows.push("");
  rows.push("RESUMO POR TIPO");
  const byType = {};
  filtered.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + e.amount;
  });
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, amount]) => {
      rows.push(
        `${getTypeName(type)}\t\t\t\t\t\t${amount.toFixed(2).replace(".", ",")}`,
      );
    });

  const tsv = [headers, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + tsv], {
    type: "text/tab-separated-values;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `maktub_despesas_${new Date().toISOString().split("T")[0]}.tsv`;
  link.click();

  showToast(
    "Ficheiro para Google Sheets exportado! Abra no Google Sheets.",
    "success",
  );
}

function exportPDF() {
  const filtered = getFilteredExpenses();
  const printWindow = window.open("", "_blank");
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const maktub = filtered
    .filter((e) => e.investor === "maktub")
    .reduce((sum, e) => sum + e.amount, 0);
  const others = filtered
    .filter((e) => e.investor === "outro")
    .reduce((sum, e) => sum + e.amount, 0);

  // Build chart data for artists
  const byArtist = {};
  filtered.forEach((e) => {
    if (!byArtist[e.artist])
      byArtist[e.artist] = { total: 0, maktub: 0, outros: 0 };
    byArtist[e.artist].total += e.amount;
    if (e.investor === "maktub") byArtist[e.artist].maktub += e.amount;
    else byArtist[e.artist].outros += e.amount;
  });
  const artistData = Object.entries(byArtist).sort(
    (a, b) => b[1].total - a[1].total,
  );
  const maxArtist = artistData.length > 0 ? artistData[0][1].total : 0;

  // Build chart data for types
  const byType = {};
  filtered.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + e.amount;
  });
  const typeData = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const maxType = typeData.length > 0 ? typeData[0][1] : 0;

  const typeColors = {
    combustivel: "#ff6b6b",
    alimentacao: "#ffa94d",
    alojamento: "#ffd43b",
    equipamento: "#69db7c",
    producao: "#33E933",
    promocao: "#4dabf7",
    transporte: "#9775fa",
    outros: "#868e96",
  };

  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maktub Art Group - Relatório de Despesas</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #111; color: #fff; min-height: 100vh; }
                .header { background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 40px; border-bottom: 3px solid #33E933; }
                .header-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 24px; }
                .logo { width: 80px; height: 80px; background: #33E933; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: #111; }
                .header-text h1 { font-size: 2rem; font-weight: 700; margin-bottom: 4px; }
                .header-text p { color: #888; font-size: 1rem; }
                .container { max-width: 1200px; margin: 0 auto; padding: 40px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
                .stat-card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; }
                .stat-value { font-size: 1.75rem; font-weight: 700; display: block; margin-bottom: 4px; }
                .stat-value.green { color: #33E933; }
                .stat-value.yellow { color: #ffbb33; }
                .stat-label { font-size: 0.875rem; color: #888; }
                .charts-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 40px; }
                .chart-card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; }
                .chart-card h3 { font-size: 1rem; margin-bottom: 20px; color: #33E933; }
                .chart-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .chart-bar-label { min-width: 120px; font-size: 0.875rem; color: #ccc; }
                .chart-bar-track { flex: 1; height: 24px; background: #222; border-radius: 4px; overflow: hidden; display: flex; }
                .chart-bar-fill { height: 100%; background: #33E933; border-radius: 4px; }
                .chart-bar-value { min-width: 100px; text-align: right; font-size: 0.875rem; font-weight: 500; }
                .bar-maktub { background: #33E933; }
                .bar-outros { background: #ffbb33; }
                .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #333; }
                table { width: 100%; border-collapse: collapse; font-size: 0.875rem; background: #1a1a1a; border-radius: 12px; overflow: hidden; }
                th { background: #222; padding: 16px 12px; text-align: left; font-weight: 600; color: #33E933; border-bottom: 2px solid #333; }
                td { padding: 12px; border-bottom: 1px solid #222; }
                tr:hover { background: #222; }
                .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
                .badge-maktub { background: rgba(51, 233, 57, 0.2); color: #33E933; }
                .badge-other { background: rgba(255, 187, 51, 0.2); color: #ffbb33; }
                .total-row { background: #222; font-weight: 600; }
                .total-row td { border-top: 2px solid #33E933; color: #33E933; }
                .footer { text-align: center; padding: 40px; color: #666; font-size: 0.875rem; border-top: 1px solid #333; margin-top: 40px; }
                @media print {
                    body { background: #fff; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .header { background: #f8f8f8 !important; border-bottom-color: #33E933; }
                    .header-text h1, .header-text p { color: #333; }
                    .stat-card, .chart-card, table { background: #f8f8f8 !important; border-color: #ddd; }
                    th { background: #eee !important; }
                    td { border-bottom-color: #ddd; }
                    tr:hover { background: #f0f0f0; }
                    .stat-label, .chart-bar-label { color: #666; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-content">
                    <div class="logo">M</div>
                    <div class="header-text">
                        <h1>Maktub Art Group</h1>
                        <p>Relatório de Despesas • ${new Date().toLocaleDateString("pt-PT")} • ${filtered.length} registos</p>
                    </div>
                </div>
            </div>
            
            <div class="container">
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-value">${formatCurrency(total)}</span>
                        <span class="stat-label">Total Gasto</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value green">${formatCurrency(maktub)}</span>
                        <span class="stat-label">Maktub Investiu</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value yellow">${formatCurrency(others)}</span>
                        <span class="stat-label">Terceiros</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${filtered.length}</span>
                        <span class="stat-label">Registos</span>
                    </div>
                </div>
                
                <div class="charts-row">
                    <div class="chart-card">
                        <h3>Despesas por Artista</h3>
                        ${artistData
                          .map(
                            ([artist, data]) => `
                            <div class="chart-bar">
                                <span class="chart-bar-label">${artist}</span>
                                <div class="chart-bar-track">
                                    <div class="bar-maktub" style="width: ${(data.maktub / data.total) * 100}%"></div>
                                    <div class="bar-outros" style="width: ${(data.outros / data.total) * 100}%"></div>
                                </div>
                                <span class="chart-bar-value">${formatCurrency(data.total)}</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <div class="chart-card">
                        <h3>Despesas por Tipo</h3>
                        ${typeData
                          .map(
                            ([type, amount]) => `
                            <div class="chart-bar">
                                <span class="chart-bar-label">${getTypeName(type)}</span>
                                <div class="chart-bar-track">
                                    <div class="chart-bar-fill" style="width: ${(amount / maxType) * 100}%; background: ${typeColors[type] || "#33E933"}"></div>
                                </div>
                                <span class="chart-bar-value">${formatCurrency(amount)}</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
                
                <h2 class="section-title">Detalhe de Despesas</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Artista</th>
                            <th>Projeto</th>
                            <th>Tipo</th>
                            <th>Entidade</th>
                            <th>Investidor</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map(
                            (e) => `
                            <tr>
                                <td>${formatDate(e.date)}</td>
                                <td>${e.artist}</td>
                                <td>${e.project}</td>
                                <td>${getTypeName(e.type)}</td>
                                <td>${e.entity || "-"}</td>
                                <td><span class="badge ${e.investor === "maktub" ? "badge-maktub" : "badge-other"}">${e.investor === "maktub" ? "Maktub" : "Terceiros"}</span></td>
                                <td>${formatCurrency(e.amount)}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="5"><strong>TOTAL</strong></td>
                            <td></td>
                            <td><strong>${formatCurrency(total)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer">
                    <p>Maktub Art Group • Gestão de Despesas • Gerado automaticamente em ${new Date().toLocaleString("pt-PT")}</p>
                </div>
            </div>
        </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.print();

  showToast("A preparar PDF...", "success");
}

// ==========================================
// SETTLEMENT
// ==========================================

function updateSettlement() {
  const maktubTotal = expenses
    .filter((e) => e.investor === "maktub")
    .reduce((sum, e) => sum + e.amount, 0);
  const othersTotal = expenses
    .filter((e) => e.investor === "outro")
    .reduce((sum, e) => sum + e.amount, 0);
  const total = maktubTotal + othersTotal;

  document.getElementById("settle-maktub").textContent =
    formatCurrency(maktubTotal);
  document.getElementById("settle-others").textContent =
    formatCurrency(othersTotal);

  const pctMaktub = total > 0 ? (maktubTotal / total) * 100 : 50;
  const pctOthers = total > 0 ? (othersTotal / total) * 100 : 50;

  document.getElementById("bar-maktub").style.width = pctMaktub + "%";
  document.getElementById("bar-others").style.width = pctOthers + "%";
  document.getElementById("pct-maktub").textContent =
    pctMaktub.toFixed(1) + "%";
  document.getElementById("pct-others").textContent =
    pctOthers.toFixed(1) + "%";

  const summaryEl = document.getElementById("settlement-summary");
  if (total === 0) {
    summaryEl.innerHTML = "<p>Carregue dados para ver o resumo do acerto.</p>";
  } else {
    summaryEl.innerHTML = `
            <p>
                O <strong>Maktub Art Group</strong> investiu <span class="highlight">${formatCurrency(maktubTotal)}</span> 
                (${pctMaktub.toFixed(1)}% do total) em custos de produção, logística e operações.
            </p>
            <p>
                Os <strong>terceiros</strong> (cachets de artistas) representam <span class="highlight">${formatCurrency(othersTotal)}</span> 
                (${pctOthers.toFixed(1)}% do total) em receitas/proveitos.
            </p>
        `;
  }

  updateArtistBreakdown();
}

function updateArtistBreakdown() {
  const container = document.getElementById("artist-breakdown-list");

  // Build nested structure: artist -> project -> { revenue, costs by investor }
  const byArtist = {};

  expenses.forEach((e) => {
    if (!byArtist[e.artist]) {
      byArtist[e.artist] = {
        projects: {},
        totalRevenue: 0,
        totalCostsMaktub: 0,
        totalCostsOutros: 0,
      };
    }
    const artistData = byArtist[e.artist];

    if (!artistData.projects[e.project]) {
      artistData.projects[e.project] = {
        revenue: 0,
        costsMaktub: 0,
        costsOutros: 0,
        items: [],
      };
    }
    const proj = artistData.projects[e.project];
    proj.items.push(e);

    if (e.investor === "outro") {
      // Revenue / Proveito (cachets paid by third parties)
      proj.revenue += e.amount;
      artistData.totalRevenue += e.amount;
    } else {
      // Cost paid by Maktub
      proj.costsMaktub += e.amount;
      artistData.totalCostsMaktub += e.amount;
    }
  });

  const artists = Object.entries(byArtist).sort((a, b) => {
    // Sort by total volume descending
    const totalA = a[1].totalRevenue + a[1].totalCostsMaktub;
    const totalB = b[1].totalRevenue + b[1].totalCostsMaktub;
    return totalB - totalA;
  });

  if (artists.length === 0) {
    container.innerHTML = '<p class="empty-state">Sem dados</p>';
    return;
  }

  let grandTotalRevenue = 0;
  let grandTotalCosts = 0;

  container.innerHTML = artists
    .map(([artist, data]) => {
      const netBalance = data.totalRevenue - data.totalCostsMaktub;
      grandTotalRevenue += data.totalRevenue;
      grandTotalCosts += data.totalCostsMaktub;

      const projects = Object.entries(data.projects).sort((a, b) => {
        const netA = a[1].revenue - a[1].costsMaktub;
        const netB = b[1].revenue - b[1].costsMaktub;
        return netB - netA;
      });

      const projectRows = projects
        .map(([projName, projData]) => {
          const projNet = projData.revenue - projData.costsMaktub;
          const profitClass =
            projNet >= 0 ? "breakdown-positive" : "breakdown-negative";
          return `
                <div class="breakdown-project-row">
                    <span class="breakdown-project-name">📁 ${projName}</span>
                    <span class="breakdown-revenue">Receita: ${formatCurrency(projData.revenue)}</span>
                    <span class="breakdown-costs">Custos Maktub: ${formatCurrency(projData.costsMaktub)}</span>
                    <span class="breakdown-net ${profitClass}">${projNet >= 0 ? "+" : ""}${formatCurrency(projNet)}</span>
                </div>
            `;
        })
        .join("");

      const balanceClass =
        netBalance >= 0 ? "breakdown-positive" : "breakdown-negative";
      const balanceLabel =
        netBalance >= 0
          ? `Lucro: +${formatCurrency(netBalance)}`
          : `Maktub a recuperar: ${formatCurrency(Math.abs(netBalance))}`;

      return `
            <div class="breakdown-item">
                <div class="breakdown-header">
                    <span class="breakdown-artist">${artist}</span>
                    <div class="breakdown-values">
                        <span class="breakdown-maktub">Receitas: ${formatCurrency(data.totalRevenue)}</span>
                        <span class="breakdown-others">Custos Maktub: ${formatCurrency(data.totalCostsMaktub)}</span>
                        <span class="breakdown-net ${balanceClass}">${balanceLabel}</span>
                    </div>
                </div>
                <div class="breakdown-projects">
                    ${projectRows}
                </div>
            </div>
        `;
    })
    .join("");

  // Grand total row
  const grandNet = grandTotalRevenue - grandTotalCosts;
  const grandClass =
    grandNet >= 0 ? "breakdown-positive" : "breakdown-negative";
  container.innerHTML += `
        <div class="breakdown-item breakdown-grand-total">
            <div class="breakdown-header">
                <span class="breakdown-artist">TOTAL GERAL</span>
                <div class="breakdown-values">
                    <span class="breakdown-maktub">Receitas: ${formatCurrency(grandTotalRevenue)}</span>
                    <span class="breakdown-others">Custos Maktub: ${formatCurrency(grandTotalCosts)}</span>
                    <span class="breakdown-net ${grandClass}">${grandNet >= 0 ? "Lucro: +" : "A recuperar: "}${formatCurrency(Math.abs(grandNet))}</span>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// MODALS
// ==========================================

function initModals() {
  document
    .getElementById("close-edit")
    .addEventListener("click", closeEditModal);
  document
    .getElementById("cancel-edit")
    .addEventListener("click", closeEditModal);
  document.getElementById("edit-form").addEventListener("submit", handleEdit);

  document
    .getElementById("close-delete")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("cancel-delete")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("confirm-delete")
    .addEventListener("click", handleDelete);

  document.getElementById("edit-modal").addEventListener("click", (e) => {
    if (e.target.id === "edit-modal") closeEditModal();
  });
  document.getElementById("delete-modal").addEventListener("click", (e) => {
    if (e.target.id === "delete-modal") closeDeleteModal();
  });
}

function openEditModal(id) {
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  editingId = id;
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-artist").value = expense.artist;
  document.getElementById("edit-project").value = expense.project;
  document.getElementById("edit-type").value = expense.type;
  document.getElementById("edit-amount").value = expense.amount;
  document.getElementById("edit-date").value = expense.date;
  document.getElementById("edit-entity").value = expense.entity || "";
  document.getElementById("edit-investor").value = expense.investor;
  document.getElementById("edit-notes").value = expense.notes || "";

  document.getElementById("edit-modal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.add("hidden");
  editingId = null;
}

function handleEdit(e) {
  e.preventDefault();

  const index = expenses.findIndex((exp) => exp.id === editingId);
  if (index === -1) return;

  expenses[index] = {
    ...expenses[index],
    artist: document.getElementById("edit-artist").value,
    project: document.getElementById("edit-project").value,
    type: document.getElementById("edit-type").value,
    amount: parseFloat(document.getElementById("edit-amount").value),
    date: document.getElementById("edit-date").value,
    entity: document.getElementById("edit-entity").value,
    investor: document.getElementById("edit-investor").value,
    notes: document.getElementById("edit-notes").value,
  };

  saveData();
  closeEditModal();
  renderTable();
  renderPivotTables();
  updateDashboard();
  showToast("Despesa atualizada!", "success");
}

function openDeleteModal(id) {
  document.getElementById("delete-id").value = id;
  document.getElementById("delete-modal").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("delete-modal").classList.add("hidden");
}

function handleDelete() {
  const id = document.getElementById("delete-id").value;
  expenses = expenses.filter((e) => e.id !== id);
  saveData();
  closeDeleteModal();
  renderTable();
  renderPivotTables();
  updateDashboard();
  updateFilterDropdowns();
  showToast("Despesa eliminada!", "success");
}

// ==========================================
// UTILITIES
// ==========================================

function formatCurrency(amount) {
  return (
    amount.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " EUR"
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTypeName(type) {
  const types = {
    combustivel: "Combustível",
    alimentacao: "Alimentação",
    alojamento: "Alojamento",
    equipamento: "Equipamento",
    producao: "Produção",
    promocao: "Promoção",
    transporte: "Transporte",
    outros: "Outros",
  };
  return types[type] || type;
}

function getTypeIcon(type) {
  const icons = {
    combustivel:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M13 10h4a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2"/><circle cx="8" cy="10" r="2"/></svg>',
    alimentacao:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>',
    alojamento:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>',
    equipamento:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><path d="M8 17V5l12-2v12"/></svg>',
    producao:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    promocao:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    transporte:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10H6l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    outros:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  };
  return icons[type] || icons.outros;
}

function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = "toast" + (type ? " " + type : "");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// ==========================================
// PIVOT SECTION TOGGLE
// ==========================================

function togglePivotSection() {
  const content = document.getElementById("pivot-content");
  const icon = document.getElementById("pivot-toggle-icon");
  content.classList.toggle("hidden");
  icon.classList.toggle("collapsed");
}

// ==========================================
// CHART EXPORT FUNCTIONS
// ==========================================

function exportChartCSV(chartType) {
  let headers, rows, filename;

  if (chartType === "investor") {
    headers = ["Artista", "Maktub", "Terceiros", "Total"];
    const byArtist = {};
    expenses.forEach((e) => {
      if (!byArtist[e.artist]) byArtist[e.artist] = { maktub: 0, outros: 0 };
      if (e.investor === "maktub") byArtist[e.artist].maktub += e.amount;
      else byArtist[e.artist].outros += e.amount;
    });
    rows = Object.entries(byArtist).map(([artist, data]) => [
      artist,
      data.maktub.toFixed(2),
      data.outros.toFixed(2),
      (data.maktub + data.outros).toFixed(2),
    ]);
    filename = "maktub_artista_investidor";
  } else {
    const types = [
      "combustivel",
      "alimentacao",
      "alojamento",
      "equipamento",
      "producao",
      "promocao",
      "transporte",
      "outros",
    ];
    headers = ["Artista", ...types.map((t) => getTypeName(t)), "Total"];
    const byArtist = {};
    expenses.forEach((e) => {
      if (!byArtist[e.artist]) {
        byArtist[e.artist] = { total: 0 };
        types.forEach((t) => (byArtist[e.artist][t] = 0));
      }
      byArtist[e.artist][e.type] += e.amount;
      byArtist[e.artist].total += e.amount;
    });
    rows = Object.entries(byArtist).map(([artist, data]) => [
      artist,
      ...types.map((t) => data[t].toFixed(2)),
      data.total.toFixed(2),
    ]);
    filename = "maktub_artista_categoria";
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  showToast("CSV exportado!", "success");
}

function exportChartPDF(chartType) {
  const printWindow = window.open("", "_blank");
  let title, tableHTML;

  if (chartType === "investor") {
    title = "Por Artista: Maktub vs Terceiros";
    const byArtist = {};
    let totalMaktub = 0,
      totalOutros = 0;
    expenses.forEach((e) => {
      if (!byArtist[e.artist]) byArtist[e.artist] = { maktub: 0, outros: 0 };
      if (e.investor === "maktub") {
        byArtist[e.artist].maktub += e.amount;
        totalMaktub += e.amount;
      } else {
        byArtist[e.artist].outros += e.amount;
        totalOutros += e.amount;
      }
    });
    tableHTML = `
            <table>
                <thead><tr><th>Artista</th><th>Maktub</th><th>Terceiros</th><th>Total</th></tr></thead>
                <tbody>
                    ${Object.entries(byArtist)
                      .sort(
                        (a, b) =>
                          b[1].maktub +
                          b[1].outros -
                          (a[1].maktub + a[1].outros),
                      )
                      .map(
                        ([artist, data]) => `
                        <tr>
                            <td>${artist}</td>
                            <td class="maktub">${formatCurrency(data.maktub)}</td>
                            <td class="outros">${formatCurrency(data.outros)}</td>
                            <td><strong>${formatCurrency(data.maktub + data.outros)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td class="maktub"><strong>${formatCurrency(totalMaktub)}</strong></td>
                        <td class="outros"><strong>${formatCurrency(totalOutros)}</strong></td>
                        <td><strong>${formatCurrency(totalMaktub + totalOutros)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
  } else {
    title = "Por Artista: Breakdown por Categoria";
    const types = [
      "combustivel",
      "alimentacao",
      "alojamento",
      "equipamento",
      "producao",
      "promocao",
      "transporte",
      "outros",
    ];
    const byArtist = {};
    const totals = {};
    types.forEach((t) => (totals[t] = 0));
    expenses.forEach((e) => {
      if (!byArtist[e.artist]) {
        byArtist[e.artist] = { total: 0 };
        types.forEach((t) => (byArtist[e.artist][t] = 0));
      }
      byArtist[e.artist][e.type] += e.amount;
      byArtist[e.artist].total += e.amount;
      totals[e.type] += e.amount;
    });
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    tableHTML = `
            <table>
                <thead><tr><th>Artista</th>${types.map((t) => `<th>${getTypeName(t)}</th>`).join("")}<th>Total</th></tr></thead>
                <tbody>
                    ${Object.entries(byArtist)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(
                        ([artist, data]) => `
                        <tr>
                            <td>${artist}</td>
                            ${types.map((t) => `<td>${formatCurrency(data[t])}</td>`).join("")}
                            <td><strong>${formatCurrency(data.total)}</strong></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        ${types.map((t) => `<td><strong>${formatCurrency(totals[t])}</strong></td>`).join("")}
                        <td><strong>${formatCurrency(grandTotal)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
  }

  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maktub Art Group - ${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; background: #111; color: #fff; }
                .header { background: #1a1a1a; padding: 24px; border-radius: 12px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px; }
                .logo { width: 60px; height: 60px; background: #33E933; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #111; }
                h1 { color: #fff; margin: 0; font-size: 1.5rem; }
                .subtitle { color: #888; margin: 4px 0 0; font-size: 0.875rem; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
                th { background: #222; font-weight: 600; color: #33E933; }
                .maktub { color: #33E933; }
                .outros { color: #ffbb33; }
                .total-row { background: #222; }
                .total-row td { border-top: 2px solid #33E933; }
                @media print { body { background: #fff; color: #333; } table { background: #f5f5f5; } th { background: #e5e5e5; color: #111; } .header { background: #f5f5f5; } h1, .subtitle { color: #333; } .total-row { background: #e5e5e5; } th, td { border-bottom-color: #ddd; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">M</div>
                <div>
                    <h1>Maktub Art Group</h1>
                    <p class="subtitle">${title} - ${new Date().toLocaleDateString("pt-PT")}</p>
                </div>
            </div>
            ${tableHTML}
        </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.print();

  showToast("A preparar PDF...", "success");
}

// ==========================================
// Google Sheets Sync
// ==========================================

function initGoogleSheetsSync() {
  // Check if Google Sheets integration is enabled
  if (!GOOGLE_SCRIPT_URL) {
    console.log("Google Sheets sync disabled - no URL configured");
    // Hide sync buttons if they exist
    const syncButtons = document.querySelectorAll(".sync-btn");
    syncButtons.forEach((btn) => (btn.style.display = "none"));
    return;
  }

  console.log("Google Sheets sync enabled");
  // Show sync buttons
  const syncButtons = document.querySelectorAll(".sync-btn");
  syncButtons.forEach((btn) => (btn.style.display = "inline-flex"));
}

// Show sync progress modal
function showSyncProgressModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById("sync-progress-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "sync-progress-modal";
    modal.className = "modal";
    modal.innerHTML = `
            <div class="modal-content sync-progress-content">
                <div class="sync-progress-header">
                    <div class="sync-spinner"></div>
                    <h3>A Sincronizar com Google Sheets</h3>
                </div>
                <div class="sync-progress-bar-container">
                    <div class="sync-progress-bar" id="sync-progress-bar"></div>
                </div>
                <p class="sync-progress-text" id="sync-progress-text">A iniciar...</p>
                <div class="sync-progress-steps" id="sync-progress-steps"></div>
                <p class="sync-progress-note">💡 Podes fechar esta janela - a sincronização continua em segundo plano.</p>
                <div class="sync-progress-actions">
                    <button class="btn btn-secondary" onclick="closeSyncProgressModal()">Fechar</button>
                    <button class="btn btn-danger" id="cancel-sync-btn" onclick="cancelSync()">Cancelar Sync</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
  }
  modal.classList.remove("hidden");
  updateSyncProgress(0, "A preparar sincronização...");
}

function closeSyncProgressModal() {
  const modal = document.getElementById("sync-progress-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function updateSyncProgress(percent, message, steps = []) {
  const progressBar = document.getElementById("sync-progress-bar");
  const progressText = document.getElementById("sync-progress-text");
  const progressSteps = document.getElementById("sync-progress-steps");

  if (progressBar) {
    progressBar.style.width = percent + "%";
  }
  if (progressText) {
    progressText.textContent = message;
  }
  if (progressSteps && steps.length > 0) {
    progressSteps.innerHTML = steps
      .map(
        (step, i) =>
          `<div class="sync-step ${step.done ? "done" : step.active ? "active" : ""}">
                <span class="step-icon">${step.done ? "✅" : step.active ? "⏳" : "○"}</span>
                <span>${step.text}</span>
            </div>`,
      )
      .join("");
  }
}

let syncAborted = false;

function cancelSync() {
  syncAborted = true;
  isSyncing = false;
  updateSyncButtonState(false);
  updateSyncProgress(0, "❌ Sincronização cancelada pelo utilizador");
  showToast("Sincronização cancelada", "error");

  setTimeout(() => {
    closeSyncProgressModal();
  }, 1500);
}

// Sync local data to Google Drive with progress
async function syncToGoogleSheets() {
  if (!GOOGLE_SCRIPT_URL) {
    showToast("Google Drive não configurado", "error");
    return;
  }

  if (isSyncing) {
    showToast("Sincronização em progresso...", "error");
    return;
  }

  syncAborted = false;
  isSyncing = true;
  updateSyncButtonState(true);
  showSyncProgressModal();

  // Simplified steps - no setup tasks (those are in separate script)
  const steps = [
    { text: "Preparar dados", done: false, active: true },
    { text: "Enviar para Google Drive", done: false, active: false },
    { text: "Atualizar folha principal", done: false, active: false },
    { text: "Atualizar folhas dos artistas", done: false, active: false },
  ];

  console.log("🚀 Starting sync to Google Drive...");
  console.log("📊 Total expenses to sync:", expenses.length);

  try {
    // Step 1: Prepare data
    updateSyncProgress(10, `A preparar ${expenses.length} despesas...`, steps);

    const payload = {
      action: "syncFromWebsite",
      expenses: expenses,
      timestamp: new Date().toISOString(),
    };

    if (syncAborted) return;

    // Step 2: Send to Google Drive
    steps[0].done = true;
    steps[0].active = false;
    steps[1].active = true;
    updateSyncProgress(30, "A enviar dados para Google Drive...", steps);

    // Use iframe form submission to bypass CORS
    await sendToGoogleSheets(payload);

    console.log("✅ Request sent successfully");

    if (syncAborted) return;

    // Step 3: Main sheet update
    steps[1].done = true;
    steps[1].active = false;
    steps[2].active = true;
    updateSyncProgress(60, "A atualizar folha principal...", steps);

    await new Promise((r) => setTimeout(r, 1000));
    if (syncAborted) return;

    // Step 4: Artist sheets update
    steps[2].done = true;
    steps[2].active = false;
    steps[3].active = true;
    updateSyncProgress(85, "A atualizar folhas dos artistas...", steps);

    await new Promise((r) => setTimeout(r, 1500));
    if (syncAborted) return;

    // Complete
    steps[3].done = true;
    steps[3].active = false;
    updateSyncProgress(100, "✅ Sincronização completa!", steps);

    // Try to read response
    try {
      const result = await response.text();
      console.log("Response:", result);

      // Parse and check for errors
      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.success === false) {
          throw new Error(jsonResult.error || "Sync failed");
        }
      } catch (parseError) {
        // If can't parse, assume success (CORS redirect)
        console.log("Response not JSON, assuming success");
      }
    } catch (e) {
      console.log("Could not read response (normal with CORS)");
    }

    showToast(`✅ ${expenses.length} despesas sincronizadas!`, "success");
    localStorage.setItem("lastSyncToSheets", new Date().toISOString());

    // Close modal after 2 seconds
    setTimeout(() => {
      closeSyncProgressModal();
    }, 2000);
  } catch (error) {
    console.error("❌ Sync to Google Drive failed:", error);
    updateSyncProgress(0, "❌ Erro: " + error.message, []);
    showToast("Erro ao sincronizar: " + error.message, "error");
  } finally {
    isSyncing = false;
    updateSyncButtonState(false);
  }
}

// Sync data from Google Sheets to local
async function syncFromGoogleSheets() {
  if (!GOOGLE_SCRIPT_URL) {
    showToast("Google Sheets não configurado", "error");
    return;
  }

  if (isSyncing) {
    showToast("Sincronização em progresso...", "error");
    return;
  }

  isSyncing = true;
  updateSyncButtonState(true);
  showToast("A obter dados do Google Sheets...", "success");

  try {
    // For GET requests, we can use JSONP-style approach
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllExpenses`, {
      method: "GET",
    });

    const data = await response.json();

    if (data.success && data.expenses) {
      // Merge with existing data or replace
      const sheetExpenses = data.expenses;

      // Create a map of existing expenses by ID
      const existingMap = new Map(expenses.map((e) => [e.id, e]));

      // Merge sheet expenses
      sheetExpenses.forEach((sheetExp) => {
        // Try to find matching expense
        if (sheetExp.id && existingMap.has(sheetExp.id)) {
          // Update existing
          const idx = expenses.findIndex((e) => e.id === sheetExp.id);
          if (idx !== -1) {
            expenses[idx] = { ...expenses[idx], ...sheetExp };
          }
        } else {
          // Add new (generate ID if missing)
          if (!sheetExp.id) {
            sheetExp.id = generateId();
          }
          expenses.push(sheetExp);
        }
      });

      saveData();
      updateDashboard();
      renderTable();
      renderPivotTables();
      updateSettlement();

      showToast(
        `Sincronizado! ${sheetExpenses.length} registos do Google Sheets`,
        "success",
      );
      localStorage.setItem("lastSyncFromSheets", new Date().toISOString());
    } else {
      showToast("Nenhum dado encontrado no Google Sheets", "error");
    }
  } catch (error) {
    console.error("Sync from Google Sheets failed:", error);
    showToast("Erro ao sincronizar: " + error.message, "error");
  } finally {
    isSyncing = false;
    updateSyncButtonState(false);
  }
}

// Full bidirectional sync
async function fullSync() {
  if (!GOOGLE_SCRIPT_URL) {
    console.error("❌ No Google Script URL configured");
    showToast("Google Sheets não configurado", "error");
    return;
  }

  if (isSyncing) {
    console.log("⏸️ Sync already in progress");
    showToast("Sincronização em progresso...", "error");
    return;
  }

  console.log("🔄 FULL SYNC STARTED");
  console.log("📊 Local expenses count:", expenses.length);
  console.log("🔗 Google Script URL:", GOOGLE_SCRIPT_URL);

  isSyncing = true;
  updateSyncButtonState(true);
  showToast("A sincronizar bidirecionalmente...", "success");

  try {
    // First, get data from sheets
    console.log("📡 Fetching from Google Sheets...");
    const getResponse = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getAllExpenses`,
      {
        method: "GET",
      },
    );

    console.log(
      "📡 Response status:",
      getResponse.status,
      getResponse.statusText,
    );

    const getData = await getResponse.json();
    console.log("📡 Response data:", getData);

    let sheetExpenses = getData.success ? getData.expenses || [] : [];
    console.log("📊 Sheet expenses count:", sheetExpenses.length);

    // Create maps for comparison
    const localMap = new Map(expenses.map((e) => [e.id, e]));
    const sheetMap = new Map(sheetExpenses.map((e) => [e.id, e]));

    console.log("🔀 Merging data...");
    console.log("  Local unique IDs:", localMap.size);
    console.log("  Sheet unique IDs:", sheetMap.size);

    // Merge: newer timestamp wins
    const mergedExpenses = [];
    const allIds = new Set([...localMap.keys(), ...sheetMap.keys()]);

    allIds.forEach((id) => {
      const local = localMap.get(id);
      const sheet = sheetMap.get(id);

      if (local && sheet) {
        // Both exist - use the one with newer timestamp or local if no timestamps
        const localTime = local.updatedAt
          ? new Date(local.updatedAt)
          : new Date(0);
        const sheetTime = sheet.updatedAt
          ? new Date(sheet.updatedAt)
          : new Date(0);
        mergedExpenses.push(localTime >= sheetTime ? local : sheet);
      } else if (local) {
        mergedExpenses.push(local);
      } else if (sheet) {
        mergedExpenses.push(sheet);
      }
    });

    console.log("✅ Merged count:", mergedExpenses.length);

    expenses = mergedExpenses;

    // Now push merged data back to sheets
    console.log("📤 Pushing to Google Sheets...");
    const syncPayload = {
      action: "syncFromWebsite",
      expenses: expenses,
      timestamp: new Date().toISOString(),
    };

    const syncResult = await sendToGoogleSheets(syncPayload);
    console.log("📤 Sync result:", syncResult);

    saveData();
    updateDashboard();
    renderTable();
    renderPivotTables();
    updateSettlement();

    const now = new Date().toISOString();
    localStorage.setItem("lastSyncToSheets", now);
    localStorage.setItem("lastSyncFromSheets", now);

    console.log("✅ SYNC COMPLETED SUCCESSFULLY");
    showToast("Sincronização completa!", "success");
  } catch (error) {
    console.error("❌ SYNC FAILED:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    showToast("Erro na sincronização: " + error.message, "error");
  } finally {
    isSyncing = false;
    updateSyncButtonState(false);
  }
}

// Update sync button visual state
function updateSyncButtonState(syncing) {
  const syncBtns = document.querySelectorAll(".sync-btn");
  syncBtns.forEach((btn) => {
    if (syncing) {
      btn.classList.add("syncing");
      btn.disabled = true;
    } else {
      btn.classList.remove("syncing");
      btn.disabled = false;
    }
  });
}

// Generate unique ID
function generateId() {
  return "exp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// Get last sync info
function getLastSyncInfo() {
  const lastTo = localStorage.getItem("lastSyncToSheets");
  const lastFrom = localStorage.getItem("lastSyncFromSheets");

  return {
    lastSyncToSheets: lastTo ? new Date(lastTo) : null,
    lastSyncFromSheets: lastFrom ? new Date(lastFrom) : null,
  };
}

// Open sync settings/info modal
function openSyncModal() {
  const syncInfo = getLastSyncInfo();
  const isConfigured = !!GOOGLE_SCRIPT_URL;

  let statusHtml = "";
  if (!isConfigured) {
    statusHtml = `
            <div class="sync-setup-guide">
                <div class="setup-intro">
                    <h3 style="color: var(--green-primary); margin-bottom: 16px;">🎯 Configuração Super Simples</h3>
                    <p style="font-size: 1rem; margin-bottom: 24px;">Vou guiar-te passo-a-passo. Quando precisar de informação, cola AQUI no chat comigo!</p>
                </div>
                
                <div class="setup-step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Abrir Google Apps Script</h4>
                        <p>Clica aqui para criar um novo projeto:</p>
                        <a href="https://script.google.com/home/start" target="_blank" class="setup-link">
                            🔗 Criar Projeto no Apps Script
                        </a>
                        <p class="step-action">✅ Quando abrires, cola o nome do projeto aqui no chat</p>
                    </div>
                </div>
                
                <div class="setup-step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Copiar o Código</h4>
                        <button class="copy-code-btn" onclick="copyAppsScriptCode()">
                            📋 COPIAR CÓDIGO (clica aqui)
                        </button>
                        <p style="margin-top: 12px;">Depois cola no Apps Script (apaga tudo primeiro)</p>
                        <p class="step-action">✅ Cola "CÓDIGO COLADO" aqui no chat quando terminares</p>
                    </div>
                </div>
                
                <div class="setup-step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Criar Sheets (vou fazer por ti!)</h4>
                        <p style="color: var(--warning); font-weight: 500;">⚠️ NÃO cries sheets manualmente!</p>
                        <p>Cola esta lista de artistas aqui no chat:</p>
                        <pre class="code-example" style="font-size: 0.85rem;">Bandidos do Cante
Buba Espinho
MAR
D.A.M.A
BRUCE
LUTZ
INÊS
REAL GUNS
SUAVE
Gerais Maktub</pre>
                        <p class="step-action">✅ Copia e cola a lista acima no chat - vou criar links para todas as sheets!</p>
                    </div>
                </div>
                
                <div class="setup-step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Publicar como Web App</h4>
                        <p>No Apps Script, clica em:</p>
                        <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin: 12px 0;">
                            <p style="margin: 4px 0;">1. <strong>Implementar</strong> (canto superior direito)</p>
                            <p style="margin: 4px 0;">2. <strong>Nova implementação</strong></p>
                            <p style="margin: 4px 0;">3. Tipo: <strong>Aplicação Web</strong></p>
                            <p style="margin: 4px 0;">4. Quem tem acesso: <strong>Qualquer pessoa</strong></p>
                            <p style="margin: 4px 0;">5. Clica <strong>Implementar</strong></p>
                        </div>
                        <p class="step-action">✅ Cola o URL que aparecer aqui no chat!</p>
                    </div>
                </div>
                
                <div class="setup-step">
                    <div class="step-number">5</div>
                    <div class="step-content">
                        <h4>Configurar IDs das Sheets</h4>
                        <p>Abre cada Google Sheet que criei e copia o ID do URL:</p>
                        <p class="step-note">💡 URL: docs.google.com/spreadsheets/d/<strong style="color: var(--green-primary);">ESTE_É_O_ID</strong>/edit</p>
                        <p class="step-action">✅ Cola TODOS os IDs aqui no chat (um por linha) - vou dar-te o código pronto!</p>
                    </div>
                </div>
                
                <div class="setup-final">
                    <h4 style="color: var(--green-primary); margin-bottom: 12px;">🎉 Depois disso, está pronto!</h4>
                    <p>Dou-te o código final para colares no <code>app.js</code> e no Apps Script.</p>
                </div>
            </div>
        `;
  } else {
    statusHtml = '<p class="sync-status-ok">✅ Google Sheets configurado</p>';
    if (syncInfo.lastSyncToSheets) {
      statusHtml += `<p class="sync-info-text">📤 Último envio: ${syncInfo.lastSyncToSheets.toLocaleString("pt-PT")}</p>`;
    }
    if (syncInfo.lastSyncFromSheets) {
      statusHtml += `<p class="sync-info-text">📥 Última receção: ${syncInfo.lastSyncFromSheets.toLocaleString("pt-PT")}</p>`;
    }
  }

  // Create modal HTML
  const modalHtml = `
        <div class="modal-overlay sync-modal-overlay" onclick="closeSyncModal()">
            <div class="modal sync-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>
                        <svg viewBox="0 0 87.3 78" fill="currentColor" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">
                            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
                            <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5l16.15-28z" fill="#00AC47"/>
                            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.9 10.6 7.8 13.2z" fill="#EA4335"/>
                            <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/>
                            <path d="M59.85 53h27.5c0-1.55-.4-3.1-1.2-4.5L73.55 26.8c-.8-1.4-1.95-2.5-3.3-3.3L57.4 46.6l2.45 6.4z" fill="#2684FC"/>
                            <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L13.85 26.8c-.8 1.4-1.2 2.95-1.2 4.5h27.5l3.5-6.3z" fill="#FFBA00"/>
                        </svg>
                        Google Drive Sync
                    </h3>
                    <button class="modal-close" onclick="closeSyncModal()">×</button>
                </div>
                <div class="modal-body">
                    ${statusHtml}
                    ${
                      isConfigured
                        ? `
                    <div class="sync-actions">
                        <button class="btn btn-primary sync-action-btn" onclick="syncToGoogleSheets()">
                            <span class="sync-icon">📤</span> Enviar para Drive
                        </button>
                        <button class="btn btn-secondary sync-action-btn" onclick="syncFromGoogleSheets()">
                            <span class="sync-icon">📥</span> Obter do Drive
                        </button>
                        <button class="btn btn-accent sync-action-btn" onclick="fullSync()">
                            <span class="sync-icon">🔄</span> Sincronização Completa
                        </button>
                    </div>
                    <div class="sync-settings-link">
                        <button class="text-btn" onclick="showSetupGuide()">⚙️ Ver instruções de configuração</button>
                    </div>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
    `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// Copy Apps Script code to clipboard
async function copyAppsScriptCode() {
  try {
    const response = await fetch("google-apps-script.js");
    const code = await response.text();
    await navigator.clipboard.writeText(code);
    showToast("Código copiado! Cola no Google Apps Script.", "success");
  } catch (error) {
    // Fallback: open the file in new tab
    window.open(
      "https://github.com/tomasbb0/mactube-expense-manager/blob/main/google-apps-script.js",
      "_blank",
    );
    showToast("Abre o link e copia manualmente.", "error");
  }
}

// Show setup guide even when configured
function showSetupGuide() {
  closeSyncModal();
  // Temporarily disable URL to show setup guide
  const tempUrl = GOOGLE_SCRIPT_URL;
  // We'll just open the setup guide in GitHub
  window.open(
    "https://github.com/tomasbb0/mactube-expense-manager#google-sheets-setup",
    "_blank",
  );
}

function closeSyncModal() {
  const modal = document.querySelector(".sync-modal-overlay");
  if (modal) {
    modal.remove();
  }
}

// ============================================
// CREATE NEW PROJECT
// ============================================

async function createNewProject() {
  const artistSelect = document.getElementById("project-artist");
  const nameInput = document.getElementById("project-name");
  const typeSelect = document.getElementById("project-type");
  const resultDiv = document.getElementById("project-result");
  const createBtn = document.getElementById("create-project-btn");

  const artistRaw = artistSelect.value;
  const projectName = nameInput.value.trim();
  const projectType = typeSelect.value;

  // Handle "New Artist" option
  let artist = artistRaw;
  if (artistRaw === "__new__") {
    const newArtistInput = document.getElementById("new-artist-name");
    artist = newArtistInput ? newArtistInput.value.trim() : "";
    if (!artist) {
      showToast("Insere o nome do novo artista", "error");
      if (newArtistInput) newArtistInput.focus();
      return;
    }
  }

  // Validation
  if (!artist) {
    showToast("Seleciona um artista", "error");
    artistSelect.focus();
    return;
  }

  if (!projectName) {
    showToast("Insere o nome do projeto", "error");
    nameInput.focus();
    return;
  }

  if (!projectType) {
    showToast("Seleciona o tipo de projeto", "error");
    typeSelect.focus();
    return;
  }

  if (!GOOGLE_SCRIPT_URL) {
    showToast("Google Sheets não configurado", "error");
    return;
  }

  // Disable button and show loading
  createBtn.disabled = true;
  createBtn.innerHTML = `
        <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        A criar projeto...
    `;

  try {
    const payload = {
      action: "createProject",
      artist: artist,
      projectName: projectName,
      projectType: projectType,
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const result = await response.json();

    if (result.success) {
      // Show success
      resultDiv.classList.remove("hidden");
      document.getElementById("project-result-text").textContent =
        `Projeto "${projectName}" criado para ${artist}`;
      document.getElementById("project-result-link").href = result.projectUrl;

      showToast("✅ Projeto criado com sucesso!", "success");

      // Clear form
      nameInput.value = "";
      artistSelect.value = "";
      typeSelect.value = "";
      const newArtistInput = document.getElementById("new-artist-name");
      if (newArtistInput) newArtistInput.value = "";
      const inlineDiv = document.getElementById("new-artist-inline");
      if (inlineDiv) inlineDiv.classList.add("hidden");
      artistSelect.style.display = "";

      // Refresh projects list
      loadExistingProjects();
    } else {
      showToast("Erro: " + result.error, "error");
    }
  } catch (error) {
    console.error("Error creating project:", error);
    showToast("Erro ao criar projeto: " + error.message, "error");
  } finally {
    // Re-enable button
    createBtn.disabled = false;
    createBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            Criar Projeto no Google Drive
        `;
  }
}

async function loadExistingProjects() {
  const projectsList = document.getElementById("projects-list");

  if (!GOOGLE_SCRIPT_URL) {
    projectsList.innerHTML =
      '<p class="loading-text">Google Sheets não configurado</p>';
    return;
  }

  projectsList.innerHTML = '<p class="loading-text">A carregar projetos...</p>';

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getProjects`);
    const data = await response.json();

    if (data.success && data.projects && data.projects.length > 0) {
      projectsList.innerHTML = data.projects
        .map(
          (proj) => `
                <div class="project-card">
                    <div class="project-card-header">
                        <span class="project-card-icon">📁</span>
                        <div>
                            <h4>${proj.project}</h4>
                            <p class="project-card-artist">${proj.artist}</p>
                        </div>
                    </div>
                    <a href="https://docs.google.com/spreadsheets/d/${proj.spreadsheetId}" target="_blank" class="project-card-link">
                        📊 Abrir Spreadsheet →
                    </a>
                </div>
            `,
        )
        .join("");
    } else {
      projectsList.innerHTML = `
                <p class="loading-text">Nenhum projeto criado ainda.<br>
                Usa o formulário acima para criar o primeiro!</p>
            `;
    }
  } catch (error) {
    console.error("Error loading projects:", error);
    projectsList.innerHTML =
      '<p class="loading-text">Erro ao carregar projetos</p>';
  }
}

// Load projects when switching to the tab
document.addEventListener("DOMContentLoaded", () => {
  // Listen for tab changes
  document.querySelectorAll('.tab[data-tab="new-project"]').forEach((tab) => {
    tab.addEventListener("click", () => {
      loadExistingProjects();
    });
  });

  // Show/hide new artist input when "Novo Artista" is selected
  const projectArtistSelect = document.getElementById("project-artist");
  if (projectArtistSelect) {
    projectArtistSelect.addEventListener("change", () => {
      const inlineDiv = document.getElementById("new-artist-inline");
      if (projectArtistSelect.value === "__new__") {
        projectArtistSelect.style.display = "none";
        inlineDiv.classList.remove("hidden");
        document.getElementById("new-artist-name").focus();
      }
    });

    const cancelBtn = document.getElementById("new-artist-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        const inlineDiv = document.getElementById("new-artist-inline");
        inlineDiv.classList.add("hidden");
        projectArtistSelect.style.display = "";
        projectArtistSelect.value = "";
        document.getElementById("new-artist-name").value = "";
      });
    }
  }
});

// Make functions globally accessible
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.togglePivotSection = togglePivotSection;
window.exportChartCSV = exportChartCSV;
window.exportChartPDF = exportChartPDF;
window.syncToGoogleSheets = syncToGoogleSheets;
window.syncFromGoogleSheets = syncFromGoogleSheets;
window.fullSync = fullSync;
window.openSyncModal = openSyncModal;
window.closeSyncModal = closeSyncModal;
window.copyAppsScriptCode = copyAppsScriptCode;
window.showSetupGuide = showSetupGuide;
window.createNewProject = createNewProject;
window.loadExistingProjects = loadExistingProjects;

// ==========================================
// TUTORIAL SYSTEM
// ==========================================

const tutorialSteps = [
  {
    target: ".header-brand",
    title: "👋 Bem-vinda ao Maktub Expenses!",
    description:
      "Este sistema foi criado especialmente para ti, <strong>Madalena</strong>, para gerir todas as despesas dos artistas da Maktub Art Group. Vou guiar-te pela plataforma!",
    position: "bottom",
  },
  {
    target: '.tab[data-tab="dashboard"]',
    title: "📊 Dashboard",
    description:
      "Aqui tens uma <strong>visão geral</strong> de todas as despesas. Podes ver totais por artista, por tipo de despesa, e filtrar por projeto. É o teu painel de controlo principal!",
    position: "bottom",
  },
  {
    target: '.tab[data-tab="new-expense"]',
    title: "➕ Nova Despesa",
    description:
      "Quando precisares de registar uma despesa (combustível, alojamento, produção, etc.), clica aqui. Podes associar a despesa a um <strong>artista</strong> e <strong>projeto específico</strong> (ex: D.A.M.A - Beja 25 Abril).",
    position: "bottom",
  },
  {
    target: '.tab[data-tab="new-project"]',
    title: "📁 Novo Projeto",
    description:
      'Cada concerto, videoclipe ou evento é um <strong>projeto</strong>. Cria projetos aqui para organizar as despesas. Por exemplo: "Prémios Play", "Festival Académico Lisboa", etc.',
    position: "bottom",
  },
  {
    target: '.tab[data-tab="reports"]',
    title: "📈 Relatórios",
    description:
      "Gera <strong>relatórios detalhados</strong> com gráficos! Podes ver despesas por período, comparar artistas, analisar tipos de gastos. Perfeito para apresentar à equipa.",
    position: "bottom",
  },
  {
    target: '.tab[data-tab="settlement"]',
    title: "💰 Acerto de Contas",
    description:
      "A funcionalidade que pediste! Aqui calculas o <strong>balanço entre Maktub e cada artista</strong>. Mostra quanto a Maktub investiu vs. quanto os terceiros pagaram, por projeto.",
    position: "bottom",
  },
  {
    target: ".sync-btn",
    title: "☁️ Google Sheets Sync",
    description:
      "O mais importante! <strong>Sincroniza tudo para o Google Drive</strong>. Cada artista tem a sua própria spreadsheet com as despesas organizadas por projeto, exatamente como pediste!",
    position: "bottom-left",
  },
  {
    target: ".drive-btn",
    title: "📂 Pasta Google Drive",
    description:
      "Acesso direto à <strong>pasta partilhada no Drive</strong> onde estão todas as spreadsheets dos artistas. Podes partilhar com a equipa ou aceder de qualquer dispositivo!",
    position: "bottom-left",
  },
];

let currentTutorialStep = 0;
let tutorialActive = false;

function startTutorial() {
  tutorialActive = true;
  currentTutorialStep = 0;

  // Make sure we're on the main app screen
  if (appScreen.classList.contains("hidden")) {
    showToast("Faz login primeiro para ver o tutorial", "error");
    return;
  }

  // Show the tutorial overlay
  const overlay = document.getElementById("tutorial-overlay");
  overlay.classList.remove("hidden");

  // Show first step
  showTutorialStep(0);
}

function showTutorialStep(stepIndex) {
  const step = tutorialSteps[stepIndex];
  if (!step) {
    endTutorial();
    return;
  }

  const targetElement = document.querySelector(step.target);
  if (!targetElement) {
    console.warn("Tutorial target not found:", step.target);
    nextTutorialStep();
    return;
  }

  // Update step indicator
  document.querySelector(".tutorial-step-current").textContent = stepIndex + 1;
  document.querySelector(".tutorial-step-total").textContent =
    tutorialSteps.length;

  // Update content
  document.querySelector(".tutorial-title").innerHTML = step.title;
  document.querySelector(".tutorial-description").innerHTML = step.description;

  // Position highlight around target
  const highlight = document.querySelector(".tutorial-highlight");
  const rect = targetElement.getBoundingClientRect();
  const padding = 8;

  highlight.style.top = rect.top - padding + "px";
  highlight.style.left = rect.left - padding + "px";
  highlight.style.width = rect.width + padding * 2 + "px";
  highlight.style.height = rect.height + padding * 2 + "px";

  // Position tooltip
  const tooltip = document.querySelector(".tutorial-tooltip");
  const arrow = document.querySelector(".tutorial-arrow");

  // Remove all arrow classes
  arrow.className = "tutorial-arrow";

  // Calculate tooltip position based on step.position
  const tooltipRect = tooltip.getBoundingClientRect();
  let tooltipTop, tooltipLeft;

  switch (step.position) {
    case "bottom":
      tooltipTop = rect.bottom + 20;
      tooltipLeft = rect.left + rect.width / 2 - 180;
      arrow.classList.add("bottom");
      break;
    case "bottom-left":
      tooltipTop = rect.bottom + 20;
      tooltipLeft = rect.right - 360;
      arrow.classList.add("bottom");
      arrow.style.left = "auto";
      arrow.style.right = "40px";
      arrow.style.marginLeft = "0";
      break;
    case "top":
      tooltipTop = rect.top - tooltipRect.height - 20;
      tooltipLeft = rect.left + rect.width / 2 - 180;
      arrow.classList.add("top");
      break;
    case "left":
      tooltipTop = rect.top + rect.height / 2 - 100;
      tooltipLeft = rect.left - 380;
      arrow.classList.add("left");
      break;
    case "right":
      tooltipTop = rect.top + rect.height / 2 - 100;
      tooltipLeft = rect.right + 20;
      arrow.classList.add("right");
      break;
    default:
      tooltipTop = rect.bottom + 20;
      tooltipLeft = rect.left;
      arrow.classList.add("bottom");
  }

  // Keep tooltip on screen
  tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - 380));
  tooltipTop = Math.max(20, Math.min(tooltipTop, window.innerHeight - 300));

  tooltip.style.top = tooltipTop + "px";
  tooltip.style.left = tooltipLeft + "px";

  // Update button states
  const prevBtn = document.querySelector(".tutorial-btn-prev");
  const nextBtn = document.querySelector(".tutorial-btn-next");

  prevBtn.disabled = stepIndex === 0;
  prevBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";

  if (stepIndex === tutorialSteps.length - 1) {
    nextBtn.textContent = "✓ Concluir";
    nextBtn.classList.add("finish");
  } else {
    nextBtn.textContent = "Próximo →";
    nextBtn.classList.remove("finish");
  }
}

function nextTutorialStep() {
  currentTutorialStep++;
  if (currentTutorialStep >= tutorialSteps.length) {
    endTutorial();
    showToast(
      "🎉 Tutorial concluído! Estás pronta para usar a plataforma.",
      "success",
    );
  } else {
    showTutorialStep(currentTutorialStep);
  }
}

function prevTutorialStep() {
  if (currentTutorialStep > 0) {
    currentTutorialStep--;
    showTutorialStep(currentTutorialStep);
  }
}

function endTutorial() {
  tutorialActive = false;
  const overlay = document.getElementById("tutorial-overlay");
  overlay.classList.add("hidden");

  // Reset arrow positioning
  const arrow = document.querySelector(".tutorial-arrow");
  arrow.style.left = "";
  arrow.style.right = "";
  arrow.style.marginLeft = "";
}

// Make tutorial functions globally accessible
window.startTutorial = startTutorial;
window.nextTutorialStep = nextTutorialStep;
window.prevTutorialStep = prevTutorialStep;
window.endTutorial = endTutorial;
