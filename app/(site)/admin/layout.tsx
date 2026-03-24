export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {children}
    </div>
  );
}
