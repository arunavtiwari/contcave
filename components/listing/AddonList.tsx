import { useCallback, useEffect, useRef, useState } from "react";


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
  const inc = useCallback(() => onQtyChange(qty + 1), [qty, onQtyChange]);
  const dec = useCallback(() => onQtyChange(Math.max(0, qty - 1)), [qty, onQtyChange]);
  const add = useCallback(() => onQtyChange(1), [onQtyChange]);

  return (
    // <motion.div
    //   initial={{ x: -200, opacity: 0 }}
    //   transition={{ duration: 1 }}
    //   whileInView={{ opacity: 1, x: 0 }}
    //   viewport={{ once: true }}
    //   className="flex space-x-4 items-center bg-neutral-100 rounded-lg p-2 border border-neutral-200"
    // >
    <div className="flex space-x-4 items-center bg-neutral-100 rounded-lg p-2 border border-neutral-200">
      <div className="rounded-lg h-fit w-fit">
        <div
          className="h-16 w-16 rounded-lg bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${imgUrl || addon.imageUrl || ""})`, backgroundBlendMode: "multiply" }}
        />
      </div>

      <div className="text-sm overflow-hidden">
        <p className="truncate w-full" title={addon.name}>
          <strong>{addon.name}</strong>
        </p>
        <p>₹ {toPrice(addon.price)}</p>

        {qty === 0 ? (
          <button onClick={add} className="bg-black text-white px-4 py-1.5 mt-1 rounded-full">
            ADD
          </button>
        ) : (
          <div className="flex items-center mt-1">
            <button
              onClick={dec}
              className="text-[#4B4B4B] bg-[#F5F3F0] hover:bg-[#EDEAE6] h-8 w-8 rounded-l-xl text-lg font-medium transition"
            >
              −
            </button>
            <span className="px-5 bg-white text-[#2F2F2F] border border-[#D6D3D1] py-1.5 w-13 text-center">
              {qty}
            </span>
            <button
              onClick={inc}
              className="text-[#4B4B4B] bg-[#F5F3F0] hover:bg-[#EDEAE6] h-8 w-8 rounded-r-xl text-lg font-medium transition"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
    // </motion.div>
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

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Add-ons</h2>
      <div className="grid grid-cols-2 gap-4">
        {addons.length > 0 &&
          addons.map(addon => {
            const qty = quantities[addon.name] ?? 0;
            const imgUrl = findImg(addon.name);
            return (
              <AddonItem
                key={addon.id || addon.name}
                addon={addon}
                imgUrl={imgUrl}
                qty={qty}
                onQtyChange={(q) => handleQtyChange(addon, q)}
              />
            );
          })}
      </div>
    </div>
  );
};

export default AddonsList;
