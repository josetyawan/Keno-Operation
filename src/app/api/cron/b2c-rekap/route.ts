
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork, ProvisioningRecord } from '@/lib/types';
import { triggerB2cRekapAction } from '@/app/actions/triggerB2cRekapAction';

export const dynamic = 'force-dynamic';

const units = ['B2C', 'B2B', 'MTC', 'Provisioning'];

async function processUnit(unit: string, firestore: any) {
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(new Date());
    const isSingleDay = true;

    async function fetchCollection<T>(collectionName: string, constraints: any[] = []): Promise<T[]> {
        const ref = collection(firestore, collectionName);
        const q = query(ref, ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    }

    let schedules: Schedule[] = [];
    if (isSingleDay) {
        schedules = await fetchCollection<Schedule>('schedules', [
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        ]);
    }
    
    const [allApprovedUsers, riwayatList, otherWorks, provisioningList] = await Promise.all([
        fetchCollection<UserProfile>('users', [where('registrationStatus', '==', 'approved')]),
        fetchCollection<RiwayatGangguan>('riwayat-gangguan', [
            where('tanggalClose', '>=', Timestamp.fromDate(startDate)),
            where('tanggalClose', '<=', Timestamp.fromDate(endDate))
        ]),
        fetchCollection<OtherWork>('other-works', [
            where('tanggalSelesai', '>=', Timestamp.fromDate(startDate)),
            where('tanggalSelesai', '<=', Timestamp.fromDate(endDate))
        ]),
         fetchCollection<ProvisioningRecord>('provisioning-records', [
            where('completedAt', '>=', Timestamp.fromDate(startDate)),
            where('completedAt', '<=', Timestamp.fromDate(endDate))
        ])
    ]);
    
    const unitUsers = allApprovedUsers.filter(u => u.unit?.trim().toUpperCase() === unit.toUpperCase());

    const scheduleMap = new Map(schedules.map(s => [s.userId, s.shiftType]));
    const productivityMap = new Map<string, number>();

    const unitUserNiks = new Set(unitUsers.map(u => u.nik).filter(Boolean));
    const nikToUserIdMap = new Map(unitUsers.map(u => [u.nik, u.id]));

    [...riwayatList, ...otherWorks].forEach(item => {
        if (item.nik && unitUserNiks.has(item.nik)) {
            const userId = nikToUserIdMap.get(item.nik);
            if (userId) {
               productivityMap.set(userId, (productivityMap.get(userId) || 0) + 1);
            }
        }
    });

    provisioningList.forEach(item => {
        const mainTechId = item.assignedTo_userId;
        const crewTechId = item.assignedTo_crew_userId;
        const mainTechInUnit = unitUsers.some(u => u.id === mainTechId);
        if (mainTechId && mainTechInUnit) {
            if (crewTechId) {
                productivityMap.set(mainTechId, (productivityMap.get(mainTechId) || 0) + 0.5);
                const crewTechInUnit = unitUsers.some(u => u.id === crewTechId);
                if (crewTechInUnit) {
                    productivityMap.set(crewTechId, (productivityMap.get(crewTechId) || 0) + 0.5);
                }
            } else {
                productivityMap.set(mainTechId, (productivityMap.get(mainTechId) || 0) + 1);
            }
        }
    });

    const summaryData = unitUsers.map(user => {
        let productivity: number | 'L' = productivityMap.get(user.id) || 0;
        if (isSingleDay) {
            const userSchedule = scheduleMap.get(user.id);
            const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti' || userSchedule === 'ijin';
            if (isLibur) productivity = 'L';
        }
        return { name: (user.displayName || user.email).toUpperCase(), productivity: productivity };
    }).sort((a,b) => a.name.localeCompare(b.name));
    
    const productiveUsers = unitUsers.filter(user => (productivityMap.get(user.id) || 0) > 0);
    
    const detailData = productiveUsers.map(user => {
        const userRiwayat = riwayatList.filter(r => r.nik === user.nik);
        const userOtherWorks = otherWorks.filter(w => w.nik === user.nik);
        const userProvisioning = provisioningList.filter(p => p.assignedTo_userId === user.id || p.assignedTo_crew_userId === user.id);
        const tickets = [
            ...userRiwayat.map(r => ({ id: r.id, ticket: r.noTiket || '', service: r.noService || '', segment: r.jenisOrder })),
            ...userOtherWorks.map(w => ({ id: w.id, ticket: w.namaPekerjaan || '', service: '', segment: w.jenisOrder })),
            ...userProvisioning.map(p => ({ id: p.id, ticket: p.workorder || '', service: p.serviceNo || '', segment: p.crmOrder }))
        ];
        return { userName: user.displayName || user.email, telegramUsername: user.telegramUsername ? `@${user.telegramUsername.replace('@', '')}` : '', tickets };
    });

    if (summaryData.length > 0 || detailData.length > 0) {
        return triggerB2cRekapAction({ unit, summaryData, detailData });
    }
    return null;
}

export async function GET() {
  const { firestore } = initializeFirebase();
  const results: { unit: string; success: boolean; message?: string }[] = [];

  for (const unit of units) {
    try {
      const result = await processUnit(unit, firestore);
      if (result) {
        results.push({ unit, ...result });
      } else {
        results.push({ unit, success: true, message: 'Tidak ada data untuk dikirim.' });
      }
    } catch (error: any) {
      console.error(`Error processing unit ${unit} in cron job:`, error);
      results.push({ unit, success: false, message: error.message });
    }
  }

  const allSuccessful = results.every(r => r.success);
  
  return NextResponse.json({ 
    status: allSuccessful ? 'ok' : 'partial_error', 
    job: 'b2c-rekap',
    results 
  }, { status: allSuccessful ? 200 : 500 });
}
