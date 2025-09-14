const LS_DEBUG = 'lj.debugAuth';
const LS_AUTO = 'lj.autoOtp';

function q(name: string) {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get(name);
  return v;
}

function boolFrom(v: string | null | undefined) {
  if (v == null) return null;
  return ['1','true','on','yes'].includes(v.toLowerCase());
}

export function getDebugAuth(): boolean {
  const qv = boolFrom(q('debug'));
  if (qv !== null) { 
    localStorage.setItem(LS_DEBUG, qv ? '1':'0'); 
    return qv; 
  }
  const ls = localStorage.getItem(LS_DEBUG);
  return ls === '1';
}

export function setDebugAuth(val: boolean) {
  localStorage.setItem(LS_DEBUG, val ? '1':'0');
}

export function getAutoOtp(): boolean {
  const qv = boolFrom(q('autootp'));
  if (qv !== null) { 
    localStorage.setItem(LS_AUTO, qv ? '1':'0'); 
    return qv; 
  }
  const ls = localStorage.getItem(LS_AUTO);
  // default: ON in production unless explicitly disabled
  return ls === null ? true : ls === '1';
}

export function setAutoOtp(val: boolean) {
  localStorage.setItem(LS_AUTO, val ? '1':'0');
}