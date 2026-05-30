import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuthContext } from '../lib/authContext'
import { APP_VERSION } from '../lib/firebase'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const { user, loading } = useAuthContext()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const confirmRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    if (!loading && user) navigate({ to: '/dashboard' })
  }, [user, loading, navigate])

  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    })
    recaptchaRef.current.render()
    return () => { recaptchaRef.current?.clear() }
  }, [])

  async function sendOTP() {
    const fullPhone = '+63' + phone.trim()
    if (!/^\+63[0-9]{10}$/.test(fullPhone)) {
      setError('Enter a valid 10-digit Philippine mobile number.')
      return
    }
    setBusy(true); setError(''); setSuccess('')
    try {
      confirmRef.current = await signInWithPhoneNumber(auth, fullPhone, recaptchaRef.current!)
      setStep('otp')
      setSuccess('Code sent to ' + fullPhone)
    } catch (e: unknown) {
      setError('Failed to send code: ' + (e as Error).message)
      recaptchaRef.current?.render()
    } finally {
      setBusy(false)
    }
  }

  async function verifyOTP() {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return }
    setBusy(true); setError('')
    try {
      await confirmRef.current!.confirm(otp)
    } catch {
      setError('Invalid code. Please try again.')
      setBusy(false)
    }
  }

  function reset() {
    setStep('phone'); setPhone(''); setOtp(''); setError(''); setSuccess('')
    confirmRef.current = null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg,#1B5E20 0%,#2E7D32 50%,#F57F17 100%)' }}>
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl animate-fade-up">

        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-green-100 shadow-lg overflow-hidden bg-white">
            <img src="/img/seals/nueva-vizcaya.png" alt="NV Seal" className="w-20 h-20 object-contain rounded-full"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
          <h1 className="text-2xl font-extrabold text-green-900 tracking-tight">One Vizcaya</h1>
          <p className="text-sm text-gray-500 mt-1">Nueva Vizcaya Province</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-50 to-yellow-50 text-green-800 border border-green-200">
            Admin Dashboard
          </span>
        </div>

        {step === 'phone' ? (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Phone Number</label>
            <div className="flex gap-2 mb-5">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl px-4 flex items-center text-sm font-semibold text-green-700 shrink-0">+63</div>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                placeholder="9XXXXXXXXX" maxLength={10} inputMode="numeric"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all"
              />
            </div>
            <div id="recaptcha-container" />
            <button onClick={sendOTP} disabled={busy}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#2E7D32,#1B5E20)', boxShadow: '0 4px 16px rgba(46,125,50,.35)' }}>
              {busy ? 'Sending…' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Verification Code</label>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyOTP()}
              placeholder="Enter 6-digit code" maxLength={6} inputMode="numeric"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all mb-4"
            />
            <button onClick={verifyOTP} disabled={busy}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm mb-3 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#2E7D32,#1B5E20)' }}>
              {busy ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <button onClick={reset} className="w-full py-3 rounded-2xl font-bold text-sm text-green-700 border-2 border-green-700 bg-white hover:bg-green-50 transition-all">
              ← Change Number
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm border-l-4 border-red-400">{error}</div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm border-l-4 border-green-400">{success}</div>
        )}

        <div className="text-center text-xs text-gray-400 mt-7 leading-relaxed">
          One Vizcaya Admin Portal v{APP_VERSION}<br/>Authorized personnel only
        </div>
      </div>
    </div>
  )
}
