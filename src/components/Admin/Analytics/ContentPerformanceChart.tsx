
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ContentPerformanceChartProps {
  dateRange: string;
}

const ContentPerformanceChart: React.FC<ContentPerformanceChartProps> = ({ dateRange }) => {
  // Mock data based on date range
  const getData = () => {
    // Base data structure - actual values would vary by date range in a real app
    return [
      {
        name: 'Headliners',
        views: 4000,
        comments: 240,
        engagement: 24,
      },
      {
        name: 'Debates',
        views: 3000,
        comments: 320,
        engagement: 27,
      },
      {
        name: 'Spice It Up',
        views: 2000,
        comments: 180,
        engagement: 20,
      },
      {
        name: 'Storyboard',
        views: 2780,
        comments: 190,
        engagement: 21,
      },
      {
        name: 'School News',
        views: 1890,
        comments: 160,
        engagement: 19,
      },
      {
        name: 'Learning',
        views: 2390,
        comments: 210,
        engagement: 22,
      },
      {
        name: 'Neighborhood',
        views: 3490,
        comments: 290,
        engagement: 25,
      },
    ];
  };

  // Adjust data based on the date range
  const getDataForRange = () => {
    const baseData = getData();
    const multiplier = dateRange === '7d' ? 1 : 
                       dateRange === '30d' ? 4 : 
                       dateRange === '90d' ? 12 : 
                       24; // for yearly or all time
    
    return baseData.map(item => ({
      ...item,
      views: item.views * multiplier,
      comments: item.comments * multiplier,
    }));
  };

  const data = getDataForRange();

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="views" name="Total Views" fill="#8884d8" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="comments" name="Comments" fill="#82ca9d" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ContentPerformanceChart;
