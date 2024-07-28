import React, { useState } from "react";

// Define a type for the time slots
type TimeSlot = string | null;

// Define the props interface
interface TimeSlotPickerProps {
    onTimeSelect: (time: TimeSlot, field: 'start' | 'end') => void;
    selectedStart: TimeSlot;
    selectedEnd: TimeSlot;
    disabledStartTimes: any[];
    disabledEndTimes: any[];
    selectedDate: any;
    operationalTimings?: any;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ onTimeSelect, selectedStart, selectedEnd, disabledStartTimes, disabledEndTimes, selectedDate, operationalTimings }) => {
    const [activeSegment, setActiveSegment] = useState<'start' | 'end'>('start');

    const timeSlots = [
        "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
        "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
        "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
        "6:00 PM", "6:30 PM", "7:00 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
    ];

    const handleSegmentChange = (segment: 'start' | 'end') => {
        setActiveSegment(segment);
    };

    const handleTimeSlotClick = (time: TimeSlot) => {
        onTimeSelect(time, activeSegment);
    };

    const getModifiedTime = (time: string) => {
        let newtime = "";
        if (time.includes(":")) {
            let times = time.split(":");
            if (times[0].length === 1) {
                times[0] = times[0];
            }
            if (times[1].length === 1) {
                times[1] = times[1] + "0";
            }
            newtime = times.join(":");
        } else {
            if (time.length === 2) {
                newtime = time + ":00";
            } else {
                newtime = time + ":00";
            }
        }
        return newtime;
    };

    const compareDates = (time: string) => {
        let newtime = time;
    
        if (newtime.length < 8) {
            newtime = "0" + newtime;
        }
        
        const parseDateTime = (date, time) => {
            const [hourString, minuteString, period] = time.match(/(\d+):(\d+) (AM|PM)/).slice(1);
            let hours = parseInt(hourString, 10);
            const minutes = parseInt(minuteString, 10);
    
            if (period === "PM" && hours < 12) {
                hours += 12;
            }
            if (period === "AM" && hours === 12) {
                hours = 0;
            }
    
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
        };
    
        let isReserved = false;
    
        const newDateTime = parseDateTime(selectedDate, newtime);
    
        isReserved =
            disabledStartTimes.some((item) => item <= newDateTime) &&
            disabledEndTimes.some((item) => item >= newDateTime);
    
        return isReserved;
    };
    

    return (
        <div className="p-4">
            <div className="mb-4">
                <div className="flex justify-between bg-gray-200 p-1 rounded">
                    <button
                        className={`flex-1 px-4 py-1 text-start font-bold rounded ${activeSegment === 'start' ? "bg-white shadow-md" : "bg-transparent"}`}
                        onClick={() => handleSegmentChange('start')}
                    >
                        Start
                        <span className="block text-xs text-gray-500">{selectedStart || "Please select"}</span>
                    </button>
                    <button
                        className={`flex-1 px-4 py-1 text-start font-bold rounded ${activeSegment === 'end' ? "bg-white shadow-md" : "bg-transparent"}`}
                        onClick={() => handleSegmentChange('end')}
                    >
                        End
                        <span className="block text-xs text-gray-500">{selectedEnd || "Please select"}</span>
                    </button>
                </div>
            </div>
            <div className="gap-4 grid grid-cols-3 h-[35vh] mb-4 overflow-y-auto scrollbar-thin">
                {timeSlots.filter((t, idx) =>
                    idx >= timeSlots.indexOf(getModifiedTime(operationalTimings?.operationalHours?.start) + " AM") &&
                    idx <= timeSlots.indexOf(getModifiedTime(operationalTimings?.operationalHours?.end) + " PM")
                ).map((time, index) => {
                    const isReserved = compareDates(time);
                    const isDisabledBasedOnStart = activeSegment === 'end' && selectedStart && timeSlots.indexOf(time) <= timeSlots.indexOf(selectedStart);
                    const isDisabled = isReserved || isDisabledBasedOnStart;
                    return (
                        <button
                            key={index}
                            onClick={() => handleTimeSlotClick(time)}
                            disabled={isDisabled || undefined}
                            className={`rounded px-4 py-2 text-sm ${isReserved ? 'disabled:opacity-70' : ''} ${(activeSegment === 'start' && time === selectedStart) || (activeSegment === 'end' && time === selectedEnd) ? 'border-rose-500 bg-rose-500 text-white' : 'bg-transparent'}`}
                        >
                            <span className={isDisabledBasedOnStart && !isReserved ? 'line-through' : ''}>{time}</span>
                            {isReserved && (<p className="text-xs py-0">Not available</p>)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TimeSlotPicker;
