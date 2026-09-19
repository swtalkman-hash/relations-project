interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let _prompt: BeforeInstallPromptEvent | null = null;
let _installed = false;
const _listeners = new Set<() => void>();

function notify(): void {
  _listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _prompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    _prompt = null;
    _installed = true;
    notify();
  });
}

export function getInstallState(): { canInstall: boolean; installed: boolean } {
  return { canInstall: !!_prompt && !_installed, installed: _installed };
}

export function onInstallChange(fn: () => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!_prompt) return "unavailable";
  try {
    await _prompt.prompt();
    const { outcome } = await _prompt.userChoice;
    if (outcome === "accepted") {
      _prompt = null;
      _installed = true;
      notify();
    }
    return outcome;
  } catch {
    return "unavailable";
  }
}
