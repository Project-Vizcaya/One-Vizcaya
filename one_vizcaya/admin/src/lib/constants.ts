export const ALLOWED_ROLES = ['admin', 'municipal_admin', 'provincial_admin', 'super_admin'] as const
export type AdminRole = typeof ALLOWED_ROLES[number]

export const ROLE_LABELS: Record<string, string> = {
  admin:             'Admin',
  municipal_admin:   'Municipal Admin',
  provincial_admin:  'Provincial Admin',
  super_admin:       'Super Admin',
  citizen:           'Citizen',
}

export const STATUS_LABELS: Record<string, string> = {
  reported:      'Reported',
  acknowledged:  'Acknowledged',
  under_review:  'Under Review',
  ongoing:       'Ongoing',
  solved:        'Solved',
}

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

export const SLA_HOURS: Record<string, number> = {
  'Disaster & Risk Management':       4,
  'Infrastructure & Public Works':    72,
  'Health & Sanitation':              24,
  'Peace & Order':                    8,
  'Education & Youth':                120,
  'Social Services & Welfare':        48,
  'Environment & Natural Resources':  72,
  'General Inquiries & Others':       168,
}

export const CANNED_RESPONSES = [
  'Thank you for your report. We have dispatched a team to assess the situation.',
  'Your report has been received and is currently under investigation.',
  'We have resolved the reported issue. Please let us know if the problem persists.',
  'This matter has been escalated to the appropriate department.',
  'We apologize for the inconvenience. Our team is working to address this promptly.',
  'The reported infrastructure issue has been logged for the next maintenance schedule.',
]

export const MUNICIPALITIES = [
  'Ambaguio', 'Aritao', 'Bagabag', 'Bambang', 'Bayombong',
  'Diadi', 'Dupax del Norte', 'Dupax del Sur', 'Kasibu',
  'Kayapa', 'Quezon', 'Santa Fe', 'Solano', 'Villaverde',
  'Alfonso Castañeda',
]

export const MUNI_SEALS: Record<string, string> = {
  'Bayombong':         '/img/seals/bayombong.png',
  'Bambang':           '/img/seals/bambang.png',
  'Solano':            '/img/seals/solano.png',
  'Bagabag':           '/img/seals/bagabag.png',
  'Aritao':            '/img/seals/aritao.png',
  'Dupax del Norte':   '/img/seals/dupax-del-norte.png',
  'Dupax del Sur':     '/img/seals/dupax-del-sur.png',
  'Santa Fe':          '/img/seals/santa-fe.png',
  'Kasibu':            '/img/seals/kasibu.png',
  'Villaverde':        '/img/seals/villaverde.png',
  'Diadi':             '/img/seals/diadi.png',
  'Quezon':            '/img/seals/quezon.png',
  'Ambaguio':          '/img/seals/ambaguio.png',
  'Kayapa':            '/img/seals/kayapa.png',
  'Alfonso Castañeda': '/img/seals/alfonso-castaneda.png',
}

export const STATUS_BADGE_CLASS: Record<string, string> = {
  reported:      'bg-green-50 text-green-800',
  acknowledged:  'bg-teal-50 text-teal-800',
  under_review:  'bg-purple-50 text-purple-800',
  ongoing:       'bg-orange-50 text-orange-800',
  solved:        'bg-emerald-50 text-emerald-800',
}

export const PRIORITY_BADGE_CLASS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high:     'bg-orange-50 text-orange-700',
  medium:   'bg-yellow-50 text-yellow-700',
  low:      'bg-green-50 text-green-700',
}
