const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '../prisma/schema.prisma.backup');
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

const backupContent = fs.readFileSync(backupPath, 'utf8');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

function parseModels(content) {
  const models = {};
  const modelRegex = /model\s+(\w+)\s*{/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const nameEnd = match.index + match[0].length - 1; // index of '{'
    
    let braceCount = 1;
    let index = nameEnd + 1;
    while (braceCount > 0 && index < content.length) {
      const char = content[index];
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      index++;
    }
    
    const fieldsText = content.slice(nameEnd + 1, index - 1);
    const fields = fieldsText.split('\n').map(line => line.trim()).filter(Boolean);
    models[modelName] = fields;
  }
  return models;
}

const backupModels = parseModels(backupContent);
const schemaModels = parseModels(schemaContent);

const modelNames = Object.keys(schemaModels);

let newSchemaContent = schemaContent;

// Rename verification_events/verification_logs in verification_requests model
newSchemaContent = newSchemaContent.replace(/verification_events\s+verification_events\[\]/g, 'events             verification_events[]');
newSchemaContent = newSchemaContent.replace(/verification_logs\s+verification_logs\[\]/g, 'logs               verification_logs[]');

// Rename verification_requests in verification_events/verification_logs models to request
newSchemaContent = newSchemaContent.replace(
  /(model\s+verification_events\s*{[\s\S]*?)verification_requests\s+verification_requests\s+@relation\((.*?)\)/,
  (m, g1, g2) => `${g1}request                 verification_requests @relation(${g2})`
);
newSchemaContent = newSchemaContent.replace(
  /(model\s+verification_logs\s*{[\s\S]*?)verification_requests\s+verification_requests\s+@relation\((.*?)\)/,
  (m, g1, g2) => `${g1}request                 verification_requests @relation(${g2})`
);

for (const modelName of Object.keys(schemaModels)) {
  if (modelName === 'verification_events' || modelName === 'verification_logs') {
    continue;
  }

  const schemaFields = schemaModels[modelName];
  const backupFields = backupModels[modelName];
  if (!backupFields) continue;

  const relationFieldsToAdd = [];
  for (const fieldLine of backupFields) {
    const parts = fieldLine.split(/\s+/);
    if (parts.length < 2) continue;
    const fieldName = parts[0];
    const fieldType = parts[1].replace('?', '').replace('[]', '');

    if (modelNames.includes(fieldType)) {
      if (modelName === 'verification_requests' && (fieldName === 'events' || fieldName === 'logs')) {
        const originalName = fieldName === 'events' ? 'verification_events' : 'verification_logs';
        const regex = new RegExp(`${originalName}\\s+${originalName}\\[\\]`);
        newSchemaContent = newSchemaContent.replace(regex, `${fieldName}             ${originalName}[]`);
        continue;
      }

      const alreadyExists = schemaFields.some(f => f.startsWith(fieldName + ' '));
      if (!alreadyExists) {
        let cleanLine = fieldLine;
        cleanLine = cleanLine.replace(/onDelete:\s+\w+,?/g, '');
        cleanLine = cleanLine.replace(/onUpdate:\s+\w+,?/g, '');
        cleanLine = cleanLine.replace(/,\s*\)/g, ')');
        cleanLine = cleanLine.replace(/\(\s*,/g, '(');
        cleanLine = cleanLine.replace(/@relation\(\s*\)/g, '');
        
        if (cleanLine.includes('@relation') && cleanLine.includes('fields:') && !cleanLine.includes('map:')) {
          cleanLine = cleanLine.replace(/@relation\((.*)\)/, (m, g1) => {
            let mapName = `${modelName}_${fieldName}_fk`;
            if (mapName.length > 60) {
              mapName = mapName.slice(0, 50) + '_' + Math.random().toString(36).substr(2, 5);
            }
            return `@relation(${g1}, map: "${mapName}")`;
          });
        }
        
        relationFieldsToAdd.push(cleanLine);
      }
    }
  }

  if (relationFieldsToAdd.length > 0) {
    console.log(`Adding relations to model ${modelName}:`, relationFieldsToAdd);
    const regex = new RegExp(`model\\s+${modelName}\\s*{`);
    const match = regex.exec(newSchemaContent);
    if (match) {
      const braceIdx = match.index + match[0].length - 1; // index of '{'
      
      let braceCount = 1;
      let index = braceIdx + 1;
      while (braceCount > 0 && index < newSchemaContent.length) {
        const char = newSchemaContent[index];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        index++;
      }
      
      const beforeClose = newSchemaContent.slice(0, index - 1);
      const afterClose = newSchemaContent.slice(index - 1);
      newSchemaContent = beforeClose + '  ' + relationFieldsToAdd.join('\n  ') + '\n' + afterClose;
    }
  }
}

fs.writeFileSync(schemaPath, newSchemaContent, 'utf8');
console.log("Successfully restored virtual relationships in schema.prisma!");
