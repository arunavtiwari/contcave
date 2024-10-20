// Sample data of Indian cities (You may replace this with an actual dataset of Indian cities)
const indianCities = [
  { name: "Mumbai", state: "Maharashtra", latlng: [18.9750, 72.8258] },
  { name: "Delhi", state: "Delhi", latlng: [28.6139, 77.2090] },
  { name: "Bengaluru", state: "Karnataka", latlng: [12.9716, 77.5946] },
  { name: "Hyderabad", state: "Telangana", latlng: [17.3850, 78.4867] },
  { name: "Ahmedabad", state: "Gujarat", latlng: [23.0225, 72.5714] },
  { name: "Chennai", state: "Tamil Nadu", latlng: [13.0827, 80.2707] },
  { name: "Kolkata", state: "West Bengal", latlng: [22.5726, 88.3639] },
  { name: "Surat", state: "Gujarat", latlng: [21.1702, 72.8311] },
  { name: "Pune", state: "Maharashtra", latlng: [18.5204, 73.8567] },
  { name: "Jaipur", state: "Rajasthan", latlng: [26.9124, 75.7873] },
  { name: "Lucknow", state: "Uttar Pradesh", latlng: [26.8467, 80.9462] },
  { name: "Kanpur", state: "Uttar Pradesh", latlng: [26.4499, 80.3319] },
  { name: "Nagpur", state: "Maharashtra", latlng: [21.1458, 79.0882] },
  { name: "Indore", state: "Madhya Pradesh", latlng: [22.7196, 75.8577] },
  { name: "Thane", state: "Maharashtra", latlng: [19.2183, 72.9781] },
  { name: "Bhopal", state: "Madhya Pradesh", latlng: [23.2599, 77.4126] },
  { name: "Visakhapatnam", state: "Andhra Pradesh", latlng: [17.6868, 83.2185] },
  { name: "Pimpri-Chinchwad", state: "Maharashtra", latlng: [18.6298, 73.7997] },
  { name: "Patna", state: "Bihar", latlng: [25.5941, 85.1376] },
  { name: "Vadodara", state: "Gujarat", latlng: [22.3072, 73.1812] },
  { name: "Ghaziabad", state: "Uttar Pradesh", latlng: [28.6692, 77.4538] },
  { name: "Ludhiana", state: "Punjab", latlng: [30.9010, 75.8573] },
  { name: "Agra", state: "Uttar Pradesh", latlng: [27.1767, 78.0081] },
  { name: "Nashik", state: "Maharashtra", latlng: [19.9975, 73.7898] },
  { name: "Faridabad", state: "Haryana", latlng: [28.4089, 77.3178] },
  { name: "Meerut", state: "Uttar Pradesh", latlng: [28.9845, 77.7064] },
  { name: "Rajkot", state: "Gujarat", latlng: [22.3039, 70.8022] },
  { name: "Kalyan-Dombivli", state: "Maharashtra", latlng: [19.2350, 73.1299] },
  { name: "Vasai-Virar", state: "Maharashtra", latlng: [19.3919, 72.8397] },
  { name: "Varanasi", state: "Uttar Pradesh", latlng: [25.3176, 82.9739] },
  { name: "Srinagar", state: "Jammu and Kashmir", latlng: [34.0837, 74.7973] },
  { name: "Aurangabad", state: "Maharashtra", latlng: [19.8762, 75.3433] },
  { name: "Dhanbad", state: "Jharkhand", latlng: [23.7957, 86.4304] },
  { name: "Amritsar", state: "Punjab", latlng: [31.6340, 74.8723] },
  { name: "Navi Mumbai", state: "Maharashtra", latlng: [19.0330, 73.0297] },
  { name: "Allahabad", state: "Uttar Pradesh", latlng: [25.4358, 81.8463] },
  { name: "Ranchi", state: "Jharkhand", latlng: [23.3441, 85.3096] },
  { name: "Howrah", state: "West Bengal", latlng: [22.5958, 88.2636] },
  { name: "Coimbatore", state: "Tamil Nadu", latlng: [11.0168, 76.9558] },
  { name: "Jabalpur", state: "Madhya Pradesh", latlng: [23.1815, 79.9864] },
  { name: "Gwalior", state: "Madhya Pradesh", latlng: [26.2183, 78.1828] },
  { name: "Vijayawada", state: "Andhra Pradesh", latlng: [16.5062, 80.6480] },
  { name: "Jodhpur", state: "Rajasthan", latlng: [26.2389, 73.0243] },
  { name: "Madurai", state: "Tamil Nadu", latlng: [9.9252, 78.1198] },
  { name: "Raipur", state: "Chhattisgarh", latlng: [21.2514, 81.6296] },
  { name: "Kota", state: "Rajasthan", latlng: [25.2138, 75.8648] },
  { name: "Guwahati", state: "Assam", latlng: [26.1445, 91.7362] },
  { name: "Chandigarh", state: "Chandigarh", latlng: [30.7333, 76.7794] },
  { name: "Solapur", state: "Maharashtra", latlng: [17.6599, 75.9064] },
  { name: "Hubli-Dharwad", state: "Karnataka", latlng: [15.3647, 75.1240] },
  { name: "Bareilly", state: "Uttar Pradesh", latlng: [28.3670, 79.4304] },
  { name: "Moradabad", state: "Uttar Pradesh", latlng: [28.8386, 78.7733] },
  { name: "Mysore", state: "Karnataka", latlng: [12.2958, 76.6394] },
  { name: "Tiruchirappalli", state: "Tamil Nadu", latlng: [10.7905, 78.7047] },
  { name: "Tiruppur", state: "Tamil Nadu", latlng: [11.1085, 77.3411] },
  { name: "Gurgaon", state: "Haryana", latlng: [28.4595, 77.0266] },
  { name: "Aligarh", state: "Uttar Pradesh", latlng: [27.8974, 78.0880] },
  { name: "Jalandhar", state: "Punjab", latlng: [31.3260, 75.5762] },
  { name: "Bhubaneswar", state: "Odisha", latlng: [20.2961, 85.8245] },
  { name: "Salem", state: "Tamil Nadu", latlng: [11.6643, 78.1460] },
  { name: "Warangal", state: "Telangana", latlng: [17.9784, 79.5941] },
  { name: "Guntur", state: "Andhra Pradesh", latlng: [16.3067, 80.4365] },
  { name: "Bhiwandi", state: "Maharashtra", latlng: [19.2813, 73.0483] },
  { name: "Saharanpur", state: "Uttar Pradesh", latlng: [29.9679, 77.5450] },
  { name: "Gorakhpur", state: "Uttar Pradesh", latlng: [26.7606, 83.3732] },
  { name: "Bikaner", state: "Rajasthan", latlng: [28.0229, 73.3119] },
  { name: "Amravati", state: "Maharashtra", latlng: [20.9374, 77.7796] },
  { name: "Noida", state: "Uttar Pradesh", latlng: [28.5355, 77.3910] },
  { name: "Jamshedpur", state: "Jharkhand", latlng: [22.8046, 86.2029] },
  { name: "Bhilai", state: "Chhattisgarh", latlng: [21.1938, 81.3509] },
  { name: "Cuttack", state: "Odisha", latlng: [20.4625, 85.8828] },
  { name: "Firozabad", state: "Uttar Pradesh", latlng: [27.1591, 78.3958] },
  { name: "Kochi", state: "Kerala", latlng: [9.9312, 76.2673] },
  { name: "Nellore", state: "Andhra Pradesh", latlng: [14.4426, 79.9865] },
  { name: "Bhavnagar", state: "Gujarat", latlng: [21.7645, 72.1519] },
  { name: "Dehradun", state: "Uttarakhand", latlng: [30.3165, 78.0322] },
  { name: "Durgapur", state: "West Bengal", latlng: [23.5204, 87.3119] },
  { name: "Asansol", state: "West Bengal", latlng: [23.6833, 86.9833] },
  { name: "Rourkela", state: "Odisha", latlng: [22.2604, 84.8536] },
  { name: "Nanded", state: "Maharashtra", latlng: [19.1383, 77.3210] },
  { name: "Kolhapur", state: "Maharashtra", latlng: [16.7050, 74.2433] },
  { name: "Ajmer", state: "Rajasthan", latlng: [26.4499, 74.6399] },
  { name: "Akola", state: "Maharashtra", latlng: [20.7096, 76.9987] },
  { name: "Gulbarga", state: "Karnataka", latlng: [17.3297, 76.8343] },
  { name: "Jamnagar", state: "Gujarat", latlng: [22.4707, 70.0577] },
  { name: "Ujjain", state: "Madhya Pradesh", latlng: [23.1793, 75.7849] },
  { name: "Loni", state: "Uttar Pradesh", latlng: [28.7515, 77.2906] },
  { name: "Siliguri", state: "West Bengal", latlng: [26.7271, 88.3953] },
  { name: "Jhansi", state: "Uttar Pradesh", latlng: [25.4484, 78.5685] },
  { name: "Ulhasnagar", state: "Maharashtra", latlng: [19.2215, 73.1645] },
  { name: "Jammu", state: "Jammu and Kashmir", latlng: [32.7266, 74.8570] },
  { name: "Sangli-Miraj & Kupwad", state: "Maharashtra", latlng: [16.8602, 74.5656] },
  { name: "Mangalore", state: "Karnataka", latlng: [12.9141, 74.8560] },
  { name: "Erode", state: "Tamil Nadu", latlng: [11.3410, 77.7172] },
  { name: "Belgaum", state: "Karnataka", latlng: [15.8497, 74.4977] },
  { name: "Ambattur", state: "Tamil Nadu", latlng: [13.0982, 80.1615] },
  { name: "Tirunelveli", state: "Tamil Nadu", latlng: [8.7139, 77.7567] },
  { name: "Malegaon", state: "Maharashtra", latlng: [20.5579, 74.5288] },
  { name: "Gaya", state: "Bihar", latlng: [24.7955, 85.0002] },
  { name: "Jalgaon", state: "Maharashtra", latlng: [21.0077, 75.5626] },
  { name: "Udaipur", state: "Rajasthan", latlng: [24.5854, 73.7125] },
  { name: "Maheshtala", state: "West Bengal", latlng: [22.5087, 88.2534] },
  { name: "Tirupati", state: "Andhra Pradesh", latlng: [13.6288, 79.4192] },
  { name: "Davanagere", state: "Karnataka", latlng: [14.4640, 75.9238] },
  { name: "Kozhikode", state: "Kerala", latlng: [11.2588, 75.7804] },
  { name: "Kurnool", state: "Andhra Pradesh", latlng: [15.8281, 78.0373] },
  { name: "Rajpur Sonarpur", state: "West Bengal", latlng: [22.4497, 88.3919] },
  { name: "Bokaro", state: "Jharkhand", latlng: [23.6693, 86.1511] },
  { name: "South Dumdum", state: "West Bengal", latlng: [22.6100, 88.4000] },
  { name: "Bellary", state: "Karnataka", latlng: [15.1394, 76.9214] },
  { name: "Patiala", state: "Punjab", latlng: [30.3398, 76.3869] },
  { name: "Gopalpur", state: "West Bengal", latlng: [24.8835, 87.9165] },
  { name: "Agartala", state: "Tripura", latlng: [23.8315, 91.2868] },
  { name: "Bhagalpur", state: "Bihar", latlng: [25.2424, 86.9842] },
  { name: "Muzaffarnagar", state: "Uttar Pradesh", latlng: [29.4731, 77.7041] },
  { name: "Bhatpara", state: "West Bengal", latlng: [22.8713, 88.4086] },
  { name: "Panihati", state: "West Bengal", latlng: [22.6902, 88.3745] },
  { name: "Latur", state: "Maharashtra", latlng: [18.4088, 76.5604] },
  { name: "Dhule", state: "Maharashtra", latlng: [20.9042, 74.7749] },
  { name: "Rohtak", state: "Haryana", latlng: [28.8955, 76.6066] },
  { name: "Korba", state: "Chhattisgarh", latlng: [22.3595, 82.7501] },
  { name: "Bhilwara", state: "Rajasthan", latlng: [25.3500, 74.6333] },
  { name: "Brahmapur", state: "Odisha", latlng: [19.3115, 84.7914] },
  { name: "Muzaffarpur", state: "Bihar", latlng: [26.1209, 85.3647] },
  { name: "Ahmednagar", state: "Maharashtra", latlng: [19.0952, 74.7496] },
  { name: "Mathura", state: "Uttar Pradesh", latlng: [27.4924, 77.6737] },
  { name: "Kollam", state: "Kerala", latlng: [8.8932, 76.6141] },
  { name: "Avadi", state: "Tamil Nadu", latlng: [13.1147, 80.1098] },
  { name: "Rajahmundry", state: "Andhra Pradesh", latlng: [17.0005, 81.8040] },
  { name: "Kadapa", state: "Andhra Pradesh", latlng: [14.4674, 78.8242] },
  { name: "Kamarhati", state: "West Bengal", latlng: [22.6711, 88.3748] },
  { name: "Bilaspur", state: "Chhattisgarh", latlng: [22.0797, 82.1391] },
  { name: "Shahjahanpur", state: "Uttar Pradesh", latlng: [27.8815, 79.9105] },
  { name: "Bijapur", state: "Karnataka", latlng: [16.8302, 75.7100] },
  { name: "Rampur", state: "Uttar Pradesh", latlng: [28.7955, 79.0250] },
  { name: "Shivamogga", state: "Karnataka", latlng: [13.9299, 75.5681] },
  { name: "Chandrapur", state: "Maharashtra", latlng: [19.9615, 79.2961] },
  { name: "Junagadh", state: "Gujarat", latlng: [21.5222, 70.4579] },
  { name: "Thrissur", state: "Kerala", latlng: [10.5276, 76.2144] },
  { name: "Alwar", state: "Rajasthan", latlng: [27.5520, 76.6346] },
  { name: "Bardhaman", state: "West Bengal", latlng: [23.2324, 87.8615] },
  { name: "Kulti", state: "West Bengal", latlng: [23.7316, 86.8437] },
  { name: "Kakinada", state: "Andhra Pradesh", latlng: [16.9891, 82.2475] },
  { name: "Nizamabad", state: "Telangana", latlng: [18.6725, 78.0941] },
  { name: "Parbhani", state: "Maharashtra", latlng: [19.2663, 76.7864] },
  { name: "Tumkur", state: "Karnataka", latlng: [13.3389, 77.1010] },
  { name: "Khammam", state: "Telangana", latlng: [17.2473, 80.1514] },
  { name: "Ozhukarai", state: "Puducherry", latlng: [11.9397, 79.7780] },
  { name: "Bihar Sharif", state: "Bihar", latlng: [25.2005, 85.5239] },
  { name: "Panipat", state: "Haryana", latlng: [29.3909, 76.9635] },
  { name: "Darbhanga", state: "Bihar", latlng: [26.1542, 85.8918] },
  { name: "Bally", state: "West Bengal", latlng: [22.6402, 88.3680] },
  { name: "Aizawl", state: "Mizoram", latlng: [23.7271, 92.7176] },
  { name: "Dewas", state: "Madhya Pradesh", latlng: [22.9656, 76.0552] },
  { name: "Ichalkaranji", state: "Maharashtra", latlng: [16.6912, 74.4605] },
  { name: "Karnal", state: "Haryana", latlng: [29.6857, 76.9905] },
  { name: "Bathinda", state: "Punjab", latlng: [30.2110, 74.9455] },
  { name: "Jalna", state: "Maharashtra", latlng: [19.8410, 75.8867] },
  { name: "Eluru", state: "Andhra Pradesh", latlng: [16.7107, 81.0972] },
  { name: "Barasat", state: "West Bengal", latlng: [22.7244, 88.4814] },
  { name: "Kirari Suleman Nagar", state: "Delhi", latlng: [28.7011, 77.0545] },
  { name: "Purnia", state: "Bihar", latlng: [25.7771, 87.4753] },
  { name: "Satna", state: "Madhya Pradesh", latlng: [24.6005, 80.8322] },
  { name: "Mau", state: "Uttar Pradesh", latlng: [25.9417, 83.5611] },
  { name: "Sonipat", state: "Haryana", latlng: [28.9931, 77.0151] },
  { name: "Farrukhabad", state: "Uttar Pradesh", latlng: [27.3823, 79.5770] },
  { name: "Sagar", state: "Madhya Pradesh", latlng: [23.8388, 78.7378] },
  { name: "Rourkela", state: "Odisha", latlng: [22.2604, 84.8536] },
  { name: "Durg", state: "Chhattisgarh", latlng: [21.1904, 81.2849] },
  { name: "Imphal", state: "Manipur", latlng: [24.8170, 93.9368] },
  { name: "Ratlam", state: "Madhya Pradesh", latlng: [23.3303, 75.0403] },
  { name: "Hapur", state: "Uttar Pradesh", latlng: [28.7306, 77.7759] },
  { name: "Arrah", state: "Bihar", latlng: [25.5560, 84.6637] },
  { name: "Karimnagar", state: "Telangana", latlng: [18.4386, 79.1288] },
  { name: "Anantapur", state: "Andhra Pradesh", latlng: [14.6819, 77.6006] },
  { name: "Etawah", state: "Uttar Pradesh", latlng: [26.7855, 79.0151] },
  { name: "Ambernath", state: "Maharashtra", latlng: [19.2014, 73.2003] },
  { name: "North Dumdum", state: "West Bengal", latlng: [22.6520, 88.4200] },
  { name: "Bharatpur", state: "Rajasthan", latlng: [27.2173, 77.4901] },
  { name: "Begusarai", state: "Bihar", latlng: [25.4185, 86.1300] },
  { name: "New Delhi", state: "Delhi", latlng: [28.6139, 77.2090] },
  { name: "Gandhidham", state: "Gujarat", latlng: [23.0758, 70.1337] },
  { name: "Baranagar", state: "West Bengal", latlng: [22.6440, 88.3651] },
  { name: "Tiruvottiyur", state: "Tamil Nadu", latlng: [13.1578, 80.3041] },
  { name: "Pondicherry", state: "Puducherry", latlng: [11.9139, 79.8145] },
  { name: "Sikar", state: "Rajasthan", latlng: [27.6094, 75.1399] },
  { name: "Thoothukudi", state: "Tamil Nadu", latlng: [8.7642, 78.1348] },
  { name: "Rewa", state: "Madhya Pradesh", latlng: [24.5340, 81.2960] },
  { name: "Mirzapur", state: "Uttar Pradesh", latlng: [25.1440, 82.5653] },
  { name: "Raichur", state: "Karnataka", latlng: [16.2076, 77.3463] },
  { name: "Pali", state: "Rajasthan", latlng: [25.7720, 73.3234] },
  { name: "Khora, Ghaziabad", state: "Uttar Pradesh", latlng: [28.6303, 77.3566] },
  { name: "Panvel", state: "Maharashtra", latlng: [18.9894, 73.1175] },
  { name: "Deoghar", state: "Jharkhand", latlng: [24.4825, 86.6969] },
  { name: "Kozhikode", state: "Kerala", latlng: [11.2588, 75.7804] },
  { name: "Kurnool", state: "Andhra Pradesh", latlng: [15.8281, 78.0373] },
  { name: "Rajpur Sonarpur", state: "West Bengal", latlng: [22.4497, 88.3919] },
  { name: "Bokaro", state: "Jharkhand", latlng: [23.6693, 86.1511] },
  { name: "South Dumdum", state: "West Bengal", latlng: [22.6100, 88.4000] },
  { name: "Bellary", state: "Karnataka", latlng: [15.1394, 76.9214] },
  { name: "Patiala", state: "Punjab", latlng: [30.3398, 76.3869] },
  { name: "Gopalpur", state: "West Bengal", latlng: [24.8835, 87.9165] },
  { name: "Agartala", state: "Tripura", latlng: [23.8315, 91.2868] },
  { name: "Bhagalpur", state: "Bihar", latlng: [25.2424, 86.9842] },
  { name: "Muzaffarnagar", state: "Uttar Pradesh", latlng: [29.4731, 77.7041] },
  { name: "Bhatpara", state: "West Bengal", latlng: [22.8713, 88.4086] },
  { name: "Panihati", state: "West Bengal", latlng: [22.6902, 88.3745] },
  { name: "Latur", state: "Maharashtra", latlng: [18.4088, 76.5604] },
  { name: "Dhule", state: "Maharashtra", latlng: [20.9042, 74.7749] },
  { name: "Rohtak", state: "Haryana", latlng: [28.8955, 76.6066] },
  { name: "Korba", state: "Chhattisgarh", latlng: [22.3595, 82.7501] },
  { name: "Bhilwara", state: "Rajasthan", latlng: [25.3500, 74.6333] },
  { name: "Brahmapur", state: "Odisha", latlng: [19.3115, 84.7914] },
  { name: "Muzaffarpur", state: "Bihar", latlng: [26.1209, 85.3647] }
];

const formattedIndianCities = indianCities.map((city, index) => ({
  value: `city${index}`,
  label: city.name,
  state: city.state,
  latlng: city.latlng,
 name:city.name
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