import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../enums/report_category.dart';
import '../enums/report_status.dart';
import '../enums/report_priority.dart';
import '../enums/handling_level.dart';

/// The office a report was handed to (P2). Must match firestore.rules
/// validReferral() and the web console's REFERRAL_OFFICE_TYPES.
class ReportReferral {
  static const officeTypes = <String, String>{
    'MDRRMO': 'MDRRMO — Municipal DRRM Office',
    'BDRRMC': 'BDRRMC — Barangay DRRM Committee',
    'PDRRMO': 'PDRRMO — Provincial DRRM Office',
    'BFP': 'BFP — Bureau of Fire Protection',
    'PNP': 'PNP — Philippine National Police',
    'MHO': 'MHO / RHU — Municipal Health Office',
    'MSWDO': 'MSWDO — Social Welfare & Development',
    'MEO': 'MEO — Municipal Engineering Office',
    'DPWH': 'DPWH — Public Works & Highways',
    'Other': 'Other office',
  };

  final String officeType;
  final String officeName;
  final String? contact;
  final String? note;
  final String by;
  final DateTime? at;

  const ReportReferral({
    required this.officeType,
    required this.officeName,
    this.contact,
    this.note,
    required this.by,
    this.at,
  });

  static ReportReferral? fromMap(dynamic v) {
    if (v is! Map) return null;
    String? opt(dynamic x) => x is String && x.isNotEmpty ? x : null;
    return ReportReferral(
      officeType: (v['officeType'] as String?) ?? 'Other',
      officeName: (v['officeName'] as String?) ?? '',
      contact: opt(v['contact']),
      note: opt(v['note']),
      by: (v['by'] as String?) ?? '',
      at: (v['at'] as Timestamp?)?.toDate(),
    );
  }
}

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
  // 'camera' (live capture, GPS-stamped) or 'gallery' (unverified).
  final String? photoSource;

  // Escalation
  final bool escalatedToProvince;
  final DateTime? escalatedAt;
  final String? escalatedBy; // uid of the municipal admin who approved escalation

  // Administrative tier currently handling this report (Barangay → Region II)
  final HandlingLevel handlingLevel;

  // Anonymous reporting
  final bool isAnonymous;

  // SLA tracking
  final DateTime? resolvedAt;

  // Barangay
  final String? barangay;

  // Moderation
  final bool isFlagged;

  // Closed without action (PDRRMO §8). Read-only here: set only by an
  // in-scope admin via FirebaseReportRepository.closeWithDisposition, and
  // deliberately absent from toMap() so a new report can never carry one.
  final String? disposition; // false_report | duplicate | incomplete | unverifiable
  final String? dispositionReason;
  final String? dispositionBy;
  final DateTime? dispositionAt;
  final String? duplicateOf;

  // Referral to a named office (P2). Read-only here, like the disposition:
  // set by FirebaseReportRepository.referToOffice, absent from toMap().
  final ReportReferral? referral;

  static const dispositionLabels = {
    'false_report': 'False report',
    'duplicate': 'Duplicate',
    'incomplete': 'Incomplete',
    'unverifiable': 'Could not be verified',
  };

  static String dispositionLabel(String? d) => dispositionLabels[d] ?? 'Closed';

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
    this.photoSource,
    this.escalatedToProvince = false,
    this.escalatedAt,
    this.escalatedBy,
    this.handlingLevel = HandlingLevel.municipal,
    this.isAnonymous = false,
    this.resolvedAt,
    this.barangay,
    this.isFlagged = false,
    this.disposition,
    this.dispositionReason,
    this.dispositionBy,
    this.dispositionAt,
    this.duplicateOf,
    this.referral,
  });

  factory ProblemReport.fromFirestore(DocumentSnapshot doc) {
    final rawData = doc.data();
    if (rawData == null) {
      return ProblemReport(
        id: doc.id,
        category: ReportCategory.infrastructureAndRoads,
        description: '',
        location: '',
        municipality: '',
        status: ReportStatus.reported,
        priority: ReportPriority.low,
        reportedAt: DateTime.now(),
      );
    }
    final data = rawData as Map<String, dynamic>;

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
      status: ReportStatusExtension.fromString(data['status'] as String? ?? 'reported'),
      priority: ReportPriority.fromString(data['priority']),
      // Coerce via num so a value stored as a double (e.g. 95.0 from the web
      // admin) doesn't throw "double is not int" and blank the whole stream.
      priorityScore: (data['priorityScore'] as num?)?.toInt() ?? 0,
      duplicateCount: (data['duplicateCount'] as num?)?.toInt() ?? 0,
      reportedAt: (data['reportedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      latitude: (data['latitude'] as num?)?.toDouble(),
      longitude: (data['longitude'] as num?)?.toDouble(),
      userId: data['userId'] as String? ?? extractedUserId,
      userPhone: data['userPhone'] as String?,
      imageUrl: (data['imageUrl'] as String?)?.isEmpty == true ? null : data['imageUrl'] as String?,
      photoTimestamp: (data['photoTimestamp'] as Timestamp?)?.toDate(),
      photoLatitude: (data['photoLatitude'] as num?)?.toDouble(),
      photoLongitude: (data['photoLongitude'] as num?)?.toDouble(),
      photoSource: data['photoSource'] as String?,
      escalatedToProvince: data['escalatedToProvince'] as bool? ?? false,
      escalatedAt: (data['escalatedAt'] as Timestamp?)?.toDate(),
      escalatedBy: data['escalatedBy'] as String?,
      handlingLevel: HandlingLevel.fromString(data['handlingLevel'] as String?),
      isAnonymous: data['isAnonymous'] as bool? ?? false,
      resolvedAt: (data['resolvedAt'] as Timestamp?)?.toDate(),
      barangay: (data['barangay'] as String?)?.isEmpty == true ? null : data['barangay'] as String?,
      isFlagged: data['isFlagged'] as bool? ?? false,
      disposition: data['disposition'] as String?,
      dispositionReason: data['dispositionReason'] as String?,
      dispositionBy: data['dispositionBy'] as String?,
      dispositionAt: (data['dispositionAt'] as Timestamp?)?.toDate(),
      duplicateOf: data['duplicateOf'] as String?,
      referral: ReportReferral.fromMap(data['referral']),
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
      'imageUrl': (imageUrl?.isEmpty ?? true) ? null : imageUrl,
      'photoTimestamp': photoTimestamp != null
          ? Timestamp.fromDate(photoTimestamp!)
          : null,
      'photoLatitude': photoLatitude,
      'photoLongitude': photoLongitude,
      'photoSource': photoSource,
      'escalatedToProvince': escalatedToProvince,
      'escalatedBy': escalatedBy,
      'escalatedAt': escalatedAt != null
          ? Timestamp.fromDate(escalatedAt!)
          : null,
      'handlingLevel': handlingLevel.key,
      'isAnonymous': isAnonymous,
      'resolvedAt': resolvedAt != null
          ? Timestamp.fromDate(resolvedAt!)
          : null,
      'barangay': (barangay?.isEmpty ?? true) ? null : barangay,
      'isFlagged': isFlagged,
    };
  }
}
