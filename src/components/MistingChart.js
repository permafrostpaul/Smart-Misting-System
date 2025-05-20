import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register required chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MistingChart() {
  const [dateRange, setDateRange] = useState("today");
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const generateMockData = () => {
    const now = new Date();
    const logs = [];

    if (dateRange === "today") {
      for (let i = 0; i < 6; i++) {
        const time = new Date(now.getTime() - i * 30 * 60000); // every 30 min
        logs.unshift({
          timestamp: time.toISOString(),
          mistingStatus: i % 2 === 0 ? "ON" : "OFF",
          temperature: 30 - i * 0.3,
          humidity: 75 - i,
        });
      }
    } else if (dateRange === "week") {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        logs.push({
          timestamp: day.toISOString(),
          mistingStatus: i % 2 === 0 ? "ON" : "OFF",
          temperature: 28 + i * 0.5,
          humidity: 70 + i,
        });
      }
    } else if (dateRange === "month") {
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        logs.push({
          timestamp: day.toISOString(),
          mistingStatus: i % 3 === 0 ? "ON" : "OFF",
          temperature: 27 + (i % 5),
          humidity: 60 + (i % 10),
        });
      }
    }

    return logs;
  };

  useEffect(() => {
    const mistingLogs = generateMockData();

    const timestamps = mistingLogs.map((log) =>
      dateRange === "today"
        ? new Date(log.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date(log.timestamp).toLocaleDateString()
    );

    const mistingCounts = mistingLogs.map((log) =>
      log.mistingStatus === "ON" ? 1 : 0
    );
    const temps = mistingLogs.map((log) => log.temperature);
    const humidity = mistingLogs.map((log) => log.humidity);

    setChartData({
      labels: timestamps,
      datasets: [
        {
          label: "Misting Activated",
          data: mistingCounts,
          type: "bar",
          backgroundColor: "rgba(13, 110, 253, 0.5)",
          borderColor: "#0d6efd",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          label: "Temperature (°C)",
          data: temps,
          borderColor: "#dc3545",
          backgroundColor: "rgba(220, 53, 69, 0.2)",
          yAxisID: "y",
        },
        {
          label: "Humidity (%)",
          data: humidity,
          borderColor: "#198754",
          backgroundColor: "rgba(25, 135, 84, 0.2)",
          yAxisID: "y",
        },
      ],
    });
  }, [dateRange]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label
            htmlFor="dateRange"
            className="text-sm font-medium text-gray-600"
          >
            Filter by:
          </label>
          <select
            id="dateRange"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

      </div>

      <div style={{ height: "400px" }}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              title: {
                display: true,
                text: "Misting Events, Temperature, and Humidity Trends",
                font: { size: 16 },
                padding: { bottom: 20 },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Values / Activation Count",
                },
              },
              x: {
                title: {
                  display: true,
                  text: dateRange === "today" ? "Time" : "Date",
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
