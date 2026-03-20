'use server';

import { z } from 'zod';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const provisioningRekapSchema = z.object({
  antrianCount: z.number(),
  selesaiCount: z.number(),
  kendalaCount: z.number(),
});

export async function sendProvisioningRekap(
  input: z.infer<typeof provisioningRekapSchema>
): Promise<string> {
    const today = format(new Date(), 'eeee, dd MMMM yyyy', { locale: idLocale });
    let message = `📊 <b>Rekap Harian Provisioning</b>\n`;
    message += `🗓️ ${today}\n\n`;
    message += `—--------------------------------—\n`;
    message += `📥 <b>Antrian:</b> ${input.antrianCount} order\n`;
    message += `✅ <b>Selesai:</b> ${input.selesaiCount} order\n`;
    message += `⚠️ <b>Kendala:</b> ${input.kendalaCount} order\n`;
    message += `—--------------------------------—\n\n`;
    message += `Tetap semangat! 💪`;
    
    return message;
}
