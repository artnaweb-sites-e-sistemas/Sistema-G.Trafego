import fs from 'fs';
import path from 'path';

// Função para remover console.log simples de forma segura
function removeSimpleConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    let newContent = content;
    
    // Remove apenas console.log simples (uma linha, sem quebras de linha)
    // Regex que captura console.log seguido de parênteses e qualquer conteúdo até o ponto e vírgula
    newContent = newContent.replace(/^\s*console\.log\s*\([^)]*\);?\s*$/gm, '');
    
    // Remove console.log com strings simples
    newContent = newContent.replace(/^\s*console\.log\s*\(['"`][^'"`]*['"`]\);?\s*$/gm, '');
    
    // Remove console.log com template literals simples
    newContent = newContent.replace(/^\s*console\.log\s*`[^`]*`;?\s*$/gm, '');
    
    // Limpa linhas vazias extras
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
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
          if (removeSimpleConsoleLogs(fullPath)) {
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
