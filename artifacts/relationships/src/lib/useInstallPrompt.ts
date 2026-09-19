import { useState, useEffect } from "react";
import { getInstallState, onInstallChange, triggerInstall } from "./installPrompt";

export function useInstallPrompt(): {
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
} {
  const [state, setState] = useState(getInstallState);

  useEffect(() => {
    return onInstallChange(() => setState(getInstallState()));
  }, []);

  return { ...state, install: triggerInstall };
}
