// Hotline call form, extra fields (handoff §6). Edit this list to match
// PDRRMO's paper call form once they send it: answers are stored in
// call_logs.form_extra, so no database change is needed. Keys: lowercase
// letters and underscores.

export interface ExtraField {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
}

export const CALL_FORM_EXTRA: ExtraField[] = [
  { key: "landmark", label: "Nearest landmark", type: "text" },
  { key: "persons_involved", label: "Persons involved", type: "number" },
  { key: "injuries", label: "Injuries", type: "select", options: ["None known", "Minor", "Serious", "Fatal", "Unknown"] },
  { key: "caller_relationship", label: "Caller is", type: "select", options: ["Victim", "Witness", "Relative", "Barangay official", "Other"] },
  { key: "agency_needed", label: "Agency needed", type: "select", options: ["PDRRMO/MDRRMO", "BFP", "PNP", "DOH / ambulance", "Social welfare", "Several"] },
];

export const CALL_NATURES = [
  "Flooding", "Landslide", "Structure Fire", "Grass Fire", "Vehicular Accident", "Medical Emergency",
  "Missing Person", "Crime / Disturbance", "Road Blocked", "Other",
];
