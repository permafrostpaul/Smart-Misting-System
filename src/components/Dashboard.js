import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

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
    mistingStatus: 'OFF'
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        tension: 0.1
      }
    ]
  });

  useEffect(() => {
    // Generate mock data every 2 seconds
    const interval = setInterval(() => {
      const newTemp = 25 + Math.random() * 2;
      const newHumidity = 60 + Math.random() * 10;

      setSensorData(prev => ({
        ...prev,
        temperature: newTemp,
        humidity: newHumidity
      }));

      // Update chart data
      setChartData(prevData => {
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
                data: newTempData.slice(-20)
              },
              {
                ...prevData.datasets[1],
                data: newHumidityData.slice(-20)
              }
            ]
          };
        }

        return {
          labels: newLabels,
          datasets: [
            {
              ...prevData.datasets[0],
              data: newTempData
            },
            {
              ...prevData.datasets[1],
              data: newHumidityData
            }
          ]
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleMistingControl = (action) => {
    setSensorData(prev => ({
      ...prev,
      mistingStatus: action
    }));
  };

  return (
    <div className="dashboard">
      <Row className="gy-4 mb-4">
        {/* Temperature Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center">
              <Card.Title className="mb-2 text-muted">Temperature</Card.Title>
              <Card.Text className="display-4 fw-bold text-primary">
                {sensorData.temperature.toFixed(1)}°C
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Humidity Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center">
              <Card.Title className="mb-2 text-muted">Humidity</Card.Title>
              <Card.Text className="display-4 fw-bold text-info">
                {sensorData.humidity.toFixed(1)}%
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Misting Status Card */}
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center">
              <Card.Title className="mb-2 text-muted">Misting Status</Card.Title>
              <Card.Text className="display-6 fw-semibold mb-3">
                <span
                  className={`status-dot me-2 ${sensorData.mistingStatus === 'ON' ? 'bg-success' : 'bg-danger'
                    }`}
                ></span>
                {sensorData.mistingStatus}
              </Card.Text>

              <div className="d-flex flex-column gap-2">
                <Button
                  variant="primary"
                  onClick={() => handleMistingControl('ON')}
                  disabled={sensorData.mistingStatus === 'ON'}
                >
                  Turn ON
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => handleMistingControl('OFF')}
                  disabled={sensorData.mistingStatus === 'OFF'}
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
              <Card.Title className="mb-3 text-muted">Real-time Monitoring</Card.Title>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Temperature and Humidity History',
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