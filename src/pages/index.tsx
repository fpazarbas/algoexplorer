import type { NextPageWithLayout } from '@/types';
import RootLayout from '@/layouts/_root-layout';
import ExplorerPage from './explorer';
// import ModernScreen from '@/components/screens/modern-screen';

const HomePage: NextPageWithLayout = () => {
  return (
    <>
      <ExplorerPage />
      {/* 
        <ModernScreen /> 
        (İleride Algo grafiği lazım olursa diye yoruma alındı)
      */}
    </>
  );
};

HomePage.getLayout = function getLayout(page) {
  return <RootLayout>{page}</RootLayout>;
};

export default HomePage;
