import {
  Award,
  Clock,
  Coffee,
  GraduationCap,
  Gift,
  HandCoins,
  HeartHandshake,
  House,
  Mail,
  Megaphone,
  MessageCircleHeart,
  Newspaper,
  PackageOpen,
  StickyNote,
  Store,
  TreePine,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./i18n";
import type { Kind } from "./kinds";
import { MOMENTS } from "./moments";

/**
 * The Ideas tab (25 Nov 2026): a challenge for the week, ideas to try for each kind of member,
 * and the days worth planning for. Written in the house style: warm, short, no exclamation marks.
 */

type Words = { en: [string, string]; es: [string, string] };

export const CHALLENGES: Words[] = [
  { en: ["Thank someone who rarely hears it", "A cleaner, a driver, a cook, a caretaker. Say thank you, by name."], es: ["Agradece a quien casi nunca lo escucha", "Quien limpia, quien conduce, quien cocina, quien cuida. Dale las gracias por su nombre."] },
  { en: ["One kind note a day", "Leave a short note for someone each day this week: a colleague, a neighbour, a stranger."], es: ["Una nota amable al día", "Deja una nota corta cada día de esta semana: a un compañero, a un vecino, a alguien que no conoces."] },
  { en: ["Give an hour", "Spend one hour helping a local group, a neighbour or a friend who needs a hand."], es: ["Regala una hora", "Dedica una hora a ayudar a un grupo local, a un vecino o a alguien que necesite una mano."] },
  { en: ["Share a meal", "Cook, bring or buy a meal for someone who could use one."], es: ["Comparte una comida", "Cocina, lleva o compra una comida para alguien que la necesite."] },
  { en: ["Welcome someone new", "Find the newest person at your school, work or street and help them feel at home."], es: ["Da la bienvenida a alguien nuevo", "Busca a la persona más nueva en tu escuela, trabajo o calle y ayúdala a sentirse en casa."] },
  { en: ["Listen, really listen", "Ask someone how they are, put your phone away, and listen."], es: ["Escucha de verdad", "Pregúntale a alguien cómo está, guarda el teléfono y escucha."] },
  { en: ["Clean up a shared space", "A park, a beach, a classroom or the office kitchen. Leave it better than you found it."], es: ["Limpia un espacio compartido", "Un parque, una playa, un salón o la cocina de la oficina. Déjalo mejor de lo que lo encontraste."] },
  { en: ["Pass on what you don't use", "Clothes, books or toys in good shape, for someone who will use them."], es: ["Pasa pa'lante lo que no usas", "Ropa, libros o juguetes en buen estado, para alguien que los vaya a usar."] },
  { en: ["Check in on someone", "Call or visit someone who lives alone or has had a hard month."], es: ["Pregunta por alguien", "Llama o visita a alguien que vive solo o que ha tenido un mes difícil."] },
  { en: ["Bring someone in", "Invite a friend, a colleague or another organisation to make their own pledge."], es: ["Suma a alguien", "Invita a un amigo, a un compañero o a otra organización a hacer su propio compromiso."] },
  { en: ["Say it out loud", "Tell someone what you admire about them. Today, not someday."], es: ["Dilo en voz alta", "Dile a alguien lo que admiras de esa persona. Hoy, no algún día."] },
  { en: ["Be kind to yourself too", "Take a rest, a walk or a quiet moment. Kindness starts at home."], es: ["Sé amable contigo también", "Descansa, sal a caminar o regálate un momento tranquilo. La bondad empieza en casa."] },
];

/** The same challenge for everyone all week, Monday to Sunday. */
export function challengeOfWeek(now = new Date()) {
  const monday = new Date("2026-11-23T00:00:00");
  const weeks = Math.floor((now.getTime() - monday.getTime()) / (7 * 86_400_000));
  return CHALLENGES[((weeks % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}

export type Idea = Words & { icon: LucideIcon };

export const IDEAS: Record<Kind, Idea[]> = {
  organisation: [
    { icon: StickyNote, en: ["A kindness wall", "Put up a wall where people pin thank-you notes for each other."], es: ["Un muro de la bondad", "Pon un muro donde la gente deje notas de agradecimiento para otros."] },
    { icon: PackageOpen, en: ["A collection drive", "Food, coats or school supplies for a local shelter or a family in need."], es: ["Una colecta", "Alimentos, abrigos o útiles escolares para un refugio local o una familia que lo necesite."] },
    { icon: HeartHandshake, en: ["Visit a care home", "Bring music, cards or simply time to people who don't get many visitors."], es: ["Visita un hogar de ancianos", "Lleva música, tarjetas o simplemente tu tiempo a quienes reciben pocas visitas."] },
    { icon: Users, en: ["Welcome buddies", "Pair each newcomer with someone who shows them around for their first weeks."], es: ["Compañeros de bienvenida", "Empareja a cada persona que llega con alguien que la acompañe sus primeras semanas."] },
    { icon: Award, en: ["Thank the quiet helpers", "Honour a caretaker, cleaner or volunteer in front of everyone."], es: ["Agradece a quienes ayudan en silencio", "Reconoce frente a todos a quien limpia, cuida o hace voluntariado."] },
    { icon: Megaphone, en: ["A pledge moment", "At your next gathering, invite everyone to make their pledge together."], es: ["Un momento para el compromiso", "En su próxima reunión, invita a todos a hacer su compromiso juntos."] },
    { icon: TreePine, en: ["A clean-up day", "A park, a beach or the street outside your door."], es: ["Un día de limpieza", "Un parque, una playa o la calle frente a tu puerta."] },
    { icon: Newspaper, en: ["Story of the week", "Share one kindness story each week in your newsletter, assembly or service."], es: ["La historia de la semana", "Comparte una historia de bondad cada semana en tu boletín, asamblea o servicio."] },
  ],
  company: [
    { icon: HeartHandshake, en: ["A team volunteer day", "Give your team a day to volunteer with a local nonprofit."], es: ["Un día de voluntariado", "Dale a tu equipo un día para hacer voluntariado con una organización local."] },
    { icon: Megaphone, en: ["Start with a shout-out", "Open each team meeting this week by thanking one person."], es: ["Empieza con un reconocimiento", "Abre cada reunión de esta semana agradeciendo a una persona."] },
    { icon: Mail, en: ["Thank your customers", "Handwritten notes to a few loyal customers or suppliers."], es: ["Agradece a tus clientes", "Notas escritas a mano para algunos clientes o proveedores de siempre."] },
    { icon: Coffee, en: ["Pass it on at the counter", "Cover the next customer's coffee or meal, and tell them why."], es: ["Pásalo pa'lante en el mostrador", "Paga el café o la comida del próximo cliente, y cuéntale por qué."] },
    { icon: Wrench, en: ["Skills for good", "Offer an hour of your team's skills to a nonprofit: design, accounting, legal or IT."], es: ["Talento con propósito", "Ofrece una hora del talento de tu equipo a una organización sin fines de lucro: diseño, contabilidad, legal o tecnología."] },
    { icon: HandCoins, en: ["Match the giving", "Match what your staff give to a local cause this season."], es: ["Iguala las donaciones", "Iguala lo que tu equipo done a una causa local esta temporada."] },
    { icon: Users, en: ["Invite your team to pledge", "Share the pledge link in your team chat and count your pledges together."], es: ["Invita a tu equipo a comprometerse", "Comparte el enlace del compromiso en el chat del equipo y cuenten sus compromisos juntos."] },
    { icon: StickyNote, en: ["A kind welcome", "Have the team write a welcome note for your next new hire."], es: ["Una bienvenida amable", "Que el equipo escriba una nota de bienvenida para la próxima persona que contraten."] },
  ],
  ambassador: [
    { icon: Users, en: ["Bring friends in", "Invite friends to make their own pledge, and tag them when you share."], es: ["Suma a tus amigos", "Invita a tus amigos a hacer su propio compromiso y etiquétalos cuando compartas."] },
    { icon: House, en: ["Check on a neighbour", "Knock, call or leave a note for someone who lives alone."], es: ["Pregunta por un vecino", "Toca la puerta, llama o deja una nota a alguien que vive solo."] },
    { icon: MessageCircleHeart, en: ["Share a moment", "Post one act of kindness with #PassKindnessForward."], es: ["Comparte un momento", "Publica un acto de bondad con #PassKindnessForward."] },
    { icon: Award, en: ["Thank someone by name", "A teacher, a nurse, a driver. Tell them what they did for you."], es: ["Agradece por nombre", "Un maestro, una enfermera, un chofer. Dile lo que hizo por ti."] },
    { icon: Gift, en: ["Give what you don't use", "Clothes, books or toys in good shape."], es: ["Regala lo que no usas", "Ropa, libros o juguetes en buen estado."] },
    { icon: Clock, en: ["Volunteer an hour", "Join a local group for an hour this week."], es: ["Una hora de voluntariado", "Únete a un grupo local por una hora esta semana."] },
    { icon: Store, en: ["Back a small business", "Leave a kind review for a local business you love."], es: ["Apoya un negocio pequeño", "Deja una reseña amable para un negocio local que te encante."] },
    { icon: GraduationCap, en: ["Teach something", "Help someone learn a skill you have, big or small."], es: ["Enseña algo", "Ayuda a alguien a aprender algo que sabes, grande o pequeño."] },
  ],
};

/** International days worth planning for, each with one simple idea. Month and day only. */
const DAYS: { m: number; d: number; en: [string, string]; es: [string, string] }[] = [
  { m: 1, d: 6, en: ["Three Kings Day", "A gift for a child who might not get one."], es: ["Día de Reyes", "Un regalo para un niño o una niña que quizá no reciba uno."] },
  { m: 1, d: 24, en: ["International Day of Education", "Thank a teacher, or give school supplies."], es: ["Día Internacional de la Educación", "Agradece a un maestro o regala útiles escolares."] },
  { m: 2, d: 4, en: ["International Day of Human Fraternity", "Reach out to someone from a different background or faith."], es: ["Día Internacional de la Fraternidad Humana", "Acércate a alguien de otra cultura o fe."] },
  { m: 2, d: 17, en: ["Random Acts of Kindness Day", "Surprise someone you don't know."], es: ["Día de los Actos de Bondad al Azar", "Sorprende a alguien que no conoces."] },
  { m: 2, d: 20, en: ["World Day of Social Justice", "Support a group working for fairness where you live."], es: ["Día Mundial de la Justicia Social", "Apoya a un grupo que trabaja por la justicia donde vives."] },
  { m: 3, d: 8, en: ["International Women's Day", "Celebrate a woman who changed your life."], es: ["Día Internacional de la Mujer", "Celebra a una mujer que cambió tu vida."] },
  { m: 3, d: 20, en: ["International Day of Happiness", "Share what makes your community smile."], es: ["Día Internacional de la Felicidad", "Comparte lo que hace sonreír a tu comunidad."] },
  { m: 4, d: 7, en: ["World Health Day", "Thank a health worker."], es: ["Día Mundial de la Salud", "Agradece a un trabajador de la salud."] },
  { m: 4, d: 22, en: ["Earth Day", "Plant something, or clean up a green space."], es: ["Día de la Tierra", "Siembra algo o limpia un área verde."] },
  { m: 5, d: 15, en: ["International Day of Families", "Do something kind together as a family."], es: ["Día Internacional de las Familias", "Hagan algo amable juntos en familia."] },
  { m: 6, d: 5, en: ["World Environment Day", "A clean-up with your team or class."], es: ["Día Mundial del Medio Ambiente", "Una limpieza con tu equipo o tu clase."] },
  { m: 6, d: 20, en: ["World Refugee Day", "Welcome a family who is new to your area."], es: ["Día Mundial de los Refugiados", "Da la bienvenida a una familia nueva en tu zona."] },
  { m: 7, d: 18, en: ["Nelson Mandela International Day", "Give 67 minutes of service."], es: ["Día Internacional de Nelson Mandela", "Regala 67 minutos de servicio."] },
  { m: 7, d: 30, en: ["International Day of Friendship", "Thank an old friend."], es: ["Día Internacional de la Amistad", "Agradece a una amistad de siempre."] },
  { m: 8, d: 12, en: ["International Youth Day", "Give young people the stage."], es: ["Día Internacional de la Juventud", "Dale el escenario a los jóvenes."] },
  { m: 8, d: 19, en: ["World Humanitarian Day", "Honour the people who help in a crisis."], es: ["Día Mundial de la Asistencia Humanitaria", "Honra a quienes ayudan en una crisis."] },
  { m: 9, d: 5, en: ["International Day of Charity", "Give to a local cause."], es: ["Día Internacional de la Beneficencia", "Apoya una causa local."] },
  { m: 9, d: 21, en: ["International Day of Peace", "Mend a friendship, or bring two people together."], es: ["Día Internacional de la Paz", "Reconcíliate con alguien o une a dos personas."] },
  { m: 10, d: 1, en: ["International Day of Older Persons", "Spend time with an older neighbour."], es: ["Día Internacional de las Personas de Edad", "Comparte tiempo con un vecino mayor."] },
  { m: 10, d: 5, en: ["World Teachers' Day", "Thank a teacher by name."], es: ["Día Mundial de los Docentes", "Agradece a un maestro por su nombre."] },
  { m: 10, d: 10, en: ["World Mental Health Day", "Check in on someone, and on yourself."], es: ["Día Mundial de la Salud Mental", "Pregunta cómo está alguien, y cómo estás tú."] },
  { m: 10, d: 16, en: ["World Food Day", "A food drive for a local pantry."], es: ["Día Mundial de la Alimentación", "Una colecta de alimentos para un banco de comida local."] },
  { m: 11, d: 13, en: ["World Kindness Day", "Share your kindness and invite others to pledge."], es: ["Día Mundial de la Bondad", "Comparte tu bondad e invita a otros a comprometerse."] },
  { m: 11, d: 16, en: ["International Day for Tolerance", "Listen to someone who sees the world differently."], es: ["Día Internacional para la Tolerancia", "Escucha a alguien que ve el mundo de otra manera."] },
  { m: 11, d: 20, en: ["World Children's Day", "Ask children what kindness means to them."], es: ["Día Mundial de la Infancia", "Pregunta a los niños qué significa la bondad para ellos."] },
  { m: 12, d: 3, en: ["International Day of Persons with Disabilities", "Make a space or an event easier for everyone to join."], es: ["Día Internacional de las Personas con Discapacidad", "Haz que un espacio o un evento sea más fácil para que todos participen."] },
  { m: 12, d: 5, en: ["International Volunteer Day", "Thank your volunteers, or volunteer for a day."], es: ["Día Internacional de los Voluntarios", "Agradece a tus voluntarios, o sé voluntario por un día."] },
  { m: 12, d: 10, en: ["Human Rights Day", "Stand with someone who is treated unfairly."], es: ["Día de los Derechos Humanos", "Apoya a alguien que recibe un trato injusto."] },
  { m: 12, d: 20, en: ["International Human Solidarity Day", "Share with someone who has less this season."], es: ["Día Internacional de la Solidaridad Humana", "Comparte con alguien que tiene menos en esta temporada."] },
];

/** GivingTuesday: the Tuesday after the fourth Thursday of November. */
function givingTuesday(year: number) {
  const first = new Date(year, 10, 1);
  const firstThursday = 1 + ((4 - first.getDay() + 7) % 7);
  return new Date(year, 10, firstThursday + 21 + 5);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface Upcoming {
  date: string;
  days: number;
  title: string;
  idea: string | null;
  season: boolean;
}

/** The next few days worth planning for: the season's own moments and international days. */
export function upcomingDays(lang: Lang, count = 5, now = new Date()): Upcoming[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = iso(today);
  const out: Upcoming[] = [];
  const daysTo = (date: string) => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayIso}T12:00:00`).getTime()) / 86_400_000);
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    for (const x of DAYS) {
      const date = iso(new Date(year, x.m - 1, x.d));
      const [title, idea] = lang === "es" ? x.es : x.en;
      out.push({ date, days: daysTo(date), title, idea, season: false });
    }
    const gt = iso(givingTuesday(year));
    out.push({
      date: gt,
      days: daysTo(gt),
      title: "GivingTuesday",
      idea: lang === "es" ? "Un día mundial para dar: tiempo, cosas o palabras amables." : "A global day of giving: time, things or kind words.",
      season: false,
    });
  }
  for (const m of MOMENTS) out.push({ date: m.date, days: daysTo(m.date), title: lang === "es" ? m.es : m.en, idea: null, season: true });
  return out
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.season) - Number(a.season))
    .slice(0, count);
}

export function ideaWords(w: Words, lang: Lang) {
  return lang === "es" ? w.es : w.en;
}
