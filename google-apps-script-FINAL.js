// ============================================
// GOOGLE APPS SCRIPT - MAKTUB EXPENSE SYNC
// ============================================
// CÓDIGO COMPLETO - COPIA TUDO PARA O APPS SCRIPT
// ============================================

// CONFIGURATION - JÁ CONFIGURADO COM OS TEUS IDs!
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

// Column mapping for the main sheet
// Column mappings - internal names and display headers
const MAIN_COLUMNS = ['id', 'date', 'artist', 'project', 'type', 'entity', 'investor', 'amount', 'notes', 'createdAt'];
const MAIN_HEADERS = ['ID', 'DATA', 'ARTISTA', 'PROJETO', 'TIPO', 'ENTIDADE', 'INVESTIDOR', 'VALOR', 'NOTAS', 'CRIADO EM'];

// Type translations
const TYPE_NAMES = {
  combustivel: 'Combustível',
  alimentacao: 'Alimentação - comitivas',
  alojamento: 'Alojamento',
  equipamento: 'Desgaste rápido 23% + Equipamento técnico',
  producao: 'Produção',
  promocao: 'Marketing e Promoção',
  transporte: 'Transporte',
  outros: 'Outros Gastos'
};

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
      case 'getByArtist':
        result = { success: true, expenses: getExpensesByArtist(e.parameter.artist) };
        break;
      case 'getArtists':
        result = { success: true, artists: getArtistsList() };
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
    Logger.log('=== POST REQUEST RECEIVED ===');
    
    // Parse the incoming data
    let data;
    if (e.postData && e.postData.contents) {
      Logger.log('Raw data received, length: ' + e.postData.contents.length);
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
        // Handle expenses array - make sure it exists
        const expenses = data.expenses || [];
        Logger.log('Syncing ' + expenses.length + ' expenses from website');
        result = syncFromWebsite(expenses);
        break;
      case 'syncToWebsite':
        result = { success: true, expenses: getAllExpenses() };
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    Logger.log('Result: ' + JSON.stringify(result));
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// DATA OPERATIONS
// ============================================

function getAllExpenses() {
  try {
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
  } catch (error) {
    Logger.log('Error in getAllExpenses: ' + error.toString());
    return [];
  }
}

function getExpensesByArtist(artist) {
  const all = getAllExpenses();
  return all.filter(e => e.artist === artist);
}

function getArtistsList() {
  return Object.keys(SPREADSHEET_IDS.artists);
}

function addExpense(expense) {
  try {
    // Add to main sheet
    addToMainSheet(expense);
    
    // Add to artist-specific sheet
    if (SPREADSHEET_IDS.artists[expense.artist]) {
      addToArtistSheet(expense);
    }
    
    return { success: true, id: expense.id };
  } catch (error) {
    Logger.log('Error in addExpense: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function addToMainSheet(expense) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  let sheet = ss.getSheetByName('Despesas');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Despesas');
    sheet.appendRow(MAIN_HEADERS);
    // Format header
    sheet.getRange(1, 1, 1, MAIN_HEADERS.length).setFontWeight('bold');
  }
  
  const row = MAIN_COLUMNS.map(col => expense[col] || '');
  sheet.appendRow(row);
}

function addToArtistSheet(expense) {
  const artistSpreadsheetId = SPREADSHEET_IDS.artists[expense.artist];
  if (!artistSpreadsheetId) return;
  
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
    Logger.log('Error adding to artist sheet: ' + e.toString());
  }
}

function updateExpense(expense) {
  try {
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
  } catch (error) {
    Logger.log('Error in updateExpense: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function deleteExpense(id) {
  try {
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
  } catch (error) {
    Logger.log('Error in deleteExpense: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function syncFromWebsite(expenses) {
  Logger.log('=== SYNC FROM WEBSITE STARTED ===');
  Logger.log('Received ' + (expenses ? expenses.length : 0) + ' expenses');
  
  // Validate input
  if (!expenses || !Array.isArray(expenses)) {
    Logger.log('ERROR: expenses is not an array');
    return { success: false, error: 'Invalid expenses data', count: 0 };
  }
  
  if (expenses.length === 0) {
    Logger.log('WARNING: No expenses to sync');
    return { success: true, count: 0, message: 'No expenses to sync' };
  }
  
  try {
    // Open main spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('Despesas');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      Logger.log('Creating Despesas sheet');
      sheet = ss.insertSheet('Despesas');
      sheet.appendRow(MAIN_HEADERS);
      sheet.getRange(1, 1, 1, MAIN_HEADERS.length).setFontWeight('bold');
    } else {
      // Clear ALL data including headers and rewrite
      sheet.clear();
      sheet.appendRow(MAIN_HEADERS);
      sheet.getRange(1, 1, 1, MAIN_HEADERS.length).setFontWeight('bold');
      Logger.log('Sheet cleared and headers rewritten');
    }
    
    // Add all expenses to main sheet
    Logger.log('Adding expenses to main sheet...');
    const rows = [];
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      const row = MAIN_COLUMNS.map(col => expense[col] || '');
      rows.push(row);
    }
    
    // Batch write for performance
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, MAIN_COLUMNS.length).setValues(rows);
    }
    
    Logger.log('Main sheet updated with ' + rows.length + ' rows');
    
    // Update artist sheets
    Logger.log('Updating artist sheets...');
    syncArtistSheets(expenses);
    
    Logger.log('=== SYNC COMPLETED SUCCESSFULLY ===');
    return { success: true, count: expenses.length };
    
  } catch (error) {
    Logger.log('ERROR in syncFromWebsite: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), count: 0 };
  }
}

function syncArtistSheets(expenses) {
  // Group by artist
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = [];
    byArtist[e.artist].push(e);
  });
  
  Logger.log('Grouped into ' + Object.keys(byArtist).length + ' artists');
  
  // Track all project summaries for QG sheet
  const allProjectSummaries = [];
  
  // Update each artist's sheet
  Object.keys(byArtist).forEach(artist => {
    const artistSpreadsheetId = SPREADSHEET_IDS.artists[artist];
    if (!artistSpreadsheetId) {
      Logger.log('No sheet configured for artist: ' + artist);
      return;
    }
    
    try {
      Logger.log('Updating sheet for: ' + artist);
      const ss = SpreadsheetApp.openById(artistSpreadsheetId);
      const artistExpenses = byArtist[artist];
      
      // Group by project
      const byProject = {};
      artistExpenses.forEach(e => {
        const projectName = e.project || 'Gastos Gerais';
        if (!byProject[projectName]) byProject[projectName] = [];
        byProject[projectName].push(e);
      });
      
      // Process each project with Madalena's format
      Object.keys(byProject).forEach(project => {
        const artistShort = artist.replace(/ /g, '').substring(0, 10);
        const sheetName = artistShort + '_' + project.substring(0, 20); // e.g., "DAMA_Beja"
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
        }
        
        // Clear and format like Madalena's Excel
        sheet.clear();
        
        const projectExpenses = byProject[project];
        
        // Separate by investor: Maktub (CUSTOS for artist) vs Outros (PROVEITOS)
        const custos = projectExpenses.filter(e => e.investor === 'maktub');
        const proveitos = projectExpenses.filter(e => e.investor !== 'maktub');
        
        let currentRow = 1;
        
        // === TITLE ROW ===
        sheet.getRange(currentRow, 1).setValue('Resultado ' + artist + ' - ' + project);
        sheet.getRange(currentRow, 1, 1, 4).merge().setFontWeight('bold').setFontSize(12);
        currentRow += 2;
        
        // === PROVEITOS SECTION ===
        sheet.getRange(currentRow, 1).setValue('PROVEITOS');
        sheet.getRange(currentRow, 1).setFontWeight('bold').setBackground('#c6efce');
        currentRow++;
        
        // Proveitos header
        sheet.getRange(currentRow, 1, 1, 4).setValues([['Data', 'Tipo', 'Nome', 'Valor']]);
        sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8e8e8');
        currentRow++;
        
        let totalProveitos = 0;
        if (proveitos.length > 0) {
          proveitos.forEach(e => {
            const amount = Number(e.amount) || 0;
            sheet.getRange(currentRow, 1, 1, 4).setValues([[
              formatDate(e.date),
              TYPE_NAMES[e.type] || e.type || 'Outros',
              e.entity || '',
              amount
            ]]);
            totalProveitos += amount;
            currentRow++;
          });
        } else {
          sheet.getRange(currentRow, 1).setValue('(Sem proveitos registados)');
          sheet.getRange(currentRow, 1).setFontStyle('italic').setFontColor('#888888');
          currentRow++;
        }
        
        // Total Proveitos
        sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL PROVEITOS ***', totalProveitos]]);
        sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#c6efce');
        currentRow += 2;
        
        // === CUSTOS SECTION ===
        sheet.getRange(currentRow, 1).setValue('CUSTOS');
        sheet.getRange(currentRow, 1).setFontWeight('bold').setBackground('#ffc7ce');
        currentRow++;
        
        // Custos header
        sheet.getRange(currentRow, 1, 1, 4).setValues([['Data', 'Tipo', 'Nome', 'Valor']]);
        sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8e8e8');
        currentRow++;
        
        let totalCustos = 0;
        if (custos.length > 0) {
          custos.forEach(e => {
            const amount = Number(e.amount) || 0;
            sheet.getRange(currentRow, 1, 1, 4).setValues([[
              formatDate(e.date),
              TYPE_NAMES[e.type] || e.type || 'Outros',
              e.entity || e.notes || '',
              amount
            ]]);
            totalCustos += amount;
            currentRow++;
          });
        } else {
          sheet.getRange(currentRow, 1).setValue('(Sem custos registados)');
          sheet.getRange(currentRow, 1).setFontStyle('italic').setFontColor('#888888');
          currentRow++;
        }
        
        // Total Custos
        sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL CUSTOS ***', totalCustos]]);
        sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#ffc7ce');
        currentRow += 2;
        
        // === RESULTADO ===
        const resultado = totalProveitos - totalCustos;
        sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', 'RESULTADO', resultado]]);
        sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setFontSize(11);
        if (resultado >= 0) {
          sheet.getRange(currentRow, 4).setFontColor('#006400').setBackground('#c6efce');
        } else {
          sheet.getRange(currentRow, 4).setFontColor('#8b0000').setBackground('#ffc7ce');
        }
        
        // Format value column
        sheet.getRange(1, 4, currentRow, 1).setNumberFormat('#,##0.00 €');
        
        // Auto-resize columns
        sheet.setColumnWidth(1, 100);
        sheet.setColumnWidth(2, 250);
        sheet.setColumnWidth(3, 200);
        sheet.setColumnWidth(4, 120);
        
        // Save summary for QG
        allProjectSummaries.push({
          artist: artist,
          project: project,
          proveitos: totalProveitos,
          custos: totalCustos,
          resultado: resultado
        });
      });
      
      // Create QG (Quadro Geral) summary sheet for this artist
      createArtistQGSheet(ss, artist, allProjectSummaries.filter(s => s.artist === artist));
      
      Logger.log('Updated ' + Object.keys(byProject).length + ' projects for ' + artist);
      
    } catch (e) {
      Logger.log('Error updating artist sheet ' + artist + ': ' + e.toString());
    }
  });
  
  // Create main QG sheet in main spreadsheet
  createMainQGSheet(allProjectSummaries);
}

// Create QG summary sheet for an individual artist (like DAMA_QG)
function createArtistQGSheet(ss, artist, summaries) {
  const artistShort = artist.replace(/ /g, '').substring(0, 10);
  const sheetName = artistShort + '_QG';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  
  let currentRow = 1;
  
  // Title
  sheet.getRange(currentRow, 1).setValue('QUADRO GERAL - ' + artist);
  sheet.getRange(currentRow, 1, 1, 6).merge().setFontWeight('bold').setFontSize(14).setBackground('#4a86e8').setFontColor('#ffffff');
  currentRow += 2;
  
  // Headers
  sheet.getRange(currentRow, 1, 1, 6).setValues([['Projeto', 'Proveitos', 'Custos', 'Resultado', 'Inv. Maktub', 'Balanço Artista']]);
  sheet.getRange(currentRow, 1, 1, 6).setFontWeight('bold').setBackground('#e8e8e8');
  currentRow++;
  
  let totalProveitos = 0, totalCustos = 0, totalResultado = 0;
  
  summaries.forEach(s => {
    sheet.getRange(currentRow, 1, 1, 6).setValues([[
      s.project,
      s.proveitos,
      s.custos,
      s.resultado,
      s.custos, // Invested by Maktub
      s.resultado
    ]]);
    
    // Color code resultado
    if (s.resultado >= 0) {
      sheet.getRange(currentRow, 4).setFontColor('#006400');
      sheet.getRange(currentRow, 6).setFontColor('#006400');
    } else {
      sheet.getRange(currentRow, 4).setFontColor('#8b0000');
      sheet.getRange(currentRow, 6).setFontColor('#8b0000');
    }
    
    totalProveitos += s.proveitos;
    totalCustos += s.custos;
    totalResultado += s.resultado;
    currentRow++;
  });
  
  // Total row
  sheet.getRange(currentRow, 1, 1, 6).setValues([['*** TOTAL ***', totalProveitos, totalCustos, totalResultado, totalCustos, totalResultado]]);
  sheet.getRange(currentRow, 1, 1, 6).setFontWeight('bold').setBackground('#fff2cc');
  
  // Format currency
  sheet.getRange(4, 2, currentRow - 3, 5).setNumberFormat('#,##0.00 €');
  
  // Column widths
  sheet.setColumnWidth(1, 180);
  for (let i = 2; i <= 6; i++) sheet.setColumnWidth(i, 130);
}

// Create main QG sheet with all artists
function createMainQGSheet(allSummaries) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('QG_GERAL');
    if (!sheet) {
      sheet = ss.insertSheet('QG_GERAL');
    }
    sheet.clear();
    
    let currentRow = 1;
    
    // Title
    sheet.getRange(currentRow, 1).setValue('QUADRO GERAL - TODOS OS ARTISTAS');
    sheet.getRange(currentRow, 1, 1, 7).merge().setFontWeight('bold').setFontSize(14).setBackground('#4a86e8').setFontColor('#ffffff');
    currentRow += 2;
    
    // Headers
    sheet.getRange(currentRow, 1, 1, 7).setValues([['Artista', 'Projeto', 'Proveitos', 'Custos', 'Resultado', 'Inv. Maktub', 'Balanço']]);
    sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#e8e8e8');
    currentRow++;
    
    // Group by artist for subtotals
    const byArtist = {};
    allSummaries.forEach(s => {
      if (!byArtist[s.artist]) byArtist[s.artist] = [];
      byArtist[s.artist].push(s);
    });
    
    let grandTotalProveitos = 0, grandTotalCustos = 0, grandTotalResultado = 0;
    
    Object.keys(byArtist).sort().forEach(artist => {
      const artistSummaries = byArtist[artist];
      let artistProveitos = 0, artistCustos = 0, artistResultado = 0;
      
      artistSummaries.forEach(s => {
        sheet.getRange(currentRow, 1, 1, 7).setValues([[
          artist,
          s.project,
          s.proveitos,
          s.custos,
          s.resultado,
          s.custos,
          s.resultado
        ]]);
        
        if (s.resultado >= 0) {
          sheet.getRange(currentRow, 5).setFontColor('#006400');
          sheet.getRange(currentRow, 7).setFontColor('#006400');
        } else {
          sheet.getRange(currentRow, 5).setFontColor('#8b0000');
          sheet.getRange(currentRow, 7).setFontColor('#8b0000');
        }
        
        artistProveitos += s.proveitos;
        artistCustos += s.custos;
        artistResultado += s.resultado;
        currentRow++;
      });
      
      // Artist subtotal
      sheet.getRange(currentRow, 1, 1, 7).setValues([['Subtotal ' + artist, '', artistProveitos, artistCustos, artistResultado, artistCustos, artistResultado]]);
      sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#e8f4f8').setFontStyle('italic');
      currentRow++;
      
      grandTotalProveitos += artistProveitos;
      grandTotalCustos += artistCustos;
      grandTotalResultado += artistResultado;
    });
    
    // Grand total
    currentRow++;
    sheet.getRange(currentRow, 1, 1, 7).setValues([['*** TOTAL GERAL ***', '', grandTotalProveitos, grandTotalCustos, grandTotalResultado, grandTotalCustos, grandTotalResultado]]);
    sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#fff2cc').setFontSize(11);
    
    // Format currency
    sheet.getRange(4, 3, currentRow - 3, 5).setNumberFormat('#,##0.00 €');
    
    // Column widths
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 150);
    for (let i = 3; i <= 7; i++) sheet.setColumnWidth(i, 110);
    
    Logger.log('Created main QG sheet');
    
  } catch (e) {
    Logger.log('Error creating main QG sheet: ' + e.toString());
  }
}

// Format date for display (DD/MM/YYYY)
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return day + '/' + month + '/' + year;
  } catch (e) {
    return dateStr;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTypeName(type) {
  return TYPE_NAMES[type] || type || 'Outros';
}

// ============================================
// GOOGLE SHEETS MENU & SYNC BUTTON
// ============================================

function onOpen() {
  createSyncMenu();
}

function createSyncMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 Maktub Sync')
      .addItem('📤 Sincronizar para Website', 'syncToWebsiteUI')
      .addItem('📥 Importar do Website', 'syncFromWebsiteUI')
      .addSeparator()
      .addItem('📊 Criar Resumo', 'createSummary')
      .addToUi();
  } catch (e) {
    Logger.log('Could not create menu: ' + e.toString());
  }
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
    expenses.length + ' despesas prontas para sincronizar.\n\nAbra o website e clique em "Sincronizar do Sheets" para completar.',
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
    const amount = Number(e.amount) || 0;
    if (e.investor === 'maktub') byArtist[e.artist].maktub += amount;
    else byArtist[e.artist].outros += amount;
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

// ============================================
// TEST FUNCTION - Run this to test
// ============================================

function testSync() {
  // Test with sample data
  const testExpenses = [
    {
      id: 'test_1',
      date: '2026-01-28',
      artist: 'MAR',
      project: 'Teste',
      type: 'producao',
      entity: 'Teste Entity',
      investor: 'maktub',
      amount: 100,
      notes: 'Teste',
      createdAt: new Date().toISOString()
    }
  ];
  
  const result = syncFromWebsite(testExpenses);
  Logger.log('Test result: ' + JSON.stringify(result));
}
