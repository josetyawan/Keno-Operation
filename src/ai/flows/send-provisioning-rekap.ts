
'use server';

import { z } from 'zod';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const orderDetailSchema = z.object({
    scOrder: z.string(),
    customerName: z.string(),
    assignedTo_userName: z.string().optional(),
});

const provisioningRekapSchema = z.object({
  kendalaOrders: z.array(orderDetailSchema),
  inProgressOrders: z.array(orderDetailSchema),
  selesaiOrders: z.array(orderDetailSchema),
});

export async function sendProvisioningRekap(
  input: z.infer<typeof provisioningRekapSchema>
): Promise<string> {
    const today = format(new Date(), 'eeee, dd MMMM yyyy', { locale: idLocale });
    let message = `📊 <b>Rekap Harian Provisioning</b>\n`;
    message += `🗓️ ${today}\n\n`;

    const formatOrderList = (orders: z.infer<typeof orderDetailSchema>[]) => {
        if (orders.length === 0) return 'Tidak ada.\n';
        return orders.map(o => `- ${o.scOrder} (${o.customerName}) - ${o.assignedTo_userName || 'Belum ditugaskan'}`).join('\n') + '\n';
    };

    message += `—--------------------------------—\n`;
    message += `⚠️ <b>Kendala:</b> (${input.kendalaOrders.length} order)\n`;
    message += formatOrderList(input.kendalaOrders);
    message += `\n`;

    message += `🚚 <b>Sedang Dikerjakan:</b> (${input.inProgressOrders.length} order)\n`;
    message += formatOrderList(input.inProgressOrders);
    message += `\n`;

    message += `✅ <b>Selesai:</b> (${input.selesaiOrders.length} order)\n`;
    message += formatOrderList(input.selesaiOrders);
    message += `—--------------------------------—\n\n`;
    message += `Tetap semangat! 💪`;
    
    return message;
}
