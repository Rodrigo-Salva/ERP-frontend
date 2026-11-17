import '@testing-library/jest-dom/vitest';

// JSDOM no implementa la API nativa de <dialog>; los componentes la usan en
// producción y las pruebas necesitan el mismo estado abierto/cerrado.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.removeAttribute('open');
  };
}
