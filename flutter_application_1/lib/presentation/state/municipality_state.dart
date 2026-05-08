import 'package:flutter/foundation.dart';
import '../../core/constants/app_constants.dart';

class MunicipalityState {
  static final MunicipalityState _instance = MunicipalityState._internal();
  factory MunicipalityState() => _instance;
  MunicipalityState._internal();

  ValueNotifier<String> selectedMunicipality = ValueNotifier<String>('Bambang');

  Map<String, dynamic> get activeTheme =>
      AppConstants.municipalityThemes[selectedMunicipality.value] ??
      AppConstants.municipalityThemes['Generic']!;
}

final oneVizcayaState = MunicipalityState();
