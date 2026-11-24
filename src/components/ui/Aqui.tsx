/** Etiqueta "👉 Aquí" junto al botón que toca pulsar. */
export function Aqui({ className = "" }: { className?: string }) {
  return (
    <span className={`aqui-etiqueta inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950 shadow ${className}`}>
      👉 Aquí
    </span>
  );
}
