import { forEach } from 'lodash';
import { useEffect, useState } from 'react';

export default function Holders() {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [holders, setHolders] = useState(0);

  // Note: the empty deps array [] means
  // this useEffect will run once
  // similar to componentDidMount()
  useEffect(() => {
    fetch('https://free-api.vestige.fi/asset/1035899249/holders')
      .then((res) => res.json())
      .then(
        (result) => {
          setIsLoaded(true);
          let holders = 0;
          for (let i = 0; i < result.length; i++) {
            holders = i;
          }
          setHolders(holders);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setIsLoaded(true);
          setError(error);
        }
      );
  }, []);

  return (
    <div className="mb-7 text-center font-medium tracking-tighter text-gray-900 dark:text-white xl:text-2xl 3xl:mb-8 3xl:text-[32px]">
      {holders}
    </div>
  );
}
