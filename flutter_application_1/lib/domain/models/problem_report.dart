import 'package:cloud_firestore/cloud_firestore.dart';
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
  final String? userId;      // Owner UID — needed for admin status updates
  final String? userPhone;   // Reporter's phone — useful for admin contact

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
  });

  factory ProblemReport.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    // Extract userId from the document path: users/{uid}/reports/{reportId}
    String? extractedUserId;
    final pathSegments = doc.reference.path.split('/');
    if (pathSegments.length >= 2 && pathSegments[0] == 'users') {
      extractedUserId = pathSegments[1];
    }

    return ProblemReport(
      id: doc.id,
      category: ReportCategory.fromString(data['category'] ?? 'Unknown'),
      description: data['description'] ?? '',
      location: data['location'] ?? '',
      municipality: data['municipality'] ?? 'Unknown',
      status: ReportStatusExtension.fromString(data['status']),
      priority: ReportPriority.fromString(data['priority']),
      priorityScore: data['priorityScore'] ?? 0,
      duplicateCount: data['duplicateCount'] ?? 0,
      reportedAt: (data['reportedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      latitude: data['latitude'] as double?,
      longitude: data['longitude'] as double?,
      userId: data['userId'] as String? ?? extractedUserId,
      userPhone: data['userPhone'] as String?,
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
    };
  }
}
