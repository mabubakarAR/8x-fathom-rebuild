/** Maps a highlight category's colour name onto a theme token that exists.
 *  Lives outside any "use client" module so server components can call it. */
export function mapTone(color: string): string {
  switch (color) {
    case "emerald":
      return "ok";
    case "rose":
      return "danger";
    case "amber":
      return "warn";
    case "sky":
      return "accent";
    case "violet":
    case "fuchsia":
      return "violet";
    default:
      return "accent";
  }
}
