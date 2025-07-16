import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { Component, createRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import ModalItem from './src/modals/ModalItem';
import Comments from './src/pages/Comments';
import CreateSquib from './src/pages/CreateSquib';
import Login from './src/pages/Login';
import MySquibs from './src/pages/MySquibs';
import NewsPage from './src/pages/NewsPage';
import Profile from './src/pages/Profile';
import ProfileCompletion from './src/pages/ProfileCompletion';
import ProfileEdit from './src/pages/ProfileEdit';
import Squib from './src/pages/Squib';
const SquibApi = require('./src/api/index');

// Define types for props and state if necessary
interface AppProps {}

interface AppState {
  user_uuid: string | null;
  showProfile: boolean;
  pdata: any; // Replace with actual type
  tracking: boolean;
  data?: {} | null;
  showProfileAfterEdit: boolean;
}

interface HomeProps {}

interface HomeState {
  showCreateSquib: boolean;
  data?: {} | null;
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
  constructor(props: HomeProps) {
    super(props);
    this.state = {
      showCreateSquib: false,
    };
    this.api = new SquibApi();
  }

  render() {
    console.log('Home render - showCreateSquib:', this.state.showCreateSquib);
    const Icon: any = FontAwesome;
    return (
      <>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#000',
          }}
        >
          <Tab.Screen
            name="Turf"
            component={NewsPage}
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
                    marginTop: 0,
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
                console.log('Tab pressed!');
                e.preventDefault();
                console.log('Setting showCreateSquib to true');
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
          />
        </Tab.Navigator>
        <ModalItem show={this.state.showCreateSquib}>
          <CreateSquib
            close={(value: boolean) => {
              console.log('CreateSquib close called with:', value);
              this.setState({ showCreateSquib: !value });
              this.setState({ data: {} });
            }}
          />
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
    };
  }

  async componentDidMount() {
    console.log('Component Mounted');
    // Remove all trackingStatus and getTrackingStatus logic
    const user = await AsyncStorage.getItem('userInfo');
    if (user) {
      const pdata = JSON.parse(user);
      this.setState({ pdata });
      this.setState({ user_uuid: pdata.uuid });
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

  render() {
    console.log('Rendering app');
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
              options={{
                title: '',
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
                  if (this.state.showProfileAfterEdit) {
                    // Refresh user data from AsyncStorage before showing profile
                    const user = await AsyncStorage.getItem('userInfo');
                    if (user) {
                      const pdata = JSON.parse(user);
                      this.setState({ pdata });
                    }
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
              component={Squib as React.ComponentType<any>}
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
              this.setState({ user_uuid: null });
              AsyncStorage.removeItem('userInfo');
              await this.navigationRef.current?.navigate('Login');
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
