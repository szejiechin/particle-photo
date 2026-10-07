import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination = path.resolve('tests/fixtures/acceptance');
await mkdir(destination, { recursive: true });

for (let index = 1; index <= 20; index += 1) {
  const response = await fetch(`https://picsum.photos/seed/particle-photo-${index}/640/480`);
  if (!response.ok) throw new Error(`Fixture ${index} failed with HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(path.join(destination, `image-${String(index).padStart(2, '0')}.jpg`), bytes);
}

console.log('Downloaded 20 acceptance fixtures.');
