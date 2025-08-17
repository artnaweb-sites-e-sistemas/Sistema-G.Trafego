import fs from 'fs';
import path from 'path';

// Função para remover console.log de um arquivo
function removeConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Regex para encontrar console.log statements
    // Captura console.log com diferentes formatos (com/sem espaços, com/sem parênteses)
    let newContent = content.replace(/console\.log\s*\([^)]*\);?\s*/g, '');
    newContent = newContent.replace(/console\.log\s*\([^)]*\)\s*/g, '');
    
    // Se o conteúdo mudou, salva o arquivo
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para processar diretórios recursivamente
function processDirectory(dirPath, extensions = ['.js', '.ts', '.tsx', '.jsx']) {
  let processedCount = 0;
  let modifiedCount = 0;
  
  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Pula node_modules e outros diretórios desnecessários
        if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
          walkDir(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          processedCount++;
          if (removeConsoleLogs(fullPath)) {
            modifiedCount++;
          }
        }
      }
    }
  }
  
  walkDir(dirPath);
  return { processedCount, modifiedCount };
}

// Executa o script


const startTime = Date.now();
const result = processDirectory('./src');

const endTime = Date.now();
const duration = (endTime - startTime) / 1000;






if (result.modifiedCount > 0) {
  
} else {
  
}
