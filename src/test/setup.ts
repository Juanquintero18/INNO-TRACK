// Agrega matchers extra para aserciones del DOM (toBeInTheDocument, etc.).
import "@testing-library/jest-dom";

// jsdom no implementa matchMedia; este mock evita fallos en componentes responsivos.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    // Compatibilidad con APIs antiguas y modernas usadas por distintas librerias.
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
