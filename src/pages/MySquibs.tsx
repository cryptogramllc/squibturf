import React, { Component } from 'react';
import {
    ScrollView,
    StatusBar,
    View,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StyleSheet,
    Text,
} from 'react-native';
import NewsItem from "../components/NewsItem";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
const SquibApi = require("../api");

interface NewsItemData {
    text: string;
    image: string;
    uuid: string;
    user_id: string;
    post_id: string;
    time_stamp: number; // Adjust type based on your data structure
    date_key?: number; // Epoch time for sorting
    lat?: number;
    lon?: number;
    location?: { city?: string; state?: string; country?: string };
}

interface Props {
    navigation?: any; // Adjust type as per your navigation prop type
}

interface State {
    squibs: NewsItemData[];
    refreshing: boolean;
    lastKey: any;
    loadingMore: boolean;
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
        };
    }

    async componentDidMount() {
        this._getData();
    }

    async _getData(lastKey = null, append = false) {
        try {
            const data = await this.api.getUserSquibs(lastKey);
            console.log('MySquibs ===> ', data);
            if (data && data.Items) {
                console.log('=== DEBUG: Items received ===');
                data.Items.forEach((item: NewsItemData, index: number) => {
                    console.log(`Item ${index}: uuid=${item.uuid}, date_key=${item.date_key}, time_stamp=${item.time_stamp}`);
                });
            }
            if (data && data.Items) {
                this.setState(prevState => ({
                    squibs: append ? [...prevState.squibs, ...data.Items] : data.Items,
                    lastKey: data.LastEvaluatedKey || null,
                    refreshing: false,
                    loadingMore: false,
                }));
            } else if (Array.isArray(data)) {
                // fallback for old API
                this.setState({
                    squibs: append ? [...this.state.squibs, ...data] : data,
                    refreshing: false,
                    loadingMore: false,
                });
            } else {
                this.setState({ refreshing: false, loadingMore: false });
            }
        } catch (error) {
            console.log(error);
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
        Alert.alert(
            "Delete Squib",
            "Are you sure you want to delete this squib?",
            [
                {
                    text: "OK",
                    onPress: async () => {
                        const array = [...squibs];
                        await this.api.deleteSquib({ uuid });
                        array.splice(index, 1);
                        this.setState({ squibs: array });
                    }
                },
                { text: "Cancel", onPress: () => console.log("Cancel Pressed") }
            ]
        );
    };

    render() {
        const { squibs, refreshing, loadingMore } = this.state;
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
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
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
                        squibs.map((item) => (
                            <View key={item.uuid} style={{ position: 'relative' }}>
                                <NewsItem
                                    text={item.text}
                                    img={typeof item.image === 'string' ? item.image.split(',') : Array.isArray(item.image) ? item.image : []}
                                    name="You"
                                    time={item.time_stamp.toString()}
                                    onPress={() => {
                                        const navData = {
                                            text: item.text,
                                            image: typeof item.image === 'string' ? item.image.split(',') : Array.isArray(item.image) ? item.image : [],
                                            user_id: item.user_id,
                                            post_id: item.post_id
                                        };
                                        navigation?.navigate('Squib', navData);
                                    }}
                                    lat={item.lat}
                                    lon={item.lon}
                                    location={item.location}
                                />
                                <TouchableOpacity
                                    style={{ position: 'absolute', bottom: 40, right: 30 }}
                                    onPress={() => this.confirmDeleteByUuid(item.uuid)}
                                >
                                    <Icon name="trash" color="#44C1AF" size={22} />
                                </TouchableOpacity>
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
