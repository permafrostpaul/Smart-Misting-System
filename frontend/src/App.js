import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import MenuIcon from '@mui/icons-material/Menu';
import PieChartIcon from '@mui/icons-material/PieChart';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import useMediaQuery from '@mui/material/useMediaQuery';

const API_BASE_URL = 'http://localhost:8000';

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StatCard = ({ title, value, icon, color }) => (
  <Item elevation={3}>
    {icon}
    <Typography variant="h4" component="div" sx={{ mt: 2, color: color }}>
      {value}
    </Typography>
    <Typography variant="subtitle1" color="text.secondary">
      {title}
    </Typography>
  </Item>
);

const IndicatorBox = styled(Box)(({ theme, status }) => ({
  padding: theme.spacing(2, 4),
  fontSize: '1.5rem',
  fontWeight: 'bold',
  borderRadius: '15px',
  boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
  textAlign: 'center',
  transition: 'all 0.3s ease-in-out',
  backgroundColor: status === 'ON' ? '#28a745' : '#dc3545',
  color: 'white',
}));

function App() {
  const [open, setOpen] = useState(true);
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    misting_status: 'OFF'
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  const [mistDuration, setMistDuration] = useState(30);
  const [humidityThreshold, setHumidityThreshold] = useState(60);
  const [analyticsTab, setAnalyticsTab] = useState(0);
  const [analyticsData, setAnalyticsData] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [stats, setStats] = useState({
    avgTemperature: 0,
    avgHumidity: 0,
    maxTemperature: 0,
    minTemperature: 0,
    maxHumidity: 0,
    minHumidity: 0,
    mistingCycles: 0
  });
  const isMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:960px)');

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleAutoModeChange = (event) => {
    setAutoMode(event.target.checked);
  };

  const handleMistDurationChange = (event, newValue) => {
    setMistDuration(newValue);
  };

  const handleHumidityThresholdChange = (event, newValue) => {
    setHumidityThreshold(newValue);
  };

  const handleAnalyticsTabChange = (event, newValue) => {
    setAnalyticsTab(newValue);
  };

  // Calculate statistics from historical data
  const calculateStats = (data) => {
    if (!data || data.length === 0) return;

    const temperatures = data.map(d => d.temperature).filter(t => t !== null);
    const humidities = data.map(d => d.humidity).filter(h => h !== null);

    if (temperatures.length === 0 || humidities.length === 0) return;

    setStats({
      avgTemperature: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures),
      maxHumidity: Math.max(...humidities),
      minHumidity: Math.min(...humidities),
      mistingCycles: data.filter(d => d.misting_status === 'ON').length
    });
  };

  // Fetch latest sensor data
  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sensor-data`);
      setSensorData(response.data);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    }
  };

  // Fetch historical data
  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/historical-data`);
      setHistoricalData(response.data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const [daily, weekly, monthly] = await Promise.all([
        axios.get(`${API_BASE_URL}/historical-data?limit=24`), // Last 24 hours
        axios.get(`${API_BASE_URL}/historical-data?limit=168`), // Last week
        axios.get(`${API_BASE_URL}/historical-data?limit=720`) // Last month
      ]);

      setAnalyticsData({
        daily: daily.data,
        weekly: weekly.data,
        monthly: monthly.data
      });

      calculateStats(daily.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  // Control misting system
  const controlMisting = async (action) => {
    try {
      await axios.post(`${API_BASE_URL}/control-misting`, { action });
      fetchSensorData(); // Refresh data after control action
    } catch (error) {
      console.error('Error controlling misting system:', error);
    }
  };

  // Fetch data periodically
  useEffect(() => {
    fetchSensorData();
    fetchHistoricalData();
    fetchAnalyticsData();
    
    const interval = setInterval(() => {
      fetchSensorData();
      fetchHistoricalData();
      fetchAnalyticsData();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const renderAnalytics = () => (
    <Grid item xs={12}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          System Analytics
        </Typography>
        
        <Tabs value={analyticsTab} onChange={handleAnalyticsTabChange} sx={{ mb: 2 }}>
          <Tab label="Daily" />
          <Tab label="Weekly" />
          <Tab label="Monthly" />
        </Tabs>

        <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Average Temperature
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.avgTemperature.toFixed(1)}°C
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Average Humidity
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.avgHumidity.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Temperature Range
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.minTemperature.toFixed(1)}°C - {stats.maxTemperature.toFixed(1)}°C
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Humidity Range
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.minHumidity.toFixed(1)}% - {stats.maxHumidity.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>

          {/* Charts */}
          <Grid item xs={12}>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData[analyticsTab === 0 ? 'daily' : analyticsTab === 1 ? 'weekly' : 'monthly']}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return analyticsTab === 0 
                        ? date.toLocaleTimeString() 
                        : date.toLocaleDateString();
                    }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleString();
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f44336"
                    fill="#f44336"
                    fillOpacity={0.3}
                    name="Temperature (°C)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.3}
                    name="Humidity (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Additional Analytics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                System Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">
                    Misting Cycles: {stats.mistingCycles}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total number of misting cycles in the selected period
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">
                    System Uptime: {((stats.mistingCycles / (analyticsData.daily.length || 1)) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentage of time the system was active
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Grid>
  );

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBarStyled position="fixed" open={open}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Smart Misting System
            </Typography>
          </Toolbar>
        </AppBarStyled>
        <Drawer
          sx={{
            width: isMobile ? '100%' : drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: isMobile ? '100%' : drawerWidth,
              boxSizing: 'border-box',
            },
          }}
          variant={isMobile ? "temporary" : "persistent"}
          anchor="left"
          open={open}
          onClose={isMobile ? handleDrawerToggle : undefined}
        >
          <DrawerHeader>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: isMobile ? 1 : 2,
              width: '100%'
            }}>
              <img 
                src="/img/icons/smart-icon.png" 
                alt="Smart Icon" 
                style={{ 
                  width: isMobile ? 32 : 48, 
                  height: isMobile ? 32 : 48, 
                  marginRight: isMobile ? 8 : 12 
                }} 
              />
              <Typography variant={isMobile ? "subtitle1" : "h6"}>
                Smart Misting System
              </Typography>
            </Box>
          </DrawerHeader>
          <List>
            <ListItem 
              button 
              onClick={() => {
                scrollToSection('dashboard');
                if (isMobile) handleDrawerToggle();
              }}
              sx={{ py: isMobile ? 1 : 2 }}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem 
              button 
              onClick={() => {
                scrollToSection('control-panel');
                if (isMobile) handleDrawerToggle();
              }}
              sx={{ py: isMobile ? 1 : 2 }}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Misting Control Panel" />
            </ListItem>
            <ListItem 
              button 
              onClick={() => {
                scrollToSection('analytics');
                if (isMobile) handleDrawerToggle();
              }}
              sx={{ py: isMobile ? 1 : 2 }}
            >
              <ListItemIcon>
                <AnalyticsIcon />
              </ListItemIcon>
              <ListItemText primary="System Analytics" />
            </ListItem>
          </List>
        </Drawer>
        <Main open={open}>
          <DrawerHeader />
          <Container maxWidth="lg" sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 2 : 4, px: isMobile ? 2 : 3 }}>
            <Grid container spacing={isMobile ? 2 : 3}>
              {/* Dashboard Section */}
              <Grid item xs={12} id="dashboard">
                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                  Dashboard
                </Typography>
                <Grid container spacing={isMobile ? 2 : 3}>
                  {/* Status Cards */}
                  <Grid item xs={12} md={4}>
                    <StatCard
                      title="Temperature"
                      value={sensorData.temperature ? `${sensorData.temperature}°C` : 'N/A'}
                      icon={<ThermostatIcon sx={{ fontSize: isMobile ? 32 : 40, color: '#f44336' }} />}
                      color="#f44336"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <StatCard
                      title="Humidity"
                      value={sensorData.humidity ? `${sensorData.humidity}%` : 'N/A'}
                      icon={<WaterDropIcon sx={{ fontSize: isMobile ? 32 : 40, color: '#2196f3' }} />}
                      color="#2196f3"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <StatCard
                      title="Misting Status"
                      value={sensorData.misting_status}
                      icon={<AirIcon sx={{ fontSize: isMobile ? 32 : 40, color: '#4caf50' }} />}
                      color="#4caf50"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Misting Control Panel Section */}
              <Grid item xs={12} id="control-panel">
                <Paper sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                    Misting Control Panel
                  </Typography>
                  <Grid container spacing={isMobile ? 2 : 3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: isMobile ? 2 : 3 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={autoMode}
                              onChange={handleAutoModeChange}
                              color="primary"
                            />
                          }
                          label="Automatic Mode"
                        />
                      </Box>
                      <Box sx={{ mb: isMobile ? 2 : 3 }}>
                        <Typography gutterBottom>Mist Duration (seconds)</Typography>
                        <Slider
                          value={mistDuration}
                          onChange={handleMistDurationChange}
                          min={5}
                          max={60}
                          valueLabelDisplay="auto"
                          disabled={autoMode}
                        />
                      </Box>
                      <Box sx={{ mb: isMobile ? 2 : 3 }}>
                        <Typography gutterBottom>Humidity Threshold (%)</Typography>
                        <Slider
                          value={humidityThreshold}
                          onChange={handleHumidityThresholdChange}
                          min={30}
                          max={90}
                          valueLabelDisplay="auto"
                          disabled={!autoMode}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: isMobile ? 1 : 2 
                      }}>
                        <Typography variant="subtitle1">Current Status</Typography>
                        <IndicatorBox status={sensorData.misting_status}>
                          {sensorData.misting_status}
                        </IndicatorBox>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: isMobile ? 1 : 2, 
                          mt: isMobile ? 1 : 2,
                          flexDirection: isMobile ? 'column' : 'row',
                          width: isMobile ? '100%' : 'auto'
                        }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => controlMisting('ON')}
                            disabled={sensorData.misting_status === 'ON' || autoMode}
                            fullWidth={isMobile}
                          >
                            Turn ON
                          </Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => controlMisting('OFF')}
                            disabled={sensorData.misting_status === 'OFF' || autoMode}
                            fullWidth={isMobile}
                          >
                            Turn OFF
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Analytics Section */}
              <Grid item xs={12} id="analytics">
                <Paper sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                    System Analytics
                  </Typography>
                  
                  <Tabs 
                    value={analyticsTab} 
                    onChange={handleAnalyticsTabChange} 
                    sx={{ mb: isMobile ? 1 : 2 }}
                    variant={isMobile ? "fullWidth" : "standard"}
                  >
                    <Tab label="Daily" />
                    <Tab label="Weekly" />
                    <Tab label="Monthly" />
                  </Tabs>

                  <Grid container spacing={isMobile ? 2 : 3}>
                    {/* Statistics Cards */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: isMobile ? 1 : 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Average Temperature
                        </Typography>
                        <Typography variant={isMobile ? "h5" : "h4"} color="primary">
                          {stats.avgTemperature.toFixed(1)}°C
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: isMobile ? 1 : 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Average Humidity
                        </Typography>
                        <Typography variant={isMobile ? "h5" : "h4"} color="primary">
                          {stats.avgHumidity.toFixed(1)}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: isMobile ? 1 : 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Temperature Range
                        </Typography>
                        <Typography variant={isMobile ? "subtitle1" : "h6"} color="primary">
                          {stats.minTemperature.toFixed(1)}°C - {stats.maxTemperature.toFixed(1)}°C
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: isMobile ? 1 : 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Humidity Range
                        </Typography>
                        <Typography variant={isMobile ? "subtitle1" : "h6"} color="primary">
                          {stats.minHumidity.toFixed(1)}% - {stats.maxHumidity.toFixed(1)}%
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Charts */}
                    <Grid item xs={12}>
                      <Box sx={{ height: isMobile ? 300 : 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={analyticsData[analyticsTab === 0 ? 'daily' : analyticsTab === 1 ? 'weekly' : 'monthly']}
                            margin={{ 
                              top: isMobile ? 5 : 10, 
                              right: isMobile ? 15 : 30, 
                              left: 0, 
                              bottom: 0 
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp" 
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return analyticsTab === 0 
                                  ? date.toLocaleTimeString() 
                                  : date.toLocaleDateString();
                              }}
                              tick={{ fontSize: isMobile ? 10 : 12 }}
                            />
                            <YAxis yAxisId="left" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <Tooltip 
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleString();
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="temperature"
                              stroke="#f44336"
                              fill="#f44336"
                              fillOpacity={0.3}
                              name="Temperature (°C)"
                            />
                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="humidity"
                              stroke="#2196f3"
                              fill="#2196f3"
                              fillOpacity={0.3}
                              name="Humidity (%)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>

                    {/* Additional Analytics */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: isMobile ? 1 : 2 }}>
                        <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                          System Performance
                        </Typography>
                        <Grid container spacing={isMobile ? 1 : 2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant={isMobile ? "body1" : "subtitle1"}>
                              Misting Cycles: {stats.mistingCycles}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total number of misting cycles in the selected period
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant={isMobile ? "body1" : "subtitle1"}>
                              System Uptime: {((stats.mistingCycles / (analyticsData.daily.length || 1)) * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Percentage of time the system was active
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Main>
      </Box>
    </ThemeProvider>
  );
}

export default App; 