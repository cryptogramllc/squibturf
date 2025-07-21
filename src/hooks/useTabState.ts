import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

export const useTabState = () => {
  const [currentTab, setCurrentTab] = useState('Turf');
  const [sharedData, setSharedData] = useState({});
  const navigation = useNavigation();

  // Update header title when tab changes
  useEffect(() => {
    if (navigation) {
      navigation.setOptions({
        title: currentTab === 'Turf' ? 'Turf' : 'My Squibs',
      });
    }
  }, [currentTab, navigation]);

  return {
    currentTab,
    setCurrentTab,
    sharedData,
    setSharedData,
  };
};
