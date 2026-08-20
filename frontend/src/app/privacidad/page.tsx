import type { Metadata } from "next"
import Link from "next/link"
import {
  Shield,
  Lock,
  MapPin,
  Camera,
  Server,
  Trash2,
  Mail,
  Building2,
  FileCheck,
  Globe2,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Política de Privacidad y Tratamiento de Datos Personales | Tec360",
  description:
    "Política integral de tratamiento de datos personales de TrackTec S.A.S. para la plataforma Tec360 Seguridad. Cumplimiento Ley 1581 de 2012, Decreto 1377 de 2013 y directrices de Google Play Store.",
}

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            Habeas Data &amp; Protección de Datos
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Política de Privacidad y Tratamiento de Datos Personales
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            <strong>TrackTec S.A.S.</strong> • Plataforma <strong>Tec360 Seguridad</strong>
            <br />
            En estricto cumplimiento de la Ley 1581 de 2012, Decreto 1377 de 2013 y normatividad concordante de la República de Colombia.
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
              <h2 className="text-lg font-bold text-white">1. Identificación del Responsable del Tratamiento</h2>
              <p>
                El Responsable del Tratamiento de sus datos personales es la sociedad comercial <strong>TrackTec S.A.S.</strong>, persona jurídica constituida bajo las leyes de la República de Colombia (Ley 1258 de 2008), titular y operadora de la plataforma tecnológica <strong>Tec360</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs sm:text-sm text-slate-300">
                <div><strong>Razón Social:</strong> TrackTec S.A.S.</div>
                <div><strong>Signo Distintivo / App:</strong> Tec360 Seguridad</div>
                <div><strong>Domicilio Principal:</strong> Medellín, Antioquia, Colombia</div>
                <div><strong>Actividad Económica:</strong> CIIU 6209A (Intermediación TIC)</div>
                <div><strong>Correo Oficial / PQR:</strong> <a href="mailto:contacto@tec-360.tech" className="text-violet-400 hover:underline">contacto@tec-360.tech</a></div>
                <div><strong>Portal Web Oficial:</strong> <a href="https://tec-360.tech" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">https://tec-360.tech</a></div>
              </div>
            </div>
          </div>
        </div>

        {/* Secciones de Contenido */}
        <div className="space-y-8 text-sm sm:text-base text-slate-300 leading-relaxed">
          {/* Sección 2: Marco Legal */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <FileCheck className="w-5 h-5 text-violet-400" />
              <h2>2. Marco Normativo y Principios Rectores</h2>
            </div>
            <p>
              El tratamiento de datos personales ejecutado por TrackTec S.A.S. se rige por la Constitución Política de Colombia (art. 15), la Ley Estatutaria 1581 de 2012, el Decreto Reglamentario 1377 de 2013 (compilado en el Decreto Único 1074 de 2015), la Circular Única de la Superintendencia de Industria y Comercio (SIC) y la Ley 2300 de 2023.
            </p>
            <p>
              Aplicamos rigurosamente los principios de <strong>legalidad, finalidad, libertad, veracidad o calidad, transparencia, acceso y circulación restringida, seguridad y confidencialidad</strong>.
            </p>
          </section>

          {/* Sección 3: Matriz de Datos Recopilados */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 font-bold text-lg text-white">
              <Lock className="w-5 h-5 text-violet-400" />
              <h2>3. Matriz de Datos Personales Recopilados y Finalidades</h2>
            </div>
            <p>
              Recopilamos únicamente los datos necesarios y proporcionales para la operación del portal de contacto y la intermediación de servicios técnicos automotrices:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="p-3">Categoría de Titular</th>
                    <th className="p-3">Datos Recopilados</th>
                    <th className="p-3">Finalidad Explícita</th>
                    <th className="p-3">Clasificación Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 font-medium text-white">Clientes</td>
                    <td className="p-3">Nombre, teléfono celular, correo electrónico.</td>
                    <td className="p-3">Autenticación OTP (2FA), gestión de solicitudes, emisión de recibos y soporte.</td>
                    <td className="p-3 text-violet-300">Dato Personal General</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Clientes</td>
                    <td className="p-3">Ubicación GPS, dirección del servicio.</td>
                    <td className="p-3">Geolocalización para emparejamiento con técnicos cercanos y cálculo de rutas.</td>
                    <td className="p-3 text-violet-300">Dato Privado / Localización</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Clientes</td>
                    <td className="p-3">Placa, modelo, marca y fotos del vehículo.</td>
                    <td className="p-3">Identificación del automotor para instalación de dispositivos GPS/alarmas.</td>
                    <td className="p-3 text-violet-300">Dato Privado / Patrimonial</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Técnicos</td>
                    <td className="p-3">Foto frontal y reverso de la Cédula de Ciudadanía, selfie/avatar.</td>
                    <td className="p-3">Verificación de identidad, prevención de fraude y validación ante el consumidor.</td>
                    <td className="p-3 text-amber-300">Dato Sensible / Biométrico</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Técnicos</td>
                    <td className="p-3">Certificados técnicos SENA, test de conocimiento, años de experiencia.</td>
                    <td className="p-3">Acreditación objetiva de idoneidad y estándares de seguridad comunitaria.</td>
                    <td className="p-3 text-violet-300">Dato Personal General</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Técnicos</td>
                    <td className="p-3">Ubicación GPS en tiempo real durante servicios activos.</td>
                    <td className="p-3">Telemetría de ruta para informar al cliente la hora estimada de arribo (ETA).</td>
                    <td className="p-3 text-amber-300">Dato Sensible / Rastreo</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Ambas Partes</td>
                    <td className="p-3">Auditoría fotográfica: antes, durante y después del trabajo.</td>
                    <td className="p-3">Soporte probatorio de garantía, control de calidad y resolución de PQR/SIC.</td>
                    <td className="p-3 text-violet-300">Dato Privado / Evidenciario</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Tratamiento de Datos Sensibles:</strong> El suministro de documentos de identidad con fotografía y datos biométricos es facultativo; no obstante, su omisión impedirá el alta y habilitación operativa del perfil técnico en el marketplace debido a las exigencias de seguridad comunitaria y del Estatuto del Consumidor (art. 53, Ley 1480).
              </p>
            </div>
          </section>

          {/* Sección 4: Telemetría y Geolocalización */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <MapPin className="w-5 h-5 text-violet-400" />
              <h2>4. Políticas Específicas de Ubicación y Rastreo GPS</h2>
            </div>
            <p>
              Tec360 utiliza geolocalización bajo estrictos parámetros funcionales:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>
                <strong>Clientes:</strong> La app solicita coordenadas exclusivamente al cotizar o programar un servicio para ubicar el punto de atención.
              </li>
              <li>
                <strong>Técnicos (En ruta):</strong> La telemetría en tiempo real se activa <em>únicamente</em> cuando el técnico marca el servicio en estado &ldquo;En camino&rdquo; y cesa automáticamente al llegar al destino o finalizar el servicio. No realizamos rastreo pasivo fuera de servicios asignados.
              </li>
            </ul>
          </section>

          {/* Sección 5: Transmisión y Transferencia Internacional */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Globe2 className="w-5 h-5 text-violet-400" />
              <h2>5. Transmisión y Transferencia Internacional de Datos</h2>
            </div>
            <p>
              Para garantizar la disponibilidad continua, seguridad y escalabilidad de la infraestructura, TrackTec S.A.S. realiza transferencias y transmisiones de datos a proveedores internacionales de primer nivel ubicados en los Estados Unidos de América:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white">DigitalOcean LLC (Región NYC3)</div>
                <div className="text-slate-400 mt-1">Alojamiento de servidores backend (FastAPI), bases de datos PostgreSQL/PostGIS y almacenamiento S3/Spaces.</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white">Twilio Inc. (EE.UU.)</div>
                <div className="text-slate-400 mt-1">Transmisión de números telefónicos para el despacho seguro de códigos OTP de autenticación SMS.</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white">Google LLC (Google Maps API)</div>
                <div className="text-slate-400 mt-1">Geocodificación inversa, cálculo de distancias y visualización de mapas en tiempo real.</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white">650 Industries Inc. (Expo EAS)</div>
                <div className="text-slate-400 mt-1">Entorno de compilación, empaquetamiento y entrega de actualizaciones para aplicaciones móviles.</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-2">
              Al aceptar esta política, el titular otorga su autorización expresa e inequívoca para la transferencia internacional de sus datos conforme al Título VIII de la Ley 1581 de 2012.
            </p>
          </section>

          {/* Sección 6: Derechos de los Titulares y Procedimiento PQR */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <UserCheck className="w-5 h-5 text-violet-400" />
              <h2>6. Derechos de los Titulares y Canales de Atención (Habeas Data)</h2>
            </div>
            <p>
              Como titular de los datos personales, usted tiene derecho a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>Conocer, actualizar y rectificar sus datos personales frente a TrackTec S.A.S.</li>
              <li>Solicitar prueba de la autorización otorgada.</li>
              <li>Ser informado sobre el uso que se ha dado a sus datos personales.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
              <li>Revocar la autorización o solicitar la supresión del dato cuando no medie un deber legal o contractual de permanencia.</li>
              <li>Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento.</li>
            </ul>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold text-white">Procedimiento para el Ejercicio de Derechos (Consultas y Reclamos):</h3>
              <p>
                Los titulares pueden enviar su solicitud a <strong>contacto@tec-360.tech</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong>Consultas:</strong> Serán atendidas en un término máximo de diez (10) días hábiles contados a partir de la fecha de recibo.</li>
                <li><strong>Reclamos (Actualización, Supresión o Revocatoria):</strong> Serán atendidos en un término máximo de quince (15) días hábiles. Si el reclamo resulta incompleto, se requerirá al interesado dentro de los cinco (5) días siguientes para que subsane.</li>
              </ul>
            </div>
          </section>

          {/* Sección 7: Eliminación de Cuenta y Google Play Data Safety */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-red-400 font-bold text-lg text-white">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h2>7. Supresión de Datos y Eliminación de Cuenta (Google Play Data Safety)</h2>
            </div>
            <p>
              En estricto cumplimiento de las políticas de Google Play Store y el principio de libertad de la Ley 1581, cualquier usuario puede solicitar en cualquier momento la eliminación definitiva de su cuenta:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">📱 Desde la Aplicación Móvil</div>
                <div className="text-slate-400">Ingresa a <em>Ajustes &gt; Eliminar Cuenta</em> y confirma la acción destructiva inmediata.</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">🌐 Desde el Portal Web Público</div>
                <div className="text-slate-400">
                  Accede a nuestro formulario oficial en:{" "}
                  <Link href="/eliminar-cuenta" className="text-violet-400 hover:underline">
                    https://tec-360.tech/eliminar-cuenta
                  </Link>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Al procesar la eliminación, se procederá a la anonimización y borrado de números de teléfono, nombres, correos y fotos, conservando únicamente aquellos registros requeridos por obligaciones tributarias (DIAN) o resolución de controversias legales preexistentes.
            </p>
          </section>

          {/* Sección 8: Ley 2300 de 2023 */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Clock className="w-5 h-5 text-violet-400" />
              <h2>8. Comunicaciones y Cumplimiento Ley 2300 de 2023 (&ldquo;Dejen de Fregar&rdquo;)</h2>
            </div>
            <p>
              TrackTec S.A.S. diferencia estrictamente los canales de comunicación:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong>Mensajes Transaccionales y de Seguridad:</strong> Códigos OTP, alertas de llegada de técnicos y estados de servicios activos operan las 24 horas por tratarse de la ejecución directa del contrato de intermediación.
              </li>
              <li>
                <strong>Mensajes Comerciales o Publicitarios:</strong> Solo se enviarán previa autorización expresa y se limitarán estrictamente a los horarios hábiles autorizados por la ley (Lunes a Viernes de 7:00 a.m. a 7:00 p.m., y Sábados de 8:00 a.m. a 3:00 p.m.).
              </li>
            </ul>
          </section>

          {/* Sección 9: Seguridad de la Información */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3 text-violet-400 font-bold text-lg text-white">
              <Server className="w-5 h-5 text-violet-400" />
              <h2>9. Medidas de Seguridad de la Información</h2>
            </div>
            <p>
              TrackTec S.A.S. implementa protocolos técnicos, humanos y administrativos de seguridad para prevenir la adulteración, pérdida, consulta, uso o acceso no autorizado a los datos personales:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300 pt-2">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">Cifrado TLS 1.3 / HTTPS</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">Tokens JWT Seguros</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">Hashing Bcrypt</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">SecureStore en App Móvil</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">Rate Limiting Anti-DDoS</div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">Aislamiento en Contenedores</div>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>
            © {new Date().getFullYear()} TrackTec S.A.S. — Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-4 text-slate-400">
            <Link href="/terminos" className="hover:text-violet-400 underline">Términos y Condiciones</Link>
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
