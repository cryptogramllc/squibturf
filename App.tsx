import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { Component, createRef, memo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import { clearAllProfileCache } from './src/components/NewsItem';
import { configureGoogleSignIn } from './src/config/googleSignIn';
import ModalItem from './src/modals/ModalItem';
import Comments from './src/pages/Comments';
import CreateSquib from './src/pages/CreateSquib';
import CreateSquibADB from './src/pages/CreateSquibADB';
import Login from './src/pages/Login';
import MySquibs from './src/pages/MySquibs';

import NewsPage from './src/pages/NewsPage';
import { clearNewsPageData } from './src/pages/NewsPageDataCache';
import Profile from './src/pages/Profile';
import ProfileCompletion from './src/pages/ProfileCompletion';
import ProfileEdit from './src/pages/ProfileEdit';
import Squib from './src/pages/Squib';
import SquibADB from './src/pages/SquibADB';
import NewsCache from './src/services/NewsCache';
const SquibApi = require('./src/api');

// Define types for props and state if necessary
interface AppProps {}

interface AppState {
  user_uuid: string | null;
  showProfile: boolean;
  pdata: any; // Replace with actual type
  tracking: boolean;
  data?: {} | null;
  showProfileAfterEdit: boolean;
  currentTab: string;
}

interface HomeProps {
  onTabChange?: (tab: string) => void;
  navigation?: any;
  route?: any;
}

interface HomeState {
  showCreateSquib: boolean;
  data?: {} | null;
  refreshTrigger: number;
  currentTab: string;
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper component for NewsPage to avoid inline functions
class NewsPageWrapper extends Component<any> {
  render() {
    return <NewsPage {...this.props} />;
  }
}

// Create a memoized NewsPage component to prevent remounting
const MemoizedNewsPage = memo(NewsPage);

// Create a wrapper component that can receive refreshTrigger
class NewsPageWithRefresh extends Component<any> {
  render() {
    const refreshTrigger = this.props.route?.params?.refreshTrigger || 0;
    return <NewsPage {...this.props} refreshTrigger={refreshTrigger} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    color: '#000',
    padding: 10,
    margin: 40,
  },
});

export class Home extends Component<HomeProps, HomeState> {
  api: typeof SquibApi;
  private newsPageRef = createRef<any>();

  constructor(props: HomeProps) {
    super(props);
    this.state = {
      showCreateSquib: false,
      refreshTrigger: 0,
      currentTab: 'Turf',
    };
    this.api = new SquibApi();
  }

  // Method to update parent's currentTab state
  updateParentTab = (tab: string) => {
    this.setState({ currentTab: tab });
    // Update parent App component's state
    const onTabChange = this.props.route?.params?.onTabChange;
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  render() {
    const Icon: any = FontAwesome;
    return (
      <>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#000',
            headerShown: false,
          }}
          detachInactiveScreens={false}
        >
          <Tab.Screen
            name="Turf"
            component={NewsPageWithRefresh}
            initialParams={{ refreshTrigger: this.state.refreshTrigger }}
            options={{
              tabBarIcon: ({ color }) => (
                <Icon
                  name="home"
                  style={{ marginTop: 0 }}
                  color={color}
                  size={30}
                />
              ),
            }}
            listeners={{
              focus: () => {
                this.updateParentTab('Turf');
              },
            }}
          />
          <Tab.Screen
            name="Post"
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <View
                  style={{
                    backgroundColor: '#44C1AF',
                    height: 60,
                    width: 60,
                    marginTop: -20, // Move button up so it's half on white space and half on gray background
                    borderRadius: 100,
                    borderWidth: 3,
                    borderColor: '#ccc',
                  }}
                >
                  <Icon
                    name="camera"
                    style={{
                      left: '50%',
                      marginLeft: -12,
                      marginTop: 15,
                      zIndex: 999,
                    }}
                    color="white"
                    size={22}
                  />
                </View>
              ),
            }}
            listeners={{
              tabPress: e => {
                e.preventDefault();
                this.setState({ showCreateSquib: true });
              },
            }}
            component={() => null}
          />
          <Tab.Screen
            name="My Squibs"
            component={MySquibs}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Icon
                  name="pencil"
                  style={{ marginTop: 0 }}
                  color={color}
                  size={25}
                />
              ),
            }}
            listeners={{
              focus: () => {
                this.updateParentTab('My Squibs');
              },
            }}
          />
        </Tab.Navigator>
        <ModalItem show={this.state.showCreateSquib}>
          {Platform.OS === 'android' ? (
            <CreateSquibADB
              close={(value: boolean) => {
                this.setState({ showCreateSquib: !value });
                this.setState({ data: {} });
                // Trigger refresh of NewsPage when squib is posted
                if (value) {
                  this.setState(prevState => ({
                    refreshTrigger: prevState.refreshTrigger + 1,
                  }));
                  // Update the navigation params for the Turf screen
                  this.props.navigation?.setParams({
                    refreshTrigger: this.state.refreshTrigger + 1,
                  });
                }
              }}
            />
          ) : (
            <CreateSquib
              close={(value: boolean) => {
                this.setState({ showCreateSquib: !value });
                this.setState({ data: {} });
                // Trigger refresh of NewsPage when squib is posted
                if (value) {
                  this.setState(prevState => ({
                    refreshTrigger: prevState.refreshTrigger + 1,
                  }));
                  // Update the navigation params for the Turf screen
                  this.props.navigation?.setParams({
                    refreshTrigger: this.state.refreshTrigger + 1,
                  });
                }
              }}
            />
          )}
        </ModalItem>
      </>
    );
  }
}

export default class App extends Component<AppProps, AppState> {
  private navigationRef = createRef<any>();

  constructor(props: AppProps) {
    super(props);
    this.state = {
      user_uuid: null,
      showProfile: false,
      pdata: {},
      tracking: false,
      showProfileAfterEdit: false,
      currentTab: 'Turf',
    };
  }

  async componentDidMount() {
    // Configure Google Sign-In
    configureGoogleSignIn();

    // Remove all trackingStatus and getTrackingStatus logic
    const user = await AsyncStorage.getItem('userInfo');
    if (user) {
      const pdata = JSON.parse(user);
      this.setState({ pdata });
      this.setState({ user_uuid: pdata.uuid });

      // Clear any stale user squibs caches to prevent data leakage
      const api = new SquibApi();
      await api.clearAllCaches();
    }

    // Add focus listener to detect when returning from ProfileEdit
    const unsubscribe = this.navigationRef.current?.addListener('focus', () => {
      if (this.state.showProfileAfterEdit) {
        this.setState({ showProfile: true, showProfileAfterEdit: false });
      }
    });

    if (unsubscribe) {
      this.componentWillUnmount = unsubscribe;
    }
  }

  // Handle tab changes from Home component
  handleTabChange = (tab: string) => {
    this.setState({ currentTab: tab });
  };

  render() {
    const { tracking } = this.state;
    const Icon: any = FontAwesome;
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={this.navigationRef}>
          <Stack.Navigator>
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
              initialParams={{ tracking }}
            />
            <Stack.Screen
              name="News"
              component={Home}
              initialParams={{ onTabChange: this.handleTabChange }}
              options={{
                title: this.state.currentTab === 'Turf' ? 'Turf' : 'My Squibs',
                headerStyle: {
                  backgroundColor: '#44C1AF',
                },
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => {
                      this.setState({ showProfile: true });
                    }}
                  >
                    <Icon
                      name="gear"
                      style={{ marginRight: 20, zIndex: 999 }}
                      color="white"
                      size={22}
                    />
                  </TouchableOpacity>
                ),
                headerLeft: () => null,
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              listeners={{
                focus: async () => {
                  // Always refresh user data from AsyncStorage when News screen is focused
                  const user = await AsyncStorage.getItem('userInfo');
                  if (user) {
                    const pdata = JSON.parse(user);
                    this.setState({ pdata, user_uuid: pdata.uuid });
                  }

                  if (this.state.showProfileAfterEdit) {
                    this.setState({
                      showProfile: true,
                      showProfileAfterEdit: false,
                    });
                  }
                },
              }}
            />
            <Stack.Screen
              name="Squib"
              component={
                Platform.OS === 'android'
                  ? (SquibADB as React.ComponentType<any>)
                  : (Squib as React.ComponentType<any>)
              }
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Comments"
              component={Comments as React.ComponentType<any>}
              options={{
                title: 'Comments',
                headerStyle: { backgroundColor: '#44C1AF' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen
              name="ProfileCompletion"
              component={ProfileCompletion as React.ComponentType<any>}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEdit as React.ComponentType<any>}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <ModalItem show={this.state.showProfile}>
          <Profile
            navigation={this.navigationRef.current}
            userSessionReset={async () => {
              console.log('🔄 Starting comprehensive cache clearing...');

              // Clear all profile caches when user signs out
              clearAllProfileCache();
              console.log('✅ Cleared profile caches');

              // Clear NewsPage data cache
              clearNewsPageData();
              console.log('✅ Cleared NewsPage data cache');

              // Clear all AsyncStorage caches
              const api = new SquibApi();
              await api.clearAllCaches();
              console.log('✅ Cleared all AsyncStorage caches');

              // Clear user session data separately
              await api.clearUserSession();
              console.log('✅ Cleared user session data');

              // Clear NewsCache singleton
              try {
                const newsCache = NewsCache.getInstance();
                newsCache.clearCache();
                console.log('✅ Cleared NewsCache singleton');
              } catch (error) {
                console.log('⚠️ Could not clear NewsCache:', error);
              }

              this.setState({ user_uuid: null });
              console.log('✅ Cleared app state');

              await this.navigationRef.current?.navigate('Login');
              console.log('✅ Navigated to Login');
            }}
            data={this.state.pdata}
            close={(value: boolean) => {
              this.setState({ showProfile: !value });
              this.setState({ data: {} });
            }}
            onEditProfile={userData => {
              this.setState({ showProfile: false, showProfileAfterEdit: true });
              this.navigationRef.current?.navigate('ProfileEdit', { userData });
            }}
          />
        </ModalItem>
      </GestureHandlerRootView>
    );
  }
}
