import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './AppUsageChart.css';

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  }

  return `${remainingSeconds}s`;
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="usage-tooltip">
        <p className="tooltip-hour">{data.hourLabel}</p>
        <p className="tooltip-duration">
          {formatDuration(data.totalSeconds)}
        </p>
      </div>
    );
  }
  return null;
}

export default function AppUsageChart({ appUsages, usageDate }) {
  
  const chartData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      totalSeconds: 0,
    }));

    (appUsages || []).forEach((item) => {
      const hour = Number(item.hour);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
        hours[hour].totalSeconds += Number(item.duration_seconds || 0);
      }
    });

    return hours;
  }, [appUsages]);

  
  const totalSeconds = useMemo(() => {
    return appUsages.reduce(
      (sum, item) => sum + Number(item.duration_seconds || 0),
      0
    );
  }, [appUsages]);

  return (
    <div className="app-usage-dashboard">
      <div className="usage-summary">
        <div className="summary-card">
          <h4> Temps total d'utilisation</h4>
          <p className="total-time">{formatDuration(totalSeconds)}</p>
          <p className="summary-subtitle">le {usageDate}</p>
        </div>
      </div>

      <div className="chart-container">
        <h4 className="chart-title">Temps total d'utilisation par heure</h4>
        {appUsages.length === 0 ? (
          <div className="empty-chart">
            <p>Aucune donnée disponible pour cette date</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 97, 0.1)" />
              <XAxis
                dataKey="hourLabel"
                tick={{ fill: '#9ca3a3', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                axisLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                interval={1}
                height={45}
              />
              <YAxis
                label={{
                  value: 'Durée (secondes)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9ca3a3',
                  offset: 10,
                }}
                tick={{ fill: '#9ca3a3', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                axisLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56, 189, 97, 0.1)' }} />
              <Bar
                dataKey="totalSeconds"
                fill="#22c55e"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
