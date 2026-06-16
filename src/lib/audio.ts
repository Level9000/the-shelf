/**
 * Plays a pre-recorded static audio file from /public/audio/.
 * Falls back to the ElevenLabs TTS API if the file isn't found (404).
 * Returns a promise that resolves when the audio finishes playing.
 */
export async function playStaticAudio(
  filename: string,
  opts?: { onEnd?: () => void; onError?: () => void },
): Promise<HTMLAudioElement | null> {
  const audio = new Audio(`/audio/${filename}`);

  return new Promise((resolve) => {
    audio.onended = () => {
      opts?.onEnd?.();
      resolve(audio);
    };
    audio.onerror = async () => {
      // File not found or failed — fall back to TTS API
      opts?.onError?.();
      resolve(null);
    };
    audio.play().catch(() => {
      opts?.onError?.();
      resolve(null);
    });
  });
}

/**
 * Plays static audio if available, otherwise calls ElevenLabs TTS.
 * onEnd fires after whichever source finishes.
 */
export async function playAudioWithFallback(
  staticFile: string,
  ttsText: string,
  opts?: { onEnd?: () => void },
): Promise<void> {
  const audio = new Audio(`/audio/${staticFile}`);
  let resolved = false;

  const tryStatic = (): Promise<boolean> =>
    new Promise((resolve) => {
      audio.onended = () => { opts?.onEnd?.(); resolve(true); };
      audio.onerror = () => resolve(false);
      audio.play().then(() => {}).catch(() => resolve(false));
    });

  const ok = await tryStatic();
  if (ok || resolved) return;

  // Fallback to ElevenLabs
  try {
    const res = await fetch("/api/tts/cass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ttsText }),
    });
    if (!res.ok) { opts?.onEnd?.(); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const fallback = new Audio(url);
    fallback.onended = () => { URL.revokeObjectURL(url); opts?.onEnd?.(); };
    fallback.onerror = () => { URL.revokeObjectURL(url); opts?.onEnd?.(); };
    await fallback.play();
  } catch {
    opts?.onEnd?.();
  }
}
