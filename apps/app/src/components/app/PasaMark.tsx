interface PasaMarkProps {
  className?: string;
  /** Draw the rounded coral tile behind the glyph. */
  tile?: boolean;
}

/**
 * The Pásalo Pa'lante "P" mark — a stem with a forward-leaning bowl,
 * reading as both a P and an arrow passing something along.
 */
export default function PasaMark({ className, tile = true }: PasaMarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pásalo Pa'lante">
      {tile && <rect width="64" height="64" rx="16" className="fill-app-coral" />}
      <path
        d="M20 14h15.5c7.8 0 13 4.8 13 11.9 0 7.4-5.6 12.1-14.2 12.1H27v12H20V14Zm7 6.3v11.4h6.6c4.5 0 7.4-2.2 7.4-5.8 0-3.5-2.7-5.6-7.2-5.6H27Z"
        className={tile ? "fill-app-surface" : "fill-app-coral"}
      />
    </svg>
  );
}
