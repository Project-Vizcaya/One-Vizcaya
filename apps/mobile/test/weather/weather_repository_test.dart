import 'package:flutter_test/flutter_test.dart';
import 'package:one_vizcaya/features/weather/data/pagasa/pagasa_mapper.dart';
import 'package:one_vizcaya/features/weather/data/weather_repository.dart';
import 'package:one_vizcaya/features/weather/data/weather_source.dart';
import 'package:one_vizcaya/features/weather/domain/weather_models.dart';

final _now = DateTime(2026, 10, 10, 21, 20);

PagasaForecast _forecast({double temp = 29, double rain = 0, bool muni = false, DateTime? at}) => PagasaForecast(
      fetchedAt: at ?? _now.subtract(const Duration(minutes: 5)),
      barangay: 'Poblacion',
      municipality: 'Bambang',
      municipalityLevel: muni,
      current: WeatherPoint(source: WeatherSourceId.pagasa, tempC: temp, rainMm: rain),
    );

class _FakePagasa implements PagasaSource {
  WeatherMode mode = WeatherMode.pagasaPrimary;
  bool statusFails = false, pointFails = false, alertsFail = false;
  PagasaForecast? point = _forecast();
  PagasaForecast? muni = _forecast(muni: true);
  int calls = 0;

  @override
  Future<PagasaStatus> status() async {
    if (statusFails) throw StateError('offline');
    return PagasaStatus(mode);
  }

  @override
  Future<PagasaForecast?> pointForecast(double lat, double lon) async {
    calls++;
    if (pointFails) throw StateError('timeout');
    return point;
  }

  @override
  Future<PagasaForecast?> municipalityForecast(String municipality) async {
    calls++;
    return muni;
  }

  @override
  Future<AlertsState> alerts(DateTime now) async {
    calls++;
    if (alertsFail) throw StateError('down');
    return AlertsState(
      alerts: const [WeatherAlert(id: 'a1', title: 'Thunderstorm Advisory', message: 'Rain over Nueva Vizcaya')],
      available: true,
      fetchedAt: now,
    );
  }
}

class _FakeIntl implements InternationalSource<String> {
  int calls = 0;
  bool fails = false;
  double temp = 30;
  double rain = 0;

  @override
  Future<String> fetch(String municipality, {double? lat, double? lon}) async {
    calls++;
    if (fails) throw StateError('down');
    return 'intl';
  }

  @override
  InternationalSummary summarize(String data) =>
      InternationalSummary(tempC: temp, desc: 'Clouds', rainNextHourMm: rain, fetchedAt: _now);
}

void main() {
  late _FakePagasa pagasa;
  late _FakeIntl intl;
  late WeatherRepository<String> repo;
  Future<WeatherSnapshot<String>> load({WeatherMode? override, bool gps = true}) => repo.load(
      municipality: 'Bambang', lat: gps ? 16.38 : null, lon: gps ? 121.07 : null, userOverride: override, now: _now);

  setUp(() {
    pagasa = _FakePagasa();
    intl = _FakeIntl();
    repo = WeatherRepository<String>(pagasa: pagasa, international: intl);
  });

  test('pagasaPrimary: PAGASA forecast and alerts, international fetched for the gaps', () async {
    final s = await load();
    expect(s.mode, WeatherMode.pagasaPrimary);
    expect(s.pagasa!.current!.source, WeatherSourceId.pagasa);
    expect(s.pagasa!.municipalityLevel, isFalse);
    expect(s.alerts.available, isTrue);
    expect(s.alerts.alerts.single.id, 'a1');
    expect(s.international, 'intl');
  });

  test('pagasaOnly: no international call at all', () async {
    pagasa.mode = WeatherMode.pagasaOnly;
    final s = await load();
    expect(s.mode, WeatherMode.pagasaOnly);
    expect(intl.calls, 0);
    expect(s.international, isNull);
  });

  test('kill switch (server says internationalOnly): zero PAGASA data calls, override ignored', () async {
    pagasa.mode = WeatherMode.internationalOnly;
    final s = await load(override: WeatherMode.pagasaOnly);
    expect(s.mode, WeatherMode.internationalOnly);
    expect(pagasa.calls, 0);
    expect(s.pagasa, isNull);
    expect(s.international, 'intl');
    expect(s.alerts.alerts, isEmpty, reason: 'alerts are never filled from the international source');
    expect(s.officialSourceOff, isTrue);
  });

  test('sideBySide: both shown; hint when temperatures differ by more than 3 °C', () async {
    pagasa.mode = WeatherMode.sideBySide;
    intl.temp = 33.5;
    expect((await load()).sourcesDiffer, isTrue);
    intl.temp = 31;
    expect((await load()).sourcesDiffer, isFalse);
  });

  test('sideBySide: hint when one source reports rain and the other none', () async {
    pagasa.mode = WeatherMode.sideBySide;
    pagasa.point = _forecast(rain: 2.5);
    intl.temp = 29;
    expect((await load()).sourcesDiffer, isTrue);
  });

  test('point lookup fails (timeout): falls back to the town-centre forecast', () async {
    pagasa.pointFails = true;
    final s = await load();
    expect(s.pagasa!.municipalityLevel, isTrue);
    expect(s.mode, WeatherMode.pagasaPrimary);
  });

  test('no GPS: the town-centre forecast is used', () async {
    final s = await load(gps: false);
    expect(s.pagasa!.municipalityLevel, isTrue);
  });

  test('PAGASA has nothing: international shown, mode in effect becomes internationalOnly', () async {
    pagasa.point = null;
    pagasa.muni = null;
    final s = await load();
    expect(s.mode, WeatherMode.internationalOnly);
    expect(s.international, 'intl');
  });

  test('alerts unavailable: flagged, with the last known time, never replaced', () async {
    await load();
    pagasa.alertsFail = true;
    final s = await load();
    expect(s.alerts.available, isFalse);
    expect(s.alerts.fetchedAt, _now);
  });

  test('an old forecast is shown but marked stale', () async {
    pagasa.point = _forecast(at: _now.subtract(const Duration(hours: 2)));
    expect((await load()).pagasa!.stale, isTrue);
  });

  test('status unknown (offline): cached official data is still tried', () async {
    pagasa.statusFails = true;
    final s = await load();
    expect(s.pagasa, isNotNull);
    expect(s.mode, WeatherMode.pagasaPrimary);
  });

  test('user override applies when PAGASA is on', () async {
    final s = await load(override: WeatherMode.sideBySide);
    expect(s.mode, WeatherMode.sideBySide);
  });

  group('mapper', () {
    final doc = {
      'fetchedAtMs': _now.millisecondsSinceEpoch,
      'stale': true,
      'forecast': {
        'place': {'barangay': 'Poblacion', 'municipality': 'Bambang'},
        'current': {'tempC': 24, 'desc': 'Cloudy', 'heatIndexDesc': 'Not Hazardous', 'heatIndexColor': '#2ECC40', 'rainMm': 'bad'},
        'hourly': [
          {'timeLabel': '9:00 PM', 'tempC': 24, 'timeMs': _now.millisecondsSinceEpoch},
          'garbage',
          {'timeLabel': '10:00 PM', 'tempC': null},
        ],
        'daily': [{'dayLabel': 'Today', 'tempMaxC': 32, 'tempMinC': 22, 'heatIndexMaxDesc': 'Extreme Caution'}],
        'links': {'rainMap': 'https://example.org/rain.gif'},
      },
      'stations': [
        {'siteId': 5076, 'name': 'Maddela, Quirino', 'distanceKm': 66, 'reading': {'tempC': 26.14, 'humidityPct': 89.2}},
        {'name': 'no id'},
      ],
    };

    test('maps a server document, dropping bad fields and rows but keeping the rest', () {
      final f = pagasaForecastFromMap(doc)!;
      expect(f.barangay, 'Poblacion');
      expect(f.current!.tempC, 24);
      expect(f.current!.rainMm, isNull, reason: 'wrong type becomes null');
      expect(f.current!.heatIndexDesc, 'Not Hazardous');
      expect(f.hourly.length, 2);
      expect(f.hourly[1].tempC, isNull);
      expect(f.daily.single.heatIndexMaxDesc, 'Extreme Caution');
      expect(f.stations.single.siteId, 5076);
      expect(f.stale, isTrue);
      expect(f.rainMapUrl, 'https://example.org/rain.gif');
    });

    test('unusable documents map to null', () {
      expect(pagasaForecastFromMap({}), isNull);
      expect(pagasaForecastFromMap({'forecast': {'current': {'tempC': 1}}}), isNull, reason: 'no fetch time');
      expect(pagasaForecastFromMap({'fetchedAtMs': 1, 'forecast': {'hourly': []}}), isNull);
    });

    test('alerts: expired ones are dropped on the phone too', () {
      final alerts = pagasaAlertsFromMap({
        'active': [
          {'id': 'live', 'title': 'Advisory', 'message': 'm', 'validUntilMs': _now.add(const Duration(hours: 1)).millisecondsSinceEpoch},
          {'id': 'over', 'title': 'Old', 'message': 'm', 'validUntilMs': _now.subtract(const Duration(minutes: 1)).millisecondsSinceEpoch},
          {'id': 'open', 'title': 'No expiry', 'message': 'm'},
        ],
      }, _now);
      expect(alerts.map((a) => a.id), ['live', 'open']);
    });
  });
}
