import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

function CustomAxis({ x, y, payload }: any) {
  const date = Number(getFormattedAxisDate(payload.value));
  return (
    <g transform={`translate(${x},${y})`} className="text-sm text-gray-500">
      <text x={0} y={0} dy={10} textAnchor="end" fill="currentColor">
        {date}
      </text>
    </g>
  );
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

export default function VolumeChart() {
  let [volume, setVolume] = useState('0');
  let [items, setItems] = useState([{ tvl: null, timestamp: null }]);
  let [timestamp, setDate] = useState(1624147200);
  let formattedDate = getFormattedDate(timestamp);
  const dailyVolume = numberAbbr(volume);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://free-api.vestige.fi/asset/1035899249/tvl/simple/30D')
      .then((res) => res.json())
      .then(
        (result) => {
          setIsLoaded(true);
          let everyThing: [{ tvl: any; timestamp: any }] = [
            { tvl: result[0].tvl, timestamp: result[0].timestamp },
          ];
          everyThing.shift();
          result.filter((item: { tvl: any; timestamp: any }) => {
            const date = new Date(item.timestamp * 1000);

            let hour = date.getHours();
            if (hour == 3) {
              everyThing.push(item);
              setVolume(item.tvl);
              setDate(item.timestamp);
            }
          });
          setItems(everyThing);
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
        Volume
      </h3>
      <div className="mb-1 text-base font-medium text-gray-900 dark:text-white sm:text-xl">
        {dailyVolume}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
        {formattedDate}
      </div>
      <div className="mt-5 h-56 sm:mt-8 md:mt-16 lg:mt-8 lg:h-64 2xl:h-72 3xl:h-[340px] 4xl:h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
                setVolume(
                  data.activePayload && data.activePayload[0].payload.tvl
                );
              }
            }}
          >
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tick={<CustomAxis />}
              interval={0}
              tickMargin={10}
            />
            <Tooltip
              content={<></>}
              cursor={{ strokeWidth: 0, fill: '#319DA5E0' }}
            />
            <Bar type="monotone" dataKey="tvl" fill="#1FC7D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
