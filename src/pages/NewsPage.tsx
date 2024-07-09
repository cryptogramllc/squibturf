import React, { Component } from 'react';
import {
    ScrollView,
    StatusBar,
    View,
    RefreshControl,
    Text,
    Platform,
    StyleSheet
} from 'react-native';
import NewsItem from "../components/NewsItem";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { request, PERMISSIONS, RESULTS, Permission, Rationale } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';
import SquibApi from "../api";

interface NewsItemData {
    text: string;
    image: string;
    user_name: string;
    user_id: string;
    post_id: string;
    time_stamp: number;
}

interface Props {
    navigation: any; // Adjust navigation prop type as per your application
}

interface State {
    squibs: NewsItemData[];
    refreshing: boolean;
}

export default class NewsPage extends Component<Props, State> {
    private api: SquibApi;

    constructor(props: Props) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            squibs: [],
            refreshing: false,
        };
    }

    async componentDidMount() {
        this._getData();
    }

    async _getLocationPermissions() {
        let permission: Permission | undefined;

        if (Platform.OS === 'android') {
            permission = PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION;
        } else if (Platform.OS === 'ios') {
            permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
        }

        if (!permission) {
            console.log('Unsupported platform for location permission');
            return false;
        }

        const rationale: Rationale = {
            title: 'DemoApp',
            message: 'DemoApp would like access to your location',
            buttonPositive: 'OK',
        };

        const granted = await request(permission, rationale);

        console.log('Permission granted:', granted);

        return granted === RESULTS.GRANTED;
    }

    _getCurrentPosition = () => {
        return new Promise<{ lon: number; lat: number }>((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    resolve({ lon: longitude, lat: latitude });
                },
                error => {
                    console.log("Error : " + JSON.stringify(error));
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 3000, maximumAge: 1000 }
            );
        });
    };

    async _getData() {
        console.log('getting data');
        const granted = await this._getLocationPermissions();
        if (granted) {
            try {
                const loc = await this._getCurrentPosition();
                const data = await this.api.getLocalSquibs(loc.lon, loc.lat);
                if (data) {
                    this.setState({ squibs: data });
                }
                this.setState({ refreshing: false });
            } catch (error) {
                console.log('geolocation error', error);
            }
        } else {
            console.log('permission not granted');
        }
    }

    _onRefresh = () => {
        this.setState({ refreshing: true });
        this._getData();
    };

    render() {
        const { squibs, refreshing } = this.state;
        const { navigation } = this.props;
        const Icon: any = FontAwesome;
        return (
            <View>
                <StatusBar
                    backgroundColor="blue"
                    barStyle="light-content"
                />
                {squibs.length > 0 ? (
                    <ScrollView
                        contentContainerStyle={{
                            backgroundColor: '#ddd',
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={this._onRefresh.bind(this)}
                                tintColor="#44C1AF"
                            />
                        }
                    >
                        {squibs
                            .sort((a, b) => b.time_stamp - a.time_stamp)
                            .map((item, index) => (
                                <NewsItem
                                    key={index}
                                    text={item.text}
                                    img={item.image.length ? [item.image] : undefined}
                                    name={item.user_name}
                                    time={item.time_stamp.toString()}
                                    onPress={() => {
                                        const data = {
                                            text: item.text,
                                            image: item.image.length ? item.image : null,
                                            user_id: item.user_id,
                                            post_id: item.post_id
                                        };
                                        this.setState(prevState => ({ ...prevState, ...data }));
                                        navigation.navigate('Squib', data);
                                    }}
                                />
                            ))}
                    </ScrollView>
                ) : (
                    <ScrollView
                        contentContainerStyle={{ height: '100%', width: '100%' }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={this._onRefresh.bind(this)}
                                tintColor="#44C1AF"
                            />
                        }
                    >
                        <View style={{ height: '100%' }}>
                            <Text style={styles.pullToRefreshText}>Pull to refresh</Text>
                            <Icon
                                name="long-arrow-down"
                                style={styles.downArrowIcon}
                                color={"#44C1AF"}
                                size={30}
                            />
                            <Text style={styles.noSquibsText}>No Squibs in your area. Make a new Post</Text>
                            <Icon
                                name="flag"
                                style={styles.flagIcon}
                                color={"#44C1AF"}
                                size={80}
                            />
                        </View>
                    </ScrollView>
                )}
            </View>
        );
    }
}


const styles = StyleSheet.create({
    pullToRefreshText: {
        color: "#44C1AF",
        width: 300,
        height: 20,
        textAlign: 'center',
        left: '50%',
        marginLeft: -150,
        top: '0%',
        marginTop: 80,
        position: 'absolute',
        fontStyle: 'italic'
    },
    downArrowIcon: {
        top: 100,
        left: '50%',
        marginLeft: -5
    },
    noSquibsText: {
        color: "#44C1AF",
        fontWeight: 'bold',
        width: 300,
        textAlign: 'center',
        left: '50%',
        marginLeft: -150,
        top: '50%',
        marginTop: -20,
        marginBottom: 20
    },
    flagIcon: {
        top: '50%',
        left: '50%',
        marginLeft: -40
    }
});
