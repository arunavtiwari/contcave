"use server";



import { Addon } from '@/types/addon';



export default async function getAddons() {
  try {
    const addons: Addon[] = [
      {
        "name": "Continuous LED Light",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8pTbwJTrpJNf3KUcESm46obA40CUCpIuk7w&s",
      },
      {
        "name": "Softboxes (Various Sizes)",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/61LJtcA46FL._AC_UF1000,1000_QL80_.jpg",
      },
      {
        "name": "Video Light",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/71lP-jgy6sS.jpg",
      },
      {
        "name": "Scrim/Skimmer",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/81BWcQPjf3L._AC_UF1000,1000_QL80_.jpg",
      },
      {
        "name": "RGB Stick",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/51G22DNXzGL._AC_UF350,350_QL80_.jpg",
      },
      {
        "name": "Barn Door & Snoot",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/41y0lXbWhfL._AC_SR290,290_.jpg",
      },
      {
        "name": "Honeycomb grid",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQNA0xQCxxJ9X4kfkPBdA4xm4n1YAgefsEmd2Jo_B8HRCYWCQA5ptuMmIcXgEL55jRaj7bPvZPL65Z8pruQIXTpwA5b_id6h9GCyUA85jvuYtbvU2Rf5JOMeno",
      },
      {
        "name": "Snoots & Reflectors",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/81YrJ4hbMzL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
      },
      {
        "name": "Beaufy dish",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/41nMA8420bL._SX300_SY300_QL70_FMwebp_.jpg",
      },
      {
        "name": "Greenscreen",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/31tiHJOlflL._SX300_SY300_QL70_FMwebp_.jpg",
      },
      {
        "name": "Boom Stands",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/61qFp4fAnlL._SY879_.jpg",
      },
      {
        "name": "Light-stands",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/51zhVVMvqsL._SX679_.jpg",
      },
      {
        "name": "Reflectors (5 in 1)",
        "price": 0,
        "qty": 0,
        "imageUrl": "https://m.media-amazon.com/images/I/41znc7vqQ+L._AC_UF1000,1000_QL80_.jpg",
      },
    ]
    if (!addons || !addons.length) {
      return [];
    }

    return addons;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
