import React, { useCallback, useState } from 'react';
export type ListingDetails = {
    carpetArea: string;
    operationalDays: { start: string; end: string };
    operationalHours: { start: string; end: string };
    minimumBookingHours: string;
    maximumPax: string;
    instantBook: boolean;
    selectedTypes: string[];
  };
  
  type Props = {
    onDetailsChange: (details: ListingDetails) => void; // Callback function for parent component
  };
  
  const OtherListingDetails: React.FC<Props> = ({ onDetailsChange }) => {
    // Initialize state for all the input fields
    const [details, setDetails] = useState<ListingDetails>({
      carpetArea: '',
      operationalDays: { start: '', end: '' },
      operationalHours: { start: '', end: '' },
      minimumBookingHours: '',
      maximumPax: '',
      instantBook: false,
      selectedTypes: []
    });
  
    // Function to handle input changes and update the state
    const handleInputChange = useCallback((field: keyof ListingDetails, value: any) => {
      setDetails((prevDetails) => {
        const newDetails = { ...prevDetails, [field]: value };
        onDetailsChange(newDetails); // Invoke callback with updated details
        return newDetails;
      });
    }, [onDetailsChange]);
  
    // Function to handle type selection
    const handleTypeSelect = (type: string) => {
      setDetails((prevDetails) => {
        const newSelectedTypes = prevDetails.selectedTypes.includes(type)
          ? prevDetails.selectedTypes.filter((t) => t !== type)
          : [...prevDetails.selectedTypes, type];
        const newDetails = { ...prevDetails, selectedTypes: newSelectedTypes };
        onDetailsChange(newDetails); // Invoke callback with updated details
        return newDetails;
      });
    };

    // Define types for the chips
    const types = ["Fashion shoot", "Product shoot", "Podcast", "Recording Studio", "Film Shoot", "Outdoor Event", "Content shoot", "Pre-Wedding", "Meetings", "Workshops", "Photo Shoot"];

    return (
        <div className='otherListingWrapper'>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium mb-1 w-3/3"><strong>PROPERTY SPECIFICATIONS</strong><br />Carpet Area</label>
                    <div className="flex items-center space-x-2 justify-end">
                        <input type="text" placeholder="290 sqft" className="border py-1 pr-3 rounded w-[177px] text-end"
                         value={details.carpetArea}
                         onChange={(e) => handleInputChange('carpetArea', e.target.value)}
                        />
                    </div>
                </div>

                <hr></hr>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <label className="font-medium text-sm w-[40vw]"><strong>TIMINGS</strong><br />Operational Days</label>
                        <div className="flex items-center space-x-2 justify-end ">
                            <input type="text" placeholder="Mon" className="border rounded w-30 py-1 text-center"
                            value={details.operationalDays.start}
                            onChange={(e) => handleInputChange('operationalDays',{ ...details.operationalDays, start: e.target.value})}
                            list="days"
                            />
                            <datalist id="days">
                                <option value="Mon"></option>
                                <option value="Tue"></option>
                                <option value="Wed"></option>
                                <option value="Thu"></option>
                                <option value="Fri"></option>
                                <option value="Sat"></option>
                                <option value="Sun"></option>
                            </datalist>
                            <span>-</span>
                            <input type="text" placeholder="Sun" className="border rounded  w-30 py-1 text-center" 
                             value={details.operationalDays.end}
                             onChange={(e) => handleInputChange('operationalDays',{ ...details.operationalDays, end: e.target.value})}
                             list="days"
                             />
                             <datalist id="days">
                                 <option value="Mon"></option>
                                 <option value="Tue"></option>
                                 <option value="Wed"></option>
                                 <option value="Thu"></option>
                                 <option value="Fri"></option>
                                 <option value="Sat"></option>
                                 <option value="Sun"></option>
                             </datalist>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <label className="font-medium text-sm w-[40vw]">Opening Hours</label>
                        <div className="flex items-center space-x-2 justify-end">
                            <input type="text" placeholder="AM" className="border  rounded w-30 py-1 text-center" 
                               value={details.operationalHours.start}
                               onChange={(e) => handleInputChange('operationalHours',{ ...details.operationalHours, start: e.target.value})}
                            
                            />
                            <span>-</span>
                            <input type="text" placeholder="PM" className="border  rounded  w-30 py-1 text-center"
                             value={details.operationalHours.end}
                             onChange={(e) => handleInputChange('operationalHours',{ ...details.operationalHours, end: e.target.value})}
       
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <label className="font-medium text-sm w-[40vw]">Minimum Booking Hours</label>
                        <input type="text" placeholder="2 hrs" className="border  rounded w-1/3 py-1 pr-3  text-end"
                        value={details.minimumBookingHours}
                        onChange={(e) => handleInputChange('minimumBookingHours', e.target.value)}
                        />
                    </div>
                </div>

                <hr></hr>
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium mb-1 w-[40vw]"><strong>ACCOMMODATION</strong><br />Maximum Pax</label>
                    <input type="text" placeholder="6 people" className="border  rounded w-1/3 py-1 pr-3  text-end"
                     value={details.maximumPax}
                     onChange={(e) => handleInputChange('maximumPax', e.target.value)}
                    />
                </div>

                <hr></hr>
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium mb-1 w-[40vw]"><strong>BOOKING</strong><br />Instant Book</label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" name="toggle" id="toggle" 
                         checked={details.instantBook}
                         onChange={(e) => handleInputChange('instantBook', e.target.checked)}
                 
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                        <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                    </div>

                </div>

                <hr></hr>
                <div className="justify-between items-center">
                <label className="text-sm font-medium mb-1 w-[40vw]"><strong>TYPE</strong></label>
                    <div className="flex flex-wrap gap-2 w-100 mt-2">
                        {types.map((type) => (
                            <button
                                key={type}
                                onClick={() => handleTypeSelect(type)}
                                className={`${details.selectedTypes.includes(type) ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-800'
                                    } text-sm py-1 px-3 rounded-full focus:outline-none focus:shadow-outline`}
                            >
                                {type}
                            </button>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OtherListingDetails;
