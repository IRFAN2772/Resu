import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '../../prompts');

const promptCache = new Map<string, string>();

export function loadPrompt(name: string, variables?: Record<string, string>): string {
  if (!promptCache.has(name)) {
    const filePath = path.join(PROMPTS_DIR, `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt template not found: ${filePath}`);
    }
    promptCache.set(name, fs.readFileSync(filePath, 'utf-8'));
  }

  let prompt = promptCache.get(name)!;

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replaceAll(`{{${key}}}`, value);
    }
  }

  return prompt;
}
