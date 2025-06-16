import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Container,
  ButtonGroup,
} from "react-bootstrap";
import "chartjs-adapter-date-fns"; // Import date adapter
import {
  FaThermometerHalf,
  FaTint,
  FaUserSecret,
  FaSmog,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const formatToPhilippineTime = (timestamp, options = {}) => {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid Date";
    const defaultOptions = {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      ...options,
    };
    if (options.year && options.month && options.day)
      return date.toLocaleDateString("en-PH", defaultOptions);
    return date.toLocaleTimeString("en-PH", defaultOptions);
  } catch (error) {
    return "Error";
  }
};

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Dashboard() {
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(true); 
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(true); 
  const [sensorData, setSensorData] = useState({
    sensor1: { temperature: null, humidity: null, timestamp: null },
    sensor2: { temperature: null, humidity: null, timestamp: null },
    average: { temperature: null, humidity: null, timestamp: null },
    mistingStatus: "OFF",
    personDetectionStatus: "NO_PERSON", // Or null
    personDetectionTimestamp: null,
    humanDetected: false,
    waterLevel: null,
    mode: "AUTO",
  });

  const [historicalData, setHistoricalData] = useState({
    sensor1: [], 
    sensor2: [], 
    average: [],
  });
  const [timeRange, setTimeRange] = useState("24h");

  const [chartData, setChartData] = useState({
    
    datasets: [],
  });
  // Fetching Real-time Sensor Data
  useEffect(() => {
    const fetchSensorData = async () => {
      setIsLoadingCurrent(true);
      try {
        const response = await fetch(`${API_BASE_URL}/sensor-data`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSensorData((prev) => ({
          ...prev,
          sensor1: data.sensor1 || prev.sensor1,
          sensor2: data.sensor2 || prev.sensor2,
          average: data.average || prev.average,
          mistingStatus: data.misting_status || prev.mistingStatus,
          mode: data.mode || prev.mode,
          humanDetected:
            data.human_detected !== undefined
              ? data.human_detected
              : prev.humanDetected,
          personDetectionStatus: data.person_detection_status || "N/A",
          personDetectionTimestamp: data.person_detection_timestamp || null,
          waterLevel:
            data.water_level !== undefined ? data.water_level : prev.waterLevel,
        }));
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      } finally {
        setIsLoadingCurrent(false); // Current data fetch complete (or failed)
      }
    };
    fetchSensorData();
    const sensorInterval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(sensorInterval);
  }, []);

  // Fetch historical data for chart and stats
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoadingHistorical(true);
      console.log(
        `Workspaceing historical data for timeRange: ${timeRange} (for chart averages)`
      );
      try {
        const limit = timeRange === "24h" ? 48 : timeRange === "7d" ? 168 : 720;
        
        const sensorIdsToFetch = "sensor1,sensor2,average";

        const response = await fetch(
          `${API_BASE_URL}/historical-data?limit=${limit}&sensor_ids=${sensorIdsToFetch}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Historical API Data Received:", data);

        // Process only average data for the chart
        const avgReversed =
          data.average && Array.isArray(data.average)
            ? [...data.average].reverse()
            : [];
        console.log("Reversed data - Average:", avgReversed);

        const s1Reversed =
          data.sensor1 && Array.isArray(data.sensor1)
            ? [...data.sensor1].reverse()
            : [];
        const s2Reversed =
          data.sensor2 && Array.isArray(data.sensor2)
            ? [...data.sensor2].reverse()
            : [];

        console.log("Reversed data - Sensor1:", s1Reversed);
        console.log("Reversed data - Sensor2:", s2Reversed);
        console.log("Reversed data - Average:", avgReversed);

        // Still set full historicalData state if other parts of dashboard use s1, s2 stats
        setHistoricalData({
          sensor1: s1Reversed,
          sensor2: s2Reversed,
          average: avgReversed,
        });

        const chartDatasets = [];
        const commonTimestamps = new Set();

        // Use timestamps from avgReversed for the chart's X-axis labels
        avgReversed.forEach((item) => {
          if (item && item.timestamp) {
            commonTimestamps.add(new Date(item.timestamp).getTime());
          }
        });

        const sortedUniqueTimestamps = Array.from(commonTimestamps).sort(
          (a, b) => a - b
        );
        const labels = sortedUniqueTimestamps.map((ts) => new Date(ts));

        // Helper to create dataset configurations
        const createDataset = (
          histData,
          label,
          color,
          yAxisID,
          isAvgStyle = false
        ) => {
          const dataPoints = sortedUniqueTimestamps.map((ts) => {
            const point = histData.find(
              (d) => d && d.timestamp && new Date(d.timestamp).getTime() === ts
            );
            if (point) {
              const valueKey = label.toLowerCase().includes("temp")
                ? "temperature"
                : "humidity";
              return point.hasOwnProperty(valueKey)
                ? parseFloat(point[valueKey])
                : null;
            }
            return null;
          });
          return {
            label: label,
            data: dataPoints,
            borderColor: color,
            tension: 0.2,
            yAxisID: yAxisID,
            pointRadius: 2,
            borderWidth: isAvgStyle ? 2.5 : 1.5, // Slightly thicker for average lines
            // borderDash: isAvgStyle ? [5, 5] : [], // Optional: dashed style for average
          };
        };

        // Create datasets ONLY for average temperature and humidity
        if (avgReversed.length > 0) {
          chartDatasets.push(
            createDataset(
              avgReversed,
              "Average Temperature (°C)",
              "rgba(255, 99, 132, 1)",
              "yTemp",
              true
            )
          );
          chartDatasets.push(
            createDataset(
              avgReversed,
              "Average Humidity (%)",
              "rgba(54, 162, 235, 1)",
              "yHum",
              true
            )
          );
        } else {
          console.log(
            "No average data (avgReversed) to create chart datasets."
          );
        }

        console.log("HistoricalData state after setting:", {
          s1: s1Reversed,
          s2: s2Reversed,
          avg: avgReversed,
        });
        const newChartDatasets = []; // Renamed from 'datasets' to avoid confusion if 'datasets' is a state

        if (s1Reversed.length > 0) {
          newChartDatasets.push(
            createDataset(s1Reversed, "Temp S1 (°C)", "rgb(255, 99, 132)", "y")
          ); // Target 'y' axis
          newChartDatasets.push(
            createDataset(s1Reversed, "Hum S1 (%)", "rgb(54, 162, 235)", "y")
          ); // Target 'y' axis
        }
        if (s2Reversed.length > 0) {
          newChartDatasets.push(
            createDataset(s2Reversed, "Temp S2 (°C)", "rgb(255, 159, 64)", "y")
          ); // Target 'y' axis
          newChartDatasets.push(
            createDataset(s2Reversed, "Hum S2 (%)", "rgb(75, 192, 192)", "y")
          ); // Target 'y' axis
        }
        if (avgReversed.length > 0) {
          // If you also plot averages on this "All Sensors" chart
          newChartDatasets.push(
            createDataset(
              avgReversed,
              "Avg Temp (°C)",
              "rgba(153, 102, 255, 0.8)",
              "y",
              true
            )
          ); // Target 'y' axis
          newChartDatasets.push(
            createDataset(
              avgReversed,
              "Avg Hum (%)",
              "rgba(201, 203, 207, 0.8)",
              "y",
              true
            )
          ); // Target 'y' axis
        }

        // Note: Chart.js handles X-axis from data points with {x,y} format, labels array isn't strictly needed.
        setChartData({ labels: labels, datasets: chartDatasets }); // Keep labels for potential future use or specific chart types
      } catch (error) {
        console.error(
          "Error fetching/processing historical data for chart:",
          error
        );
        setChartData({ labels: [], datasets: [] }); // Clear chart and stats on error
      } finally {
        setIsLoadingHistorical(false);
      }
    };

    fetchHistoricalData();
    const historicalInterval = setInterval(fetchHistoricalData, 60000); // Refresh every minute

    return () => clearInterval(historicalInterval);
  }, [timeRange]); // Re-fetch when timeRange changes

  const calculateStats = (dataArray, valueKey) => {
    if (!dataArray || dataArray.length === 0)
      return {
        avg: null,
        max: null,
        min: null,
        median: null,
        stdDev: null,
        maxTime: null,
        minTime: null,
      };

    const values = dataArray
      .map((d) => parseFloat(d[valueKey]))
      .filter((v) => !isNaN(v));
    if (values.length === 0)
      return {
        avg: null,
        max: null,
        min: null,
        median: null,
        stdDev: null,
        maxTime: null,
        minTime: null,
      };
// Computation of Statistics
    const sortedValues = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const middle = Math.floor(sortedValues.length / 2);
    const median =
      sortedValues.length % 2 === 0
        ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
        : sortedValues[middle];

    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const maxItem = dataArray.find((d) => parseFloat(d[valueKey]) === max);
    const minItem = dataArray.find((d) => parseFloat(d[valueKey]) === min);

    return {
      avg: avg,
      max: max,
      min: min,
      median: median,
      stdDev: stdDev,
      maxTime: maxItem?.timestamp,
      minTime: minItem?.timestamp,
    };
  };

  console.log("Calculating stats...");
  const tempStatsS1 = calculateStats(historicalData.sensor1, "temperature");
  console.log("tempStatsS1:", tempStatsS1);
  const humStatsS1 = calculateStats(historicalData.sensor1, "humidity");
  console.log("humStatsS1:", humStatsS1);
  const tempStatsS2 = calculateStats(historicalData.sensor2, "temperature");
  console.log("tempStatsS2:", tempStatsS2);
  const humStatsS2 = calculateStats(historicalData.sensor2, "humidity");
  console.log("humStatsS2:", humStatsS2);
  const tempStatsAvg = calculateStats(historicalData.average, "temperature");
  console.log("tempStatsAvg:", tempStatsAvg);
  const humStatsAvg = calculateStats(historicalData.average, "humidity");
  console.log("humStatsAvg:", humStatsAvg);

  const lastUpdatedOverall =
    historicalData.average?.[historicalData.average.length - 1]?.timestamp ||
    historicalData.sensor1?.[historicalData.sensor1.length - 1]?.timestamp ||
    historicalData.sensor2?.[historicalData.sensor2.length - 1]?.timestamp ||
    null;

  // Handling Manual Misting Control 
  const handleMistingControl = async (action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/control-misting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.toUpperCase(),
          mode: sensorData.mode,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setSensorData((prev) => ({
          ...prev,
          mistingStatus: result.current_status || action.toUpperCase(),
          mode: result.current_mode || prev.mode,
        }));
      } else {
        const errData = await response.json();
        console.error("Error controlling misting:", errData.detail);
      }
    } catch (error) {
      console.error("Error controlling misting:", error);
    }
  };

  const renderStatCard = (
    title,
    value,
    unit,
    Icon, // Renamed from 'icon' to 'Icon' for clarity as it's a component
    colorClass = "text-secondary",
    cardIsLoading = false,
    decimals = 1 // Added a parameter for decimal places
  ) => {
    // IconComponent is already good practice by assigning Icon to it.
    const IconComponent = Icon;

    return (
      <Col md={4} className="mb-3">
        {" "}
        {/* Adjusted from lg={2} to md={4} for 3 cards per row on medium+ */}
        {/* Or keep lg={2} if you want 6 per row on large screens, which is a lot */}
        <Card className="h-100 shadow-sm rounded-3 border-0">
          <Card.Body className="text-center py-3 px-2 d-flex flex-column justify-content-center">
            {" "}
            {/* Added flex for better vertical centering if content heights vary slightly */}
            <Card.Title
              className="text-muted fw-semibold small mb-2" // Increased bottom margin slightly
              style={{ fontSize: "0.85rem" }} // Slightly larger title
            >
              {title}
            </Card.Title>
            {IconComponent && (
              <IconComponent className={`${colorClass} fs-3 mb-2`} /> // Larger icon (fs-3), more margin
            )}
            <Card.Text className={`h4 fw-bold ${colorClass} mb-0`}>
              {" "}
              {/* Larger value text (h4) */}
              {cardIsLoading ? (
                <span className="text-muted fs-6">...</span>
              ) : value === null ||
                value === undefined ||
                isNaN(parseFloat(value)) ? ( // Added isNaN check
                <span className="text-muted fs-6">N/A</span>
              ) : (
                `${parseFloat(value).toFixed(decimals)}${unit}` // Used 'decimals' parameter
              )}
            </Card.Text>
          </Card.Body>
        </Card>
      </Col>
    );
  };

  const timeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  return (
    <div className="dashboard p-3"> 
      {/* Current Readings Row */}
      <Row className="gy-3 mb-4">
        {renderStatCard(
          "S1 Temp",
          sensorData.sensor1.temperature,
          "°C",
          FaThermometerHalf,
          "text-danger",
          isLoadingCurrent
        )}
        {renderStatCard(
          "S1 Hum",
          sensorData.sensor1.humidity,
          "%",
          FaTint,
          "text-info",
          isLoadingCurrent
        )}
        {renderStatCard(
          "S2 Temp",
          sensorData.sensor2.temperature,
          "°C",
          FaThermometerHalf,
          "text-danger",
          isLoadingCurrent
        )}
        {renderStatCard(
          "S2 Hum",
          sensorData.sensor2.humidity,
          "%",
          FaTint,
          "text-info",
          isLoadingCurrent
        )}
        {renderStatCard(
          "Avg Temp",
          sensorData.average.temperature,
          "°C",
          FaThermometerHalf,
          "text-success",
          isLoadingCurrent
        )}
        {renderStatCard(
          "Avg Hum",
          sensorData.average.humidity,
          "%",
          FaTint,
          "text-primary",
          isLoadingCurrent
        )}
      </Row>

      {/* Control and Global Status Cards Row */}
      <Row className="gy-3 mb-4">
        <Col md={12} lg={4}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-3">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-2">
                <FaSmog className="text-primary fs-4" /> Misting Control
              </Card.Title>
              <div className="mb-2">
                Current Status:
                <span
                  className={`fw-bold ms-1 text-${
                    sensorData.mistingStatus === "ON" ||
                    sensorData.mistingStatus?.startsWith("MISTING")
                      ? "success"
                      : "danger"
                  }`}
                >
                  {isLoadingHistorical ? (
                    <span className="text-muted fs-6">...</span>
                  ) : (
                    sensorData.mistingStatus || "N/A"
                  )}
                </span>
              </div>
              <div className="mb-3">
                Mode:
                <span className="fw-bold ms-1 text-info">
                  {isLoadingHistorical ? (
                    <span className="text-muted fs-6">...</span>
                  ) : (
                    sensorData.mode || "N/A"
                  )}
                </span>
              </div>
              <ButtonGroup className="w-100 mb-2">
                <Button
                  variant="success"
                  onClick={() => handleMistingControl("ON")}
                  disabled={sensorData.mistingStatus === "ON"}
                >
                  ON
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleMistingControl("OFF")}
                  disabled={sensorData.mistingStatus === "OFF"}
                >
                  OFF
                </Button>
              </ButtonGroup>
              <ButtonGroup className="w-100">
                <Button
                  variant="info"
                  onClick={() => handleMistingControl("AUTO")}
                  disabled={sensorData.mode === "AUTO"}
                >
                  AUTO
                </Button>
                <Button
                  variant="warning"
                  onClick={() => handleMistingControl("CONTINUOUS")}
                  disabled={sensorData.mode === "CONTINUOUS"}
                >
                  CONT.
                </Button>
              </ButtonGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          {" "}
          
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-3">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-2">
                <FaUserSecret className="text-primary fs-4" /> Person Activity
              </Card.Title>
              <div
                className={`p-3 rounded-3 ${
                  sensorData.personDetectionStatus === "PERSON_DETECTED"
                    ? "bg-success"
                    : sensorData.personDetectionStatus === "NO_PERSON"
                    ? "bg-secondary"
                    : "bg-light"
                } bg-opacity-25`}
              >
                <span
                  className={`fs-4 fw-bold text-${
                    sensorData.personDetectionStatus === "PERSON_DETECTED"
                      ? "success"
                      : sensorData.personDetectionStatus === "NO_PERSON"
                      ? "secondary"
                      : "muted"
                  }`}
                >
                  {isLoadingCurrent && !sensorData.personDetectionTimestamp
                    ? "Loading..."
                    : sensorData.personDetectionStatus === "PERSON_DETECTED"
                    ? "Person Detected"
                    : sensorData.personDetectionStatus === "NO_PERSON"
                    ? "No Person"
                    : sensorData.personDetectionStatus || "N/A"}
                </span>
                {sensorData.personDetectionTimestamp &&
                  sensorData.personDetectionStatus !== "N/A" && (
                    <small
                      className="d-block text-muted mt-1"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Last update:{" "}
                      {formatToPhilippineTime(
                        sensorData.personDetectionTimestamp
                      )}
                    </small>
                  )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-3">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-2">
                <FaTint className="text-info fs-4" /> Water Level
              </Card.Title>
              <div
                className={`p-3 rounded-3 ${
                  sensorData.waterLevel === null
                    ? "bg-light"
                    : sensorData.waterLevel < 20
                    ? "bg-danger bg-opacity-10"
                    : "bg-info bg-opacity-10"
                }`}
              >
                <span
                  className={`fs-4 fw-bold ${
                    sensorData.waterLevel === null
                      ? "text-muted"
                      : sensorData.waterLevel < 20
                      ? "text-danger"
                      : "text-info"
                  }`}
                >
                  {isLoadingHistorical ? (
                    <span className="text-muted fs-6">...</span>
                  ) : sensorData.waterLevel === null ? (
                    "N/A"
                  ) : (
                    `${parseFloat(sensorData.waterLevel).toFixed(1)}%`
                  )}
                </span>
                {typeof sensorData.waterLevel === "number" &&
                  sensorData.waterLevel < 20 && (
                    <div
                      className="mt-1 text-danger small"
                      style={{ fontSize: "0.75rem" }}
                    >
                      ⚠️ Low Water
                    </div>
                  )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Real-time Monitoring Chart */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Body style={{ minHeight: "400px" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title className="text-muted mb-0">
                  Real-time Monitoring (All Sensors)
                </Card.Title>
                <ButtonGroup size="sm">
                  {["24h", "7d", "30d"].map((range) => (
                    <Button
                      key={range}
                      variant={
                        timeRange === range ? "primary" : "outline-primary"
                      }
                      onClick={() => setTimeRange(range)}
                    >
                      {range.toUpperCase()}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
              {chartData.datasets.length > 0 ? (
                <div style={{ height: "400px" }}>
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: {
                        legend: {
                          position: "top",
                          labels: {
                            usePointStyle: true,
                            pointStyle: "circle",
                            padding: 20,
                            font: {
                              size: 12,
                            },
                          },
                        },
                        title: {
                          display: true,
                          text: `Temperature & Humidity Monitoring (${timeRange})`,
                          font: {
                            size: 16,
                            weight: "bold",
                          },
                          padding: {
                            top: 10,
                            bottom: 20,
                          },
                        },
                        tooltip: {
                          mode: "index",
                          intersect: false,
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          titleColor: "#000",
                          bodyColor: "#666",
                          borderColor: "#ddd",
                          borderWidth: 1,
                          padding: 10,
                          callbacks: {
                            title: function (tooltipItems) {
                              if (tooltipItems.length > 0) {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return formatToPhilippineTime(date, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                });
                              }
                              return "";
                            },
                            label: function (context) {
                              let label = context.dataset.label || "";
                              if (label) {
                                label += ": ";
                              }
                              if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                              }
                              return label;
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          type: "time",
                          time: {
                            unit: timeRange === "24h" ? "hour" : "day",
                            tooltipFormat: "MMM dd, yyyy hh:mm aa",
                            displayFormats: {
                              hour: "HH:mm",
                              day: "MMM dd",
                            },
                            minUnit: timeRange === "24h" ? "minute" : "hour",
                          },
                          title: {
                            display: true,
                            text: "Time (PHT)",
                            font: {
                              size: 12,
                              weight: "bold",
                            },
                          },
                          grid: {
                            display: true,
                            color: "rgba(0, 0, 0, 0.05)",
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                              size: 11,
                            },
                            maxTicksLimit: timeRange === "24h" ? 12 : 7,
                          },
                        },
                        y: {
                          type: "linear",
                          display: true,
                          position: "left",
                          title: {
                            display: true,
                            text: "Value (°C / %)",
                            font: {
                              size: 12,
                              weight: "bold",
                            },
                          },
                          grid: {
                            color: "rgba(0, 0, 0, 0.05)",
                          },
                          ticks: {
                            font: {
                              size: 11,
                            },
                          },
                          suggestedMin: 15, // Adjust based on your typical lowest temperature/humidity
                          suggestedMax: 75,
                        },
                      },
                      elements: {
                        line: {
                          tension: 0.4,
                          borderWidth: 2,
                        },
                        point: {
                          radius: 0,
                          hitRadius: 10,
                          hoverRadius: 4,
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div
                  className="text-center text-muted pt-5"
                  style={{
                    height: "350px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isLoadingHistorical
                    ? "Loading chart data..."
                    : "No historical data available for average."}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics Section */}
      {((historicalData.sensor1 && historicalData.sensor1.length > 0) ||
        (historicalData.sensor2 && historicalData.sensor2.length > 0) ||
        (historicalData.average && historicalData.average.length > 0)) &&
        !isLoadingHistorical && (
          <div className="px-3">
            <h3
              className="mb-3 fw-bold text-center"
              style={{ color: "#343a40" }}
            >
              Detailed Statistics ({timeRange})
            </h3>

            {/* Sensor 1 Statistics */}
            {historicalData.sensor1 && historicalData.sensor1.length > 0 && (
              <Container className="mb-5 p-lg-4 p-3 shadow-sm bg-white rounded-4 border">
                <h4 className="text-danger mb-4 fw-bold">Sensor 1 Overview</h4>

                {/* Temp Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "S1 Avg Temp",
                    tempStatsS1.avg,
                    "°C",
                    FaThermometerHalf,
                    "text-danger",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "S1 Median Temp",
                    tempStatsS1.median,
                    "°C",
                    FaThermometerHalf,
                    "text-danger",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-danger bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Temp. Stability
                        </Card.Title>
                        <FaThermometerHalf
                          className={`text-danger fs-4 mb-1`}
                        />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS1.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS1.stdDev.toFixed(2)}°C`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Temp Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3 mb-4">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS1.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS1.max.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsS1.maxTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsS1.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS1.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS1.min.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsS1.minTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsS1.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Hum Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "S1 Avg Hum",
                    humStatsS1.avg,
                    "%",
                    FaTint,
                    "text-info",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "S1 Median Hum",
                    humStatsS1.median,
                    "%",
                    FaTint,
                    "text-info",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-info bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Hum. Stability
                        </Card.Title>
                        <FaTint className={`text-info fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-info mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS1.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS1.stdDev.toFixed(2)}%`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Hum Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS1.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS1.max.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsS1.maxTime
                            ? `at ${formatToPhilippineTime(
                                humStatsS1.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS1.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS1.min.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsS1.minTime
                            ? `at ${formatToPhilippineTime(
                                humStatsS1.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Container>
            )}

            {/* Sensor 2 Statistics */}
            {historicalData.sensor2 && historicalData.sensor2.length > 0 && (
              <Container className="mb-5 p-lg-4 p-3 shadow-sm bg-white rounded-4 border">
                <h4 className="text-danger mb-4 fw-bold">Sensor 2 Overview</h4>

                {/* Temp Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "S2 Avg Temp",
                    tempStatsS2.avg,
                    "°C",
                    FaThermometerHalf,
                    "text-danger",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "S2 Median Temp",
                    tempStatsS2.median,
                    "°C",
                    FaThermometerHalf,
                    "text-danger",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-danger bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Temp. Stability
                        </Card.Title>
                        <FaThermometerHalf
                          className={`text-danger fs-4 mb-1`}
                        />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS2.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS2.stdDev.toFixed(2)}°C`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Temp Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3 mb-4">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS2.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS2.max.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsS2.maxTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsS2.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsS2.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsS2.min.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsS2.minTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsS2.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Hum Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "S2 Avg Hum",
                    humStatsS2.avg,
                    "%",
                    FaTint,
                    "text-info",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "S2 Median Hum",
                    humStatsS2.median,
                    "%",
                    FaTint,
                    "text-info",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-info bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Hum. Stability
                        </Card.Title>
                        <FaTint className={`text-info fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-info mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS2.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS2.stdDev.toFixed(2)}%`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Hum Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS2.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS2.max.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsS2.maxTime
                            ? `at ${formatToPhilippineTime(
                                humStatsS2.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsS2.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsS2.min.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsS2.minTime
                            ? `at ${formatToPhilippineTime(
                                humStatsS2.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Container>
            )}

            {/* Average Statistics */}
            {historicalData.average && historicalData.average.length > 0 && (
              <Container className="mb-4 p-lg-4 p-3 shadow-sm bg-white rounded-4 border">
                <h4 className="text-success mb-4 fw-bold">
                  Average Environmental Overview
                </h4>

                {/* Temp Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "Avg Temp",
                    tempStatsAvg.avg,
                    "°C",
                    FaThermometerHalf,
                    "text-success",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "Avg Median Temp",
                    tempStatsAvg.median,
                    "°C",
                    FaThermometerHalf,
                    "text-success",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-success bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Temp. Stability
                        </Card.Title>
                        <FaThermometerHalf
                          className={`text-success fs-4 mb-1`}
                        />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsAvg.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsAvg.stdDev.toFixed(2)}°C`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Temp Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3 mb-4">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsAvg.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsAvg.max.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsAvg.maxTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsAvg.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : tempStatsAvg.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${tempStatsAvg.min.toFixed(1)}°C`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : tempStatsAvg.minTime
                            ? `at ${formatToPhilippineTime(
                                tempStatsAvg.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Hum Overview (Top Row) */}
                <Row className="gy-3 mb-4">
                  {renderStatCard(
                    "Avg Hum",
                    humStatsAvg.avg,
                    "%",
                    FaTint,
                    "text-primary",
                    isLoadingHistorical
                  )}
                  {renderStatCard(
                    "Avg Median Hum",
                    humStatsAvg.median,
                    "%",
                    FaTint,
                    "text-primary",
                    isLoadingHistorical
                  )}
                  <Col md={4} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0 bg-primary bg-opacity-10">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Hum. Stability
                        </Card.Title>
                        <FaTint className={`text-primary fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-primary mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsAvg.stdDev === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsAvg.stdDev.toFixed(2)}%`
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* Hum Extremes (Bottom Row) */}
                <h6 className="text-muted fw-semibold mb-3">Recent Extremes</h6>
                <Row className="gy-3">
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Highest Recorded
                        </Card.Title>
                        <FaArrowUp className={`text-success fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-success mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsAvg.max === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsAvg.max.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsAvg.maxTime
                            ? `at ${formatToPhilippineTime(
                                humStatsAvg.maxTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} className="mb-1">
                    <Card className="h-100 shadow-sm rounded-3 border-0">
                      <Card.Body className="text-center py-3 px-2">
                        <Card.Title
                          className="text-muted fw-semibold small mb-1"
                          style={{ fontSize: "0.8rem" }}
                        >
                          Lowest Recorded
                        </Card.Title>
                        <FaArrowDown className={`text-danger fs-4 mb-1`} />
                        <Card.Text className={`h5 fw-bold text-danger mb-0`}>
                          {isLoadingHistorical ? (
                            <span className="text-muted fs-6">...</span>
                          ) : humStatsAvg.min === null ? (
                            <span className="text-muted fs-6">N/A</span>
                          ) : (
                            `${humStatsAvg.min.toFixed(1)}%`
                          )}
                        </Card.Text>
                        <Card.Text
                          className="text-muted small mt-1 mb-0"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {isLoadingHistorical
                            ? ""
                            : humStatsAvg.minTime
                            ? `at ${formatToPhilippineTime(
                                humStatsAvg.minTime,
                                timeFormatOptions
                              )}`
                            : ""}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Container>
            )}

            {lastUpdatedOverall && (
              <div className="text-center text-muted mt-3 pt-2 border-top">
                <small>
                  <FaClock className="me-1" />
                  Overall statistics based on data up to:{" "}
                  {formatToPhilippineTime(lastUpdatedOverall, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  })}
                </small>
              </div>
            )}
          </div>
        )}
      {isLoadingHistorical && !historicalData.average.length && (
        <div className="text-center text-muted p-5">
          Loading detailed statistics...
        </div>
      )}
    </div>
  );
}

export default Dashboard;
