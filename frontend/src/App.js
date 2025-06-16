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
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Better touch target
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '12px', // Larger touch target
        },
      },
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
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
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
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
  },
}));

const StatCard = ({ title, value, icon, color }) => (
  <Item elevation={3}>
    {icon}
    <Typography
      variant="h4"
      component="div"
      sx={{
        mt: 2,
        color: color,
        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
      }}
    >
      {value}
    </Typography>
    <Typography
      variant="subtitle1"
      color="text.secondary"
      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
    >
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
    sensor1_temperature: null,
    sensor1_humidity: null,
    sensor2_temperature: null,
    sensor2_humidity: null,
    avg_temperature: null,
    avg_humidity: null,
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
    mistingCycles: 0,
    sensor1AvgTemp: 0,
    sensor1AvgHumidity: 0,
    sensor2AvgTemp: 0,
    sensor2AvgHumidity: 0
  });
  const isMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:960px)');

  const handleDrawerToggle = () => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(!open);
    }
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
      mistingCycles: data.filter(d => d.misting_status === 'ON').length,
      sensor1AvgTemp: temperatures.filter(t => t !== null && t >= 20 && t <= 30).reduce((a, b) => a + b, 0) / temperatures.filter(t => t !== null && t >= 20 && t <= 30).length,
      sensor1AvgHumidity: humidities.filter(h => h !== null && h >= 40 && h <= 60).reduce((a, b) => a + b, 0) / humidities.filter(h => h !== null && h >= 40 && h <= 60).length,
      sensor2AvgTemp: temperatures.filter(t => t !== null && t >= 25 && t <= 35).reduce((a, b) => a + b, 0) / temperatures.filter(t => t !== null && t >= 25 && t <= 35).length,
      sensor2AvgHumidity: humidities.filter(h => h !== null && h >= 50 && h <= 70).reduce((a, b) => a + b, 0) / humidities.filter(h => h !== null && h >= 50 && h <= 70).length
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
      <Item elevation={3}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
        >
          System Analytics
        </Typography>

        <Tabs
          value={analyticsTab}
          onChange={handleAnalyticsTabChange}
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: '80px', sm: '100px' }
            }
          }}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab label="Daily" />
          <Tab label="Weekly" />
          <Tab label="Monthly" />
        </Tabs>

        <Grid container spacing={isMobile ? 1 : 2}>
          {/* Statistics Cards */}
          <Grid item xs={6} sm={3}>
            <Item elevation={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sensor 1 Avg Temperature
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
              >
                {stats.sensor1AvgTemp.toFixed(1)}°C
              </Typography>
            </Item>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Item elevation={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sensor 2 Avg Temperature
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
              >
                {stats.sensor2AvgTemp.toFixed(1)}°C
              </Typography>
            </Item>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Item elevation={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sensor 1 Avg Humidity
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
              >
                {stats.sensor1AvgHumidity.toFixed(1)}%
              </Typography>
            </Item>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Item elevation={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sensor 2 Avg Humidity
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' } }}
              >
                {stats.sensor2AvgHumidity.toFixed(1)}%
              </Typography>
            </Item>
          </Grid>

          {/* Charts */}
          <Grid item xs={12}>
            <Box sx={{ height: { xs: 250, sm: 300, md: 400 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData[analyticsTab === 0 ? 'daily' : analyticsTab === 1 ? 'weekly' : 'monthly']}
                  margin={{
                    top: { xs: 10, sm: 20 },
                    right: { xs: 20, sm: 40 },
                    left: { xs: 10, sm: 20 },
                    bottom: { xs: 20, sm: 40 }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (analyticsTab === 0) {
                        // For daily view, show HH:mm
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } else if (analyticsTab === 1) {
                        // For weekly view, show MMM DD
                        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      } else {
                        // For monthly view, show MMM DD
                        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      }
                    }}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 60 : 80}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    width={isMobile ? 40 : 50}
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Temperature (°C)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: isMobile ? 10 : 12 }
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    width={isMobile ? 40 : 50}
                    domain={['auto', 'auto']}
                    label={{
                      value: 'Humidity (%)',
                      angle: 90,
                      position: 'insideRight',
                      style: { fontSize: isMobile ? 10 : 12 }
                    }}
                  />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleString();
                    }}
                    contentStyle={{
                      fontSize: isMobile ? '12px' : '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: isMobile ? '10px' : '12px',
                      paddingTop: isMobile ? '5px' : '10px'
                    }}
                    verticalAlign="top"
                    height={36}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sensor1_temperature"
                    stroke="#f44336"
                    fill="#f44336"
                    fillOpacity={0.2}
                    name="Sensor 1 Temperature (°C)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sensor2_temperature"
                    stroke="#ff9800"
                    fill="#ff9800"
                    fillOpacity={0.2}
                    name="Sensor 2 Temperature (°C)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="sensor1_humidity"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.2}
                    name="Sensor 1 Humidity (%)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="sensor2_humidity"
                    stroke="#4caf50"
                    fill="#4caf50"
                    fillOpacity={0.2}
                    name="Sensor 2 Humidity (%)"
                    dot={false}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Additional Analytics */}
          <Grid item xs={12}>
            <Item elevation={2}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                System Performance
              </Typography>
              <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    Misting Cycles: {stats.mistingCycles}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Total number of misting cycles in the selected period
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    System Uptime: {((stats.mistingCycles / (analyticsData.daily.length || 1)) * 100).toFixed(1)}%
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Percentage of time the system was active
                  </Typography>
                </Grid>
              </Grid>
            </Item>
          </Grid>
        </Grid>
      </Item>
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
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
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
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              Smart Misting System
            </Typography>
          </Toolbar>
        </AppBarStyled>
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
          variant={isMobile ? 'temporary' : 'persistent'}
          anchor="left"
          open={open}
          onClose={handleDrawerToggle}
        >
          <DrawerHeader />
          <List>
            <ListItem button onClick={handleDrawerToggle}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              />
            </ListItem>
            <ListItem button onClick={handleDrawerToggle}>
              <ListItemIcon>
                <AnalyticsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Analytics"
                primaryTypographyProps={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              />
            </ListItem>
            <ListItem button onClick={handleDrawerToggle}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              />
            </ListItem>
          </List>
        </Drawer>
        <Main open={open}>
          <DrawerHeader />
          <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
            <Grid container spacing={isMobile ? 1 : 2}>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Sensor 1 Temperature"
                  value={`${sensorData.sensor1_temperature?.toFixed(1) || 'N/A'}°C`}
                  icon={<ThermostatIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#f44336' }} />}
                  color="#f44336"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Sensor 2 Temperature"
                  value={`${sensorData.sensor2_temperature?.toFixed(1) || 'N/A'}°C`}
                  icon={<ThermostatIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#f44336' }} />}
                  color="#f44336"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Average Temperature"
                  value={`${sensorData.avg_temperature?.toFixed(1) || 'N/A'}°C`}
                  icon={<ThermostatIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#f44336' }} />}
                  color="#f44336"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Sensor 1 Humidity"
                  value={`${sensorData.sensor1_humidity?.toFixed(1) || 'N/A'}%`}
                  icon={<AirIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#2196f3' }} />}
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Sensor 2 Humidity"
                  value={`${sensorData.sensor2_humidity?.toFixed(1) || 'N/A'}%`}
                  icon={<AirIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#2196f3' }} />}
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Average Humidity"
                  value={`${sensorData.avg_humidity?.toFixed(1) || 'N/A'}%`}
                  icon={<AirIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#2196f3' }} />}
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Misting Status"
                  value={sensorData.misting_status}
                  icon={<WaterDropIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: sensorData.misting_status === 'ON' ? '#4caf50' : '#f44336' }} />}
                  color={sensorData.misting_status === 'ON' ? '#4caf50' : '#f44336'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Item elevation={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoMode}
                        onChange={handleAutoModeChange}
                        color="primary"
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Auto Mode
                      </Typography>
                    }
                  />
                  <Box sx={{ mt: 2, width: '100%' }}>
                    <Typography
                      gutterBottom
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      Mist Duration: {mistDuration}s
                    </Typography>
                    <Slider
                      value={mistDuration}
                      onChange={handleMistDurationChange}
                      min={5}
                      max={60}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Item>
              </Grid>
            </Grid>

            {renderAnalytics()}

            <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Item elevation={3}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 2 }
                  }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => controlMisting('ON')}
                      sx={{
                        minWidth: { xs: '100%', sm: '150px' },
                        height: { xs: '48px', sm: '44px' }
                      }}
                    >
                      Start Misting
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => controlMisting('OFF')}
                      sx={{
                        minWidth: { xs: '100%', sm: '150px' },
                        height: { xs: '48px', sm: '44px' }
                      }}
                    >
                      Stop Misting
                    </Button>
                  </Box>
                </Item>
              </Grid>
            </Grid>
          </Container>
        </Main>
      </Box>
    </ThemeProvider>
  );
}

export default App; 