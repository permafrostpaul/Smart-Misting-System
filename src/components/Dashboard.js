import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button } from "react-bootstrap";
import { FaThermometerHalf, FaTint, FaUserSecret, FaSmog } from 'react-icons/fa';
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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [sensorData, setSensorData] = useState({
    temperature: 25.5,
    humidity: 65,
    mistingStatus: "OFF",
    humanDetected: false,
    waterLevel: 75, // percentage
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        tension: 0.1,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderColor: "rgb(53, 162, 235)",
        tension: 0.1,
      },
    ],
  });

  useEffect(() => {
    // Generate mock data every 2 seconds
    const interval = setInterval(() => {
      const newTemp = 25 + Math.random() * 2;
      const newHumidity = 60 + Math.random() * 10;
      const newHumanDetected = Math.random() > 0.7; // 30% chance of human detection
      const newWaterLevel = Math.max(
        0,
        Math.min(100, sensorData.waterLevel + (Math.random() * 2 - 1))
      ); // Randomly fluctuate water level

      setSensorData((prev) => ({
        ...prev,
        temperature: newTemp,
        humidity: newHumidity,
        humanDetected: newHumanDetected,
        waterLevel: newWaterLevel,
      }));

      // Update chart data
      setChartData((prevData) => {
        const newLabels = [...prevData.labels, new Date().toLocaleTimeString()];
        const newTempData = [...prevData.datasets[0].data, newTemp];
        const newHumidityData = [...prevData.datasets[1].data, newHumidity];

        // Keep only last 20 data points
        if (newLabels.length > 20) {
          return {
            labels: newLabels.slice(-20),
            datasets: [
              {
                ...prevData.datasets[0],
                data: newTempData.slice(-20),
              },
              {
                ...prevData.datasets[1],
                data: newHumidityData.slice(-20),
              },
            ],
          };
        }

        return {
          labels: newLabels,
          datasets: [
            {
              ...prevData.datasets[0],
              data: newTempData,
            },
            {
              ...prevData.datasets[1],
              data: newHumidityData,
            },
          ],
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleMistingControl = (action) => {
    setSensorData((prev) => ({
      ...prev,
      mistingStatus: action,
    }));
  };

  return (
    <div className="dashboard">
      <Row className="gy-4 mb-4">
        {/* Temperature Card */}
        <Col md={3}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-4">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
                <FaThermometerHalf className="text-danger fs-4" />
                Temperature
              </Card.Title>
              <Card.Text className="display-5 fw-bold text-danger">
                {sensorData.temperature.toFixed(1)}°C
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Humidity Card */}
        <Col md={3}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-4">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
                <FaTint className="text-info fs-4" />
                Humidity
              </Card.Title>
              <Card.Text className="display-5 fw-bold text-info">
                {sensorData.humidity.toFixed(1)}%
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Human Detection Card */}
        <Col md={3}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-4">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
                <FaUserSecret className="text-primary fs-4" />
                Human Detection
              </Card.Title>
              <Card.Text className="display-6 fw-bold d-flex justify-content-center align-items-center gap-2">
                <span
                  className="rounded-circle d-inline-block"
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor: sensorData.humanDetected
                      ? "#198754"
                      : "#6c757d",
                  }}
                ></span>
                {sensorData.humanDetected ? "Detected" : "No Human"}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Water Level Card */}
        <Col md={3}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-4">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
                <FaTint className="text-info fs-4" />
                Water Level
              </Card.Title>
              <Card.Text
                className="display-5 fw-bold mb-3"
                style={{
                  color: sensorData.waterLevel < 20 ? "#dc3545" : "#198754",
                }}
              >
                {sensorData.waterLevel.toFixed(1)}%
              </Card.Text>
              <div className="progress rounded-pill" style={{ height: "12px" }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{
                    width: `${sensorData.waterLevel}%`,
                    backgroundColor:
                      sensorData.waterLevel < 20 ? "#dc3545" : "#198754",
                  }}
                  aria-valuenow={sensorData.waterLevel}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              {sensorData.waterLevel < 20 && (
                <div className="mt-2 text-danger small">⚠️ Low Water Level</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Misting Status Card */}
        <Col md={12}>
          <Card className="h-100 shadow rounded-4 border-0">
            <Card.Body className="text-center py-4">
              <Card.Title className="text-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
                <FaSmog className="text-primary fs-4" />
                Misting Status
              </Card.Title>
              <Card.Text className="display-6 fw-semibold d-flex justify-content-center align-items-center gap-2 mb-3">
                <span
                  className={`rounded-circle`}
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor:
                      sensorData.mistingStatus === "ON" ? "#198754" : "#dc3545",
                  }}
                ></span>
                {sensorData.mistingStatus}
              </Card.Text>

              <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleMistingControl("ON")}
                  disabled={sensorData.mistingStatus === "ON"}
                >
                  Turn ON
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => handleMistingControl("OFF")}
                  disabled={sensorData.mistingStatus === "OFF"}
                >
                  Turn OFF
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="mb-3 text-muted">
                Real-time Monitoring
              </Card.Title>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                    title: {
                      display: true,
                      text: "Temperature and Humidity History",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                    },
                  },
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
