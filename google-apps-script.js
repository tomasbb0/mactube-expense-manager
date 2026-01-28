// ============================================
// GOOGLE APPS SCRIPT - MAKTUB EXPENSE SYNC
// ============================================
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com/
// 2. Create a new project called "Maktub Expense Sync"
// 3. Copy this entire code into the script editor
// 4. Update the SPREADSHEET_IDS object below with your actual Google Sheet IDs
// 5. Click Deploy > New deployment > Web app
// 6. Set "Execute as" to "Me" and "Who has access" to "Anyone"
// 7. Copy the Web App URL and paste it in your app.js GOOGLE_SCRIPT_URL constant
// 8. Run the createSyncMenu() function once to add sync button to sheets
//
// ============================================

// CONFIGURATION - Update these with your actual spreadsheet IDs
// You can find the ID in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_IDS = {
  main: 'YOUR_MAIN_SPREADSHEET_ID', // Main consolidated sheet
  artists: {
    'Bandidos do Cante': 'BANDIDOS_SPREADSHEET_ID',
    'Buba Espinho': 'BUBA_SPREADSHEET_ID', 
    'MAR': 'MAR_SPREADSHEET_ID',
    'D.A.M.A': 'DAMA_SPREADSHEET_ID',
    'BRUCE': 'BRUCE_SPREADSHEET_ID',
    'LUTZ': 'LUTZ_SPREADSHEET_ID',
    'INÊS': 'INES_SPREADSHEET_ID',
    'REAL GUNS': 'REAL_GUNS_SPREADSHEET_ID',
    'SUAVE': 'SUAVE_SPREADSHEET_ID',
    'Gerais Maktub': 'GERAIS_MAKTUB_SPREADSHEET_ID'
  }
};

// Column mapping for the main sheet
const MAIN_COLUMNS = ['id', 'date', 'artist', 'project', 'type', 'entity', 'investor', 'amount', 'notes', 'createdAt'];

// ============================================
// WEB APP HANDLERS
// ============================================

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'getAll':
        result = getAllExpenses();
        break;
      case 'getByArtist':
        result = getExpensesByArtist(e.parameter.artist);
        break;
      case 'getArtists':
        result = getArtistsList();
        break;
      default:
        result = { error: 'Unknown action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
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
        result = syncFromWebsite(data.expenses);
        break;
      case 'syncToWebsite':
        result = getAllExpenses();
        break;
      default:
        result = { error: 'Unknown action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// DATA OPERATIONS
// ============================================

function getAllExpenses() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  const sheet = ss.getSheetByName('Despesas') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return []; // Only header or empty
  
  const headers = data[0];
  const expenses = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const expense = {};
    headers.forEach((header, index) => {
      let value = row[index];
      // Format date
      if (header === 'date' || header === 'createdAt') {
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
      }
      expense[header] = value;
    });
    expenses.push(expense);
  }
  
  return expenses;
}

function getExpensesByArtist(artist) {
  const all = getAllExpenses();
  return all.filter(e => e.artist === artist);
}

function getArtistsList() {
  return Object.keys(SPREADSHEET_IDS.artists);
}

function addExpense(expense) {
  // Add to main sheet
  addToMainSheet(expense);
  
  // Add to artist-specific sheet
  if (SPREADSHEET_IDS.artists[expense.artist]) {
    addToArtistSheet(expense);
  }
  
  return { success: true, id: expense.id };
}

function addToMainSheet(expense) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  let sheet = ss.getSheetByName('Despesas');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Despesas');
    sheet.appendRow(MAIN_COLUMNS);
    // Format header
    sheet.getRange(1, 1, 1, MAIN_COLUMNS.length).setFontWeight('bold');
  }
  
  const row = MAIN_COLUMNS.map(col => expense[col] || '');
  sheet.appendRow(row);
}

function addToArtistSheet(expense) {
  const artistSpreadsheetId = SPREADSHEET_IDS.artists[expense.artist];
  if (!artistSpreadsheetId || artistSpreadsheetId.includes('_ID')) return; // Skip if not configured
  
  try {
    const ss = SpreadsheetApp.openById(artistSpreadsheetId);
    
    // Find or create project sheet
    let sheet = ss.getSheetByName(expense.project);
    if (!sheet) {
      sheet = ss.insertSheet(expense.project);
      sheet.appendRow(['TIPO', 'VALOR', 'DATA', 'ENTIDADE', 'INVESTIDOR', 'NOTAS', 'ID']);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    
    sheet.appendRow([
      getTypeName(expense.type),
      expense.amount,
      expense.date,
      expense.entity || '',
      expense.investor === 'maktub' ? 'Maktub' : 'Terceiros',
      expense.notes || '',
      expense.id
    ]);
    
  } catch (e) {
    console.error('Error adding to artist sheet:', e);
  }
}

function updateExpense(expense) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  const sheet = ss.getSheetByName('Despesas') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === expense.id) {
      const row = MAIN_COLUMNS.map(col => expense[col] || '');
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      break;
    }
  }
  
  return { success: true };
}

function deleteExpense(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  const sheet = ss.getSheetByName('Despesas') || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  
  return { success: true };
}

function syncFromWebsite(expenses) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  let sheet = ss.getSheetByName('Despesas');
  
  // Clear existing data (keep header)
  if (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  } else {
    sheet = ss.insertSheet('Despesas');
    sheet.appendRow(MAIN_COLUMNS);
    sheet.getRange(1, 1, 1, MAIN_COLUMNS.length).setFontWeight('bold');
  }
  
  // Add all expenses
  expenses.forEach(expense => {
    const row = MAIN_COLUMNS.map(col => expense[col] || '');
    sheet.appendRow(row);
  });
  
  // Update artist sheets
  syncArtistSheets(expenses);
  
  return { success: true, count: expenses.length };
}

function syncArtistSheets(expenses) {
  // Group by artist
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = [];
    byArtist[e.artist].push(e);
  });
  
  // Update each artist's sheet
  Object.keys(byArtist).forEach(artist => {
    const artistSpreadsheetId = SPREADSHEET_IDS.artists[artist];
    if (!artistSpreadsheetId || artistSpreadsheetId.includes('_ID')) return;
    
    try {
      const ss = SpreadsheetApp.openById(artistSpreadsheetId);
      const artistExpenses = byArtist[artist];
      
      // Group by project
      const byProject = {};
      artistExpenses.forEach(e => {
        if (!byProject[e.project]) byProject[e.project] = [];
        byProject[e.project].push(e);
      });
      
      // Update each project sheet
      Object.keys(byProject).forEach(project => {
        let sheet = ss.getSheetByName(project);
        if (!sheet) {
          sheet = ss.insertSheet(project);
        }
        
        // Clear and rewrite
        sheet.clear();
        sheet.appendRow(['TIPO', 'VALOR', 'DATA', 'ENTIDADE', 'INVESTIDOR', 'NOTAS', 'ID']);
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
        
        byProject[project].forEach(expense => {
          sheet.appendRow([
            getTypeName(expense.type),
            expense.amount,
            expense.date,
            expense.entity || '',
            expense.investor === 'maktub' ? 'Maktub' : 'Terceiros',
            expense.notes || '',
            expense.id
          ]);
        });
        
        // Add total row
        const lastRow = sheet.getLastRow();
        sheet.appendRow(['', '', '', '', '', 'TOTAL:', `=SUM(B2:B${lastRow})`]);
        sheet.getRange(lastRow + 1, 6, 1, 2).setFontWeight('bold');
      });
      
    } catch (e) {
      console.error('Error syncing artist sheet:', artist, e);
    }
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

// ============================================
// GOOGLE SHEETS MENU & SYNC BUTTON
// ============================================

function onOpen() {
  createSyncMenu();
}

function createSyncMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Maktub Sync')
    .addItem('📤 Sincronizar para Website', 'syncToWebsiteUI')
    .addItem('📥 Importar do Website', 'syncFromWebsiteUI')
    .addSeparator()
    .addItem('📊 Criar Resumo', 'createSummary')
    .addToUi();
}

function syncToWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  const expenses = getAllExpenses();
  
  // Store in Properties for the website to fetch
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastSync', JSON.stringify({
    timestamp: new Date().toISOString(),
    expenses: expenses
  }));
  
  ui.alert(
    '✅ Sincronização Preparada',
    `${expenses.length} despesas prontas para sincronizar.\n\nAbra o website e clique em "Sincronizar do Sheets" para completar.`,
    ui.ButtonSet.OK
  );
}

function syncFromWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'ℹ️ Importar do Website',
    'Para importar dados do website:\n\n1. Abra o website Maktub\n2. Clique em "Sincronizar para Sheets"\n3. Os dados serão atualizados automaticamente',
    ui.ButtonSet.OK
  );
}

function createSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let summarySheet = ss.getSheetByName('RESUMO');
  
  if (!summarySheet) {
    summarySheet = ss.insertSheet('RESUMO');
  } else {
    summarySheet.clear();
  }
  
  const expenses = getAllExpenses();
  
  // Summary by Artist
  summarySheet.appendRow(['RESUMO POR ARTISTA']);
  summarySheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  summarySheet.appendRow(['Artista', 'Maktub', 'Terceiros', 'Total']);
  summarySheet.getRange(2, 1, 1, 4).setFontWeight('bold');
  
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = { maktub: 0, outros: 0 };
    if (e.investor === 'maktub') byArtist[e.artist].maktub += Number(e.amount);
    else byArtist[e.artist].outros += Number(e.amount);
  });
  
  let totalMaktub = 0, totalOutros = 0;
  Object.keys(byArtist).sort().forEach(artist => {
    const data = byArtist[artist];
    summarySheet.appendRow([artist, data.maktub, data.outros, data.maktub + data.outros]);
    totalMaktub += data.maktub;
    totalOutros += data.outros;
  });
  
  summarySheet.appendRow(['TOTAL', totalMaktub, totalOutros, totalMaktub + totalOutros]);
  const lastRow = summarySheet.getLastRow();
  summarySheet.getRange(lastRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8f5e9');
  
  // Format currency columns
  const dataRange = summarySheet.getRange(3, 2, lastRow - 2, 3);
  dataRange.setNumberFormat('#,##0.00 €');
  
  SpreadsheetApp.getUi().alert('✅ Resumo criado na folha "RESUMO"');
}
