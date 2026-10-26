// UI strings for the associate field screens (English / Spanish).

export type FieldLang = 'en' | 'es'

const en = {
  tonightKicker: 'TONIGHT · YOUR ROUTE',
  offTonight: "You're off tonight. Enjoy the quiet.",
  allDone: 'Every stop done. Nice work tonight.',
  stopsLeft: (n: number) => `${n} ${n === 1 ? 'stop' : 'stops'} left on your route.`,
  noShifts: 'No shifts tonight',
  noShiftsHint: 'Check back here when your shift starts.',
  tonight: 'Tonight',
  progress: 'Progress',
  stops: (n: number) => `${n} ${n === 1 ? 'stop' : 'stops'}`,
  onYourRoute: 'on your route',
  of: 'of',
  statusPending: 'Not started',
  statusInProgress: 'In progress',
  statusCompleted: 'Complete',
  statusPartial: 'Items not done',
  start: 'Start visit',
  continue: 'Continue visit',
  view: 'View visit',
  reportProblem: 'Report a problem',
  loading: 'Loading...',
  back: 'Back to tonight',
  notStarted: 'Not started',
  onTheClock: 'On the clock',
  clockedOut: 'Clocked out',
  clockInHint: 'Clock in when you arrive',
  clockIn: 'Clock in',
  inAt: 'In',
  outAt: 'Out',
  accessInfo: 'Access & notes',
  done: 'Done',
  notDone: 'Not done',
  whyNotDone: 'Why not?',
  pickReason: 'Pick a reason',
  addNote: 'Add a note (optional)',
  explain: 'Explain what happened',
  addPhoto: 'Add photo',
  uploading: 'Uploading...',
  photoRequired: 'Photo requested',
  priority: 'Priority',
  remaining: (n: number) => `${n} ${n === 1 ? 'item needs' : 'items need'} an answer`,
  allAccounted: 'Every item has an answer',
  notesLabel: 'Notes for your manager (optional)',
  notesPlaceholder: 'Anything your manager should know about this stop?',
  saveProgress: 'Save progress',
  finish: 'Finish & clock out',
  finishWithFlags: (n: number) => `Finish & report ${n} not done`,
  confirmFinish: 'You will be clocked out and can no longer edit this visit.',
  tapToConfirm: 'Tap again to finish',
  saved: 'Progress saved. You are still clocked in.',
  finished: 'Visit finished. Nice work.',
  finishedWithFlags: 'Visit finished. Your manager has been notified about the items not done.',
  finishedNote: 'This visit is finished. Here is what you reported.',
  noChecklist: 'No checklist for this stop',
  noChecklistHint: 'Clock in, do the work, add notes if needed, then finish.',
  problemTitle: 'Report a problem',
  problemHint: 'Broken equipment, no access, a leak, pests, anything your manager should know now.',
  problemType: 'What kind of problem?',
  problemDescription: 'What happened?',
  urgent: 'This is urgent',
  send: 'Send to manager',
  cancel: 'Cancel',
  problemSent: 'Sent. Your manager has been notified.',
  language: 'Español',
  error: 'Something went wrong. Please try again.',
  readOnly: 'Viewing as manager',
}

const es: typeof en = {
  tonightKicker: 'ESTA NOCHE · TU RUTA',
  offTonight: 'No tienes turno esta noche. Descansa.',
  allDone: 'Todas las paradas listas. Buen trabajo.',
  stopsLeft: (n: number) => `${n} ${n === 1 ? 'parada pendiente' : 'paradas pendientes'} en tu ruta.`,
  noShifts: 'No hay turnos esta noche',
  noShiftsHint: 'Vuelve aquí cuando empiece tu turno.',
  tonight: 'Esta noche',
  progress: 'Progreso',
  stops: (n: number) => `${n} ${n === 1 ? 'parada' : 'paradas'}`,
  onYourRoute: 'en tu ruta',
  of: 'de',
  statusPending: 'Sin empezar',
  statusInProgress: 'En progreso',
  statusCompleted: 'Completo',
  statusPartial: 'Tareas sin hacer',
  start: 'Empezar visita',
  continue: 'Continuar visita',
  view: 'Ver visita',
  reportProblem: 'Reportar un problema',
  loading: 'Cargando...',
  back: 'Volver a esta noche',
  notStarted: 'Sin empezar',
  onTheClock: 'Trabajando',
  clockedOut: 'Salida registrada',
  clockInHint: 'Marca tu entrada al llegar',
  clockIn: 'Marcar entrada',
  inAt: 'Entrada',
  outAt: 'Salida',
  accessInfo: 'Acceso y notas',
  done: 'Hecho',
  notDone: 'No hecho',
  whyNotDone: '¿Por qué no?',
  pickReason: 'Elige una razón',
  addNote: 'Agrega una nota (opcional)',
  explain: 'Explica lo que pasó',
  addPhoto: 'Agregar foto',
  uploading: 'Subiendo...',
  photoRequired: 'Se pide foto',
  priority: 'Prioridad',
  remaining: (n: number) => `${n} ${n === 1 ? 'tarea necesita' : 'tareas necesitan'} respuesta`,
  allAccounted: 'Todas las tareas tienen respuesta',
  notesLabel: 'Notas para tu gerente (opcional)',
  notesPlaceholder: '¿Algo que tu gerente deba saber de esta parada?',
  saveProgress: 'Guardar progreso',
  finish: 'Terminar y marcar salida',
  finishWithFlags: (n: number) => `Terminar y reportar ${n} sin hacer`,
  confirmFinish: 'Se marcará tu salida y ya no podrás editar esta visita.',
  tapToConfirm: 'Toca otra vez para terminar',
  saved: 'Progreso guardado. Sigues trabajando.',
  finished: 'Visita terminada. Buen trabajo.',
  finishedWithFlags: 'Visita terminada. Se avisó a tu gerente de las tareas sin hacer.',
  finishedNote: 'Esta visita está terminada. Esto es lo que reportaste.',
  noChecklist: 'No hay lista para esta parada',
  noChecklistHint: 'Marca tu entrada, haz el trabajo, agrega notas si hace falta y termina.',
  problemTitle: 'Reportar un problema',
  problemHint: 'Equipo dañado, sin acceso, una fuga, plagas, cualquier cosa que tu gerente deba saber ya.',
  problemType: '¿Qué tipo de problema?',
  problemDescription: '¿Qué pasó?',
  urgent: 'Es urgente',
  send: 'Enviar al gerente',
  cancel: 'Cancelar',
  problemSent: 'Enviado. Se avisó a tu gerente.',
  language: 'English',
  error: 'Algo salió mal. Intenta de nuevo.',
  readOnly: 'Vista de gerente',
}

export const FIELD_STRINGS = { en, es }

export const PROBLEM_TYPES = [
  { id: 'equipment', en: 'Equipment broken', es: 'Equipo dañado' },
  { id: 'access', en: 'No access / keys / alarm', es: 'Sin acceso / llaves / alarma' },
  { id: 'supplies', en: 'Out of supplies', es: 'Sin suministros' },
  { id: 'safety', en: 'Safety (leak, pests, hazard)', es: 'Seguridad (fuga, plagas, peligro)' },
  { id: 'other', en: 'Something else', es: 'Otra cosa' },
] as const

const LANG_KEY = 'us-field-lang'

export function readStoredLang(fallback: FieldLang): FieldLang {
  try {
    const v = window.localStorage.getItem(LANG_KEY)
    return v === 'es' || v === 'en' ? v : fallback
  } catch {
    return fallback
  }
}

export function storeLang(lang: FieldLang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // ignore (private mode)
  }
}
