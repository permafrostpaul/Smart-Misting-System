import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  // ListGroup, // Kept for summary, but can be removed if pie chart is preferred
  ButtonGroup,
  Table,
  Pagination // <-- Import Pagination
} from "react-bootstrap";
import {
  Chart as ChartJS,
  ArcElement, // For Pie/Doughnut
  Tooltip,
  Legend,
  // Import other elements if you use other chart types
} from "chart.js";
import axios from "axios";
import { FaRegFileAlt, FaListAlt, FaSpinner } from "react-icons/fa"; // Added FaSpinner for loading

ChartJS.register(ArcElement, Tooltip, Legend);


const formatToPhilippineTime = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp for formatToPhilippineTime:", timestamp);
      return "Invalid Date";
    }
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric', 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting date:", error, "Timestamp:", timestamp);
    return "Error";
  }
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Analytics() {
  const [activationSummaryData, setActivationSummaryData] = useState(null);
  const [activationTimeRangeHours, setActivationTimeRangeHours] = useState(24);
  const [isActivationSummaryLoading, setIsActivationSummaryLoading] = useState(true);

  // State for Detailed Misting Log
  const [mistingLog, setMistingLog] = useState([]);
  const [isLogLoading, setIsLogLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LOG_PAGE_SIZE = 15; // Number of log entries per page

  // Fetch for Misting Activation Summary
  useEffect(() => {
    const fetchMistingActivationSummary = async () => {
      setIsActivationSummaryLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/analytics/misting_summary?time_range_hours=${activationTimeRangeHours}`
        );
        setActivationSummaryData(response.data);
      } catch (error) {
        console.error("Error fetching misting activation summary:", error);
        setActivationSummaryData(null);
      } finally {
        setIsActivationSummaryLoading(false);
      }
    };
    fetchMistingActivationSummary();
  }, [activationTimeRangeHours]);

  // Fetch for Detailed Misting Log
  useEffect(() => {
    const fetchMistingLogData = async () => {
      setIsLogLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/analytics/misting_events_log?time_range_hours=${activationTimeRangeHours}&page=${currentPage}&page_size=${LOG_PAGE_SIZE}`
        );
        setMistingLog(response.data.events || []);
        setTotalPages(response.data.total_pages || 1);
      } catch (error) {
        console.error("Error fetching misting log:", error);
        setMistingLog([]);
        setTotalPages(1);
      } finally {
        setIsLogLoading(false);
      }
    };
    fetchMistingLogData();
  }, [activationTimeRangeHours, currentPage]); // Re-fetch when time range or page changes

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleExportMistingLog = async () => { /* ... your existing export logic ... */ };

  // Pagination items logic
  let paginationItems = [];
  if (totalPages > 1) {
    for (let number = 1; number <= totalPages; number++) {
      paginationItems.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
          {number}
        </Pagination.Item>,
      );
    }
  }


  return (
    <div className="analytics p-md-3 py-3">
      {/* Misting Activation Summary Section */}
      <Container className="mb-4 p-lg-4 p-3 shadow-sm bg-white rounded-4 border"> {/* Added border */}
        {/* ... Summary JSX (Total Activations, Activations by Trigger) ... unchanged from your previous working version */}
         <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="text-success mb-0 fw-semibold">
            Misting Activation Summary
          </h4>
          <ButtonGroup>
            {[
              { label: "24 Hours", hours: 24 },
              { label: "7 Days", hours: 168 },
              { label: "30 Days", hours: 720 },
            ].map((range) => (
              <Button
                key={range.hours}
                variant={
                  activationTimeRangeHours === range.hours
                    ? "success"
                    : "outline-success"
                }
                size="sm"
                onClick={() => {
                  setActivationTimeRangeHours(range.hours);
                  setCurrentPage(1); // Reset page when time range changes
                }}
              >
                {range.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        {isActivationSummaryLoading && <div className="text-center p-5"><FaSpinner className="fa-spin fs-2 text-muted" /> <p className="text-muted">Loading summary...</p></div>}
        {!isActivationSummaryLoading && !activationSummaryData && (
          <Alert variant="warning">Could not load misting activation summary.</Alert>
        )}
        {!isActivationSummaryLoading && activationSummaryData && (
          <Row className="g-4">
            <Col md={4}> 
              <Card className="text-center h-100 shadow-sm border-0 bg-light">
                <Card.Body className="py-4">
                  <Card.Subtitle className="text-muted mb-2 small">Total Activations</Card.Subtitle>
                  <Card.Title className="display-3 fw-bold text-success">
                    {activationSummaryData.total_activations}
                  </Card.Title>
                  <Card.Text className="small text-muted mt-1">
                    in the last {activationSummaryData.time_range_hours} hours
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={8}>
              <Card className="h-100 shadow-sm border-0 bg-light">
                <Card.Body className="py-4">
                  <Card.Title className="text-muted mb-3 text-center small">Activations by Trigger</Card.Title>
                  {activationSummaryData.total_activations > 0 && activationSummaryData.activations_by_trigger ? (
                     <div className="px-2">
                        {Object.entries(activationSummaryData.activations_by_trigger).map(([trigger, count]) => (
                            <Row key={trigger} className="align-items-center mb-2">
                                <Col xs={7} className="text-start text-capitalize small">
                                    {trigger.replace(/_/g, " ")}:
                                </Col>
                                <Col xs={5} className="text-end">
                                    <span className="fw-semibold badge bg-success-subtle text-success-emphasis rounded-pill px-2 py-1">
                                        {count} times
                                    </span>
                                </Col>
                            </Row>
                        ))}
                    </div>
                  ) : ( <p className="text-muted text-center pt-4">No misting activations recorded.</p> )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Detailed Misting Log Section */}
      <Container className="mt-4 p-lg-4 p-3 shadow-sm bg-white rounded-4 border"> {/* Added border */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="text-primary mb-0 fw-semibold d-flex align-items-center">
            <FaListAlt className="me-2"/> Detailed Misting Log
          </h4>
          <Button variant="outline-primary" size="sm" onClick={handleExportMistingLog} disabled={isLogLoading || mistingLog.length === 0}>
            <FaRegFileAlt className="me-2"/> Export Log
          </Button>
        </div>

        {isLogLoading && <div className="text-center p-5"><FaSpinner className="fa-spin fs-2 text-muted" /> <p className="text-muted">Loading log...</p></div>}
        {!isLogLoading && mistingLog.length === 0 && (
          <Alert variant="secondary" className="text-center">No misting events recorded for this period.</Alert>
        )}
        {!isLogLoading && mistingLog.length > 0 && (
          <>
            <Table striped bordered hover responsive className="shadow-sm small" style={{borderRadius: "0.375rem", overflow: "hidden"}}>
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Timestamp (PHT)</th>
                  <th className="text-center">Trigger Type</th>
                  <th>Reason/Details</th>
                  {mistingLog.some(event => event.duration !== null && event.duration !== undefined) && 
                    <th className="text-center">Duration</th> 
                  }
                </tr>
              </thead>
              <tbody>
                {mistingLog.map((event, index) => (
                  <tr key={event.id || index}>
                    <td>{index + 1 + ((currentPage - 1) * LOG_PAGE_SIZE) }</td>
                    <td>{formatToPhilippineTime(event.timestamp)}</td>
                    <td className="text-center text-capitalize">{event.trigger_type?.replace(/_/g, " ")}</td>
                    <td className="text-capitalize">{event.reason?.replace(/_/g, " ") || '-'}</td>
                    {mistingLog.some(event => event.duration !== null && event.duration !== undefined) && 
                      <td className="text-center">{event.duration !== null ? `${event.duration}s` : '-'}</td>
                    }
                  </tr>
                ))}
              </tbody>
            </Table>
            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination size="sm">
                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                  <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                  {paginationItems}
                  <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                  <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default Analytics;