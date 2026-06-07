import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';

class GeolocatorService {
  Future<Position?> getCurrentLocation() async {
    try {
      bool serviceEnabled;
      LocationPermission permission;

      // Test if location services are enabled.
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled.');
        return null;
      }

      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('Location permissions are denied');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('Location permissions are permanently denied.');
        return null;
      }

      // When we reach here, permissions are granted and we can continue accessing the position of the device.
      return await Geolocator.getCurrentPosition();
    } catch (e) {
      debugPrint('Error fetching location: $e');
      return null;
    }
  }
}
