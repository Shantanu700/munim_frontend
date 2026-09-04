import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge can't see the CSS-first `--text-*` scale, so it reads
 * `text-body` / `text-eyebrow` / … as text *colours* and drops any real colour
 * class merged alongside them (that is how `text-secondary-foreground` used to
 * vanish off `<Button className="text-body">`). Registering the scale as
 * font-sizes fixes it for every caller.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "eyebrow",
            "meta",
            "dense",
            "body",
            "table-head",
            "card-title",
            "panel",
            "section",
            "headline",
            "page-title",
            "display",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
