import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

const en = {
  partners: "Partners",
  portal: "Partner Portal",
  seasonChip: "Global Kindness Season · Nov 1 – Jan 31",
  seasonChipLong: "Global Kindness Season · Nov 1, 2026 – Jan 31, 2027",
  heroTitle: "Every act counts. Let's reach 1 billion together.",
  heroBody: "Log your school's acts of kindness in minutes and watch them light up the Wall of Kindness.",
  // login
  welcomeBack: "Welcome back",
  loginSub: "Log in to share your school's acts of kindness.",
  school: "School",
  searchSchool: "Search your school",
  noSchoolMatch: "No schools match that search.",
  cantFindSchool: "Can't find your school?",
  contactUs: "Contact us",
  staffId: "Staff ID",
  staffIdPlaceholder: "e.g. 7KQM-4RTX",
  forgotStaffId: "Forgot it?",
  forgotStaffIdHelp: "Ask your school's coordinator to send you the invite link again — you'll get a new Staff ID in seconds.",
  logIn: "Log In",
  loggingIn: "Logging in…",
  pickSchool: "Pick your school from the list.",
  newPartner: "New partner? Use the signup link your coordinator sent you.",
  // join
  invited: "You've been invited",
  joinHero: (school: string) => `Welcome to the movement, ${school}.`,
  joinHeroBody: "Create your account to start logging your school's acts of kindness this Global Kindness Season.",
  createAccount: "Create your account",
  createSub: "It takes less than a minute.",
  setByInvite: "Set by your school's invite link",
  fullName: "Full name",
  fullNamePlaceholder: "e.g. Ana Rivera",
  createBtn: "Create Account",
  creating: "Creating…",
  haveAccount: "Already have an account?",
  logInLink: "Log in",
  badInvite: "This invite link isn't valid. Ask your coordinator for a new one.",
  yourStaffId: "Your Staff ID",
  saveStaffId: "Save this — it's how you log in. Screenshot it or write it down.",
  copy: "Copy",
  copied: "Copied!",
  continueDash: "Go to Dashboard",
  // dashboard
  dashboard: "Dashboard",
  bulkLog: "Bulk Log",
  logOut: "Log out",
  hi: (name: string) => `Hi ${name}`,
  actsLogged: "ACTS LOGGED",
  pledged: (n: string) => `/ ${n} pledged`,
  days: "DAYS",
  hrs: "HRS",
  min: "MIN",
  startsIn: "SEASON STARTS IN",
  endsIn: "SEASON ENDS IN",
  seasonOver: "Season complete",
  firstActBar: "Your first act fills this bar.",
  halfway: "Halfway milestone reached!",
  goalReached: "Pledge reached — amazing!",
  keepGoing: "Keep it going!",
  toGo: (n: string) => `${n} to go`,
  seasonEnds: "Season ends Jan 31, 2027",
  logOne: "Log 1 Act",
  logOneSub: "Quick, single entry",
  bulkSub: "Log many acts at once",
  recentActs: "Recent acts",
  seeAll: "See all",
  showLess: "Show less",
  colActivity: "ACTIVITY",
  colActs: "ACTS",
  colDate: "DATE",
  colStatus: "STATUS",
  pending: "Pending Review",
  approved: "Approved",
  changes: "Needs Changes",
  rejected: "Not Approved",
  emptyTitle: "Your kindness story starts here",
  emptyBody:
    "Big or small, every act counts toward 1 billion. Log your first one — it takes less than a minute. Did a whole class do something kind? Use Bulk Log.",
  logFirst: "Log Your First Act",
  loadError: "Couldn't load your acts. Pull to refresh or try again.",
  // log one
  logOneIntro: "Share one moment of kindness from your school.",
  close: "Close",
  whatHappened: "What happened?",
  whatPlaceholder: "e.g. Our choir sang holiday songs for residents at the senior center next door.",
  date: "Date",
  groupQ: "Was this a group activity?",
  yes: "Yes",
  no: "No",
  howMany: "How many people took part?",
  howManyHelp: "Each person counts as one act of kindness.",
  fewer: "Fewer people",
  more: "More people",
  addMedia: "Add photo or video",
  tapToAdd: "Tap to add a photo or video",
  mediaHint: "JPG, PNG or MP4 · up to 50 MB",
  videoNote: "Videos go to our review team. Photos are what appear on the Wall of Kindness.",
  consent: "We have permission to share this photo/video.",
  cancel: "Cancel",
  submitAct: "Submit Act",
  submitting: "Submitting…",
  cancelUpload: "Cancel upload",
  removeFile: "Remove file",
  waitUploads: "Wait for uploads to finish.",
  needConsent: "Please confirm you have permission to share the photos/videos.",
  needDescription: "Describe what happened.",
  // bulk
  bulkIntro: "One row per activity. Add a photo or video to each so it can shine on the Wall of Kindness.",
  colNum: "#",
  colDesc: "ACT DESCRIPTION",
  colPeople: "PEOPLE INVOLVED",
  colMedia: "PHOTO / VIDEO",
  actDescription: "Act description",
  peopleInvolved: "People involved",
  uploadMedia: "Upload photo or video",
  uploading: "Uploading…",
  uploadFailed: "Upload failed",
  retry: "Retry",
  uploadComplete: "Upload complete",
  deleteRow: "Delete row",
  addRow: "Add Row",
  rows: "ROWS",
  totalActs: "TOTAL ACTS",
  bulkConsent: "We have permission to share all photos and videos in this log.",
  failedNote: (n: number) =>
    n === 1 ? "1 upload failed. Retry it, or submit without that file." : `${n} uploads failed. Retry them, or submit without those files.`,
  submitAll: "Submit All",
  rowError: (n: number, msg: string) => `Row ${n}: ${msg}`,
  emptyRows: "Fill in at least one row.",
  // success
  thankYou: "Thank you!",
  onTheirWay: "Your acts are on their way to the Wall of Kindness 💛",
  summary: (activities: number, acts: string) =>
    `${activities} ${activities === 1 ? "activity" : "activities"} · ${acts} acts submitted`,
  reviewNote: "Our team reviews submissions before they go live.",
  logMore: "Log More Acts",
  backDash: "Back to Dashboard",
  language: "Español",
};

type Copy = typeof en;

const es: Copy = {
  partners: "Socios",
  portal: "Portal de Socios",
  seasonChip: "Temporada Global de Bondad · 1 nov – 31 ene",
  seasonChipLong: "Temporada Global de Bondad · 1 nov 2026 – 31 ene 2027",
  heroTitle: "Cada acto cuenta. Lleguemos juntos a mil millones.",
  heroBody: "Registra los actos de bondad de tu escuela en minutos y míralos brillar en el Muro de la Bondad.",
  welcomeBack: "Bienvenido de nuevo",
  loginSub: "Inicia sesión para compartir los actos de bondad de tu escuela.",
  school: "Escuela",
  searchSchool: "Busca tu escuela",
  noSchoolMatch: "Ninguna escuela coincide con esa búsqueda.",
  cantFindSchool: "¿No encuentras tu escuela?",
  contactUs: "Contáctanos",
  staffId: "ID de personal",
  staffIdPlaceholder: "ej. 7KQM-4RTX",
  forgotStaffId: "¿Lo olvidaste?",
  forgotStaffIdHelp: "Pídele a la persona coordinadora de tu escuela que te envíe el enlace de invitación otra vez — recibirás un ID nuevo en segundos.",
  logIn: "Iniciar sesión",
  loggingIn: "Entrando…",
  pickSchool: "Elige tu escuela de la lista.",
  newPartner: "¿Socio nuevo? Usa el enlace de registro que te envió tu coordinador.",
  invited: "Has sido invitado",
  joinHero: (school: string) => `Bienvenidos al movimiento, ${school}.`,
  joinHeroBody: "Crea tu cuenta para comenzar a registrar los actos de bondad de tu escuela esta Temporada Global de Bondad.",
  createAccount: "Crea tu cuenta",
  createSub: "Toma menos de un minuto.",
  setByInvite: "Definido por el enlace de invitación de tu escuela",
  fullName: "Nombre completo",
  fullNamePlaceholder: "ej. Ana Rivera",
  createBtn: "Crear cuenta",
  creating: "Creando…",
  haveAccount: "¿Ya tienes cuenta?",
  logInLink: "Inicia sesión",
  badInvite: "Este enlace de invitación no es válido. Pide uno nuevo a tu coordinador.",
  yourStaffId: "Tu ID de personal",
  saveStaffId: "Guárdalo — así inicias sesión. Toma una captura o anótalo.",
  copy: "Copiar",
  copied: "¡Copiado!",
  continueDash: "Ir al panel",
  dashboard: "Panel",
  bulkLog: "Registro múltiple",
  logOut: "Cerrar sesión",
  hi: (name: string) => `Hola ${name}`,
  actsLogged: "ACTOS REGISTRADOS",
  pledged: (n: string) => `/ ${n} prometidos`,
  days: "DÍAS",
  hrs: "HRS",
  min: "MIN",
  startsIn: "LA TEMPORADA EMPIEZA EN",
  endsIn: "LA TEMPORADA TERMINA EN",
  seasonOver: "Temporada completada",
  firstActBar: "Tu primer acto llena esta barra.",
  halfway: "¡Llegaste a la mitad!",
  goalReached: "¡Meta alcanzada — increíble!",
  keepGoing: "¡Sigue así!",
  toGo: (n: string) => `Faltan ${n}`,
  seasonEnds: "La temporada termina el 31 ene 2027",
  logOne: "Registrar 1 acto",
  logOneSub: "Rápido, una sola entrada",
  bulkSub: "Registra muchos actos a la vez",
  recentActs: "Actos recientes",
  seeAll: "Ver todos",
  showLess: "Ver menos",
  colActivity: "ACTIVIDAD",
  colActs: "ACTOS",
  colDate: "FECHA",
  colStatus: "ESTADO",
  pending: "En revisión",
  approved: "Aprobado",
  changes: "Requiere cambios",
  rejected: "No aprobado",
  emptyTitle: "Tu historia de bondad empieza aquí",
  emptyBody:
    "Grande o pequeño, cada acto cuenta para llegar a mil millones. Registra el primero — toma menos de un minuto. ¿Un grupo entero hizo algo bondadoso? Usa el Registro múltiple.",
  logFirst: "Registra tu primer acto",
  loadError: "No pudimos cargar tus actos. Inténtalo de nuevo.",
  logOneIntro: "Comparte un momento de bondad de tu escuela.",
  close: "Cerrar",
  whatHappened: "¿Qué pasó?",
  whatPlaceholder: "ej. Nuestro coro cantó villancicos a los residentes del centro de envejecientes.",
  date: "Fecha",
  groupQ: "¿Fue una actividad en grupo?",
  yes: "Sí",
  no: "No",
  howMany: "¿Cuántas personas participaron?",
  howManyHelp: "Cada persona cuenta como un acto de bondad.",
  fewer: "Menos personas",
  more: "Más personas",
  addMedia: "Añadir foto o video",
  tapToAdd: "Toca para añadir una foto o video",
  mediaHint: "JPG, PNG o MP4 · hasta 50 MB",
  videoNote: "Los videos van a nuestro equipo de revisión. Las fotos son las que aparecen en el Muro de la Bondad.",
  consent: "Tenemos permiso para compartir esta foto/video.",
  cancel: "Cancelar",
  submitAct: "Enviar acto",
  submitting: "Enviando…",
  cancelUpload: "Cancelar subida",
  removeFile: "Quitar archivo",
  waitUploads: "Espera a que terminen las subidas.",
  needConsent: "Confirma que tienes permiso para compartir las fotos/videos.",
  needDescription: "Describe lo que pasó.",
  bulkIntro: "Una fila por actividad. Añade una foto o video a cada una para que brille en el Muro de la Bondad.",
  colNum: "#",
  colDesc: "DESCRIPCIÓN DEL ACTO",
  colPeople: "PERSONAS",
  colMedia: "FOTO / VIDEO",
  actDescription: "Descripción del acto",
  peopleInvolved: "Personas involucradas",
  uploadMedia: "Subir foto o video",
  uploading: "Subiendo…",
  uploadFailed: "Falló la subida",
  retry: "Reintentar",
  uploadComplete: "Subida completa",
  deleteRow: "Eliminar fila",
  addRow: "Añadir fila",
  rows: "FILAS",
  totalActs: "ACTOS TOTALES",
  bulkConsent: "Tenemos permiso para compartir todas las fotos y videos de este registro.",
  failedNote: (n: number) =>
    n === 1 ? "1 subida falló. Reinténtala o envía sin ese archivo." : `${n} subidas fallaron. Reinténtalas o envía sin esos archivos.`,
  submitAll: "Enviar todo",
  rowError: (n: number, msg: string) => `Fila ${n}: ${msg}`,
  emptyRows: "Completa al menos una fila.",
  thankYou: "¡Gracias!",
  onTheirWay: "Tus actos van camino al Muro de la Bondad 💛",
  summary: (activities: number, acts: string) =>
    `${activities} ${activities === 1 ? "actividad" : "actividades"} · ${acts} actos enviados`,
  reviewNote: "Nuestro equipo revisa los envíos antes de publicarlos.",
  logMore: "Registrar más actos",
  backDash: "Volver al panel",
  language: "English",
};

const COPY: Record<Lang, Copy> = { en, es };

const LANG_KEY = "ppl-partner-lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

interface LangCtx {
  lang: Lang;
  t: Copy;
  toggle: () => void;
  locale: string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const toggle = () => {
    const next: Lang = lang === "en" ? "es" : "en";
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* non-fatal */
    }
    document.documentElement.lang = next;
  };
  return (
    <Ctx.Provider value={{ lang, t: COPY[lang] ?? COPY.en, toggle, locale: lang === "es" ? "es-PR" : "en-US" }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCopy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCopy must be used within LangProvider");
  return ctx;
}
