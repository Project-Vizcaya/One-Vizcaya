import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/utils/callable.dart';
import '../../domain/weather_models.dart';
import '../weather_source.dart';
import 'pagasa_mapper.dart';

/// Reads One Vizcaya's server copy of PAGASA data: Firestore documents written
/// by pagasaMobileWatch, and the getPagasaForecast callable for a barangay-
/// level forecast. The phone never calls PAGASA itself.
class FirebasePagasaSource implements PagasaSource {
  FirebasePagasaSource({FirebaseFirestore? firestore}) : _db = firestore ?? FirebaseFirestore.instance;
  final FirebaseFirestore _db;

  static String _muniDocId(String name) => 'muni_${name.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '_')}';

  @override
  Future<PagasaStatus> status() async {
    final snap = await _db.collection('weather_pagasa').doc('_status').get();
    return PagasaStatus(WeatherMode.parse(snap.data()?['mode'] as String?));
  }

  @override
  Future<PagasaForecast?> pointForecast(double lat, double lon) async {
    final res = await callFunction('getPagasaForecast', {'lat': lat, 'lon': lon},
        timeout: const Duration(seconds: 15));
    if (res is! Map || res['available'] != true) return null;
    return pagasaForecastFromMap(Map<String, dynamic>.from(res));
  }

  @override
  Future<PagasaForecast?> municipalityForecast(String municipality) async {
    final snap = await _db.collection('weather_pagasa').doc(_muniDocId(municipality)).get();
    final data = snap.data();
    return data == null ? null : pagasaForecastFromMap(data, municipalityLevel: true);
  }

  @override
  Future<AlertsState> alerts(DateTime now) async {
    final snap = await _db.collection('weather_pagasa').doc('alerts').get();
    final data = snap.data();
    if (data == null) throw StateError('No PAGASA alerts document yet');
    final checked = data['checkedAtMs'];
    return AlertsState(
      alerts: pagasaAlertsFromMap(data, now),
      available: true,
      fetchedAt: checked is num ? DateTime.fromMillisecondsSinceEpoch(checked.toInt()) : null,
    );
  }
}
