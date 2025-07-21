import React, { createContext, ReactNode, useContext, useState } from 'react';

interface TabContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  sharedData: any;
  setSharedData: (data: any) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
};

interface TabProviderProps {
  children: ReactNode;
}

export const TabProvider: React.FC<TabProviderProps> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('Turf');
  const [sharedData, setSharedData] = useState({});

  return (
    <TabContext.Provider
      value={{ currentTab, setCurrentTab, sharedData, setSharedData }}
    >
      {children}
    </TabContext.Provider>
  );
};
