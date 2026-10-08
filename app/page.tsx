import holdingsData from '@/data/holdings.json';
import type { Holding } from '@/types/holding';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  return (
    <main className="flex-1 pb-10">
      <Dashboard holdings={holdingsData as Holding[]} />
    </main>
  );
}
