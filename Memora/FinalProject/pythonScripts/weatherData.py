import time
import json
import threading
import argparse
import logging
import datetime
import requests
import RPi.GPIO as GPIO
from RPLCD.gpio import CharLCD
from flask import Flask, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app and enable CORS
app = Flask(__name__)
CORS(app)

# Initialize LCD 
lcd = CharLCD(
    pin_rs=12, pin_e=16, pins_data=[21, 6, 19, 22],
    numbering_mode=GPIO.BCM,
    cols=16, rows=2, dotsize=8
)

# Global variables for weather
weather_data = None
weather_lock = threading.Lock()
last_updated = None

WEATHER_API_KEY = "xxx" 
DEFAULT_LOCATION = "Ottawa"  # Change to any location

def fetch_weather_data(location=DEFAULT_LOCATION):
    """Fetch weather data from the external API."""
    global weather_data, last_updated
    try:
        url = f"https://api.weatherapi.com/v1/forecast.json?key={WEATHER_API_KEY}&q={location}&days=5&aqi=no&alerts=no"
        logger.info(f"Fetching weather data for {location}")
        response = requests.get(url)
        
        if response.status_code != 200:
            logger.error(f"API request failed with status code {response.status_code}: {response.text}")
            return False

        api_data = response.json()
        current = api_data['current']
        location_data = api_data['location']
        forecast_days = api_data['forecast']['forecastday']
        
        # Format the data for our app
        with weather_lock:
            weather_data = {
                "location": f"{location_data['name']}, {location_data['country']}",
                "temperature": current['temp_c'],
                "feels_like": current['feelslike_c'],
                "humidity": current['humidity'],
                "wind_speed": current['wind_kph'],
                "wind_direction": current['wind_dir'],
                "condition": current['condition']['text'],
                "icon": current['condition']['icon'],
                "forecast": [],
                "last_updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # Process forecast data
            for day in forecast_days:
                day_of_week = datetime.datetime.strptime(day['date'], "%Y-%m-%d").strftime("%a")
                weather_data["forecast"].append({
                    "day": day_of_week,
                    "condition": day['day']['condition']['text'],
                    "max_temp": day['day']['maxtemp_c'],
                    "min_temp": day['day']['mintemp_c'],
                    "icon": day['day']['condition']['icon']
                })
            last_updated = datetime.datetime.now()
            
        logger.info(f"Weather data updated successfully for {location}")
        return True
        
    except Exception as e:
        logger.error(f"Error fetching weather data: {e}")
        return False

def weather_update_loop():
    """Background thread to periodically update weather data."""
    while True:
        success = fetch_weather_data(DEFAULT_LOCATION)
        time.sleep(30 * 60 if success else 2 * 60)

def lcd_update_loop():
    """Background thread to update the LCD with the current weather."""
    while True:
        with weather_lock:
            if weather_data is not None:
                current_temp = weather_data.get("temperature")
                condition = weather_data.get("condition")
            else:
                current_temp, condition = None, None
        
        if current_temp is not None and condition is not None:
            first_line = f"{condition} {current_temp}°C"
            #message based on conditions
            if current_temp < 0:
                second_line = "Bring a jacket"
            elif "rain" in condition.lower():
                second_line = "Bring umbrella"
            elif current_temp >= 25:
                second_line = "Bring water bottle"
            else:
                second_line = "Have a nice day"
            
            lcd.clear()
            lcd.write_string(first_line[:16])
            lcd.cursor_pos = (1, 0)
            lcd.write_string(second_line[:16])
        else:
            lcd.clear()
            lcd.write_string("Waiting for")
            lcd.cursor_pos = (1, 0)
            lcd.write_string("weather data")
            
        # Update every minute
        time.sleep(60)

@app.route('/weather')
def get_weather():
    """API endpoint to get weather data."""
    global weather_data
    with weather_lock:
        if weather_data is None:
            return jsonify({"error": "Weather data not available yet"}), 503
        return jsonify(weather_data)

@app.route('/weather/refresh')
def refresh_weather():
    """API endpoint to force a weather data refresh."""
    success = fetch_weather_data(DEFAULT_LOCATION)
    if success:
        return jsonify({"status": "success", "message": "Weather data refreshed"})
    else:
        return jsonify({"status": "error", "message": "Failed to refresh weather data"}), 500

@app.route('/info')
def get_info():
    """Get server information."""
    global last_updated
    update_age = None
    if last_updated:
        update_age = (datetime.datetime.now() - last_updated).total_seconds()
    return jsonify({
        "service": "Weather API",
        "location": DEFAULT_LOCATION,
        "last_updated": last_updated.strftime("%Y-%m-%d %H:%M:%S") if last_updated else None,
        "update_age_seconds": update_age,
        "uptime": time.time() - start_time
    })

def get_ip_address():
    """Get the server's IP address."""
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        return "Unknown"

if __name__ == '__main__':
    # Record start time
    start_time = time.time()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Weather API Server with LCD Display')
    parser.add_argument('--port', type=int, default=5001, help='Port for the web server (default: 5001)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host for the web server (default: 0.0.0.0)')
    parser.add_argument('--location', type=str, default=DEFAULT_LOCATION, help=f'Location for weather data (default: {DEFAULT_LOCATION})')
    parser.add_argument('--api-key', type=str, help='WeatherAPI.com API key (optional, can also be set in script)')
    args = parser.parse_args()
    
    # Update configuration from command line arguments
    if args.location:
        DEFAULT_LOCATION = args.location
    if args.api_key:
        WEATHER_API_KEY = args.api_key.strip()
    
    if WEATHER_API_KEY == "YOUR_API_KEY":
        logger.warning("You can set the API key with --api-key parameter or by editing this file")
        fetch_weather_data(DEFAULT_LOCATION)
    
    # Start background threads: one for updating weather data and one for updating the LCD
    update_thread = threading.Thread(target=weather_update_loop)
    update_thread.daemon = True
    update_thread.start()
    
    lcd_thread = threading.Thread(target=lcd_update_loop)
    lcd_thread.daemon = True
    lcd_thread.start()
    
    # Print setup info
    ip_address = get_ip_address()
    logger.info("\n" + "="*50)
    logger.info("Weather API Server with LCD Display")
    logger.info(f"Location: {DEFAULT_LOCATION}")
    logger.info(f"Server IP Address: {ip_address}")
    logger.info(f"Web Interface: http://{ip_address}:{args.port}/weather")
    logger.info("="*50 + "\n")
    
    # Start Flask server
    try:
        logger.info(f"Starting web server on {args.host}:{args.port}")
        app.run(host=args.host, port=args.port, threaded=True)
    except KeyboardInterrupt:
        logger.info("\nShutting down...")
    finally:
        GPIO.cleanup()

