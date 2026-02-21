
import type { NetworkAsset } from '@/lib/types';

// This mapping defines which STO codes belong to which Service Area.
const SA_CODE_MAPPING: Record<string, NetworkAsset['serviceArea']> = {
    'PWB': 'SA PURWODADI', 'PURWODADI': 'SA PURWODADI', 'WRO': 'SA PURWODADI', 'WIROSARI': 'SA PURWODADI', 'TRO': 'SA PURWODADI', 'TOROH': 'SA PURWODADI', 'GBU': 'SA PURWODADI', 'GUBUNG': 'SA PURWODADI', 'GDO': 'SA PURWODADI', 'GODONG': 'SA PURWODADI',
    'CEP': 'SA BLORA', 'CEPU': 'SA BLORA', 'BLO': 'SA BLORA', 'BLORA': 'SA BLORA', 'NGA': 'SA BLORA', 'NGAWEN': 'SA BLORA', 'RDB': 'SA BLORA', 'RANDUBLATUNG': 'SA BLORA',
    'KMJ': 'SA JEPARA', 'JEPARA': 'SA JEPARA', 'JPR': 'SA JEPARA', 'BAN': 'SA JEPARA', 'BANGSRI': 'SA JEPARA', 'KEL': 'SA JEPARA', 'KELING': 'SA JEPARA', 'PEC': 'SA JEPARA', 'PECANGAAN': 'SA JEPARA',
    'KUD': 'SA KUDUS', 'KUDUS': 'SA KUDUS', 'DMA': 'SA KUDUS', 'DEMAK': 'SA KUDUS',
    'PAT': 'SA PATI', 'PATI': 'SA PATI', 'TAY': 'SA PATI', 'JWN': 'SA PATI',
    'LSE': 'SA REMBANG', 'LASEM': 'SA REMBANG', 'RBN': 'SA REMBANG', 'REMBANG': 'SA REMBANG'
};

export const getAssetServiceArea = (asset: NetworkAsset): NetworkAsset['serviceArea'] | 'Unmap' => {
    // Handle NODE-B first based on siteId
    if (asset.assetType === 'NODE-B' && asset.siteId) {
        const upperSiteId = asset.siteId.toUpperCase();
        if (upperSiteId.includes('BLA')) return 'SA BLORA';
        if (upperSiteId.includes('JPA')) return 'SA JEPARA';
        if (upperSiteId.includes('DMK')) return 'SA KUDUS';
        if (upperSiteId.includes('KDS')) return 'SA KUDUS';
        if (upperSiteId.includes('GRO')) return 'SA PURWODADI';
        if (upperSiteId.includes('PAT')) return 'SA PATI';
        if (upperSiteId.includes('RBG')) return 'SA REMBANG';
        return 'Unmap'; // Important: Fallback for unmapped NODE-B
    }
    
    // Handle Mitratel based on its own serviceArea property
    if (asset.assetType === 'MITRATEL' && asset.serviceArea) {
      return asset.serviceArea as NetworkAsset['serviceArea'];
    }
    
    // Handle OLT, FTM, ODC, ODP, etc.
    const upperAssetName = (asset.name || '').toUpperCase();
    const upperSto = (asset.sto || '').toUpperCase().trim();

    // Check by asset name first
    for (const code in SA_CODE_MAPPING) {
        // Use a regex to avoid partial matches within words (e.g., 'PAT' in 'SEPATU')
        const regex = new RegExp(`[\\s-_]${code}[\\s-_]|^${code}[\\s-_]|[\\s-_]${code}$|^${code}$`);
        if (regex.test(upperAssetName)) {
            return SA_CODE_MAPPING[code];
        }
    }

    // If no match in name, check by STO code
    if (upperSto) {
       for (const code in SA_CODE_MAPPING) {
            if (upperSto.includes(code)) {
                return SA_CODE_MAPPING[code];
            }
        }
    }
    
    // Default fallback if no other rule matches for these asset types
    return 'SA KUDUS';
};
