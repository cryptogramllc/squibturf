import React, { Component } from 'react';

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    TextInput,
    Image,
    StatusBar,


} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';


const SquibApi = require("../api");

export default class Squib extends Component {


    constructor(props) {
        super(props)

        this.api = new SquibApi();
        this.state = {
            comment: null,
            data: null
        }
    }
    async componentDidMount() {
        // const data = await this.api.getComment();
        // data && this.setState({ data })
        console.log(this.props)
    }
    updateComment = (value) => {
        this.setState({ comment: value });
    }
    sendComment = async () => {
        const newComment = {
            "user_id": "74e212fa-e12e-4679-b5b9-a4e15ec0f231",
            "avatar": "https://cdn3.whatculture.com/images/2013/09/peter-griffin.jpg",
            "comment": this.state.comment,
            "name": "Peter Griffin"
        };
        var data = this.state.data;
        data.comments.push(newComment);
        console.log(data)
        this.setState({ data })
        await this.api.postComment({
            commment: this.state.comment,
            data: this.props.data
        });
        this.setState({ comment: null })
        Keyboard.dismiss();

    }
    render() {

        const { navigation } = this.props;
        const data = this.props.route.params;

        const styles = {
            squibCommentName: {
                color: '#000',
                fontSize: 15,
                paddingLeft: 10,
                paddingRight: 10
            },
            squibCommentAvatar: {
                height: 40,
                width: 40,
                position: 'absolute',
                borderRadius: 100,
                top: 10,
                left: 10
            },
            squibCommentText: {
                color: '#555',
                fontSize: 18,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 5
            }
        }
        return (
            <>
                <StatusBar
                    backgroundColor="blue"
                    barStyle="dark-content"
                />
                <View
                    style={{ flex: 1 }}
                    behavior="padding"
                    enabled={true}
                >
                    <View style={{
                        height: 50,
                        width: 50,
                        position: 'absolute',
                        top: 28,
                        left: 25,
                        zIndex: 999
                    }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{}}>
                            <Icon name="arrow-left" style={{ marginTop: 10 }} color={'black'} size={30} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View>
                    {
                        data &&
                        <>
                            <Text
                                style={{
                                    marginLeft: 20,
                                    marginRight: 20,
                                    paddingBottom: 10
                                }}
                            >  {data.length}  Comments</Text>


                            {
                                data.map((item, index) => {

                                    return (
                                        <View key={index} style={{ position: 'relative' }}>
                                            <Image
                                                source={{ uri: item.avatar }}
                                                style={styles.squibCommentAvatar}
                                            />
                                            <View style={{
                                                marginLeft: 70,
                                                marginRight: 30,
                                                paddingTop: 10,
                                                paddingBottom: 10,
                                                margin: 10,
                                                backgroundColor: '#eee',
                                                borderRadius: 5
                                            }} >

                                                <Text style={styles.squibCommentName}> {item.name} </Text>
                                                <Text style={styles.squibCommentText}> {item.comment} </Text>
                                            </View>
                                        </View>
                                    )
                                })

                            }
                        </>
                    }
                </View>
            </>
        )
    }
}