import React, { useContext, useState } from 'react';
import { CategoryContext } from '../context/CategoryContext';

const Category = ({ cat }: any) => {
  const { category, changeCategory } = useContext(CategoryContext);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      onClick={() => changeCategory(cat.attributes.Title)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`p-4 rounded-lg shadow-md cursor-pointer transition duration-300 ease-in-out ${cat.attributes.Title === category
        ? 'bg-brown text-black'
        : 'bg-black text-white'
        } ${isHovered ? 'transform scale-105' : ''}`}>
      {cat.attributes.Title}
    </div>
  );
};

export default Category;
