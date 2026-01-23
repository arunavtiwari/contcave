"use client";

import { formatISO } from "date-fns";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { Suspense, useCallback, useMemo, useState } from "react";

import Heading from "@/components/Heading";
import Calendar from "@/components/inputs/Calendar";
import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import useSearchModal from "@/hook/useSearchModal";

import Modal from "./Modal";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
}

type Props = {};

function SearchModalContent({ }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const searchModel = useSearchModal();
  const [location, setLocation] = useState<CitySelectValue>();
  const [step, setStep] = useState(STEPS.LOCATION);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hasSets, setHasSets] = useState(false);


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

    const updatedQuery: Record<string, string | string[] | null | undefined> = {
      ...currentQuery,
      locationValue: location?.value,
      selectedDate: selectedDate ? formatISO(selectedDate) : undefined,
      hasSets: hasSets ? "true" : undefined,
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
  }, [step, searchModel, location, router, selectedDate, params, hasSets]);

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
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <div className="font-medium">Multi-set listings</div>
          <div className="font-light text-neutral-500">Only show studios with multiple sets</div>
        </div>
        <input
          type="checkbox"
          checked={hasSets}
          onChange={(e) => setHasSets(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
        />
      </div>
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

function SearchModal({ }: Props) {
  return (
    <Suspense fallback={null}>
      <SearchModalContent />
    </Suspense>
  );
}

export default SearchModal;
