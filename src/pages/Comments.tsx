import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Keyboard,
    TextInput,
    Image,
    StatusBar,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import SquibApi from '../api';

interface Comment {
    user_id: string;
    avatar: string;
    comment: string;
    name: string;
}

interface SquibProps {
    navigation: any;
    route: {
        params: Comment[];
    };
}

interface SquibState {
    comment: string | null;
    data: { comments: Comment[] } | null;
}

export default class Squib extends Component<SquibProps, SquibState> {
    private api: SquibApi;

    constructor(props: SquibProps) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            comment: null,
            data: null,
        };
    }

    async componentDidMount() {
        // const data = await this.api.getComment();
        // data && this.setState({ data });
        console.log(this.props);
    }

    updateComment = (value: string) => {
        this.setState({ comment: value });
    };

    sendComment = async () => {
        if (!this.state.comment || !this.state.data) return;

        const newComment: Comment = {
            user_id: '74e212fa-e12e-4679-b5b9-a4e15ec0f231',
            avatar: 'https://cdn3.whatculture.com/images/2013/09/peter-griffin.jpg',
            comment: this.state.comment,
            name: 'Peter Griffin',
        };

        const data = this.state.data;
        data.comments.push(newComment);
        console.log(data);
        this.setState({ data });

        await this.api.postComment({
            commment: this.state.comment,
            data: this.props.route.params,
        });
        this.setState({ comment: null });
        Keyboard.dismiss();
    };

    render() {
        const { navigation } = this.props;
        const data = this.props.route.params;
        const Icon: any = FontAwesome;
        const styles = {
            squibCommentName: {
                color: '#000',
                fontSize: 15,
                paddingLeft: 10,
                paddingRight: 10,
            },
            squibCommentAvatar: {
                height: 40,
                width: 40,
                borderRadius: 100,
            },
            squibCommentText: {
                color: '#555',
                fontSize: 18,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 5,
            },
        };

        return (
            <>
                <StatusBar backgroundColor="blue" barStyle="dark-content" />
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled>
                    <View
                        style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 28,
                            left: 25,
                            zIndex: 999,
                        }}
                    >
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{}}>
                            <Icon name="arrow-left" style={{ marginTop: 10 }} color={'black'} size={30} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
                <View>
                    {data && (
                        <>
                            <Text style={{ marginLeft: 20, marginRight: 20, paddingBottom: 10 }}>
                                {data.length} Comments
                            </Text>
                            {data.map((item, index) => (
                                <View key={index} style={{ position: 'relative' }}>
                                    <Image source={{ uri: item.avatar }} style={styles.squibCommentAvatar} />
                                    <View
                                        style={{
                                            marginLeft: 70,
                                            marginRight: 30,
                                            paddingTop: 10,
                                            paddingBottom: 10,
                                            margin: 10,
                                            backgroundColor: '#eee',
                                            borderRadius: 5,
                                        }}
                                    >
                                        <Text style={styles.squibCommentName}> {item.name} </Text>
                                        <Text style={styles.squibCommentText}> {item.comment} </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}
                </View>
            </>
        );
    }
}
