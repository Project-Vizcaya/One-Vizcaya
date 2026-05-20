import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../enums/report_category.dart';
import '../enums/report_status.dart';
import '../enums/report_priority.dart';

class ProblemReport {
  final String id;
  final ReportCategory category;
  final String description;
  final String location;
  final String municipality;
  final ReportStatus status;
  final ReportPriority priority;
  final int priorityScore;
  final int duplicateCount;
  final DateTime reportedAt;
  final double? latitude;
  final double? longitude;
  final String? userId;
  final String? userPhone;

  // Photo evidence
  final String? imageUrl;
  final DateTime? photoTimestamp;
  final double? photoLatitude;
  final double? photoLongitude;

  // Escalation
  final bool escalatedToProvince;
  final DateTime? escalatedAt;

  // Anonymous reporting
  final bool isAnonymous;

  // SLA tracking
  final DateTime? resolvedAt;

  // Barangay
  final String? barangay;

  ProblemReport({
    required this.id,
    required this.category,
    required this.description,
    required this.location,
    required this.municipality,
    required this.status,
    required this.priority,
    this.priorityScore = 0,
    this.duplicateCount = 0,
    required this.reportedAt,
    this.latitude,
    this.longitude,
    this.userId,
    this.userPhone,
    this.imageUrl,
    this.photoTimestamp,
    this.photoLatitude,
    this.photoLongitude,
    this.escalatedToProvince = false,
    this.escalatedAt,
    this.isAnonymous = false,
    this.resolvedAt,
    this.barangay,
  });

  factory ProblemReport.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    String? extractedUserId;
    final pathSegments = doc.reference.path.split('/');
    if (pathSegments.length >= 2 && pathSegments[0] == 'users') {
      extractedUserId = pathSegments[1];
    }

    // FIX 9: Log warnings when critical fields are missing in Firestore docs
    final categoryStr = data['category'] as String? ?? '';
    if (categoryStr.isEmpty) {
      debugPrint('ProblemReport.fromFirestore: missing category for doc ${doc.id}');
    }
    final descriptionStr = data['description'] as String? ?? '';
    if (descriptionStr.isEmpty) {
      debugPrint('ProblemReport.fromFirestore: missing description for doc ${doc.id}');
    }
    final municipalityStr = data['municipality'] as String? ?? '';
    if (municipalityStr.isEmpty) {
      debugPrint('ProblemReport.fromFirestore: missing municipality for doc ${doc.id}');
    }

    return ProblemReport(
      id: doc.id,
      category: ReportCategory.fromString(categoryStr.isEmpty ? 'Unknown' : categoryStr),
      description: descriptionStr,
      location: data['location'] ?? '',
      municipality: municipalityStr.isEmpty ? 'Unknown' : municipalityStr,
      status: ReportStatusExtension.fromString(data['status']),
      priority: ReportPriority.fromString(data['priority']),
      priorityScore: data['priorityScore'] ?? 0,
      duplicateCount: data['duplicateCount'] ?? 0,
      reportedAt: (data['reportedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      latitude: (data['latitude'] as num?)?.toDouble(),
      longitude: (data['longitude'] as num?)?.toDouble(),
      userId: data['userId'] as String? ?? extractedUserId,
      userPhone: data['userPhone'] as String?,
      imageUrl: data['imageUrl'] as String?,
      photoTimestamp: (data['photoTimestamp'] as Timestamp?)?.toDate(),
      photoLatitude: (data['photoLatitude'] as num?)?.toDouble(),
      photoLongitude: (data['photoLongitude'] as num?)?.toDouble(),
      escalatedToProvince: data['escalatedToProvince'] as bool? ?? false,
      escalatedAt: (data['escalatedAt'] as Timestamp?)?.toDate(),
      isAnonymous: data['isAnonymous'] as bool? ?? false,
      resolvedAt: (data['resolvedAt'] as Timestamp?)?.toDate(),
      barangay: data['barangay'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'category': category.displayName,
      'description': description,
      'location': location,
      'municipality': municipality,
      'status': status.toShortString(),
      'priority': priority.toShortString(),
      'priorityScore': priorityScore,
      'duplicateCount': duplicateCount,
      'reportedAt': FieldValue.serverTimestamp(),
      'latitude': latitude,
      'longitude': longitude,
      'userId': userId,
      'userPhone': userPhone,
      'imageUrl': imageUrl ?? '',
      'photoTimestamp': photoTimestamp != null
          ? Timestamp.fromDate(photoTimestamp!)
          : null,
      'photoLatitude': photoLatitude,
      'photoLongitude': photoLongitude,
      'escalatedToProvince': escalatedToProvince,
      'escalatedAt': escalatedAt != null
          ? Timestamp.fromDate(escalatedAt!)
          : null,
      'isAnonymous': isAnonymous,
      'resolvedAt': resolvedAt != null
          ? Timestamp.fromDate(resolvedAt!)
          : null,
      'barangay': barangay ?? '',
    };
  }
}
