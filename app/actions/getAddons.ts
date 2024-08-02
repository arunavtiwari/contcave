import prisma from "@/lib/prismadb";



export default async function getAddons() {
  try {
    const addons: any[] = [
      {
     
        "name": "Continuous Lights",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/71jaWAawpJL.jpg",
       
      },
      {
     
        "name": "Softboxes (Various Sizes)",
        "price": "",
        "width":102,
        "imageUrl" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8FxrNhuaNSlElRKFRNPFhz8iT0aCQyrdHaQ&s",
       
      },
      {
     
        "name": "Light tripod stands",
        "price": "",
        "imageUrl" : "https://boxtudio.in/cdn/shop/files/61zSaDY0HkL._SL1500.jpg?v=1714824446&width=1426",
       
      },
      {
     
        "name": "Umbrellas",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/41omWB1LNHL._SY300_SX300_QL70_FMwebp_.jpg",
       
      },
      {
     
        "name": "Barn doors",
        "price": "",
        "imageUrl" : "https://www.elinchrom.com/wp-content/uploads/EL26041-Elinchrom-Barndoor-21cm-8.3inch-Kit-wELC-Open-A-1000x667.jpg",
        "width":141
      },
      {
     
        "name": "Color gets",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/41SVdgOnJrL._SX300_SY300_QL70_FMwebp_.jpg",
       
      },
      {
     
        "name": "Honeycomb grid",
        "price": "",
        "width":80,
        "imageUrl" : "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQNA0xQCxxJ9X4kfkPBdA4xm4n1YAgefsEmd2Jo_B8HRCYWCQA5ptuMmIcXgEL55jRaj7bPvZPL65Z8pruQIXTpwA5b_id6h9GCyUA85jvuYtbvU2Rf5JOMeno",
       
      },
      {
     
        "name": "Snoots & Reflectors",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/81YrJ4hbMzL.__AC_SX300_SY300_QL70_FMwebp_.jpg",
       
      },
      {
     
        "name": "Beaufy dish",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/41nMA8420bL._SX300_SY300_QL70_FMwebp_.jpg",
       
      },
      {
     
        "name": "Greenscreen",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/31tiHJOlflL._SX300_SY300_QL70_FMwebp_.jpg",
       
      },
      {
     
        "name": "Boom Stands",
        "price": "",
        "width":65,
        "imageUrl" : "https://m.media-amazon.com/images/I/61qFp4fAnlL._SY879_.jpg",
       
      },
      {
     
        "name": "Light-stands",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/51zhVVMvqsL._SX679_.jpg",
       
      },
      {
     
        "name": "Reflectors (5 in 1)",
        "price": "",
        "imageUrl" : "https://m.media-amazon.com/images/I/314FPi9E0xL._SX300_SY300_QL70_FMwebp_.jpg",
       
      },
    ]
    if (!addons || !addons.length) {
      return [];
    }

    const safeaddons = addons.map((list) => ({
      ...list,
      createdAt: list.createdAt instanceof Date ? list.createdAt.toISOString() : list.createdAt as string,
    }));

    return safeaddons;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
