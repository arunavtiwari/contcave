import prisma from "@/lib/prismadb";



export default async function getAddons() {
  try {
    const addons: any[] = [
      {
     
        "name": "Continuous Lights",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Softboxes (Various Sizes)",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Light tripod stands",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Umbrellas",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Barn doors",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Color gets",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Honeycomb grid",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Snoots & Reflectors",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Beaufy dish",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Greenscreen",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Boom Stands",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Light-stands",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
      },
      {
     
        "name": "Reflectors (5 in 1)",
        "price": "",
        "imageUrl" : "https://mediaserver.goepson.com/ImConvServlet/imconv/362c003b777a825faf6f2ed9bbf10fecc4fd4f57/1200Wx1200H?use=banner&hybrisId=B2C&assetDescr=LS12000B_1",
       
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
