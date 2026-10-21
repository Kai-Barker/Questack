import type { Curriculum } from '../types.js';
import { basics } from './basics.js';
import { collections } from './collections.js';
import { communication } from './communication.js';
import { oop } from './oop.js';

// The C# sector, from syntax to OOP and script communication.
// Add it with: npm run db:curriculum -- csharp --admin <username>
export const csharp: Curriculum = {
  languageId: 1,
  quests: [...basics, ...collections, ...oop, ...communication],
};
