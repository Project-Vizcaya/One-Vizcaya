export const ALLOWED_ROLES = ['admin', 'municipal_admin', 'provincial_admin', 'super_admin'] as const
export type AdminRole = (typeof ALLOWED_ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  municipal_admin: 'Municipal Admin',
  provincial_admin: 'Provincial Admin',
  super_admin: 'Super Admin',
  citizen: 'Citizen',
}

export const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  under_review: 'Under Review',
  ongoing: 'Ongoing',
  solved: 'Solved',
}

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const SLA_HOURS: Record<string, number> = {
  'Disaster & Risk Management': 4,
  'Infrastructure & Public Works': 72,
  'Health & Sanitation': 24,
  'Peace & Order': 8,
  'Education & Youth': 120,
  'Social Services & Welfare': 48,
  'Environment & Natural Resources': 72,
  'General Inquiries & Others': 168,
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
  'Diadi', 'Dupax del Norte', 'Dupax del Sur', 'Kasibu', 'Kayapa',
  'Quezon', 'Santa Fe', 'Solano', 'Villaverde', 'Alfonso Castañeda',
]

export const MUNI_SEALS: Record<string, string> = {
  Bayombong: '/img/seals/bayombong.png',
  Bambang: '/img/seals/bambang.png',
  Solano: '/img/seals/solano.png',
  Bagabag: '/img/seals/bagabag.png',
  Aritao: '/img/seals/aritao.png',
  'Dupax del Norte': '/img/seals/dupax-del-norte.png',
  'Dupax del Sur': '/img/seals/dupax-del-sur.png',
  'Santa Fe': '/img/seals/santa-fe.png',
  Kasibu: '/img/seals/kasibu.png',
  Villaverde: '/img/seals/villaverde.png',
  Diadi: '/img/seals/diadi.png',
  Quezon: '/img/seals/quezon.png',
  Ambaguio: '/img/seals/ambaguio.png',
  Kayapa: '/img/seals/kayapa.png',
  'Alfonso Castañeda': '/img/seals/alfonso-castaneda.png',
}

/* Badge variant helpers — used with shadcn Badge */
export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reported: 'secondary',
  acknowledged: 'secondary',
  under_review: 'outline',
  ongoing: 'default',
  solved: 'default',
}

export const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-destructive bg-destructive/10 border-destructive/20',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  low: 'text-green-700 bg-green-50 border-green-200',
}

export const STATUS_COLOR: Record<string, string> = {
  reported: 'text-slate-700 bg-slate-100 border-slate-200',
  acknowledged: 'text-teal-700 bg-teal-50 border-teal-200',
  under_review: 'text-purple-700 bg-purple-50 border-purple-200',
  ongoing: 'text-orange-700 bg-orange-50 border-orange-200',
  solved: 'text-green-700 bg-green-50 border-green-200',
}
