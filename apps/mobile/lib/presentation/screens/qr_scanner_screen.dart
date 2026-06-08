import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';

/// Camera QR scanner for One Vizcaya report codes.
///
/// Scans `onevizcaya://status?reportId=...` payloads. On a valid code it pops
/// with the parsed reportId so the caller can navigate (citizens jump to their
/// report status; admins open it in the dashboard). Invalid/foreign QR codes
/// are politely rejected.
class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handled = false; // guard against duplicate detections

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue;
      if (raw == null) continue;
      if (parseReportQr(raw) != null) {
        _handled = true;
        Navigator.of(context).pop(raw.trim());
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(AppStrings.get('scanQrTitle')),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            tooltip: AppStrings.get('toggleFlash'),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            tooltip: AppStrings.get('switchCamera'),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.no_photography,
                          color: Colors.white54, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        AppStrings.get('cameraUnavailable'),
                        style: const TextStyle(color: Colors.white70),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          // Viewfinder overlay
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          Positioned(
            bottom: 60,
            left: 24,
            right: 24,
            child: Text(
              AppStrings.get('scanQrHint'),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

/// Parses a One Vizcaya report QR payload. Returns the decoded query
/// parameters (reportId, owner, category, status, …) or null if it isn't one.
Map<String, String>? parseReportQr(String raw) {
  final uri = Uri.tryParse(raw.trim());
  if (uri == null) return null;
  if (uri.scheme == 'onevizcaya' &&
      uri.host == 'status' &&
      (uri.queryParameters['reportId']?.isNotEmpty ?? false)) {
    return uri.queryParameters;
  }
  return null;
}

/// Opens the scanner and returns the raw scanned payload, or null if cancelled.
Future<String?> scanReportQr(BuildContext context) async {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(builder: (_) => const QrScannerScreen()),
  );
}

/// Convenience: scan a QR and, if valid, navigate to the report status screen.
Future<void> scanAndOpenReport(BuildContext context) async {
  final raw = await scanReportQr(context);
  if (raw == null || !context.mounted) return;
  final parsed = parseReportQr(raw);
  if (parsed == null) {
    ToastUtils.showError(AppStrings.get('invalidQr'));
    return;
  }
  Navigator.of(context).pushNamed('/status',
      arguments: {'reportId': parsed['reportId']});
}
