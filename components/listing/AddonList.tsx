import getAddons from '@/app/actions/getAddons';
import React, { useCallback, useState, useEffect } from 'react';
import { motion } from "framer-motion";

const AddonItem = ({ addon, onChange, addonList }: any) => {
  const [qty, setQuantity] = useState(0);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => prev + 1);
  }, []);

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  useEffect(() => {
    onChange(qty);
  }, [qty, onChange]);

  return (
    <motion.div
      initial={{ x: -200, opacity: 0 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex space-x-4 items-center bg-neutral-100 rounded-lg p-2 border border-neutral-200"
    >
      <div className="rounded-lg h-fit w-fit">
        <div
          className="h-16 w-16 rounded-lg bg-neutral-100 bg-cover bg-center"
          style={{
            backgroundImage: `url(${addonList.find((item) => item.name === addon.name)?.imageUrl ||
              addon.imageUrl
              })`,
            backgroundBlendMode: 'multiply',
          }}
        ></div>
      </div>
      <div className="text-sm overflow-hidden">
        <p className="truncate w-full" title={addon.name}>
          <strong>{addon.name}</strong>
        </p>
        <p>₹ {addon.price}</p>

        {qty === 0 ? (
          <button
            onClick={handleIncrement}
            className="bg-black text-white px-4 py-1.5 mt-1 rounded-full"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center mt-1">
            <button
              onClick={handleDecrement}
              className="text-white bg-rose-500 h-8 w-8 rounded-l-xl text-xl"
            >
              -
            </button>
            <span className="px-5 bg-neutral-300 py-1.5 w-13">{qty}</span>
            <button
              onClick={handleIncrement}
              className="text-white bg-green-500 h-8 w-8 rounded-r-xl text-xl leading-none"
            >
              +
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const AddonsList = ({ addons, onChange, addonList }: any) => {
  const handleQuantity = ((addon: any, qty: number) => {
    addon.qty = qty;
    addons[addons.findIndex((item: any) => item.name == addon.name)] = addon;
    onChange(addons);
  });
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Add-ons</h2>
      <div className="grid grid-cols-2 gap-4">
        {addons && addons.length > 0 && addons.map((addon: any, index: number) => (
          <AddonItem
            key={index}
            addon={addon}
            onChange={(qty: number) => handleQuantity(addon, qty)}
            addonList={addonList}
          />
        ))}
      </div>
    </div>
  );
};

export default AddonsList;


