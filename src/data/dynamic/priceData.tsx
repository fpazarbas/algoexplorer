import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface Props {
  address?: string;
  assetId: string;
}

const PriceDataChart: React.FC<Props> = ({ address , assetId}) => {
  function CustomAxis({ x, y, payload }: any) {
    console.log(payload);
    const date = Number(getFormattedAxisDate(payload.value));
    if (date > 0) {
      return (
        <g
          transform={`translate(${x},${y})`}
          className="text-xs text-gray-500 md:text-sm"
        >
          <text x={0} y={0} dy={10} textAnchor="end" fill="currentColor">
            {date}
          </text>
        </g>
      );
    } else {
      return null;
    }
  }

  function getFormattedDate(value: number) {
    try {
      return format(new Date(value * 1000), 'd MMM');
    } catch (error) {
      return 0;
    }
  }

  function getFormattedAxisDate(value: number) {
    try {
      return format(new Date(value * 1000), 'd');
    } catch (error) {
      return 0;
    }
  }

  const numberAbbr = (number: any) => {
    if (number < 1e3) return number;
    if (number >= 1e3 && number < 1e6) return +(number / 1e3).toFixed(1) + 'K';
    if (number >= 1e6 && number < 1e9) return +(number / 1e6).toFixed(1) + 'M';
    if (number >= 1e9 && number < 1e12) return +(number / 1e9).toFixed(1) + 'B';
    if (number >= 1e12) return +(number / 1e12).toFixed(1) + 'T';
  };
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState([{ price: null, timestamp: null }]);
  let [timestamp, setDate] = useState(1624147200);

  let [liquidity, setLiquidity] = useState('547792029');
  let formattedDate = getFormattedDate(timestamp);
  const dailyLiquidity = numberAbbr(liquidity);
  // Note: the empty deps array [] means
  // this useEffect will run once
  // similar to componentDidMount()
  //"1678669200"
  useEffect(() => {
    const urlvestige = 'https://free-api.vestige.fi/asset/'+ assetId +'/prices/simple/7D';
    fetch(urlvestige)
      .then((res) => res.json())
      .then(
        (result) => {
          setIsLoaded(true);
          if (result.length > 0) {
            let everyThing: [{ price: any; timestamp: any }] = [
              { price: result[0].price, timestamp: result[0].timestamp },
            ];

            result.filter((item: { price: any; timestamp: any }) => {
              const date = new Date(item.timestamp * 1000);
              let hour = date.getHours();
              if (hour == 3) {
                everyThing.push(item);
                setLiquidity(item.price);
                setDate(item.timestamp);
              }
            });
            setItems(everyThing);
          }
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
    <div className="rounded-lg bg-white p-6 shadow-card dark:bg-light-dark sm:p-8">
      <h3 className="mb-1.5 text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400 sm:mb-2 sm:text-base">
        Price
      </h3>
      <div className="mb-1 text-base font-medium text-gray-900 dark:text-white sm:text-xl">
        {dailyLiquidity}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
        {formattedDate}
      </div>
      <div className="mt-5 h-64 sm:mt-8 2xl:h-72 3xl:h-[340px] 4xl:h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={items}
            margin={{
              top: 0,
              right: 0,
              left: 0,
              bottom: 0,
            }}
            onMouseMove={(data) => {
              if (data.isTooltipActive) {
                setDate(
                  data.activePayload && data.activePayload[0].payload.timestamp
                );
                setLiquidity(
                  data.activePayload && data.activePayload[0].payload.price
                );
              }
            }}
          >
            <defs>
              <linearGradient
                id="liquidity-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#bc9aff" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#7645D9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tick={<CustomAxis />}
              interval={0}
              tickMargin={1}
            />
            <Tooltip content={<></>} cursor={{ stroke: '#7645D9' }} />
            <Area
              type="linear"
              dataKey="price"
              stroke="#7645D9"
              strokeWidth={1.5}
              fill="url(#liquidity-gradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default PriceDataChart;
// export default function PriceDataChart() {
//   function CustomAxis({ x, y, payload }: any) {
//     console.log(payload);
//     const date = Number(getFormattedAxisDate(payload.value));
//     if (date > 0) {
//       return (
//         <g
//           transform={`translate(${x},${y})`}
//           className="text-xs text-gray-500 md:text-sm"
//         >
//           <text x={0} y={0} dy={10} textAnchor="end" fill="currentColor">
//             {date}
//           </text>
//         </g>
//       );
//     } else {
//       return null;
//     }
//   }

//   function getFormattedDate(value: number) {
//     try {
//       return format(new Date(value * 1000), 'd MMM');
//     } catch (error) {
//       return 0;
//     }
//   }

//   function getFormattedAxisDate(value: number) {
//     try {
//       return format(new Date(value * 1000), 'd');
//     } catch (error) {
//       return 0;
//     }
//   }

//   const numberAbbr = (number: any) => {
//     if (number < 1e3) return number;
//     if (number >= 1e3 && number < 1e6) return +(number / 1e3).toFixed(1) + 'K';
//     if (number >= 1e6 && number < 1e9) return +(number / 1e6).toFixed(1) + 'M';
//     if (number >= 1e9 && number < 1e12) return +(number / 1e9).toFixed(1) + 'B';
//     if (number >= 1e12) return +(number / 1e12).toFixed(1) + 'T';
//   };
//   const [error, setError] = useState(null);
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [items, setItems] = useState([{ price: null, timestamp: null }]);
//   let [timestamp, setDate] = useState(1624147200);

//   let [liquidity, setLiquidity] = useState('547792029');
//   let formattedDate = getFormattedDate(timestamp);
//   const dailyLiquidity = numberAbbr(liquidity);
//   // Note: the empty deps array [] means
//   // this useEffect will run once
//   // similar to componentDidMount()
//   //"1678669200"
//   useEffect(() => {
//     fetch('https://free-api.vestige.fi/asset/1035899249/prices/simple/7D')
//       .then((res) => res.json())
//       .then(
//         (result) => {
//           setIsLoaded(true);
//           if (result.length > 0) {
//             let everyThing: [{ price: any; timestamp: any }] = [
//               { price: result[0].price, timestamp: result[0].timestamp },
//             ];

//             result.filter((item: { price: any; timestamp: any }) => {
//               const date = new Date(item.timestamp * 1000);
//               let hour = date.getHours();
//               if (hour == 3) {
//                 everyThing.push(item);
//                 setLiquidity(item.price);
//                 setDate(item.timestamp);
//               }
//             });
//             setItems(everyThing);
//           }
//         },
//         // Note: it's important to handle errors here
//         // instead of a catch() block so that we don't swallow
//         // exceptions from actual bugs in components.
//         (error) => {
//           setIsLoaded(true);
//           setError(error);
//         }
//       );
//   }, []);

//   return (
//     <div className="rounded-lg bg-white p-6 shadow-card dark:bg-light-dark sm:p-8">
//       <h3 className="mb-1.5 text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400 sm:mb-2 sm:text-base">
//         Price
//       </h3>
//       <div className="mb-1 text-base font-medium text-gray-900 dark:text-white sm:text-xl">
//         {dailyLiquidity}
//       </div>
//       <div className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
//         {formattedDate}
//       </div>
//       <div className="mt-5 h-64 sm:mt-8 2xl:h-72 3xl:h-[340px] 4xl:h-[480px]">
//         <ResponsiveContainer width="100%" height="100%">
//           <AreaChart
//             data={items}
//             margin={{
//               top: 0,
//               right: 0,
//               left: 0,
//               bottom: 0,
//             }}
//             onMouseMove={(data) => {
//               if (data.isTooltipActive) {
//                 setDate(
//                   data.activePayload && data.activePayload[0].payload.timestamp
//                 );
//                 setLiquidity(
//                   data.activePayload && data.activePayload[0].payload.price
//                 );
//               }
//             }}
//           >
//             <defs>
//               <linearGradient
//                 id="liquidity-gradient"
//                 x1="0"
//                 y1="0"
//                 x2="0"
//                 y2="1"
//               >
//                 <stop offset="5%" stopColor="#bc9aff" stopOpacity={0.5} />
//                 <stop offset="100%" stopColor="#7645D9" stopOpacity={0} />
//               </linearGradient>
//             </defs>
//             <XAxis
//               dataKey="timestamp"
//               tickLine={false}
//               axisLine={false}
//               tick={<CustomAxis />}
//               interval={0}
//               tickMargin={1}
//             />
//             <Tooltip content={<></>} cursor={{ stroke: '#7645D9' }} />
//             <Area
//               type="linear"
//               dataKey="price"
//               stroke="#7645D9"
//               strokeWidth={1.5}
//               fill="url(#liquidity-gradient)"
//             />
//           </AreaChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// }
