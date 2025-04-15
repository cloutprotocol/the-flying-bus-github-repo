
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EngagementChartProps {
  dateRange: string;
}

const EngagementChart: React.FC<EngagementChartProps> = ({ dateRange }) => {
  // Mock data generator based on date range
  const generateData = () => {
    const data = [];
    let days: number;
    let labelFormat: string;
    
    switch (dateRange) {
      case '7d':
        days = 7;
        labelFormat = 'day';
        break;
      case '30d':
        days = 30;
        labelFormat = 'day';
        break;
      case '90d':
        days = 12; // show by weeks instead of all 90 days
        labelFormat = 'week';
        break;
      case '365d':
        days = 12;
        labelFormat = 'month';
        break;
      default:
        days = 12;
        labelFormat = 'month';
    }
    
    for (let i = 0; i < days; i++) {
      let label;
      if (labelFormat === 'day') {
        label = `Day ${i + 1}`;
      } else if (labelFormat === 'week') {
        label = `Week ${i + 1}`;
      } else {
        label = `Month ${i + 1}`;
      }
      
      // Generate some random but somewhat realistic data
      const baseViews = 200 + Math.floor(Math.random() * 300);
      const baseComments = 10 + Math.floor(Math.random() * 20);
      const baseVotes = 30 + Math.floor(Math.random() * 40);
      
      // Make the data trend upward slightly as time progresses
      const trendFactor = 1 + (i / days / 2); // subtle upward trend
      
      data.push({
        name: label,
        views: Math.floor(baseViews * trendFactor),
        comments: Math.floor(baseComments * trendFactor),
        votes: Math.floor(baseVotes * trendFactor),
      });
    }
    
    return data;
  };
  
  const data = generateData();

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            padding={{ left: 10, right: 10 }}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="views" 
            name="Page Views" 
            stroke="#8884d8" 
            activeDot={{ r: 8 }} 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="comments" 
            name="Comments" 
            stroke="#82ca9d" 
            activeDot={{ r: 6 }} 
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="votes" 
            name="Votes" 
            stroke="#ffc658" 
            activeDot={{ r: 6 }} 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EngagementChart;
