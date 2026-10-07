import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = new Map([
  ['public/models/onnx-community/depth-anything-v2-small-ONNX/onnx/model_q4.onnx', '240aa10a7691795f238550b76ca45388c60f8509a449df83742924fba613a2d6'],
  ['public/models/onnx-community/depth-anything-v2-small-ONNX/onnx/model_q4.onnx_data', 'c85da8524066a1f7e8fdfe33501688d1b7226284b362ce22c00e650a6a51d652'],
]);

for (const [file, hash] of expected) {
  const actual = createHash('sha256').update(await readFile(file)).digest('hex');
  if (actual !== hash) throw new Error(`Model checksum mismatch: ${file}`);
}
console.log(`Verified ${expected.size} model assets.`);
