/**
 * Politica de privacidad (tratamiento de datos personales) de INNO-TRACK.
 *
 * El contenido describe lo que el sistema hace realmente con los datos. Si
 * cambia que datos se guardan o con quien se comparten, esta pagina debe
 * actualizarse junto con el codigo.
 */
import { LegalPage, LegalSection } from '@/components/LegalPage';
import { LEGAL_INFO } from '@/lib/legal-info';

export default function PoliticaPrivacidad() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro={
        <>
          <p>
            Esta política explica qué datos personales se guardan en INNO-TRACK, para qué se usan, quién puede verlos y
            cómo puedes ejercer tus derechos sobre ellos.
          </p>
          <p>
            Se rige por la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia (compilado en el Decreto 1074 de
            2015), que regulan la protección de datos personales.
          </p>
        </>
      }
    >
      <LegalSection title="1. Quién es el responsable de tus datos">
        <p>
          El responsable del tratamiento es <strong>{LEGAL_INFO.companyName}</strong>, identificada con NIT{' '}
          {LEGAL_INFO.companyId}, con domicilio en {LEGAL_INFO.address}, {LEGAL_INFO.city}.
        </p>
        <p>
          INNO-TRACK es el sistema interno de {LEGAL_INFO.companyName} para controlar los costos, el inventario y la
          producción de piezas. Solo lo usa personal autorizado por la empresa: no es un servicio abierto al público y
          las cuentas las crea un administrador.
        </p>
        <ul>
          <li>
            <strong>Correo de contacto:</strong> {LEGAL_INFO.contactEmail}
          </li>
          <li>
            <strong>Teléfono:</strong> {LEGAL_INFO.contactPhone}
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. A quién aplica">
        <ul>
          <li>A las personas que tienen una cuenta de usuario en INNO-TRACK.</li>
          <li>A los trabajadores de producción registrados en el sistema, aunque no tengan cuenta.</li>
          <li>A los proveedores de materias primas y a sus personas de contacto.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Qué datos guardamos">
        <ul>
          <li>
            <strong>Usuarios del sistema:</strong> nombre, apellido, correo electrónico, rol y contraseña. La
            contraseña se guarda transformada con un algoritmo de un solo sentido (hash): nadie, ni siquiera un
            administrador, puede leerla.
          </li>
          <li>
            <strong>Trabajadores de producción:</strong> código de trabajador y nombre.
          </li>
          <li>
            <strong>Proveedores:</strong> nombre o razón social, teléfono, correo electrónico y dirección.
          </li>
          <li>
            <strong>Registros de actividad:</strong> qué usuario creó o modificó cada pieza, qué usuario registró cada
            movimiento de inventario y qué usuario eliminó o restauró un registro, con fecha y hora. Cuando se elimina
            un registro, el sistema conserva una copia en la auditoría para poder restaurarlo.
          </li>
          <li>
            <strong>Datos técnicos:</strong> un identificador de sesión que se guarda en tu navegador mientras tienes
            la sesión iniciada. Cuando alguien solicita recuperar una contraseña, el sistema usa temporalmente la
            dirección IP y el correo de la solicitud, hasta por una hora, para limitar los intentos repetidos.
          </li>
        </ul>
        <p>
          INNO-TRACK no pide datos sensibles (como salud, datos biométricos u orientación política o religiosa) ni
          datos de menores de edad. Tampoco usa herramientas de analítica o publicidad.
        </p>
      </LegalSection>

      <LegalSection title="4. Para qué los usamos">
        <ul>
          <li>Identificarte cuando inicias sesión y darte acceso según tu rol.</li>
          <li>
            Registrar y consultar la producción: proyectos, órdenes, piezas, materias primas, movimientos de inventario
            y costos.
          </li>
          <li>
            Dejar trazabilidad de quién hizo cada registro o cambio, y poder restaurar lo que se elimine por error.
          </li>
          <li>Contactar a los proveedores para la compra de materias primas.</li>
          <li>Enviarte el correo para recuperar tu contraseña y avisarte cuando tu contraseña cambie.</li>
          <li>Proteger el sistema contra accesos no autorizados.</li>
        </ul>
        <p>
          {LEGAL_INFO.companyName} trata estos datos con la autorización de sus titulares, obtenida al iniciar la
          relación laboral o comercial, y porque son necesarios para desarrollar esa relación. No usamos los datos para
          publicidad, no elaboramos perfiles de las personas y no los vendemos.
        </p>
      </LegalSection>

      <LegalSection title="5. Quién puede ver los datos">
        <ul>
          <li>
            <strong>Personal de la empresa con cuenta activa.</strong> Lo que cada persona puede ver y modificar depende
            de su rol (administrador, almacenista o trabajador). Solo los administradores pueden crear, modificar o
            eliminar cuentas de usuario.
          </li>
          <li>
            <strong>Archivos exportados.</strong> Quien tiene acceso a un módulo puede exportar su información a Excel.
            Esos archivos quedan bajo la responsabilidad de quien los descarga y deben manejarse con el mismo cuidado
            que el sistema.
          </li>
          <li>
            <strong>Proveedores de servicios tecnológicos.</strong> Los datos se alojan en{' '}
            {LEGAL_INFO.hostingProvider} y los correos de recuperación de contraseña se envían mediante{' '}
            {LEGAL_INFO.emailProvider}. Estos proveedores actúan por encargo de {LEGAL_INFO.companyName} y solo pueden
            usar los datos para prestar ese servicio. Si alguno procesa datos fuera de Colombia, la transmisión se hace
            con las garantías que exige la ley colombiana.
          </li>
          <li>
            <strong>Google Fonts.</strong> La tipografía de la aplicación se carga desde servidores de Google, que por
            esa conexión recibe la dirección IP y datos técnicos de tu navegador. INNO-TRACK no le envía ningún otro
            dato.
          </li>
          <li>
            <strong>Autoridades.</strong> Cuando una autoridad competente lo exija conforme a la ley.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Cuánto tiempo los conservamos">
        <p>
          Conservamos los datos mientras exista la relación laboral o comercial con {LEGAL_INFO.companyName} y, después,
          durante el tiempo necesario para cumplir obligaciones legales, contables o contractuales.
        </p>
        <p>
          Los registros de producción, inventario y auditoría se conservan aunque la persona que los hizo ya no tenga
          cuenta, porque respaldan la trazabilidad de las piezas fabricadas.
        </p>
      </LegalSection>

      <LegalSection title="7. Cómo los protegemos">
        <ul>
          <li>Cada persona entra con una cuenta personal y solo accede a lo que su rol permite.</li>
          <li>Las contraseñas se guardan con hash y no se pueden leer ni recuperar: solo se pueden reemplazar.</li>
          <li>La sesión vence automáticamente a las 8 horas.</li>
          <li>
            El enlace para recuperar la contraseña llega solo al correo registrado, vence en poco tiempo y sirve una
            sola vez.
          </li>
          <li>Las eliminaciones quedan registradas en la auditoría con el usuario, la fecha y la hora.</li>
        </ul>
        <p>
          Ningún sistema es completamente seguro. Si crees que alguien usó tu cuenta sin permiso, cambia tu contraseña y
          avisa de inmediato al administrador del sistema.
        </p>
      </LegalSection>

      <LegalSection title="8. Tus derechos">
        <p>Como titular de tus datos personales tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que diste para su tratamiento.</li>
          <li>Ser informado sobre el uso que se les ha dado.</li>
          <li>
            Revocar la autorización o pedir que se eliminen, cuando no exista un deber legal o contractual de
            conservarlos.
          </li>
          <li>Consultar gratis los datos que tenemos sobre ti.</li>
          <li>
            Presentar una queja ante la Superintendencia de Industria y Comercio (SIC) si consideras que se incumplió la
            ley, después de haber hecho el reclamo ante {LEGAL_INFO.companyName}.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Cómo ejercer tus derechos">
        <p>
          Escribe a <strong>{LEGAL_INFO.contactEmail}</strong> indicando tu nombre completo, tu número de
          identificación, qué solicitas y un medio para responderte. Si solo necesitas corregir tu nombre o tu correo en
          el sistema, también puedes pedírselo directamente a un administrador de INNO-TRACK.
        </p>
        <ul>
          <li>
            <strong>Consultas:</strong> se responden en máximo 10 días hábiles. Si no es posible, te informaremos el
            motivo y responderemos dentro de los 5 días hábiles siguientes.
          </li>
          <li>
            <strong>Reclamos</strong> (corrección, actualización, eliminación o incumplimiento): se responden en máximo
            15 días hábiles. Si no es posible, te informaremos el motivo y responderemos dentro de los 8 días hábiles
            siguientes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Vigencia y cambios">
        <p>
          Esta política rige desde el {LEGAL_INFO.lastUpdated}. Si cambia de forma importante (por ejemplo, si se
          empiezan a guardar nuevos datos o cambian las finalidades), se publicará la nueva versión en esta misma página
          y se avisará a los usuarios del sistema.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
