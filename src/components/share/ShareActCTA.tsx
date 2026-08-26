import { useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUI } from "@/contexts/UIContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ShareActFlow from "./ShareActFlow";

export default function ShareActCTA() {
  const { t } = useLanguage();
  const { setShareModalOpen } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    setShareModalOpen(open);
    return () => setShareModalOpen(false);
  }, [open, setShareModalOpen]);


  return (
    <>
      <section
        id="share"
        ref={ref}
        className="section-padding section-spacing bg-warm-sand relative overflow-hidden"
      >
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-5"
          >
            {t.share.sectionEyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="headline-xl text-foreground mb-6"
          >
            {t.share.sectionHeading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="body-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {t.share.sectionBody}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-3 btn-primary !py-5 !px-10 text-lg"
          >
            <Heart size={20} className="fill-current" />
            {t.share.sectionCta}
          </motion.button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="headline-md text-foreground">
              {t.share.sectionHeading}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            <ShareActFlow onClose={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
