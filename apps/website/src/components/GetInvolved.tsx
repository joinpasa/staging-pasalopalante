import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { useLanguage } from "@shared/contexts/LanguageContext";
import AmbassadorForm from "@/components/AmbassadorForm";

import build1 from "@/assets/getinvolved-build-1.jpg";
import build2 from "@/assets/getinvolved-build-2.jpg";
import build3 from "@/assets/getinvolved-build-3.jpg";
import fund1 from "@/assets/getinvolved-fund-1.jpg";
import fund2 from "@/assets/getinvolved-fund-2.jpg";
import fund3 from "@/assets/getinvolved-fund-3.jpg";
import door1 from "@/assets/getinvolved-door-1.jpg";
import door2 from "@/assets/getinvolved-door-2.jpg";
import door3 from "@/assets/getinvolved-door-3.jpg";

const AutoCarousel = ({ images, alt, interval = 8000 }: { images: string[]; alt: string; interval?: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${alt} ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
          draggable={false}
        />
      ))}
    </div>
  );
};

const DonateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="headline-md text-foreground">Donate to Te Amo PR</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Thank you for your interest in donating to Te Amo PR (operating as Cities of Love PR, and previously PR I Love You).</p>
        <p>To make your donation, please click the Donate button:</p>
        <div className="flex justify-center py-2">
          <a href="https://www.paypal.com/ncp/payment/LQT3G3GLS8SWS" target="_blank" rel="noopener noreferrer" className="btn-primary inline-block px-8 py-3 text-center">Donate Now</a>
        </div>
        <p>For checks, wire transfers, ACH deposits, money orders or other alternative methods, please write to us at:{" "}
          <a href="mailto:info@teamopr.org" className="text-warm-terracotta font-medium underline">info@teamopr.org</a>
        </p>
        <p>Thank you very much for your generous donation.</p>
        <p className="italic">Sincerely,<br />Te Amo PR Team</p>
      </div>
    </DialogContent>
  </Dialog>
);

const GetInvolved = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();
  const [ambassadorOpen, setAmbassadorOpen] = useState(false);

  const columns = [
    {
      images: [build1, build2, build3],
      heading: t.getInvolved.buildHeading,
      body: t.getInvolved.buildBody,
      ctas: [{ label: t.getInvolved.buildCta, href: "#ambassador", onClick: () => setAmbassadorOpen(true) }],
      highlighted: false,
      interval: 10000,
      desktopOrder: "md:order-1",
      mobileOrder: "order-2",
    },
    {
      images: [fund1, fund2, fund3],
      heading: t.getInvolved.fundHeading,
      body: t.getInvolved.fundBody,
      ctas: [{ label: t.getInvolved.fundCta, href: "https://www.paypal.com/ncp/payment/LQT3G3GLS8SWS", onClick: undefined }],
      highlighted: true,
      interval: 8000,
      desktopOrder: "md:order-2",
      mobileOrder: "order-1",
    },
    {
      images: [door1, door2, door3],
      heading: t.getInvolved.doorHeading,
      body: t.getInvolved.doorBody,
      ctas: [{ label: t.getInvolved.doorCta, href: "mailto:Cyao@teamopr.org", onClick: undefined }],
      highlighted: false,
      interval: 12000,
      desktopOrder: "md:order-3",
      mobileOrder: "order-3",
    },
  ];

  return (
    <>
      <section id="get-involved" ref={ref} className="section-padding section-spacing bg-warm-sand">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr] gap-6 lg:gap-8 items-stretch">
            {columns.map((col, i) => (
              <motion.div
                key={col.heading}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`flex flex-col rounded-2xl overflow-hidden transition-shadow duration-300 ${col.mobileOrder} ${col.desktopOrder} ${
                  col.highlighted ? "shadow-2xl md:scale-105 md:-my-4 z-10" : "bg-card shadow-md"
                }`}
                style={col.highlighted ? { backgroundColor: '#F5E6E0' } : undefined}
              >
                <div className="w-full h-52 overflow-hidden">
                  <AutoCarousel images={col.images} alt={col.heading} interval={col.interval} />
                </div>
                <div className="flex flex-col flex-1 text-center" style={{ padding: '2rem 2rem 2.5rem 2rem' }}>
                  <h3 className="headline-md mb-3 text-foreground">{col.heading}</h3>
                  <p className="body-md mb-6 text-muted-foreground">{col.body}</p>
                  <div className="space-y-3 mt-auto w-full">
                    {col.ctas.map((cta) => {
                      const btnClass = `w-full ${
                        col.highlighted
                          ? "inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-lg bg-primary text-primary-foreground"
                          : "btn-secondary"
                      }`;
                      return (
                        <div key={cta.label}>
                          {cta.onClick ? (
                            <button type="button" onClick={cta.onClick} className={btnClass}>
                              {cta.label}
                            </button>
                          ) : (
                            <a
                              href={cta.href}
                              target={cta.href.startsWith("http") ? "_blank" : undefined}
                              rel={cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
                              className={btnClass}
                            >
                              {cta.label}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <AmbassadorForm open={ambassadorOpen} onOpenChange={setAmbassadorOpen} />
    </>
  );
};

export default GetInvolved;
