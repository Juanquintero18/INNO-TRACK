/**
 * Preparación del entorno para las pruebas que montan pantallas completas.
 *
 * jsdom no implementa varias APIs del navegador que usan Radix y Recharts, y
 * las animaciones harían que el DOM capturado cambie entre ejecuciones.
 */
import { createElement, forwardRef, type ReactNode } from 'react';
import { vi } from 'vitest';

// Las fechas del sistema se muestran en hora de Colombia.
process.env.TZ = 'America/Bogota';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});

// Sin animaciones: cada componente `motion.x` se renderiza como su etiqueta HTML.
vi.mock('framer-motion', () => {
  const motionProps = new Set([
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'whileInView',
    'layout',
    'layoutId',
  ]);
  const components = new Map<string, unknown>();

  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!components.has(tag)) {
          components.set(
            tag,
            forwardRef<unknown, Record<string, unknown>>((props, ref) =>
              createElement(tag, {
                ...Object.fromEntries(Object.entries(props).filter(([name]) => !motionProps.has(name))),
                ref,
              })
            )
          );
        }

        return components.get(tag);
      },
    }
  );

  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => children };
});

// La exportación a Excel se intercepta para inspeccionar las hojas generadas.
vi.mock('write-excel-file/browser', () => {
  const toFile = vi.fn(async () => undefined);
  return { default: vi.fn(() => ({ toFile })) };
});
