import type { Curriculum } from '../types.js';
import { basics } from './basics.js';
import { communication } from './communication.js';
import { data } from './data.js';
import { oop } from './oop.js';

// The JavaScript sector, from syntax to OOP and script communication. It
// covers every lesson in the C# path, in its JavaScript form.
// Add it with: npm run db:curriculum -- javascript --admin <username>
export const javascript: Curriculum = {
  languageId: 2,
  quests: [...basics, ...data, ...oop, ...communication],
};
