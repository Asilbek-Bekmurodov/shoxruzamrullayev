/* Ambient background: two slow-drifting indigo blobs + a faint dot grid,
   tuned to the warm-paper palette. Fixed, non-interactive, sits behind
   everything. Motion is paused via the prefers-reduced-motion block in CSS. */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="backdrop-grain" />
      <span className="blob blob-a" />
      <span className="blob blob-b" />
    </div>
  );
}
