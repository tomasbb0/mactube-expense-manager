// ============================================
// GOOGLE APPS SCRIPT - MAKTUB EXPENSE SYNC V4
// ============================================
// NOVA VERSÃO COM:
// - Dashboard com fórmulas dinâmicas (NÃO sincronizado)
// - Criação automática de projetos
// - Estrutura hierárquica: Artista > Projeto
// ============================================

// ============================================
// CONFIGURATION
// ============================================

// Main folder ID (Maktub Despesas folder in Google Drive)
const MAIN_FOLDER_ID = '1MIwgtsBXH4BW_zXb0rb09DtergXq9uLp';

// Template spreadsheet ID (will be duplicated for new projects)
const TEMPLATE_SPREADSHEET_ID = ''; // Will be created and set

// Main spreadsheet for all expenses
const MAIN_SPREADSHEET_ID = '1O8uOe3q8J6rHifQTJim0ZYjg0N7m1mO7ocUVzUdVfN8';

// Artist spreadsheets (general sheets per artist)
const ARTIST_SPREADSHEETS = {
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
};

// Project spreadsheets - dynamically managed
// Format: { 'Artista/Projeto': 'spreadsheetId' }
let PROJECT_SPREADSHEETS = {};

// Categories for expense types
const EXPENSE_CATEGORIES = ['Promoção', 'Tour', 'Concerto', 'Videoclipe', 'Geral', 'Gravação'];

// Columns for data sheets (NOT dashboard)
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
        result = { success: true, artists: Object.keys(ARTIST_SPREADSHEETS) };
        break;
      case 'getProjects':
        result = { success: true, projects: getProjectsList() };
        break;
      case 'getStructure':
        result = { success: true, structure: getFullStructure() };
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
      case 'createProject':
        result = createNewProject(data.artist, data.projectName, data.projectType);
        break;
      case 'deleteSheet1':
        result = deleteAllSheet1();
        break;
      case 'setupDashboards':
        result = setupAllDashboards();
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
// DASHBOARD WITH FORMULAS (NOT SYNCED!)
// ============================================
// The dashboard uses formulas to calculate from data sheets
// This way it updates automatically when data changes

function setupDashboardWithFormulas(spreadsheet, isMainSheet = false) {
  Logger.log('Setting up dashboard with formulas for: ' + spreadsheet.getName());
  
  // Get or create dashboard sheet
  let dashboard = spreadsheet.getSheetByName('📊 DASHBOARD');
  if (!dashboard) {
    dashboard = spreadsheet.insertSheet('📊 DASHBOARD', 0);
  } else {
    dashboard.clear();
  }
  
  // Get all data sheet names (excluding dashboard)
  const allSheets = spreadsheet.getSheets();
  const dataSheetNames = allSheets
    .map(s => s.getName())
    .filter(name => !name.includes('DASHBOARD') && !name.includes('Sheet1') && !name.includes('Folha'));
  
  // Style settings
  const headerBg = '#1a1a2e';
  const headerFg = '#1db954';
  const cardBg = '#16213e';
  const textColor = '#e0e0e0';
  
  // Set column widths
  dashboard.setColumnWidth(1, 50);   // Spacer
  dashboard.setColumnWidth(2, 200);  // Labels
  dashboard.setColumnWidth(3, 150);  // Values
  dashboard.setColumnWidth(4, 50);   // Spacer
  dashboard.setColumnWidth(5, 200);  // Category labels
  dashboard.setColumnWidth(6, 150);  // Category values
  
  // Title
  dashboard.getRange('B2').setValue('📊 DASHBOARD').setFontSize(24).setFontWeight('bold').setFontColor(headerFg);
  dashboard.getRange('B3').setValue('Atualização automática via fórmulas').setFontSize(10).setFontColor('#888');
  
  // ============================================
  // TOTAL GERAL - Using SUM across all sheets
  // ============================================
  
  dashboard.getRange('B5').setValue('💰 TOTAL GERAL').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  // Build a formula that sums the "Valor" column (H) from all data sheets
  if (dataSheetNames.length > 0) {
    // Create formula: =SUM('Sheet1'!H:H, 'Sheet2'!H:H, ...)
    const sumParts = dataSheetNames.map(name => `SUMIF('${name}'!H:H, ">0")`);
    const totalFormula = '=' + sumParts.join('+');
    dashboard.getRange('C5').setFormula(totalFormula);
  } else {
    dashboard.getRange('C5').setValue(0);
  }
  dashboard.getRange('C5').setNumberFormat('€#,##0.00').setFontSize(18).setFontWeight('bold').setFontColor('#fff');
  
  // ============================================
  // RESUMO POR CATEGORIA/SHEET
  // ============================================
  
  dashboard.getRange('B7').setValue('📋 RESUMO POR CATEGORIA').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  let row = 8;
  dataSheetNames.forEach((sheetName, idx) => {
    // Category name
    dashboard.getRange('B' + row).setValue(sheetName).setFontColor(textColor);
    
    // Sum formula for this category
    const categoryFormula = `=SUMIF('${sheetName}'!H:H, ">0")`;
    dashboard.getRange('C' + row).setFormula(categoryFormula);
    dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor(textColor);
    
    // Percentage formula
    if (dataSheetNames.length > 0) {
      const percentFormula = `=IFERROR(C${row}/C5*100, 0)`;
      dashboard.getRange('D' + row).setFormula(percentFormula);
      dashboard.getRange('D' + row).setNumberFormat('0.0"%"').setFontColor('#888');
    }
    
    row++;
  });
  
  // ============================================
  // RESUMO POR INVESTIDOR (Maktub vs Outros)
  // ============================================
  
  row += 2;
  dashboard.getRange('B' + row).setValue('👥 RESUMO POR INVESTIDOR').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  row++;
  
  // Maktub invested
  dashboard.getRange('B' + row).setValue('Maktub').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const maktubParts = dataSheetNames.map(name => `SUMIF('${name}'!G:G, "*Maktub*", '${name}'!H:H)`);
    dashboard.getRange('C' + row).setFormula('=' + maktubParts.join('+'));
  }
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor('#ff6b6b');
  row++;
  
  // Outros invested
  dashboard.getRange('B' + row).setValue('Outros (a receber)').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const outrosParts = dataSheetNames.map(name => `SUMIF('${name}'!G:G, "<>*Maktub*", '${name}'!H:H)`);
    dashboard.getRange('C' + row).setFormula('=' + outrosParts.join('+'));
  }
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor('#4ecdc4');
  row++;
  
  // ============================================
  // BALANÇO (O que artista deve à Maktub)
  // ============================================
  
  row += 2;
  dashboard.getRange('B' + row).setValue('⚖️ BALANÇO').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  row++;
  
  dashboard.getRange('B' + row).setValue('Artista deve à Maktub:').setFontColor(textColor);
  // Balance = Maktub invested - Others invested
  const balanceRow = row - 4; // Row where Maktub total is
  dashboard.getRange('C' + row).setFormula(`=C${balanceRow}-C${balanceRow+1}`);
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontSize(16).setFontWeight('bold').setFontColor('#ffd93d');
  
  // ============================================
  // CONTAGEM DE DESPESAS
  // ============================================
  
  row += 3;
  dashboard.getRange('E5').setValue('📈 ESTATÍSTICAS').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  dashboard.getRange('E6').setValue('Total de registos:').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const countParts = dataSheetNames.map(name => `COUNTA('${name}'!A:A)-1`);
    dashboard.getRange('F6').setFormula('=' + countParts.join('+'));
  }
  
  dashboard.getRange('E7').setValue('Última atualização:').setFontColor(textColor);
  dashboard.getRange('F7').setFormula('=NOW()').setNumberFormat('dd/MM/yyyy HH:mm');
  
  // ============================================
  // UNIQUE VALUES DETECTION (Entidades, Tipos)
  // ============================================
  
  dashboard.getRange('E9').setValue('🏢 TOP ENTIDADES').setFontSize(12).setFontWeight('bold').setFontColor(headerFg);
  
  // This creates a dynamic list of unique entities from column F
  // Using UNIQUE formula (Google Sheets specific)
  if (dataSheetNames.length > 0) {
    // For simplicity, we'll reference the first data sheet
    // A more complex version would consolidate all sheets
    const firstSheet = dataSheetNames[0];
    dashboard.getRange('E10').setFormula(`=IFERROR(UNIQUE(FILTER('${firstSheet}'!F:F, '${firstSheet}'!F:F<>"")), "Sem dados")`);
  }
  
  // Apply background to dashboard area
  dashboard.getRange('A1:G' + (row + 5)).setBackground('#0f0f23');
  
  // Protect dashboard from sync (mark with note)
  dashboard.getRange('A1').setNote('DASHBOARD - NÃO SINCRONIZAR - Usa fórmulas automáticas');
  
  Logger.log('Dashboard with formulas created successfully');
  return dashboard;
}

// ============================================
// SETUP ALL DASHBOARDS
// ============================================

function setupAllDashboards() {
  Logger.log('=== SETTING UP ALL DASHBOARDS ===');
  
  const results = [];
  
  // Main spreadsheet
  try {
    const mainSS = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
    setupDashboardWithFormulas(mainSS, true);
    results.push({ sheet: 'Main', success: true });
  } catch (e) {
    results.push({ sheet: 'Main', success: false, error: e.toString() });
  }
  
  // Artist spreadsheets
  Object.keys(ARTIST_SPREADSHEETS).forEach(artist => {
    try {
      const ss = SpreadsheetApp.openById(ARTIST_SPREADSHEETS[artist]);
      setupDashboardWithFormulas(ss, false);
      results.push({ sheet: artist, success: true });
    } catch (e) {
      results.push({ sheet: artist, success: false, error: e.toString() });
    }
  });
  
  Logger.log('Dashboard setup complete: ' + JSON.stringify(results));
  return { success: true, results: results };
}

// ============================================
// CREATE NEW PROJECT
// ============================================

function createNewProject(artistName, projectName, projectType) {
  Logger.log(`Creating new project: ${artistName} / ${projectName} (${projectType})`);
  
  if (!artistName || !projectName) {
    return { success: false, error: 'Artist name and project name are required' };
  }
  
  try {
    // 1. Get or create artist folder
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    let artistFolder = getOrCreateFolder(mainFolder, artistName);
    let projectsFolder = getOrCreateFolder(artistFolder, 'Projetos');
    
    // 2. Create new spreadsheet for the project
    const newSpreadsheet = SpreadsheetApp.create(`${artistName} - ${projectName}`);
    const newFile = DriveApp.getFileById(newSpreadsheet.getId());
    
    // Move to projects folder
    projectsFolder.addFile(newFile);
    DriveApp.getRootFolder().removeFile(newFile);
    
    // 3. Setup the project spreadsheet
    setupProjectSpreadsheet(newSpreadsheet, artistName, projectName, projectType);
    
    // 4. Register this project in our configuration
    const projectKey = `${artistName}/${projectName}`;
    PROJECT_SPREADSHEETS[projectKey] = newSpreadsheet.getId();
    
    // Save to script properties for persistence
    const props = PropertiesService.getScriptProperties();
    props.setProperty('PROJECT_SPREADSHEETS', JSON.stringify(PROJECT_SPREADSHEETS));
    
    Logger.log('Project created successfully: ' + newSpreadsheet.getId());
    
    return {
      success: true,
      projectId: newSpreadsheet.getId(),
      projectUrl: newSpreadsheet.getUrl(),
      projectKey: projectKey,
      message: `Projeto "${projectName}" criado para ${artistName}`
    };
    
  } catch (error) {
    Logger.log('Error creating project: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

function setupProjectSpreadsheet(spreadsheet, artistName, projectName, projectType) {
  // Delete default Sheet1
  const sheets = spreadsheet.getSheets();
  
  // Create category sheets
  EXPENSE_CATEGORIES.forEach((category, index) => {
    let sheet;
    if (index === 0) {
      sheet = sheets[0];
      sheet.setName(category);
    } else {
      sheet = spreadsheet.insertSheet(category);
    }
    
    // Add headers
    setupDataSheetHeaders(sheet);
    
    // Style the sheet
    styleDataSheet(sheet, category);
  });
  
  // Delete any remaining Sheet1
  deleteSheet1FromSpreadsheet(spreadsheet.getId(), projectName);
  
  // Setup dashboard with formulas
  setupDashboardWithFormulas(spreadsheet, false);
  
  // Add project info to dashboard
  const dashboard = spreadsheet.getSheetByName('📊 DASHBOARD');
  if (dashboard) {
    dashboard.getRange('E2').setValue('🎵 ' + artistName).setFontSize(14).setFontColor('#1db954');
    dashboard.getRange('E3').setValue('📁 ' + projectName + ' (' + projectType + ')').setFontSize(12).setFontColor('#888');
  }
}

function setupDataSheetHeaders(sheet) {
  const headers = DATA_COLUMNS;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#1db954')
    .setFontWeight('bold');
  
  // Set column widths
  sheet.setColumnWidth(1, 80);   // ID
  sheet.setColumnWidth(2, 100);  // Data
  sheet.setColumnWidth(3, 120);  // Artista
  sheet.setColumnWidth(4, 150);  // Projeto
  sheet.setColumnWidth(5, 100);  // Tipo
  sheet.setColumnWidth(6, 150);  // Entidade
  sheet.setColumnWidth(7, 100);  // Investidor
  sheet.setColumnWidth(8, 100);  // Valor
  sheet.setColumnWidth(9, 200);  // Notas
  sheet.setColumnWidth(10, 150); // CriadoEm
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

function styleDataSheet(sheet, categoryName) {
  // Color code by category
  const categoryColors = {
    'Promoção': '#e74c3c',
    'Tour': '#3498db',
    'Concerto': '#9b59b6',
    'Videoclipe': '#e67e22',
    'Geral': '#1abc9c',
    'Gravação': '#f39c12'
  };
  
  const color = categoryColors[categoryName] || '#1db954';
  sheet.setTabColor(color);
}

// ============================================
// SYNC FROM WEBSITE (excludes dashboard!)
// ============================================

function syncFromWebsite(expenses) {
  Logger.log('=== SYNCING ' + expenses.length + ' EXPENSES ===');
  
  if (!expenses || expenses.length === 0) {
    return { success: true, message: 'No expenses to sync' };
  }
  
  try {
    // 1. First, delete all Sheet1 tabs
    deleteAllSheet1();
    
    // 2. Update main spreadsheet (all expenses)
    updateMainSpreadsheet(expenses);
    
    // 3. Group expenses by artist
    const byArtist = groupByArtist(expenses);
    
    // 4. Update each artist spreadsheet
    Object.keys(byArtist).forEach(artist => {
      if (ARTIST_SPREADSHEETS[artist]) {
        updateArtistSpreadsheet(artist, byArtist[artist]);
      }
    });
    
    // 5. Update project spreadsheets
    const byProject = groupByProject(expenses);
    Object.keys(byProject).forEach(projectKey => {
      if (PROJECT_SPREADSHEETS[projectKey]) {
        updateProjectSpreadsheet(projectKey, byProject[projectKey]);
      }
    });
    
    Logger.log('=== SYNC COMPLETE ===');
    return {
      success: true,
      message: `Synced ${expenses.length} expenses`,
      artistCount: Object.keys(byArtist).length,
      projectCount: Object.keys(byProject).length
    };
    
  } catch (error) {
    Logger.log('Sync error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function updateMainSpreadsheet(expenses) {
  const ss = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  
  // Get or create "Todas as Despesas" sheet
  let dataSheet = ss.getSheetByName('Todas as Despesas');
  if (!dataSheet) {
    dataSheet = ss.insertSheet('Todas as Despesas');
    setupDataSheetHeaders(dataSheet);
  }
  
  // Clear existing data (keep header)
  const lastRow = dataSheet.getLastRow();
  if (lastRow > 1) {
    dataSheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).clear();
  }
  
  // Write all expenses
  if (expenses.length > 0) {
    const data = expenses.map(exp => [
      exp.id || '',
      exp.date || '',
      exp.artist || '',
      exp.project || '',
      exp.type || '',
      exp.entity || '',
      exp.investor || '',
      exp.amount || 0,
      exp.notes || '',
      exp.createdAt || ''
    ]);
    
    dataSheet.getRange(2, 1, data.length, DATA_COLUMNS.length).setValues(data);
  }
  
  // Update dashboard (refresh formulas by touching it)
  const dashboard = ss.getSheetByName('📊 DASHBOARD');
  if (dashboard) {
    // Dashboard formulas auto-update, just log
    Logger.log('Main dashboard formulas will auto-update');
  } else {
    setupDashboardWithFormulas(ss, true);
  }
}

function updateArtistSpreadsheet(artistName, expenses) {
  const ss = SpreadsheetApp.openById(ARTIST_SPREADSHEETS[artistName]);
  
  // Group by category (type)
  const byCategory = {};
  expenses.forEach(exp => {
    const cat = exp.type || 'Geral';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(exp);
  });
  
  // Update each category sheet
  EXPENSE_CATEGORIES.forEach(category => {
    let sheet = ss.getSheetByName(category);
    
    if (!sheet) {
      sheet = ss.insertSheet(category);
      setupDataSheetHeaders(sheet);
      styleDataSheet(sheet, category);
    }
    
    // Clear existing data (keep header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).clear();
    }
    
    // Write category expenses
    const catExpenses = byCategory[category] || [];
    if (catExpenses.length > 0) {
      const data = catExpenses.map(exp => [
        exp.id || '',
        exp.date || '',
        exp.artist || '',
        exp.project || '',
        exp.type || '',
        exp.entity || '',
        exp.investor || '',
        exp.amount || 0,
        exp.notes || '',
        exp.createdAt || ''
      ]);
      
      sheet.getRange(2, 1, data.length, DATA_COLUMNS.length).setValues(data);
    }
  });
  
  // Ensure dashboard exists with formulas
  const dashboard = ss.getSheetByName('📊 DASHBOARD');
  if (!dashboard) {
    setupDashboardWithFormulas(ss, false);
  }
}

function updateProjectSpreadsheet(projectKey, expenses) {
  const ss = SpreadsheetApp.openById(PROJECT_SPREADSHEETS[projectKey]);
  
  // Group by category
  const byCategory = {};
  expenses.forEach(exp => {
    const cat = exp.type || 'Geral';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(exp);
  });
  
  // Update each category sheet
  EXPENSE_CATEGORIES.forEach(category => {
    let sheet = ss.getSheetByName(category);
    
    if (!sheet) {
      sheet = ss.insertSheet(category);
      setupDataSheetHeaders(sheet);
      styleDataSheet(sheet, category);
    }
    
    // Clear and update
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, DATA_COLUMNS.length).clear();
    }
    
    const catExpenses = byCategory[category] || [];
    if (catExpenses.length > 0) {
      const data = catExpenses.map(exp => [
        exp.id || '',
        exp.date || '',
        exp.artist || '',
        exp.project || '',
        exp.type || '',
        exp.entity || '',
        exp.investor || '',
        exp.amount || 0,
        exp.notes || '',
        exp.createdAt || ''
      ]);
      
      sheet.getRange(2, 1, data.length, DATA_COLUMNS.length).setValues(data);
    }
  });
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

function groupByProject(expenses) {
  const result = {};
  expenses.forEach(exp => {
    if (exp.project && exp.artist) {
      const key = `${exp.artist}/${exp.project}`;
      if (!result[key]) result[key] = [];
      result[key].push(exp);
    }
  });
  return result;
}

function getAllExpenses() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
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
    })).filter(exp => exp.id); // Filter out empty rows
    
  } catch (error) {
    Logger.log('Error getting expenses: ' + error.toString());
    return [];
  }
}

function getProjectsList() {
  // Load from script properties
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('PROJECT_SPREADSHEETS');
  if (saved) {
    PROJECT_SPREADSHEETS = JSON.parse(saved);
  }
  
  return Object.keys(PROJECT_SPREADSHEETS).map(key => {
    const [artist, project] = key.split('/');
    return {
      key: key,
      artist: artist,
      project: project,
      spreadsheetId: PROJECT_SPREADSHEETS[key]
    };
  });
}

function getFullStructure() {
  const structure = {
    main: {
      id: MAIN_SPREADSHEET_ID,
      name: 'MAIN - Todas as Despesas'
    },
    artists: {},
    projects: {}
  };
  
  // Artists
  Object.keys(ARTIST_SPREADSHEETS).forEach(artist => {
    structure.artists[artist] = {
      id: ARTIST_SPREADSHEETS[artist],
      projects: []
    };
  });
  
  // Projects
  const projects = getProjectsList();
  projects.forEach(proj => {
    if (structure.artists[proj.artist]) {
      structure.artists[proj.artist].projects.push({
        name: proj.project,
        id: proj.spreadsheetId
      });
    }
    structure.projects[proj.key] = proj.spreadsheetId;
  });
  
  return structure;
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

function deleteAllSheet1() {
  Logger.log('=== DELETING ALL SHEET1 TABS ===');
  
  deleteSheet1FromSpreadsheet(MAIN_SPREADSHEET_ID, 'Main');
  
  Object.keys(ARTIST_SPREADSHEETS).forEach(artist => {
    deleteSheet1FromSpreadsheet(ARTIST_SPREADSHEETS[artist], artist);
  });
  
  Object.keys(PROJECT_SPREADSHEETS).forEach(project => {
    deleteSheet1FromSpreadsheet(PROJECT_SPREADSHEETS[project], project);
  });
  
  return { success: true, message: 'All Sheet1 tabs deleted' };
}

function deleteSheet1FromSpreadsheet(spreadsheetId, label) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    
    const namesToDelete = ['Sheet1', 'Sheet 1', 'Folha1', 'Folha 1', 'Hoja1', 'Hoja 1', 'Feuille 1', 'Feuille1'];
    
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const name = sheet.getName();
      
      if (namesToDelete.includes(name)) {
        if (ss.getSheets().length > 1) {
          Logger.log('Deleting "' + name + '" from ' + label);
          ss.deleteSheet(sheet);
        } else {
          sheet.setName('Despesas');
        }
      }
    }
  } catch (e) {
    Logger.log('Error with ' + label + ': ' + e.toString());
  }
}

// ============================================
// MENU FOR GOOGLE SHEETS
// ============================================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 Maktub Sync')
      .addItem('📊 Configurar Dashboard', 'menuSetupDashboard')
      .addItem('🔄 Atualizar Fórmulas Dashboard', 'menuRefreshDashboard')
      .addSeparator()
      .addItem('🗑️ Eliminar folhas "Sheet1"', 'deleteAllSheet1')
      .addItem('📋 Ver Estrutura', 'menuShowStructure')
      .addToUi();
  } catch (e) {
    Logger.log('Could not create menu: ' + e.toString());
  }
}

function menuSetupDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDashboardWithFormulas(ss, ss.getId() === MAIN_SPREADSHEET_ID);
  SpreadsheetApp.getUi().alert('✅ Dashboard configurado com fórmulas automáticas!');
}

function menuRefreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('📊 DASHBOARD');
  if (dashboard) {
    // Force refresh by getting a cell
    dashboard.getRange('A1').getValue();
    SpreadsheetApp.getUi().alert('✅ Dashboard atualizado!\n\nNota: As fórmulas atualizam automaticamente quando os dados mudam.');
  } else {
    SpreadsheetApp.getUi().alert('⚠️ Dashboard não encontrado. Use "Configurar Dashboard" primeiro.');
  }
}

function menuShowStructure() {
  const structure = getFullStructure();
  const ui = SpreadsheetApp.getUi();
  
  let message = '📁 ESTRUTURA MAKTUB\n\n';
  message += '📗 Main: ' + structure.main.name + '\n\n';
  message += '🎵 Artistas:\n';
  
  Object.keys(structure.artists).forEach(artist => {
    message += '  • ' + artist;
    if (structure.artists[artist].projects.length > 0) {
      message += ' (' + structure.artists[artist].projects.length + ' projetos)';
    }
    message += '\n';
  });
  
  ui.alert('Estrutura', message, ui.ButtonSet.OK);
}

// ============================================
// INITIALIZATION
// ============================================

function initializeScript() {
  // Load saved project spreadsheets
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('PROJECT_SPREADSHEETS');
  if (saved) {
    PROJECT_SPREADSHEETS = JSON.parse(saved);
  }
  
  Logger.log('Script initialized with ' + Object.keys(PROJECT_SPREADSHEETS).length + ' projects');
}

// Run on script load
initializeScript();
