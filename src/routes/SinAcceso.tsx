/** Para un usuario cuyo rol no da acceso a ninguna pantalla: evita redirigir en círculo. */
export function SinAcceso() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-xl font-semibold text-gray-800">Sin acceso</h1>
      <p className="mt-2 text-sm text-gray-600">Tu rol no tiene pantallas habilitadas. Pide a un administrador que te asigne los permisos que necesitas.</p>
    </div>
  );
}
