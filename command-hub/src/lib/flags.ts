// Feature flags (handoff §2.4). On unless set to "0".
const on = (v: string | undefined) => v !== "0";

export const flags = {
  get responderTracking() { return on(process.env.FEATURE_RESPONDER_TRACKING); },
  get hotlineIntake() { return on(process.env.FEATURE_HOTLINE_INTAKE); },
  get citizenEtaUpdates() { return on(process.env.FEATURE_CITIZEN_ETA_UPDATES); },
};
