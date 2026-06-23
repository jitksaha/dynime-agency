const fs = require('fs');

const filePath = '/Users/jitkumarsaha/.gemini/antigravity/brain/6987c64a-fb02-4ec4-9de1-d6a93a3db1b0/.system_generated/steps/1353/content.md';
const html = fs.readFileSync(filePath, 'utf8');

function stripHtml(htmlStr) {
  let text = htmlStr
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

const text = stripHtml(html);

const terms = ["sandbox", "test", "production", "live", "key", "sk_"];
terms.forEach(term => {
  const indices = [];
  let idx = text.indexOf(term);
  while (idx !== -1) {
    indices.push(idx);
    idx = text.indexOf(term, idx + 1);
  }
  console.log(`\n=================== TERM: ${term} (matches: ${indices.length}) ===================`);
  indices.forEach((pos, index) => {
    if (index < 5 || index > indices.length - 3) { // print first 5 and last 2
      console.log(`[Pos ${pos}]: ${text.substring(pos - 40, pos + 100)}`);
    }
  });
});
