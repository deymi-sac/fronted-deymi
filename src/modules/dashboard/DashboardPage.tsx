import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  obtenerServiciosDashboard,
  type Servicio,
} from "./dashboard.api";

// Paleta de marca: verde, azul y rojo
const COLOR_COMPLETADO = "#16a34a";
const COLOR_EN_PROCESO = "#2563eb";
const COLOR_CANCELADO = "#dc2626";
const COLOR_PENDIENTE = "#94a3b8";

const COLORES_ESTADO: Record<string, string> = {
  Completado: COLOR_COMPLETADO,
  "En proceso": COLOR_EN_PROCESO,
  Cancelado: COLOR_CANCELADO,
  Pendiente: COLOR_PENDIENTE,
};

const NOMBRES_MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// Registros de la semana (últimos 7 días) agrupados por estado, con % y total
function calcularRegistrosSemana(servicios: Servicio[]) {
  const hoy = new Date();
  const haceSieteDias = new Date(hoy);
  haceSieteDias.setDate(hoy.getDate() - 7);

  const serviciosSemana = servicios.filter((servicio) => {
    const fecha = new Date(servicio.fecha);
    return fecha >= haceSieteDias && fecha <= hoy;
  });

  const conteo = new Map<string, number>();
  for (const servicio of serviciosSemana) {
    const nombre = servicio.estados_servicio?.nombre_estado ?? "Sin estado";
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }

  const total = serviciosSemana.length;

  const datos = Array.from(conteo.entries()).map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
    porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
    color: COLORES_ESTADO[nombre] ?? "#cbd5e1",
  }));

  return { datos, total };
}

function esServicioTercero(servicio: Servicio): boolean {
  return servicio.unidades_terceros !== null;
}

// Servicios propios vs. terceros, comparados mes a mes (últimos 6 meses)
function calcularServiciosPropiosVsTercerosPorMes(servicios: Servicio[]) {
  const hoy = new Date();
  const meses: { clave: string; nombre: string; propios: number; terceros: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      clave: `${fecha.getFullYear()}-${fecha.getMonth()}`,
      nombre: NOMBRES_MESES[fecha.getMonth()],
      propios: 0,
      terceros: 0,
    });
  }

  for (const servicio of servicios) {
    const fecha = new Date(servicio.fecha);
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
    const mes = meses.find((m) => m.clave === clave);
    if (!mes) continue;

    if (esServicioTercero(servicio)) {
      mes.terceros++;
    } else {
      mes.propios++;
    }
  }

  return meses;
}

function obtenerPlaca(servicio: Servicio): string {
  if (servicio.unidades) {
    const placaPrincipal = servicio.unidades.uni_placa;
    const placaSecundaria = servicio.unidades.uni_placa_secundaria;

    return placaSecundaria
      ? `${placaPrincipal} / ${placaSecundaria}`
      : placaPrincipal;
  }

  if (servicio.unidades_terceros) {
    const placaPrincipal = servicio.unidades_terceros.unit_placa;
    const placaSecundaria =
      servicio.unidades_terceros.unit_placa_secundaria;

    return placaSecundaria
      ? `${placaPrincipal} / ${placaSecundaria}`
      : placaPrincipal;
  }

  return "Sin unidad";
}

function obtenerEstado(servicio: Servicio): string {
  return servicio.estados_servicio?.nombre_estado ?? "Sin estado";
}


function obtenerNombreConductorTercero(servicio: Servicio): string {
  const conductor =
    servicio.unidades_terceros?.conductores_terceros;

  if (!conductor) {
    return "Sin conductor";
  }

  return `${conductor.in_name} ${conductor.in_apellido}`;
}

function obtenerClaseEstado(estado: string): string {
  switch (estado) {
    case "En proceso":
      return "bg-blue-50 text-blue-700";

    case "Programado":
      return "bg-yellow-50 text-yellow-700";

    case "Finalizado":
      return "bg-green-50 text-green-700";

    case "Cancelado":
      return "bg-red-50 text-red-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

interface KpiCardProps {
  titulo: string;
  valor: number;
  descripcion: string;
  icono: React.ReactNode;
}

function KpiCard({
  titulo,
  valor,
  descripcion,
  icono,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {titulo}
          </p>

          <p className="mt-3 text-3xl font-bold text-[#18193B]">
            {valor}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {descripcion}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#18193B]/10 text-[#18193B]">
          {icono}
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${obtenerClaseEstado(
        estado
      )}`}
    >
      {estado}
    </span>
  );
}

function IconoServicios() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconoConductor() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconoUnidad() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function GraficoRegistrosSemana({
  datos,
  total,
}: {
  datos: ReturnType<typeof calcularRegistrosSemana>["datos"];
  total: number;
}) {
  if (datos.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
        Sin registros esta semana.
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="99%" height={260}>
        <PieChart>
          <Pie
            data={datos}
            dataKey="cantidad"
            nameKey="nombre"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            labelLine={false}
            isAnimationActive={false}
          >
            {datos.map((entrada) => (
              <Cell key={entrada.nombre} fill={entrada.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Total superpuesto en el centro de la dona (posicionado sobre el gráfico, no dentro de él) */}
      <div className="pointer-events-none absolute left-1/2 top-[108px] -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-3xl font-bold text-[#18193B]">{total}</p>
        <p className="text-[10px] font-semibold tracking-wide text-gray-400">TOTAL SEMANA</p>
      </div>
    </div>
  );
}

function GraficoServiciosPropiosVsTerceros({
  datos,
}: {
  datos: ReturnType<typeof calcularServiciosPropiosVsTercerosPorMes>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="propios" name="Propios" fill={COLOR_EN_PROCESO} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="terceros" name="Terceros" fill={COLOR_COMPLETADO} radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardPage() {
  const {
    data: servicios = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard", "servicios"],
    queryFn: obtenerServiciosDashboard,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-sm text-gray-500">
            Cargando información del dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            No se pudo cargar la información del dashboard.
          </p>

          <p className="mt-1 text-sm text-red-600">
            Verifica la conexión con el servidor.
          </p>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * KPIs
   * ==========================================
   */

  // Servicios cuyo estado actual es "En proceso"
  const serviciosEnProceso = servicios.filter(
    (servicio) =>
      servicio.estados_servicio?.nombre_estado === "En proceso"
  );

  /*
   * Conductores internos que actualmente
   * tienen una asignación activa.
   */
  const asignacionesActivas = servicios.flatMap(
    (servicio) => servicio.servicio_conductores
  );

  const conductoresAsignados = asignacionesActivas.filter(
    (asignacion) => asignacion.estado === "Activo"
  );

  /*
   * Evitamos contar dos veces al mismo conductor
   * si por alguna razón aparece en más de una asignación.
   */
  const conductoresAsignadosUnicos = new Map<
    number,
    typeof conductoresAsignados[number]
  >();

  for (const asignacion of conductoresAsignados) {
    conductoresAsignadosUnicos.set(
      asignacion.in_id_conductor,
      asignacion
    );
  }

  /*
   * Unidades asignadas.
   *
   * Se consideran las unidades vinculadas a servicios
   * que actualmente están en proceso.
   *
   * También evitamos duplicar una unidad.
   */
  const unidadesAsignadas = new Set<number>();

  for (const servicio of serviciosEnProceso) {
    if (servicio.unidades) {
      unidadesAsignadas.add(servicio.unidades.id_unidad);
    }

    if (servicio.unidades_terceros) {
      unidadesAsignadas.add(
        servicio.unidades_terceros.id_unit_terceros
      );
    }
  }

  /*
   * ==========================================
   * LISTA DE CONDUCTORES DEYMI
   * ==========================================
   *
   * Solo mostramos conductores internos que
   * tienen una asignación activa.
   */
  const ESTADOS_VISIBLES_DASHBOARD = ["Pendiente", "En proceso"];

  const conductoresDeymi = servicios
    .filter((servicio) =>
      ESTADOS_VISIBLES_DASHBOARD.includes(
        servicio.estados_servicio?.nombre_estado ?? ""
      )
    )
    .flatMap((servicio) => {
      const asignaciones = servicio.servicio_conductores.filter(
        (asignacion) => asignacion.estado === "Activo"
      );

      return asignaciones.map((asignacion) => ({
        id: asignacion.id_asignacion,
        conductor: `${asignacion.conductores_interno.in_name} ${asignacion.conductores_interno.in_apellido}`,
        servicio: servicio.referencia ?? `Servicio #${servicio.id_service}`,
        unidad: obtenerPlaca(servicio),
        estado: obtenerEstado(servicio),
      }));
    });

  /*
   * ==========================================
   * SERVICIOS TERCERIZADOS
   * ==========================================
   *
   * Son servicios que tienen una unidad de terceros
   * y cuyo estado actual es "En proceso".
   */
  const serviciosTercerizados = servicios.filter(
    (servicio) =>
      servicio.unidades_terceros !== null &&
      servicio.estados_servicio?.nombre_estado === "En proceso"
  );

  return (
    <div className="space-y-8 p-8">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-semibold text-[#18193B]">
          Dashboard
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Resumen general de operaciones
        </p>
      </div>

      {/* ============================= */}
      {/* KPIs */}
      {/* ============================= */}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard
          titulo="Servicios en proceso"
          valor={serviciosEnProceso.length}
          descripcion="Servicios actualmente en operación"
          icono={<IconoServicios />}
        />

        <KpiCard
          titulo="Conductores asignados"
          valor={conductoresAsignadosUnicos.size}
          descripcion="Conductores con servicio activo"
          icono={<IconoConductor />}
        />

        <KpiCard
          titulo="Unidades asignadas"
          valor={unidadesAsignadas.size}
          descripcion="Unidades vinculadas a servicios"
          icono={<IconoUnidad />}
        />
      </section>

      {/* ============================= */}
      {/* GRÁFICOS */}
      {/* ============================= */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#18193B]">Registros de la semana</h3>
          <p className="mt-1 text-sm text-gray-500">Servicios de los últimos 7 días, por estado</p>
          <GraficoRegistrosSemana {...calcularRegistrosSemana(servicios)} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#18193B]">Servicios propios vs. terceros por mes</h3>
          <p className="mt-1 text-sm text-gray-500">Comparativo de los últimos 6 meses</p>
          <GraficoServiciosPropiosVsTerceros datos={calcularServiciosPropiosVsTercerosPorMes(servicios)} />
        </div>
      </section>

      {/* ============================= */}
      {/* LISTAS */}
      {/* ============================= */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Conductores Deymi */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-base font-semibold text-[#18193B]">
              Conductores Deymi
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Conductores actualmente asignados a servicios
            </p>
          </div>

          {conductoresDeymi.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">
                No hay conductores asignados actualmente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Conductor
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Servicio
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Unidad
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {conductoresDeymi.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">
                          {item.conductor}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {item.servicio}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {item.unidad}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <EstadoBadge estado={item.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Servicios tercerizados */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-base font-semibold text-[#18193B]">
              Servicios tercerizados activos
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Servicios tercerizados actualmente en operación
            </p>
          </div>

          {serviciosTercerizados.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">
                No hay servicios tercerizados activos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Servicio
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Cliente
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Unidad
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Conductor
                    </th>

                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serviciosTercerizados.map((servicio) => (
                    <tr
                      key={servicio.id_service}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">
                          {servicio.referencia ??
                            `Servicio #${servicio.id_service}`}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {servicio.cliente ?? "Sin cliente"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {obtenerPlaca(servicio)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {obtenerNombreConductorTercero(servicio)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <EstadoBadge
                          estado={obtenerEstado(servicio)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;