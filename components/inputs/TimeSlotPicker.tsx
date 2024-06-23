import React, { useState } from "react";

// Define a type for the time slots
type TimeSlot = string | null;

// Define the props interface
interface TimeSlotPickerProps {
    onTimeSelect: (time: TimeSlot, field: 'start' | 'end') => void;
    selectedStart: TimeSlot;
    selectedEnd: TimeSlot;
    disabledStartTimes:any[];
    disabledEndTimes:any[];
    selectedDate:any;
    operationalTimings?:any;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ onTimeSelect, selectedStart, selectedEnd,disabledStartTimes, disabledEndTimes,selectedDate,operationalTimings }) => {
    // State to manage which segment is active
    const [activeSegment, setActiveSegment] = useState<'start' | 'end'>('start');

    // Define the time slots
    const timeSlots = [
        "6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM", "8:30 AM",
        "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
        "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
        "6:00 PM", "6:30 PM", "7:00 PM","8:00 PM","8:30 PM", "9:00 PM", "9:30 PM","10:00 PM"
    ];

    // Function to handle segment selection
    const handleSegmentChange = (segment: 'start' | 'end') => {
        setActiveSegment(segment);
    };

    const handleTimeSlotClick = (time: TimeSlot) => {
        onTimeSelect(time, activeSegment);
    };
    const getModifiedTime = (time:string) => {
      let newtime = "";
      if(time.includes(":")) {
        let times = time.split(":");
        if(times[0].length == 1) {
          times[0] = times[0];
        }
        if(times[1].length == 1) {
          times[1] = times[1]+"0";
        }
        newtime = times.join(":");
      }
      else {
        if(time.length == 2) {
          newtime = time+":00";
        }
        else {
          newtime = time+":00";
        }
      }
      return newtime
    }
    const compareDates = (time:string) => {
      let newtime = time;

      let isReserved = false;
      isReserved = 
      disabledStartTimes.some((item) => item.toISOString() <=new Date(`${selectedDate.toISOString().split('T')[0]} ${newtime}`).toISOString())
      &&  disabledEndTimes.some((item) => item.toISOString() >=new Date(`${selectedDate.toISOString().split('T')[0]} ${newtime}`).toISOString())
      return isReserved;
    }
    return (
        <div className="p-4">
          <div className="mb-4">
          <div className="flex justify-between bg-gray-200 p-1 rounded">
              <button
                className={`flex-1 px-4 py-1 text-start font-bold rounded ${
                  activeSegment === 'start' ? "bg-white shadow-md" : "bg-transparent"
                }`}
                onClick={() => handleSegmentChange('start')}
              >
                Start
                <span className="block text-xs  text-gray-500">{selectedStart || "Please select"}</span>
              </button>
              <button
                className={`flex-1 px-4 py-1 text-start font-bold rounded ${
                  activeSegment === 'end' ? "bg-white shadow-md" : "bg-transparent"
                }`}
                onClick={() => handleSegmentChange('end')}
              >
                End
                <span className="block text-xs text-gray-500">{selectedEnd || "Please select"}</span>
              </button>
            </div>
          </div>
          <div className="gap-4 grid grid-cols-3 h-[35vh] mb-4 overflow-y-auto scrollbar-thin">
            {timeSlots.filter((t,idx) => 
            idx >= timeSlots.indexOf(getModifiedTime(operationalTimings?.operationalHours?.start)+" AM") 
            && idx <= timeSlots.indexOf(getModifiedTime(operationalTimings?.operationalHours?.end)+" PM") 
          ).map((time, index) => (
              <button
                key={index}
                onClick={() => handleTimeSlotClick(time)}
                disabled={compareDates(time)}
                className={`rounded px-4 py-2 text-sm ${compareDates(time) ? 'disabled:opacity-70' : ''} ${
                  (activeSegment === 'start' && time === selectedStart) ||
                  (activeSegment === 'end' && time === selectedEnd)
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : 'bg-transparent'
                }`}
              >
                {time}
                {compareDates(time) && (<><p className="text-xs py-0">Not available</p></>)}
              </button>
            ))}
          </div>
        </div>
      );
    };

export default TimeSlotPicker;
