const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace String @id with String @id @default(uuid()) for VarChar(36) and Char(36)
const updatedSchema = schema.replace(
  /(\bid\s+String\s+@id)(\s+@db\.(?:Var)?Char\(36\))/g,
  '$1 @default(uuid())$2'
);

fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
console.log("Successfully added @default(uuid()) to String @id fields in schema.prisma");
