// Barangays per Nueva Vizcaya municipality (PSGC 2023).
// Mirrors apps/mobile lib/core/constants/app_constants.dart municipalityBarangays
// so the web admin can scope a Barangay admin to their exact barangay.
export const MUNICIPALITY_BARANGAYS: Record<string, string[]> = {
  "Alfonso Castañeda": ["Abuyo", "Cawayan", "Galintuja", "Lipuga", "Lublub", "Pelaway"],
  "Ambaguio": ["Ammoweg", "Camandag", "Dulli", "Labang", "Napo", "Poblacion", "Salingsingan", "Tiblac"],
  "Aritao": ["Anayo", "Baan", "Balite", "Banganan", "Beti", "Bone North", "Bone South", "Calitlitan", "Canabuan", "Canarem", "Comon", "Cutar", "Darapidap", "Kirang", "Latar-Nocnoc-San Francisco", "Nagcuartelan", "Ocao-Capiniaan", "Poblacion", "Sta. Clara", "Tabueng", "Tucanon", "Yaway"],
  "Bagabag": ["Bakir", "Baretbet", "Careb", "Lantap", "Murong", "Nangalisan", "Paniki", "Pogonsino", "Quirino", "San Geronimo", "San Pedro", "Sta. Cruz", "Sta. Lucia", "Tuao North", "Tuao South", "Villa Coloma", "Villaros"],
  "Bambang": ["Abian", "Abinganan", "Aliaga", "Almaguer North", "Almaguer South", "Banggot", "Barat", "Buag", "Calaocan", "Dullao", "Homestead", "Indiana", "Mabuslo", "Macate", "Magsaysay Hills", "Manamtam", "Mauan", "Pallas", "Salinas", "San Antonio North", "San Antonio South", "San Fernando", "San Leonardo", "Santo Domingo", "Santo Domingo West"],
  "Bayombong": ["Bansing", "Bonfal East", "Bonfal Proper", "Bonfal West", "Buenavista", "Busilac", "Cabuaan", "Casat", "District III Pob.", "District IV", "Don Domingo Maddela Pob.", "Don Mariano Marcos", "Don Tomas Maddela Pob.", "Ipil-Cuneg", "La Torre North", "La Torre South", "Luyang", "Magapuy", "Magsaysay", "Masoc", "Paitan", "Salvacion", "San Nicolas North", "Santa Rosa", "Vista Alegre"],
  "Diadi": ["Ampakleng", "Arwas", "Balete", "Bugnay", "Butao", "Decabacan", "Duruarog", "Escoting", "Langka", "Lurad", "Nagsabaran", "Namamparan", "Pinya", "Poblacion", "Rosario", "San Luis", "San Pablo", "Villa Aurora", "Villa Florentino"],
  "Dupax del Norte": ["Belance", "Binuangan", "Bitnong", "Bulala", "Inaban", "Ineangan", "Lamo", "Mabasa", "Macabenga", "Malasin", "Munguia", "New Gumiad", "Oyao", "Parai", "Yabbi"],
  "Dupax del Sur": ["Abaca", "Bagumbayan", "Balsain", "Banila", "Biruk", "Canabay", "Carolotan", "Domang", "Dopaj", "Gabut", "Ganao", "Kimbutan", "Kinabuan", "Lukidnon", "Mangayang", "Palabotan", "Sanguit", "Santa Maria", "Talbek"],
  "Kasibu": ["Alimit", "Alloy", "Antutot", "Belet", "Binogawan", "Biyoy", "Bua", "Camamasi", "Capisaan", "Catarawan", "Cordon", "Didipio", "Dine", "Kakiduguen", "Kongkong", "Lupa", "Macalong", "Malabing", "Muta", "Nantawakan", "Pao", "Papaya", "Paquet", "Poblacion", "Pudi", "Siguem", "Tadji", "Tukod", "Wangal", "Watwat"],
  "Kayapa": ["Acacia", "Alang Salacsac", "Amelong Labeng", "Ansipsip", "Baan", "Babadi", "Balangabang", "Balete", "Banao", "Besong", "Binalian", "Buyasyas", "Cabalatan Alang", "Cabanglasan", "Cabayo", "Castillo Village", "Kayapa Proper East", "Kayapa Proper West", "Latbang", "Lawigan", "Mapayao", "Nansiakan", "Pampang", "Pangawan", "Pinayag", "Pingkian", "San Fabian", "Talicabcab", "Tidang Village", "Tubungan"],
  "Quezon": ["Aurora", "Baresbes", "Bonifacio", "Buliwao", "Calaocan", "Caliat", "Dagupan", "Darubba", "Maasin", "Maddiangat", "Nalubbunan", "Runruno"],
  "Santa Fe": ["Atbu", "Bacneng", "Balete", "Baliling", "Bantinan", "Baracbac", "Buyasyas", "Canabuan", "Imugan", "Malico", "Poblacion", "Santa Rosa", "Sinapaoan", "Tactac", "Unib", "Villa Flores"],
  "Solano": ["Aggub", "Bagahabag", "Bangaan", "Bangar", "Bascaran", "Communal", "Concepcion", "Curifang", "Dadap", "Lactawan", "Osmeña", "Pilar D. Galima", "Poblacion North", "Poblacion South", "Quezon", "Quirino", "Roxas", "San Juan", "San Luis", "Tucal", "Uddiawan", "Wacal"],
  "Villaverde": ["Bintawan Norte", "Bintawan Sur", "Cabuluan", "Ibung", "Nagbitin", "Ocapon", "Pieza", "Poblacion", "Sawmill"],
};

export function barangaysOf(municipality: string | undefined | null): string[] {
  if (!municipality) return [];
  return MUNICIPALITY_BARANGAYS[municipality] ?? [];
}
