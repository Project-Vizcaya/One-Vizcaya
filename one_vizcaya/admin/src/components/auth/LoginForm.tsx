import { useState, useRef, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, ADMIN_ROLES } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/useToast";
import { Loader2, Phone, ShieldCheck, AlertTriangle } from "lucide-react";

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => { verifierRef.current?.clear(); };
  }, []);

  const initRecaptcha = () => {
    if (!recaptchaRef.current) return;
    if (verifierRef.current) verifierRef.current.clear();
    verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
      size: "invisible",
      callback: () => {},
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.match(/^[9]\d{9}$/)) {
      setError("Enter a valid 10-digit Philippine mobile number starting with 9.");
      return;
    }
    setLoading(true);
    try {
      initRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+63${phone}`, verifierRef.current!);
      setConfirmation(result);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
      verifierRef.current?.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation || otp.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) throw new Error("Account not registered. Contact your system administrator.");
      const role = userDoc.data().role as string;
      if (!ADMIN_ROLES.includes(role as never)) throw new Error("Access denied. This portal is for authorized administrators only.");
      // Auth state change triggers redirect via useAuth in root layout
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--gov-green-900))]">
      {/* Government header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3 safe-pt">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <img
            src="/img/seals/nueva-vizcaya.png"
            alt="Provincial Government of Nueva Vizcaya Seal"
            className="h-9 w-9 rounded-full ring-2 ring-white/20 object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Republic of the Philippines</p>
            <p className="text-white/70 text-[10px] leading-tight">Provincial Government of Nueva Vizcaya</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* App title block */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10 ring-4 ring-white/10 mb-4">
              <img
                src="/img/seals/nueva-vizcaya.png"
                alt=""
                aria-hidden="true"
                className="h-12 w-12 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">One Vizcaya</h1>
            <p className="text-green-300 text-sm mt-1">Emergency Management Admin Portal</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Card header bar */}
            <div className="bg-[hsl(var(--gov-green-700))] px-5 py-3">
              <p className="text-white text-xs font-bold uppercase tracking-widest">
                {step === "phone" ? "Authorized Personnel Sign In" : "OTP Verification"}
              </p>
            </div>

            <div className="p-5">
              {step === "phone" ? (
                <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-[hsl(var(--gov-green-50))] flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-[hsl(var(--gov-green-800))]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Mobile Verification</p>
                      <p className="text-xs text-muted-foreground">Enter your registered number</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Philippine Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex">
                      <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm font-medium text-muted-foreground select-none shrink-0">
                        🇵🇭 +63
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9XXXXXXXXX"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
                        className="rounded-l-none font-mono"
                        autoComplete="tel-national"
                        inputMode="numeric"
                        aria-describedby={error ? "phone-error" : undefined}
                        aria-invalid={!!error}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Format: 9XXXXXXXXX (10 digits)</p>
                  </div>

                  {error && (
                    <div id="phone-error" role="alert" className="flex items-start gap-2 text-sm text-destructive bg-red-50 border border-red-200 rounded-md p-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full font-semibold" disabled={loading || phone.length !== 10}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />Sending OTP…</> : "Send Verification Code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Enter Verification Code</p>
                      <p className="text-xs text-muted-foreground">Sent to +63{phone}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-xs font-semibold">
                      6-Digit OTP <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="· · · · · ·"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                      className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      autoFocus
                      aria-describedby={error ? "otp-error" : undefined}
                      aria-invalid={!!error}
                    />
                  </div>

                  {error && (
                    <div id="otp-error" role="alert" className="flex items-start gap-2 text-sm text-destructive bg-red-50 border border-red-200 rounded-md p-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full font-semibold" disabled={loading || otp.length !== 6}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />Verifying…</> : "Verify & Sign In"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground text-xs"
                    onClick={() => { setStep("phone"); setOtp(""); setError(null); setConfirmation(null); }}
                  >
                    ← Change number
                  </Button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-green-400/70 text-[11px] mt-5">
            Authorized personnel only · One Vizcaya Admin v2.0
          </p>
        </div>
      </div>

      {/* Invisible recaptcha */}
      <div ref={recaptchaRef} />
    </div>
  );
}
