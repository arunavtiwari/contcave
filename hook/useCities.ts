const indianCities = [
  { name: "Mumbai", state: "Maharashtra", latlng: [19.0760, 72.8777] },
  { name: "Delhi", state: "Delhi", latlng: [28.6139, 77.2090] },
  { name: "Bengaluru", state: "Karnataka", latlng: [12.9716, 77.5946] },
  { name: "Hyderabad", state: "Telangana", latlng: [17.3850, 78.4867] },
  { name: "Chennai", state: "Tamil Nadu", latlng: [13.0827, 80.2707] },
  { name: "Kolkata", state: "West Bengal", latlng: [22.5726, 88.3639] },
  { name: "Pune", state: "Maharashtra", latlng: [18.5204, 73.8567] },

  { name: "Noida", state: "Uttar Pradesh", latlng: [28.5355, 77.3910] },
  { name: "Gurugram", state: "Haryana", latlng: [28.4595, 77.0266] },
  { name: "Ahmedabad", state: "Gujarat", latlng: [23.0225, 72.5714] },
  { name: "Jaipur", state: "Rajasthan", latlng: [26.9124, 75.7873] },
  { name: "Lucknow", state: "Uttar Pradesh", latlng: [26.8467, 80.9462] },
  { name: "Chandigarh", state: "Chandigarh", latlng: [30.7333, 76.7794] },
  { name: "Indore", state: "Madhya Pradesh", latlng: [22.7196, 75.8577] },
  { name: "Goa", state: "Goa", latlng: [15.2993, 74.1240] },
  { name: "Nagpur", state: "Maharashtra", latlng: [21.1458, 79.0882] },

  { name: "Kochi", state: "Kerala", latlng: [9.9312, 76.2673] },
  { name: "Trivandrum", state: "Kerala", latlng: [8.5241, 76.9366] },
  { name: "Surat", state: "Gujarat", latlng: [21.1702, 72.8311] },
  { name: "Vadodara", state: "Gujarat", latlng: [22.3072, 73.1812] },
  { name: "Bhopal", state: "Madhya Pradesh", latlng: [23.2599, 77.4126] },
  { name: "Coimbatore", state: "Tamil Nadu", latlng: [11.0168, 76.9558] },
  { name: "Guwahati", state: "Assam", latlng: [26.1445, 91.7362] },
  { name: "Bhubaneswar", state: "Odisha", latlng: [20.2961, 85.8245] },
  { name: "Dehradun", state: "Uttarakhand", latlng: [30.3165, 78.0322] },
  { name: "Raipur", state: "Chhattisgarh", latlng: [21.2514, 81.6296] },
  { name: "Patna", state: "Bihar", latlng: [25.5941, 85.1376] },
  { name: "Vizag", state: "Andhra Pradesh", latlng: [17.6868, 83.2185] },
  { name: "Vijayawada", state: "Andhra Pradesh", latlng: [16.5062, 80.6480] },

  { name: "Amritsar", state: "Punjab", latlng: [31.6340, 74.8723] },
  { name: "Ludhiana", state: "Punjab", latlng: [30.9010, 75.8573] },
  { name: "Jalandhar", state: "Punjab", latlng: [31.3260, 75.5762] },
  { name: "Udaipur", state: "Rajasthan", latlng: [24.5854, 73.7125] },
  { name: "Jodhpur", state: "Rajasthan", latlng: [26.2389, 73.0243] },
  { name: "Agra", state: "Uttar Pradesh", latlng: [27.1767, 78.0081] },
  { name: "Varanasi", state: "Uttar Pradesh", latlng: [25.3176, 82.9739] },
  { name: "Meerut", state: "Uttar Pradesh", latlng: [28.9845, 77.7064] },

  { name: "Mysore", state: "Karnataka", latlng: [12.2958, 76.6394] },
  { name: "Madurai", state: "Tamil Nadu", latlng: [9.9252, 78.1198] },
  { name: "Mangalore", state: "Karnataka", latlng: [12.9141, 74.8560] },
  { name: "Aurangabad", state: "Maharashtra", latlng: [19.8762, 75.3433] },
  { name: "Nashik", state: "Maharashtra", latlng: [19.9975, 73.7898] },
  { name: "Cuttack", state: "Odisha", latlng: [20.4625, 85.8828] },
  { name: "Ranchi", state: "Jharkhand", latlng: [23.3441, 85.3096] },
  { name: "Allahabad", state: "Uttar Pradesh", latlng: [25.4358, 81.8463] },
  { name: "Shimla", state: "Himachal Pradesh", latlng: [31.1048, 77.1734] },
  { name: "Srinagar", state: "Jammu and Kashmir", latlng: [34.0837, 74.7973] }
];

const formattedIndianCities = indianCities.map((city) => ({
  value: city.name,
  label: city.name,
  state: city.state,
  latlng: city.latlng,
  name: city.name,
}));

const useIndianCities = () => {
  const getAll = () => formattedIndianCities;

  const getByValue = (value: string) => {
    return formattedIndianCities.find((item) => item.value === value);
  };

  return {
    getAll,
    getByValue,
  };
};

export default useIndianCities;
