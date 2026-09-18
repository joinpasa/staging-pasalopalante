import React, { createRef, useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";

import community1 from "@/assets/community-1.jpg";
import community2 from "@/assets/community-2.jpg";
import community3 from "@/assets/community-3.jpg";
import community4 from "@/assets/community-4.jpg";
import community5 from "@/assets/community-5.jpg";
import community6 from "@/assets/community-6.jpg";
import community7 from "@/assets/community-7.jpg";
import kindnessAct from "@/assets/kindness-act.jpg";
import kindnessBabyHand from "@/assets/kindness-baby-hand.jpg";
import kindnessElderlyDog from "@/assets/kindness-elderly-dog.jpg";
import kindnessDoorstep from "@/assets/kindness-doorstep.jpg";
import kindnessNewborn from "@/assets/kindness-newborn.jpg";
import kindnessCouple from "@/assets/kindness-couple.jpg";
import kindnessKitten from "@/assets/kindness-kitten.jpg";
import kindnessHug from "@/assets/kindness-hug.jpg";
import kindnessJoy from "@/assets/kindness-joy.jpg";
import kindnessBabyHat from "@/assets/kindness-baby-hat.jpg";
import kindnessCompassion from "@/assets/kindness-compassion.jpg";
import trailKindnessFoodShare from "@/assets/trail-kindness-food-share.jpg";
import trailKindnessStreetHelp from "@/assets/trail-kindness-street-help.jpg";
import trailKindnessDogWalk from "@/assets/trail-kindness-dog-walk.jpg";
import trailKindnessCommunityGarden from "@/assets/trail-kindness-community-garden.jpg";
import trailKindnessPvcWork from "@/assets/trail-kindness-pvc-work.jpg";
import trailKindnessTarp from "@/assets/trail-kindness-tarp.jpg";
import trailKindnessRoofRepair from "@/assets/trail-kindness-roof-repair.jpg";
import trailKindnessCoffeeServe from "@/assets/trail-kindness-coffee-serve.jpg";
import trailKindnessDriveThru from "@/assets/trail-kindness-drive-thru.jpg";
import trailKindnessSign from "@/assets/trail-kindness-sign.jpg";
import trail2KindnessHelados from "@/assets/trail2-kindness-helados.jpg";
import trail2KindnessCraftWorkshop from "@/assets/trail2-kindness-craft-workshop.jpg";
import trail2KindnessMiniHouse from "@/assets/trail2-kindness-mini-house.jpg";
import trail2KindnessHospitalVisit from "@/assets/trail2-kindness-hospital-visit.jpg";
import trail2KindnessBloodDonation from "@/assets/trail2-kindness-blood-donation.jpg";
import trail2KindnessFootCare from "@/assets/trail2-kindness-foot-care.jpg";
import trail2KindnessKidsCrafts from "@/assets/trail2-kindness-kids-crafts.jpg";
import trail2KindnessYouthCards from "@/assets/trail2-kindness-youth-cards.jpg";
import trail2KindnessWaterDelivery from "@/assets/trail2-kindness-water-delivery.jpg";
import trail2KindnessBooth from "@/assets/trail2-kindness-booth.jpg";

const existingImages = [
  community1, community2, community3, community4, community5, community6, community7,
  kindnessAct, kindnessBabyHand, kindnessElderlyDog, kindnessDoorstep, kindnessNewborn,
  kindnessCouple, kindnessKitten, kindnessHug, kindnessJoy, kindnessBabyHat, kindnessCompassion,
];

const uploadedTrailImages = [
  trailKindnessFoodShare, trailKindnessStreetHelp, trailKindnessDogWalk, trailKindnessCommunityGarden,
  trailKindnessPvcWork, trailKindnessTarp, trailKindnessRoofRepair, trailKindnessCoffeeServe,
  trailKindnessDriveThru, trailKindnessSign, trail2KindnessHelados, trail2KindnessCraftWorkshop,
  trail2KindnessMiniHouse, trail2KindnessHospitalVisit, trail2KindnessBloodDonation, trail2KindnessFootCare,
  trail2KindnessKidsCrafts, trail2KindnessYouthCards, trail2KindnessWaterDelivery, trail2KindnessBooth,
];

const intersperseImages = (primary: string[], inserts: string[]) => {
  const mixed: string[] = [];
  const maxLength = Math.max(primary.length, inserts.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < primary.length) mixed.push(primary[i]);
    if (i < inserts.length) mixed.push(inserts[i]);
  }
  return mixed;
};

const allImages = intersperseImages(existingImages, uploadedTrailImages);

interface ImageMouseTrailProps {
  items: string[];
  children?: ReactNode;
  className?: string;
  imgClass?: string;
  distance?: number;
  maxNumberOfImages?: number;
  fadeAnimation?: boolean;
}

function ImageCursorTrail({
  items, children, className, maxNumberOfImages = 5,
  imgClass = "w-40 h-48", distance = 20, fadeAnimation = false,
}: ImageMouseTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef(items.map(() => createRef<HTMLImageElement>()));
  const currentZIndexRef = useRef(1);

  let globalIndex = 0;
  let last = { x: 0, y: 0 };

  const activate = (image: HTMLImageElement, x: number, y: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    image.style.left = `${x - containerRect.left}px`;
    image.style.top = `${y - containerRect.top}px`;
    if (currentZIndexRef.current > 40) currentZIndexRef.current = 1;
    image.style.zIndex = String(currentZIndexRef.current);
    currentZIndexRef.current++;
    image.dataset.status = "active";
    if (fadeAnimation) setTimeout(() => { image.dataset.status = "inactive"; }, 1500);
    last = { x, y };
  };

  const distanceFromLast = (x: number, y: number) => Math.hypot(x - last.x, y - last.y);
  const deactivate = (image: HTMLImageElement) => { image.dataset.status = "inactive"; };

  const handleOnMove = (e: { clientX: number; clientY: number }) => {
    if (distanceFromLast(e.clientX, e.clientY) > window.innerWidth / distance) {
      const lead = refs.current[globalIndex % refs.current.length].current;
      const tail = refs.current[(globalIndex - maxNumberOfImages) % refs.current.length]?.current;
      if (lead) activate(lead, e.clientX, e.clientY);
      if (tail) deactivate(tail);
      globalIndex++;
    }
  };

  return (
    <div
      onMouseMove={(e) => handleOnMove(e.nativeEvent)}
      onTouchMove={(e) => handleOnMove(e.touches[0])}
      ref={containerRef}
      className={`relative grid place-content-center overflow-hidden ${className ?? ""}`}
    >
      {items.map((item, index) => (
        <img
          key={index}
          ref={refs.current[index]}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl object-cover opacity-0 transition-opacity duration-500 pointer-events-none data-[status=active]:opacity-100 data-[status=inactive]:opacity-0 ${imgClass}`}
          data-status="inactive"
          src={item}
          alt=""
        />
      ))}
      {children}
    </div>
  );
}

const VisualTransition = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  const text = (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1 }}
      className="text-center pointer-events-none select-none relative z-[1] px-6"
    >
      <span className="block headline-xl text-foreground/10 leading-[1.1]">{t.visualTransition.line1}</span>
      <span className="block headline-xl text-foreground/10 leading-[1.1]">{t.visualTransition.line2}</span>
      <span className="block headline-xl text-foreground/10 leading-[1.1]">{t.visualTransition.line3}</span>
    </motion.div>
  );

  return (
    <div ref={ref}>
      {inView ? (
        // ImageCursorTrail mounts ~37 real <img> tags (one per available
        // photo) up front so the cursor-follow effect has no popping the
        // first time it activates — fine once this section is actually in
        // view, but rendering it before that forced every visitor to fetch
        // all of them immediately on page load, for an effect most people
        // scrolling past never even trigger. Deferring the whole component
        // (not just the images inside it) until inView fixes that.
        <ImageCursorTrail
          items={allImages}
          className="h-screen w-full cursor-crosshair"
          imgClass="w-40 h-48"
          maxNumberOfImages={5}
          distance={20}
          fadeAnimation
        >
          {text}
        </ImageCursorTrail>
      ) : (
        <div className="h-screen w-full grid place-content-center">{text}</div>
      )}
    </div>
  );
};

export default VisualTransition;
