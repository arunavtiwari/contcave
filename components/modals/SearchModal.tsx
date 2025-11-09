"use client";

import useSearchModal from "@/hook/useSearchModal";
import { formatISO } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useCallback, useMemo, useState } from "react";
import Heading from "../Heading";
import Calendar from "../inputs/Calendar";
import CitySelect, { CitySelectValue } from "../inputs/CitySelect";
import Modal from "./Modal";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
}

type Props = {};

function SearchModal({ }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const searchModel = useSearchModal();
  const [location, setLocation] = useState<CitySelectValue>();
  const [step, setStep] = useState(STEPS.LOCATION);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);


  const Map = useMemo(
    () =>
      dynamic(() => import("../Map"), {
        ssr: false,
      }),
    []
  );

  const onBack = () => {
    setStep((value) => value - 1);
  };

  const onSubmit = useCallback(async () => {
    if (step !== STEPS.DATE) {
      setStep((v) => v + 1);
      return;
    }

    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
      locationValue: location?.value,
      selectedDate: selectedDate ? formatISO(selectedDate) : undefined,
    };

    const url = qs.stringifyUrl(
      {
        url: "/home",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    setStep(STEPS.LOCATION);
    searchModel.onClose();

    router.push(url);
  }, [step, searchModel, location, router, selectedDate, params]);

  const actionLabel = useMemo(() => {
    if (step === STEPS.DATE) {
      return "Search";
    }

    return "Next";
  }, [step]);

  const secondActionLabel = useMemo(() => {
    if (step === STEPS.LOCATION) {
      return undefined;
    }

    return "Back";
  }, [step]);

  let bodyContent = (
    <div className="flex flex-col gap-8">
      <Heading
        title="Where do you wanna shoot?"
        subtitle="Find the perfect location!"
      />
      <CitySelect
        value={location}
        onChange={(value) => setLocation(value as CitySelectValue)}
      />
      <hr />
      <Map center={location?.latlng} />
    </div>
  );

  if (step === STEPS.DATE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Select a Date"
          subtitle="Choose the date for your booking"
        />
        <Calendar
          value={selectedDate}
          onChange={(value) => setSelectedDate(value ?? null)}
        />
      </div>
    );
  }

  return (
    <Modal
      isOpen={searchModel.isOpen}
      onClose={searchModel.onClose}
      onSubmit={onSubmit}
      secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
      secondaryActionLabel={secondActionLabel}
      title="Filters"
      actionLabel={actionLabel}
      body={bodyContent}
    />
  );
}

export default SearchModal;
