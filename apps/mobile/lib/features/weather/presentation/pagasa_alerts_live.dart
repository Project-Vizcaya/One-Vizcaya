import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../data/pagasa/pagasa_mapper.dart';
import '../domain/weather_models.dart';
import 'pagasa_forecast_section.dart';

/// Live official PAGASA alerts for Nueva Vizcaya, for screens outside the
/// weather screen (emergency contacts). Shows nothing when the PAGASA source
/// is switched off or there is no active alert, and never another source's
/// warnings.
class PagasaAlertsLive extends StatelessWidget {
  const PagasaAlertsLive({super.key});

  @override
  Widget build(BuildContext context) {
    final col = FirebaseFirestore.instance.collection('weather_pagasa');
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: col.doc('_status').snapshots(),
      builder: (context, status) {
        final mode = WeatherMode.parse(status.data?.data()?['mode'] as String?);
        if (mode == WeatherMode.internationalOnly) return const SizedBox.shrink();
        return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          stream: col.doc('alerts').snapshots(),
          builder: (context, snap) {
            final data = snap.data?.data();
            if (data == null) return const SizedBox.shrink();
            final alerts = pagasaAlertsFromMap(data, DateTime.now());
            if (alerts.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PagasaAlertsBanner(state: AlertsState(alerts: alerts, available: true)),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
                  child: Text(kPagasaDisclosure,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
