import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TopBanner from '@/components/layout/TopBanner';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBanner />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
