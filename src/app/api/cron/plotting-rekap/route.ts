
import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { ProvisioningRecord } from '@/lib/types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { triggerPlottingRekapAction } from '@/app/actions/triggerPlottingRekapAction';

export const dynamic = 'force-dynamic';

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

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return d instanceof Date && !isNaN(d.valueOf()) ? d : null;
};


export async function GET() {
    try {
        const { firestore } = initializeFirebase();
        const recordsCollection = collection(firestore, 'provisioning-records');
        const q = query(recordsCollection);
        const snapshot = await getDocs(q);
        const allOrders = snapshot.docs.map(doc => doc.data() as ProvisioningRecord);
        
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const activeOrders = allOrders.filter(o => {
            if (o.provisioningStatus === 'completed') {
                const completedDate = safeToDate(o.completedAt);
                return completedDate && completedDate >= todayStart && completedDate <= todayEnd;
            }
            return o.provisioningStatus &&
                ['unassigned', 'assigned', 'picked_up', 'departed', 'arrived', 'wip_odp_done', 'kendala'].includes(o.provisioningStatus);
        });

        if (activeOrders.length === 0) {
            return NextResponse.json({ status: 'ok', message: 'Tidak ada order aktif untuk di-plot.' });
        }
        
        const payload = {
            allOrders: activeOrders,
            dateHeader: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: idLocale }),
        };

        const result = await triggerPlottingRekapAction(payload);
        
        if (!result.success) {
            throw new Error(result.message);
        }

        return NextResponse.json({ status: 'ok', sent: result.message });
    } catch (error: any) {
        console.error('Error in /api/cron/plotting-rekap:', error);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
