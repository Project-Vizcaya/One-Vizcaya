import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/features/weather/domain/weather_models.dart';
import 'package:one_vizcaya/features/weather/presentation/pagasa_forecast_section.dart';

final _now = DateTime(2026, 10, 10, 21, 20);

PagasaForecast _forecast({bool stale = false}) => PagasaForecast(
      fetchedAt: _now.subtract(const Duration(minutes: 7)),
      barangay: 'Poblacion',
      municipality: 'Bambang',
      stale: stale,
      current: const WeatherPoint(
          source: WeatherSourceId.pagasa, tempC: 29, desc: 'Partly Cloudy',
          heatIndexC: 34, heatIndexDesc: 'Extreme Caution', heatIndexColor: '#FFDC00',
          rainMm: 0.1, rainDesc: 'Light Rain', rainColor: '#7FDBFF'),
      hourly: const [WeatherPoint(source: WeatherSourceId.pagasa, timeLabel: '9:00 PM', tempC: 28, rainMm: 0.1)],
      daily: const [DailyPoint(source: WeatherSourceId.pagasa, dayLabel: 'Today', desc: 'Light Rains', tempMaxC: 32, tempMinC: 22)],
      stations: const [StationReading(siteId: 5076, name: 'Maddela, Quirino', distanceKm: 66, tempC: 26.1, humidityPct: 89)],
    );

Widget _host(WeatherSnapshot<String> s) => MaterialApp(
      home: Scaffold(
        backgroundColor: const Color(0xFF0B1E3B),
        body: SingleChildScrollView(
          child: SizedBox(
            width: 320,
            child: PagasaForecastSection(
              snapshot: s,
              now: _now,
              card: ({required Widget child, EdgeInsets? margin}) => Padding(padding: const EdgeInsets.all(12), child: child),
              title: (String t, {IconData? icon}) => Text(t.toUpperCase()),
            ),
          ),
        ),
      ),
    );

const _alert = AlertsState(
  alerts: [WeatherAlert(id: 'a1', title: 'Thunderstorm Advisory', message: 'Heavy rain over Nueva Vizcaya within 2 hours.')],
  available: true,
);

void main() {
  Future<void> pump(WidgetTester t, WeatherSnapshot<String> s) async {
    t.view.physicalSize = const Size(320, 900);
    t.view.devicePixelRatio = 1.0;
    addTearDown(t.view.reset);
    await t.pumpWidget(_host(s));
    await t.pump();
    expect(t.takeException(), isNull, reason: 'no overflow at 320 dp');
  }

  testWidgets('normal: forecast, PAGASA categories, alert, station, attribution and disclosure', (t) async {
    await pump(t, WeatherSnapshot<String>(mode: WeatherMode.pagasaPrimary, pagasa: _forecast(), alerts: _alert, international: 'x'));
    expect(find.textContaining('Brgy. Poblacion, Bambang'.toUpperCase()), findsOneWidget);
    expect(find.text('29°'), findsOneWidget);
    expect(find.textContaining('Extreme Caution'), findsOneWidget);
    expect(find.textContaining('Light Rain'), findsWidgets);
    expect(find.text('Thunderstorm Advisory'), findsOneWidget);
    expect(find.textContaining('66 KM AWAY'), findsOneWidget);
    expect(find.textContaining('updated 7 min ago'), findsOneWidget);
    expect(find.textContaining('not an official PAGASA app'), findsOneWidget);
    expect(find.textContaining('Data from DOST-PAGASA'), findsOneWidget);
  });

  testWidgets('tapping an alert opens its full message', (t) async {
    await pump(t, WeatherSnapshot<String>(mode: WeatherMode.pagasaPrimary, pagasa: _forecast(), alerts: _alert));
    await t.tap(find.text('Thunderstorm Advisory'));
    await t.pumpAndSettle();
    expect(find.byType(AlertDialog), findsOneWidget);
  });

  testWidgets('stale: last good data is shown and marked as not refreshed', (t) async {
    await pump(t, WeatherSnapshot<String>(
        mode: WeatherMode.pagasaPrimary, pagasa: _forecast(stale: true),
        alerts: AlertsState(available: false, fetchedAt: _now.subtract(const Duration(minutes: 40)))));
    expect(find.textContaining('Not refreshed'), findsOneWidget);
    expect(find.text('Official alerts unavailable'), findsOneWidget);
    expect(find.textContaining('Last updated 40 min ago'), findsOneWidget);
  });

  testWidgets('fallback: PAGASA unavailable, a notice instead of official values', (t) async {
    await pump(t, const WeatherSnapshot<String>(
        mode: WeatherMode.internationalOnly, alerts: AlertsState(), international: 'x'));
    expect(find.textContaining('PAGASA forecast is not available right now'), findsOneWidget);
    expect(find.text('Official alerts unavailable'), findsNothing, reason: 'source is off, not failing');
    expect(find.textContaining('°'), findsNothing);
  });

  testWidgets('switched off on the server: nothing about PAGASA is shown', (t) async {
    await pump(t, const WeatherSnapshot<String>(
        mode: WeatherMode.internationalOnly, alerts: AlertsState(), international: 'x', officialSourceOff: true));
    expect(find.textContaining('PAGASA'), findsNothing);
  });

  testWidgets('side by side: both readings and the "sources differ" hint', (t) async {
    await pump(t, WeatherSnapshot<String>(
        mode: WeatherMode.sideBySide, pagasa: _forecast(), alerts: const AlertsState(available: true), international: 'x',
        internationalSummary: InternationalSummary(tempC: 33.4, desc: 'Clear', fetchedAt: _now)));
    expect(find.text('PAGASA 29°C · Intl 33°C'), findsOneWidget);
    expect(find.textContaining('The two sources differ'), findsOneWidget);
  });
}
