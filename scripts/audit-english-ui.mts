import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...await files(target));
    else if (/\.(tsx|html)$/.test(entry.name)) output.push(target);
  }
  return output;
}

const violations: string[] = [];
for (const file of await files(path.resolve('src/renderer'))) {
  const content = await readFile(file, 'utf8');
  if (/[㐀-鿿]/u.test(content)) violations.push(path.relative(process.cwd(), file));
}
if (violations.length) throw new Error(`Chinese UI text found in: ${violations.join(', ')}`);
console.log('English UI audit passed.');
