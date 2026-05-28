import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/problem_report.dart';
import '../../domain/enums/report_status.dart';
import '../../core/utils/toast_utils.dart';

class ReportStatusCard extends StatefulWidget {
  final ProblemReport report;
  final Color lguColor;

  const ReportStatusCard({
    super.key,
    required this.report,
    required this.lguColor,
  });

  @override
  State<ReportStatusCard> createState() => _ReportStatusCardState();
}

class _ReportStatusCardState extends State<ReportStatusCard>
    with SingleTickerProviderStateMixin {
  bool _feedbackSubmitted = false;
  bool _checkingFeedback = false;

  // POLISH 1 — pulse animation controller
  late AnimationController _pulseController;
  late Animation<double> _pulseOpacity;

  @override
  void initState() {
    super.initState();
    if (widget.report.status == ReportStatus.solved) {
      _checkFeedbackStatus();
    }

    // Pulse animation for current active step
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
    _pulseOpacity = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _checkFeedbackStatus() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    setState(() => _checkingFeedback = true);
    try {
      final doc = await FirebaseFirestore.instance
          .collection('reports')
          .doc(widget.report.id)
          .collection('feedback')
          .doc(user.uid)
          .get();
      if (mounted) {
        setState(() {
          _feedbackSubmitted = doc.exists;
          _checkingFeedback = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _checkingFeedback = false);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  IconData _getStatusIcon(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return Icons.flag;
      case ReportStatus.underReview:
        return Icons.rate_review;
      case ReportStatus.ongoing:
        return Icons.construction;
      case ReportStatus.solved:
        return Icons.check_circle;
      case ReportStatus.archived:
        return Icons.archive;
    }
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return Colors.blue.shade700;
      case ReportStatus.underReview:
        return Colors.purple.shade700;
      case ReportStatus.ongoing:
        return Colors.orange.shade700;
      case ReportStatus.solved:
        return Colors.green.shade700;
      case ReportStatus.archived:
        return Colors.grey.shade600;
    }
  }

  String _getStatusText(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return 'Reported';
      case ReportStatus.underReview:
        return 'Under Review';
      case ReportStatus.ongoing:
        return 'Ongoing Process';
      case ReportStatus.solved:
        return 'Problem Solved';
      case ReportStatus.archived:
        return 'Archived';
    }
  }

  // ── POLISH 1: Animated Step Tracker ─────────────────────────────────────
  int _currentStep(ReportStatus status) {
    switch (status) {
      case ReportStatus.reported:
        return 0;
      case ReportStatus.underReview:
        return 1;
      case ReportStatus.ongoing:
        return 2;
      case ReportStatus.solved:
      case ReportStatus.archived:
        return 3;
    }
  }

  Widget _buildStepTracker() {
    final step = _currentStep(widget.report.status);
    // Labels shortened to fit under small circles
    const stepLabels = ['Reported', 'Under Review', 'In Progress', 'Resolved'];
    final activeColor = Colors.green.shade600;
    const greyColor = Color(0xFFBDBDBD);
    const size = 20.0;

    return SizedBox(
      height: 56,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(stepLabels.length * 2 - 1, (i) {
          if (i.isOdd) {
            // Connector line — green if next step is completed
            final lineStepIndex = i ~/ 2;
            final isCompleted = step > lineStepIndex;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 9),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 2,
                  color: isCompleted ? activeColor : greyColor,
                ),
              ),
            );
          }

          // Circle node
          final circleIndex = i ~/ 2;
          final isDone = step > circleIndex;
          final isActive = step == circleIndex; // current step, not yet done

          Widget circle = AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDone ? activeColor : Colors.transparent,
              border: isDone
                  ? null
                  : Border.all(
                      color: isActive ? activeColor : greyColor,
                      width: 1.5,
                    ),
            ),
            child: isDone
                ? const Icon(Icons.check, size: 12, color: Colors.white)
                : null,
          );

          // Wrap active (not-yet-done) circle in a pulsing opacity
          if (isActive) {
            circle = AnimatedBuilder(
              animation: _pulseOpacity,
              builder: (_, child) =>
                  Opacity(opacity: _pulseOpacity.value, child: child),
              child: circle,
            );
          }

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              circle,
              const SizedBox(height: 4),
              Text(
                stepLabels[circleIndex],
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  color: isDone || isActive ? activeColor : greyColor,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          );
        }),
      ),
    );
  }

  // ── POLISH 2: Premium Feedback Star Rating Sheet ─────────────────────────
  void _showRatingSheet() {
    int selectedRating = 0;
    int? tappedStar; // triggers scale animation
    final commentController = TextEditingController();
    bool submitting = false;
    bool showThanks = false;

    String _ratingLabel(int rating) {
      switch (rating) {
        case 1:
          return 'Poor — Not resolved';
        case 2:
          return 'Fair — Partially resolved';
        case 3:
          return 'Good — Mostly resolved';
        case 4:
          return 'Very Good — Well handled';
        case 5:
          return 'Excellent! — Fully resolved';
        default:
          return '';
      }
    }

    Color _starColor(int rating) {
      if (rating <= 2) return Colors.orange.shade300;
      if (rating == 3) return Colors.amber;
      return Colors.green;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            if (showThanks) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                padding: EdgeInsets.fromLTRB(24, 32, 24, MediaQuery.of(ctx).padding.bottom + 48),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle,
                        color: Color(0xFF4CAF50), size: 64),
                    const SizedBox(height: 16),
                    const Text(
                      'Thank you!',
                      style:
                          TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your feedback has been submitted.',
                      style: TextStyle(
                          fontSize: 14, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              );
            }

            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom +
                    MediaQuery.of(ctx).padding.bottom + 16,
                left: 24,
                right: 24,
                top: 16,
              ),
              child: SingleChildScrollView(
               child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'How was this resolved?',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  // Star rating row with animated scale + color
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      final isFilled = starIndex <= selectedRating;
                      final color = selectedRating > 0
                          ? _starColor(selectedRating)
                          : Colors.amber;
                      return GestureDetector(
                        onTap: () {
                          setSheetState(() {
                            selectedRating = starIndex;
                            tappedStar = starIndex;
                          });
                          // Reset tappedStar after animation
                          Future.delayed(
                              const Duration(milliseconds: 150), () {
                            if (ctx.mounted) {
                              setSheetState(() => tappedStar = null);
                            }
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: AnimatedScale(
                            scale: tappedStar == starIndex ? 1.3 : 1.0,
                            duration: const Duration(milliseconds: 150),
                            child: Icon(
                              isFilled ? Icons.star : Icons.star_border,
                              color: isFilled ? color : Colors.grey.shade400,
                              size: 36,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 8),
                  // Rating label with AnimatedSwitcher fade
                  SizedBox(
                    height: 24,
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: Text(
                        _ratingLabel(selectedRating),
                        key: ValueKey(selectedRating),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: selectedRating > 0
                              ? _starColor(selectedRating)
                              : Colors.transparent,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Additional comments (optional)',
                      filled: true,
                      fillColor: const Color(0xFFF7F7F7),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Animated submit button — grey when no rating, green when rated
                  SizedBox(
                    height: 48,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      decoration: BoxDecoration(
                        color: selectedRating > 0
                            ? const Color(0xFF4CAF50)
                            : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: ElevatedButton(
                        onPressed: (submitting || selectedRating == 0)
                            ? null
                            : () async {
                                final user =
                                    FirebaseAuth.instance.currentUser;
                                if (user == null) return;
                                setSheetState(() => submitting = true);
                                try {
                                  await FirebaseFirestore.instance
                                      .collection('reports')
                                      .doc(widget.report.id)
                                      .collection('feedback')
                                      .doc(user.uid)
                                      .set({
                                    'rating': selectedRating,
                                    'comment':
                                        commentController.text.trim(),
                                    'submittedAt':
                                        FieldValue.serverTimestamp(),
                                    'municipality':
                                        widget.report.municipality,
                                  });
                                  // Show thank-you state for 1.5s then close
                                  setSheetState(() {
                                    submitting = false;
                                    showThanks = true;
                                  });
                                  Future.delayed(
                                      const Duration(milliseconds: 1500), () {
                                    if (ctx.mounted && Navigator.of(ctx).canPop()) {
                                      Navigator.of(ctx).pop();
                                    }
                                    if (mounted) {
                                      setState(
                                          () => _feedbackSubmitted = true);
                                    }
                                  });
                                } catch (e) {
                                  setSheetState(() => submitting = false);
                                  ToastUtils.showError(
                                      'Failed to submit feedback. Try again.');
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Colors.transparent,
                          disabledForegroundColor: Colors.grey.shade600,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: submitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Submit',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ],
               ),
              ),
            );
          },
        );
      },
    );
  }

  // ── POLISH 3: Production-quality Photo Viewer ────────────────────────────
  void _openImageViewer(BuildContext context, String url) {
    bool zoomHintVisible = true;
    bool hintTimerStarted = false;

    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (sCtx, setDialogState) {
            // Start zoom-hint timer once on first build
            if (!hintTimerStarted) {
              hintTimerStarted = true;
              Future.delayed(const Duration(seconds: 2), () {
                if (sCtx.mounted) {
                  setDialogState(() => zoomHintVisible = false);
                }
              });
            }

            return Dialog(
              backgroundColor: Colors.black,
              insetPadding: EdgeInsets.zero,
              child: Stack(
                children: [
                  // Full-screen image with swipe-down-to-dismiss
                  SizedBox(
                    width: double.infinity,
                    height: double.infinity,
                    child: GestureDetector(
                      onVerticalDragEnd: (details) {
                        if (details.primaryVelocity != null &&
                            details.primaryVelocity! > 300) {
                          Navigator.of(sCtx).pop();
                        }
                      },
                      child: Hero(
                        tag: 'report_photo_${widget.report.id}',
                        child: InteractiveViewer(
                          minScale: 0.8,
                          maxScale: 5.0,
                          child: Image.network(
                            url,
                            fit: BoxFit.contain,
                            loadingBuilder: (_, child, progress) {
                              if (progress == null) return child;
                              return const Center(
                                child: CircularProgressIndicator(
                                    color: Colors.white),
                              );
                            },
                            errorBuilder: (_, __, ___) => const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.broken_image,
                                      size: 64, color: Colors.white54),
                                  SizedBox(height: 12),
                                  Text(
                                    'Image could not be loaded',
                                    style: TextStyle(
                                        color: Colors.white54, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Floating close button — top right
                  Positioned(
                    top: 40,
                    right: 16,
                    child: CircleAvatar(
                      backgroundColor: Colors.white24,
                      child: IconButton(
                        icon: const Icon(Icons.close,
                            color: Colors.white, size: 20),
                        onPressed: () => Navigator.of(sCtx).pop(),
                      ),
                    ),
                  ),
                  // Pinch-to-zoom hint — fades out after 2s
                  Positioned(
                    bottom: 32,
                    left: 0,
                    right: 0,
                    child: AnimatedOpacity(
                      opacity: zoomHintVisible ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 500),
                      child: const Center(
                        child: Text(
                          'Pinch to zoom',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ── FEATURE 4: Share report ──────────────────────────────────────────────
  Future<void> _shareReport() async {
    final text =
        'Track my report on One Vizcaya: onevizcaya://status?reportId=${widget.report.id}';
    final uri = Uri(
      scheme: 'sms',
      queryParameters: {'body': text},
    );
    try {
      await launchUrl(uri);
    } catch (_) {
      ToastUtils.showInfo('Could not open share app.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(widget.report.status);
    final statusText = _getStatusText(widget.report.status);
    final statusIcon = _getStatusIcon(widget.report.status);
    final priorityColor = widget.report.priority.color;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 8.0),
      child: Column(
        children: [
          // Priority banner at the top of the card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: priorityColor.withAlpha((255 * 0.15).round()),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(widget.report.priority.icon,
                    size: 14, color: priorityColor),
                const SizedBox(width: 6),
                Text(
                  '${widget.report.priority.displayName} Priority',
                  style: TextStyle(
                    color: priorityColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  'Score: ${widget.report.priorityScore}',
                  style: TextStyle(color: priorityColor, fontSize: 11),
                ),
                if (widget.report.duplicateCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color:
                          priorityColor.withAlpha((255 * 0.2).round()),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${widget.report.duplicateCount} similar',
                      style: TextStyle(
                          color: priorityColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Main card content
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        widget.report.category.displayName,
                        style: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: widget.lguColor,
                            ),
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Share button
                        GestureDetector(
                          onTap: _shareReport,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Icon(Icons.share_outlined,
                                size: 20, color: Colors.grey.shade600),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor
                                .withAlpha((255 * 0.1).round()),
                            borderRadius: BorderRadius.circular(20.0),
                          ),
                          child: Row(
                            children: [
                              Icon(statusIcon,
                                  color: statusColor, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                statusText,
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // POLISH 1: Animated step tracker
                _buildStepTracker(),
                const SizedBox(height: 8),
                const Divider(),
                const SizedBox(height: 8),
                // POLISH 3: Photo thumbnail with Hero tag
                if (widget.report.imageUrl != null &&
                    widget.report.imageUrl!.isNotEmpty) ...[
                  GestureDetector(
                    onTap: () =>
                        _openImageViewer(context, widget.report.imageUrl!),
                    child: Hero(
                      tag: 'report_photo_${widget.report.id}',
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          widget.report.imageUrl!,
                          width: 100,
                          height: 100,
                          fit: BoxFit.cover,
                          loadingBuilder: (_, child, progress) {
                            if (progress == null) return child;
                            return Container(
                              width: 100,
                              height: 100,
                              color: Colors.grey.shade200,
                              child: const Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2)),
                            );
                          },
                          errorBuilder: (_, __, ___) => Container(
                            width: 100,
                            height: 100,
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.broken_image,
                                color: Colors.grey),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                Text(
                  widget.report.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.location_on,
                        size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.report.location,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today,
                        size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(
                      'Reported on: ${_formatDate(widget.report.reportedAt)}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
                if (widget.report.latitude != null &&
                    widget.report.longitude != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.map,
                          size: 16, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Coordinates: ${widget.report.latitude!.toStringAsFixed(4)}, ${widget.report.longitude!.toStringAsFixed(4)}',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Colors.grey),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                // Bottom row: Rate Resolution + QR
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // POLISH 2: Rate Resolution / already-rated display
                    if (widget.report.status == ReportStatus.solved &&
                        !_checkingFeedback)
                      _feedbackSubmitted
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle,
                                    size: 14,
                                    color: Colors.green.shade600),
                                const SizedBox(width: 4),
                                Text(
                                  'Feedback submitted',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.green.shade600),
                                ),
                              ],
                            )
                          : TextButton.icon(
                              icon: const Icon(Icons.star_outline, size: 16),
                              label: const Text('Rate Resolution',
                                  style: TextStyle(fontSize: 12)),
                              onPressed: _showRatingSheet,
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.amber.shade700,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                              ),
                            )
                    else
                      const SizedBox.shrink(),
                    Align(
                      alignment: Alignment.centerRight,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.qr_code, size: 16),
                        label: const Text('Show QR',
                            style: TextStyle(fontSize: 12)),
                        onPressed: widget.report.id.isEmpty ? null : () => _showReportQr(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: widget.lguColor,
                          side: BorderSide(color: widget.lguColor),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showReportQr(BuildContext context) {
    final qrValue =
        'onevizcaya://status?reportId=${widget.report.id}';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).padding.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Report QR Code',
              style:
                  TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 16),
            QrImageView(data: qrValue, size: 200),
            const SizedBox(height: 12),
            const Text(
              'Show to LGU staff to track this report',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
