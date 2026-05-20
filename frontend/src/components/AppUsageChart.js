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
        <p className="tooltip-hour">{data.appName}</p>
        <p className="tooltip-duration">
          {formatDuration(data.totalSeconds)}
        </p>
      </div>
    );
  }
  return null;
}

export default function AppUsageChart({ appUsages, usageDate }) {
  // Graphe exact: la donnée disponible est le total par application et par jour.
  const chartData = useMemo(() => {
    return [...(appUsages || [])]
      .map((item) => ({
        appName: item.app_name || 'Unknown',
        totalSeconds: Number(item.duration_seconds || 0),
        display: formatDuration(item.duration_seconds),
      }))
      .filter((item) => item.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 10);
  }, [appUsages]);

  // Calcul du temps total
  const totalSeconds = useMemo(() => {
    return appUsages.reduce(
      (sum, item) => sum + Number(item.duration_seconds || 0),
      0
    );
  }, [appUsages]);

  return (
    <div className="app-usage-dashboard">
      {/* Total Usage Summary */}
      <div className="usage-summary">
        <div className="summary-card">
          <h4> Temps total d'utilisation</h4>
          <p className="total-time">{formatDuration(totalSeconds)}</p>
          <p className="summary-subtitle">le {usageDate}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="chart-container">
        <h4 className="chart-title">Top applications utilisées</h4>
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
                dataKey="appName"
                tick={{ fill: '#9ca3a3', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                axisLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={80}
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
