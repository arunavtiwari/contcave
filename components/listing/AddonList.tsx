import getAddons from '@/app/actions/getAddons';
import React, { useCallback, useState } from 'react';
import { motion } from "framer-motion";

const AddonItem = ({ addon, onChange, addonList }: any) => {
  const [quantity, setQuantity] = useState(0);

  const handleIncrement = useCallback(() => {
    setQuantity((prevQuantity: number) => {
      let quant = prevQuantity + 1;
      onChange(quant);
      return quant
    });
  }, [onChange]);

  const handleDecrement = useCallback(() => {
    setQuantity((prevQuantity: number) => {
      let quant = (prevQuantity > 0 ? prevQuantity - 1 : 0);
      onChange(quant);
      return quant;
    });
  }, [onChange]);

  return (
    <motion.div
      initial={{
        x: 200,
        opacity: 0,
      }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} className="flex space-x-4 items-center">
      <div className="rounded shadow-lg border h-fit w-fit">
        <img
          src={addonList.find((item: { name: string; imageUrl: string }) => item.name === addon.name)?.imageUrl || addon.imageUrl}
          alt={`${addon.name}`}
          className="h-16 w-16 rounded"
        />
      </div>
      <div className='text-sm'>
        <p><strong>{addon.name}</strong></p>
        <p>₹ {addon.price}</p>


        {quantity === 0 ? (
          <button
            onClick={handleIncrement}
            className="bg-rose-500 text-white px-4 py-1 mt-1 rounded-lg"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center mt-1">
            <button
              onClick={handleDecrement}
              className="text-white bg-rose-500 px-2 py-1 rounded-lg"
            >
              -
            </button>
            <span className="px-4">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="text-white bg-green-500 px-2 py-1 rounded-lg"
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
  const handleQuantity = ((addon: any, quantity: number) => {
    addon.quantity = quantity;
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
            onChange={(quantity: number) => handleQuantity(addon, quantity)}
            addonList={addonList}
          />
        ))}
      </div>
    </div>
  );
};

export default AddonsList;


