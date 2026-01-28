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

const SETUP_CATEGORIES = ['Promoção', 'Tour', 'Concerto', 'Videoclipe', 'Geral', 'Gravação'];

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
  try {
    SpreadsheetApp.getUi().alert('✅ Todas as folhas "Sheet1" foram eliminadas!');
  } catch (e) {
    Logger.log('✅ Todas as folhas "Sheet1" foram eliminadas! (UI não disponível)');
  }
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
  try {
    SpreadsheetApp.getUi().alert('✅ Todos os dashboards foram criados com fórmulas automáticas!');
  } catch (e) {
    Logger.log('✅ Todos os dashboards foram criados com fórmulas automáticas! (UI não disponível)');
  }
}

function createDashboardWithFormulas_(spreadsheet, isMainSheet) {
  // Get or create dashboard
  let dashboard = spreadsheet.getSheetByName('📊 DASHBOARD');
  if (!dashboard) {
    dashboard = spreadsheet.insertSheet('📊 DASHBOARD', 0);
  } else {
    dashboard.clear();
  }
  
  // Get data sheet names (categorias)
  const allSheets = spreadsheet.getSheets();
  const dataSheetNames = allSheets
    .map(s => s.getName())
    .filter(name => !name.includes('DASHBOARD') && !name.includes('Sheet') && !name.includes('Folha'));
  
  // Get spreadsheet name for title
  const ssName = spreadsheet.getName().toUpperCase();
  
  // Colors - estilo Google Sheets limpo
  const headerBgGreen = '#34a853';
  const headerBgRed = '#ea4335';
  const headerTextWhite = '#ffffff';
  const greenText = '#137333';
  const redText = '#c5221f';
  
  // Set column widths
  dashboard.setColumnWidth(1, 180);  // A - Labels
  dashboard.setColumnWidth(2, 120);  // B - Maktub/Valor
  dashboard.setColumnWidth(3, 120);  // C - Terceiros
  dashboard.setColumnWidth(4, 120);  // D - Total
  dashboard.setColumnWidth(5, 50);   // E - Espaço
  dashboard.setColumnWidth(6, 150);  // F - Extras
  
  // ====== TÍTULO ======
  dashboard.getRange('A1').setValue('📊 ' + ssName + ' - DASHBOARD')
    .setFontSize(18).setFontWeight('bold');
  dashboard.getRange('A2').setFormula('="Última atualização: "&TEXT(NOW(),"dd/MM/yyyy, HH:mm:ss")')
    .setFontSize(9).setFontColor('#666666');
  
  // ====== RESUMO (Linhas 4-9) ======
  dashboard.getRange('A4').setValue('RESUMO').setFontSize(12).setFontWeight('bold');
  
  dashboard.getRange('A5').setValue('Total Despesas');
  dashboard.getRange('A6').setValue('Valor Total');
  dashboard.getRange('A7').setValue('Maktub Investiu');
  dashboard.getRange('A8').setValue('Terceiros Pagaram');
  dashboard.getRange('A9').setValue('Balanço');
  
  // Fórmulas para RESUMO
  if (dataSheetNames.length > 0) {
    // Total Despesas = COUNTA de todas as folhas
    const countParts = dataSheetNames.map(name => `COUNTA('${name}'!A2:A)`);
    dashboard.getRange('B5').setFormula('=' + countParts.join('+'));
    
    // Valor Total = SOMA de todos os valores
    const sumAllParts = dataSheetNames.map(name => `SUM('${name}'!H2:H)`);
    dashboard.getRange('B6').setFormula('=' + sumAllParts.join('+'));
    dashboard.getRange('B6').setNumberFormat('#,##0.00 €');
    
    // Maktub Investiu = SUMIF onde Investidor contém "Maktub"
    const maktubParts = dataSheetNames.map(name => `SUMIF('${name}'!G2:G,"*Maktub*",'${name}'!H2:H)`);
    dashboard.getRange('B7').setFormula('=' + maktubParts.join('+'));
    dashboard.getRange('B7').setNumberFormat('#,##0.00 €');
    
    // Terceiros Pagaram = Total - Maktub
    dashboard.getRange('B8').setFormula('=B6-B7');
    dashboard.getRange('B8').setNumberFormat('#,##0.00 €');
    
    // Balanço = Maktub - Terceiros (positivo = artista deve)
    dashboard.getRange('B9').setFormula('=B7-B8');
    dashboard.getRange('B9').setNumberFormat('#,##0.00 €').setFontColor(greenText).setFontWeight('bold');
  }
  
  // Nota do balanço
  dashboard.getRange('C9').setFormula('=IF(B9>0,"← Artista deve à Maktub","← Maktub deve ao Artista")')
    .setFontColor(greenText).setFontSize(9);
  
  // ====== POR PROJETO/CATEGORIA (Linhas 11-19) ======
  dashboard.getRange('A11').setValue('POR PROJETO/CATEGORIA').setFontSize(12).setFontWeight('bold');
  
  // Headers da tabela
  const projHeaders = ['Projeto', 'Maktub', 'Terceiros', 'Total'];
  dashboard.getRange('A12:D12').setValues([projHeaders])
    .setBackground(headerBgGreen).setFontColor(headerTextWhite).setFontWeight('bold');
  
  // Lista de categorias e fórmulas SUMIF
  const categories = ['Concerto', 'Geral', 'Gravação', 'Promoção', 'Tour', 'Videoclipe'];
  let projRow = 13;
  
  categories.forEach(cat => {
    dashboard.getRange('A' + projRow).setValue(cat);
    
    if (dataSheetNames.length > 0) {
      // Se a categoria existe como sheet, usa SUMIF dentro dela
      // Se não, tenta achar na coluna D (Projeto) de todas as sheets
      if (dataSheetNames.includes(cat)) {
        // Categoria existe como sheet - soma todos os valores dessa sheet onde Investidor = Maktub
        dashboard.getRange('B' + projRow).setFormula(`=SUMIF('${cat}'!G2:G,"*Maktub*",'${cat}'!H2:H)`);
        // Terceiros = Total dessa sheet - Maktub
        dashboard.getRange('C' + projRow).setFormula(`=SUM('${cat}'!H2:H)-B${projRow}`);
        // Total
        dashboard.getRange('D' + projRow).setFormula(`=SUM('${cat}'!H2:H)`);
      } else {
        // Categoria não existe como sheet - usa SUMIF na coluna Projeto de todas as sheets
        const maktubCatParts = dataSheetNames.map(name => `SUMIFS('${name}'!H2:H,'${name}'!D2:D,"*${cat}*",'${name}'!G2:G,"*Maktub*")`);
        const totalCatParts = dataSheetNames.map(name => `SUMIF('${name}'!D2:D,"*${cat}*",'${name}'!H2:H)`);
        dashboard.getRange('B' + projRow).setFormula('=' + maktubCatParts.join('+'));
        dashboard.getRange('C' + projRow).setFormula('=D' + projRow + '-B' + projRow);
        dashboard.getRange('D' + projRow).setFormula('=' + totalCatParts.join('+'));
      }
    }
    
    dashboard.getRange('B' + projRow + ':D' + projRow).setNumberFormat('#,##0.00 €');
    projRow++;
  });
  
  // TOTAL da tabela de categorias
  dashboard.getRange('A' + projRow).setValue('TOTAL').setFontWeight('bold');
  dashboard.getRange('B' + projRow).setFormula('=SUM(B13:B' + (projRow-1) + ')').setNumberFormat('#,##0.00 €').setFontWeight('bold');
  dashboard.getRange('C' + projRow).setFormula('=SUM(C13:C' + (projRow-1) + ')').setNumberFormat('#,##0.00 €').setFontWeight('bold');
  dashboard.getRange('D' + projRow).setFormula('=SUM(D13:D' + (projRow-1) + ')').setNumberFormat('#,##0.00 €').setFontWeight('bold');
  
  // ====== POR TIPO (Linhas 21+) ======
  const tipoStartRow = projRow + 3;
  dashboard.getRange('A' + tipoStartRow).setValue('POR TIPO').setFontSize(12).setFontWeight('bold');
  
  // Headers da tabela Tipo
  dashboard.getRange('A' + (tipoStartRow + 1) + ':B' + (tipoStartRow + 1)).setValues([['Tipo', 'Valor']])
    .setBackground(headerBgRed).setFontColor(headerTextWhite).setFontWeight('bold');
  
  // Lista de tipos de despesa
  const tipos = ['Produção', 'Promoção', 'Equipamento', 'Transporte', 'Alojamento', 'Outros', 'Combustível', 'Alimentação'];
  let tipoRow = tipoStartRow + 2;
  
  tipos.forEach(tipo => {
    dashboard.getRange('A' + tipoRow).setValue(tipo);
    
    if (dataSheetNames.length > 0) {
      // SUMIF na coluna Tipo (E) de todas as sheets
      const tipoParts = dataSheetNames.map(name => `SUMIF('${name}'!E2:E,"*${tipo}*",'${name}'!H2:H)`);
      dashboard.getRange('B' + tipoRow).setFormula('=' + tipoParts.join('+'));
    }
    
    dashboard.getRange('B' + tipoRow).setNumberFormat('#,##0.00 €');
    tipoRow++;
  });
  
  // TOTAL da tabela de tipos
  dashboard.getRange('A' + tipoRow).setValue('TOTAL').setFontWeight('bold');
  dashboard.getRange('B' + tipoRow).setFormula('=SUM(B' + (tipoStartRow + 2) + ':B' + (tipoRow-1) + ')').setNumberFormat('#,##0.00 €').setFontWeight('bold');
  
  // ====== FORMATAÇÃO FINAL ======
  // Bordas nas tabelas
  dashboard.getRange('A12:D' + (projRow)).setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
  dashboard.getRange('A' + (tipoStartRow + 1) + ':B' + tipoRow).setBorder(true, true, true, true, true, true, '#dadce0', SpreadsheetApp.BorderStyle.SOLID);
  
  // Zebra striping (cor alternada nas linhas)
  for (let i = 13; i < projRow; i += 2) {
    dashboard.getRange('A' + i + ':D' + i).setBackground('#f8f9fa');
  }
  for (let i = tipoStartRow + 3; i < tipoRow; i += 2) {
    dashboard.getRange('A' + i + ':B' + i).setBackground('#f8f9fa');
  }
  
  // Tab color verde
  dashboard.setTabColor('#34a853');
  
  // Mark as non-sync
  dashboard.getRange('A1').setNote('DASHBOARD - NÃO SINCRONIZAR - Usa fórmulas automáticas (SUMIF, COUNTA)');
  
  // Mover dashboard para primeira posição
  spreadsheet.setActiveSheet(dashboard);
  spreadsheet.moveActiveSheet(1);
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
  try {
    SpreadsheetApp.getUi().alert('✅ Estrutura de categorias criada em todas as spreadsheets!');
  } catch (e) {
    Logger.log('✅ Estrutura de categorias criada em todas as spreadsheets! (UI não disponível)');
  }
}

function createCategoriesInSpreadsheet_(ss, artistName) {
  const headers = ['ID', 'Data', 'Artista', 'Projeto', 'Tipo', 'Entidade', 'Investidor', 'Valor', 'Notas', 'CriadoEm'];
  
  SETUP_CATEGORIES.forEach(category => {
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
