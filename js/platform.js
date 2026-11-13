// Integração com cada plataforma: Android (Capacitor), desktop (Electron) e navegador.
// Os plugins do Capacitor são injetados em window.Capacitor.Plugins pelo app nativo,
// então nada aqui precisa de bundler.

const cap = () => window.Capacitor;
export const isNative = () => !!cap()?.isNativePlatform?.();
export const isAndroid = () => cap()?.getPlatform?.() === 'android';
export const isDesktop = () => !!window.datalingoDesktop;
export const platformName = () => (isAndroid() ? 'android' : isDesktop() ? 'desktop' : 'web');
const plugin = (name) => (isNative() ? cap().Plugins?.[name] : null);

// ───────────── lembrete diário
const REMINDER_ID = 4242;
const MESSAGES = [
  'Que tal 10 minutos de SQL hoje? Sua próxima lição está pronta.',
  'Uma lição curta já conta para a sua meta diária.',
  'Há exercícios esperando na revisão espaçada. Bora relembrar?',
];

export function remindersSupported() {
  return !!plugin('LocalNotifications') || 'Notification' in window;
}

export async function scheduleReminder({ enabled, hour, minute }) {
  const ln = plugin('LocalNotifications');
  if (ln) {
    await ln.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
    if (!enabled) return true;
    const perm = await ln.requestPermissions();
    if (perm.display !== 'granted') return false;
    await ln.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: 'Datum',
        body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        smallIcon: 'ic_stat_datalingo',
      }],
    });
    return true;
  }
  // desktop/navegador: avisa enquanto o app estiver aberto
  if (!enabled) return true;
  if ('Notification' in window && Notification.permission !== 'granted') {
    return (await Notification.requestPermission()) === 'granted';
  }
  return true;
}

let lastNotifiedDay = null;
export function startInAppReminderLoop(getState) {
  if (plugin('LocalNotifications')) return; // no Android o sistema cuida disso
  setInterval(() => {
    const s = getState();
    const r = s.reminder;
    const now = new Date();
    if (!r?.enabled || s.daily.xp > 0 || lastNotifiedDay === s.daily.day) return;
    if (now.getHours() === r.hour && now.getMinutes() >= r.minute && 'Notification' in window && Notification.permission === 'granted') {
      lastNotifiedDay = s.daily.day;
      new Notification('Datum', { body: MESSAGES[0] });
    }
  }, 60 * 1000);
}

// ───────────── feedback tátil e sonoro
export function haptic(kind) {
  const h = plugin('Haptics');
  if (h) {
    if (kind === 'success') h.notification({ type: 'SUCCESS' }).catch(() => {});
    else h.notification({ type: 'ERROR' }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(kind === 'success' ? 15 : [30, 40, 30]);
  }
}

let audio = null;
export function sound(kind, enabled = true) {
  if (!enabled) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'success' ? [[660, 0], [880, 0.09]] : kind === 'finish' ? [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]] : [[220, 0], [180, 0.12]];
    for (const [freq, t] of notes) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = kind === 'error' ? 'sawtooth' : 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(kind === 'error' ? 0.05 : 0.12, audio.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.18);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + t);
      o.stop(audio.currentTime + t + 0.2);
    }
  } catch { /* sem áudio */ }
}

// ───────────── botão "voltar" do Android
export function onBackButton(handler) {
  const app = plugin('App');
  if (app) app.addListener('backButton', handler);
}

export function exitApp() {
  plugin('App')?.exitApp();
}

// ───────────── barra de status (Android)
export function styleStatusBar(dark) {
  const sb = plugin('StatusBar');
  if (!sb) return;
  sb.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
  sb.setBackgroundColor({ color: dark ? '#131f24' : '#ffffff' }).catch(() => {});
}

// ───────────── copiar texto (backup)
export async function copyText(text) {
  const clip = plugin('Clipboard');
  if (clip) return clip.write({ string: text });
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  throw new Error('Copie manualmente o código abaixo.');
}
