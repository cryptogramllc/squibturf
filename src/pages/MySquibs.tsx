import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import NewsItem from '../components/NewsItem';
const SquibApi = require('../api');

interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  uuid: string;
  user_id: string;
  post_id: string;
  time_stamp: number; // Adjust type based on your data structure
  date_key?: number; // Epoch time for sorting
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
}

interface Props {
  navigation?: any; // Adjust type as per your navigation prop type
}

interface State {
  squibs: NewsItemData[];
  refreshing: boolean;
  lastKey: any;
  loadingMore: boolean;
  currentUser: {
    name?: string;
    photo?: string;
    uuid?: string;
  } | null;
}

export default class MySquibs extends Component<Props, State> {
  private api;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      squibs: [],
      refreshing: false,
      lastKey: null,
      loadingMore: false,
      currentUser: null,
    };
  }

  async componentDidMount() {
    this._getData();
    this._loadCurrentUser();

    // Add focus listener to refresh user data when screen is focused
    const unsubscribe = this.props.navigation?.addListener('focus', () => {
      this._loadCurrentUser();
    });

    // Clean up listener on unmount
    if (unsubscribe) {
      this.componentWillUnmount = unsubscribe;
    }
  }

  async _loadCurrentUser() {
    try {
      const user = await AsyncStorage.getItem('userInfo');
      if (user) {
        const userData = JSON.parse(user);
        this.setState({ currentUser: userData });
        console.log('📱 MySquibs: Loaded current user:', userData);
      }
    } catch (error) {
      console.error('Error loading current user from storage:', error);
    }
  }

  async _getData(lastKey = null, append = false) {
    try {
      console.log('=== MySquibs _getData called ===');
      console.log('lastKey:', lastKey);
      console.log('append:', append);

      const data = await this.api.getUserSquibs(lastKey, 10, 0);
      console.log('API response data:', data);
      console.log('Data.Items length:', data?.Items?.length);

      if (data && data.Items) {
        console.log('Setting squibs with', data.Items.length, 'items');
        console.log(
          'Current squibs count before update:',
          this.state.squibs.length
        );
        console.log('Append mode:', append);

        this.setState(prevState => {
          let newSquibs = append
            ? [...prevState.squibs, ...data.Items]
            : data.Items;

          // Sort by date_key in descending order (newest first)
          newSquibs.sort((a: NewsItemData, b: NewsItemData) => {
            const dateA = a.date_key || a.time_stamp || 0;
            const dateB = b.date_key || b.time_stamp || 0;
            return dateB - dateA;
          });

          console.log('New squibs count after update:', newSquibs.length);
          console.log('New lastKey:', data.LastEvaluatedKey || null);

          return {
            squibs: newSquibs,
            lastKey: data.LastEvaluatedKey || null,
            refreshing: false,
            loadingMore: false,
          };
        });
      } else {
        console.log('No data.Items found, setting empty array');
        this.setState({
          squibs: append ? this.state.squibs : [],
          refreshing: false,
          loadingMore: false,
        });
      }
    } catch (error) {
      console.log('Error in _getData:', error);
      this.setState({ refreshing: false, loadingMore: false });
    }
  }

  _onRefresh = () => {
    this.setState({ refreshing: true, lastKey: null }, () => this._getData());
  };

  _onEndReached = () => {
    const { lastKey, loadingMore } = this.state;
    if (lastKey && !loadingMore) {
      this.setState({ loadingMore: true }, () => this._getData(lastKey, true));
    }
  };

  confirmDeleteByUuid = async (uuid: string) => {
    const { squibs } = this.state;
    const index = squibs.findIndex(s => s.uuid === uuid);
    if (index === -1) return;
    Alert.alert('Delete Squib', 'Are you sure you want to delete this squib?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const array = [...squibs];
          await this.api.deleteSquib({ uuid });
          array.splice(index, 1);
          this.setState({ squibs: array });
        },
      },
    ]);
  };

  render() {
    const { squibs, refreshing, loadingMore, currentUser } = this.state;
    const { navigation } = this.props;
    const Icon: any = FontAwesome;
    return (
      <View style={{ flex: 1 }}>
        <StatusBar backgroundColor="blue" barStyle="light-content" />
        <ScrollView
          contentContainerStyle={{ backgroundColor: '#ddd' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this._onRefresh}
              tintColor="#44C1AF"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 20
            ) {
              this._onEndReached();
            }
          }}
          scrollEventThrottle={400}
        >
          {squibs.length > 0 &&
            squibs.map(item => (
              <View key={item.uuid} style={{ position: 'relative' }}>
                <NewsItem
                  text={item.text}
                  img={
                    typeof item.image === 'string'
                      ? item.image.split(',')
                      : Array.isArray(item.image)
                      ? item.image
                      : []
                  }
                  video={
                    item.video
                      ? Array.isArray(item.video)
                        ? item.video
                        : [item.video]
                      : undefined
                  }
                  name={currentUser?.name || 'You'}
                  userPhoto={currentUser?.photo}
                  userId={currentUser?.uuid}
                  time={item.time_stamp.toString()}
                  onPress={() => {
                    const navData = {
                      text: item.text,
                      image:
                        typeof item.image === 'string'
                          ? item.image.split(',')
                          : Array.isArray(item.image)
                          ? item.image
                          : [],
                      video: item.video
                        ? Array.isArray(item.video)
                          ? item.video
                          : [item.video]
                        : undefined,
                      user_id: item.user_id,
                      post_id: item.post_id,
                    };
                    navigation?.navigate('Squib', navData);
                  }}
                  onMenuPress={() => this.confirmDeleteByUuid(item.uuid)}
                  lat={item.lat}
                  lon={item.lon}
                  location={item.location}
                  type={item.type}
                />
              </View>
            ))}
          {loadingMore && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text>Loading more...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}
