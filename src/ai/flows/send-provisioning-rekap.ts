
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
    
    // Format the date to be in Asia/Jakarta timezone (WIB/UTC+7)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    };
    const formatter = new Intl.DateTimeFormat('en-GB', options); // en-GB for dd/mm/yyyy
    const updateTimestamp = formatter.format(now).replace(',', '');

    const dateHeader = input.dateHeader;

    const sektorMapping: { [key: string]: string } = {
        'KUDUS': 'KUD',
        'KDS': 'KUD',
        'DEMAK': 'DMA',
        'PURWODADI': 'PWD',
        'PATI': 'PTI',
        'JEPARA': 'JPR',
        'REMBANG': 'RBG',
        'BLORA': 'BLA',
    };
    const sektorUpper = input.sektor.toUpperCase();
    const sektorDisplay = sektorMapping[sektorUpper] || sektorUpper;


    let message = `📅 UPDATE: ${updateTimestamp}\n`;
    message += `📍 SEKTOR: ${sektorDisplay}\n\n`;
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
        
        let statusKey: keyof typeof summary | null = null;
        let detailStatusInfo: { emoji: string; ket: string } | null = null;
        
        const dateInfo = (order.bookingDate && order.bookingDate.trim() !== '') ? 'H+1' : 'HI';

        switch (order.provisioningStatus) {
            case 'completed':
                statusKey = '✅ PS CLOSE         ';
                detailStatusInfo = { emoji: '✅', ket: `${order.crmOrder || 'PS'} ${dateInfo}` };
                break;
            case 'cancelled':
                statusKey = '❌ BATAL            ';
                detailStatusInfo = { emoji: '❌', ket: `BATAL: ${order.kendalaNotes || order.crmOrder}` };
                break;
            case 'kendala':
                if (order.kendalaCategory === 'pelanggan') {
                   statusKey = '👫 KENDALA PELANGGAN';
                   detailStatusInfo = { emoji: '👫', ket: `KENDALA: ${order.kendalaNotes || order.crmOrder}` };
                } else {
                   statusKey = '🛠 KENDALA TEKNIS   ';
                   detailStatusInfo = { emoji: '🛠', ket: `KENDALA: ${order.kendalaNotes || order.crmOrder}` };
                }
                break;
            default: // unassigned, assigned, picked_up, etc.
                statusKey = '🕗 SISA ORDER       ';
                detailStatusInfo = { emoji: '🕗', ket: `SISA OR : ONPROGRESS ${order.crmOrder || 'ORDER'} ${dateInfo}` };
                break;
        }

        if (statusKey && summary[statusKey]) {
            summary[statusKey][productCat]++;
        }
        
        if (detailStatusInfo) {
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
        const getPriority = (status: string) => {
            if (status === 'completed') return 0;
            if (status === 'kendala') return 1;
            if (status === 'cancelled') return 2;
            return 3; // for 'unassigned', 'assigned', etc.
        }

        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        return a.scOrder.localeCompare(b.scOrder);
    });

    for (const row of detailRows) {
        message += `${row.emoji} ${row.scOrder} ${row.ket}\n`;
    }
    
    return `<pre>${message.trim()}</pre>`;
}
  
