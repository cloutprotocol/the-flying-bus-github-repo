
import React, { createContext, useContext, useState } from 'react';

interface ArticleTypeSelectionContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ArticleTypeSelectionContext = createContext<ArticleTypeSelectionContextType | undefined>(undefined);

export const useArticleTypeSelection = () => {
  const context = useContext(ArticleTypeSelectionContext);
  if (!context) {
    throw new Error('useArticleTypeSelection must be used within ArticleTypeSelectionProvider');
  }
  return context;
};

interface ArticleTypeSelectionProviderProps {
  children: React.ReactNode;
}

export const ArticleTypeSelectionProvider: React.FC<ArticleTypeSelectionProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <ArticleTypeSelectionContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ArticleTypeSelectionContext.Provider>
  );
};
