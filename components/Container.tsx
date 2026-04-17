import React from "react";

type Props = {
    children: React.ReactNode;
};

function Container({ children }: Props) {
    return (
        <div className="mx-auto w-full max-w-screen-2xl px-6 md:px-10 lg:px-16 xl:px-20">
            {children}
        </div>
    );
}

export default Container;
