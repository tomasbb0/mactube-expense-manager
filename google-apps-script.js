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

const MAIN_COLUMNS = ['id', 'date', 'artist', 'project', 'type', 'entity', 'investor', 'amount', 'notes', 'createdAt'];

function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : 'getAll';
    let result;
    switch(action) {
      case 'getAll':
      case 'getAllExpenses':
        result = { success: true, expenses: getAllExpenses() };
        break;
      default:
        result = { success: true, expenses: getAllExpenses() };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    Logger.log('=== POST REQUEST RECEIVED ===');
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('No data received');
    }
    const action = data.action;
    Logger.log('Action: ' + action);
    let result;
    switch(action) {
      case 'syncFromWebsite':
        const expenses = data.expenses || [];
        Logger.log('Syncing ' + expenses.length + ' expenses');
        result = syncFromWebsite(expenses);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
        if ((header === 'date' || header === 'createdAt') && value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        expense[header] = value;
      });
      expenses.push(expense);
    }
    return expenses;
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return [];
  }
}

function syncFromWebsite(expenses) {
  Logger.log('=== SYNC STARTED ===');
  if (!expenses || !Array.isArray(expenses)) {
    return { success: false, error: 'Invalid data', count: 0 };
  }
  if (expenses.length === 0) {
    return { success: true, count: 0, message: 'No expenses' };
  }
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.main);
    let sheet = ss.getSheetByName('Despesas');
    if (!sheet) {
      sheet = ss.insertSheet('Despesas');
      sheet.appendRow(MAIN_COLUMNS);
      sheet.getRange(1, 1, 1, MAIN_COLUMNS.length).setFontWeight('bold');
    } else {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }
    const rows = [];
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      const row = MAIN_COLUMNS.map(col => expense[col] || '');
      rows.push(row);
    }
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, MAIN_COLUMNS.length).setValues(rows);
    }
    Logger.log('Main sheet: ' + rows.length + ' rows');
    syncArtistSheets(expenses);
    return { success: true, count: expenses.length };
  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { success: false, error: error.toString(), count: 0 };
  }
}

function syncArtistSheets(expenses) {
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
      const artistExpenses = byArtist[artist];
      const byProject = {};
      artistExpenses.forEach(e => {
        const projectName = e.project || 'Sem Projeto';
        if (!byProject[projectName]) byProject[projectName] = [];
        byProject[projectName].push(e);
      });
      Object.keys(byProject).forEach(project => {
        let sheet = ss.getSheetByName(project);
        if (!sheet) sheet = ss.insertSheet(project);
        sheet.clear();
        sheet.appendRow(['TIPO', 'VALOR', 'DATA', 'ENTIDADE', 'INVESTIDOR', 'NOTAS', 'ID']);
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
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
        const lastRow = sheet.getLastRow();
        sheet.appendRow(['', '', '', '', '', 'TOTAL:', '=SUM(B2:B' + lastRow + ')']);
        sheet.getRange(lastRow + 1, 6, 1, 2).setFontWeight('bold');
      });
    } catch (e) {
      Logger.log('Error ' + artist + ': ' + e.toString());
    }
  });
}

function getTypeName(type) {
  const types = { combustivel: 'Combustível', alimentacao: 'Alimentação', alojamento: 'Alojamento', equipamento: 'Equipamento', producao: 'Produção', promocao: 'Promoção', transporte: 'Transporte', outros: 'Outros' };
  return types[type] || type || 'Outros';
}

function onOpen() { createSyncMenu(); }

function createSyncMenu() {
  try {
    SpreadsheetApp.getUi().createMenu('🔄 Maktub Sync')
      .addItem('📊 Criar Resumo', 'createSummary')
      .addToUi();
  } catch (e) {}
}

function createSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let summarySheet = ss.getSheetByName('RESUMO');
  if (!summarySheet) summarySheet = ss.insertSheet('RESUMO');
  else summarySheet.clear();
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
  let