import "react";

/**
 * Directory-picker attributes for `<input type="file">`.
 *
 * They are non-standard, so React's own types omit them, but a folder picker
 * needs one of them or the OS dialog stays in plain file mode — offering
 * "Open" on a folder rather than selecting it.
 *
 * Pass the string "true", not a boolean: React drops a bare `true` for unknown
 * attributes, and an empty string is unreliable across browsers.
 */
declare module "react" {
  // `T` is unused here but must stay to match React's own declaration.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
    mozdirectory?: string;
  }
}
