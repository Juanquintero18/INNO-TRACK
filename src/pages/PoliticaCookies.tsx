/**
 * Politica de cookies de INNO-TRACK.
 *
 * La tabla debe reflejar lo que el sistema guarda realmente en el navegador.
 * Si se agrega analitica, un nuevo dato en localStorage o una cookie, hay que
 * actualizarla.
 */
import { LegalPage, LegalSection } from '@/components/LegalPage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LEGAL_INFO } from '@/lib/legal-info';

const storedItems = [
  {
    name: 'inno_track_access_token',
    type: 'Almacenamiento local del navegador',
    purpose: 'Mantener tu sesión iniciada mientras usas el sistema.',
    duration: 'Se borra al cerrar sesión. Deja de ser válido a las 8 horas.',
  },
  {
    name: 'sessionid',
    type: 'Cookie propia',
    purpose: 'Mantener la sesión en el panel técnico de administración, que solo usa el personal de soporte.',
    duration: '2 semanas',
  },
  {
    name: 'csrftoken',
    type: 'Cookie propia',
    purpose: 'Proteger los formularios del panel técnico de administración contra envíos falsificados.',
    duration: '1 año',
  },
];

export default function PoliticaCookies() {
  return (
    <LegalPage
      title="Política de cookies"
      intro={
        <p>
          Esta política explica qué información guarda INNO-TRACK en tu navegador y para qué. En resumen: solo guardamos
          lo necesario para que puedas iniciar sesión. No usamos cookies de publicidad ni de seguimiento.
        </p>
      }
    >
      <LegalSection title="1. Qué son las cookies y el almacenamiento local">
        <p>
          Una <strong>cookie</strong> es un dato pequeño que un sitio web guarda en tu navegador y que el navegador
          envía de vuelta en cada visita. El <strong>almacenamiento local</strong> cumple una función parecida: guarda
          datos en tu navegador, pero el sitio los lee solo cuando los necesita.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué guarda INNO-TRACK en tu navegador">
        <p>
          Al usar la aplicación con tu cuenta, INNO-TRACK no instala cookies. Guarda un único dato en el almacenamiento
          local, que es indispensable para funcionar. Las dos cookies de la tabla solo se crean si alguien del personal
          de soporte entra al panel técnico de administración.
        </p>

        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Para qué sirve</TableHead>
                <TableHead>Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storedItems.map(item => (
                <TableRow key={item.name}>
                  <TableCell className="font-mono text-xs text-foreground">{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.purpose}</TableCell>
                  <TableCell>{item.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </LegalSection>

      <LegalSection title="3. Lo que no usamos">
        <ul>
          <li>Cookies de publicidad.</li>
          <li>Cookies o herramientas de analítica que midan tu comportamiento.</li>
          <li>Botones o complementos de redes sociales.</li>
          <li>Cualquier otra tecnología que te siga entre sitios web.</li>
        </ul>
        <p>
          Como solo guardamos lo estrictamente necesario para que el sistema funcione, no mostramos un aviso para
          aceptar o rechazar cookies.
        </p>
      </LegalSection>

      <LegalSection title="4. Servicios de terceros">
        <p>
          La tipografía de la aplicación se carga desde <strong>Google Fonts</strong>. Para entregarla, los servidores
          de Google reciben la dirección IP y datos técnicos de tu navegador. Google indica que este servicio no usa
          cookies. INNO-TRACK no carga ningún otro recurso de terceros.
        </p>
      </LegalSection>

      <LegalSection title="5. Cómo borrar estos datos">
        <ul>
          <li>
            Al <strong>cerrar sesión</strong> en INNO-TRACK se borra el identificador de sesión de tu navegador.
          </li>
          <li>
            También puedes borrar los datos del sitio desde la configuración de privacidad de tu navegador. Si lo haces,
            tendrás que volver a iniciar sesión.
          </li>
          <li>
            Si bloqueas el almacenamiento local para este sitio, no podrás iniciar sesión, porque el sistema no tendrá
            dónde guardar tu sesión.
          </li>
        </ul>
        <p>En un computador compartido, cierra siempre la sesión al terminar.</p>
      </LegalSection>

      <LegalSection title="6. Cambios y contacto">
        <p>
          Si INNO-TRACK empieza a guardar otros datos en tu navegador, actualizaremos esta página antes de hacerlo. Para
          cualquier duda escribe a <strong>{LEGAL_INFO.contactEmail}</strong>. El uso de tus datos personales se explica
          en la política de privacidad.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
