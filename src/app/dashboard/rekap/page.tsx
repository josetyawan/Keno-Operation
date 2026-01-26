import { redirect } from 'next/navigation';

export default function OldRekapPage() {
  redirect('/dashboard/export');
  return null;
}
