import { useState } from "react";
import { useGallerySettingsQuery } from "./useGallerySettings";
import type { PhotoSession, SessionVisibility } from "@/types/session";

/**
 * Which prompt, if any, stands between the admin and the password dialog.
 *
 * - `require-protected` — a password was asked for on a session whose
 *   visibility does not gate anything. Confirming switches it to `protected`.
 * - `offer-password` — the session was just switched to a gating visibility but
 *   has no password yet, so the gate would not hold. Confirming sets one.
 */
export type SessionPasswordPrompt = "require-protected" | "offer-password";

/**
 * Visibilities whose albums ask for the gallery password.
 *
 * Both, not just `protected`: the server gates on a password existing and
 * ignores `visibility` entirely (see `isPasswordGated` in
 * `publicGalleryService`), so a `private` album with a password asks for it as
 * surely as a listed one. `visibility` decides only how the album is *reached*
 * — `private` keeps it out of listings, `protected` leaves it in.
 */
const GATING_VISIBILITIES: SessionVisibility[] = ["private", "protected"];

export function gatesWithPassword(visibility: SessionVisibility): boolean {
  return GATING_VISIBILITIES.includes(visibility);
}

/**
 * The "set a gallery password" flow, shared by the sessions table and the CMS
 * category tab.
 *
 * Both pages render the same table and the same password dialog, so the rules
 * about when to prompt live here rather than in each page — otherwise the two
 * drift, which is how the old UI ended up hiding the password entry on exactly
 * the sessions where the server would have honoured it.
 *
 * Nothing here enforces anything: an admin who dismisses a prompt leaves the
 * session as it was. A `private` album with no password stays reachable by link,
 * which is what it has always done — these prompts make that state visible
 * rather than preventing it.
 */
export function useSessionPasswordFlow(args: {
  onSetVisibility: (
    session: PhotoSession,
    visibility: SessionVisibility
  ) => Promise<void>;
}) {
  /** The session whose password dialog is open. */
  const [passwordTarget, setPasswordTarget] = useState<PhotoSession | null>(null);
  /** The session a prompt is being shown for, and which prompt. */
  const [prompt, setPrompt] = useState<{
    session: PhotoSession;
    kind: SessionPasswordPrompt;
  } | null>(null);
  const [switching, setSwitching] = useState(false);

  /**
   * Whether the prompted session already has a password.
   *
   * Read for the prompt target only; `useGallerySettingsQuery` is disabled on an
   * empty id, so no request goes out while no prompt is pending.
   */
  const promptSettings = useGallerySettingsQuery(prompt?.session.id ?? "");

  /**
   * The admin asked to set a password.
   *
   * On a session whose visibility gates nothing, the password would be stored
   * and the album would still open for anyone — so the prompt comes first and
   * the dialog only opens once the visibility is switched.
   */
  const beginSetPassword = (session: PhotoSession) => {
    if (gatesWithPassword(session.visibility)) {
      setPasswordTarget(session);
      return;
    }
    setPrompt({ session, kind: "require-protected" });
  };

  /**
   * The admin switched a session to a gating visibility.
   *
   * The prompt opens without knowing yet whether a password is already set: the
   * table renders many rows and holds no gallery settings, so that answer is a
   * request away. It is asked for here — by naming this session as the prompt
   * target — and the dialog is withheld until it comes back, so a session that
   * already has a password never flashes a prompt it does not need.
   */
  const afterVisibilityChange = (
    session: PhotoSession,
    visibility: SessionVisibility
  ) => {
    if (!gatesWithPassword(visibility)) return;
    setPrompt({ session: { ...session, visibility }, kind: "offer-password" });
  };

  const confirmPrompt = async () => {
    if (!prompt) return;
    const { session, kind } = prompt;

    if (kind === "offer-password") {
      setPrompt(null);
      setPasswordTarget(session);
      return;
    }

    // `require-protected`: switch first, so the password the admin is about to
    // set is one the album will actually ask for.
    setSwitching(true);
    try {
      await args.onSetVisibility(session, "protected");
      setPrompt(null);
      setPasswordTarget({ ...session, visibility: "protected" });
    } finally {
      setSwitching(false);
    }
  };

  const promptHasPassword = Boolean(promptSettings.data?.passwordProtected);

  /**
   * The prompt to render, once it is known to be worth showing.
   *
   * An `offer-password` prompt is for a session with no password, so it waits
   * for the settings to load and drops entirely if one turns out to be set.
   * `require-protected` needs no such check — it is about the visibility, not
   * the password, and applies whether or not one exists.
   *
   * `isFetching`, not just `isPending`: these settings are cached per session,
   * so a session prompted about earlier in the same visit answers from cache
   * with `isPending` already false. Were that the only check, an admin who had
   * since *removed* the password would be judged against the stale `true` and
   * the prompt would be wrongly withheld. Waiting for the refetch to settle
   * costs a moment and keeps the answer current.
   */
  const promptSettled =
    !promptSettings.isPending && !promptSettings.isFetching;
  const visiblePrompt =
    prompt?.kind === "offer-password" && (!promptSettled || promptHasPassword)
      ? null
      : prompt;

  return {
    passwordTarget,
    closePasswordDialog: () => setPasswordTarget(null),
    prompt: visiblePrompt,
    promptLoading: switching,
    beginSetPassword,
    afterVisibilityChange,
    confirmPrompt,
    cancelPrompt: () => setPrompt(null)
  };
}
