import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form } from 'react-bootstrap';
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
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Analytics() {
  const [dateRange, setDateRange] = useState('24h');
  const [analyticsData, setAnalyticsData] = useState({
    temperature: [],
    humidity: [],
    timestamps: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/analytics?range=${dateRange}`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/export-data?range=${dateRange}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `misting-system-data-${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const chartData = {
    labels: analyticsData.timestamps,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: analyticsData.temperature,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Humidity (%)',
        data: analyticsData.humidity,
        borderColor: 'rgb(53, 162, 235)',
        tension: 0.1
      }
    ]
  };

  return (
    <div className="analytics">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <Card.Title className="mb-0 text-primary fw-bold fs-5">
                  Historical Data Analysis
                </Card.Title>

                <div className="d-flex flex-wrap gap-2">
                  <Form.Select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{ width: '180px' }}
                    className="me-2"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </Form.Select>
                  <Button variant="outline-primary" onClick={handleExport}>
                    Export Data
                  </Button>
                </div>
              </div>

              <div style={{ height: '400px' }}>
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
                        text: 'Temperature and Humidity Trends',
                        font: {
                          size: 16,
                        },
                        padding: {
                          bottom: 20,
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: false,
                        title: {
                          display: true,
                          text: 'Values',
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Time',
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>


      <Row>
        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-center mb-4">Temperature Statistics</Card.Title>
              <div className="d-flex justify-content-around text-center">
                <div className="stat-item">
                  <h6 className="text-muted">Average</h6>
                  <p className="display-6 text-primary">
                    {analyticsData.temperature.length > 0
                      ? (analyticsData.temperature.reduce((a, b) => a + b, 0) / analyticsData.temperature.length).toFixed(1)
                      : '--'}°C
                  </p>
                </div>
                <div className="stat-item">
                  <h6 className="text-muted">Maximum</h6>
                  <p className="display-6 text-danger">
                    {analyticsData.temperature.length > 0
                      ? Math.max(...analyticsData.temperature).toFixed(1)
                      : '--'}°C
                  </p>
                </div>
                <div className="stat-item">
                  <h6 className="text-muted">Minimum</h6>
                  <p className="display-6 text-info">
                    {analyticsData.temperature.length > 0
                      ? Math.min(...analyticsData.temperature).toFixed(1)
                      : '--'}°C
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-center mb-4">Humidity Statistics</Card.Title>
              <div className="d-flex justify-content-around text-center">
                <div className="stat-item">
                  <h6 className="text-muted">Average</h6>
                  <p className="display-6 text-primary">
                    {analyticsData.humidity.length > 0
                      ? (analyticsData.humidity.reduce((a, b) => a + b, 0) / analyticsData.humidity.length).toFixed(1)
                      : '--'}%
                  </p>
                </div>
                <div className="stat-item">
                  <h6 className="text-muted">Maximum</h6>
                  <p className="display-6 text-danger">
                    {analyticsData.humidity.length > 0
                      ? Math.max(...analyticsData.humidity).toFixed(1)
                      : '--'}%
                  </p>
                </div>
                <div className="stat-item">
                  <h6 className="text-muted">Minimum</h6>
                  <p className="display-6 text-info">
                    {analyticsData.humidity.length > 0
                      ? Math.min(...analyticsData.humidity).toFixed(1)
                      : '--'}%
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Analytics; 