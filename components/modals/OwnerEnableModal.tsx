"use client";
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone?: string, email?: string) => void; 
  initialEmail?: string;
  initialPhone?: string;
};

const OwnerEnableModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialEmail = "", initialPhone = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !phone) {
      toast.error("Please provide email and phone");
      return;
    }
    setLoading(true);
    try {
      toast.success("You are now registered as a space owner");
      onSuccess?.(phone, email);  
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable owner. Try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const body = (
    <div className="space-y-4">
      <label className="text-sm font-medium">Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        className="w-full border px-3 py-2 rounded-lg"
        placeholder="you@example.com"
      />
      <label className="text-sm font-medium">Phone (10 digits)</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        type="tel"
        className="w-full border px-3 py-2 rounded-lg"
        placeholder="99xxxxxx21"
      />
      <p className="text-xs text-gray-500">We will use these to start the verification process.</p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Register Yourself as Studio Host"
      body={body}
      actionLabel={loading ? "Submitting..." : "Submit"}
      disabled={loading}
      autoWidth
    />
  );
};

export default OwnerEnableModal;
