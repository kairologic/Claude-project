import HelpCenter from '@/components/dashboard/HelpCenter';

export default async function HelpPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { section?: string };
}) {
  return <HelpCenter practiceId={params.id} initialSection={searchParams.section} />;
}
