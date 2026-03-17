'use server';

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

export async function sendProductivityRekap(
  input: z.infer<typeof sendProductivityRekapInputSchema>
): Promise<string> {
    // Manually format the message to match the desired output.
    let message = `Rekap Produktivitas Teknisi\n`;
    message += `Unit: ${input.unit}\n`;
    message += `Tanggal: ${input.date}\n`;
    message += `-------------------------\n\n`;

    // Ringkasan Produktivitas
    message += `Ringkasan Produktivitas\n`;
    message += `NAMA TEKNISI | PRODUKTIVITAS\n`;
    input.summaryData.forEach(item => {
        message += `${item.name} | ${item.productivity}\n`;
    });
    message += `\n-------------------------\n\n`;

    // Detail Produktivitas
    message += `Detail Produktivitas\n`;
    if (input.detailData.length > 0) {
      input.detailData.forEach(user => {
        // Start with a clean display name.
        let name = (user.userName || 'Unknown User').trim();
        
        // Sanitize the provided telegram username: remove '@', all spaces, and then trim.
        const cleanTelegramUsername = (user.telegramUsername || '').replace(/@/g, '').replace(/\s+/g, '').trim();

        // Now, remove any occurrence of the clean username from the display name to prevent duplication.
        if (cleanTelegramUsername) {
            const regex = new RegExp(cleanTelegramUsername, 'ig');
            name = name.replace(regex, '').trim();
        }

        // Final cleanup for any leftover characters like '@'.
        name = name.replace(/@/g, '').trim();

        // Construct the final line without bolding.
        let userLine = `\n${name}`;
        if (cleanTelegramUsername) {
            userLine += ` @${cleanTelegramUsername}`;
        }
        userLine += '\n';
        message += userLine;


        message += `TIKET | SERVICE | SEGMEN\n`;
        user.tickets.forEach(ticket => {
          message += `${ticket.ticket || '-'} | ${ticket.service || '-'} | ${ticket.segment || '-'}\n`;
        });
      });
    } else {
      message += `Tidak ada detail pekerjaan untuk dilaporkan.\n`;
    }

    return `<pre>${message.trim()}</pre>`;
}
