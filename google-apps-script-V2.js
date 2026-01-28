// ============================================
// GOOGLE APPS SCRIPT - MAKTUB EXPENSE SYNC V2
// ============================================
// CÓDIGO COMPLETO - COPIA TUDO PARA O APPS SCRIPT
// Inclui: Dashboard automático + Delete "Sheet 1"
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

// ============================================
// CLEANUP FUNCTIONS
// ============================================

// Delete "Sheet 1" or "Folha 1" from ALL spreadsheets
function deleteDefaultSheets() {
  Logger.log('=== DELETING DEFAULT SHEETS ===');
  
  // Delete from main sheet
  deleteSheetByName(SPREADSHEET_IDS.main, 'Main');
  
  // Delete from all artist sheets
  Object.keys(SPREADSHEET_IDS.artists).forEach(artist => {
    deleteSheetByName(SPREADSHEET_IDS.artists[artist], artist);
  });
  
  Logger.log('=== DEFAULT SHEETS CLEANUP COMPLETE ===');
}

function deleteSheetByName(spreadsheetId, label) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    
    // Names to delete (various languages)
    const namesToDelete = ['Sheet 1', 'Sheet1', 'Folha 1', 'Folha1', 'Hoja 1', 'Hoja1', 'Feuille 1'];
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      if (namesToDelete.includes(name)) {
        // Only delete if there are other sheets
        if (sheets.length > 1) {
          Logger.log('Deleting "' + name + '" from ' + label);
          ss.deleteSheet(sheet);
        } else {
          Logger.log('Cannot delete "' + name + '" from ' + label + ' - it\'s the only sheet');
        }
      }
    });
  } catch (e) {
    Logger.log('Error deleting sheet from ' + label + ': ' + e.toString());
  }
}

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
    sheet.appendRow(MAIN_COLUMNS);
    sheet.getRange(1, 1, 1, MAIN_COLUMNS.length).setFontWeight('bold');
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
// SYNC FROM WEBSITE
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
    // First, delete default sheets
    deleteDefaultSheets();
    
    // Open main spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('Despesas');
    
    if (!sheet) {
      Logger.log('Creating Despesas sheet');
      sheet = ss.insertSheet('Despesas');
      sheet.appendRow(MAIN_COLUMNS);
      sheet.getRange(1, 1, 1, MAIN_COLUMNS.length).setFontWeight('bold');
    } else {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        Logger.log('Clearing ' + (lastRow - 1) + ' existing rows');
        sheet.deleteRows(2, lastRow - 1);
      }
    }
    
    // Add all expenses to main sheet
    Logger.log('Adding expenses to main sheet...');
    const rows = [];
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      const row = MAIN_COLUMNS.map(col => expense[col] || '');
      rows.push(row);
    }
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, MAIN_COLUMNS.length).setValues(rows);
    }
    
    Logger.log('Main sheet updated with ' + rows.length + ' rows');
    
    // Update artist sheets
    Logger.log('Updating artist sheets...');
    syncArtistSheets(expenses);
    
    // Create dashboards for all sheets
    Logger.log('Creating dashboards...');
    createMainDashboard(expenses);
    createArtistDashboards(expenses);
    
    Logger.log('=== SYNC COMPLETED SUCCESSFULLY ===');
    return { success: true, count: expenses.length };
    
  } catch (error) {
    Logger.log('ERROR in syncFromWebsite: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { success: false, error: error.toString(), count: 0 };
  }
}

function syncArtistSheets(expenses) {
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = [];
    byArtist[e.artist].push(e);
  });
  
  Logger.log('Grouped into ' + Object.keys(byArtist).length + ' artists');
  
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
        const projectName = e.project || 'Sem Projeto';
        if (!byProject[projectName]) byProject[projectName] = [];
        byProject[projectName].push(e);
      });
      
      // Update each project sheet
      Object.keys(byProject).forEach(project => {
        let sheet = ss.getSheetByName(project);
        if (!sheet) {
          sheet = ss.insertSheet(project);
        }
        
        sheet.clear();
        sheet.appendRow(['TIPO', 'VALOR', 'DATA', 'ENTIDADE', 'INVESTIDOR', 'NOTAS', 'ID']);
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
        
        const projectExpenses = byProject[project];
        const rows = projectExpenses.map(expense => [
          getTypeName(expense.type),
          expense.amount,
          expense.date,
          expense.entity || '',
          expense.investor === 'maktub' ? 'Maktub' : 'Terceiros',
          expense.notes || '',
          expense.id
        ]);
        
        if (rows.length > 0) {
          sheet.getRange(2, 1, rows.length, 7).setValues(rows);
        }
        
        // Format columns
        sheet.getRange(2, 2, rows.length, 1).setNumberFormat('#,##0.00 €');
        
        // Add total row
        const lastRow = sheet.getLastRow();
        sheet.appendRow(['', '=SUM(B2:B' + lastRow + ')', '', '', '', 'TOTAL:', '']);
        const totalRow = sheet.getLastRow();
        sheet.getRange(totalRow, 1, 1, 7).setFontWeight('bold').setBackground('#e8f5e9');
        sheet.getRange(totalRow, 2, 1, 1).setNumberFormat('#,##0.00 €');
        
        // Auto-resize columns
        sheet.autoResizeColumns(1, 7);
      });
      
      Logger.log('Updated ' + Object.keys(byProject).length + ' projects for ' + artist);
      
    } catch (e) {
      Logger.log('Error updating artist sheet ' + artist + ': ' + e.toString());
    }
  });
}

// ============================================
// DASHBOARD CREATION
// ============================================

function createMainDashboard(expenses) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let dashboard = ss.getSheetByName('📊 DASHBOARD');
    
    if (!dashboard) {
      dashboard = ss.insertSheet('📊 DASHBOARD');
    } else {
      dashboard.clear();
    }
    
    // Move dashboard to first position
    ss.setActiveSheet(dashboard);
    ss.moveActiveSheet(1);
    
    // Calculate totals
    let totalMaktub = 0, totalOutros = 0;
    const byArtist = {};
    const byType = {};
    
    expenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      if (e.investor === 'maktub') totalMaktub += amount;
      else totalOutros += amount;
      
      // By artist
      if (!byArtist[e.artist]) byArtist[e.artist] = { maktub: 0, outros: 0 };
      if (e.investor === 'maktub') byArtist[e.artist].maktub += amount;
      else byArtist[e.artist].outros += amount;
      
      // By type
      const typeName = getTypeName(e.type);
      if (!byType[typeName]) byType[typeName] = 0;
      byType[typeName] += amount;
    });
    
    const total = totalMaktub + totalOutros;
    
    // Title
    dashboard.getRange('A1').setValue('📊 MAKTUB ART GROUP - DASHBOARD').setFontSize(18).setFontWeight('bold');
    dashboard.getRange('A2').setValue('Última atualização: ' + new Date().toLocaleString('pt-PT')).setFontColor('#666666');
    
    // Summary Cards
    dashboard.getRange('A4').setValue('RESUMO GERAL').setFontSize(14).setFontWeight('bold');
    
    dashboard.getRange('A5:B5').setValues([['Total Despesas', expenses.length]]);
    dashboard.getRange('A6:B6').setValues([['Valor Total', total]]);
    dashboard.getRange('A7:B7').setValues([['Maktub Investiu', totalMaktub]]);
    dashboard.getRange('A8:B8').setValues([['Terceiros Pagaram', totalOutros]]);
    dashboard.getRange('A9:B9').setValues([['Balanço (Maktub - Terceiros)', totalMaktub - totalOutros]]);
    
    dashboard.getRange('B6:B9').setNumberFormat('#,##0.00 €');
    dashboard.getRange('A5:A9').setFontWeight('bold');
    dashboard.getRange('B9').setFontWeight('bold');
    if (totalMaktub - totalOutros > 0) {
      dashboard.getRange('B9').setFontColor('#d32f2f'); // Artistas devem
    } else {
      dashboard.getRange('B9').setFontColor('#388e3c'); // Maktub deve
    }
    
    // Artist Table
    dashboard.getRange('A11').setValue('POR ARTISTA').setFontSize(14).setFontWeight('bold');
    dashboard.getRange('A12:D12').setValues([['Artista', 'Maktub', 'Terceiros', 'Total']]);
    dashboard.getRange('A12:D12').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    
    let row = 13;
    Object.keys(byArtist).sort().forEach(artist => {
      const data = byArtist[artist];
      dashboard.getRange('A' + row + ':D' + row).setValues([[
        artist,
        data.maktub,
        data.outros,
        data.maktub + data.outros
      ]]);
      row++;
    });
    
    // Total row for artists
    dashboard.getRange('A' + row + ':D' + row).setValues([['TOTAL', totalMaktub, totalOutros, total]]);
    dashboard.getRange('A' + row + ':D' + row).setFontWeight('bold').setBackground('#e8f5e9');
    dashboard.getRange('B13:D' + row).setNumberFormat('#,##0.00 €');
    
    // Type Table
    const typeStartRow = row + 3;
    dashboard.getRange('A' + typeStartRow).setValue('POR TIPO DE DESPESA').setFontSize(14).setFontWeight('bold');
    dashboard.getRange('A' + (typeStartRow + 1) + ':B' + (typeStartRow + 1)).setValues([['Tipo', 'Valor']]);
    dashboard.getRange('A' + (typeStartRow + 1) + ':B' + (typeStartRow + 1)).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    
    row = typeStartRow + 2;
    Object.keys(byType).sort((a, b) => byType[b] - byType[a]).forEach(type => {
      dashboard.getRange('A' + row + ':B' + row).setValues([[type, byType[type]]]);
      row++;
    });
    
    dashboard.getRange('A' + row + ':B' + row).setValues([['TOTAL', total]]);
    dashboard.getRange('A' + row + ':B' + row).setFontWeight('bold').setBackground('#e8f5e9');
    dashboard.getRange('B' + (typeStartRow + 2) + ':B' + row).setNumberFormat('#,##0.00 €');
    
    // Auto-resize
    dashboard.autoResizeColumns(1, 4);
    dashboard.setColumnWidth(1, 200);
    
    Logger.log('Main dashboard created');
    
  } catch (e) {
    Logger.log('Error creating main dashboard: ' + e.toString());
  }
}

function createArtistDashboards(expenses) {
  const byArtist = {};
  expenses.forEach(e => {
    if (!byArtist[e.artist]) byArtist[e.artist] = [];
    byArtist[e.artist].push(e);
  });
  
  Object.keys(byArtist).forEach(artist => {
    const artistSpreadsheetId = SPREADSHEET_IDS.artists[artist];
    if (!artistSpreadsheetId) return;
    
    try {
      const ss = SpreadsheetApp.openById(artistSpreadsheetId);
      let dashboard = ss.getSheetByName('📊 DASHBOARD');
      
      if (!dashboard) {
        dashboard = ss.insertSheet('📊 DASHBOARD');
      } else {
        dashboard.clear();
      }
      
      // Move to first position
      ss.setActiveSheet(dashboard);
      ss.moveActiveSheet(1);
      
      const artistExpenses = byArtist[artist];
      
      // Calculate totals
      let totalMaktub = 0, totalOutros = 0;
      const byProject = {};
      const byType = {};
      
      artistExpenses.forEach(e => {
        const amount = Number(e.amount) || 0;
        if (e.investor === 'maktub') totalMaktub += amount;
        else totalOutros += amount;
        
        // By project
        const proj = e.project || 'Sem Projeto';
        if (!byProject[proj]) byProject[proj] = { maktub: 0, outros: 0 };
        if (e.investor === 'maktub') byProject[proj].maktub += amount;
        else byProject[proj].outros += amount;
        
        // By type
        const typeName = getTypeName(e.type);
        if (!byType[typeName]) byType[typeName] = 0;
        byType[typeName] += amount;
      });
      
      const total = totalMaktub + totalOutros;
      
      // Title
      dashboard.getRange('A1').setValue('📊 ' + artist.toUpperCase() + ' - DASHBOARD').setFontSize(18).setFontWeight('bold');
      dashboard.getRange('A2').setValue('Última atualização: ' + new Date().toLocaleString('pt-PT')).setFontColor('#666666');
      
      // Summary
      dashboard.getRange('A4').setValue('RESUMO').setFontSize(14).setFontWeight('bold');
      dashboard.getRange('A5:B5').setValues([['Total Despesas', artistExpenses.length]]);
      dashboard.getRange('A6:B6').setValues([['Valor Total', total]]);
      dashboard.getRange('A7:B7').setValues([['Maktub Investiu', totalMaktub]]);
      dashboard.getRange('A8:B8').setValues([['Terceiros Pagaram', totalOutros]]);
      dashboard.getRange('A9:B9').setValues([['Balanço', totalMaktub - totalOutros]]);
      
      dashboard.getRange('B6:B9').setNumberFormat('#,##0.00 €');
      dashboard.getRange('A5:A9').setFontWeight('bold');
      dashboard.getRange('B9').setFontWeight('bold');
      if (totalMaktub - totalOutros > 0) {
        dashboard.getRange('B9').setFontColor('#d32f2f');
        dashboard.getRange('C9').setValue('← Artista deve à Maktub').setFontColor('#d32f2f');
      } else if (totalMaktub - totalOutros < 0) {
        dashboard.getRange('B9').setFontColor('#388e3c');
        dashboard.getRange('C9').setValue('← Maktub deve ao Artista').setFontColor('#388e3c');
      }
      
      // Project Table
      dashboard.getRange('A11').setValue('POR PROJETO').setFontSize(14).setFontWeight('bold');
      dashboard.getRange('A12:D12').setValues([['Projeto', 'Maktub', 'Terceiros', 'Total']]);
      dashboard.getRange('A12:D12').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
      
      let row = 13;
      Object.keys(byProject).sort().forEach(proj => {
        const data = byProject[proj];
        dashboard.getRange('A' + row + ':D' + row).setValues([[
          proj,
          data.maktub,
          data.outros,
          data.maktub + data.outros
        ]]);
        row++;
      });
      
      dashboard.getRange('A' + row + ':D' + row).setValues([['TOTAL', totalMaktub, totalOutros, total]]);
      dashboard.getRange('A' + row + ':D' + row).setFontWeight('bold').setBackground('#e8f5e9');
      dashboard.getRange('B13:D' + row).setNumberFormat('#,##0.00 €');
      
      // Type Table
      const typeStartRow = row + 3;
      dashboard.getRange('A' + typeStartRow).setValue('POR TIPO').setFontSize(14).setFontWeight('bold');
      dashboard.getRange('A' + (typeStartRow + 1) + ':B' + (typeStartRow + 1)).setValues([['Tipo', 'Valor']]);
      dashboard.getRange('A' + (typeStartRow + 1) + ':B' + (typeStartRow + 1)).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
      
      row = typeStartRow + 2;
      Object.keys(byType).sort((a, b) => byType[b] - byType[a]).forEach(type => {
        dashboard.getRange('A' + row + ':B' + row).setValues([[type, byType[type]]]);
        row++;
      });
      
      dashboard.getRange('A' + row + ':B' + row).setValues([['TOTAL', total]]);
      dashboard.getRange('A' + row + ':B' + row).setFontWeight('bold').setBackground('#e8f5e9');
      dashboard.getRange('B' + (typeStartRow + 2) + ':B' + row).setNumberFormat('#,##0.00 €');
      
      // Auto-resize
      dashboard.autoResizeColumns(1, 4);
      dashboard.setColumnWidth(1, 200);
      
      Logger.log('Dashboard created for ' + artist);
      
    } catch (e) {
      Logger.log('Error creating dashboard for ' + artist + ': ' + e.toString());
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
  return types[type] || type || 'Outros';
}

// ============================================
// GOOGLE SHEETS MENU
// ============================================

function onOpen() {
  createSyncMenu();
}

function createSyncMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 Maktub Sync')
      .addItem('📊 Atualizar Dashboard', 'refreshDashboard')
      .addItem('🗑️ Limpar Folhas "Sheet 1"', 'deleteDefaultSheets')
      .addSeparator()
      .addItem('📤 Sincronizar para Website', 'syncToWebsiteUI')
      .addItem('📥 Importar do Website', 'syncFromWebsiteUI')
      .addToUi();
  } catch (e) {
    Logger.log('Could not create menu: ' + e.toString());
  }
}

function refreshDashboard() {
  const expenses = getAllExpenses();
  createMainDashboard(expenses);
  createArtistDashboards(expenses);
  SpreadsheetApp.getUi().alert('✅ Dashboards atualizados!');
}

function syncToWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  const expenses = getAllExpenses();
  
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastSync', JSON.stringify({
    timestamp: new Date().toISOString(),
    expenses: expenses
  }));
  
  ui.alert(
    '✅ Sincronização Preparada',
    expenses.length + ' despesas prontas.\n\nAbra o website e clique em "Sincronizar do Sheets".',
    ui.ButtonSet.OK
  );
}

function syncFromWebsiteUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'ℹ️ Importar do Website',
    'Para importar:\n\n1. Abra o website Maktub\n2. Clique em "Sincronizar para Sheets"',
    ui.ButtonSet.OK
  );
}

// ============================================
// TEST FUNCTION
// ============================================

function testSync() {
  const testExpenses = [
    {
      id: 'test_1',
      date: '2026-01-28',
      artist: 'MAR',
      project: 'Teste',
      type: 'producao',
      entity: 'Teste',
      investor: 'maktub',
      amount: 100,
      notes: 'Teste',
      createdAt: new Date().toISOString()
    }
  ];
  
  const result = syncFromWebsite(testExpenses);
  Logger.log('Test result: ' + JSON.stringify(result));
}
