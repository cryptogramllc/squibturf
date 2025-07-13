import React from 'react';
import { View, Text } from 'react-native';


const Header = ({ children, text }) => {
    return (
        <View>
            <Text>{text}</Text>
        </View>
    )
}

export default Header; 