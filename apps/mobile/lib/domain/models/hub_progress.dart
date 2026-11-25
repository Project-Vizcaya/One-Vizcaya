/// The PDRRMO Command Hub's progress on a report, as the reporter may see it
/// (docs/4-app-and-website/command-hub.md). Written only by the incidentStatusUpdate function.
/// It holds the stage, a ROUNDED arrival time and the agency's name, never
/// the responder's position or identity.
class HubProgress {
  /// received | validated | dispatched | en_route | on_scene | resolved
  final String stage;
  final int? etaMin;
  final int? etaMax;
  final String? agency;

  const HubProgress({required this.stage, this.etaMin, this.etaMax, this.agency});

  static const stages = [
    'received', 'validated', 'dispatched', 'en_route', 'on_scene', 'resolved',
  ];

  static HubProgress? fromMap(Object? v) {
    if (v is! Map) return null;
    final stage = v['stage'];
    if (stage is! String || !stages.contains(stage)) return null;
    int? n(Object? x) => x is num ? x.toInt() : null;
    final agency = v['agency'];
    return HubProgress(
      stage: stage,
      etaMin: n(v['etaMin']),
      etaMax: n(v['etaMax']),
      agency: agency is String && agency.isNotEmpty ? agency : null,
    );
  }

  int get stageIndex => stages.indexOf(stage);

  /// Shown only while on the way.
  bool get hasEta => stage == 'en_route' && etaMin != null && etaMax != null;
}
