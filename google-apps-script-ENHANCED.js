// ============================================
// GOOGLE APPS SCRIPT - MAKTUB EXPENSE SYNC
// ============================================
// VERSÃO ENHANCED - COM GRÁFICOS E ANALYTICS
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

// Real Project Categories (matching Madalena's format)
const PROJECT_CATEGORIES = {
  concerts: ['Beja 25 Abril', 'Festival Académico Lisboa', 'Salvaterra de Magos', 'Prémios Play', 'Benedita', 'Alvarães', 'Marinha Grande', 'Leiria', 'Coimbra', 'Porto', 'Faro'],
  special: ['Videoclipe', 'Gravação Estúdio', 'Sessão Fotográfica'],
  general: ['Styling', 'Promoção', 'Gastos Gerais']
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
      case 'getProjects':
        result = { success: true, projects: PROJECT_CATEGORIES };
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
    
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const expenses = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      
      const expense = {};
      headers.forEach((header, index) => {
        let value = row[index];
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
    addToMainSheet(expense);
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
  
  if (!sheet) {
    sheet = ss.insertSheet('Despesas');
    sheet.appendRow(MAIN_HEADERS);
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

// ============================================
// MAIN SYNC FUNCTION
// ============================================

function syncFromWebsite(expenses) {
  Logger.log('=== SYNC FROM WEBSITE STARTED ===');
  Logger.log('Received ' + (expenses ? expenses.length : 0) + ' expenses');
  
  if (!expenses || !Array.isArray(expenses)) {
    Logger.log('ERROR: expenses is not an array');
    return { success: false, error: 'Invalid expenses data', count: 0 };
  }
  
  if (expenses.length === 0) {
    Logger.log('WARNING: No expenses to sync');
    return { success: true, count: 0, message: 'No expenses to sync' };
  }
  
  try {
    // === 1. UPDATE MAIN DESPESAS SHEET ===
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('Despesas');
    
    if (!sheet) {
      Logger.log('Creating Despesas sheet');
      sheet = ss.insertSheet('Despesas');
    } else {
      sheet.clear();
    }
    
    // Write headers
    sheet.appendRow(MAIN_HEADERS);
    sheet.getRange(1, 1, 1, MAIN_HEADERS.length).setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff');
    
    // Write all data in batch
    const rows = expenses.map(e => MAIN_COLUMNS.map(col => e[col] || ''));
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, MAIN_COLUMNS.length).setValues(rows);
    }
    
    Logger.log('Main sheet updated with ' + rows.length + ' rows');
    
    // === 2. UPDATE ARTIST SHEETS ===
    Logger.log('Updating artist sheets...');
    const allProjectSummaries = syncArtistSheets(expenses);
    
    // === 3. CREATE MAIN DASHBOARD WITH ANALYTICS ===
    Logger.log('Creating main dashboard...');
    createMainDashboard(ss, expenses, allProjectSummaries);
    
    Logger.log('=== SYNC COMPLETED SUCCESSFULLY ===');
    return { success: true, count: expenses.length };
    
  } catch (error) {
    Logger.log('ERROR in syncFromWebsite: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), count: 0 };
  }
}

// ============================================
// ARTIST SHEETS SYNC
// ============================================

function syncArtistSheets(expenses) {
  // Group by artist
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = [];
    byArtist[e.artist].push(e);
  });
  
  Logger.log('Grouped into ' + Object.keys(byArtist).length + ' artists');
  
  const allProjectSummaries = [];
  
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
        const sheetName = artistShort + '_' + project.substring(0, 20);
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
        }
        
        // Create project sheet with PROVEITOS/CUSTOS/RESULTADO format
        const summary = createProjectSheet(sheet, artist, project, byProject[project]);
        summary.artist = artist;
        summary.sheetName = sheetName;
        allProjectSummaries.push(summary);
      });
      
      // Create QG summary sheet for this artist
      createArtistQGSheet(ss, artist, allProjectSummaries.filter(s => s.artist === artist));
      
      Logger.log('Updated ' + Object.keys(byProject).length + ' projects for ' + artist);
      
    } catch (e) {
      Logger.log('Error updating artist sheet ' + artist + ': ' + e.toString());
    }
  });
  
  return allProjectSummaries;
}

// Create individual project sheet with Madalena's format
function createProjectSheet(sheet, artist, project, expenses) {
  sheet.clear();
  
  const custos = expenses.filter(e => e.investor === 'maktub');
  const proveitos = expenses.filter(e => e.investor !== 'maktub');
  
  let currentRow = 1;
  
  // === TITLE ===
  sheet.getRange(currentRow, 1).setValue('Resultado ' + artist + ' - ' + project);
  sheet.getRange(currentRow, 1, 1, 4).merge().setFontWeight('bold').setFontSize(12);
  currentRow += 2;
  
  // === PROVEITOS SECTION ===
  sheet.getRange(currentRow, 1).setValue('PROVEITOS');
  sheet.getRange(currentRow, 1).setFontWeight('bold').setBackground('#c6efce');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 4).setValues([['Data', 'Tipo', 'Nome', 'Valor']]);
  sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8e8e8');
  const proveitosDataStartRow = currentRow + 1;
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
  const proveitosDataEndRow = currentRow - 1;
  
  // Total Proveitos with formula
  const proveitosRow = currentRow;
  if (proveitos.length > 0) {
    sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL PROVEITOS ***', '=SUM(D' + proveitosDataStartRow + ':D' + proveitosDataEndRow + ')']]);
  } else {
    sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL PROVEITOS ***', 0]]);
  }
  sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#c6efce');
  currentRow += 2;
  
  // === CUSTOS SECTION ===
  sheet.getRange(currentRow, 1).setValue('CUSTOS');
  sheet.getRange(currentRow, 1).setFontWeight('bold').setBackground('#ffc7ce');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 4).setValues([['Data', 'Tipo', 'Nome', 'Valor']]);
  sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#e8e8e8');
  const custosDataStartRow = currentRow + 1;
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
  const custosDataEndRow = currentRow - 1;
  
  // Total Custos with formula
  const custosRow = currentRow;
  if (custos.length > 0) {
    sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL CUSTOS ***', '=SUM(D' + custosDataStartRow + ':D' + custosDataEndRow + ')']]);
  } else {
    sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', '*** TOTAL CUSTOS ***', 0]]);
  }
  sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setBackground('#ffc7ce');
  currentRow += 2;
  
  // === RESULTADO ===
  const resultadoRow = currentRow;
  sheet.getRange(currentRow, 1, 1, 4).setValues([['', '', 'RESULTADO', '=D' + proveitosRow + '-D' + custosRow]]);
  sheet.getRange(currentRow, 1, 1, 4).setFontWeight('bold').setFontSize(11);
  
  // Conditional formatting
  const resultadoCell = sheet.getRange(currentRow, 4);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(0)
    .setBackground('#c6efce').setFontColor('#006400')
    .setRanges([resultadoCell]).build();
  const rule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground('#ffc7ce').setFontColor('#8b0000')
    .setRanges([resultadoCell]).build();
  sheet.setConditionalFormatRules([rule, rule2]);
  
  // Format currency
  sheet.getRange(1, 4, currentRow, 1).setNumberFormat('#,##0.00 €');
  
  // Column widths
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 120);
  
  return {
    project: project,
    proveitosRow: proveitosRow,
    custosRow: custosRow,
    resultadoRow: resultadoRow,
    proveitos: totalProveitos,
    custos: totalCustos,
    resultado: totalProveitos - totalCustos
  };
}

// Create QG summary for an artist with formulas
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
  const dataStartRow = currentRow + 1;
  currentRow++;
  
  // Add each project with formulas
  summaries.forEach(s => {
    const projectSheetName = "'" + s.sheetName + "'";
    sheet.getRange(currentRow, 1, 1, 6).setValues([[
      s.project,
      '=' + projectSheetName + '!D' + s.proveitosRow,
      '=' + projectSheetName + '!D' + s.custosRow,
      '=' + projectSheetName + '!D' + s.resultadoRow,
      '=' + projectSheetName + '!D' + s.custosRow,
      '=' + projectSheetName + '!D' + s.resultadoRow
    ]]);
    currentRow++;
  });
  
  const dataEndRow = currentRow - 1;
  
  // Total row
  sheet.getRange(currentRow, 1, 1, 6).setValues([[
    '*** TOTAL ***',
    '=SUM(B' + dataStartRow + ':B' + dataEndRow + ')',
    '=SUM(C' + dataStartRow + ':C' + dataEndRow + ')',
    '=SUM(D' + dataStartRow + ':D' + dataEndRow + ')',
    '=SUM(E' + dataStartRow + ':E' + dataEndRow + ')',
    '=SUM(F' + dataStartRow + ':F' + dataEndRow + ')'
  ]]);
  sheet.getRange(currentRow, 1, 1, 6).setFontWeight('bold').setBackground('#fff2cc');
  
  // Format currency
  sheet.getRange(dataStartRow, 2, currentRow - dataStartRow + 1, 5).setNumberFormat('#,##0.00 €');
  
  // Conditional formatting
  const resultadoRange = sheet.getRange(dataStartRow, 4, currentRow - dataStartRow + 1, 1);
  const balancoRange = sheet.getRange(dataStartRow, 6, currentRow - dataStartRow + 1, 1);
  
  const rulePositive = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(0).setFontColor('#006400')
    .setRanges([resultadoRange, balancoRange]).build();
  const ruleNegative = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor('#8b0000')
    .setRanges([resultadoRange, balancoRange]).build();
  sheet.setConditionalFormatRules([rulePositive, ruleNegative]);
  
  // Column widths
  sheet.setColumnWidth(1, 180);
  for (let i = 2; i <= 6; i++) sheet.setColumnWidth(i, 130);
}

// ============================================
// MAIN DASHBOARD WITH ANALYTICS & CHARTS
// ============================================

function createMainDashboard(ss, expenses, allSummaries) {
  // SMART UPDATE: Only recreate if structure changed
  const existingDash = ss.getSheetByName('📊 DASHBOARD');
  
  if (existingDash) {
    // Check if we need to recreate (new projects/artists added)
    const needsRecreate = checkDashboardNeedsUpdate(existingDash, allSummaries);
    
    if (!needsRecreate) {
      // Just update timestamp - formulas will auto-update from data changes
      Logger.log('Dashboard structure unchanged, updating timestamp only');
      const today = new Date();
      existingDash.getRange(2, 1).setValue('Atualizado: ' + formatDate(today.toISOString()));
      return; // Exit early - dashboard already correct
    }
    
    // Structure changed, need full recreate
    Logger.log('Dashboard structure changed, recreating...');
    ss.deleteSheet(existingDash);
  }
  
  // Delete old QG_GERAL if exists
  const oldQG = ss.getSheetByName('QG_GERAL');
  if (oldQG) ss.deleteSheet(oldQG);
  
  // Create new dashboard
  let sheet = ss.insertSheet('📊 DASHBOARD');
  
  // Move to first position
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);
  
  let currentRow = 1;
  
  // ============================================
  // SECTION 1: HEADER & SUMMARY CARDS
  // ============================================
  
  sheet.getRange(currentRow, 1).setValue('🎵 MAKTUB ART GROUP - DASHBOARD FINANCEIRO');
  sheet.getRange(currentRow, 1, 1, 8).merge().setFontWeight('bold').setFontSize(16)
    .setBackground('#1a1a2e').setFontColor('#ffffff').setHorizontalAlignment('center');
  currentRow++;
  
  const today = new Date();
  sheet.getRange(currentRow, 1).setValue('Atualizado: ' + formatDate(today.toISOString()));
  sheet.getRange(currentRow, 1, 1, 8).merge().setFontStyle('italic').setFontColor('#666666').setHorizontalAlignment('center');
  currentRow += 2;
  
  // Calculate totals
  const totalMaktub = expenses.filter(e => e.investor === 'maktub').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalOutros = expenses.filter(e => e.investor !== 'maktub').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalGeral = totalMaktub + totalOutros;
  const balance = totalOutros - totalMaktub;
  
  // Summary Cards Row
  const cardsRow = currentRow;
  sheet.getRange(currentRow, 1, 2, 2).merge();
  sheet.getRange(currentRow, 1).setValue('📊 TOTAL DESPESAS\n' + expenses.length + ' registos')
    .setBackground('#3498db').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  sheet.getRange(currentRow, 3, 2, 2).merge();
  sheet.getRange(currentRow, 3).setValue('💰 VALOR TOTAL\n€ ' + totalGeral.toFixed(2))
    .setBackground('#9b59b6').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  sheet.getRange(currentRow, 5, 2, 2).merge();
  sheet.getRange(currentRow, 5).setValue('🏢 MAKTUB INVESTIU\n€ ' + totalMaktub.toFixed(2))
    .setBackground('#e74c3c').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  sheet.getRange(currentRow, 7, 2, 2).merge();
  sheet.getRange(currentRow, 7).setValue('👥 TERCEIROS\n€ ' + totalOutros.toFixed(2))
    .setBackground('#27ae60').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  currentRow += 3;
  
  // Balance card
  const balanceColor = balance >= 0 ? '#27ae60' : '#e74c3c';
  const balanceLabel = balance >= 0 ? '✅ BALANÇO POSITIVO' : '⚠️ BALANÇO NEGATIVO';
  sheet.getRange(currentRow, 1, 1, 8).merge();
  sheet.getRange(currentRow, 1).setValue(balanceLabel + ': € ' + balance.toFixed(2))
    .setBackground(balanceColor).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center');
  currentRow += 2;
  
  // ============================================
  // SECTION 2: CHART DATA TABLES
  // ============================================
  
  // === POR ARTISTA ===
  const chartDataStartRow = currentRow;
  sheet.getRange(currentRow, 1).setValue('📊 DESPESAS POR ARTISTA');
  sheet.getRange(currentRow, 1, 1, 3).merge().setFontWeight('bold').setBackground('#34495e').setFontColor('#ffffff');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 3).setValues([['Artista', 'Maktub', 'Terceiros']]);
  sheet.getRange(currentRow, 1, 1, 3).setFontWeight('bold').setBackground('#e8e8e8');
  const artistDataStartRow = currentRow + 1;
  currentRow++;
  
  // Group by artist
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = { maktub: 0, outros: 0 };
    const amount = Number(e.amount) || 0;
    if (e.investor === 'maktub') byArtist[e.artist].maktub += amount;
    else byArtist[e.artist].outros += amount;
  });
  
  Object.keys(byArtist).sort().forEach(artist => {
    sheet.getRange(currentRow, 1, 1, 3).setValues([[
      artist,
      byArtist[artist].maktub,
      byArtist[artist].outros
    ]]);
    currentRow++;
  });
  const artistDataEndRow = currentRow - 1;
  
  // Format currency
  sheet.getRange(artistDataStartRow, 2, artistDataEndRow - artistDataStartRow + 1, 2).setNumberFormat('#,##0.00 €');
  currentRow++;
  
  // === POR TIPO ===
  sheet.getRange(currentRow, 1).setValue('📊 DESPESAS POR TIPO');
  sheet.getRange(currentRow, 1, 1, 2).merge().setFontWeight('bold').setBackground('#34495e').setFontColor('#ffffff');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 2).setValues([['Tipo', 'Valor']]);
  sheet.getRange(currentRow, 1, 1, 2).setFontWeight('bold').setBackground('#e8e8e8');
  const typeDataStartRow = currentRow + 1;
  currentRow++;
  
  // Group by type
  const byType = {};
  expenses.forEach(e => {
    const typeName = TYPE_NAMES[e.type] || e.type || 'Outros';
    if (!byType[typeName]) byType[typeName] = 0;
    byType[typeName] += Number(e.amount) || 0;
  });
  
  Object.keys(byType).sort((a, b) => byType[b] - byType[a]).forEach(type => {
    sheet.getRange(currentRow, 1, 1, 2).setValues([[type, byType[type]]]);
    currentRow++;
  });
  const typeDataEndRow = currentRow - 1;
  
  // Format currency
  sheet.getRange(typeDataStartRow, 2, typeDataEndRow - typeDataStartRow + 1, 1).setNumberFormat('#,##0.00 €');
  currentRow++;
  
  // === POR PROJETO ===
  sheet.getRange(currentRow, 1).setValue('📊 DESPESAS POR PROJETO/EVENTO');
  sheet.getRange(currentRow, 1, 1, 2).merge().setFontWeight('bold').setBackground('#34495e').setFontColor('#ffffff');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 2).setValues([['Projeto', 'Valor']]);
  sheet.getRange(currentRow, 1, 1, 2).setFontWeight('bold').setBackground('#e8e8e8');
  const projectDataStartRow = currentRow + 1;
  currentRow++;
  
  // Group by project
  const byProject = {};
  expenses.forEach(e => {
    const projectName = e.project || 'Gastos Gerais';
    if (!byProject[projectName]) byProject[projectName] = 0;
    byProject[projectName] += Number(e.amount) || 0;
  });
  
  Object.keys(byProject).sort((a, b) => byProject[b] - byProject[a]).forEach(project => {
    sheet.getRange(currentRow, 1, 1, 2).setValues([[project, byProject[project]]]);
    currentRow++;
  });
  const projectDataEndRow = currentRow - 1;
  
  // Format currency
  sheet.getRange(projectDataStartRow, 2, projectDataEndRow - projectDataStartRow + 1, 1).setNumberFormat('#,##0.00 €');
  
  // ============================================
  // SECTION 3: CREATE CHARTS
  // ============================================
  
  // Chart 1: By Artist (Stacked Bar)
  try {
    const artistChart = sheet.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(sheet.getRange(artistDataStartRow - 1, 1, artistDataEndRow - artistDataStartRow + 2, 3))
      .setPosition(cardsRow + 5, 5, 0, 0)
      .setOption('title', 'Despesas por Artista')
      .setOption('legend', { position: 'bottom' })
      .setOption('isStacked', true)
      .setOption('colors', ['#e74c3c', '#27ae60'])
      .setOption('width', 500)
      .setOption('height', 300)
      .build();
    sheet.insertChart(artistChart);
  } catch (e) {
    Logger.log('Could not create artist chart: ' + e.toString());
  }
  
  // Chart 2: By Type (Pie)
  try {
    const typeChart = sheet.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(sheet.getRange(typeDataStartRow - 1, 1, typeDataEndRow - typeDataStartRow + 2, 2))
      .setPosition(cardsRow + 22, 5, 0, 0)
      .setOption('title', 'Despesas por Tipo')
      .setOption('legend', { position: 'right' })
      .setOption('pieSliceText', 'percentage')
      .setOption('width', 500)
      .setOption('height', 300)
      .build();
    sheet.insertChart(typeChart);
  } catch (e) {
    Logger.log('Could not create type chart: ' + e.toString());
  }
  
  // ============================================
  // SECTION 4: QUADRO GERAL (like Madalena's QG)
  // ============================================
  
  currentRow += 2;
  sheet.getRange(currentRow, 1).setValue('📋 QUADRO GERAL - TODOS OS ARTISTAS');
  sheet.getRange(currentRow, 1, 1, 7).merge().setFontWeight('bold').setFontSize(12).setBackground('#4a86e8').setFontColor('#ffffff');
  currentRow++;
  
  sheet.getRange(currentRow, 1, 1, 7).setValues([['Artista', 'Projeto', 'Proveitos', 'Custos', 'Resultado', 'Inv. Maktub', 'Balanço']]);
  sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#e8e8e8');
  const qgDataStartRow = currentRow + 1;
  currentRow++;
  
  // Group summaries by artist
  const summaryByArtist = {};
  allSummaries.forEach(s => {
    if (!summaryByArtist[s.artist]) summaryByArtist[s.artist] = [];
    summaryByArtist[s.artist].push(s);
  });
  
  const subtotalRows = [];
  
  Object.keys(summaryByArtist).sort().forEach(artist => {
    const artistSummaries = summaryByArtist[artist];
    const artistStartRow = currentRow;
    
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
      currentRow++;
    });
    
    const artistEndRow = currentRow - 1;
    
    // Artist subtotal
    sheet.getRange(currentRow, 1, 1, 7).setValues([[
      'Subtotal ' + artist,
      '',
      '=SUM(C' + artistStartRow + ':C' + artistEndRow + ')',
      '=SUM(D' + artistStartRow + ':D' + artistEndRow + ')',
      '=SUM(E' + artistStartRow + ':E' + artistEndRow + ')',
      '=SUM(F' + artistStartRow + ':F' + artistEndRow + ')',
      '=SUM(G' + artistStartRow + ':G' + artistEndRow + ')'
    ]]);
    sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#e8f4f8').setFontStyle('italic');
    subtotalRows.push(currentRow);
    currentRow++;
  });
  
  // Grand total
  currentRow++;
  if (subtotalRows.length > 0) {
    const colRefs = (col) => subtotalRows.map(r => col + r).join('+');
    sheet.getRange(currentRow, 1, 1, 7).setValues([[
      '*** TOTAL GERAL ***',
      '',
      '=' + colRefs('C'),
      '=' + colRefs('D'),
      '=' + colRefs('E'),
      '=' + colRefs('F'),
      '=' + colRefs('G')
    ]]);
  } else {
    sheet.getRange(currentRow, 1, 1, 7).setValues([['*** TOTAL GERAL ***', '', 0, 0, 0, 0, 0]]);
  }
  sheet.getRange(currentRow, 1, 1, 7).setFontWeight('bold').setBackground('#fff2cc').setFontSize(11);
  
  // Format currency for QG
  sheet.getRange(qgDataStartRow, 3, currentRow - qgDataStartRow + 1, 5).setNumberFormat('#,##0.00 €');
  
  // Conditional formatting for resultado columns
  const qgResultadoRange = sheet.getRange(qgDataStartRow, 5, currentRow - qgDataStartRow + 1, 1);
  const qgBalancoRange = sheet.getRange(qgDataStartRow, 7, currentRow - qgDataStartRow + 1, 1);
  
  const qgRulePositive = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(0).setFontColor('#006400')
    .setRanges([qgResultadoRange, qgBalancoRange]).build();
  const qgRuleNegative = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor('#8b0000')
    .setRanges([qgResultadoRange, qgBalancoRange]).build();
  sheet.setConditionalFormatRules([qgRulePositive, qgRuleNegative]);
  
  // ============================================
  // FINAL FORMATTING
  // ============================================
  
  // Column widths
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 180);
  for (let i = 3; i <= 8; i++) sheet.setColumnWidth(i, 120);
  
  // Freeze header
  sheet.setFrozenRows(1);
  
  Logger.log('Dashboard created successfully with charts');
}

// Check if dashboard needs to be recreated (structure change)
function checkDashboardNeedsUpdate(dashSheet, currentSummaries) {
  try {
    // Get the QG section - it starts after the chart data tables
    const data = dashSheet.getDataRange().getValues();
    
    // Find the QG header row
    let qgHeaderRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().includes('QUADRO GERAL - TODOS OS ARTISTAS')) {
        qgHeaderRow = i + 2; // Data starts 2 rows after header
        break;
      }
    }
    
    if (qgHeaderRow === -1) {
      Logger.log('QG header not found, needs recreate');
      return true; // Can't find QG section, recreate
    }
    
    // Count existing project rows in dashboard (skip subtotals and total)
    const existingProjects = new Set();
    for (let i = qgHeaderRow; i < data.length; i++) {
      const artistCol = data[i][0];
      const projectCol = data[i][1];
      
      // Skip subtotals, totals, empty rows
      if (!artistCol || artistCol.toString().startsWith('Subtotal') || 
          artistCol.toString().includes('TOTAL')) {
        continue;
      }
      
      if (projectCol) {
        existingProjects.add(artistCol + '|' + projectCol);
      }
    }
    
    // Count current projects from summaries
    const currentProjects = new Set();
    currentSummaries.forEach(s => {
      currentProjects.add(s.artist + '|' + s.project);
    });
    
    // Compare sizes
    if (existingProjects.size !== currentProjects.size) {
      Logger.log('Project count changed: ' + existingProjects.size + ' -> ' + currentProjects.size);
      return true;
    }
    
    // Check if all current projects exist in dashboard
    for (const proj of currentProjects) {
      if (!existingProjects.has(proj)) {
        Logger.log('New project found: ' + proj);
        return true;
      }
    }
    
    // Structure unchanged
    Logger.log('Dashboard structure matches current data');
    return false;
    
  } catch (e) {
    Logger.log('Error checking dashboard: ' + e.toString());
    return true; // On error, recreate to be safe
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTypeName(type) {
  return TYPE_NAMES[type] || type || 'Outros';
}

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
// MENU & UI
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
      .addItem('📊 Criar Dashboard', 'recreateDashboard')
      .addItem('📋 Criar Resumo', 'createSummary')
      .addToUi();
  } catch (e) {
    Logger.log('Could not create menu: ' + e.toString());
  }
}

function syncToWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  const expenses = getAllExpenses();
  
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastSync', JSON.stringify({
    timestamp: new Date().toISOString(),
    expenses: expenses
  }));
  
  ui.alert('✅ Sincronização Preparada', expenses.length + ' despesas prontas.', ui.ButtonSet.OK);
}

function syncFromWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('ℹ️ Importar do Website', 'Abra o website e clique em "Sincronizar para Sheets"', ui.ButtonSet.OK);
}

function recreateDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
  const expenses = getAllExpenses();
  
  // Rebuild summaries from existing data
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = {};
    const project = e.project || 'Gastos Gerais';
    if (!byArtist[e.artist][project]) byArtist[e.artist][project] = [];
    byArtist[e.artist][project].push(e);
  });
  
  const allSummaries = [];
  Object.keys(byArtist).forEach(artist => {
    Object.keys(byArtist[artist]).forEach(project => {
      const expenses = byArtist[artist][project];
      const proveitos = expenses.filter(e => e.investor !== 'maktub').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const custos = expenses.filter(e => e.investor === 'maktub').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      allSummaries.push({
        artist: artist,
        project: project,
        proveitos: proveitos,
        custos: custos,
        resultado: proveitos - custos
      });
    });
  });
  
  createMainDashboard(ss, expenses, allSummaries);
  SpreadsheetApp.getUi().alert('✅ Dashboard recriado com sucesso!');
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
  
  const dataRange = summarySheet.getRange(3, 2, lastRow - 2, 3);
  dataRange.setNumberFormat('#,##0.00 €');
  
  SpreadsheetApp.getUi().alert('✅ Resumo criado!');
}

// ============================================
// TEST FUNCTION
// ============================================

function testSync() {
  const testExpenses = [
    {
      id: 'test_1',
      date: '2026-01-28',
      artist: 'D.A.M.A',
      project: 'Beja 25 Abril',
      type: 'combustivel',
      entity: 'Galp',
      investor: 'maktub',
      amount: 85.50,
      notes: 'Teste combustível',
      createdAt: new Date().toISOString()
    },
    {
      id: 'test_2',
      date: '2026-01-27',
      artist: 'D.A.M.A',
      project: 'Beja 25 Abril',
      type: 'alimentacao',
      entity: 'Catering Pro',
      investor: 'outro',
      amount: 250.00,
      notes: 'Refeições equipa',
      createdAt: new Date().toISOString()
    }
  ];
  
  const result = syncFromWebsite(testExpenses);
  Logger.log('Test result: ' + JSON.stringify(result));
}
