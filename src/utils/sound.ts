/**
 * Play a notification chime using the Web Audio API without needing external audio files
 */
export const playNotificationSound = () => {
  try {
    const isMuted = localStorage.getItem('admin_notification_sound_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Create 2-tone melodic chime (C6 -> G6)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(784, now, 0.18);        // G5
    playTone(1046.5, now + 0.1, 0.28); // C6

  } catch (e) {
    console.debug('[Sound] Audio play failed or not permitted yet:', e);
  }
};
