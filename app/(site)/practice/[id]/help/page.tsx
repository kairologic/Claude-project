import HelpCenter from '@/components/dashboard/HelpCenter';

export default async function HelpPage({
  params,
}: {
  params: { id: string };
}) {
  return <HelpCenter practiceId={params.id} />;
}
