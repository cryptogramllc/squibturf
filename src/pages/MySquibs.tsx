import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
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
  time_stamp: number;
  date_key?: number;
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
}

interface Props {
  navigation?: any;
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
  authError: boolean;
  authErrorMessage: string;
  isLoading: boolean;
}

export default class MySquibs extends React.Component<Props, State> {
  private api;
  private flatListRef = React.createRef<FlatList<NewsItemData>>();
  private loadedKeys: Set<any> = new Set();
  private scrollPosition = 0;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      squibs: [],
      refreshing: false,
      lastKey: null,
      loadingMore: false,
      currentUser: null,
      authError: false,
      authErrorMessage: '',
      isLoading: false,
    };
  }

  async componentDidMount() {
    this._getData();
    this._loadCurrentUser();

    // Restore scroll position after a short delay to ensure the list is rendered
    setTimeout(() => {
      if (this.scrollPosition > 0 && this.flatListRef.current) {
        this.flatListRef.current.scrollToOffset({
          offset: this.scrollPosition,
          animated: false,
        });
      }
    }, 100);
  }

  async _loadCurrentUser() {
    try {
      const user = await AsyncStorage.getItem('userInfo');
      if (user) {
        const userData = JSON.parse(user);

        // Validate that we have the required user data
        if (userData && userData.uuid && userData.email) {
          console.log('🔐 MySquibs: Valid user data loaded:', {
            uuid: userData.uuid,
            email: userData.email,
          });
          this.setState({
            currentUser: userData,
            authError: false,
            authErrorMessage: '',
          });
          return true;
        } else {
          console.log(
            '🔐 MySquibs: Invalid user data - missing required fields:',
            userData
          );
          this.setState({
            currentUser: null,
            authError: true,
            authErrorMessage: 'Invalid user session. Please log in again.',
          });
          return false;
        }
      } else {
        console.log('🔐 MySquibs: No user data found in AsyncStorage');
        this.setState({
          currentUser: null,
          authError: true,
          authErrorMessage: 'No user session found. Please log in.',
        });
        return false;
      }
    } catch (error) {
      console.log('🔐 MySquibs: Error loading user data:', error);
      this.setState({
        currentUser: null,
        authError: true,
        authErrorMessage: 'Error loading user session. Please log in again.',
      });
      return false;
    }
  }

  async _getData(lastKey = null, append = false) {
    // Don't reload if we already have data and this isn't a refresh or append
    if (
      !append &&
      !lastKey &&
      this.state.squibs.length > 0 &&
      !this.state.refreshing
    ) {
      console.log('🔄 MySquibs: Skipping data reload - already have data');
      return;
    }

    // First check if we have valid authentication
    const isAuthenticated = await this._loadCurrentUser();

    if (!isAuthenticated) {
      console.log('🔐 MySquibs: Authentication failed, cannot fetch data');
      this.setState({
        refreshing: false,
        loadingMore: false,
        isLoading: false,
      });
      return;
    }

    this.setState({ isLoading: true });

    try {
      console.log(
        '🔐 MySquibs: Fetching user squibs with UUID:',
        this.state.currentUser?.uuid
      );
      const data = await this.api.getUserSquibs(lastKey, 10, 0);

      if (data && data.Items) {
        console.log(
          '🔐 MySquibs: Successfully fetched',
          data.Items.length,
          'squibs'
        );
        this.setState(prevState => {
          let newSquibs = append
            ? [...prevState.squibs, ...data.Items]
            : data.Items;
          newSquibs.sort((a: NewsItemData, b: NewsItemData) => {
            const dateA = a.date_key || a.time_stamp || 0;
            const dateB = b.date_key || b.time_stamp || 0;
            return dateB - dateA;
          });
          if (append && lastKey) this.loadedKeys.add(lastKey);
          return {
            squibs: newSquibs,
            lastKey: data.LastEvaluatedKey || null,
            refreshing: false,
            loadingMore: false,
            isLoading: false,
            authError: false,
            authErrorMessage: '',
          };
        });
      } else {
        console.log('🔐 MySquibs: No data returned from API');
        this.setState({
          squibs: append ? this.state.squibs : [],
          refreshing: false,
          loadingMore: false,
          isLoading: false,
          authError: false,
          authErrorMessage: '',
        });
      }
    } catch (error: any) {
      console.log('🔐 MySquibs: Error fetching data:', error);

      // Check if it's an authentication error
      if (error.response && error.response.status === 401) {
        this.setState({
          refreshing: false,
          loadingMore: false,
          isLoading: false,
          authError: true,
          authErrorMessage: 'Session expired. Please log in again.',
        });
      } else {
        this.setState({
          refreshing: false,
          loadingMore: false,
          isLoading: false,
          authError: true,
          authErrorMessage: 'Failed to load your squibs. Please try again.',
        });
      }
    }
  }

  _onRefresh = () => {
    this.loadedKeys.clear();
    this.setState({ refreshing: true, lastKey: null }, () => this._getData());
  };

  _onEndReached = () => {
    const { lastKey, loadingMore } = this.state;
    if (lastKey && !loadingMore && !this.loadedKeys.has(lastKey)) {
      this.setState({ loadingMore: true }, () => this._getData(lastKey, true));
    }
  };

  render() {
    const {
      squibs,
      refreshing,
      loadingMore,
      currentUser,
      authError,
      authErrorMessage,
      isLoading,
    } = this.state;
    const { navigation } = this.props;
    const Icon: any = FontAwesome;
    return (
      <View style={{ flex: 1 }}>
        <StatusBar backgroundColor="blue" barStyle="light-content" />
        {authError ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
              backgroundColor: '#f8f9fa',
            }}
          >
            <Icon name="exclamation-triangle" size={48} color="#dc3545" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#dc3545',
                textAlign: 'center',
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Authentication Error
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6c757d',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              {authErrorMessage}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#44C1AF',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
              onPress={() => {
                this.setState({ authError: false, authErrorMessage: '' });
                this._getData();
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : isLoading && squibs.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
            }}
          >
            <ActivityIndicator size="large" color="#44C1AF" />
            <Text
              style={{
                fontSize: 16,
                color: '#6c757d',
                marginTop: 16,
              }}
            >
              Loading your squibs...
            </Text>
          </View>
        ) : squibs.length > 0 ? (
          <FlatList
            ref={this.flatListRef}
            data={squibs}
            keyExtractor={item => item.uuid}
            renderItem={({ item }) => (
              <View style={{ position: 'relative' }}>
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
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh}
                tintColor="#44C1AF"
              />
            }
            onScroll={e => {
              this.scrollPosition = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            onEndReached={this._onEndReached}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text>Loading more...</Text>
                </View>
              ) : null
            }
            contentContainerStyle={{
              backgroundColor: '#ddd',
              paddingBottom: 100, // Add more padding to make white space longer
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 100,
            }}
          >
            <Icon
              name="pencil"
              style={{ marginBottom: 20 }}
              color={'#44C1AF'}
              size={80}
            />
            <Text
              style={{
                color: '#44C1AF',
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 15,
                textAlign: 'center',
              }}
            >
              No Posts Yet
            </Text>
            <Text
              style={{
                color: '#666',
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 10,
                paddingHorizontal: 30,
                lineHeight: 22,
              }}
            >
              You haven't created any squibs yet. Tap the camera button to share
              your first post!
            </Text>
          </View>
        )}
      </View>
    );
  }

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
}
