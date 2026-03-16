'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const summaryDataItemSchema = z.object({
  name: z.string(),
  productivity: z.union([z.number(), z.string()]), // Can be a number or 'L' for Libur
});

const detailDataItemSchema = z.object({
  userName: z.string(),
  telegramUsername: z.string().optional(),
  tickets: z.array(z.object({
    id: z.string(),
    ticket: z.string(),
    service: z.string(),
    segment: z.string(),
  })),
});

const sendProductivityRekapInputSchema = z.object({
  unit: z.string(),
  date: z.string(),
  summaryData: z.array(summaryDataItemSchema),
  detailData: z.array(detailDataItemSchema),
});

const sendProductivityRekapFlow = ai.defineFlow(
  {
    name: 'sendProductivityRekapFlow',
    inputSchema: sendProductivityRekapInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // Manually format the message to match the desired output, bypassing the AI for now.
    let message = `*Rekap Produktivitas Teknisi*\n`;
    message += `*Unit:* ${input.unit}\n`;
    message += `*Tanggal:* ${input.date}\n`;
    message += `-------------------------\n\n`;

    // Ringkasan Produktivitas
    message += `*Ringkasan Produktivitas*\n`;
    message += `NAMA TEKNISI | PRODUKTIVITAS\n`;
    input.summaryData.forEach(item => {
        message += `${item.name} | ${item.productivity}\n`;
    });
    message += `\n-------------------------\n\n`;

    // Detail Produktivitas
    message += `*Detail Produktivitas*\n`;
    if (input.detailData.length > 0) {
      input.detailData.forEach(user => {
        message += `\n*${user.userName}* ${user.telegramUsername || ''}\n`;
        message += `TIKET | SERVICE | SEGMEN\n`;
        user.tickets.forEach(ticket => {
          message += `${ticket.ticket || '-'} | ${ticket.service || '-'} | ${ticket.segment || '-'}\n`;
        });
      });
    } else {
      message += `Tidak ada detail pekerjaan untuk dilaporkan.\n`;
    }

    return message.trim();
  }
);

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
  return sendProductivityRekapFlow(input);
}
