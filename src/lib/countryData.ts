export interface CountryData {
  name: string;
  code: string;
  currency: string;
  currencyName: string;
  region: string;
  cities: string[];
}

export const countries: CountryData[] = [
  // GCC Countries
  { 
    name: 'United Arab Emirates', 
    code: 'AE', 
    currency: 'AED', 
    currencyName: 'UAE Dirham',
    region: 'gcc',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain']
  },
  { 
    name: 'Saudi Arabia', 
    code: 'SA', 
    currency: 'SAR', 
    currencyName: 'Saudi Riyal',
    region: 'gcc',
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Khobar', 'Jubail', 'Yanbu', 'Dhahran', 'Tabuk']
  },
  { 
    name: 'Qatar', 
    code: 'QA', 
    currency: 'QAR', 
    currencyName: 'Qatari Riyal',
    region: 'gcc',
    cities: ['Doha', 'Al Wakrah', 'Al Khor', 'Dukhan', 'Mesaieed', 'Lusail']
  },
  { 
    name: 'Kuwait', 
    code: 'KW', 
    currency: 'KWD', 
    currencyName: 'Kuwaiti Dinar',
    region: 'gcc',
    cities: ['Kuwait City', 'Hawally', 'Salmiya', 'Ahmadi', 'Jahra', 'Farwaniya', 'Mangaf']
  },
  { 
    name: 'Bahrain', 
    code: 'BH', 
    currency: 'BHD', 
    currencyName: 'Bahraini Dinar',
    region: 'gcc',
    cities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'Isa Town', 'Sitra', 'Budaiya']
  },
  { 
    name: 'Oman', 
    code: 'OM', 
    currency: 'OMR', 
    currencyName: 'Omani Rial',
    region: 'gcc',
    cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Ibri', 'Seeb', 'Barka']
  },
  // Middle East (non-GCC)
  { 
    name: 'Jordan', 
    code: 'JO', 
    currency: 'JOD', 
    currencyName: 'Jordanian Dinar',
    region: 'middle_east',
    cities: ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba', 'Salt', 'Jerash']
  },
  { 
    name: 'Lebanon', 
    code: 'LB', 
    currency: 'LBP', 
    currencyName: 'Lebanese Pound',
    region: 'middle_east',
    cities: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Jounieh', 'Zahle']
  },
  { 
    name: 'Egypt', 
    code: 'EG', 
    currency: 'EGP', 
    currencyName: 'Egyptian Pound',
    region: 'middle_east',
    cities: ['Cairo', 'Alexandria', 'Giza', 'Port Said', 'Suez', 'Luxor', 'Aswan', 'Sharm El Sheikh']
  },
  { 
    name: 'Iraq', 
    code: 'IQ', 
    currency: 'IQD', 
    currencyName: 'Iraqi Dinar',
    region: 'middle_east',
    cities: ['Baghdad', 'Basra', 'Erbil', 'Mosul', 'Sulaymaniyah', 'Najaf', 'Karbala']
  },
  { 
    name: 'Turkey', 
    code: 'TR', 
    currency: 'TRY', 
    currencyName: 'Turkish Lira',
    region: 'middle_east',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya']
  },
  { 
    name: 'Iran', 
    code: 'IR', 
    currency: 'IRR', 
    currencyName: 'Iranian Rial',
    region: 'middle_east',
    cities: ['Tehran', 'Mashhad', 'Isfahan', 'Tabriz', 'Shiraz', 'Ahvaz']
  },
  // Europe
  { 
    name: 'United Kingdom', 
    code: 'GB', 
    currency: 'GBP', 
    currencyName: 'British Pound',
    region: 'europe',
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol']
  },
  { 
    name: 'Germany', 
    code: 'DE', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Dusseldorf', 'Stuttgart', 'Leipzig']
  },
  { 
    name: 'France', 
    code: 'FR', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux']
  },
  { 
    name: 'Italy', 
    code: 'IT', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Venice', 'Bologna', 'Genoa']
  },
  { 
    name: 'Spain', 
    code: 'ES', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga', 'Zaragoza']
  },
  { 
    name: 'Netherlands', 
    code: 'NL', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen']
  },
  { 
    name: 'Belgium', 
    code: 'BE', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liege', 'Leuven']
  },
  { 
    name: 'Switzerland', 
    code: 'CH', 
    currency: 'CHF', 
    currencyName: 'Swiss Franc',
    region: 'europe',
    cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lucerne']
  },
  { 
    name: 'Austria', 
    code: 'AT', 
    currency: 'EUR', 
    currencyName: 'Euro',
    region: 'europe',
    cities: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz']
  },
  { 
    name: 'Poland', 
    code: 'PL', 
    currency: 'PLN', 
    currencyName: 'Polish Zloty',
    region: 'europe',
    cities: ['Warsaw', 'Krakow', 'Wroclaw', 'Gdansk', 'Poznan', 'Lodz']
  },
  { 
    name: 'Sweden', 
    code: 'SE', 
    currency: 'SEK', 
    currencyName: 'Swedish Krona',
    region: 'europe',
    cities: ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala', 'Linkoping']
  },
  // North America
  { 
    name: 'United States', 
    code: 'US', 
    currency: 'USD', 
    currencyName: 'US Dollar',
    region: 'north_america',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Dallas', 'Miami', 'San Francisco', 'Seattle', 'Atlanta', 'Boston', 'Denver']
  },
  { 
    name: 'Canada', 
    code: 'CA', 
    currency: 'CAD', 
    currencyName: 'Canadian Dollar',
    region: 'north_america',
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City']
  },
  { 
    name: 'Mexico', 
    code: 'MX', 
    currency: 'MXN', 
    currencyName: 'Mexican Peso',
    region: 'north_america',
    cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancun', 'Tijuana', 'Puebla']
  },
  // Asia
  { 
    name: 'India', 
    code: 'IN', 
    currency: 'INR', 
    currencyName: 'Indian Rupee',
    region: 'asia',
    cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur']
  },
  { 
    name: 'China', 
    code: 'CN', 
    currency: 'CNY', 
    currencyName: 'Chinese Yuan',
    region: 'asia',
    cities: ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Hangzhou', 'Chengdu', 'Nanjing', 'Wuhan']
  },
  { 
    name: 'Japan', 
    code: 'JP', 
    currency: 'JPY', 
    currencyName: 'Japanese Yen',
    region: 'asia',
    cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Kyoto', 'Kobe', 'Fukuoka', 'Sapporo']
  },
  { 
    name: 'South Korea', 
    code: 'KR', 
    currency: 'KRW', 
    currencyName: 'South Korean Won',
    region: 'asia',
    cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan']
  },
  { 
    name: 'Singapore', 
    code: 'SG', 
    currency: 'SGD', 
    currencyName: 'Singapore Dollar',
    region: 'asia',
    cities: ['Singapore']
  },
  { 
    name: 'Malaysia', 
    code: 'MY', 
    currency: 'MYR', 
    currencyName: 'Malaysian Ringgit',
    region: 'asia',
    cities: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Shah Alam', 'Petaling Jaya']
  },
  { 
    name: 'Thailand', 
    code: 'TH', 
    currency: 'THB', 
    currencyName: 'Thai Baht',
    region: 'asia',
    cities: ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Nonthaburi', 'Hat Yai']
  },
  { 
    name: 'Vietnam', 
    code: 'VN', 
    currency: 'VND', 
    currencyName: 'Vietnamese Dong',
    region: 'asia',
    cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Nha Trang']
  },
  { 
    name: 'Indonesia', 
    code: 'ID', 
    currency: 'IDR', 
    currencyName: 'Indonesian Rupiah',
    region: 'asia',
    cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bali', 'Semarang', 'Makassar']
  },
  { 
    name: 'Philippines', 
    code: 'PH', 
    currency: 'PHP', 
    currencyName: 'Philippine Peso',
    region: 'asia',
    cities: ['Manila', 'Quezon City', 'Cebu City', 'Davao City', 'Makati', 'Pasig']
  },
  { 
    name: 'Taiwan', 
    code: 'TW', 
    currency: 'TWD', 
    currencyName: 'New Taiwan Dollar',
    region: 'asia',
    cities: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu']
  },
  { 
    name: 'Pakistan', 
    code: 'PK', 
    currency: 'PKR', 
    currencyName: 'Pakistani Rupee',
    region: 'asia',
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar']
  },
  { 
    name: 'Bangladesh', 
    code: 'BD', 
    currency: 'BDT', 
    currencyName: 'Bangladeshi Taka',
    region: 'asia',
    cities: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet']
  },
  // Australia/Oceania
  { 
    name: 'Australia', 
    code: 'AU', 
    currency: 'AUD', 
    currencyName: 'Australian Dollar',
    region: 'asia',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra']
  },
  { 
    name: 'New Zealand', 
    code: 'NZ', 
    currency: 'NZD', 
    currencyName: 'New Zealand Dollar',
    region: 'asia',
    cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin']
  },
  // Africa
  { 
    name: 'South Africa', 
    code: 'ZA', 
    currency: 'ZAR', 
    currencyName: 'South African Rand',
    region: 'africa',
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth']
  },
  { 
    name: 'Nigeria', 
    code: 'NG', 
    currency: 'NGN', 
    currencyName: 'Nigerian Naira',
    region: 'africa',
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt']
  },
  { 
    name: 'Kenya', 
    code: 'KE', 
    currency: 'KES', 
    currencyName: 'Kenyan Shilling',
    region: 'africa',
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']
  },
  { 
    name: 'Morocco', 
    code: 'MA', 
    currency: 'MAD', 
    currencyName: 'Moroccan Dirham',
    region: 'africa',
    cities: ['Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Tangier', 'Agadir']
  },
];

export const getCountryByName = (name: string): CountryData | undefined => {
  return countries.find(c => c.name.toLowerCase() === name.toLowerCase());
};

export const getCitiesForCountry = (countryName: string): string[] => {
  const country = getCountryByName(countryName);
  return country?.cities || [];
};

export const getCurrencyForCountry = (countryName: string): { code: string; name: string } | undefined => {
  const country = getCountryByName(countryName);
  if (country) {
    return { code: country.currency, name: country.currencyName };
  }
  return undefined;
};

export const getRegionForCountry = (countryName: string): string => {
  const country = getCountryByName(countryName);
  return country?.region || 'middle_east';
};

export const getAllCountryNames = (): string[] => {
  return countries.map(c => c.name).sort();
};
