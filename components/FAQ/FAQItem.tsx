type FaqData = {
  activeFaq: number;
  id: number;
  handleFaqToggle: (id: number) => void;
  quest: string;
  ans: string;
};

const FAQItem = ({ faqData }: { faqData: FaqData }) => {
  const { activeFaq, id, handleFaqToggle, quest, ans } = faqData;

  return (
    <>
      <div className="flex flex-col border-b border-stroke last-of-type:border-none">
        <button
          onClick={() => {
            handleFaqToggle(id);
          }}
          className="flex cursor-pointer items-center justify-between px-6 py-5 text-metatitle3 font-medium text-black lg:px-9 lg:py-7.5"
        >
          {quest}

          {activeFaq === id ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transform transition-transform duration-300 rotate-45"
            >
              <path
                d="M7.83331 7.83337V0.833374H10.1666V7.83337H17.1666V10.1667H10.1666V17.1667H7.83331V10.1667H0.833313V7.83337H7.83331Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
                className="transform transition-transform duration-300 rotate-0"
            >
              <path
                d="M7.83331 7.83337V0.833374H10.1666V7.83337H17.1666V10.1667H10.1666V17.1667H7.83331V10.1667H0.833313V7.83337H7.83331Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
        <p
          className={`border-t border-stroke px-6 py-5 lg:px-9 lg:py-7.5 transition-all duration-500 ease-in-out ${activeFaq === id ? "show" : "hide"
            }`}
        >
          {ans}
        </p>
      </div>
    </>
  );
};

export default FAQItem;
