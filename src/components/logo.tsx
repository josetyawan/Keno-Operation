import { FileText } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-lg font-bold text-primary">
      <FileText className="h-6 w-6" />
      <h1 className="font-headline">NotaKu</h1>
    </div>
  );
}
