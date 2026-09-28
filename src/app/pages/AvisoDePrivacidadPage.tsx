import { useEffect } from "react";
import { Link } from "react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";

const EFFECTIVE_DATE = "24 de junio de 2025";
const COMPANY_NAME = "Comercializadora Vida y Tierra, S.A. de C.V.";
const TRADE_NAME = "Viterra Grupo Inmobiliario";
const ADDRESS = "Av. Terranova 1455, local 102, Colonia Providencia 4a Sección, C.P. 44639, Zapopan, Jalisco, México";
const EMAIL = "contacto@viterrainmobiliaria.com";
const PHONE = "(33) 3629-7122";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-brand-navy mb-3 pb-2 border-b border-slate-200">
        {title}
      </h2>
      <div className="text-slate-700 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function AvisoDePrivacidadPage() {
  useEffect(() => {
    document.title = "Aviso de Privacidad · Viterra Inmobiliaria";
  }, []);

  return (
    <div className="viterra-page flex min-h-screen flex-col bg-brand-canvas">
      <Header />

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-14">
        <Reveal>
          <div className="mb-10 pb-8 border-b border-slate-200">
            <p className="text-xs uppercase tracking-[0.28em] text-primary font-medium mb-2">
              Viterra · Legal
            </p>
            <h1 className="text-3xl sm:text-4xl font-heading font-semibold text-brand-navy mb-3">
              Aviso de Privacidad
            </h1>
            <p className="text-slate-500 text-sm">
              En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión
              de los Particulares (LFPDPPP) y su Reglamento. Última actualización: {EFFECTIVE_DATE}.
            </p>
          </div>
          <Section title="I. Identidad y domicilio del Responsable">
            <p>
              <strong>{COMPANY_NAME}</strong>, con nombre comercial <strong>{TRADE_NAME}</strong>{" "}
              (en adelante, «Viterra»), con domicilio en:
            </p>
            <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 mt-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{ADDRESS}</span>
            </div>
            <p className="mt-3">
              Es responsable del tratamiento de sus datos personales de conformidad con lo
              previsto en la legislación aplicable en materia de protección de datos personales.
            </p>
          </Section>

          <Section title="II. Datos personales que recabamos">
            <p>
              Viterra recaba datos personales directamente de usted mediante formularios en línea,
              comunicaciones por correo electrónico, teléfono y visitas a nuestras instalaciones,
              así como de forma indirecta a través de fuentes de acceso público o de terceros
              autorizados. Los datos que podemos recabar son:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
              <li>Datos de identificación: nombre completo, RFC, CURP.</li>
              <li>Datos de contacto: domicilio, número de teléfono, correo electrónico.</li>
              <li>Datos patrimoniales y financieros: información relativa a la capacidad económica
                o crediticia necesaria para formalizar transacciones inmobiliarias.</li>
              <li>Datos de geolocalización aproximada: para el servicio de búsqueda de propiedades.</li>
              <li>Datos de navegación: cookies y registros de acceso al sitio web (ver sección VIII).</li>
            </ul>
            <p className="mt-3">
              Viterra <strong>no recaba datos personales sensibles</strong> de manera habitual. En
              caso de que alguna operación lo requiera, se le solicitará su consentimiento expreso
              mediante documento específico.
            </p>
          </Section>

          <Section title="III. Finalidades del tratamiento">
            <p>
              Sus datos personales serán utilizados para las siguientes <strong>finalidades primarias</strong>,
              que son necesarias para la relación jurídica o comercial que mantiene con Viterra:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Gestión de solicitudes de información sobre propiedades en venta, renta o desarrollo.</li>
              <li>Formalización y seguimiento de contratos de compraventa, arrendamiento y
                administración de inmuebles.</li>
              <li>Valuación y avalúo de bienes inmuebles.</li>
              <li>Asesoría jurídica e intermediación inmobiliaria.</li>
              <li>Cumplimiento de obligaciones legales y fiscales derivadas de la operación
                inmobiliaria.</li>
              <li>Atención a solicitudes, quejas y aclaraciones.</li>
            </ul>
            <p className="mt-4">
              Asimismo, con su consentimiento, podremos utilizar sus datos para las
              siguientes <strong>finalidades secundarias</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Envío de información sobre nuevas propiedades, desarrollos y promociones.</li>
              <li>Realización de encuestas de satisfacción y estudios de mercado.</li>
              <li>Comunicaciones de contenido de valor sobre el mercado inmobiliario.</li>
            </ul>
            <p className="mt-3">
              Si no desea que sus datos sean tratados para las finalidades secundarias, puede
              manifestarlo enviando un correo electrónico a{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline font-medium">
                {EMAIL}
              </a>{" "}
              con el asunto «Revocación finalidades secundarias».
            </p>
          </Section>

          <Section title="IV. Transferencias de datos personales">
            <p>
              Viterra podrá transferir sus datos personales, sin requerir su consentimiento, a:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Notarios públicos, fedatarios y autoridades registrales, en el marco de la
                formalización de operaciones inmobiliarias.</li>
              <li>Autoridades fiscales, judiciales y administrativas en cumplimiento de
                obligaciones legales.</li>
              <li>Instituciones financieras y de crédito para la gestión de financiamientos
                hipotecarios, con su previo conocimiento.</li>
              <li>Prestadores de servicios que actúen como encargados del tratamiento (plataformas
                tecnológicas, almacenamiento en la nube), quienes estarán obligados a guardar
                confidencialidad y a tratar los datos exclusivamente conforme a las instrucciones
                de Viterra.</li>
            </ul>
            <p className="mt-3">
              Las transferencias que no estén amparadas en las excepciones legales requerirán su
              consentimiento previo, que le será solicitado en el momento oportuno.
            </p>
          </Section>

          <Section title="V. Derechos ARCO y mecanismo para ejercerlos">
            <p>
              Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong>{" "}
              (derechos ARCO) al tratamiento de sus datos personales. Para ejercerlos, envíe una
              solicitud al correo{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline font-medium">
                {EMAIL}
              </a>{" "}
              o por escrito a nuestro domicilio, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Nombre completo y datos de contacto del titular.</li>
              <li>Copia de un documento oficial que acredite su identidad.</li>
              <li>Descripción clara del derecho que desea ejercer y los datos a que se refiere.</li>
              <li>Cualquier documento que facilite la localización de sus datos.</li>
            </ul>
            <p className="mt-3">
              Viterra responderá a su solicitud en un plazo máximo de <strong>20 días hábiles</strong>{" "}
              contados a partir de su recepción, prorrogable por una sola vez por igual período.
              La respuesta se emitirá al mismo correo o dirección que usted haya indicado.
            </p>
          </Section>

          <Section title="VI. Revocación del consentimiento">
            <p>
              Usted puede revocar el consentimiento que haya otorgado para el tratamiento de sus
              datos personales en cualquier momento, siempre que no exista una obligación legal que
              impida hacerlo. Para revocar su consentimiento, siga el mismo procedimiento descrito
              en la sección V, indicando en el asunto «Revocación de consentimiento».
            </p>
            <p className="mt-3">
              La revocación no tendrá efectos retroactivos; no obstante, Viterra cesará el
              tratamiento a partir de que la solicitud sea atendida, salvo que deba conservar los
              datos para cumplir obligaciones legales o contractuales vigentes.
            </p>
          </Section>

          <Section title="VII. Limitación del uso y divulgación de datos">
            <p>
              Si desea que sus datos personales no sean utilizados para recibir comunicaciones
              comerciales o promocionales, puede inscribirse en el Registro Público para Evitar
              Publicidad (REPEP) a través del sitio de PROFECO, o enviar su solicitud directamente
              a{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline font-medium">
                {EMAIL}
              </a>.
            </p>
          </Section>

          <Section title="VIII. Uso de cookies y tecnologías de rastreo">
            <p>
              Nuestro sitio web utiliza cookies y tecnologías similares para mejorar la experiencia
              de navegación, analizar el uso del sitio y personalizar el contenido. Las cookies
              empleadas son:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong>Cookies esenciales:</strong> necesarias para el funcionamiento básico del
                sitio (sesión de usuario, preferencias de idioma).
              </li>
              <li>
                <strong>Cookies analíticas:</strong> recopilan información anónima y agregada sobre
                el uso del sitio para mejorar su rendimiento.
              </li>
              <li>
                <strong>Cookies de preferencias:</strong> recuerdan sus configuraciones y elecciones
                para personalizar la experiencia.
              </li>
            </ul>
            <p className="mt-3">
              Puede deshabilitar las cookies mediante la configuración de su navegador; sin embargo,
              esto puede afectar la funcionalidad de determinadas secciones del sitio.
            </p>
          </Section>

          <Section title="IX. Seguridad de los datos">
            <p>
              Viterra implementa medidas de seguridad administrativas, técnicas y físicas para
              proteger sus datos personales contra daño, pérdida, alteración, destrucción o el uso,
              acceso o tratamiento no autorizado. El acceso a los sistemas que contienen datos
              personales está restringido al personal autorizado y se sujeta a políticas internas
              de confidencialidad.
            </p>
          </Section>

          <Section title="X. Cambios al presente Aviso de Privacidad">
            <p>
              Viterra se reserva el derecho de modificar el presente Aviso de Privacidad en
              cualquier momento para adecuarlo a nuevos requisitos legislativos, jurisprudenciales
              o a sus propias necesidades operativas. Cualquier modificación será comunicada a
              través de nuestro sitio web{" "}
              <strong>viterrainmobiliaria.com</strong>, indicando la fecha de la última
              actualización. Le recomendamos consultar periódicamente esta página.
            </p>
          </Section>

          <Section title="XI. Contacto y autoridad competente">
            <p>
              Para cualquier duda, comentario o solicitud relacionada con este Aviso de Privacidad
              puede contactarnos a través de los siguientes medios:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Correo electrónico</p>
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline font-medium text-sm">
                    {EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Teléfono</p>
                  <a href="tel:+523336297122" className="text-primary hover:underline font-medium text-sm">
                    {PHONE}
                  </a>
                </div>
              </div>
            </div>
            <p className="mt-4">
              Si considera que Viterra ha vulnerado sus derechos respecto a la protección de sus
              datos personales, tiene el derecho de acudir ante el{" "}
              <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección
              de Datos Personales (INAI)</strong>, autoridad competente en la materia.
            </p>
          </Section>

          {/* Back link */}
          <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {TRADE_NAME}. Todos los derechos reservados.
            </p>
            <Link
              to="/"
              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              ← Volver al inicio
            </Link>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
