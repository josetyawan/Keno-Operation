import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the plugin.
// You can customize this with your API key, etc.
// By default, it will use the GOOGLE_GENAI_API_KEY environment variable.
const googleAIGenkitPlugin = googleAI();

export const ai = genkit({
  plugins: [
    // Register the plugin with Genkit.
    // Use the 'googleai' prefix for models, e.g., 'googleai/gemini-pro'.
    googleAIGenkitPlugin,
  ],
});
