import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { isAuthRejection, refreshAccessToken } from "@/services/apiClient";

const REFRESH_TIMEOUT_MS = 5000;
const TRANSIENT_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How the startup session check ended.
 *
 * `unreachable` is the case worth naming: the refresh never got an answer, so
 * the cookie may well still be valid. Without this the admin was simply
 * dropped on the login page with no explanation, which reads as "your session
 * expired" when the real cause is a server that is asleep or a lost
 * connection — and signing in again cannot fix either.
 */
export type BootstrapOutcome = "restored" | "rejected" | "unreachable";

/**
 * On first load, attempt a silent refresh using the httpOnly refresh-token
 * cookie. If it succeeds the session is restored without the admin having
 * to log in again; if the server rejects the token, fall through to the
 * login page. Returns whether that check is still in flight, so routing
 * can hold off rendering the login page until the outcome is known.
 */
export function useSessionBootstrap(): {
  checking: boolean;
  outcome: BootstrapOutcome | null;
} {
  const clearSession = useAuthStore((s) => s.clearSession);
  const attempted = useRef(false);
  const [checking, setChecking] = useState(true);
  const [outcome, setOutcome] = useState<BootstrapOutcome | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    // No mounted-flag guard here. StrictMode mounts, unmounts, then remounts
    // this effect in development; `attempted` means only the first pass fires
    // the request, so a flag cleared by that first unmount would suppress the
    // one and only `setChecking(false)` and leave the app on its loader
    // forever. The ref already guarantees a single request, and setting state
    // on an unmounted component is a no-op in React 18.
    const run = async () => {
      for (let attempt = 0; ; attempt += 1) {
        try {
          // Goes through the shared helper rather than its own request:
          // refresh tokens rotate, so a bootstrap refresh racing an
          // interceptor one would revoke the token the other still holds and
          // sign the admin out.
          await refreshAccessToken(REFRESH_TIMEOUT_MS);
          setOutcome("restored");
          return;
        } catch (error) {
          // A rejected token means there is genuinely no session to restore.
          if (isAuthRejection(error)) {
            clearSession();
            setOutcome("rejected");
            return;
          }
          // Anything else (timeout, API still booting, offline) leaves the
          // cookie valid, so it is worth another try before giving up.
          if (attempt >= TRANSIENT_RETRIES) {
            setOutcome("unreachable");
            return;
          }
          await wait(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    };

    void run().finally(() => setChecking(false));
  }, [clearSession]);

  return { checking, outcome };
}
