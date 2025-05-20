import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button } from "react-bootstrap";
import {
  FaThermometerHalf,
  FaTint,
  FaUserSecret,
  FaSmog,
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

              <div className="bottle-wrapper mx-auto mb-3">
                <div className="bottle">
                  <div
                    className="water"
                    style={{
                      height: `${sensorData.waterLevel}%`,
                      backgroundColor: "#0d6efd", // Bootstrap primary blue
                    }}
                  ></div>
                </div>
              </div>

              <Card.Text className="fw-bold">
                {sensorData.waterLevel.toFixed(1)}%
              </Card.Text>

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

              <Card.Text className="display-6 fw-semibold d-flex justify-content-center align-items-center gap-2 mb-4">
                <span
                  className="rounded-circle"
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor:
                      sensorData.mistingStatus === "ON"
                        ? "#198754"
                        : sensorData.mistingStatus === "AUTO"
                        ? "#0d6efd"
                        : sensorData.mistingStatus === "CONTINUOUS"
                        ? "#fd7e14"
                        : "#dc3545",
                  }}
                ></span>
                {sensorData.mistingStatus}
              </Card.Text>

              {/* Responsive Button Layout */}
              <div className="row row-cols-2 row-cols-md-2 g-3 px-4">
                <div className="col d-grid">
                  <Button
                    variant="primary"
                    onClick={() => handleMistingControl("ON")}
                    disabled={sensorData.mistingStatus === "ON"}
                  >
                    Turn ON
                  </Button>
                </div>
                <div className="col d-grid">
                  <Button
                    variant="outline-danger"
                    onClick={() => handleMistingControl("OFF")}
                    disabled={sensorData.mistingStatus === "OFF"}
                  >
                    Turn OFF
                  </Button>
                </div>
                <div className="col d-grid">
                  <Button
                    variant="info"
                    onClick={() => handleMistingControl("AUTO")}
                    disabled={sensorData.mistingStatus === "AUTO"}
                  >
                    Auto
                  </Button>
                </div>
                <div className="col d-grid">
                  <Button
                    variant="warning"
                    onClick={() => handleMistingControl("CONTINUOUS")}
                    disabled={sensorData.mistingStatus === "CONTINUOUS"}
                  >
                    Continuous
                  </Button>
                </div>
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
