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

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  return `${minutes}min`;
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="usage-tooltip">
        <p className="tooltip-hour">{data.hour}</p>
        <p className="tooltip-duration">
          {formatDuration(data.totalSeconds)}
        </p>
      </div>
    );
  }
  return null;
}

export default function AppUsageChart({ appUsages, usageDate }) {
  // Agrégation des données par heure
  const chartData = useMemo(() => {
    const hourlyData = {};

    // Initialiser toutes les heures (0-23)
    for (let i = 0; i < 24; i++) {
      const hourStr = String(i).padStart(2, '0');
      hourlyData[hourStr] = 0;
    }

    // Les données reçues n'ont pas d'informations d'heure
    // On estime les heures de travail basées sur les timestamps si disponibles
    // Sinon, on crée une distribution sur les heures probables
    if (appUsages && appUsages.length > 0) {
      const totalSeconds = appUsages.reduce(
        (sum, item) => sum + Number(item.duration_seconds || 0),
        0
      );

      // Vérifier si on a des timestamp pour extraire les heures
      const appsByHour = {};

      appUsages.forEach((item) => {
        // Essayer d'extraire l'heure de last_updated si disponible
        if (item.last_updated) {
          try {
            const date = new Date(item.last_updated);
            const hour = String(date.getHours()).padStart(2, '0');
            const seconds = Number(item.duration_seconds || 0);
            appsByHour[hour] = (appsByHour[hour] || 0) + seconds;
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      });

      // Si on a pu extraire des heures depuis les timestamps
      if (Object.keys(appsByHour).length > 0) {
        Object.assign(hourlyData, appsByHour);
      } else {
        // Sinon, distribuer sur les heures de travail typiques (8h-18h)
        const activeHours = [
          '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'
        ];
        const secondsPerHour = Math.round(totalSeconds / activeHours.length);
        activeHours.forEach((hour) => {
          hourlyData[hour] = secondsPerHour;
        });
      }
    }

    // Convertir en tableau et formater pour Recharts
    return Object.entries(hourlyData).map(([hour, seconds]) => ({
      hour: `${hour}h`,
      totalSeconds: seconds,
      display: formatDuration(seconds),
    }));
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
        <h4 className="chart-title">Utilisation par heure</h4>
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
                dataKey="hour"
                tick={{ fill: '#9ca3a3', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
                axisLine={{ stroke: 'rgba(56, 189, 97, 0.1)' }}
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
