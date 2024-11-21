"use client";

import axios from "axios";
import { useCallback, useState, useEffect } from "react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import Button from "../Button";
import Heading from "../Heading";
import useOwnerModal from "@/hook/useOwnerModal"; // Zustand hook for owner modal

const OwnerModal = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const ownerModal = useOwnerModal();

    useEffect(() => {
        if (ownerModal.isOpen) {
            const fetchUserId = async () => {
                try {
                    const response = await axios.get("/api/currentUser"); // Call the server-side API route
                    if (response.data) {
                        setUserId(response.data.id); // Set the user ID from the response
                    }
                } catch (error) {
                    toast.error("Failed to fetch user data.");
                }
            };

            fetchUserId();
        }
    }, [ownerModal.isOpen]);

    const handleConfirmOwner = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);

        try {

            await axios.post("/api/updateUserRole", { id: userId, is_owner: true });
            toast.success("You are now registered as a property owner!");
            ownerModal.onClose();
        } catch (error) {
            toast.error("Failed to update your role. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, ownerModal]);

    return (
        <Modal
            isOpen={ownerModal.isOpen}
            onClose={ownerModal.onClose}
            title="Are you a property owner?"
            actionLabel="Yes, I'm an Owner"
            onSubmit={handleConfirmOwner}
            disabled={isLoading}
            body={
                <div className="flex flex-col gap-4">
                    <Heading title="Confirm Ownership" subtitle="Register as a property owner on ContCave" center />
                    {/* <p className="text-center">Join ContCave today</p> */}
                </div>
            }
            footer={
                <div className="flex justify-center gap-4 mt-4">
                    {/* <Button onClick={handleConfirmOwner} label="Yes" disabled={isLoading} /> */}
                    <Button onClick={ownerModal.onClose} label="No, I'm looking for spaces" outline disabled={isLoading} />
                </div>
            }
        />
    );
};

export default OwnerModal;
