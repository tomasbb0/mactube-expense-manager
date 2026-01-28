// ============================================
// GOOGLE APPS SCRIPT - MAKTUB SYNC (APENAS SYNC)
// ============================================
// Este código FAZ APENAS o sync de dados.
// NÃO elimina Sheet1, NÃO cria dashboards.
// Para setup inicial, usa o ficheiro SETUP.gs
// ============================================

// CONFIGURATION
const SPREADSHEET_IDS = {
  main: '1O8uOe3q8J6rHifQTJim0ZYjg0N7m1mO7ocUVzUdVfN8',
  artists: {
    'Bandidos do Cante': '1YAb_pfCrkwtakYTsIUjIQjN0NAyWCOyGPmB4TLttZsk',
    'Buba Espinho': '1JarYr6SGdwI7s3oJ9qP7Q6LguK-fftMWLHpgkArUYKw',
    'MAR': '1NlqDQ7QNmrUuJiQRbhtK2OCm5VklTEw7POUmbv21Hvc',
    'D.A.M.A': '1_Iy9LaYzehG6H-UfNfp2BjpnHCZxbtewt_faJss2Hq8',
    'BRUCE': '10Wd4ZcBFHTHaBlwpoZU7UbzboxwRl3B9fqjXQ4ubUjk',
    'LUTZ': '1sNk_G7WTzogOk7hbKErmzWeRQZIlIQANyb4M7-88n-c',
    'INÊS': '1pkS0xoxJUjunD0DLHDwaJ8FM74pJcLN6jcOHHOetpQw',
    'REAL GUNS': '1CP0zTkLTCP1xs6gYcpqvaP4rNBXyNip-0yEX1pp_ZXo',
    'SUAVE': '1FLSpGAOPggvNiIXzsenoEglAy5ooyTTlwo0UEghCm4k',
    'Gerais Maktub': '1vW3_q1urRCtkGqjBlah-UiU1WLHKSclZoxq4gGKPKxw'
  }
};

const MADALENA_CATEGORIES = ['Promoção', 'Tour', 'Concerto', 'Videoclipe', 'Geral', 'Gravação'];
const DATA_COLUMNS = ['ID', 'Data', 'Artista', 'Projeto', 'Tipo', 'Entidade', 'Investidor', 'Valor', 'Notas', 'CriadoEm'];

// ============================================
// WEB APP HANDLERS
// ============================================

function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : 'getAll';
    let result;
    
    switch(action) {
      case 'getAll':
      case 'getAllExpenses':
        result = { success: true, expenses: getAllExpenses() };
        break;
      case 'getArtists':
        result = { success: true, artists: Object.keys(SPREADSHEET_IDS.artists) };
        break;
      default:
        result = { success: true, expenses: getAllExpenses() };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    Logger.log('=== POST REQUEST ===');
    
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error('No data received');
    }
    
    const action = data.action;
    Logger.log('Action: ' + action);
    
    let result;
    
    switch(action) {
      case 'add':
        result = addExpense(data.expense);
        break;
      case 'update':
        result = updateExpense(data.expense);
        break;
      case 'delete':
        result = deleteExpense(data.id);
        break;
      case 'syncFromWebsite':
        result = syncFromWebsite(data.expenses || []);
        break;
      case 'syncToWebsite':
        result = { success: true, expenses: getAllExpenses() };
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// SYNC FROM WEBSITE (DADOS APENAS!)
// ============================================
// NÃO toca nos dashboards (têm fórmulas)
// NÃO elimina Sheet1 (isso é setup)

function syncFromWebsite(expenses) {
  Logger.log('=== SYNCING ' + expenses.length + ' EXPENSES ===');
  
  if (!expenses || expenses.length === 0) {
    return { success: true, message: 'No expenses to sync' };
  }
  
  try {
    // 1. Update main spreadsheet
    updateMainSpreadsheet(expenses);
    
    // 2. Group by artist and update each
    const byArtist = groupByArtist(expenses);
    Object.keys(byArtist).forEach(artist => {
      if (SPREADSHEET_IDS.artists[artist]) {
        updateArtistSpreadsheet(artist, byArtist[artist]);
      }
    });
    
    Logger.log('=== SYNC COMPLETE ===');
    return {
      success: true,
      message: `Synced ${expenses.length} expenses`,
      artistCount: Object.keys(byArtist).length
    };
    
  } catch (error) {
    Logger.log('Sync error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function updateMainSpreadsheet(expenses) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  
  // Get or create data sheet (NOT dashboard)
  let dataSheet = ss.getSheetByName('Todas as Despesas');
  if (!dataSheet) {
    dataSheet = ss.insertSheet('Todas as Despesas');
    setupDataSheetHeaders(dataSheet);
  }
  
  // Clear existing data (keep header)
  const lastRow = dataSheet.getLastRow();
  if (lastRow > 1) {
    dataSheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).clearContent();
  }
  
  // Write all expenses
  if (expenses.length > 0) {
    const data = expenses.map(exp => [
      exp.id || '',
      formatDateForSheet(exp.date),
      exp.artist || '',
      exp.project || '',
      exp.type || '',
      exp.entity || '',
      exp.investor || '',
      Number(exp.amount) || 0, // ENSURE it's a number!
      exp.notes || '',
      exp.createdAt || ''
    ]);
    
    dataSheet.getRange(2, 1, data.length, DATA_COLUMNS.length).setValues(data);
    
    // Format the Valor column as number (column H = 8)
    dataSheet.getRange(2, 8, data.length, 1).setNumberFormat('#,##0.00');
  }
  
  Logger.log('Main spreadsheet updated with ' + expenses.length + ' expenses');
}

function updateArtistSpreadsheet(artistName, expenses) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.artists[artistName]);
  
  // Group by category (project field, not type!)
  const byCategory = {};
  expenses.forEach(exp => {
    // Use project as category - map to one of our categories
    const projectLower = (exp.project || '').toLowerCase();
    let cat = 'Geral'; // default
    
    MADALENA_CATEGORIES.forEach(c => {
      if (projectLower.includes(c.toLowerCase())) {
        cat = c;
      }
    });
    
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(exp);
  });
  
  // Update each category sheet
  MADALENA_CATEGORIES.forEach(category => {
    let sheet = ss.getSheetByName(category);
    
    // CREATE sheet if it doesn't exist (don't skip!)
    if (!sheet) {
      Logger.log('Creating sheet "' + category + '" in ' + artistName);
      sheet = ss.insertSheet(category);
      setupDataSheetHeaders(sheet);
      
      // Set tab color
      const categoryColors = {
        'Promoção': '#e74c3c',
        'Tour': '#3498db',
        'Concerto': '#9b59b6',
        'Videoclipe': '#e67e22',
        'Geral': '#1abc9c',
        'Gravação': '#f39c12'
      };
      sheet.setTabColor(categoryColors[category] || '#1db954');
    }
    
    // Clear existing data (keep header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).clearContent();
    }
    
    // Write category expenses
    const catExpenses = byCategory[category] || [];
    if (catExpenses.length > 0) {
      const data = catExpenses.map(exp => [
        exp.id || '',
        formatDateForSheet(exp.date),
        exp.artist || '',
        exp.project || '',
        exp.type || '',
        exp.entity || '',
        exp.investor || '',
        Number(exp.amount) || 0, // ENSURE it's a number!
        exp.notes || '',
        exp.createdAt || ''
      ]);
      
      sheet.getRange(2, 1, data.length, DATA_COLUMNS.length).setValues(data);
      
      // Format the Valor column as number (column H = 8)
      sheet.getRange(2, 8, data.length, 1).setNumberFormat('#,##0.00');
    }
  });
  
  Logger.log(artistName + ' updated with ' + expenses.length + ' expenses in ' + Object.keys(byCategory).length + ' categories');
}

// Helper to format date consistently
function formatDateForSheet(dateStr) {
  if (!dateStr) return '';
  // If already in dd/mm/yyyy format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // If in yyyy-mm-dd format, convert
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return dateStr;
}

// ============================================
// GET ALL EXPENSES
// ============================================

function getAllExpenses() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    const sheet = ss.getSheetByName('Todas as Despesas');
    
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const data = sheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).getValues();
    
    return data.map(row => ({
      id: row[0],
      date: row[1],
      artist: row[2],
      project: row[3],
      type: row[4],
      entity: row[5],
      investor: row[6],
      amount: row[7],
      notes: row[8],
      createdAt: row[9]
    })).filter(exp => exp.id);
    
  } catch (error) {
    Logger.log('Error getting expenses: ' + error.toString());
    return [];
  }
}

// ============================================
// SINGLE EXPENSE OPERATIONS
// ============================================

function addExpense(expense) {
  if (!expense) {
    return { success: false, error: 'No expense data' };
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('Todas as Despesas');
    
    if (!sheet) {
      sheet = ss.insertSheet('Todas as Despesas');
      setupDataSheetHeaders(sheet);
    }
    
    const row = [
      expense.id || generateId(),
      expense.date || '',
      expense.artist || '',
      expense.project || '',
      expense.type || '',
      expense.entity || '',
      expense.investor || '',
      parseFloat(expense.amount) || 0,
      expense.notes || '',
      expense.createdAt || new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    // Also add to artist sheet if applicable
    if (expense.artist && SPREADSHEET_IDS.artists[expense.artist]) {
      addToArtistSheet(expense);
    }
    
    return { success: true, id: row[0] };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function addToArtistSheet(expense) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.artists[expense.artist]);
    const category = expense.type || 'Geral';
    let sheet = ss.getSheetByName(category);
    
    if (!sheet) return;
    
    const row = [
      expense.id || '',
      expense.date || '',
      expense.artist || '',
      expense.project || '',
      expense.type || '',
      expense.entity || '',
      expense.investor || '',
      parseFloat(expense.amount) || 0,
      expense.notes || '',
      expense.createdAt || ''
    ];
    
    sheet.appendRow(row);
  } catch (e) {
    Logger.log('Error adding to artist sheet: ' + e.toString());
  }
}

function updateExpense(expense) {
  if (!expense || !expense.id) {
    return { success: false, error: 'No expense ID' };
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    const sheet = ss.getSheetByName('Todas as Despesas');
    
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === expense.id) {
        const row = [
          expense.id,
          expense.date || '',
          expense.artist || '',
          expense.project || '',
          expense.type || '',
          expense.entity || '',
          expense.investor || '',
          parseFloat(expense.amount) || 0,
          expense.notes || '',
          expense.createdAt || ''
        ];
        
        sheet.getRange(i + 1, 1, 1, DATA_COLUMNS.length).setValues([row]);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Expense not found' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteExpense(id) {
  if (!id) {
    return { success: false, error: 'No expense ID' };
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    const sheet = ss.getSheetByName('Todas as Despesas');
    
    if (!sheet) return { success: false, error: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Expense not found' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function groupByArtist(expenses) {
  const result = {};
  expenses.forEach(exp => {
    const artist = exp.artist || 'Gerais Maktub';
    if (!result[artist]) result[artist] = [];
    result[artist].push(exp);
  });
  return result;
}

function setupDataSheetHeaders(sheet) {
  sheet.getRange(1, 1, 1, DATA_COLUMNS.length).setValues([DATA_COLUMNS]);
  sheet.getRange(1, 1, 1, DATA_COLUMNS.length)
    .setBackground('#1a1a2e')
    .setFontColor('#1db954')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // ID
  sheet.setColumnWidth(2, 100);  // Data
  sheet.setColumnWidth(3, 150);  // Artista
  sheet.setColumnWidth(4, 150);  // Projeto
  sheet.setColumnWidth(5, 100);  // Tipo
  sheet.setColumnWidth(6, 150);  // Entidade
  sheet.setColumnWidth(7, 100);  // Investidor
  sheet.setColumnWidth(8, 100);  // Valor
  sheet.setColumnWidth(9, 200);  // Notas
  sheet.setColumnWidth(10, 150); // CriadoEm
}

function generateId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// MENU (OPTIONAL)
// ============================================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 Maktub Sync')
      .addItem('📊 Ver Despesas', 'showExpenseCount')
      .addToUi();
  } catch (e) {
    // Menu not available (running as web app)
  }
}

function showExpenseCount() {
  const expenses = getAllExpenses();
  SpreadsheetApp.getUi().alert('Total de despesas: ' + expenses.length);
}
