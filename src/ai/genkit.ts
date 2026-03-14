'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export {ai} from 'genkit/ai';
