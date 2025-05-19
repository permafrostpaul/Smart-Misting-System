import sys
import requests
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                            QHBoxLayout, QLabel, QPushButton, QFrame, QTabWidget,
                            QComboBox, QFileDialog, QMessageBox, QSpacerItem, QSizePolicy)
from PySide6.QtCore import QTimer, Qt, QPropertyAnimation, QEasingCurve
from PySide6.QtGui import QFont, QPalette, QColor, QIcon, QLinearGradient, QPainter, QBrush
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import pandas as pd
from datetime import datetime, timedelta
import seaborn as sns
import numpy as np

class StyledFrame(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QFrame {
                background-color: #2d2d2d;
                border-radius: 10px;
                border: 1px solid #3d3d3d;
            }
        """)

class StyledButton(QPushButton):
    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self.setStyleSheet("""
            QPushButton {
                background-color: #0d47a1;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1565c0;
                transform: translateY(-2px);
            }
            QPushButton:pressed {
                background-color: #0a3d91;
                transform: translateY(1px);
            }
        """)

class StyledLabel(QLabel):
    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self.setStyleSheet("""
            QLabel {
                color: #ffffff;
                font-size: 14px;
                padding: 5px;
            }
        """)

class AnalyticsWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setSpacing(20)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Time range selector
        time_frame = StyledFrame()
        time_layout = QHBoxLayout(time_frame)
        self.time_range = QComboBox()
        self.time_range.addItems(["Last 24 Hours", "Last Week", "Last Month"])
        self.time_range.setStyleSheet("""
            QComboBox {
                background-color: #363636;
                color: white;
                border: 1px solid #0d47a1;
                padding: 8px;
                border-radius: 5px;
                min-width: 200px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox::down-arrow {
                image: none;
                border: none;
            }
        """)
        self.time_range.currentTextChanged.connect(self.update_analytics)
        time_layout.addWidget(QLabel("Time Range:"))
        time_layout.addWidget(self.time_range)
        layout.addWidget(time_frame)
        
        # Statistics frame
        stats_frame = StyledFrame()
        stats_layout = QHBoxLayout(stats_frame)
        stats_layout.setSpacing(20)
        
        # Temperature stats
        temp_stats = StyledFrame()
        temp_layout = QVBoxLayout(temp_stats)
        temp_layout.setSpacing(10)
        self.temp_avg = StyledLabel("Avg: --°C")
        self.temp_max = StyledLabel("Max: --°C")
        self.temp_min = StyledLabel("Min: --°C")
        temp_layout.addWidget(StyledLabel("Temperature Statistics"))
        temp_layout.addWidget(self.temp_avg)
        temp_layout.addWidget(self.temp_max)
        temp_layout.addWidget(self.temp_min)
        stats_layout.addWidget(temp_stats)
        
        # Humidity stats
        hum_stats = StyledFrame()
        hum_layout = QVBoxLayout(hum_stats)
        hum_layout.setSpacing(10)
        self.hum_avg = StyledLabel("Avg: --%")
        self.hum_max = StyledLabel("Max: --%")
        self.hum_min = StyledLabel("Min: --%")
        hum_layout.addWidget(StyledLabel("Humidity Statistics"))
        hum_layout.addWidget(self.hum_avg)
        hum_layout.addWidget(self.hum_max)
        hum_layout.addWidget(self.hum_min)
        stats_layout.addWidget(hum_stats)
        
        layout.addWidget(stats_frame)
        
        # Analytics graphs
        graph_frame = StyledFrame()
        graph_layout = QVBoxLayout(graph_frame)
        self.figure = Figure(figsize=(8, 6))
        self.canvas = FigureCanvas(self.figure)
        self.ax1 = self.figure.add_subplot(211)
        self.ax2 = self.figure.add_subplot(212)
        
        # Set dark theme for graphs
        plt.style.use('dark_background')
        self.figure.patch.set_facecolor('#2d2d2d')
        self.ax1.set_facecolor('#363636')
        self.ax2.set_facecolor('#363636')
        
        graph_layout.addWidget(self.canvas)
        layout.addWidget(graph_frame)
        
        # Export button
        export_btn = StyledButton("Export Data")
        export_btn.clicked.connect(self.export_data)
        layout.addWidget(export_btn)
        
        self.setStyleSheet("""
            QWidget {
                background-color: #1e1e1e;
            }
        """)
    
    def update_analytics(self):
        try:
            # Get historical data based on selected time range
            time_range = self.time_range.currentText()
            limit = 100 if time_range == "Last 24 Hours" else (700 if time_range == "Last Week" else 3000)
            
            response = requests.get(f"http://localhost:8000/historical-data?limit={limit}")
            data = response.json()
            
            if not data:
                return
            
            df = pd.DataFrame(data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Calculate statistics
            temp_stats = df['temperature'].agg(['mean', 'max', 'min'])
            hum_stats = df['humidity'].agg(['mean', 'max', 'min'])
            
            # Update statistics labels
            self.temp_avg.setText(f"Average: {temp_stats['mean']:.1f}°C")
            self.temp_max.setText(f"Maximum: {temp_stats['max']:.1f}°C")
            self.temp_min.setText(f"Minimum: {temp_stats['min']:.1f}°C")
            
            self.hum_avg.setText(f"Average: {hum_stats['mean']:.1f}%")
            self.hum_max.setText(f"Maximum: {hum_stats['max']:.1f}%")
            self.hum_min.setText(f"Minimum: {hum_stats['min']:.1f}%")
            
            # Update graphs
            self.ax1.clear()
            self.ax2.clear()
            
            # Temperature trend
            self.ax1.plot(df['timestamp'], df['temperature'], 'r-', label='Temperature')
            self.ax1.set_title('Temperature Trend')
            self.ax1.set_ylabel('Temperature (°C)')
            self.ax1.grid(True, color='gray', alpha=0.3)
            self.ax1.legend()
            
            # Humidity trend
            self.ax2.plot(df['timestamp'], df['humidity'], 'b-', label='Humidity')
            self.ax2.set_title('Humidity Trend')
            self.ax2.set_xlabel('Time')
            self.ax2.set_ylabel('Humidity (%)')
            self.ax2.grid(True, color='gray', alpha=0.3)
            self.ax2.legend()
            
            self.figure.tight_layout()
            self.canvas.draw()
            
        except Exception as e:
            print(f"Error updating analytics: {e}")
    
    def export_data(self):
        try:
            file_name, _ = QFileDialog.getSaveFileName(
                self, "Export Data", "", "CSV Files (*.csv);;Excel Files (*.xlsx)")
            
            if file_name:
                response = requests.get("http://localhost:8000/historical-data?limit=1000")
                data = response.json()
                df = pd.DataFrame(data)
                
                if file_name.endswith('.csv'):
                    df.to_csv(file_name, index=False)
                else:
                    df.to_excel(file_name, index=False)
                
                QMessageBox.information(self, "Success", "Data exported successfully!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to export data: {str(e)}")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Smart Misting System")
        self.setMinimumSize(1200, 800)
        
        # Set application style
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1e1e1e;
            }
            QTabWidget::pane {
                border: 1px solid #3d3d3d;
                background-color: #1e1e1e;
                border-radius: 10px;
            }
            QTabBar::tab {
                background-color: #2d2d2d;
                color: white;
                padding: 10px 20px;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background-color: #0d47a1;
            }
            QTabBar::tab:hover:!selected {
                background-color: #363636;
            }
        """)
        
        # Create central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(20)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Create tab widget
        tabs = QTabWidget()
        
        # Dashboard tab
        dashboard = QWidget()
        dashboard_layout = QVBoxLayout(dashboard)
        dashboard_layout.setSpacing(20)
        
        # Create status frame
        status_frame = StyledFrame()
        status_layout = QHBoxLayout(status_frame)
        status_layout.setSpacing(20)
        
        # Temperature display
        temp_frame = StyledFrame()
        temp_layout = QVBoxLayout(temp_frame)
        self.temp_label = StyledLabel("Temperature: --°C")
        self.temp_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        temp_layout.addWidget(self.temp_label)
        status_layout.addWidget(temp_frame)
        
        # Humidity display
        hum_frame = StyledFrame()
        hum_layout = QVBoxLayout(hum_frame)
        self.humidity_label = StyledLabel("Humidity: --%")
        self.humidity_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        hum_layout.addWidget(self.humidity_label)
        status_layout.addWidget(hum_frame)
        
        # Misting status
        mist_frame = StyledFrame()
        mist_layout = QVBoxLayout(mist_frame)
        self.misting_status = StyledLabel("Misting: OFF")
        self.misting_status.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        mist_layout.addWidget(self.misting_status)
        status_layout.addWidget(mist_frame)
        
        dashboard_layout.addWidget(status_frame)
        
        # Create control buttons
        control_frame = StyledFrame()
        control_layout = QHBoxLayout(control_frame)
        control_layout.setSpacing(20)
        
        self.on_button = StyledButton("Turn ON Misting")
        self.on_button.clicked.connect(lambda: self.control_misting("ON"))
        control_layout.addWidget(self.on_button)
        
        self.off_button = StyledButton("Turn OFF Misting")
        self.off_button.clicked.connect(lambda: self.control_misting("OFF"))
        control_layout.addWidget(self.off_button)
        
        dashboard_layout.addWidget(control_frame)
        
        # Create real-time graph
        graph_frame = StyledFrame()
        graph_layout = QVBoxLayout(graph_frame)
        self.figure = Figure(figsize=(8, 4))
        self.canvas = FigureCanvas(self.figure)
        self.ax = self.figure.add_subplot(111)
        
        # Set dark theme for graph
        plt.style.use('dark_background')
        self.figure.patch.set_facecolor('#2d2d2d')
        self.ax.set_facecolor('#363636')
        
        graph_layout.addWidget(self.canvas)
        dashboard_layout.addWidget(graph_frame)
        
        # Add dashboard tab
        tabs.addTab(dashboard, "Dashboard")
        
        # Add analytics tab
        self.analytics = AnalyticsWidget()
        tabs.addTab(self.analytics, "Analytics")
        
        layout.addWidget(tabs)
        
        # Set up timer for updates
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_data)
        self.timer.start(2000)  # Update every 2 seconds
        
        # Initialize data
        self.temperature_data = []
        self.humidity_data = []
        self.time_data = []
        
    def update_data(self):
        try:
            # Get current sensor data
            response = requests.get("http://localhost:8000/sensor-data")
            data = response.json()
            
            # Update labels
            if data["temperature"] is not None:
                self.temp_label.setText(f"Temperature: {data['temperature']:.1f}°C")
            if data["humidity"] is not None:
                self.humidity_label.setText(f"Humidity: {data['humidity']:.1f}%")
            self.misting_status.setText(f"Misting: {data['misting_status']}")
            
            # Get historical data
            response = requests.get("http://localhost:8000/historical-data?limit=50")
            historical_data = response.json()
            
            # Update graph data
            self.temperature_data = [d["temperature"] for d in historical_data]
            self.humidity_data = [d["humidity"] for d in historical_data]
            self.time_data = [datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00"))
                            for d in historical_data]
            
            # Update graph
            self.update_graph()
            
            # Update analytics
            self.analytics.update_analytics()
            
        except requests.exceptions.RequestException as e:
            print(f"Error updating data: {e}")
    
    def update_graph(self):
        self.ax.clear()
        self.ax.plot(self.time_data, self.temperature_data, 'r-', label='Temperature')
        self.ax.plot(self.time_data, self.humidity_data, 'b-', label='Humidity')
        self.ax.set_xlabel('Time')
        self.ax.set_ylabel('Value')
        self.ax.set_title('Temperature and Humidity History')
        self.ax.legend()
        self.ax.grid(True, color='gray')
        self.figure.autofmt_xdate()
        self.canvas.draw()
    
    def control_misting(self, action):
        try:
            response = requests.post(f"http://localhost:8000/control-misting?action={action}")
            if response.status_code == 200:
                print(f"Misting system turned {action}")
            else:
                print(f"Error controlling misting system: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Error controlling misting system: {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec()) 