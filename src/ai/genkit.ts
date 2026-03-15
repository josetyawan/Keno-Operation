import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const googleAIGenkitPlugin = googleAI();

export const ai = genkit({
  plugins: [
    googleAIGenkitPlugin,
  ],
});
