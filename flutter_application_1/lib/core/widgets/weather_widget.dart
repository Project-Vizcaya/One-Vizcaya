import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:one_vizcaya/secrets.dart'; // This imports your hidden key

class WeatherWidget extends StatefulWidget {
  const WeatherWidget({super.key});

  @override
  State<WeatherWidget> createState() => _WeatherWidgetState();
}

class _WeatherWidgetState extends State<WeatherWidget> {
  String _weatherInfo = "Loading weather...";
  String _locationName = "Detecting location...";
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchWeather();
  }

  Future<void> _fetchWeather() async {
    try {
      // 1. Get Device Location
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );

      // 2. OpenWeatherMap API Setup
      // We are now using the variable from your secrets.dart file
      const String apiKey = openWeatherApiKey;
      final url = Uri.parse(
        'https://api.openweathermap.org/data/2.5/weather?lat=${position.latitude}&lon=${position.longitude}&appid=$apiKey&units=metric',
      );

      // 3. Make the Request
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _locationName = data['name']; // Gets city name (e.g., Bambang)
          _weatherInfo =
              "${data['main']['temp'].toStringAsFixed(1)}°C - ${data['weather'][0]['description']}";
          _isLoading = false;
        });
      } else {
        setState(() {
          _weatherInfo = "Weather unavailable";
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _weatherInfo = "Error loading weather";
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              _locationName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            const SizedBox(height: 8),
            _isLoading
                ? const CircularProgressIndicator()
                : Text(_weatherInfo, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}
