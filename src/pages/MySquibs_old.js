import React, { Component } from 'react';
import {
    ScrollView,
    StatusBar,
    View,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import NewsItem from "../components/NewsItem";
import Icon from 'react-native-vector-icons/FontAwesome';

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


    async _getData() {
        try {
            const data = await this.api.getUserSquibs();
            data && this.setState({ squibs: data })
            this.setState({ refreshing: false });
        } catch (error) {
        }

    }

    _onRefresh() {
        this.setState({ refreshing: true });
        this._getData();
    }
    async componentDidMount() {
        this._getData();
    }
    render() {
        const {
            squibs,
            refreshing
        } = this.state;
        const { navigation } = this.props;

        const confirmDelete = (index) => {
            Alert.alert(
                "Delete Squib",
                "Are you sure you want to delete this squib?",
                [
                    {
                        text: "OK",
                        onPress: async () => {
                            const uuid = squibs[index].uuid;
                            const array = [...squibs];
                            await this.api.deleteSquib({ uuid });
                            if (index !== -1) {
                                array.splice(index, 1);
                                this.setState({ squibs: array })
                            }

                        }
                    },
                ]
            )
        }

        return (
            <View>
                <StatusBar
                    backgroundColor="blue"
                    barStyle="light-content"
                />

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
                    }>
                    {
                        (squibs && squibs.length > 0) &&
                        squibs.sort((a, b) => b.time_stamp - a.time_stamp)
                            .map((item, index) => {
                                return (
                                    <View style={{ positon: 'relative' }}>
                                        <NewsItem
                                            key={index}
                                            text={item.text}
                                            img={item.image}
                                            name="You"
                                            time={item.time_stamp}
                                            onPress={() => {
                                                const data = {
                                                    text: item.text,
                                                    image: item.image,
                                                    user_id: item.user_id,
                                                    post_id: item.post_id
                                                }
                                                this.setState(data);
                                                navigation.navigate('Squib', data)

                                            }}
                                        />
                                        <TouchableOpacity
                                            style={{
                                                position: 'absolute',
                                                bottom: 40,
                                                right: 30
                                            }}
                                            onPress={() => { confirmDelete(index) }}
                                        >
                                            <Icon
                                                name="trash"
                                                color="#44C1AF"
                                                size={22}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )
                            })}
                </ScrollView>
            </View>
        );
    }
}



