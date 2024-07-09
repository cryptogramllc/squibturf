import React from 'react';
import { Button, ButtonProps } from 'react-native';

interface LoginButtonProps extends ButtonProps {
    onPress: () => void;
    title: string;
    color?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({ onPress, title, color, ...props }) => {
    return (
        <Button
            onPress={onPress}
            title={title}
            color={color}
            {...props}
        />
    );
};

export default LoginButton;
