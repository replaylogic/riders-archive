// A small brass-edged message that fades in above the gramophone.

let el;
let timer;

export function toast(message, ms = 1800) {
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('is-on'), ms);
}
