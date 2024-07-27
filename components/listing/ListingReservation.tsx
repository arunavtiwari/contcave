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
  addons: number;
  platformFee: number;
  time:number;
  setSelectDate: (value: Date) => void;
  selectedDate: Date;
  setSelectTimeSlots: (value: any) => void;
  selectedTime: [string, string];
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates: Date[];
  disabledStartTimes: any[];
  disabledEndTimes: any[];
  operationalTimings: any;
};

function ListingReservation({
  price,
  totalPrice,
  addons,
  platformFee,
  time,
  setSelectDate,
  selectedDate,
  selectedTime,
  onSubmit,
  disabled,
  disabledDates,
  setSelectTimeSlots,
  disabledStartTimes,
  disabledEndTimes,
  operationalTimings,
}: Props) {
  const [selectedTimes, setSelectedTimes] = useState({ start: null, end: null });

  const setSelectTime = (selectedTime: any, field: 'start' | 'end') => {
    if (field === 'start') {
      setSelectedTimes({ start: selectedTime, end: null });
    } else if (field === 'end') {
      setSelectedTimes({ ...selectedTimes, end: selectedTime });
      selectedTime = [selectedTimes.start, selectedTime];
      setSelectTimeSlots(selectedTime);
    }
  };

  const calculateTotalPrice = () => {
    
    const bookingFee = price * (isNaN(time) ? 0 : time); // assuming 4 hours as shown in the example
    return bookingFee + addons + platformFee;
  };

  return (
    <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
      <div className="flex flex-row items-center gap-1 p-4">
        <p className="flex gap-1 text-2xl font-semibold">
          ₹ {price} <p className="font-light text-neutral-600">/hour</p>
        </p>
      </div>
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg">
        <h1>Select Date for Booking</h1>
      </div>

      <Calendar
        value={selectedDate}
        allowedDays={[operationalTimings.operationalDays?.start ?? "", operationalTimings.operationalDays?.end ?? ""]}
        onChange={(value) => setSelectDate(value)}
      />
      <hr />
      <div className="p-4 flex flex-row items-center justify-between font-semibold text-lg">
        <h1>Pick your Time Slot</h1>
      </div>
      <TimeSlotPicker
        onTimeSelect={setSelectTime}
        selectedStart={selectedTimes.start}
        selectedEnd={selectedTimes.end}
        disabledStartTimes={disabledStartTimes}
        disabledEndTimes={disabledEndTimes}
        selectedDate={selectedDate}
        operationalTimings={operationalTimings}
      />
      <hr />
      <div className="p-4">
        <Button disabled={disabled} label="Reserve" onClick={onSubmit} />
      </div>
      <hr />
      <div className="p-4 flex flex-col font-semibold text-lg" style={{fontWeight:100, fontSize:"medium"}}>
        <div className="flex justify-end">
          <p>Base booking fee {price} x {isNaN(time) ? 0 : time} hrs</p>
          <p className="ps-5"  style={{fontWeight:300}}> {price * (isNaN(time) ? 0 : time)}</p>
        </div>
        <div className="flex justify-end">
          <p>Addons</p>
          <p className="ps-5"  style={{fontWeight:300}}> {addons}</p>
        </div>
        <div className="flex justify-end pb-3">
          <p>Platform fee</p>
          <p className="ps-5"  style={{fontWeight:300}}> <s>100</s> {platformFee}</p>
        </div>
        <hr />
        <div className="flex justify-between pt-4">
          
          <p><strong>Total</strong></p>
          <p> <strong>₹{calculateTotalPrice()}</strong></p>
        </div>
      </div>
    </div>
  );
}

export default ListingReservation;
