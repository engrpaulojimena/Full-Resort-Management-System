'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Phone,
  BedDouble,
  Upload,
  CheckCircle,
  FileDown,
  Check,
  Loader2,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react'

// ─── Resort payment details (update to your actual accounts) ─────────────────
const GCASH_NUMBER = '0917 123 4567'
const GCASH_NAME = 'Kekamiya Beach Resort'
const BANK_NAME = 'BDO Unibank'
const BANK_ACCOUNT_NAME = 'Kekamiya Beach Resort'
const BANK_ACCOUNT_NUMBER = '1234 5678 9012'

type PaymentMethod = 'gcash' | 'bank_transfer'
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export default function PayDepositClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [method, setMethod] = useState<PaymentMethod>('gcash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Booking details from URL
  const confirmationCode = searchParams.get('code') || ''
  const reservationId = searchParams.get('id') || ''
  const guestName = searchParams.get('name') || ''
  const guestEmail = searchParams.get('email') || ''
  const depositAmount = parseInt(searchParams.get('amount') || '0')
  const totalAmount = parseInt(searchParams.get('total') || '0')
  const roomName = searchParams.get('room') || ''
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''

  useEffect(() => {
    if (!confirmationCode || !reservationId || !depositAmount) {
      router.replace('/book')
      return
    }
    setLoading(false)
  }, [confirmationCode, reservationId, depositAmount, router])

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // fallback silently
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMsg('Please upload an image (JPG, PNG) or PDF file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size is 10MB.')
      return
    }
    setErrorMsg('')
    setProofFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setProofPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  const removeFile = () => {
    setProofFile(null)
    setProofPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const finalAmount = useCustomAmount && customAmount ? parseInt(customAmount) : depositAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referenceNumber.trim()) {
      setErrorMsg('Please enter your reference / transaction number.')
      return
    }
    if (!proofFile) {
      setErrorMsg('Please upload your proof of payment.')
      return
    }
    if (useCustomAmount && customAmount && parseInt(customAmount) < depositAmount) {
      setErrorMsg('Amount must be at least the required deposit of ₱' + depositAmount.toLocaleString() + '.')
      return
    }

    setErrorMsg('')
    setSubmitStatus('submitting')
    setUploadStatus('uploading')

    try {
      // Convert file to base64 for upload
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(proofFile)
      })

      setUploadStatus('done')

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: parseInt(reservationId),
          amount: finalAmount,
          method,
          paymentType: 'deposit',
          referenceNumber: referenceNumber.trim(),
          proofBase64: base64,
          proofFileName: proofFile.name,
          proofFileType: proofFile.type,
          guestName,
          guestEmail,
          confirmationCode,
          roomName,
          checkIn,
          checkOut,
          totalAmount,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setSubmitStatus('error')
        setUploadStatus('idle')
        return
      }

      setSubmitStatus('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setSubmitStatus('error')
      setUploadStatus('idle')
    }
  }

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-400" />
      </section>
    )
  }

  if (submitStatus === 'success') {
    return (
      <section className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 flex items-start justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-palm-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-11 h-11 text-palm-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ocean-900 mb-2">
              Payment Submitted!
            </h1>
            <p className="text-gray-500 mb-6">
              Your deposit proof has been received. Our staff will verify your payment and send you a final confirmation email within a few hours.
            </p>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl px-6 py-4 mb-6 text-left">
              <p className="text-xs font-bold text-ocean-500 uppercase tracking-widest mb-2">Booking Reference</p>
              <p className="font-display text-2xl font-bold text-ocean-900 tracking-widest mb-1">{confirmationCode}</p>
              <p className="text-sm text-gray-500">
                Deposit: <span className="font-semibold text-palm-600">₱{finalAmount.toLocaleString()}</span> via {method === 'gcash' ? 'GCash' : 'Bank Transfer'}
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Check your inbox at <span className="font-medium text-ocean-600">{guestEmail}</span> for updates.
            </p>
            <a href="/" className="btn-primary justify-center w-full">
              Back to Home
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Hero band */}
      <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 pt-24 pb-10 px-4 text-center">
        <p className="text-ocean-300 text-sm font-semibold uppercase tracking-widest mb-2">Deposit Payment</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Pay Your Deposit</h1>
        <p className="text-ocean-200 text-sm">
          Booking <span className="font-bold text-white">{confirmationCode}</span> · {roomName}
        </p>
      </div>

      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-ocean-600 transition-colors mb-6"
          >
            <ArrowRight className="w-4 h-4" /> Back to confirmation
          </button>

          {/* Amount summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Required Deposit (30%)</p>
                <p className="font-display text-3xl font-bold text-sand-600">₱{depositAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Balance of ₱{(totalAmount - depositAmount).toLocaleString()} due at check-in</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total Stay</p>
                <p className="font-display text-xl font-bold text-ocean-800">₱{totalAmount.toLocaleString()}</p>
              </div>
            </div>
            {/* Custom amount option */}
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomAmount}
                  onChange={e => { setUseCustomAmount(e.target.checked); setCustomAmount(''); }}
                  className="w-4 h-4 rounded accent-ocean-500"
                />
                <span className="text-sm font-medium text-gray-600">I want to pay a different amount</span>
              </label>
              {useCustomAmount && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Enter amount (₱)</label>
                  <input
                    type="number"
                    min={1}
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder={String(depositAmount)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800 font-bold"
                  />
                  {customAmount && parseInt(customAmount) > depositAmount && (
                    <p className="text-xs text-palm-600 mt-1.5 font-medium">✓ ₱{(parseInt(customAmount) - depositAmount).toLocaleString()} over the required deposit</p>
                  )}
                  {customAmount && parseInt(customAmount) < depositAmount && (
                    <p className="text-xs text-amber-600 mt-1.5 font-medium">⚠ ₱{(depositAmount - parseInt(customAmount)).toLocaleString()} below the required deposit — subject to staff approval</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Step 1: Choose method */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Step 1 — Choose Payment Method</p>

              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {/* GCash */}
                <button
                  type="button"
                  onClick={() => setMethod('gcash')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    method === 'gcash'
                      ? 'border-ocean-500 bg-ocean-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-ocean-900">GCash</p>
                    <p className="text-xs text-gray-500">Mobile payment</p>
                  </div>
                  {method === 'gcash' && (
                    <CheckCircle className="w-5 h-5 text-ocean-500 ml-auto" />
                  )}
                </button>

                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setMethod('bank_transfer')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    method === 'bank_transfer'
                      ? 'border-ocean-500 bg-ocean-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <BedDouble className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-ocean-900">Bank Transfer</p>
                    <p className="text-xs text-gray-500">Online banking / OTC</p>
                  </div>
                  {method === 'bank_transfer' && (
                    <CheckCircle className="w-5 h-5 text-ocean-500 ml-auto" />
                  )}
                </button>
              </div>

              {/* Payment details */}
              {method === 'gcash' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">GCash Details</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ocean-900">{GCASH_NUMBER}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(GCASH_NUMBER.replace(/\s/g, ''), 'gcash_number')}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {copiedField === 'gcash_number' ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Account Name</span>
                      <span className="font-bold text-ocean-900">{GCASH_NAME}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="font-bold text-palm-600">₱{depositAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3 bg-blue-100 rounded-lg px-3 py-2">
                    💡 Include your confirmation code <strong>{confirmationCode}</strong> in the GCash note/message field.
                  </p>
                </div>
              )}

              {method === 'bank_transfer' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">Bank Transfer Details</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Bank</span>
                      <span className="font-bold text-ocean-900">{BANK_NAME}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Account Name</span>
                      <span className="font-bold text-ocean-900">{BANK_ACCOUNT_NAME}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ocean-900">{BANK_ACCOUNT_NUMBER}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(BANK_ACCOUNT_NUMBER.replace(/\s/g, ''), 'bank_acc')}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          {copiedField === 'bank_acc' ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="font-bold text-palm-600">₱{depositAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-700 mt-3 bg-emerald-100 rounded-lg px-3 py-2">
                    💡 Use reference: <strong>{confirmationCode}</strong> when filling out the transfer details.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Reference number + proof upload */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Step 2 — Submit Your Proof</p>

              <div className="flex flex-col gap-4">
                {/* Reference number */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">
                    {method === 'gcash' ? 'GCash Reference Number' : 'Bank Transfer Reference / Transaction ID'}
                  </span>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    required
                    placeholder={method === 'gcash' ? '13-digit GCash reference' : 'e.g. BDO-2024-XXXXXXXX'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 outline-none transition-all text-sm text-gray-800"
                  />
                </label>

                {/* File upload */}
                <div>
                  <span className="text-sm font-semibold text-gray-700 block mb-1.5">Upload Proof of Payment</span>
                  <p className="text-xs text-gray-400 mb-3">Screenshot or photo of your receipt. JPG, PNG, or PDF — max 10MB.</p>

                  {proofFile ? (
                    <div className="border-2 border-ocean-200 rounded-xl p-4 bg-ocean-50">
                      <div className="flex items-start gap-3">
                        {proofPreview ? (
                          <img
                            src={proofPreview}
                            alt="Proof preview"
                            className="w-16 h-16 rounded-lg object-cover border border-ocean-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-ocean-100 flex items-center justify-center">
                            <Eye className="w-7 h-7 text-ocean-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ocean-900 text-sm truncate">{proofFile.name}</p>
                          <p className="text-xs text-gray-400">
                            {(proofFile.size / 1024).toFixed(0)} KB
                          </p>
                          {uploadStatus === 'uploading' && (
                            <p className="text-xs text-ocean-500 flex items-center gap-1 mt-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                            </p>
                          )}
                          {uploadStatus === 'done' && (
                            <p className="text-xs text-palm-600 flex items-center gap-1 mt-1">
                              <Check className="w-3 h-3" /> Uploaded
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 px-4 text-center hover:border-ocean-300 hover:bg-ocean-50/50 transition-all group"
                    >
                      <Upload className="w-8 h-8 text-gray-300 group-hover:text-ocean-400 mx-auto mb-2 transition-colors" />
                      <p className="text-sm font-semibold text-gray-500 group-hover:text-ocean-600 transition-colors">
                        Click to upload receipt
                      </p>
                      <p className="text-xs text-gray-400">JPG, PNG, PDF up to 10MB</p>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitStatus === 'submitting' || (useCustomAmount && !!customAmount && parseInt(customAmount) < depositAmount)}
              className="btn-primary justify-center w-full text-base py-4 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitStatus === 'submitting' ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting Payment…
                </span>
              ) : (
                'Submit Payment Proof'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center -mt-3">
              By submitting, our staff will manually verify your payment. You&apos;ll receive a confirmation email once verified.
            </p>
          </form>
        </div>
      </section>
    </>
  )
}