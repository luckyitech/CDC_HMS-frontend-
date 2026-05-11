import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList, Cell, Label,
} from 'recharts';
import Card from './Card';

/**
 * Generic bar chart for analytics panels.
 *
 * Props:
 *   title        — card heading
 *   data         — array of objects
 *   xKey         — key for the category axis
 *   yKey         — key for the value axis
 *   color        — bar fill color
 *   unit         — suffix shown in tooltip AND bar labels (e.g. " min")
 *   layout       — 'vertical'   → horizontal bars (best for long category names)
 *                  'horizontal' → vertical bars   (best for short labels / many buckets)
 *   xAxisLabel   — text label below the X axis
 *   yAxisLabel   — text label beside the Y axis
 *   height       — chart height in px (default 300)
 *   tickFormatter — optional fn to format axis tick text
 *   emptyText    — message when data is empty
 */
const AnalyticsBarChart = ({
  title,
  data = [],
  xKey,
  yKey,
  color = '#0d9488',
  unit = '',
  layout = 'vertical',
  xAxisLabel = '',
  yAxisLabel = '',
  height = 300,
  tickFormatter,
  emptyText = 'No data available for this period.',
}) => {
  if (!data.length) {
    return (
      <Card title={title}>
        <p className="text-gray-400 text-sm text-center py-8">{emptyText}</p>
      </Card>
    );
  }

  // 'vertical' recharts layout → bars go left→right, categories on Y axis
  const isHorizontalBars = layout === 'vertical';

  // Auto-size Y axis width based on longest category label
  const longestLabel = Math.max(...data.map(d => String(d[xKey] ?? '').length));
  const yAxisWidth = isHorizontalBars ? Math.min(Math.max(longestLabel * 8, 100), 200) : 45;

  const tooltipStyle = {
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  };

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{
            top: 20,
            right: isHorizontalBars ? 70 : 20,
            left: isHorizontalBars ? 8 : 8,
            bottom: isHorizontalBars ? 30 : 50,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            horizontal={isHorizontalBars}
            vertical={!isHorizontalBars}
          />

          {isHorizontalBars ? (
            <>
              {/* Horizontal bars: categories on Y, values on X */}
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={tickFormatter}
                allowDecimals={false}
              >
                {xAxisLabel && (
                  <Label
                    value={xAxisLabel}
                    position="insideBottom"
                    offset={-12}
                    style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }}
                  />
                )}
              </XAxis>
              <YAxis
                dataKey={xKey}
                type="category"
                width={yAxisWidth}
                tick={{ fontSize: 12, fill: '#374151' }}
                tickLine={false}
                axisLine={false}
              >
                {yAxisLabel && (
                  <Label
                    value={yAxisLabel}
                    angle={-90}
                    position="insideLeft"
                    style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }}
                  />
                )}
              </YAxis>
            </>
          ) : (
            <>
              {/* Vertical bars: categories on X, values on Y */}
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 12, fill: '#374151' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={tickFormatter}
                interval={0}
              >
                {xAxisLabel && (
                  <Label
                    value={xAxisLabel}
                    position="insideBottom"
                    offset={-30}
                    style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }}
                  />
                )}
              </XAxis>
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={yAxisWidth}
              >
                {yAxisLabel && (
                  <Label
                    value={yAxisLabel}
                    angle={-90}
                    position="insideLeft"
                    offset={10}
                    style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }}
                  />
                )}
              </YAxis>
            </>
          )}

          <Tooltip
            formatter={(value) => [`${value}${unit}`, title]}
            contentStyle={tooltipStyle}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />

          <Bar
            dataKey={yKey}
            radius={isHorizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={44}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
            {/* Value label on each bar */}
            <LabelList
              dataKey={yKey}
              position={isHorizontalBars ? 'right' : 'top'}
              style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
              formatter={(v) => `${v}${unit}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default AnalyticsBarChart;
