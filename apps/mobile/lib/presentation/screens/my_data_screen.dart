import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/utils/toast_utils.dart';
import '../../data/services/data_export_service.dart';
import '../state/municipality_state.dart';

/// "Download My Data" — surfaces every piece of personal data One Vizcaya holds
/// about the citizen and lets them copy it as JSON or export it as a PDF.
///
/// Implements the Right to Access and Right to Data Portability under RA 10173.
class MyDataScreen extends StatefulWidget {
  const MyDataScreen({super.key});

  @override
  State<MyDataScreen> createState() => _MyDataScreenState();
}

class _MyDataScreenState extends State<MyDataScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _exporting = false;

  Color get _lguColor => oneVizcayaState.activeTheme['appBarColor'] as Color;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await dataExportService.collectUserData();
    if (!mounted) return;
    setState(() {
      _data = data;
      _loading = false;
    });
  }

  Future<void> _copyJson() async {
    final json = await dataExportService.exportAsJson();
    if (json == null) {
      ToastUtils.showError(AppStrings.get('noDataToExport'));
      return;
    }
    await Clipboard.setData(ClipboardData(text: json));
    ToastUtils.showSuccess(AppStrings.get('dataCopied'));
  }

  Future<void> _exportPdf() async {
    if (_data == null) {
      ToastUtils.showError(AppStrings.get('noDataToExport'));
      return;
    }
    setState(() => _exporting = true);
    try {
      final bytes = await _buildPdf(_data!);
      await Printing.layoutPdf(
        onLayout: (_) async => bytes,
        name: 'one_vizcaya_my_data.pdf',
      );
    } catch (e) {
      ToastUtils.showError(AppStrings.get('noDataToExport'));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<Uint8List> _buildPdf(Map<String, dynamic> data) async {
    final pdf = pw.Document();
    final profile = (data['profile'] as Map?) ?? {};
    final consent = (data['consent'] as Map?) ?? {};
    final account = (data['account'] as Map?) ?? {};
    final reports = (data['reports'] as List?) ?? [];

    pw.Widget kv(String k, dynamic v) => pw.Padding(
          padding: const pw.EdgeInsets.symmetric(vertical: 2),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.SizedBox(
                width: 120,
                child: pw.Text(k,
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
              ),
              pw.Expanded(
                child: pw.Text('${v ?? '—'}', style: const pw.TextStyle(fontSize: 10)),
              ),
            ],
          ),
        );

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Text('One Vizcaya — Personal Data Export',
                style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
          ),
          pw.Text(
            'Provided under Republic Act No. 10173 (Data Privacy Act of 2012). '
            'Generated ${DateTime.now().toUtc().toIso8601String()} UTC.',
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 12),
          pw.Text('Account', style: _h()),
          kv('User ID', account['userId']),
          kv('Phone', account['phoneNumber']),
          kv('Email', account['email']),
          pw.SizedBox(height: 10),
          pw.Text('Profile', style: _h()),
          kv('Name', profile['name']),
          kv('Location', profile['location']),
          kv('Created', profile['createdAt']),
          kv('Updated', profile['updatedAt']),
          pw.SizedBox(height: 10),
          pw.Text('Consent', style: _h()),
          kv('Consent given', consent['consentGiven']),
          kv('Consent timestamp', consent['consentTimestamp']),
          pw.SizedBox(height: 10),
          pw.Text('Reports (${reports.length})', style: _h()),
          if (reports.isEmpty)
            pw.Text('No reports filed.', style: const pw.TextStyle(fontSize: 10))
          else
            ...reports.map((r) {
              final m = (r as Map);
              return pw.Container(
                margin: const pw.EdgeInsets.only(bottom: 6),
                padding: const pw.EdgeInsets.all(6),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
                  borderRadius: pw.BorderRadius.circular(4),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('${m['category'] ?? 'Report'} — ${m['status'] ?? ''}',
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold, fontSize: 10)),
                    pw.Text('${m['description'] ?? ''}',
                        style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(
                        'Location: ${m['location'] ?? '—'}  •  Filed: ${m['reportedAt'] ?? '—'}',
                        style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  ],
                ),
              );
            }),
        ],
      ),
    );
    return pdf.save();
  }

  pw.TextStyle _h() =>
      pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: PdfColors.blue800);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: _lguColor,
        foregroundColor: Colors.white,
        title: Text(AppStrings.get('myDataTitle'),
            style: const TextStyle(fontWeight: FontWeight.w600)),
        elevation: 0,
      ),
      body: _loading
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(AppStrings.get('loadingYourData')),
                ],
              ),
            )
          : _data == null
              ? Center(child: Text(AppStrings.get('noDataToExport')))
              : _buildContent(context),
      bottomNavigationBar: _loading || _data == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _copyJson,
                        icon: const Icon(Icons.code),
                        label: Text(AppStrings.get('copyAsJson')),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _lguColor,
                          side: BorderSide(color: _lguColor),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _exporting ? null : _exportPdf,
                        icon: _exporting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.picture_as_pdf),
                        label: Text(AppStrings.get('exportAsPdf')),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _lguColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final profile = (_data!['profile'] as Map?) ?? {};
    final consent = (_data!['consent'] as Map?) ?? {};
    final account = (_data!['account'] as Map?) ?? {};
    final reports = (_data!['reports'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _lguColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.shield_outlined, color: _lguColor, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(AppStrings.get('myDataIntro'),
                    style: const TextStyle(fontSize: 13, height: 1.4)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _section(AppStrings.get('myDataProfile'), Icons.person_outline, [
          _row('Name', profile['name']),
          _row('Phone', account['phoneNumber']),
          _row('Email', profile['email']),
          _row('Location', profile['location']),
          _row('Created', profile['createdAt']),
        ]),
        _section(AppStrings.get('myDataConsent'), Icons.fact_check_outlined, [
          _row('Consent given', '${consent['consentGiven'] ?? false}'),
          _row('Timestamp',
              consent['consentTimestamp'] ?? AppStrings.get('myDataNoConsent')),
        ]),
        _section(
          '${AppStrings.get('myDataReports')} (${reports.length} ${AppStrings.get('reportsCount')})',
          Icons.list_alt_outlined,
          reports.isEmpty
              ? [Text(AppStrings.get('noReports'))]
              : reports.map((r) {
                  final m = r as Map;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${m['category'] ?? 'Report'} — ${m['status'] ?? ''}',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        if ((m['description'] ?? '').toString().isNotEmpty)
                          Text('${m['description']}',
                              style: const TextStyle(fontSize: 13)),
                        Text(
                            '${m['location'] ?? '—'}  •  ${m['reportedAt'] ?? '—'}',
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade600)),
                      ],
                    ),
                  );
                }).toList(),
        ),
      ],
    );
  }

  Widget _section(String title, IconData icon, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: _lguColor),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
          const Divider(height: 18),
          ...children,
        ],
      ),
    );
  }

  Widget _row(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text('${(value == null || '$value'.isEmpty) ? '—' : value}',
                style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
