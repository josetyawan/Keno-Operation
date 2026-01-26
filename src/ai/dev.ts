import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-nota.ts';
import '@/ai/flows/send-telegram-report.ts';
import '@/ai/flows/send-linkaja-payment.ts';
