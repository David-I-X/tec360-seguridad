import type { Metadata } from "next"
import Link from "next/link"
import {
  Scale,
  Building2,
  ShieldCheck,
  Wrench,
  Camera,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Clock,
  Gavel,
  FileText,
  UserCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Términos y Condiciones de Uso | Tec360",
  description:
    "Términos y condiciones de uso y contratación de la plataforma tecnológica Tec360, operada por TrackTec S.A.S. en Colombia. Marco legal Ley 1480 de 2011 y Ley 527 de 1999.",
}

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            Contrato de Adhesión &amp; Términos de Servicio
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Plataforma <strong>Tec360 Seguridad</strong> • Operada por <strong>TrackTec S.A.S.</strong>
            <br />
            En cumplimiento de la Ley 1480 de 2011 (Estatuto del Consumidor), Ley 527 de 1999 (Comercio Electrónico) y legislación mercantil colombiana.
          </p>
          <div className="text-xs text-slate-500">
            Última actualización: 19 de Agosto de 2026 • Vigencia: Indefinida
          </div>
        </div>

        {/* Banner Identificación Corporativa */}
        <div className="bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-900 border border-violet-800/30 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Building2 className="w-7 h-7 text-violet-400 flex-shrink-0 mt-1" />
            <div className="space-y-2 text-sm sm:text-base text-slate-300">
              <h2 className="text-lg font-bold text-white">1. Identificación de las Partes y Titularidad</h2>
              <p>
                Los presentes Términos y Condiciones regulan el acceso, navegación y uso de la plataforma tecnológica <strong>Tec360</strong> (sitio web <a href="https://tec-360.tech" className="text-violet-400 underline">https://tec-360.tech</a> y aplicaciones móviles para Android e iOS), de propiedad exclusiva de <strong>TrackTec S.A.S.</strong>, sociedad comercial constituida bajo las leyes colombianas (Ley 1258 de 2008), con domicilio principal en el Distrito Especial de Ciencia, Tecnología e Innovación de Medellín, Antioquia, Colombia.
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Al crear una cuenta, interactuar o solicitar/aceptar un servicio a través de Tec360, el usuario (en adelante &ldquo;Cliente&rdquo;, &ldquo;Técnico&rdquo; o &ldquo;Usuario&rdquo;) declara ser mayor de 18 años de edad, poseer plena capacidad jurídica para obligarse y aceptar sin reserva alguna el presente contrato de adhesión digital (art. 14, Ley 527 de 1999).
              </p>
            </div>
          </div>
        </div>

        {/* Secciones de Contenido */}
        <div className="space-y-8 text-sm sm:text-base text-slate-300 leading-relaxed">
          {/* Sección 2: Naturaleza Operativa - Portal de Contacto */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <h2>2. Calificación Operativa: Portal de Contacto (Art. 53, Ley 1480 de 2011)</h2>
            </div>
            <p>
              En estricto apego al <strong>artículo 53 de la Ley 1480 de 2011</strong> y a la doctrina vinculante de la Superintendencia de Industria y Comercio (SIC), <strong>Tec360 opera y califica jurídicamente como un &ldquo;Portal de Contacto&rdquo;</strong> e intermediario telemático (SaaS).
            </p>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs sm:text-sm">
              <p className="text-slate-300">
                <strong>Delimitación Expresa de Roles:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li>
                  <strong>TrackTec S.A.S.:</strong> Provee exclusivamente la infraestructura digital, el software de emparejamiento geográfico, el sistema de cotizaciones telemáticas y la pasarela tecnológica.
                </li>
                <li>
                  <strong>El Técnico Instalador:</strong> Es un profesional o contratista independiente que ofrece y ejecuta materialmente los servicios de instalación, revisión o mantenimiento de GPS, alarmas y cámaras bajo su propia autonomía técnica y directiva.
                </li>
                <li>
                  <strong>Contrato Autónomo:</strong> La relación contractual sustantiva de prestación de servicios técnicos automotrices se suscribe y perfecciona <strong>de manera directa y exclusiva entre el Cliente y el Técnico</strong>. TrackTec S.A.S. no es parte de dicho contrato técnico ni asume responsabilidad solidaria por vicios ocultos de mano de obra o componentes físicos no provistos por la sociedad.
                </li>
              </ul>
            </div>
          </section>

          {/* Sección 3: Régimen Laboral de Técnicos Independientes */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <UserCheck className="w-5 h-5 text-violet-400" />
              <h2>3. Naturaleza Jurídica y Autonomía de los Técnicos</h2>
            </div>
            <p>
              Los Técnicos registrados en Tec360 son profesionales autónomos que actúan como contratistas independientes. <strong>No existe relación laboral, vínculo de subordinación continuada ni contrato de trabajo</strong> entre TrackTec S.A.S. y los Técnicos (art. 23, Código Sustantivo del Trabajo).
            </p>
            <p>
              Los filtros de admisión (validación de Cédula de Ciudadanía, certificados técnicos del SENA o entidades afines, y cuestionarios de competencia) constituyen <strong>estándares objetivos de seguridad comunitaria y control de calidad del marketplace</strong>, y bajo ninguna circunstancia configuran directrices de carácter patronal o subordinante. Los técnicos eligen con total libertad su disponibilidad horaria, zona de cobertura y aceptación o rechazo de solicitudes.
            </p>
          </section>

          {/* Sección 4: Modelo Económico y Facturación */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Wallet className="w-5 h-5 text-violet-400" />
              <h2>4. Modelo Económico, Billetera Virtual y Facturación Fiscal</h2>
            </div>
            <p>
              El funcionamiento del marketplace se estructura bajo el siguiente esquema económico y tributario:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <h3 className="font-bold text-white">💼 Billetera Digital &amp; Comisión Tecnológica</h3>
                <p className="text-slate-400">
                  El Técnico mantiene un saldo prepagado en su billetera virtual interna. Por cada servicio aceptado y completado a través de la plataforma, el sistema debita automáticamente una <strong>comisión por intermediación tecnológica del 18%</strong> sobre el valor acordado.
                </p>
              </div>
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <h3 className="font-bold text-white">🧾 Facturación Electrónica DIAN</h3>
                <p className="text-slate-400">
                  TrackTec S.A.S. emite la <strong>Factura Electrónica de Venta correspondiente única y exclusivamente al valor de la comisión tecnológica del 18%</strong>, liquidando el IVA correspondiente (19% sobre la comisión) bajo el Régimen Simple de Tributación (RST - Responsabilidad 47) y código de actividad CIIU 6209A.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 5: Protocolo Obligatorio de Auditoría Fotográfica */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Camera className="w-5 h-5 text-violet-400" />
              <h2>5. Protocolo de Auditoría Fotográfica y Respaldo Probatorio</h2>
            </div>
            <p>
              Para garantizar la transparencia técnica y constituir acervo probatorio ante eventuales controversias o quejas ante la Superintendencia de Industria y Comercio (SIC), la aplicación exige el registro fotográfico en tres fases obligatorias:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-center pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="font-bold text-violet-400 mb-1">1. Pre-Servicio (Antes)</div>
                <div className="text-slate-400">Estado inicial del automotor, tablero, luces y condiciones preexistentes.</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="font-bold text-violet-400 mb-1">2. Instalación (Durante)</div>
                <div className="text-slate-400">Conexión técnica de cableado, ubicación del dispositivo y protecciones.</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="font-bold text-violet-400 mb-1">3. Cierre (Después)</div>
                <div className="text-slate-400">Prueba de funcionamiento en plataforma, encendido y entrega del vehículo.</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-2">
              El usuario y el técnico otorgan a TrackTec S.A.S. una licencia de uso perpetua, gratuita y no exclusiva sobre estas fotografías exclusivamente para fines de auditoría, control de calidad y defensa jurídica en procesos de consumo o judiciales.
            </p>
          </section>

          {/* Sección 6: Garantías y Derecho de Retracto */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Wrench className="w-5 h-5 text-violet-400" />
              <h2>6. Régimen de Garantías y Derecho de Retracto (Art. 47, Ley 1480)</h2>
            </div>
            <div className="space-y-3">
              <p>
                <strong>Alcance de la Garantía:</strong> TrackTec S.A.S. garantiza la operatividad técnica del software y la infraestructura digital. La garantía sobre la idoneidad técnica de la instalación mecánica o eléctrica y de los componentes físicos instalados es asumida directamente por el Técnico y/o el fabricante del dispositivo según los términos acordados entre las partes.
              </p>
              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-800/30 text-xs sm:text-sm space-y-2">
                <h3 className="font-bold text-white">Excepción Legal al Derecho de Retracto:</h3>
                <p className="text-slate-300">
                  De conformidad con el <strong>numeral 1 del artículo 47 de la Ley 1480 de 2011</strong>, el Derecho de Retracto no es aplicable a contratos de prestación de servicios cuya ejecución material haya comenzado con el consentimiento expreso del consumidor.
                </p>
                <p className="text-slate-400">
                  En consecuencia, una vez que el Técnico arribe a la ubicación y el Cliente autorice verbal o digitalmente el inicio de los trabajos en el automotor, el derecho de retracto cesa de pleno derecho, quedando el servicio sujeto a los procedimientos ordinarios de garantía.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 7: Reversión del Pago */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <RotateCcw className="w-5 h-5 text-violet-400" />
              <h2>7. Procedimiento de Reversión del Pago (Art. 51, Ley 1480 y Decreto 587 de 2016)</h2>
            </div>
            <p>
              Cuando las transacciones se realicen mediante mecanismos de comercio electrónico directo y pasarelas de pago integradas, el consumidor podrá solicitar la reversión en los eventos taxativos del Decreto 587 de 2016 (fraude, operación no autorizada, servicio no prestado o defectuoso):
            </p>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>
                  <strong>Término de Notificación:</strong> El Cliente debe presentar la queja formal dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la fecha en que tuvo conocimiento del hecho, radicándola al correo <a href="mailto:contacto@tec-360.tech" className="text-violet-400 underline">contacto@tec-360.tech</a> y notificando al emisor de su instrumento de pago.
                </li>
                <li>
                  <strong>Término de Respuesta:</strong> La plataforma y las entidades financieras coordinarán la reversión en un plazo máximo de <strong>quince (15) días hábiles</strong>.
                </li>
                <li>
                  <strong>Sanción por Mala Fe:</strong> Se advierte expresamente que el artículo 51 de la Ley 1480 faculta a la SIC a imponer <strong>multas administrativas de hasta 50 SMLMV</strong> a quienes soliciten reversiones de mala fe de servicios efectivamente prestados y conformes.
                </li>
              </ul>
            </div>
          </section>

          {/* Sección 8: Régimen de Cancelaciones y Penalidades */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <AlertTriangle className="w-5 h-5 text-violet-400" />
              <h2>8. Cancelaciones, Penalidades y Suspensión de Cuentas</h2>
            </div>
            <p>
              A fin de salvaguardar el equilibrio económico y la seriedad operativa del marketplace:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="p-3">Causal de Infracción</th>
                    <th className="p-3">Sujeto</th>
                    <th className="p-3">Consecuencia Contractual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3">Cancelación de servicio cuando el técnico ya se encuentra en ruta.</td>
                    <td className="p-3 font-medium text-white">Cliente</td>
                    <td className="p-3 text-slate-300">Cobro del cargo logístico de desplazamiento a favor del instalador.</td>
                  </tr>
                  <tr>
                    <td className="p-3">Cancelaciones reiteradas o injustificadas tras haber aceptado solicitudes.</td>
                    <td className="p-3 font-medium text-white">Técnico</td>
                    <td className="p-3 text-amber-300">Descuento de 15 puntos de reputación y suspensión por 24 horas.</td>
                  </tr>
                  <tr>
                    <td className="p-3">Adulteración de documentos, certificados SENA o antecedentes.</td>
                    <td className="p-3 font-medium text-white">Técnico</td>
                    <td className="p-3 text-red-400 font-bold">Expulsión definitiva y reporte penal a autoridades judiciales.</td>
                  </tr>
                  <tr>
                    <td className="p-3">Calificación promedio sostenida inferior al estándar mínimo de calidad.</td>
                    <td className="p-3 font-medium text-white">Técnico</td>
                    <td className="p-3 text-amber-300">Inhabilitación temporal sujeta a reevaluación técnica.</td>
                  </tr>
                  <tr>
                    <td className="p-3">Uso abusivo de contracargos o solicitudes fraudulentas de reversión.</td>
                    <td className="p-3 font-medium text-white">Cliente</td>
                    <td className="p-3 text-red-400">Cancelación de cuenta y cobro de los perjuicios ocasionados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Sección 9: Propiedad Intelectual */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <FileText className="w-5 h-5 text-violet-400" />
              <h2>9. Propiedad Intelectual</h2>
            </div>
            <p>
              Todos los derechos de propiedad intelectual e industrial sobre la plataforma Tec360 —incluyendo código fuente, código objeto, interfaces de usuario, arquitectura de bases de datos, algoritmos de emparejamiento, diseños, logotipos y la marca comercial Tec360 (Clases 35 y 42 de Niza)— son de titularidad exclusiva de <strong>TrackTec S.A.S.</strong> Queda estrictamente prohibida su reproducción, ingeniería inversa o explotación comercial no autorizada.
            </p>
          </section>

          {/* Sección 10: Ley Aplicable y Jurisdicción */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Gavel className="w-5 h-5 text-violet-400" />
              <h2>10. Solución de Controversias, Ley Aplicable y Jurisdicción</h2>
            </div>
            <p>
              Estos Términos y Condiciones se rigen e interpretan conforme a las leyes de la República de Colombia.
            </p>
            <p>
              En caso de controversias derivadas del uso de la plataforma o de la intermediación telemática, las partes acuerdan agotar una etapa previa de arreglo directo y mediación formal a través del correo <strong>contacto@tec-360.tech</strong> durante un término de quince (15) días hábiles.
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              De no llegarse a un acuerdo, las partes se someten de manera expresa a la jurisdicción ordinaria de los jueces de la República de Colombia y a las facultades administrativas de protección al consumidor de la Superintendencia de Industria y Comercio (SIC), fijando como domicilio contractual exclusivo la ciudad de <strong>Medellín, Antioquia</strong>.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>
            © {new Date().getFullYear()} TrackTec S.A.S. — Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-4 text-slate-400">
            <Link href="/privacidad" className="hover:text-violet-400 underline">Política de Privacidad</Link>
            <span>•</span>
            <Link href="/eliminar-cuenta" className="hover:text-violet-400 underline">Eliminar Cuenta</Link>
            <span>•</span>
            <a href="mailto:contacto@tec-360.tech" className="hover:text-violet-400 underline">contacto@tec-360.tech</a>
          </div>
        </div>
      </div>
    </main>
  )
}
