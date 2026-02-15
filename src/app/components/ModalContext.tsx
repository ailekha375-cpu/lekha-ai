"use client";

import React, { createContext, useContext, useState } from 'react';

type ModalContextType = {
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  showChatModal: boolean;
  setShowChatModal: (v: boolean) => void;
};

const ModalContext = createContext<ModalContextType>({
  showModal: false,
  setShowModal: () => {},
  showChatModal: false,
  setShowChatModal: () => {},
});

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [showModal, setShowModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  return (
    <ModalContext.Provider value={{ showModal, setShowModal, showChatModal, setShowChatModal }}>
      {children}
    </ModalContext.Provider>
  );
}; 