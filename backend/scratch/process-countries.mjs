import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFlagEmoji = (countryCode) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const inputPath = '/Users/jitkumarsaha/.gemini/antigravity/brain/6987c64a-fb02-4ec4-9de1-d6a93a3db1b0/.system_generated/steps/856/content.md';
const outputPath = path.resolve(__dirname, '../../src/data/country-dial-codes.ts');

try {
  const content = fs.readFileSync(inputPath, 'utf8');
  // Find the JSON block starting with '['
  const jsonStart = content.indexOf('[');
  if (jsonStart === -1) {
    throw new Error('No JSON block found');
  }
  const jsonText = content.substring(jsonStart).trim();
  const rawCountries = JSON.parse(jsonText);

  console.log(`Parsed ${rawCountries.length} countries.`);

  const processed = rawCountries.map((c) => {
    let flag = '';
    try {
      flag = getFlagEmoji(c.code);
    } catch (e) {
      console.warn(`Could not generate flag for ${c.code}`);
    }
    return {
      name: c.name,
      dial_code: c.dial_code,
      code: c.code,
      flag: flag
    };
  });

  const fileContent = `// Auto-generated country dial codes list
export interface CountryDialCode {
  name: string;
  dial_code: string;
  code: string;
  flag: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = ${JSON.stringify(processed, null, 2)};
`;

  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`Successfully wrote to ${outputPath}`);
} catch (err) {
  console.error('Processing failed:', err);
}
