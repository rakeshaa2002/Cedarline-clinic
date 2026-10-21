import { useCallback, useEffect, useRef, useState } from 'react'

// The Web Speech API isn't in TypeScript's DOM types everywhere; this is the part we use.
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/**
 * Speech-to-text for the chat composer (Chrome, Edge, Safari). The transcript goes into the input
 * for the patient to check before sending; nothing is sent automatically.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [supported] = useState(() => Boolean(recognitionCtor()))
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const callback = useRef(onTranscript)
  useEffect(() => {
    callback.current = onTranscript
  })

  const stop = useCallback(() => recognition.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-IN'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (event) => {
      callback.current(Array.from(event.results, (r) => r[0].transcript).join(''))
    }
    rec.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone access was blocked.' : 'Voice input stopped. Please try again.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognition.current = rec
    setError(null)
    setListening(true)
    rec.start()
  }, [])

  useEffect(() => () => recognition.current?.stop(), [])

  return { supported, listening, error, start, stop }
}
