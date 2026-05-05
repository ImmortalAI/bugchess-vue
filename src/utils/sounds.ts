const audioCache = new Map<string, HTMLAudioElement>();

export function playSound(name: string): void {
  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(`/sound/${name}.mp3`);
    audioCache.set(name, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
