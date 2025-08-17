import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para processar um arquivo
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines = [];
    let skipNextLines = 0;
    let inMultiLineLog = false;
    let braceCount = 0;
    let parenthesisCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Se estamos pulando linhas, continue
      if (skipNextLines > 0) {
        skipNextLines--;
        continue;
      }

      // Verifica se é um console.log simples (uma linha)
      if (trimmedLine.startsWith('')) {
        // Console.log simples - remove completamente
        continue;
      }

      // Verifica se é início de console.log multi-linha
      if (trimmedLine.startsWith('')) {
        inMultiLineLog = true;
        braceCount = 0;
        parenthesisCount = 0;
        
        // Conta parênteses e chaves na primeira linha
        for (const char of line) {
          if (char === '(') parenthesisCount++;
          if (char === ')') parenthesisCount--;
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        // Se já fechou tudo na primeira linha, é um log simples
        if (parenthesisCount === 0 && braceCount === 0) {
          continue;
        }
        
        // Comenta a linha atual
        newLines.push('// ' + line);
        
        // Procura o fechamento
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          for (const char of nextLine) {
            if (char === '(') parenthesisCount++;
            if (char === ')') parenthesisCount--;
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          
          // Comenta a linha
          newLines.push('// ' + nextLine);
          
          // Se fechou tudo, para
          if (parenthesisCount === 0 && braceCount === 0) {
            break;
          }
          j++;
        }
        
        // Pula as linhas processadas
        skipNextLines = j - i;
        continue;
      }

      // Linha normal
      newLines.push(line);
    }

    // Escreve o arquivo processado
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
}

// Função para encontrar todos os arquivos .ts e .tsx
function findFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

// Executa o script
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);



for (const file of files) {
  processFile(file);
}


