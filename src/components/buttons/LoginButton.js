import React from 'react';
import { Button } from 'react-native';

const LoginButton = ({ onPress, title, color }) => {
    return (
        <Button
            onPress={onPress}
            title={title}
            color={color}
        />
    )
}

export default LoginButton;