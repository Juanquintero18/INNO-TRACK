/**
 * Estructura comun de las paginas legales (privacidad y cookies).
 *
 * Son paginas publicas: se pueden leer sin iniciar sesion.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo-inno-transparente. RGB.png';
import { LEGAL_INFO } from '@/lib/legal-info';

interface LegalPageProps {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}

export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a INNO-TRACK
        </Link>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <header className="flex items-start gap-4 border-b border-border pb-6">
            <img src={logo} alt="Innolution" className="h-16 w-16 shrink-0 rounded-lg object-contain" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Última actualización: {LEGAL_INFO.lastUpdated}</p>
            </div>
          </header>

          <div className="mt-6 space-y-8">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{intro}</div>
            {children}
          </div>

          <footer className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
            <Link to="/privacidad" className="font-medium text-primary hover:underline">
              Política de privacidad
            </Link>
            <Link to="/cookies" className="font-medium text-primary hover:underline">
              Política de cookies
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
