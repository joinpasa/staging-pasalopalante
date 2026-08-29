import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";

const testimonials = [
  {
    quote_es: "Me uní a Pásalo Pa'lante porque creo en el poder del impulso colectivo. Puerto Rico me crió con orgullo, y regresar como adulto me recordó cuánta fuerza vive en esta isla y en su gente. Cuando nos apoyamos unos a otros, todos avanzamos. Ese es el tipo de comunidad que quiero ayudar a desarrollar: arraigada en la conexión, impulsada por un propósito y construida para perdurar.",
    quote_en: "I joined Pásalo Pa'lante because I believe in the power of collective momentum. Puerto Rico raised me with pride, and returning as an adult reminded me how much strength lives on this island and in its people. When we support each other, we all move forward. That's the kind of community I want to help build — rooted in connection, driven by purpose, and built to last.",
    author: "Adianice Correa",
    title: "PR Resident & Founder of Selva Boutique Hotel",
  },
  {
    quote_es: "Cuando vi lo que Puerto Rico logró — más de un millón de actos de bondad — supe que esto era algo que el mundo necesitaba. Lo estamos trayendo a nuestra comunidad.",
    quote_en: "When I saw what Puerto Rico accomplished — over a million acts of kindness — I knew this was something the world needed. We're bringing it to our community next.",
    author: "International Ambassador",
    title: "Global Community Leader",
  },
  {
    quote_es: "Nuestros estudiantes no solo participaron — lideraron. Diseñaron sus propias tarjetas de bondad y retaron a cada salón. Este movimiento les dio algo en qué creer.",
    quote_en: "Our students didn't just participate — they led. They designed their own kindness cards and challenged every classroom. This movement gave them something to believe in.",
    author: "Educator",
    title: "School Program Coordinator",
  },
];

const Testimonials = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [current, setCurrent] = useState(0);
  const { lang } = useLanguage();

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  const t = testimonials[current];
  const quote = lang === "es" && t.quote_es ? t.quote_es : t.quote_en;

  return (
    <section ref={ref} className="bg-warm-blush section-padding section-spacing">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Quote className="w-12 h-12 text-warm-terracotta/30 mx-auto mb-8" />

          <p className="body-lg text-foreground italic mb-8 leading-relaxed">
            "{quote}"
          </p>

          <p className="font-bold text-foreground">{t.author}</p>
          <p className="text-sm text-muted-foreground">{t.title}</p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={prev}
              className="w-12 h-12 rounded-full border-2 border-warm-terracotta/30 flex items-center justify-center hover:bg-warm-terracotta/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-warm-terracotta" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === current ? "bg-warm-terracotta" : "bg-warm-terracotta/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-12 h-12 rounded-full border-2 border-warm-terracotta/30 flex items-center justify-center hover:bg-warm-terracotta/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-warm-terracotta" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
