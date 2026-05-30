import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { auth, APP_VERSION } from '@/lib/firebase'
import { useAuthContext } from '@/lib/authContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: LoginPage })

function LoginPage() {
  const { user, loading } = useAuthContext()
  const navigate = useNavigate()
  const [phone, setPhone]   = useState('')
  const [otp, setOtp]       = useState('')
  const [step, setStep]     = useState<'phone' | 'otp'>('phone')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy]     = useState(false)
  const confirmRef   = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => { if (!loading && user) navigate({ to: '/dashboard' }) }, [user, loading, navigate])

  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} })
    recaptchaRef.current.render()
    return () => recaptchaRef.current?.clear()
  }, [])

  async function sendOTP() {
    const full = '+63' + phone.trim()
    if (!/^\+63[0-9]{10}$/.test(full)) { setError('Enter a valid 10-digit Philippine mobile number.'); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      confirmRef.current = await signInWithPhoneNumber(auth, full, recaptchaRef.current!)
      setStep('otp'); setSuccess('Verification code sent to ' + full)
    } catch (e: unknown) { setError('Failed to send: ' + (e as Error).message); recaptchaRef.current?.render() }
    finally { setBusy(false) }
  }

  async function verifyOTP() {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return }
    setBusy(true); setError('')
    try { await confirmRef.current!.confirm(otp) }
    catch { setError('Invalid code. Please try again.'); setBusy(false) }
  }

  function reset() { setStep('phone'); setPhone(''); setOtp(''); setError(''); setSuccess(''); confirmRef.current = null }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg,#1B5E20 0%,#2E7D32 50%,#F57F17 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl border-0 animate-fade-in">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 shadow-xl overflow-hidden bg-white flex items-center justify-center">
              <img src="/img/seals/nueva-vizcaya.png" alt="NV Seal" className="w-20 h-20 object-contain rounded-full"
                onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">One Vizcaya</h1>
          <p className="text-sm text-muted-foreground">Nueva Vizcaya Province</p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            Admin Dashboard
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-sm font-semibold text-primary shrink-0">+63</div>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendOTP()}
                    placeholder="9XXXXXXXXX" maxLength={10} inputMode="numeric" />
                </div>
              </div>
              <div id="recaptcha-container" />
              <Button onClick={sendOTP} disabled={busy} className="w-full h-11">
                {busy ? 'Sending…' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  placeholder="6-digit code" maxLength={6} inputMode="numeric" className="text-center text-lg tracking-widest" />
              </div>
              <Button onClick={verifyOTP} disabled={busy} className="w-full h-11">
                {busy ? 'Verifying…' : 'Verify & Sign In'}
              </Button>
              <Button variant="outline" onClick={reset} className="w-full">← Change Number</Button>
            </>
          )}

          {error   && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">{error}</p>}
          {success && <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">{success}</p>}

          <p className="text-center text-xs text-muted-foreground pt-2">
            One Vizcaya Admin v{APP_VERSION} · Authorized personnel only
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
