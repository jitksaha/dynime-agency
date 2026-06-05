const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const filesToAudit = [];
const allTables = new Set();
const allStorageRefs = new Set();
const allFunctions = new Set();
const fileDetails = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (stat.isFile() && /\.(tsx|ts|jsx|js)$/.test(file)) {
      filesToAudit.push(filePath);
    }
  }
}

walkDir(srcDir);

for (const file of filesToAudit) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('supabase')) continue;

  const relativePath = path.relative(path.join(__dirname, '..'), file);
  const detail = {
    file: relativePath,
    tables: [],
    storage: [],
    functions: [],
    lines: []
  };

  // Look for supabase.from("...") or supabase.from('...')
  const fromRegex = /supabase\s*\.\s*from\s*\(\s*(['"`])(.*?)\1\s*\)/g;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    const table = match[2];
    detail.tables.push(table);
    allTables.add(table);
  }

  // Also capture dynamic supabase.from(xxx)
  const dynamicFromRegex = /supabase\s*\.\s*from\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((match = dynamicFromRegex.exec(content)) !== null) {
    const tableVar = `[dynamic: ${match[1]}]`;
    detail.tables.push(tableVar);
    allTables.add(tableVar);
  }

  // Look for supabase.storage.from("...") or supabase.storage.from('...')
  const storageRegex = /supabase\s*\.\s*storage\s*\.\s*from\s*\(\s*(['"`])(.*?)\1\s*\)/g;
  while ((match = storageRegex.exec(content)) !== null) {
    const bucket = match[2];
    detail.storage.push(bucket);
    allStorageRefs.add(bucket);
  }

  // Look for general supabase.storage calls
  if (content.includes('supabase.storage') && detail.storage.length === 0) {
    detail.storage.push('general storage usage');
    allStorageRefs.add('general storage usage');
  }

  // Look for supabase.functions.invoke("...") or supabase.functions.invoke('...')
  const fnRegex = /supabase\s*\.\s*functions\s*\.\s*invoke\s*\(\s*(['"`])(.*?)\1/g;
  while ((match = fnRegex.exec(content)) !== null) {
    const fnName = match[2];
    detail.functions.push(fnName);
    allFunctions.add(fnName);
  }

  // Look for general supabase.auth or other supabase calls
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('supabase.') && !line.includes('import')) {
      detail.lines.push({ lineNum: idx + 1, content: line.trim() });
    }
  });

  if (detail.tables.length > 0 || detail.storage.length > 0 || detail.functions.length > 0 || detail.lines.length > 0) {
    fileDetails.push(detail);
  }
}

console.log('=== AUDIT RESULT ===');
console.log(JSON.stringify({
  tables: Array.from(allTables),
  storage: Array.from(allStorageRefs),
  functions: Array.from(allFunctions),
  files: fileDetails
}, null, 2));
