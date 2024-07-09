import React, { Component } from 'react';
import {
    ScrollView,
    StatusBar,
    View,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StyleSheet,
} from 'react-native';
import NewsItem from "../components/NewsItem";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import SquibApi from "../api"; // Assuming SquibApi is properly exported as default

interface NewsItemData {
    text: string;
    image: string;
    uuid: string;
    user_id: string;
    post_id: string;
    time_stamp: number; // Adjust type based on your data structure
}

interface Props {
    navigation: any; // Adjust type as per your navigation prop type
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

    async _getData() {
        try {
            const data = await this.api.getUserSquibs();
            if (data) {
                this.setState({ squibs: data });
            }
            this.setState({ refreshing: false });
        } catch (error) {
            console.log(error);
        }
    }

    _onRefresh = () => {
        this.setState({ refreshing: true });
        this._getData();
    };

    confirmDelete = async (index: number) => {
        const { squibs } = this.state;
        Alert.alert(
            "Delete Squib",
            "Are you sure you want to delete this squib?",
            [
                {
                    text: "OK",
                    onPress: async () => {
                        const uuid = squibs[index].uuid; // Assuming uuid exists in NewsItemData interface
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
        const { squibs, refreshing } = this.state;
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
                >
                    {squibs.length > 0 &&
                        squibs
                            .sort((a, b) => b.time_stamp - a.time_stamp)
                            .map((item, index) => (
                                <View key={index} style={{ position: 'relative' }}>
                                    <NewsItem
                                        text={item.text}
                                        img={[item.image]}
                                        name="You"
                                        time={item.time_stamp.toString()}
                                        onPress={() => {
                                            const data = {
                                                text: item.text,
                                                image: item.image,
                                                user_id: item.user_id,
                                                post_id: item.post_id
                                            };
                                            this.setState({ squibs: [{ ...data, uuid: '', time_stamp: 0 }] });
                                            navigation.navigate('Squib', data);
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={{ position: 'absolute', bottom: 40, right: 30 }}
                                        onPress={() => this.confirmDelete(index)}
                                    >
                                        <Icon name="trash" color="#44C1AF" size={22} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                </ScrollView>
            </View>
        );
    }
}
