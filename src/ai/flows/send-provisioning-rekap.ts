
'use server';

import { z } from 'zod';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type ProvisioningRecord = any;
type ProvisioningCategory = 'IH' | 'ORBIT' | 'MO' | 'INDBZ' | 'MIGR' | 'DATIN/WIFI';

const provisioningRekapSchema = z.object({
  allOrders: z.array(z.any()),
  sektor: z.string(),
  dateHeader: z.string(),
});

const getProductCategory = (order: ProvisioningRecord): ProvisioningCategory => {
    const crmOrder = (order.crmOrder || '').toLowerCase();
    const productName = (order.productName || '').toLowerCase();
    const scOrder = (order.scOrder || '').toLowerCase();

    if (crmOrder.includes('indihome') || scOrder.startsWith('ao')) return 'IH';
    if (scOrder.startsWith('mo')) return 'MO';
    if (scOrder.startsWith('sc')) return 'INDBZ';
    if (scOrder.startsWith('pda')) return 'MIGR';
    if (productName.includes('orbit')) return 'ORBIT';
    
    return 'DATIN/WIFI';
};

export async function sendProvisioningRekap(
  input: z.infer<typeof provisioningRekapSchema>
): Promise<string> {
    const now = new Date();
    const updateTimestamp = format(now, 'dd/MM/yyyy HH:mm:ss');
    const dateHeader = input.dateHeader;

    let message = `📅 UPDATE: ${updateTimestamp}\n`;
    message += `📍 SEKTOR: ${input.sektor.toUpperCase()}\n\n`;
    message += `📆 ${dateHeader}\n`;

    const summary: Record<string, Record<ProvisioningCategory, number>> = {
        '✅ PS CLOSE         ': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
        '✳️ AKTIVASI         ': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
        '❌ BATAL            ': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
        '👫 KENDALA PELANGGAN': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
        '🛠 KENDALA TEKNIS   ': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
        '🕗 SISA ORDER       ': { IH: 0, ORBIT: 0, MO: 0, INDBZ: 0, MIGR: 0, 'DATIN/WIFI': 0 },
    };

    const detailRows: { emoji: string; scOrder: string; ket: string; status: ProvisioningRecord['provisioningStatus'] }[] = [];

    for (const order of input.allOrders) {
        const productCat = getProductCategory(order);
        
        let statusKey: keyof typeof summary = '🕗 SISA ORDER       ';
        let detailStatusInfo = { emoji: '🕗', ket: `SISA OR : ONPROGRESS ${order.crmOrder || 'ORDER'} H+1` };

        switch (order.provisioningStatus) {
            case 'completed':
                statusKey = '✅ PS CLOSE         ';
                detailStatusInfo = { emoji: '✅', ket: 'PS CLOSE MODIFY H+1' };
                break;
            case 'kendala':
                const notes = (order.kendalaNotes || '').toLowerCase();
                 if (notes.includes('pelanggan') || notes.includes('rfs') || notes.includes('cancel') || notes.includes('rumah kosong')) {
                    statusKey = '👫 KENDALA PELANGGAN';
                 } else {
                    statusKey = '🛠 KENDALA TEKNIS   ';
                 }
                break;
            default: // unassigned, assigned, picked_up, etc.
                statusKey = '🕗 SISA ORDER       ';
                detailStatusInfo = { emoji: '🕗', ket: `SISA OR : ONPROGRESS ${order.crmOrder || 'ORDER'} H+1` };
                break;
        }

        if (summary[statusKey]) {
            summary[statusKey][productCat]++;
        }
        
        if (order.provisioningStatus === 'completed' || (order.provisioningStatus && order.provisioningStatus !== 'kendala' && order.provisioningStatus !== 'unassigned')) {
             detailRows.push({
                ...detailStatusInfo,
                scOrder: order.scOrder,
                status: order.provisioningStatus,
            });
        }
    }

    // Format Summary Table
    message += 'STATUS           |  IH | ORBIT | MO | INDBZ | MIGR | DATIN/WIFI\n';
    for (const [status, counts] of Object.entries(summary)) {
        const { IH, ORBIT, MO, INDBZ, MIGR } = counts;
        const DATIN_WIFI = counts['DATIN/WIFI'];
        message += `${status}| ${String(IH).padStart(3, ' ')} | ${String(ORBIT).padStart(5, ' ')} | ${String(MO).padStart(3, ' ')} | ${String(INDBZ).padStart(5, ' ')} | ${String(MIGR).padStart(4, ' ')} | ${String(DATIN_WIFI).padStart(10, ' ')}\n`;
    }
    
    // Format Detail List
    message += `\n📌 DETAIL WO (${dateHeader})\n`;
    
    detailRows.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return a.scOrder.localeCompare(b.scOrder);
    });

    for (const row of detailRows) {
        message += `${row.emoji} ${row.scOrder} ${row.ket}\n`;
    }
    
    return `<pre>${message.trim()}</pre>`;
}
