
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productivityWeights, type BobotItem } from '@/lib/bobot-produktivitas';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Shield } from 'lucide-react';

export default function BobotProduktivitasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Manajemen Bobot Produktivitas</h1>
      <p className="text-muted-foreground">
        Tabel ini berisi data acuan bobot untuk setiap jenis pekerjaan yang digunakan untuk menghitung produktivitas teknisi.
      </p>

      <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
        {Object.entries(productivityWeights).map(([category, items], index) => (
          <AccordionItem value={`item-${index}`} key={category}>
            <AccordionTrigger className="text-lg font-semibold flex items-center gap-2">
                <Shield />{category}
            </AccordionTrigger>
            <AccordionContent>
                <Card>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead>Jenis Order</TableHead>
                                <TableHead>Order Type</TableHead>
                                <TableHead className="text-center">Bobot</TableHead>
                                <TableHead className="text-center">SLA (Jam)</TableHead>
                                <TableHead className="text-center">Teknisi Ideal</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {items.map((item: BobotItem, itemIndex: number) => (
                                <TableRow key={`${category}-${itemIndex}`}>
                                <TableCell className="font-medium">{item.jenis_order_name}</TableCell>
                                <TableCell>{item.order_type || '-'}</TableCell>
                                <TableCell className="text-center">{item.bobot}</TableCell>
                                <TableCell className="text-center">{item.sla_hour || '-'}</TableCell>
                                <TableCell className="text-center">{item.teknisi_ideal || '-'}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
