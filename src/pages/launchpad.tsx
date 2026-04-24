import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import Farms from '@/components/farms/farms';
import Launchpad from '@/components/launchpad/launchpad';

const LaunchPadPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo
        title="Farms"
        description="KOC - Algorand | Defi | Launcpad "
      />
      <Launchpad />
    </>
  );
};

LaunchPadPage.getLayout = function getLayout(page) {
  return <RootLayout>{page}</RootLayout>;
};

export default LaunchPadPage;