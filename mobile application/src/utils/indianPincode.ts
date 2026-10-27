/**
 * Indian Pincode Resolver & Validator
 *
 * Provides instant offline prefix-based district/state mapping with an online
 * fallback to the India Post postal API. As soon as the user enters 6 digits,
 * city and state are populated automatically to streamline address entry.
 */

export interface PincodeLookupResult {
  pincode: string;
  city: string;
  state: string;
  district?: string;
}

/** 2-digit prefix to State mapping for Indian postal circles */
const PIN_PREFIX_STATE_MAP: Record<string, string> = {
  // Northern Region
  '11': 'Delhi',
  '12': 'Haryana',
  '13': 'Haryana',
  '14': 'Punjab',
  '15': 'Punjab',
  '16': 'Chandigarh',
  '17': 'Himachal Pradesh',
  '18': 'Jammu & Kashmir',
  '19': 'Jammu & Kashmir',

  // Northern Region 2
  '20': 'Uttar Pradesh',
  '21': 'Uttar Pradesh',
  '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh',
  '24': 'Uttarakhand',
  '25': 'Uttar Pradesh',
  '26': 'Uttarakhand',
  '27': 'Uttar Pradesh',
  '28': 'Uttar Pradesh',

  // Western Region
  '30': 'Rajasthan',
  '31': 'Rajasthan',
  '32': 'Rajasthan',
  '33': 'Rajasthan',
  '34': 'Rajasthan',
  '36': 'Gujarat',
  '37': 'Gujarat',
  '38': 'Gujarat',
  '39': 'Gujarat',

  // Central & Western Region
  '40': 'Maharashtra',
  '41': 'Maharashtra',
  '42': 'Maharashtra',
  '43': 'Maharashtra',
  '44': 'Maharashtra',
  '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh',
  '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',

  // Southern Region
  '50': 'Telangana',
  '51': 'Andhra Pradesh',
  '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh',
  '56': 'Karnataka',
  '57': 'Karnataka',
  '58': 'Karnataka',
  '59': 'Karnataka',
  '60': 'Tamil Nadu',
  '61': 'Tamil Nadu',
  '62': 'Tamil Nadu',
  '63': 'Tamil Nadu',
  '64': 'Tamil Nadu',
  '67': 'Kerala',
  '68': 'Kerala',
  '69': 'Kerala',

  // Eastern & North-Eastern Region
  '70': 'West Bengal',
  '71': 'West Bengal',
  '72': 'West Bengal',
  '73': 'West Bengal',
  '74': 'West Bengal',
  '75': 'Odisha',
  '76': 'Odisha',
  '77': 'Odisha',
  '78': 'Assam',
  '79': 'North Eastern States',

  // Eastern Region 2
  '80': 'Bihar',
  '81': 'Bihar',
  '82': 'Jharkhand',
  '83': 'Jharkhand',
  '84': 'Bihar',
  '85': 'Bihar',
};

/** 3-digit prefix to Primary Major City / District */
const PIN_PREFIX_CITY_MAP: Record<string, { city: string; state: string }> = {
  // Odisha
  '751': { city: 'Bhubaneswar', state: 'Odisha' },
  '752': { city: 'Puri', state: 'Odisha' },
  '753': { city: 'Cuttack', state: 'Odisha' },
  '754': { city: 'Jagatsinghpur', state: 'Odisha' },
  '755': { city: 'Jajpur', state: 'Odisha' },
  '756': { city: 'Balasore', state: 'Odisha' },
  '757': { city: 'Baripada', state: 'Odisha' },
  '758': { city: 'Kendujhar', state: 'Odisha' },
  '759': { city: 'Dhenkanal', state: 'Odisha' },
  '760': { city: 'Berhampur', state: 'Odisha' },
  '761': { city: 'Ganjam', state: 'Odisha' },
  '762': { city: 'Phulbani', state: 'Odisha' },
  '763': { city: 'Balangir', state: 'Odisha' },
  '764': { city: 'Koraput', state: 'Odisha' },
  '765': { city: 'Rayagada', state: 'Odisha' },
  '766': { city: 'Bhawanipatna', state: 'Odisha' },
  '767': { city: 'Balangir', state: 'Odisha' },
  '768': { city: 'Sambalpur', state: 'Odisha' },
  '769': { city: 'Rourkela', state: 'Odisha' },
  '770': { city: 'Sundargarh', state: 'Odisha' },

  // Delhi NCR
  '110': { city: 'New Delhi', state: 'Delhi' },
  '121': { city: 'Faridabad', state: 'Haryana' },
  '122': { city: 'Gurugram', state: 'Haryana' },
  '201': { city: 'Noida', state: 'Uttar Pradesh' },

  // Major Metros & Hubs
  '400': { city: 'Mumbai', state: 'Maharashtra' },
  '401': { city: 'Thane', state: 'Maharashtra' },
  '411': { city: 'Pune', state: 'Maharashtra' },
  '440': { city: 'Nagpur', state: 'Maharashtra' },
  '452': { city: 'Indore', state: 'Madhya Pradesh' },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh' },
  '492': { city: 'Raipur', state: 'Chhattisgarh' },
  '500': { city: 'Hyderabad', state: 'Telangana' },
  '530': { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  '520': { city: 'Vijayawada', state: 'Andhra Pradesh' },
  '560': { city: 'Bengaluru', state: 'Karnataka' },
  '570': { city: 'Mysuru', state: 'Karnataka' },
  '600': { city: 'Chennai', state: 'Tamil Nadu' },
  '641': { city: 'Coimbatore', state: 'Tamil Nadu' },
  '625': { city: 'Madurai', state: 'Tamil Nadu' },
  '682': { city: 'Kochi', state: 'Kerala' },
  '695': { city: 'Thiruvananthapuram', state: 'Kerala' },
  '700': { city: 'Kolkata', state: 'West Bengal' },
  '711': { city: 'Howrah', state: 'West Bengal' },
  '734': { city: 'Siliguri', state: 'West Bengal' },
  '781': { city: 'Guwahati', state: 'Assam' },
  '800': { city: 'Patna', state: 'Bihar' },
  '834': { city: 'Ranchi', state: 'Jharkhand' },
  '831': { city: 'Jamshedpur', state: 'Jharkhand' },
  '302': { city: 'Jaipur', state: 'Rajasthan' },
  '342': { city: 'Jodhpur', state: 'Rajasthan' },
  '313': { city: 'Udaipur', state: 'Rajasthan' },
  '380': { city: 'Ahmedabad', state: 'Gujarat' },
  '395': { city: 'Surat', state: 'Gujarat' },
  '390': { city: 'Vadodara', state: 'Gujarat' },
  '360': { city: 'Rajkot', state: 'Gujarat' },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh' },
  '208': { city: 'Kanpur', state: 'Uttar Pradesh' },
  '221': { city: 'Varanasi', state: 'Uttar Pradesh' },
  '282': { city: 'Agra', state: 'Uttar Pradesh' },
  '248': { city: 'Dehradun', state: 'Uttarakhand' },
  '160': { city: 'Chandigarh', state: 'Chandigarh' },
  '141': { city: 'Ludhiana', state: 'Punjab' },
  '143': { city: 'Amritsar', state: 'Punjab' },
};

/**
 * Synchronous offline lookup based on prefix.
 * Never fails; returns fallback state if exact city is not in the top lookup table.
 */
export function lookupPincodeOffline(pincode: string): PincodeLookupResult | null {
  const clean = pincode.replace(/\D/g, '').slice(0, 6);
  if (clean.length < 3) return null;

  const prefix3 = clean.slice(0, 3);
  const prefix2 = clean.slice(0, 2);

  if (PIN_PREFIX_CITY_MAP[prefix3]) {
    return {
      pincode: clean,
      city: PIN_PREFIX_CITY_MAP[prefix3].city,
      state: PIN_PREFIX_CITY_MAP[prefix3].state,
    };
  }

  if (PIN_PREFIX_STATE_MAP[prefix2]) {
    return {
      pincode: clean,
      city: '',
      state: PIN_PREFIX_STATE_MAP[prefix2],
    };
  }

  return null;
}

/**
 * Asynchronous lookup: first gets fast offline suggestion, then checks India Post
 * public API if online with a 2.5-second timeout for micro-accuracy.
 */
export async function resolveIndianPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.replace(/\D/g, '').slice(0, 6);
  if (clean.length !== 6) return null;

  const offline = lookupPincodeOffline(clean);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0].PostOffice)) {
        const po = data[0].PostOffice[0];
        return {
          pincode: clean,
          city: po.District || po.Division || offline?.city || '',
          state: po.State || offline?.state || '',
          district: po.District,
        };
      }
    }
  } catch {
    // Offline or network error: return the offline result gracefully
  }

  return offline;
}
