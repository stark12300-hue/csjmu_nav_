/**
 * Audio and Text-to-Speech Engine for Turn-by-Turn Navigation.
 *
 * Specially designed to guarantee loud, clear voice in Android APK / WebViews:
 * 1. Primary Engine: High-quality MP3 Audio Stream via Google TTS (/api/tts proxy + direct fallback).
 *    HTML5 <audio> works 100% in Android WebViews and APKs without needing Android native TTS bridges.
 * 2. Secondary Engine: Device window.speechSynthesis fallback if offline.
 * 3. Offline Web Audio Synthesizer: Plays crisp turn chimes and arrival fanfares.
 */

class NavigationAudioManager {
  private currentAudioElement: HTMLAudioElement | null = null;
  private keepAliveTimer: any = null;
  private pendingSpeechTimer: any = null;
  private speechRequestId: number = 0;
  private isUnlocked: boolean = false;

  /**
   * Must be called during user interaction (e.g. click "Start Navigation", "Unmute", etc.)
   * to unlock Android WebView & mobile browser sound restrictions.
   */
  public unlockAudio(): void {
    try {
      // 1. Unlock HTML5 Audio in WebView
      const dummyAudio = new Audio();
      dummyAudio.muted = true;
      dummyAudio.play().catch(() => {});

      // 2. Unlock SpeechSynthesis if supported
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.getVoices();
      }

      this.isUnlocked = true;
    } catch (err) {
      console.warn('[NavigationAudio] Audio unlock notice:', err);
    }
  }

  /**
   * Chime is made silent by default to remove annoying electronic beep sounds
   * when starting, turning, or finishing navigation.
   */
  public playChime(_type: 'start' | 'turn' | 'arrive' | 'alert' = 'turn'): void {
    // Intentionally no-op to eliminate annoying beeps requested by user
  }

  /**
   * Stop any currently ongoing speech or audio immediately with zero click or beep artifact.
   */
  public stopAllVoice(): void {
    // Invalidate any ongoing asynchronous speech request
    this.speechRequestId++;

    if (this.pendingSpeechTimer) {
      clearTimeout(this.pendingSpeechTimer);
      this.pendingSpeechTimer = null;
    }

    if (this.currentAudioElement) {
      try {
        const el = this.currentAudioElement;
        el.onplay = null;
        el.onerror = null;
        el.onended = null;
        el.pause();
        el.removeAttribute('src');
        el.load();
      } catch (e) {}
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    this.clearKeepAlive();
  }

  /**
   * Speak navigation instruction with guaranteed SINGLE VOICE (zero echo, zero double speech).
   */
  public speakInstruction(
    text: string,
    lang: 'hi' | 'en' = 'en',
    _withChime: boolean = false
  ): void {
    if (typeof window === 'undefined' || !text) return;

    // Immediately cancel and stop any ongoing speech/audio
    this.stopAllVoice();

    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    if (!cleanText) return;

    const currentReq = this.speechRequestId;

    // Small 60ms debounce to allow browser audio cancel to settle smoothly
    this.pendingSpeechTimer = setTimeout(() => {
      if (this.speechRequestId !== currentReq) return;
      this.playSingleVoice(cleanText, lang, currentReq);
    }, 60);
  }

  /**
   * Plays voice strictly through ONE engine:
   * First tries Google TTS Audio Stream. If it completely fails, only then falls back to SpeechSynthesis.
   * Both engines will NEVER play at the same time.
   */
  private playSingleVoice(text: string, lang: 'hi' | 'en', reqId: number): void {
    if (this.speechRequestId !== reqId) return;

    const serverTtsUrl = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
    const googleDirectTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;

    let hasStartedAudio = false;
    let fallbackExecuted = false;

    const executeFallback = () => {
      if (fallbackExecuted || hasStartedAudio || this.speechRequestId !== reqId) return;
      fallbackExecuted = true;
      if (this.currentAudioElement) {
        try {
          this.currentAudioElement.pause();
          this.currentAudioElement = null;
        } catch (e) {}
      }
      this.speakViaSpeechSynthesis(text, lang, reqId);
    };

    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.volume = 1.0;
      this.currentAudioElement = audio;

      audio.onplay = () => {
        if (this.speechRequestId !== reqId) {
          audio.pause();
          return;
        }
        hasStartedAudio = true;
      };

      audio.onended = () => {
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
        }
      };

      audio.onerror = () => {
        if (this.speechRequestId !== reqId || hasStartedAudio) return;

        // If local proxy failed, try direct Google Translate TTS URL once
        if (audio.src.includes('/api/tts')) {
          audio.src = googleDirectTtsUrl;
          const directPromise = audio.play();
          if (directPromise !== undefined) {
            directPromise.catch(() => {
              executeFallback();
            });
          }
        } else {
          executeFallback();
        }
      };

      audio.src = serverTtsUrl;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (this.speechRequestId !== reqId) {
              audio.pause();
            } else {
              hasStartedAudio = true;
            }
          })
          .catch((err: any) => {
            // If aborted because a newer instruction came, do NOT trigger fallback!
            if (err?.name === 'AbortError' || this.speechRequestId !== reqId) {
              return;
            }
            // Real playback failure (e.g. offline): execute speech synthesis fallback
            executeFallback();
          });
      }
    } catch (err) {
      executeFallback();
    }
  }

  /**
   * Device window.speechSynthesis fallback (runs only if audio stream completely unavailable)
   */
  private speakViaSpeechSynthesis(text: string, lang: 'hi' | 'en', reqId: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.speechRequestId !== reqId) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        let matchedVoice: SpeechSynthesisVoice | undefined;
        if (lang === 'hi') {
          matchedVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().includes('hi') ||
              v.name.toLowerCase().includes('hindi')
          );
        } else {
          matchedVoice =
            voices.find(
              (v) =>
                v.lang.toLowerCase().includes('en-in') ||
                v.lang.toLowerCase().includes('en_in')
            ) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onend = () => {
        this.clearKeepAlive();
      };

      utterance.onerror = (e) => {
        console.warn('[NavigationAudio] Utterance error:', e);
        this.clearKeepAlive();
      };

      if (this.speechRequestId === reqId) {
        this.startKeepAlive();
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('[NavigationAudio] Speech synthesis failed:', err);
    }
  }

  private startKeepAlive(): void {
    this.clearKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (!window.speechSynthesis.speaking) {
          this.clearKeepAlive();
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 5000);
  }

  private clearKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}

export const navigationAudio = new NavigationAudioManager();
