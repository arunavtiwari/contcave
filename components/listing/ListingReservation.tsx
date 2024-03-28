"use client";

import React, { useState } from "react";
import "@/styles/globals.css";
import { formatISO } from "date-fns";
import Calendar from "../inputs/Calendar";
import Button from "../Button";
import TimeRangePicker from '@wojtekmaj/react-timerange-picker';
import '@wojtekmaj/react-timerange-picker/dist/TimeRangePicker.css';
import TimeSlotPicker from "../inputs/TimeSlotPicker";

type Props = {
  price: number;
  totalPrice: number;
  setSelectDate: (value: Date) => void;
  selectedDate: Date;
  setSelectTimeSlots:(value:any) =>void;
  selectedTime: [string, string];
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  disabledStartTimes:any[];
  disabledEndTimes:any[];
};

function ListingReservation({
  price,
  totalPrice,
  setSelectDate,
  selectedDate,
  selectedTime,
  onSubmit,
  disabled,
  disabledDates,
  setSelectTimeSlots,
  disabledStartTimes,
  disabledEndTimes
}: Props) {
  const [selectedTimes, setSelectedTimes] = useState({ start: null, end: null });

  const setSelectTime = (selectedTime: any, field: 'start' | 'end') => {
    // Set the start time if the 'start' button is active
    if (field === 'start') {
      setSelectedTimes({ start: selectedTime, end: null });
    }
    // Set the end time if the 'end' button is active and the selected time is after the start time
    else if (field === 'end' ) {
      setSelectedTimes({ ...selectedTimes, end: selectedTime });
      selectedTime = [selectedTimes.start, selectedTime];
      setSelectTimeSlots(selectedTime)
    }
  };
  
  return (
    <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
      <div className="flex flex-row items-center gap-1 p-4">
        <p className="flex gap-1 text-2xl font-semibold">
          ₹ {price} <p className="font-light text-neutral-600">/hour</p>
        </p>
      </div>
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg"><h1>Select Date for Booking</h1></div>

      <Calendar
        value={selectedDate}
        onChange={(value) => setSelectDate(value)}
      />
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg"><h1>Pick your Time Slot</h1></div>
      <TimeSlotPicker
        onTimeSelect={setSelectTime}
        selectedStart={selectedTimes.start}
        selectedEnd={selectedTimes.end}
        disabledStartTimes={disabledStartTimes}
        disabledEndTimes={disabledEndTimes}
        selectedDate={selectedDate}
      ></TimeSlotPicker>
      <hr />
      <div className="p-4">
        <Button disabled={disabled} label="Reserve" onClick={onSubmit} />
      </div>
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg">
        <p>Total</p>
        <p> ₹ {totalPrice}</p>
      </div>
    </div>
  );
}

export default ListingReservation;


