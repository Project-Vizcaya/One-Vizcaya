import { useState, useRef, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, ADMIN_ROLES } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/useToast";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
    };
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
    if (!phone.match(/^[9]\d{9}$/)) {
      toast({ title: "Invalid number", description: "Enter a valid 10-digit PH mobile number (9XXXXXXXXX)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      initRecaptcha();
      const fullNumber = `+63${phone}`;
      const result = await signInWithPhoneNumber(auth, fullNumber, verifierRef.current!);
      setConfirmation(result);
      setStep("otp");
      toast({ title: "OTP Sent", description: `Verification code sent to +63${phone}`, variant: "success" as never });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      toast({ title: "Error", description: msg, variant: "destructive" });
      verifierRef.current?.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation || otp.length !== 6) return;

    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) {
        throw new Error("Account not found. Contact your administrator.");
      }
      const role = userDoc.data().role as string;
      if (!ADMIN_ROLES.includes(role as never)) {
        throw new Error("You don't have admin access.");
      }
      toast({ title: "Signed in", description: "Welcome back!", variant: "success" as never });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      toast({ title: "Authentication Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/img/seals/nv-seal.png"
              alt="Nueva Vizcaya"
              className="h-20 w-20 rounded-full ring-4 ring-white/20 shadow-xl object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white">One Vizcaya</h1>
          <p className="text-green-200 text-sm mt-1">Province of Nueva Vizcaya — Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                  <Phone className="h-5 w-5 text-green-700" />
                </div>
                <h2 className="text-lg font-semibold">Sign In</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your registered mobile number</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground select-none shrink-0">
                    🇵🇭 +63
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="rounded-l-none"
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-xs text-muted-foreground">10-digit number starting with 9</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || phone.length !== 10}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-3">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <h2 className="text-lg font-semibold">Enter OTP</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Code sent to +63{phone}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</> : "Verify & Sign In"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("phone"); setOtp(""); setConfirmation(null); }}
              >
                ← Back to phone number
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-green-300 text-xs mt-6">
          Authorized personnel only · One Vizcaya v2.0
        </p>
      </div>

      {/* Invisible recaptcha container */}
      <div ref={recaptchaRef} />
    </div>
  );
}
