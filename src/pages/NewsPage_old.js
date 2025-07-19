import React, { Component } from 'react';
import {
    ScrollView,
    StatusBar,
    View,
    RefreshControl,
    Text,
    Platform,
    geolocation
} from 'react-native';
import NewsItem from "../components/NewsItem";
import Icon from 'react-native-vector-icons/FontAwesome';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const SquibApi = require("../api");
export default class NewsPage extends Component {

    constructor(props) {
        super(props)
        this.api = new SquibApi();
        this.state = {
            data: {},
            squibs: [],
            refreshing: false
        }
    }

    async _getLocationPermissions() {
        const granted = await request(
            Platform.select({
                android: PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
                ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
            }),
            {
                title: 'DemoApp',
                message: 'DemoApp would like access to your location ',
            },
        );

        return granted === RESULTS.GRANTED;
    }

    async _getData() {
        const granted = await this._getLocationPermissions();
        if (granted) {
            navigator.geolocation = require('@react-native-community/geolocation');
            try {
                const loc = await new Promise((res, rej) => {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const location = position;
                            const lat = location.coords.latitude;
                            const lon = location.coords.longitude;
                            res({ lon, lat })
                        { enableHighAccuracy: true, timeout: 3000, maximumAge: 1000 }
                    )
                });
                const data = await this.api.getLocalSquibs(loc.lon, loc.lat);
                data && this.setState({ squibs: data })
                this.setState({ refreshing: false });
            } catch (error) {
            }
        } else {
        }
    }

    _onRefresh() {
        this.setState({ refreshing: true });
        this._getData();
    }
    componentDidMount() {
        this._getData();
    }

    render() {
        const {
            squibs,
            refreshing
        } = this.state;
        const { navigation } = this.props;
        return (
            <View>
                <StatusBar
                    backgroundColor="blue"
                    barStyle="light-content"
                />
                {squibs.length > 0 &&
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
                        {
                            squibs.sort((a, b) => b.time_stamp - a.time_stamp)
                                .map((item, index) => {
                                    return (
                                        <NewsItem
                                            key={index}
                                            text={item.text}
                                            img={item.image.length ? item.image : null}
                                            name={item.user_name}
                                            time={item.time_stamp}
                                            onPress={() => {

                                                const data = {
                                                    text: item.text,
                                                    image: item.image.length ? item.image : null,
                                                    user_id: item.user_id,
                                                    post_id: item.post_id
                                                }
                                                this.setState(data);
                                                navigation.navigate('Squib', data)

                                            }}
                                        />
                                    )
                                })
                        }


                    </ScrollView>
                }
                {
                    squibs.length === 0 &&
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
                            <Text style={{
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
                            }}> Pull to refresh</Text>
                            <Icon
                                name="long-arrow-down"
                                style={{ top: 100, left: '50%', marginLeft: -5 }}
                                color={"#44C1AF"}
                                size={30}
                            />
                            <Text style={{
                                color: "#44C1AF",
                                fontWeight: 'bold',
                                width: 300,
                                textAlign: 'center',
                                left: '50%',
                                marginLeft: -150,
                                top: '50%',
                                marginTop: -20,
                                marginBottom: 20
                            }}
                            > No Squibs in your area. Make a new Post</Text>
                            <Icon
                                name="flag"
                                style={{ top: '50%', left: '50%', marginLeft: -40 }}
                                color={"#44C1AF"}
                                size={80}
                            />

                        </View>
                    </ScrollView>
                }
            </View>
        );
    }
}



