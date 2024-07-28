import React from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
// Import necessary components from 'react-date-range'
import { Calendar as ReactDateRangeCalendar, DateRange } from 'react-date-range';

type Props = {
  value: Date; // Change the type to Date for single date
  onChange: (value: Date) => void; // Adjust the onChange function
  disabledDates?: Date[];
  allowedDays?:any[];
};

function Calendar({ value, onChange, disabledDates,allowedDays }: Props) {
  // Use the Calendar component directly from 'react-date-range'
  const isDayDisabled = (value:Date) => {
     const days = ["mon","tue","wed","thu","fri","sat","sun"];
     if(allowedDays && allowedDays?.filter((item) => item).length) {
      let getDay = value.getDay();
      let startDayIndex = days.indexOf(allowedDays[0].toLowerCase().trim());
      let endDayIndex = days.indexOf(allowedDays[1].toLowerCase().trim());
      return getDay <startDayIndex+1 || getDay >endDayIndex+1;
     }
     return false; 
  }
  return (
    <ReactDateRangeCalendar
      date={value} // Set the selected date
      onChange={(newDate) => onChange(newDate as Date)} // Adjust the onChange function
      showDateDisplay={false}
      minDate={new Date()}
      disabledDates={disabledDates}
      disabledDay={(d)=>isDayDisabled(d)}
    />
  );
}

export default Calendar;
