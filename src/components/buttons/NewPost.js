import React, { Component } from 'react';
import {
    TouchableOpacity,
    Text,
    View
} from 'react-native';
export default class NewPost extends Component {
    render() {
        const { onPress } = this.props;
        return (
            <View
                style={{
                    height: 50,
                    width: 50,
                    backgroundColor: '#dcdcdc',
                    borderRadius: 50 / 2,
                    left: '50%',
                    marginLeft: -26,
                    marginTop: 10,

                }}
            >
                <TouchableOpacity
                    onPress={onPress}

                    style={{
                        height: 40,
                        width: 40,
                        backgroundColor: '#44C1AF',
                        borderRadius: 100,
                        marginLeft: 5,
                        marginTop: 5,


                    }}
                >
                    <Text style={{
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: 30,
                        textAlign: 'center',
                        marginTop: -1
                    }}>&#x2b;</Text>
                </TouchableOpacity>
            </View>
        )
    }
}