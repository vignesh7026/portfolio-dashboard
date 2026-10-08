/**
 * CHANGED (brief items 5, 7): the old footer was a five-line disclaimer
 * paragraph — the "scary warning banner" the brief explicitly asks to avoid.
 * That content wasn't wrong, just mis-placed: it's now a tooltip on the
 * header's status line (see Header.tsx), where it's one hover away instead
 * of unavoidable at the bottom of every page. What's left here is one calm
 * sentence — enough to not be hiding anything, not enough to feel nervous.
 */
export function Footer() {
  return (
    <footer className="mt-10 mb-6 border-t border-border pt-5 text-xs text-text-tertiary">
      <p>For personal tracking only — not a basis for trading decisions. Hover the status line above for sourcing details.</p>
    </footer>
  );
}
