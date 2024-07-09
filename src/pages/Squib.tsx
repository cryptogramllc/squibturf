import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    Image,
    Animated,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import SquibApi from '../api';

interface Props {
    route: {
        params: {
            data: any;
            text: string;
            image: string[];
        };
    };
    navigation: any;
}

interface State {
    comment: string | null;
    data: {
        comments: {
            user_id: string;
            avatar: string;
            comment: string;
            name: string;
        }[];
    } | null;
    currentImage: number;
    fadeAnimation: Animated.Value;
}

export default class Squib extends Component<Props, State> {
    api: SquibApi;

    constructor(props: Props) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            comment: null,
            data: null,
            currentImage: 0,
            fadeAnimation: new Animated.Value(1), // Initialize with 1 for opacity
        };
    }

    async componentDidMount() {
        const data = await this.api.getComment();
        data && this.setState({ data });
    }

    updateComment = (value: string) => {
        this.setState({ comment: value });
    };

    sendComment = async () => {
        const newComment = {
            user_id: '74e212fa-e12e-4679-b5b9-a4e15ec0f231',
            avatar:
                'https://cdn3.whatculture.com/images/2013/09/peter-griffin.jpg',
            comment: this.state.comment!,
            name: 'Peter Griffin',
        };

        if (this.state.data) {
            const updatedComments = [...this.state.data.comments, newComment];
            this.setState({ data: { comments: updatedComments } });
        }

        await this.api.postComment({
            comment: this.state.comment!,
            data: this.props.route.params.data,
        });

        this.setState({ comment: null });
        Keyboard.dismiss();
    };

    fadeOut = () => {
        Animated.timing(this.state.fadeAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
        }).start();
    };

    render() {
        const { text, image } = this.props.route.params;
        const { navigation } = this.props;
        const { data, currentImage } = this.state;
        const Icon: any = FontAwesome;
        this.fadeOut();

        return (
            <View style={{ flex: 1 }}>
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
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon
                            name="arrow-left"
                            style={{ marginTop: 10 }}
                            color={'white'}
                            size={30}
                        />
                    </TouchableOpacity>
                </View>
                {data && data.comments.length > 0 && (
                    <View
                        style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 28,
                            right: 10,
                            zIndex: 999,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate('Comments', data.comments)
                            }
                        >
                            <Icon
                                name="comments"
                                style={{ marginTop: 10 }}
                                color={'white'}
                                size={30}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={{ flexGrow: 1, justifyContent: 'space-between' }}>
                    {image && image.length > 0 && (
                        <View style={styles.squibImageContainer}>
                            <TouchableOpacity
                                onPress={() =>
                                    this.setState({
                                        currentImage:
                                            currentImage !== image.length - 1
                                                ? currentImage + 1
                                                : 0,
                                    })
                                }
                            >
                                <Image
                                    source={{
                                        uri: `https://squibturf-images.s3.amazonaws.com/${image[currentImage]}`,
                                    }}
                                    style={styles.squibImage}
                                />
                            </TouchableOpacity>
                            <Animated.View
                                style={[
                                    styles.helperTextCont,
                                    {
                                        opacity: this.state.fadeAnimation,
                                    },
                                ]}
                            >
                                <Text style={styles.helperText}>
                                    Tap to see next image
                                </Text>
                            </Animated.View>
                        </View>
                    )}
                    {text && (
                        <Text style={styles.squibText}>
                            &quot; {text} &quot;
                        </Text>
                    )}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    helperTextCont: {
        zIndex: 999,
        top: '50%',
        position: 'absolute',
        marginTop: -25,
        width: '100%',
    },
    helperText: {
        color: 'white',
        fontSize: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        padding: 10,
    },
    squibImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    squibImage: {
        width: '100%',
        height: '100%',
    },
    squibText: {
        padding: 30,
        fontSize: 18,
        position: 'absolute',
        bottom: 0,
        zIndex: 999,
        width: '100%',
        textAlign: 'center',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
});
