
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UserActivityChartProps {
  dateRange: string;
}

const UserActivityChart: React.FC<UserActivityChartProps> = ({ dateRange }) => {
  // Mock data for user activity by time of day
  const data = [
    { time: '12 AM', users: 120 },
    { time: '2 AM', users: 80 },
    { time: '4 AM', users: 40 },
    { time: '6 AM', users: 100 },
    { time: '8 AM', users: 320 },
    { time: '10 AM', users: 500 },
    { time: '12 PM', users: 650 },
    { time: '2 PM', users: 700 },
    { time: '4 PM', users: 800 },
    { time: '6 PM', users: 950 },
    { time: '8 PM', users: 780 },
    { time: '10 PM', users: 350 },
  ];

  // In a real app, we would adjust data based on dateRange
  // For simplicity, we'll use the same data for all ranges here

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="users" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.3} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserActivityChart;
