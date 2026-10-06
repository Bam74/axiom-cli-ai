import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function GroupedBars({
  data,
  series,
  height = 288,
  barColors,
}: {
  data: Array<Record<string, string | number>>
  series: { key: string; color: string }[]
  height?: number
  barColors?: string[]
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="#e5e5ea" />
          <XAxis dataKey="name" interval={0} angle={-28} textAnchor="end" height={72} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {series.length > 1 && <Legend />}
          {series.map((item, seriesIndex) => (
            <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[6, 6, 2, 2]}>
              {seriesIndex === 0 && barColors?.map((color, index) => <Cell key={`${item.key}-${index}`} fill={color} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
