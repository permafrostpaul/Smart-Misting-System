import React from "react";
import { Container, Nav, Tab, Navbar } from "react-bootstrap";
import { FaThermometerHalf, FaChartLine, FaWater, FaSmog } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./components/Dashboard";
import Analytics from "./components/Analytics";
import "./App.css";
import logo from "./assets/smart-misting-logo.png";

function App() {
  return (
    <div className="app-wrapper">
      <Navbar
        bg="dark"
        variant="dark"
        expand="lg"
        className="app-navbar shadow-sm px-3"
      >
        <Container fluid>
          <Navbar.Brand
            href="#home"
            className="d-flex align-items-center fw-bold fs-5 text-light"
          >
            <img
              src={logo}
              alt="Smart Misting Logo"
              style={{
                width: "48px",
                height: "48px",
                objectFit: "contain",
                marginRight: "8px",
              }}
            />
            Smart Misting System
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto d-flex align-items-center gap-3">
              <Nav.Link
                href="#status"
                className="d-flex align-items-center text-light"
                active
              >
                <FaSmog className="me-2 fs-4" />
                4110
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="app-content py-4 px-5 bg-light min-vh-100">
        <Tab.Container defaultActiveKey="dashboard">
          <Nav
            variant="pills"
            className="app-tabs mb-4 gap-3 justify-content-center"
          >
            <Nav.Item>
              <Nav.Link
                eventKey="dashboard"
                className="d-flex align-items-center gap-2 fw-semibold px-4 py-2 rounded-pill shadow-sm"
              >
                <FaThermometerHalf />
                Dashboard
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="analytics"
                className="d-flex align-items-center gap-2 fw-semibold px-4 py-2 rounded-pill shadow-sm"
              >
                <FaChartLine />
                Analytics
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content className="bg-white p-4 rounded shadow-sm">
            <Tab.Pane eventKey="dashboard">
              <Dashboard />
            </Tab.Pane>
            <Tab.Pane eventKey="analytics">
              <Analytics />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </div>
  );
}

export default App;
