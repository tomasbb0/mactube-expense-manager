// ============================================
// GOOGLE APPS SCRIPT - SETUP ÚNICO (ONE-TIME)
// ============================================
// CORRE ESTE CÓDIGO APENAS UMA VEZ para:
// - Eliminar todas as folhas "Sheet1"
// - Criar os dashboards com fórmulas
// - Configurar a estrutura inicial
//
// NÃO COLOQUES ESTE CÓDIGO NO FICHEIRO PRINCIPAL!
// Cria um novo ficheiro no Apps Script chamado "Setup.gs"
// e corre as funções manualmente quando precisares.
// ============================================

// IDs das Spreadsheets
const SETUP_SPREADSHEET_IDS = {
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

// ============================================
// 🗑️ FUNÇÃO 1: ELIMINAR TODAS AS "SHEET1"
// ============================================
// Corre esta função para eliminar todas as folhas
// chamadas "Sheet1", "Folha1", etc.

function SETUP_deleteAllSheet1() {
  Logger.log('=== ELIMINAR TODAS AS SHEET1 ===');
  
  // Main sheet
  deleteSheet1FromSpreadsheet_(SETUP_SPREADSHEET_IDS.main, 'Main');
  
  // Artist sheets
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    deleteSheet1FromSpreadsheet_(SETUP_SPREADSHEET_IDS.artists[artist], artist);
  });
  
  Logger.log('=== CONCLUÍDO! Todas as Sheet1 eliminadas ===');
  SpreadsheetApp.getUi().alert('✅ Todas as folhas "Sheet1" foram eliminadas!');
}

function deleteSheet1FromSpreadsheet_(spreadsheetId, label) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    
    const namesToDelete = ['Sheet1', 'Sheet 1', 'Folha1', 'Folha 1', 'Hoja1', 'Hoja 1', 'Feuille 1', 'Feuille1', 'Blad1'];
    
    for (let i = sheets.length - 1; i >= 0; i--) {
      const sheet = sheets[i];
      const name = sheet.getName();
      
      if (namesToDelete.includes(name)) {
        if (ss.getSheets().length > 1) {
          Logger.log('A eliminar "' + name + '" de ' + label);
          ss.deleteSheet(sheet);
        } else {
          Logger.log('A renomear "' + name + '" para "Despesas" em ' + label + ' (única folha)');
          sheet.setName('Despesas');
        }
      }
    }
    Logger.log('✓ ' + label + ' - OK');
  } catch (e) {
    Logger.log('✗ Erro com ' + label + ': ' + e.toString());
  }
}

// ============================================
// 📊 FUNÇÃO 2: CRIAR DASHBOARDS COM FÓRMULAS
// ============================================
// Corre esta função para criar os dashboards
// que usam fórmulas automáticas (não sincronizados)

function SETUP_createAllDashboards() {
  Logger.log('=== CRIAR DASHBOARDS COM FÓRMULAS ===');
  
  // Main sheet
  try {
    const mainSS = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.main);
    createDashboardWithFormulas_(mainSS, true);
    Logger.log('✓ Main - Dashboard criado');
  } catch (e) {
    Logger.log('✗ Main - Erro: ' + e.toString());
  }
  
  // Artist sheets
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    try {
      const ss = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.artists[artist]);
      createDashboardWithFormulas_(ss, false);
      Logger.log('✓ ' + artist + ' - Dashboard criado');
    } catch (e) {
      Logger.log('✗ ' + artist + ' - Erro: ' + e.toString());
    }
  });
  
  Logger.log('=== CONCLUÍDO! Todos os dashboards criados ===');
  SpreadsheetApp.getUi().alert('✅ Todos os dashboards foram criados com fórmulas automáticas!');
}

function createDashboardWithFormulas_(spreadsheet, isMainSheet) {
  // Get or create dashboard
  let dashboard = spreadsheet.getSheetByName('📊 DASHBOARD');
  if (!dashboard) {
    dashboard = spreadsheet.insertSheet('📊 DASHBOARD', 0);
  } else {
    dashboard.clear();
  }
  
  // Get data sheet names
  const allSheets = spreadsheet.getSheets();
  const dataSheetNames = allSheets
    .map(s => s.getName())
    .filter(name => !name.includes('DASHBOARD') && !name.includes('Sheet') && !name.includes('Folha'));
  
  // Colors
  const headerFg = '#1db954';
  const textColor = '#e0e0e0';
  
  // Set column widths
  dashboard.setColumnWidth(1, 50);
  dashboard.setColumnWidth(2, 200);
  dashboard.setColumnWidth(3, 150);
  dashboard.setColumnWidth(4, 80);
  dashboard.setColumnWidth(5, 200);
  dashboard.setColumnWidth(6, 150);
  
  // Title
  dashboard.getRange('B2').setValue('📊 DASHBOARD').setFontSize(24).setFontWeight('bold').setFontColor(headerFg);
  dashboard.getRange('B3').setValue('Atualização automática via fórmulas').setFontSize(10).setFontColor('#888');
  
  // TOTAL GERAL
  dashboard.getRange('B5').setValue('💰 TOTAL GERAL').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  if (dataSheetNames.length > 0) {
    const sumParts = dataSheetNames.map(name => `SUMIF('${name}'!H:H, ">0")`);
    dashboard.getRange('C5').setFormula('=' + sumParts.join('+'));
  } else {
    dashboard.getRange('C5').setValue(0);
  }
  dashboard.getRange('C5').setNumberFormat('€#,##0.00').setFontSize(18).setFontWeight('bold').setFontColor('#fff');
  
  // RESUMO POR CATEGORIA
  dashboard.getRange('B7').setValue('📋 RESUMO POR CATEGORIA').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  let row = 8;
  dataSheetNames.forEach(sheetName => {
    dashboard.getRange('B' + row).setValue(sheetName).setFontColor(textColor);
    dashboard.getRange('C' + row).setFormula(`=SUMIF('${sheetName}'!H:H, ">0")`);
    dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor(textColor);
    
    if (dataSheetNames.length > 0) {
      dashboard.getRange('D' + row).setFormula(`=IFERROR(C${row}/C5*100, 0)`);
      dashboard.getRange('D' + row).setNumberFormat('0.0"%"').setFontColor('#888');
    }
    row++;
  });
  
  // RESUMO POR INVESTIDOR
  row += 2;
  dashboard.getRange('B' + row).setValue('👥 RESUMO POR INVESTIDOR').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  row++;
  
  dashboard.getRange('B' + row).setValue('Maktub').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const maktubParts = dataSheetNames.map(name => `SUMIF('${name}'!G:G, "*Maktub*", '${name}'!H:H)`);
    dashboard.getRange('C' + row).setFormula('=' + maktubParts.join('+'));
  }
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor('#ff6b6b');
  const maktubRow = row;
  row++;
  
  dashboard.getRange('B' + row).setValue('Outros (a receber)').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const outrosParts = dataSheetNames.map(name => `SUMIF('${name}'!G:G, "<>*Maktub*", '${name}'!H:H)`);
    dashboard.getRange('C' + row).setFormula('=' + outrosParts.join('+'));
  }
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontColor('#4ecdc4');
  row++;
  
  // BALANÇO
  row += 2;
  dashboard.getRange('B' + row).setValue('⚖️ BALANÇO').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  row++;
  
  dashboard.getRange('B' + row).setValue('Artista deve à Maktub:').setFontColor(textColor);
  dashboard.getRange('C' + row).setFormula(`=C${maktubRow}-C${maktubRow+1}`);
  dashboard.getRange('C' + row).setNumberFormat('€#,##0.00').setFontSize(16).setFontWeight('bold').setFontColor('#ffd93d');
  
  // ESTATÍSTICAS
  dashboard.getRange('E5').setValue('📈 ESTATÍSTICAS').setFontSize(14).setFontWeight('bold').setFontColor(headerFg);
  
  dashboard.getRange('E6').setValue('Total de registos:').setFontColor(textColor);
  if (dataSheetNames.length > 0) {
    const countParts = dataSheetNames.map(name => `COUNTA('${name}'!A:A)-1`);
    dashboard.getRange('F6').setFormula('=' + countParts.join('+'));
  }
  
  dashboard.getRange('E7').setValue('Última atualização:').setFontColor(textColor);
  dashboard.getRange('F7').setFormula('=NOW()').setNumberFormat('dd/MM/yyyy HH:mm');
  
  // Background
  dashboard.getRange('A1:G' + (row + 5)).setBackground('#0f0f23');
  
  // Mark as non-sync
  dashboard.getRange('A1').setNote('DASHBOARD - NÃO SINCRONIZAR - Usa fórmulas automáticas');
}

// ============================================
// 📂 FUNÇÃO 3: CRIAR ESTRUTURA DE CATEGORIAS
// ============================================
// Corre esta função para criar as tabs de categorias
// em todas as spreadsheets dos artistas

function SETUP_createCategoryStructure() {
  Logger.log('=== CRIAR ESTRUTURA DE CATEGORIAS ===');
  
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    try {
      const ss = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.artists[artist]);
      createCategoriesInSpreadsheet_(ss, artist);
      Logger.log('✓ ' + artist + ' - Categorias criadas');
    } catch (e) {
      Logger.log('✗ ' + artist + ' - Erro: ' + e.toString());
    }
  });
  
  Logger.log('=== CONCLUÍDO! Estrutura de categorias criada ===');
  SpreadsheetApp.getUi().alert('✅ Estrutura de categorias criada em todas as spreadsheets!');
}

function createCategoriesInSpreadsheet_(ss, artistName) {
  const headers = ['ID', 'Data', 'Artista', 'Projeto', 'Tipo', 'Entidade', 'Investidor', 'Valor', 'Notas', 'CriadoEm'];
  
  MADALENA_CATEGORIES.forEach(category => {
    let sheet = ss.getSheetByName(category);
    
    if (!sheet) {
      sheet = ss.insertSheet(category);
    }
    
    // Check if headers exist
    const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (firstRow[0] !== 'ID') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1a1a2e')
        .setFontColor('#1db954')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
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
  });
}

// ============================================
// 🚀 FUNÇÃO 4: SETUP COMPLETO (TUDO DE UMA VEZ)
// ============================================
// Corre esta função para fazer todo o setup inicial

function SETUP_runFullSetup() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '🚀 Setup Completo',
    'Isto vai:\n\n' +
    '1. Eliminar todas as folhas "Sheet1"\n' +
    '2. Criar estrutura de categorias\n' +
    '3. Criar dashboards com fórmulas\n\n' +
    'Queres continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('Setup cancelado.');
    return;
  }
  
  Logger.log('=== INÍCIO DO SETUP COMPLETO ===');
  
  // 1. Delete Sheet1
  Logger.log('--- Passo 1: Eliminar Sheet1 ---');
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    deleteSheet1FromSpreadsheet_(SETUP_SPREADSHEET_IDS.artists[artist], artist);
  });
  deleteSheet1FromSpreadsheet_(SETUP_SPREADSHEET_IDS.main, 'Main');
  
  // 2. Create categories
  Logger.log('--- Passo 2: Criar categorias ---');
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    try {
      const ss = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.artists[artist]);
      createCategoriesInSpreadsheet_(ss, artist);
    } catch (e) {
      Logger.log('Erro em categorias de ' + artist + ': ' + e.toString());
    }
  });
  
  // 3. Create dashboards
  Logger.log('--- Passo 3: Criar dashboards ---');
  try {
    const mainSS = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.main);
    createDashboardWithFormulas_(mainSS, true);
  } catch (e) {
    Logger.log('Erro no dashboard Main: ' + e.toString());
  }
  
  Object.keys(SETUP_SPREADSHEET_IDS.artists).forEach(artist => {
    try {
      const ss = SpreadsheetApp.openById(SETUP_SPREADSHEET_IDS.artists[artist]);
      createDashboardWithFormulas_(ss, false);
    } catch (e) {
      Logger.log('Erro no dashboard de ' + artist + ': ' + e.toString());
    }
  });
  
  Logger.log('=== SETUP COMPLETO TERMINADO ===');
  ui.alert('✅ Setup completo!\n\nTodas as spreadsheets foram configuradas com:\n• Categorias\n• Dashboards com fórmulas\n• Sem folhas "Sheet1"');
}

// ============================================
// MENU PARA GOOGLE SHEETS (SETUP)
// ============================================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔧 Setup Maktub')
      .addItem('🚀 Setup Completo (Recomendado)', 'SETUP_runFullSetup')
      .addSeparator()
      .addItem('🗑️ 1. Eliminar folhas "Sheet1"', 'SETUP_deleteAllSheet1')
      .addItem('📂 2. Criar categorias', 'SETUP_createCategoryStructure')
      .addItem('📊 3. Criar dashboards', 'SETUP_createAllDashboards')
      .addToUi();
  } catch (e) {
    Logger.log('Não foi possível criar menu: ' + e.toString());
  }
}
