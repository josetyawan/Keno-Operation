export const rekapData = {
  olt: {
    title: "OLT All",
    headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"],
    rows: [
      { serviceArea: "BLORA", miniOlt: 6, olt: 15, grandTotal: 21 },
      { serviceArea: "JEPARA", miniOlt: 3, olt: 13, grandTotal: 16 },
      { serviceArea: "KUDUS", miniOlt: 14, olt: 12, grandTotal: 26 },
      { serviceArea: "PATI", miniOlt: 9, olt: 7, grandTotal: 16 },
      { serviceArea: "PURWODADI", miniOlt: 10, olt: 14, grandTotal: 24 },
      { serviceArea: "REMBANG", miniOlt: 7, olt: 6, grandTotal: 13 },
    ],
    totals: { miniOlt: 49, olt: 67, grandTotal: 116 }
  },
  odc: {
    title: "ODC All",
    headers: ["Service Area", "Jumlah ODC"],
    rows: [
      { serviceArea: "BLORA", jumlah: 43 },
      { serviceArea: "JEPARA", jumlah: 46 },
      { serviceArea: "KUDUS", jumlah: 79 },
      { serviceArea: "PATI", jumlah: 47 },
      { serviceArea: "PURWODADI", jumlah: 49 },
      { serviceArea: "REMBANG", jumlah: 22 },
    ],
    totals: { jumlah: 286 }
  },
  odp: {
    title: "ODP All",
    headers: ["Service Area", "Jumlah ODP"],
    rows: [
      { serviceArea: "BLORA", jumlah: 3712 },
      { serviceArea: "JEPARA", jumlah: 4649 },
      { serviceArea: "KUDUS", jumlah: 6883 },
      { serviceArea: "PATI", jumlah: 3880 },
      { serviceArea: "PURWODADI", jumlah: 3553 },
      { serviceArea: "REMBANG", jumlah: 2045 },
    ],
    totals: { jumlah: 24722 }
  },
  ftm: {
    title: "FTM All",
    headers: ["Service Area", "EA", "OA", "Grand Total"],
    rows: [
      { serviceArea: "BLORA", ea: 6, oa: 6, grandTotal: 12 },
      { serviceArea: "JEPARA", ea: 4, oa: 5, grandTotal: 9 },
      { serviceArea: "KUDUS", ea: 3, oa: 5, grandTotal: 8 },
      { serviceArea: "PATI", ea: 4, oa: 4, grandTotal: 8 },
      { serviceArea: "PURWODADI", ea: 5, oa: 6, grandTotal: 11 },
      { serviceArea: "REMBANG", ea: 2, oa: 2, grandTotal: 4 },
    ],
    totals: { ea: 24, oa: 28, grandTotal: 52 }
  }
};
