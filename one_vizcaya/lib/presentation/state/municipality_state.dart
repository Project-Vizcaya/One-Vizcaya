import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';

class MunicipalityState {
  static final MunicipalityState _instance = MunicipalityState._internal();
  factory MunicipalityState() => _instance;
  MunicipalityState._internal();

  ValueNotifier<String> selectedMunicipality = ValueNotifier<String>('Bambang');
  ValueNotifier<String> language = ValueNotifier<String>('English');

  Map<String, dynamic> get activeTheme =>
      AppConstants.municipalityThemes[selectedMunicipality.value] ??
      AppConstants.municipalityThemes['Generic']!;

  Future<void> loadPersistedState() async {
    final prefs = await SharedPreferences.getInstance();
    selectedMunicipality.value = prefs.getString('selected_municipality') ?? 'Bambang';
    language.value = prefs.getString('language') ?? 'English';
  }

  Future<void> setMunicipality(String municipality) async {
    selectedMunicipality.value = municipality;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_municipality', municipality);
  }

  Future<void> setLanguage(String lang) async {
    language.value = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
  }
}

final oneVizcayaState = MunicipalityState();
