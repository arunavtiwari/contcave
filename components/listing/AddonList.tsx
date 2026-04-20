import "swiper/css";
import "swiper/css/free-mode";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Heading from "@/components/ui/Heading";
import { Addon } from "@/types/addon";
type AddonListItem = { name: string; imageUrl?: string };

type AddonItemProps = {
  addon: Addon;
  imgUrl?: string;
  qty: number;
  onQtyChange: (nextQty: number) => void;
};

const toPrice = (v: number | string | undefined) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const sig = (arr: Addon[]) => arr.map(a => `${a.name}|${toPrice(a.price)}|${a.qty ?? 0}`).sort().join(",");

const AddonItem: React.FC<AddonItemProps> = ({ addon, imgUrl, qty, onQtyChange }) => {
  const maxQty = addon.qty || Infinity;
  const inc = useCallback(() => onQtyChange(Math.min(qty + 1, maxQty)), [qty, onQtyChange, maxQty]);
  const dec = useCallback(() => onQtyChange(Math.max(0, qty - 1)), [qty, onQtyChange]);
  const add = useCallback(() => onQtyChange(1), [onQtyChange]);

  const resolvedImg = imgUrl || addon.imageUrl || "";
  const atMax = qty >= maxQty;

  return (
    <div className="flex gap-4 items-center bg-muted/30 rounded-lg p-2 border border-border/10 shadow-xs">
      <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden">
        <Image
          src={resolvedImg}
          alt={addon.name}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>

      <div className="text-sm overflow-hidden flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-0.5 w-full">
          <p className="truncate text-base font-semibold text-foreground" title={addon.name}>
            {addon.name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-muted-foreground text-sm"> {toPrice(addon.price)}</p>
            {Number.isFinite(maxQty) && (
              <>
                <span className="h-1 w-1 bg-border rounded-full shrink-0"></span>
                <p className="text-muted-foreground text-sm">
                  {maxQty === 1 ? "Only 1 available" : `${maxQty} available`}
                </p>
              </>
            )}
          </div>
        </div>

        {qty === 0 ? (
          <button onClick={add} className="bg-foreground text-background h-8 rounded-full">
            ADD
          </button>
        ) : (
          <div className="flex items-center w-full">
            <button
              onClick={dec}
              className="text-foreground/80 bg-muted hover:bg-muted/80 h-8 w-20 rounded-l-xl text-lg font-medium transition border border-border"
            >
              -
            </button>
            <span className="bg-background text-foreground border-y flex items-center justify-center border-border h-8 w-full text-center">
              {qty}
            </span>
            <button
              onClick={inc}
              disabled={atMax}
              className={`h-8 w-20 rounded-r-xl text-lg font-medium transition border border-border ${atMax ? "bg-muted text-muted-foreground/60 cursor-not-allowed" : "text-foreground/80 bg-muted hover:bg-muted/80"}`}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

type AddonsListProps = {
  addons: Addon[];
  onChange: (selected: Addon[]) => void;
  addonList?: AddonListItem[];
};

const AddonsList: React.FC<AddonsListProps> = ({ addons = [], onChange, addonList = [] }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    const next: Record<string, number> = {};
    addons.forEach(a => { if (a?.name) next[a.name] = 0; });
    setQuantities(next);
    lastSigRef.current = "";
  }, [addons]);

  useEffect(() => {
    const withQty = addons.map(a => ({ ...a, qty: quantities[a.name] ?? 0, price: toPrice(a.price) }));
    const selected = withQty.filter(a => (a.qty ?? 0) > 0 && toPrice(a.price) > 0);
    const nextSig = sig(selected);
    if (nextSig !== lastSigRef.current) {
      lastSigRef.current = nextSig;
      onChange(selected);
    }
  }, [addons, quantities, onChange]);

  const findImg = useCallback(
    (name?: string) => addonList.find(i => i.name === name)?.imageUrl,
    [addonList]
  );

  const handleQtyChange = useCallback((addon: Addon, nextQty: number) => {
    setQuantities(prev => ({ ...prev, [addon.name]: Math.max(0, nextQty) }));
  }, []);

  const renderAddonItem = useCallback((addon: Addon) => {
    const qty = quantities[addon.name] ?? 0;
    const imgUrl = findImg(addon.name);
    return (
      <AddonItem
        addon={addon}
        imgUrl={imgUrl}
        qty={qty}
        onQtyChange={(q) => handleQtyChange(addon, q)}
      />
    );
  }, [quantities, findImg, handleQtyChange]);

  return (
    <div>
      <Heading
        title="Add-ons"
        variant="h5"
        className="mb-4"
      />

      {/* Mobile: Swiper carousel —  swipe only, no arrows, free-mode momentum */}
      <div className="sm:hidden">
        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={12}
          freeMode={{
            enabled: true,
            momentum: true,
            momentumRatio: 0.8,
            momentumBounceRatio: 0.6,
          }}
          cssMode={true}
          className="overflow-visible!"
        >
          {addons.length > 0 &&
            addons.map(addon => (
              <SwiperSlide key={addon.id || addon.name} style={{ width: "85%" }}>
                <div className="py-1">
                  {renderAddonItem(addon)}
                </div>
              </SwiperSlide>
            ))}
        </Swiper>
      </div>

      {/* Desktop: Original grid layout */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4">
        {addons.length > 0 &&
          addons.map(addon => (
            <div key={addon.id || addon.name}>
              {renderAddonItem(addon)}
            </div>
          ))}
      </div>
    </div>
  );
};

export default AddonsList;


