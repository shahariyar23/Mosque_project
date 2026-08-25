/**
 * A URL-safe slug for a fund or campaign name, matching the pattern the `slug` DTO field validates
 * against (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
 *
 * The name is lowercased, whitespace and punctuation collapse to single hyphens, and leading or
 * trailing separators are trimmed. A name that is already a slug is unchanged, so a client can send
 * its own slug and this only does something when it wants one derived.
 *
 * There is no transliteration here: the spec's examples are Latin-script, a Bengali- or Arabic-only
 * name has no obvious Latin spelling, and inventing one would be a choice with no source to point at.
 * A caller that needs a slug from such a name supplies it explicitly.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
