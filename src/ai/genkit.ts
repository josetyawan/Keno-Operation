import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the plugin, explicitly setting the API version to v1.
const googleAIGenkitPlugin = googleAI({ apiVersion: 'v1' });

export const ai = genkit({
  plugins: [
    // Register the plugin with Genkit.
    googleAIGenkitPlugin,
  ],
});
