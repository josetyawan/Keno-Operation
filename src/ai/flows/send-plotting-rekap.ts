
'use server';

import { z } from 'zod';
import type { ProvisioningRecord } from '@/lib/types';

const sendPlottingRekapInputSchema = z.object({
  orders: z.array(z.any()),
  dateHeader: z.string(),
});

const getStatusInfo = (status: ProvisioningRecord['provisioningStatus']) => {
    switch (status) {
        case 'assigned': return { emoji: '➡️', text: 'Ditugaskan' };
        case 'picked_up': return { emoji: '✅', text: 'Pickup' };
        case 'departed': return { emoji: '🚚', text: 'Berangkat' };
        case 'arrived': return { emoji: '📍', text: 'Tiba' };
        case 'wip_odp_done': return { emoji: '🛠️', text: 'Progres' };
        case 'kendala': return { emoji: '⚠️', text: 'Kendala' };
        default: return { emoji: '➡️', text: 'Ditugaskan' };
    }
};

const getShortName = (fullName?: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(p => p);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].toUpperCase();
  
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].length > 1) {
            return parts[i].toUpperCase();
        }
    }
    
    return parts[parts.length - 1].toUpperCase();
};

export async function sendPlottingRekap(
  input: z.infer<typeof sendPlottingRekapInputSchema>
): Promise<string> {
  
  const activeOrders = input.orders.filter(o => 
    o.provisioningStatus && 
    o.provisioningStatus !== 'completed' && 
    o.provisioningStatus !== 'cancelled' &&
    o.assignedTo_userName
  );

  const teams: Record<string, { teamName: string; orders: { scOrder: string; productName: string; statusEmoji: string; statusText: string; }[] }> = {};

  activeOrders.forEach(order => {
    if (!order.assignedTo_userName) return;

    const mainTechName = getShortName(order.assignedTo_userName);
    let teamName = mainTechName;

    if (order.assignedTo_crew_userName) {
      const crewName = getShortName(order.assignedTo_crew_userName);
      teamName += `-${crewName}`;
    }

    if (!teams[teamName]) {
      teams[teamName] = { teamName, orders: [] };
    }
    
    const { emoji, text } = getStatusInfo(order.provisioningStatus);

    teams[teamName].orders.push({
      scOrder: order.scOrder || 'NO_SC',
      productName: order.productName || 'No Product Info',
      statusEmoji: emoji,
      statusText: text,
    });
  });

  const sortedTeams = Object.values(teams).sort((a, b) => a.teamName.localeCompare(b.teamName));
  
  if (sortedTeams.length === 0) {
      return `Tidak ada teknisi yang ditugaskan untuk order aktif pada ${input.dateHeader}.`;
  }

  let message = `LEMBAR KERJA ${input.dateHeader}\n\n`;

  sortedTeams.forEach(team => {
    message += `${team.teamName}\n`;
    team.orders.forEach(order => {
      message += `${order.statusEmoji} ${order.statusText} ${order.scOrder} ${order.productName}\n`;
    });
    message += '\n';
  });

  return `<pre>${message.trim()}</pre>`;
}
