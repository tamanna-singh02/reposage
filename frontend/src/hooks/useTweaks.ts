import { useState, useCallback } from 'react'

interface TweakValues {
  theme: string
  bubbleStyle: string
  darkMode: boolean
}

const DEFAULTS: TweakValues = { theme: 'notion', bubbleStyle: 'sided', darkMode: false }

export function useTweaks() {
  const [values, setValues] = useState<TweakValues>(DEFAULTS)

  const setTweak = useCallback(
    (keyOrEdits: Partial<TweakValues> | keyof TweakValues, val?: unknown) => {
      const edits =
        typeof keyOrEdits === 'object' && keyOrEdits !== null
          ? keyOrEdits
          : { [keyOrEdits]: val }
      setValues(prev => ({ ...prev, ...edits }))
    },
    [],
  )

  return [values, setTweak] as const
}
